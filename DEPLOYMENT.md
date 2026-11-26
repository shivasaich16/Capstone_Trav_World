# Trav-World — single-link deployment

This package keeps the existing Trav-World interface and connects it to the Express API.
In production, Express serves both the website and `/api/*` from the same Render service,
so visitors use one public URL.

## Included
- `frontend/`: the current GitHub Pages frontend (canonical source).
- `backend/public/`: the same frontend copied for Express static hosting.
- `backend/src/`: authentication, experiences and bookings APIs.
- `render.yaml`: Render Blueprint for one web service plus a persistent disk.

## Deploy to Render

1. Push this project to the GitHub repository you want to deploy.
2. In Render, choose **New + → Blueprint** and connect that repository.
3. Render reads `render.yaml`. Confirm creation of the `trav-world` web service.
4. The Blueprint creates a Starter web service and a 1 GB persistent disk. The disk is
   important: this backend currently stores accounts and bookings in a JSON file under
   `backend/data`. Without persistent storage, that data can disappear after a restart
   or redeploy.
5. Wait for the deployment and open the service's `onrender.com` URL.
6. Verify `https://YOUR-SERVICE.onrender.com/api/health` returns JSON with `"status":"ok"`.
7. Open `https://YOUR-SERVICE.onrender.com` — this is the single final website link.

Render generates `JWT_SECRET` automatically. Do not commit `.env` files or real secrets.

## Local testing

Terminal 1:
```bash
cd backend
npm install
# Copy .env.example to .env and set a long random JWT_SECRET
npm run dev
```

Terminal 2: open `frontend/index.html` using VS Code Live Server. The frontend detects
localhost Live Server and calls `http://localhost:4000/api`. On Render it calls `/api`
on the same domain.

## Important notes
- Checkout is explicitly a **demo payment** flow. It does not collect real money.
- The JSON-file database is suitable for this demo deployment with the configured
  persistent disk, but it is not a multi-instance production database. For a larger
  production launch, migrate the store to PostgreSQL.
- GitHub Pages can remain enabled, but use the Render URL as the one-link version.
  The GitHub Pages URL is no longer needed for visitors to use the integrated site.
