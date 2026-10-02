# Unfazed Web App — Modules 1–7

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

The Vite development server proxies relative `/api` traffic to `http://localhost:5000`. Start the backend before using authenticated, availability, booking, or CRM actions.

Routes:

- `/register`, `/login`: therapist authentication
- `/:slug`: public therapist profile, for example `/dr-ananya`
- `/:slug/book`: timezone-aware client booking
- `/:slug/intake`: public intake and consent
- `/app/*`: protected therapist dashboard, public profile editor, availability, schedule, and CRM

`/dr-ananya` is a graceful visual demo if the API is not running. Run the backend seed command to make the same profile live.

## Module 6 routes

- `/app/messages`: therapist real-time client conversations and in-app practice notifications
- `/portal`: client shared-note space, notifications, and therapist chat

The client portal must be opened with a scoped portal token issued after booking/intake or through the therapist’s `POST /api/clients/:clientId/portal-link` endpoint. In development, Vite proxies both `/api` and `/socket.io` to the backend.


## Module 7 route

- `/app/analytics`: protected Analytics & plan workspace. It shows server-aggregated captured revenue, active clients, and no-show rate; offers a history selector; and renders the reusable upgrade prompt when a feature is gated.
- In local development, the plan cards offer a clearly labelled demo switcher so Starter, Professional, and Practice entitlements can be verified. Production plan changes are not made by the frontend.
