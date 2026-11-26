# Backend — local persistent JSON datastore

This version deliberately avoids native database modules, so `npm install` does not require Visual Studio C++ build tools or a Windows SDK.

From this backend folder:
1. Copy `.env.example` to `.env` and set a long random JWT_SECRET.
2. Run `npm.cmd install`.
3. Run `npm.cmd run dev`.

The app automatically creates `backend/data/service-booker.json` and seeds six experiences on first startup. User registrations and booking requests are saved in that file and survive restarts.

Endpoints:
- GET `/api/health`
- GET `/api/experiences`
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/bookings`
- GET `/api/bookings` (development inspection only; secure before production)
