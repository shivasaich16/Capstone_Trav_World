# Trav-World frontend refresh

This ZIP contains a replacement `frontend/` folder only. It does not include or modify the backend or database.

## Local run steps

1. Extract the ZIP.
2. Copy the extracted `frontend` folder into your existing `Service-booker-pro/` project folder and choose **Replace** when Windows asks. This replaces only the frontend.
3. In VS Code, open two terminals.

### Terminal 1 — backend (leave it running)
```powershell
cd D:\Service-booker-pro-no-native-db\Service-booker-pro\backend
npm run dev
```

### Terminal 2 — frontend
```powershell
cd D:\Service-booker-pro-no-native-db\Service-booker-pro\frontend
npx serve . -l 5173
```

4. Open `http://localhost:5173` in your browser.

The frontend calls `http://localhost:4000/api`, matching the existing local backend. The backend must be running for login, registration, booking and booking history. If the API is unavailable, the UI displays sample experiences so you can still preview the design.

## Public HTTPS link

`localhost` is only accessible on your computer. A permanent public HTTPS link requires deploying the frontend and backend to hosting. Because the backend currently uses local JSON-file storage, it also needs persistent hosting/storage configuration before public use. Do not publish the local `.env` file or JWT secret.

The frontend uses image URLs hosted by Unsplash and Google Fonts, so an internet connection is needed for those remote assets.
