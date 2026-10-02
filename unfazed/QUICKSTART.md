# Run Unfazed in VS Code

## One-command local start

1. Open the **`unfazed`** folder in VS Code — not `unfazed-frontend` or `unfazed-backend` by itself.
2. Open **Terminal → New Terminal**.
3. Run:

   ```bash
   npm run dev
   ```

   This installs backend/frontend dependencies if needed, starts MongoDB demo mode automatically when no database URI is supplied, and starts both servers.

4. In a browser, open [http://localhost:5173](http://localhost:5173).

## Demo authentication

```text
Email:    ananya@example.com
Password: DemoPass123!
```

The demo account is seeded only when you do **not** set `MONGO_URI`. If you configure a fresh MongoDB Atlas database, sign up through `/register` first, or run this in another terminal once:

```bash
npm --prefix unfazed-backend run seed
```

## If authentication still fails

- Confirm the terminal includes both: `Unfazed API listening on port 5000` and Vite `ready`.
- Visit [http://localhost:5000/api/health](http://localhost:5000/api/health). It should return JSON with `"status":"ok"`.
- If the login page says it cannot reach the API, do not run only the frontend. Stop both terminals and use `npm run dev` from the parent `unfazed` folder.
- If the API says MongoDB could not start, add a valid MongoDB Atlas/local URI to `unfazed-backend/.env`; see `.env.example`.
