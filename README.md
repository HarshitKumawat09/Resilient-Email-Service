# 🚀 Resilient Email Service

A robust, modern, and fully-featured email sending platform built with vanilla JavaScript and Node.js. Designed for reliability, transparency, and ease of use, this service implements advanced delivery strategies and a beautiful dashboard UI.

-----

## ✨ Key Features

- **Smart Retry Logic**: Automatic exponential backoff for failed sends.
- **Multi-Provider Fallback**: Seamless switching between providers for maximum uptime.
- **Idempotency**: Prevents duplicate email sends with unique request tracking.
- **Rate Limiting**: Configurable limits to avoid spamming and provider throttling.
- **Circuit Breaker Pattern**: Detects failing providers and temporarily disables them to protect your queue.
- **Queue Management**: Emails are queued and processed reliably, even under load.
- **Comprehensive Logging**: Real-time status, error, and activity logs.
- **Modern Dashboard**: Clean, responsive UI for monitoring, sending, and managing emails.
- **Fully Testable**: Includes unit tests for core logic and features.

-----

## 🗂️ Project Structure

```
EmailService/
├── app.js             # Frontend logic (dashboard, UI)
├── emailService.js    # Core backend logic (queue, retry, fallback)
├── logger.js          # Logging utility
├── mockProviders.js   # Mock provider implementations
├── server.js          # Express API server
├── styles.css         # Modern CSS for the dashboard
├── index.html         # Main HTML UI
├── tests/             # Unit tests
└── README.md          # This file
```

-----

## ⚙️ Getting Started

1. **Install Node.js** (v14 or newer)
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Start the server**
   ```bash
   npm start
   ```
4. **Open your browser**
   [http://localhost:3000](http://localhost:3000)

-----

## 🖥️ Usage & Dashboard

- **Send Test Emails:** Use the dashboard to compose and send emails.
- **Monitor Providers:** View real-time status, circuit breaker state, and failure counts.
- **Queue Management:** Pause, resume, or clear the email queue.
- **Settings:** Adjust retry and rate limit configurations directly from the UI.
- **Logs:** Inspect recent activity and error logs for transparency.

-----

## 🛠️ Architecture Overview

- **Backend:** Node.js, Express, modular JS
- **Frontend:** Vanilla JS, CSS, HTML
- **Providers:** Mocked for demo (easy to extend for real providers)
- **Patterns:** Circuit breaker, retry with backoff, idempotency, queue

-----

## 🧪 Testing

Run all unit tests:
```bash
npm test
```
-----

## 📸 Screenshots

Dashboard Preview![Screenshot 2025-06-06 213058](https://github.com/user-attachments/assets/37cbd2b4-5e09-49bc-8e2c-ece15f1a9dcc)

Send Mails![Screenshot 2025-06-06 213116](https://github.com/user-attachments/assets/38a89187-f787-4878-96f5-5d269d418b1b)

Email History![Screenshot 2025-06-06 213138](https://github.com/user-attachments/assets/2f170254-5a2e-425d-9b8c-d1ea64cd9da1)

Email Queue![Screenshot 2025-06-06 213149](https://github.com/user-attachments/assets/2b4d98e4-1945-489e-9820-790da35fd9ce)

System Monitoring![Screenshot 2025-06-06 213201](https://github.com/user-attachments/assets/ea6c97f3-d1dd-4618-afaa-8952cee86a0c)


Analytics![Screenshot 2025-06-06 213211](https://github.com/user-attachments/assets/861c9727-f8a4-47ec-b6a8-2960f8ba0369)


Settings![Screenshot 2025-06-06 213233](https://github.com/user-attachments/assets/316c6a57-173d-4b13-a5af-fe5392607e35)

-----

-----

> **Built for reliability. Designed for clarity. Ready to extend.**
