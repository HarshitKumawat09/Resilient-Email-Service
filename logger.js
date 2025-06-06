// Simple logging utility
const logs = [];

function log(level, message) {
  const entry = { timestamp: new Date().toISOString(), level, message };
  logs.push(entry);
  if (logs.length > 500) logs.shift(); // Keep last 500 logs
  console[level === 'error' ? 'error' : 'log'](`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`);
}

module.exports = {
  info: msg => log('info', msg),
  warn: msg => log('warn', msg),
  error: msg => log('error', msg),
  getLogs: () => logs.slice(),
};
