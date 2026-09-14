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
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    function hasValidErpFields() {
      return request.resource.data.keys().hasOnly(['state', 'updatedAt', 'uid', 'migratedFrom']) &&
        request.resource.data.uid == request.auth.uid &&
        request.resource.data.updatedAt is timestamp &&
        (
          request.resource.data.state == null ||
          (
            request.resource.data.state is string &&
            request.resource.data.state.size() < 900000
          )
        );
    }

    match /erp-data/karyam-dessin-main {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn() && hasValidErpFields();
      allow delete: if false;
    }

    match /erp-data/{uid} {
      allow read: if isOwner(uid);
      allow create, update: if isOwner(uid) && hasValidErpFields();
      allow delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
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

## WhatsApp Cloud API

This build includes:

- `POST /api/whatsapp/send` for outgoing WhatsApp text messages
- `GET /api/whatsapp/webhook` for Meta webhook verification
- `POST /api/whatsapp/webhook` for incoming WhatsApp messages that should become ERP chat messages/leads

Add these server-only variables in Vercel. Do not prefix these with `NEXT_PUBLIC_`:

```env
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_API_VERSION=v24.0
FIREBASE_SERVICE_ACCOUNT_BASE64=
```

Webhook callback URL for Meta:

```txt
https://karyam-dessin-erp.vercel.app/api/whatsapp/webhook
```

Use the same value in Meta's Verify Token field and Vercel's `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

`FIREBASE_SERVICE_ACCOUNT_BASE64` is a base64-encoded Firebase service account JSON. It lets the Vercel webhook securely update the shared Firestore ERP document.

## Google login

Google login is real OAuth. Do not store or hard-code a Google password in this app. The user signs in on Google's own secure page.

## Fresh data

The app now uses a new local storage key, `karyam-erp-v2-fresh`, so old browser-local ERP data will not load into this final version.
