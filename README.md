# Resilient Email Service

A resilient email sending service built in vanilla JavaScript, featuring retry logic, fallback providers, idempotency, rate limiting, circuit breaker, queue, and a modern dashboard UI.

## Features
- Retry mechanism with exponential backoff
- Fallback between two mock providers
- Idempotency (no duplicate sends)
- Rate limiting
- Status tracking and logging
- Circuit breaker pattern
- Email queue system
- Modern frontend (vanilla JS, CSS)

## Project Structure
- `index.html` — Main frontend UI
- `styles.css` — CSS for UI
- `app.js` — Frontend JS logic
- `server.js` — Node.js backend (API, static files)
- `emailService.js` — Core logic (queue, retry, fallback, etc.)
- `mockProviders.js` — Mock email providers
- `logger.js` — Logging utility
- `tests/` — Unit tests

## Setup & Run
1. Install Node.js (v14+)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage
- Use the dashboard to send test emails, view queue, monitor status, and adjust settings.
- All operations are simulated with mock providers.

## Testing
Run unit tests:
```bash
npm test
```

## Architecture
- **Backend**: Node.js, Express, vanilla JS modules
- **Frontend**: Vanilla JS, CSS, HTML
- **Providers**: Two mock providers, random success/failure
- **EmailService**: Handles queue, retry, fallback, idempotency, rate limiting, circuit breaker

## Screenshots
![Dashboard]("C:\Users\Dell\OneDrive\Pictures\Screenshots\Screenshot 2025-06-06 213058.png")


