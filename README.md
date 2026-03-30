# CalGenie (Expo React Native App)

CalGenie is a calorie-tracking app where users can:

- register/login
- enter profile data (weight, height, age, gender)
- get BMI category and weight suggestion
- set a daily calorie goal
- scan/upload food images (YOLO integration scaffolded)
- view consumed vs remaining calories and food history

## Tech stack

- Expo + React Native + TypeScript
- React Navigation (Native Stack)
- `expo-image-picker` and `expo-image`
- Simple app-level auth store via React Context

## Current app flow

1. Splash -> Login
2. Register:
   - calls `POST /api/auth/register`
   - stores JWT + user in app store
   - shows BMI category and suggested goal (Gain/Maintain/Lose)
   - asks user for daily calorie goal
3. Login:
   - calls `POST /api/auth/login`
   - stores JWT + user in app store
   - redirects to Dashboard
4. Dashboard:
   - capture/upload food image
   - placeholder calorie detection hook
   - shows consumed/remaining calories
   - shows food history list

## Project structure

```text
src/
  components/            # Reusable UI components
  navigation/            # Root stack navigator
  screens/               # Splash, Login, Register, Dashboard
  services/              # API client + domain services
    apiClient.ts
    authService.ts
    foodDetectionService.ts
  store/                 # Global app state (auth + daily calorie goal)
    authStore.tsx
  types/                 # Shared TypeScript types
```

## Prerequisites

- Node.js 18+ (recommended)
- npm
- Expo CLI via `npx expo ...`
- Android Studio emulator / iOS simulator / Expo Go
- Running backend API server

## Installation

```bash
npm install
```

## Frontend configuration

Set API base URL in `app.json`:

```json
"extra": {
  "API_BASE_URL": "http://localhost:5000"
}
```

This value is read by `src/services/apiClient.ts`.

## Backend environment (example)

Use these variables in your backend project:

```env
DATABASE_URL="postgresql://postgres:admin@localhost:5432/calorie_tracker_db"
JWT_SECRET="supersecretkey"
PORT=5000
```

## Run the app

Start Expo dev server:

```bash
npm run start
```

Run directly on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

Run on web:

```bash
npm run web
```

## API endpoints used

### Register

- `POST /api/auth/register`

Request:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "weight": 70,
  "height": 175,
  "age": 25,
  "gender": "male"
}
```

Response:

```json
{
  "token": "<jwt_token>",
  "user": {
    "name": "John Doe",
    "bmi": 22.9,
    "bmiCategory": "Normal"
  }
}
```

### Login

- `POST /api/auth/login`

Request:

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "token": "<jwt_token>",
  "user": {
    "name": "John Doe",
    "bmi": 22.9,
    "bmiCategory": "Normal"
  }
}
```

## Important networking note

- `http://localhost:5000` works for:
  - web in the same machine browser
  - emulator/simulator when localhost is mapped correctly
- For a real phone device, use your computer LAN IP (example `http://192.168.1.12:5000`) and make sure phone + PC are on same network.

## Useful scripts

- `npm run start` - start Expo
- `npm run android` - open Android
- `npm run ios` - open iOS
- `npm run web` - run web build
- `npm run lint` - lint checks

## What is scaffolded vs done

Done:

- Auth integration (`register`, `login`)
- Auth + daily-goal store
- Register multi-step onboarding UI
- Dashboard summary and history UI

Scaffolded (placeholder):

- Food calorie detection from YOLO (`src/services/foodDetectionService.ts`)
- Persisting auth token/history to local storage

## Troubleshooting

### App cannot reach backend

- Confirm backend is running on port `5000`.
- Confirm `API_BASE_URL` matches your environment.
- If on real device, replace `localhost` with LAN IP.

### CORS / network errors on web

- Enable CORS on backend for Expo web origin.

### Login/Register fails with 4xx/5xx

- Verify request body shape matches backend contract.
- Check backend logs for validation/database errors.
