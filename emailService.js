const { ProviderA, ProviderB } = require('./mockProviders');
const logger = require('./logger');
const crypto = require('crypto');

class CircuitBreaker {
  constructor(maxFailures, resetTimeoutMs) {
    this.maxFailures = maxFailures;
    this.resetTimeoutMs = resetTimeoutMs;
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.maxFailures) {
      this.state = 'OPEN';
      setTimeout(() => {
        this.state = 'HALF-OPEN';
      }, this.resetTimeoutMs);
    }
  }
  canAttempt() {
    return this.state !== 'OPEN';
  }
  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

class EmailService {
  constructor() {
    this.providers = [ProviderA, ProviderB];
    this.circuitBreakers = [
      new CircuitBreaker(3, 60000),
      new CircuitBreaker(3, 60000)
    ];
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoff: 2
    };
    this.rateLimit = {
      max: 5, // default max emails per window
      windowMs: 60000, // 1 minute
      sent: []
    };
    this.queue = [];
    // Simulate Provider A failures for testing: this will OPEN the circuit breaker
    this.circuitBreakers[0].onFailure();
    this.circuitBreakers[0].onFailure();
    this.circuitBreakers[0].onFailure();

    this.statusMap = {};
    this.sentIds = new Set();
    this._autoSendInterval = null;
    // Do NOT auto-start processing here. Only startAutoSend() manages it.
  }

  // Start automatic email sending
  startAutoSend(intervalMs = 1000) {
    if (this._autoSendInterval) return; // Already running
    this._autoSendInterval = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (e) {
        logger.error('Auto send error: ' + e.message);
      }
    }, intervalMs);
  }

  // Stop automatic email sending
  stopAutoSend() {
    if (this._autoSendInterval) {
      clearInterval(this._autoSendInterval);
      this._autoSendInterval = null;
    }
  }

  // Get sent emails
  getSentEmails() {
    return Object.entries(this.statusMap)
      .filter(([_, s]) => s.status === 'sent')
      .map(([id, s]) => ({ id, ...s }));
  }

  // Get failed emails
  getFailedEmails() {
    return Object.entries(this.statusMap)
      .filter(([_, s]) => s.status === 'failed')
      .map(([id, s]) => ({ id, ...s }));
  }


  setConfig({ retry, rateLimit }) {
    if (retry) Object.assign(this.retryConfig, retry);
    if (rateLimit) Object.assign(this.rateLimit, rateLimit);
  }

  _hashEmail(email) {
    return crypto.createHash('sha256').update(JSON.stringify(email)).digest('hex');
  }

  async sendEmail(email, idempotencyKey = null) {
    const id = idempotencyKey || this._hashEmail(email);
    if (this.sentIds.has(id)) {
      logger.info(`Duplicate email prevented (idempotency): ${id}`);
      return { status: 'duplicate', id };
    }
    const now = new Date().toISOString();
    this.queue.push({ email, id, attempts: 0, status: 'queued', lastError: null, date: now });
    this.statusMap[id] = { ...this.statusMap[id], ...email, status: 'queued', attempts: 0, provider: null, lastError: null, date: now };
    logger.info(`Queued email id=${id}`);
    return { status: 'queued', id };
  }

  _withinRateLimit() {
    const now = Date.now();
    this.rateLimit.sent = this.rateLimit.sent.filter(ts => now - ts < this.rateLimit.windowMs);
    return this.rateLimit.sent.length < this.rateLimit.max;
  }

  async processQueue() {
    if (!this.queue.length) return;
    if (!this._withinRateLimit()) {
      // Wait for the rate limit window to reset
      const now = Date.now();
      const oldest = this.rateLimit.sent.length ? Math.min(...this.rateLimit.sent) : now;
      const waitMs = Math.max(0, this.rateLimit.windowMs - (now - oldest));
      logger.info(`Rate limit reached. Waiting ${Math.ceil(waitMs / 1000)}s to reset.`);
      // Only set a timeout if not already waiting
      if (!this._rateLimitTimeout) {
        this._rateLimitTimeout = setTimeout(() => {
          this._rateLimitTimeout = null;
          // Try processing again after window resets
          this.processQueue();
        }, waitMs);
      }
      return;
    }
    // Only process the first item in the queue
    const item = this.queue[0];
    if (!item) return;
    await this._processItem(item);
    // Remove from queue if sent or failed
    const status = this.statusMap[item.id]?.status;
    if (status === 'sent' || status === 'failed') {
      this.queue = this.queue.filter(q => q.id !== item.id);
      if (status !== 'sent') {
        delete this.statusMap[item.id];
      }
    }
  }

  async _processItem(item) {
    const { email, id } = item;
    let attempt = item.attempts;
    let delay = this.retryConfig.baseDelay;
    for (let i = 0; i < this.providers.length; ++i) {
      const provider = this.providers[i];
      const cb = this.circuitBreakers[i];
      if (!cb.canAttempt()) {
        logger.warn(`${provider.name} circuit breaker open.`);
        continue;
      }
      for (; attempt < this.retryConfig.maxAttempts; ++attempt) {
        try {
          this.rateLimit.sent.push(Date.now());
          await provider.sendEmail(email);
          cb.onSuccess();
          this.sentIds.add(id);
          this.statusMap[id] = { ...this.statusMap[id], ...email, status: 'sent', attempts: attempt + 1, provider: provider.name, lastError: null };
          logger.info(`Email sent via ${provider.name} (id=${id})`);
          return;
        } catch (err) {
          cb.onFailure();
          this.statusMap[id] = { ...this.statusMap[id], ...email, status: 'retrying', attempts: attempt + 1, provider: provider.name, lastError: err.message };
          logger.warn(`Send failed via ${provider.name} (id=${id}): ${err.message}`);
          if (attempt + 1 < this.retryConfig.maxAttempts) {
            await new Promise(res => setTimeout(res, Math.min(delay, this.retryConfig.maxDelay)));
            delay *= this.retryConfig.backoff;
          }
        }
      }
      // If we reach here, this provider failed all attempts, try next
      attempt = 0;
      delay = this.retryConfig.baseDelay;
    }
    // All providers failed
    this.statusMap[id] = { ...this.statusMap[id], ...email, status: 'failed', attempts: this.retryConfig.maxAttempts * this.providers.length, provider: null, lastError: 'All providers failed' };
    logger.error(`All providers failed for email id=${id}`);
  }

  getStatus() {
    return Object.entries(this.statusMap).map(([id, s]) => ({ id, ...s }));
  }

  // Only return emails still queued (not sent/failed)
  getQueue() {
    return this.queue.map(item => ({ id: item.id, ...item.email, status: this.statusMap[item.id]?.status || 'queued', attempts: item.attempts, lastError: item.lastError }));
  }

  getProviderStatus() {
    return this.providers.map((p, i) => ({
      name: p.name,
      ...this.circuitBreakers[i].getStatus(),
    }));
  }
}

module.exports = new EmailService();
