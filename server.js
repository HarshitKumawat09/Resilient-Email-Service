const express = require('express');
const path = require('path');
const emailService = require('./emailService');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API Endpoints
app.post('/api/send', async (req, res) => {
  const { to, from, subject, message, idempotencyKey } = req.body;
  if (!to || !from || !subject || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const result = await emailService.sendEmail({ to, from, subject, message }, idempotencyKey);
  res.json(result);
});

app.get('/api/status', (req, res) => {
  res.json(emailService.getStatus());
});

app.get('/api/queue', (req, res) => {
  res.json(emailService.getQueue());
});

app.get('/api/providers', (req, res) => {
  res.json(emailService.getProviderStatus());
});

app.get('/api/logs', (req, res) => {
  res.json(logger.getLogs());
});

app.get('/api/settings', (req, res) => {
  res.json({ retry: emailService.retryConfig, rateLimit: emailService.rateLimit });
});

app.post('/api/settings', (req, res) => {
  emailService.setConfig(req.body);
  res.json({ ok: true });
});

emailService.startAutoSend();

// Pause queue processing
app.post('/api/queue/pause', (req, res) => {
  emailService.stopAutoSend();
  res.json({ ok: true });
});

// Resume queue processing
app.post('/api/queue/resume', (req, res) => {
  emailService.startAutoSend();
  res.json({ ok: true });
});

// Clear the entire queue
app.post('/api/queue/clear', (req, res) => {
  // Only clear queued emails, not sent/failed
  emailService.queue.forEach(item => {
    const status = emailService.statusMap[item.id]?.status;
    if (status === 'queued') {
      delete emailService.statusMap[item.id];
    }
  });
  emailService.queue = [];
  res.json({ ok: true });
});

// Remove a single email from the queue
app.post('/api/queue/remove', (req, res) => {
  const { id } = req.body;
  emailService.queue = emailService.queue.filter(item => item.id !== id);
  // Remove status if still queued
  if (emailService.statusMap[id]?.status === 'queued') {
    delete emailService.statusMap[id];
  }
  res.json({ ok: true });
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
