# Karyam Dessin ERP Deployment Notes

This final build uses Firebase Authentication for real Google sign-in and Firestore for realtime data sync.

## Required Firebase setup

Create or open your Firebase project, then enable:

- Authentication: Google provider
- Authentication: Email/Password provider, if you want email/password login too
- Firestore Database

Firestore rules:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /erp-data/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Add these environment variables in your hosting provider:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

After deployment, add the production domain to Firebase Authentication > Settings > Authorized domains.

## Google login

Google login is real OAuth. Do not store or hard-code a Google password in this app. The user signs in on Google's own secure page.

## Fresh data

The app now uses a new local storage key, `karyam-erp-v2-fresh`, so old browser-local ERP data will not load into this final version.
