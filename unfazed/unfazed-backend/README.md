# Unfazed API — Modules 1–7

## Start immediately in demo mode

```bash
npm install
npm run dev
```

With no `MONGO_URI`, development starts an ephemeral, in-memory MongoDB and seeds the demo therapist automatically. This makes the auth → availability → booking → demo payment → invoice → CRM → notes flow usable without database credentials.

Demo sign-in:

```text
ananya@example.com
DemoPass123!
```

The in-memory database resets each time the API restarts. For persistent data, copy `.env.example` to `.env`, configure `MONGO_URI` for MongoDB Atlas/local Mongo, then run `npm run seed` once.

> Do not use the in-memory fallback or development JWT secret in production. A production start requires both `MONGO_URI` and `JWT_SECRET`.

## Payments and Razorpay

- With `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, booking/package orders use Razorpay test checkout.
- Configure Razorpay's webhook URL as `https://your-api-host/api/webhooks/razorpay`; the raw request signature is verified before a payment becomes `captured` and an invoice is generated.
- Without Razorpay keys the project intentionally uses a **demo payment confirmation**. It is suitable only for local demonstrations.
- Generated invoice PDFs are stored under `storage/invoices` and only delivered through authorization-checked API routes.

## Notes privacy model

Therapist endpoints can access private and shared notes only for their own practice. The client portal uses a separately-scoped JWT supplied after booking/intake or by the therapist. Its query is hard-filtered to `type: 'shared'`; private notes never enter its result set.

## API map

| Area | Endpoint |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Profile | `GET /api/therapists/public/:slug`, `PATCH /api/therapists/me/profile` |
| Availability | `GET/PUT /api/therapists/me/availability`, `GET /api/public/therapists/:slug/availability` |
| Booking | `POST /api/public/therapists/:slug/bookings`, `GET /api/sessions` |
| CRM | `GET/POST /api/clients`, `GET/PATCH /api/clients/:clientId` |
| Intake | `POST /api/public/therapists/:slug/intake` |
| Packages | `GET/POST /api/packages`, `GET/POST /api/public/therapists/:slug/packages` |
| Payments | `GET /api/payments`, public checkout under `/api/public/payments/:paymentId/*` |
| Notes | `GET/POST /api/notes`, `GET/PATCH/DELETE /api/notes/:noteId` |
| Client portal | `GET /api/client-portal/me/notes` |
| Subscription | `GET /api/subscription`, `POST /api/subscription/demo-switch-tier` (non-production demo only) |
| Analytics | `GET /api/analytics?months=1` |

## Module 6 — Communication and notifications

- Socket.io authenticates therapist JWTs and scoped client-portal JWTs at handshake time.
- Conversations are authorized against the therapist/client relationship before a user may join, send, type, or mark messages read.
- REST history endpoints back the real-time client, so refreshing a browser does not lose a conversation.
- `NotificationService` records idempotent in-app notifications, sends email only when SMTP is configured, and deliberately writes WhatsApp actions to a stub log/queue boundary.
- A 15-minute reminder job finds sessions due in roughly 24 hours. Event keys prevent reminders from duplicating across runs.


## Module 7 — Subscriptions, entitlements, and analytics

- `SubscriptionTierConfig` contains tier names, capacity caps, and feature flags. It deliberately contains **no plan prices**. Default configuration is bootstrapped idempotently on API start and seeding.
- `EntitlementService` is the only authority for feature access. Its `canAccess(therapistId, featureKey)` API and guarded helper enforce active-client capacity, SOAP/DAP template access, and requested analytics history. Routes never compare tier-name strings.
- Entitlement denials use HTTP `403` with `error.details.code: "ENTITLEMENT_REQUIRED"` and safe upgrade metadata for the UI.
- Analytics data is computed server-side using MongoDB aggregation: captured `Payment` revenue grouped by month, active `Client` totals, and `Session` no-show totals/rate.
- `POST /api/subscription/demo-switch-tier` is disabled in production. It exists only to let a reviewer test config-driven access locally; a production billing workflow should be the sole writer of a therapist tier.

## CRM aggregate record

`GET /api/clients/:clientId` is therapist-scoped and returns the client record together with its session history, payment history, and therapist note history. The portal endpoint remains a separate query that can return shared notes only.

## Package counts

Session-package configuration intentionally accepts the project brief's 3, 6, or 12-session counts. A client package tracks the purchased, remaining, and redeemed session counts plus expiry, and a package-funded booking reduces the remaining count atomically after its reservation is made.
