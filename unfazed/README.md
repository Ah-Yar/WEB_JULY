# Unfazed — Modules 1–7

A MERN therapist-practice SaaS implementation based on the project brief.

- `unfazed-backend`: Express/MongoDB API with JWT auth, scheduling, CRM/intake, Razorpay-ready payment services, invoices, packages, and privacy-safe clinical-note APIs.
- `unfazed-frontend`: Vite/React client experience and therapist dashboard.

## Quick demo

```bash
npm run dev
```

Run this from the parent `unfazed` folder. It installs both sibling applications when needed and starts the API plus frontend together. See [QUICKSTART.md](./QUICKSTART.md) for local VS Code instructions.

A no-configuration, in-memory development database seeds `ananya@example.com` / `DemoPass123!`. It resets when the backend restarts. Add MongoDB Atlas and Razorpay test credentials to the backend `.env` for persistent/live integration.

## Module 6

Module 6 adds authenticated Socket.io chat, persisted message history, read receipts, typing indicators, in-app notifications, optional SMTP email delivery, intentional WhatsApp stubs, and a 24-hour session-reminder job.

## Module 7

Module 7 adds a configuration-driven `SubscriptionTierConfig` collection and a centralized Entitlement Service. Active-client capacity, structured SOAP/DAP notes, and analytics history are gated only through that service. The new Analytics & plan workspace uses MongoDB aggregation pipelines for captured-revenue trends, active-client count, and no-show rate. Local demo mode includes a clearly labeled plan switcher so every entitlement can be reviewed without a subscription billing account.

## Verification status

The complete Modules 1–7 demo flow has been exercised through the Vite proxy against a fresh seeded database: therapist registration/login/profile, availability and duplicate-booking protection, intake/consent, demo payment capture and invoice PDFs, package credit redemption, private/shared-note isolation, authenticated Socket.io chat and notifications, and tier-gated analytics. Live Razorpay checkout/webhook delivery still requires the project owner's Razorpay test credentials.
