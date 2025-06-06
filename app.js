// Main frontend JS for Resilient Email Service
// Handles navigation, rendering, and API calls

document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item');
  const pageTitle = document.getElementById('page-title');
  const pageContent = document.getElementById('page-content');
  const lastUpdated = document.getElementById('last-updated');

  let refreshInterval = null;

  function setActive(page) {
    navItems.forEach(item => {
      if (item.dataset.page === page) item.classList.add('active');
      else item.classList.remove('active');
    });
    pageTitle.textContent = navItems.namedItem?.(page)?.textContent || capitalize(page);
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function setLastUpdated() {
    lastUpdated.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
  }

  // --- Page Renderers ---
  async function renderDashboard() {
    setLastUpdated();
    pageTitle.textContent = 'Dashboard';
    const [status, providers, queue] = await Promise.all([
      fetch('/api/status').then(r => r.json()),
      fetch('/api/providers').then(r => r.json()),
      fetch('/api/queue').then(r => r.json()),
    ]);
    const totalEmails = status.length;
    const sent = status.filter(e => e.status === 'sent').length;
    const failed = status.filter(e => e.status === 'failed').length;
    const retrying = status.filter(e => e.status === 'retrying').length;
    const queued = queue.length;
    const successRate = totalEmails ? ((sent / totalEmails) * 100).toFixed(1) : 100;
    const rateLimit = await fetch('/api/settings').then(r => r.json()).then(s => s.rateLimit);
    const rateUsed = rateLimit.sent ? rateLimit.sent.length : 0;
    const rateMax = rateLimit.max || 100;

    // Recent activity
    const recent = status.slice(-3).reverse();
    pageContent.innerHTML = `
      <div style="display: flex; gap: 24px; flex-wrap: wrap;">
        <div class="card" style="flex: 1 1 180px; min-width: 200px;">
          <div class="card-title">Total Emails</div>
          <div style="font-size: 32px; font-weight: 700;">${totalEmails}</div>
        </div>
        <div class="card" style="flex: 1 1 180px; min-width: 200px;">
          <div class="card-title">Success Rate</div>
          <div style="font-size: 32px; font-weight: 700;">${successRate}%</div>
        </div>
        <div class="card" style="flex: 1 1 180px; min-width: 200px;">
          <div class="card-title">Queue Size</div>
          <div style="font-size: 32px; font-weight: 700;">${queued}</div>
        </div>
        <div class="card" style="flex: 1 1 180px; min-width: 200px;">
          <div class="card-title">Rate Limit</div>
          <div style="font-size: 32px; font-weight: 700;">${rateUsed}/${rateMax}</div>
        </div>
      </div>
      <div style="display: flex; gap: 24px; flex-wrap: wrap;">
        <div class="card" style="flex: 1 1 320px; min-width: 320px;">
          <div class="card-title">Provider Status</div>
          <div class="card-subtitle">Current status of email providers</div>
          ${providers.map(p => `
            <div style="margin-bottom: 7px;">
              <span class="status-badge ${p.state.toLowerCase()}">${p.state.replace('-', ' ')}</span>
              <span style="font-weight: 500;">${p.name}</span>
              <span style="font-size: 12px; color: #999; margin-left: 8px;">Failures: ${p.failures}</span>
            </div>
          `).join('')}
        </div>
        <div class="card" style="flex: 2 1 350px; min-width: 320px;">
          <div class="card-title">Recent Activity</div>
          <div class="card-subtitle">Latest email sending activity</div>
          ${recent.length === 0 ? '<div>No recent activity.</div>' : recent.map(e => `
            <div style="margin-bottom: 7px;">
              <span class="status-badge ${e.status}">${capitalize(e.status)}</span>
              <span style="font-weight: 500;">${e.subject}</span>
              <span style="font-size: 12px; color: #999; margin-left: 8px;">To: ${e.to} (${e.provider || 'N/A'})</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Email Volume</div>
        <div class="card-subtitle">7-day email sending activity</div>
        <div style="color: #aaa; font-size: 13px;">(Graph coming soon)</div>
      </div>
    `;
  }

  async function renderSendEmail() {
    setLastUpdated();
    pageTitle.textContent = 'Send Test Email';
    pageContent.innerHTML = `
      <div class="card" style="max-width: 480px; margin: 0 auto;">
        <div class="card-title">Send Test Email</div>
        <div class="card-subtitle">Send an email through the resilient service</div>
        <form id="send-email-form">
          <div class="form-group">
            <label class="form-label" for="to">To</label>
            <input class="form-input" type="email" id="to" name="to" required value="user@example.com">
          </div>
          <div class="form-group">
            <label class="form-label" for="from">From</label>
            <input class="form-input" type="email" id="from" name="from" required value="noreply@myapp.com">
          </div>
          <div class="form-group">
            <label class="form-label" for="subject">Subject</label>
            <input class="form-input" type="text" id="subject" name="subject" required value="Test Email">
          </div>
          <div class="form-group">
            <label class="form-label" for="message">Message</label>
            <textarea class="form-textarea" id="message" name="message" required>This is a test email from the resilient email service.</textarea>
          </div>
          <button class="button" type="submit">Send Email</button>
        </form>
        <div id="send-status" style="margin-top: 16px;"></div>
      </div>
    `;
    const form = document.getElementById('send-email-form');
    const statusDiv = document.getElementById('send-status');
    form.onsubmit = async (e) => {
      e.preventDefault();
      statusDiv.textContent = 'Sending...';
      const data = {
        to: form.to.value,
        from: form.from.value,
        subject: form.subject.value,
        message: form.message.value
      };
      const resp = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
      if (resp.status === 'queued' || resp.status === 'duplicate') {
        statusDiv.innerHTML = '<span style="color: #2e7d32;">Email queued for sending!</span>';
        form.reset();
      } else {
        statusDiv.innerHTML = '<span style="color: #c62828;">Failed to queue email.</span>';
      }
    };
  }

  // --- Navigation ---
  function handleNavClick(e) {
    const page = e.target.dataset.page;
    if (!page) return;
    setActive(page);
    if (refreshInterval) clearInterval(refreshInterval);
    switch (page) {
      case 'dashboard':
        renderDashboard();
        refreshInterval = setInterval(renderDashboard, 5000);
        break;
      case 'send':
        renderSendEmail();
        break;
      case 'history':
        renderEmailHistory();
        break;
      case 'queue':
        renderQueue();
        refreshInterval = setInterval(renderQueue, 5000);
        break;
      case 'monitoring':
        renderMonitoring();
        refreshInterval = setInterval(renderMonitoring, 5000);
        break;
      case 'analytics':
        renderAnalytics();
        break;
      case 'settings':
        renderSettings();
        break;
      default:
        pageContent.innerHTML = '<div class="card">Coming soon...</div>';
    }
  }

  // --- Email History ---
  async function renderEmailHistory() {
    setLastUpdated();
    pageTitle.textContent = 'Email History';
    const status = await fetch('/api/status').then(r => r.json());
    pageContent.innerHTML = `
      <div class="card">
        <div class="card-title">Email Log</div>
        <div class="card-subtitle">A history of all emails processed by the system</div>
        <table class="table">
          <thead><tr>
            <th>Status</th><th>Recipient</th><th>Subject</th><th>Provider</th><th>Attempts</th><th>Date</th>
          </tr></thead>
          <tbody>
            ${status.map(e => `
              <tr>
                <td><span class="status-badge ${e.status}">${capitalize(e.status)}</span></td>
                <td>${e.to}</td>
                <td>${e.subject}</td>
                <td>${e.provider || '-'}</td>
                <td>${e.attempts}</td>
                <td>${e.date ? new Date(e.date).toLocaleString() : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // --- Queue ---
  async function renderQueue() {
    setLastUpdated();
    pageTitle.textContent = 'Email Queue';
    const queue = await fetch('/api/queue').then(r => r.json());
    pageContent.innerHTML = `
      <div class="card">
        <div class="card-title">Queue Status</div>
        <div class="card-subtitle">Current email processing status</div>
        <div style="margin-bottom: 16px;">
          Queue Size: <b>${queue.length}</b>
          <button id="pause-btn" class="button" style="margin-left:16px;">Pause</button>
          <button id="resume-btn" class="button" style="margin-left:8px;">Resume</button>
          <button id="clear-queue-btn" class="button" style="margin-left:8px;">Clear Queue</button>
        </div>
        <table class="table">
          <thead><tr>
            <th>Recipient</th><th>Subject</th><th>Status</th><th>Attempts</th><th>Last Error</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${queue.map(e => `
              <tr>
                <td>${e.to}</td>
                <td>${e.subject}</td>
                <td><span class="status-badge ${e.status}">${capitalize(e.status)}</span></td>
                <td>${e.attempts}</td>
                <td>${e.lastError || '-'}</td>
                <td>
                  <button class="remove-btn button" data-id="${e.id}" style="color:red;">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Add event listeners for queue controls
    document.getElementById('pause-btn').onclick = async () => {
      await fetch('/api/queue/pause', { method: 'POST' });
      renderQueue();
    };
    document.getElementById('resume-btn').onclick = async () => {
      await fetch('/api/queue/resume', { method: 'POST' });
      renderQueue();
    };
    document.getElementById('clear-queue-btn').onclick = async () => {
      await fetch('/api/queue/clear', { method: 'POST' });
      renderQueue();
    };
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.onclick = async () => {
        await fetch('/api/queue/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: btn.dataset.id })
        });
        renderQueue();
      };
    });
  }

  // --- Monitoring ---
  async function renderMonitoring() {
    setLastUpdated();
    pageTitle.textContent = 'System Monitoring';
    const providers = await fetch('/api/providers').then(r => r.json());
    const logs = await fetch('/api/logs').then(r => r.json());
    pageContent.innerHTML = `
      <div class="card">
        <div class="card-title">Circuit Breaker Status</div>
        <div class="card-subtitle">Circuit breakers prevent cascading failures by temporarily disabling failing providers</div>
        ${providers.map(p => `
          <div style="margin-bottom: 7px;">
            <span class="status-badge ${p.state.toLowerCase()}">${p.state.replace('-', ' ')}</span>
            <span style="font-weight: 500;">${p.name}</span>
            <span style="font-size: 12px; color: #999; margin-left: 8px;">Consecutive Failures: ${p.failures}</span>
          </div>
        `).join('')}
      </div>
      <div class="card">
        <div class="card-title">System Logs</div>
        <div class="card-subtitle">Recent activity and errors</div>
        <div style="max-height: 220px; overflow-y: auto; font-size: 13px; background: #fafbfc; border-radius: 6px; padding: 8px 12px;">
          ${logs.slice(-30).reverse().map(l => `<div style="margin-bottom:2px;"><span style="color:#888;">[${l.timestamp.split('T')[1].split('.')[0]}]</span> <b>${l.level.toUpperCase()}</b> - ${l.message}</div>`).join('')}
        </div>
      </div>
    `;
  }

  // --- Analytics ---
  async function renderAnalytics() {
    setLastUpdated();
    pageTitle.textContent = 'Analytics';
    const status = await fetch('/api/status').then(r => r.json());

    // Compute daily stats for the last 7 days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const dayStats = Array(7).fill(0).map(() => ({ sent: 0, failed: 0 }));
    status.forEach(e => {
      if (!e.date) return;
      const d = new Date(e.date);
      const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diff < 7) {
        const dayIdx = (now.getDay() - diff + 7) % 7;
        if (e.status === 'sent') dayStats[dayIdx].sent++;
        if (e.status === 'failed') dayStats[dayIdx].failed++;
      }
    });

    // Card stats
    const sentCount = status.filter(e => e.status === 'sent').length;
    const failedCount = status.filter(e => e.status === 'failed').length;
    const retryingCount = status.filter(e => e.status === 'retrying').length;
    const queuedCount = status.filter(e => e.status === 'queued').length;
    const totalEmails = status.length;
    const successRate = totalEmails ? ((sentCount / totalEmails) * 100).toFixed(1) : 100;
    const avgDelivery = 1.2; // Placeholder, compute if you have timing data
    const retryRate = totalEmails ? ((retryingCount / totalEmails) * 100).toFixed(1) : 0;

    pageContent.innerHTML = `
      <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 18px;">
        <div class="card" style="flex:1 1 180px; min-width:200px;">
          <div class="card-title">Total Emails</div>
          <div style="font-size:32px;font-weight:700;">${totalEmails}</div>
          <div style="color:#4caf50;font-size:13px;">+12% from last week</div>
        </div>
        <div class="card" style="flex:1 1 180px; min-width:200px;">
          <div class="card-title">Success Rate</div>
          <div style="font-size:32px;font-weight:700;">${successRate}%</div>
          <div style="color:#388e3c;font-size:13px;">+2.1% from last week</div>
        </div>
        <div class="card" style="flex:1 1 180px; min-width:200px;">
          <div class="card-title">Avg. Delivery Time</div>
          <div style="font-size:32px;font-weight:700;">${avgDelivery}s</div>
          <div style="color:#888;font-size:13px;">-0.3s from last week</div>
        </div>
        <div class="card" style="flex:1 1 180px; min-width:200px;">
          <div class="card-title">Retry Rate</div>
          <div style="font-size:32px;font-weight:700;">${retryRate}%</div>
          <div style="color:#888;font-size:13px;">-1.5% from last week</div>
        </div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">
          <div class="card-title" style="margin:0;">Daily Email Volume</div>
          <div style="color:#888;font-size:13px;">Number of emails sent and failed per day</div>
        </div>
        <div style="display:flex;align-items:end;height:220px;gap:24px;padding:16px 0 8px 0;">
          ${dayStats.map((d, i) => {
            const max = Math.max(...dayStats.map(ds => ds.sent + ds.failed), 1);
            const sentHeight = (d.sent / max) * 160;
            const failedHeight = (d.failed / max) * 160;
            return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
              <div style="display:flex;flex-direction:column-reverse;height:170px;">
                <div title="Sent: ${d.sent}" style="width:28px;height:${sentHeight}px;background:#43a047;border-radius:6px 6px 0 0;margin-bottom:2px;"></div>
                <div title="Failed: ${d.failed}" style="width:28px;height:${failedHeight}px;background:#e53935;border-radius:6px 6px 0 0;"></div>
              </div>
              <div style="margin-top:8px;font-size:13px;color:#444;">${days[i]}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  // --- Settings ---
  async function renderSettings() {
    setLastUpdated();
    pageTitle.textContent = 'Settings';
    const settings = await fetch('/api/settings').then(r => r.json());
    pageContent.innerHTML = `
      <div class="card">
        <div class="card-title">Retry Logic Settings</div>
        <div class="card-subtitle">Configure retry behavior for failed email sends</div>
        <form id="retry-settings-form">
          <div class="form-group">
            <label class="form-label">Maximum Attempts: <span id="maxAttemptsVal">${settings.retry.maxAttempts}</span></label>
            <input type="range" min="1" max="10" value="${settings.retry.maxAttempts}" id="maxAttempts"/>
          </div>
          <div class="form-group">
            <label class="form-label">Base Delay: <span id="baseDelayVal">${settings.retry.baseDelay}</span>ms</label>
            <input type="range" min="100" max="5000" step="100" value="${settings.retry.baseDelay}" id="baseDelay"/>
          </div>
          <div class="form-group">
            <label class="form-label">Maximum Delay: <span id="maxDelayVal">${settings.retry.maxDelay}</span>ms</label>
            <input type="range" min="1000" max="30000" step="1000" value="${settings.retry.maxDelay}" id="maxDelay"/>
          </div>
          <div class="form-group">
            <label class="form-label">Backoff Multiplier: <span id="backoffVal">${settings.retry.backoff}x</span></label>
            <input type="range" min="1" max="5" step="0.1" value="${settings.retry.backoff}" id="backoff"/>
          </div>
          <button class="button" type="submit">Save Changes</button>
        </form>
      </div>
      <div class="card">
        <div class="card-title">Rate Limiting Settings</div>
        <div class="card-subtitle">Configure rate limits to prevent API abuse</div>
        <form id="rate-settings-form">
          <div class="form-group">
            <label class="form-label">Maximum Requests: <span id="maxReqVal">${settings.rateLimit.max}</span></label>
            <input type="range" min="10" max="500" value="${settings.rateLimit.max}" id="maxRequests"/>
          </div>
          <div class="form-group">
            <label class="form-label">Time Window: <span id="windowVal">${settings.rateLimit.windowMs/1000}</span>s</label>
            <input type="range" min="10" max="600" value="${settings.rateLimit.windowMs/1000}" id="windowSec"/>
          </div>
          <button class="button" type="submit">Save Changes</button>
        </form>
      </div>
    `;
    // Retry settings handlers
    const retryForm = document.getElementById('retry-settings-form');
    retryForm.maxAttempts.oninput = () => document.getElementById('maxAttemptsVal').textContent = retryForm.maxAttempts.value;
    retryForm.baseDelay.oninput = () => document.getElementById('baseDelayVal').textContent = retryForm.baseDelay.value;
    retryForm.maxDelay.oninput = () => document.getElementById('maxDelayVal').textContent = retryForm.maxDelay.value;
    retryForm.backoff.oninput = () => document.getElementById('backoffVal').textContent = retryForm.backoff.value + 'x';
    retryForm.onsubmit = async (e) => {
      e.preventDefault();
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retry: {
          maxAttempts: Number(retryForm.maxAttempts.value),
          baseDelay: Number(retryForm.baseDelay.value),
          maxDelay: Number(retryForm.maxDelay.value),
          backoff: Number(retryForm.backoff.value)
        } })
      });
      alert('Retry settings updated!');
    };
    // Rate limit settings handlers
    const rateForm = document.getElementById('rate-settings-form');
    rateForm.maxRequests.oninput = () => document.getElementById('maxReqVal').textContent = rateForm.maxRequests.value;
    rateForm.windowSec.oninput = () => document.getElementById('windowVal').textContent = rateForm.windowSec.value;
    rateForm.onsubmit = async (e) => {
      e.preventDefault();
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rateLimit: {
          max: Number(rateForm.maxRequests.value),
          windowMs: Number(rateForm.windowSec.value) * 1000
        } })
      });
      alert('Rate limit settings updated!');
    };
  }

  navItems.forEach(item => {
    item.addEventListener('click', handleNavClick);
  });

  // Initial load
  renderDashboard();
  refreshInterval = setInterval(renderDashboard, 5000);
});
