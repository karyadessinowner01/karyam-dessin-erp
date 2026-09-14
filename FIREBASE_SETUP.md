# Firebase Firestore Setup Guide — Karyam Dessin ERP

This guide walks you through setting up Firebase so that your ERP data syncs in real-time across all devices.

## Step 1: Create a Firebase Project

1. Go to **[Firebase Console](https://console.firebase.google.com/)**
2. Click **"Add project"** → name it `karyam-dessin-erp` → Continue
3. Disable Google Analytics (not needed) → Create project

## Step 2: Add a Web App

1. In your Firebase project, click the **Web icon `</>`** to add an app
2. Nickname: `Karyam Dessin ERP`
3. **Skip** "Set up Firebase Hosting" for now
4. Click **"Register app"**
5. You'll see a config object like:
```js
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXX",
  authDomain: "karyam-dessin-erp.firebaseapp.com",
  projectId: "karyam-dessin-erp",
  storageBucket: "karyam-dessin-erp.appspot.com",
  messagingSenderId: "1234567890123",
  appId: "1:1234567890123:web:abcdef123456"
};
```
6. **Copy these values** — you'll paste them into `.env.local`

## Step 3: Enable Authentication

1. In Firebase Console → **Authentication** → **Get started**
2. Go to **Sign-in method** tab
3. Enable **Email/Password** (toggle ON → Save)
4. Enable **Google** (toggle ON → select support email → Save)

## Step 4: Create Firestore Database

1. In Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode** → Next
3. Choose location (e.g., `asia-south1` for India) → Enable

## Step 5: Set Firestore Security Rules

1. In Firestore → **Rules** tab
2. Replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Each user can only read/write their own ERP data
    match /erp-data/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

3. Click **Publish**

This ensures each user's data is private — they can only access their own `erp-data/{uid}` document.

## Step 6: Add Config to Your Project

1. Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

2. Open `.env.local` and paste your Firebase config values:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=karyam-dessin-erp.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=karyam-dessin-erp
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=karyam-dessin-erp.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890123
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890123:web:abcdef123456
```

3. **Restart the dev server**:
```bash
bun run dev
```

## Step 7: Create Your Admin Account

1. In Firebase Console → **Authentication** → **Users** → **Add user**
2. Email: `karyam.dessin@gmail.com`
3. Password: (choose a strong password)
4. Click **Add user**

Or, once the app is running, you can sign up directly from the login page using the "Sign up" option.

## How It Works

### Data Flow
```
Login (Firebase Auth) → User UID
    ↓
Zustand Store loads from Firestore: erp-data/{uid}
    ↓
Local edits → Debounced write to Firestore (800ms)
    ↓
Firestore onSnapshot → Other devices receive real-time update
    ↓
Other devices' Zustand store merges the remote state
```

### Per-User Data Isolation
- Each user's ERP data is stored at `erp-data/{uid}` in Firestore
- Firestore security rules ensure users can only read/write their own document
- Different users have completely separate data sets

### Real-Time Sync
- When you make a change on Device A, it writes to Firestore (debounced 800ms)
- Firestore `onSnapshot` pushes the change to Device B within ~1 second
- Device B's local store updates automatically — no refresh needed

### Fallback Mode
If Firebase is not configured (placeholder env vars), the app automatically falls back to **localStorage** mode — same as before. This allows development without Firebase.

## Troubleshooting

### "Firebase not configured" message in console
→ Your `.env.local` still has `YOUR_` placeholder values. Fill in real config.

### Permission denied errors
→ Check Firestore security rules (Step 5). Make sure they're published.

### Data not syncing
→ Ensure both devices are logged in with the **same Firebase Auth account**. Different accounts = different data documents.

### Google login popup blocked
→ Allow popups for your domain in browser settings.
