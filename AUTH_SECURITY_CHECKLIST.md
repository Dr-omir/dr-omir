# Dr.Omir Authentication — Production Hardening Checklist

The application code now covers the client-side authentication flows: Email/Password sign-in, sign-up, email verification, password reset, Google sign-in, account linking, logout/session persistence, loading/error states, and responsive auth UI.

## Firebase Console actions still required

These settings cannot be safely changed by a static front-end file and must be applied in the Firebase/Google console.

### 1. Authentication providers
- Enable Email/Password.
- Enable Google.
- Keep other providers disabled until their OAuth credentials and policies are ready.

### 2. Authorized domains
For local development add:
- `localhost`
- `127.0.0.1`

For production add only the real domains you control, such as:
- `dr-omir.web.app`
- your final custom domain when it is connected.

Do not add arbitrary third-party domains.

### 3. Password policy
Recommended production baseline:
- Minimum 8 characters.
- Require lowercase.
- Require uppercase.
- Require a number.
- Require a non-alphanumeric character.

Apply the same policy in Firebase Authentication so the server-side rule is authoritative.

### 4. Email enumeration protection
Enable Email Enumeration Protection. The UI intentionally uses generic password-reset messaging so it does not reveal whether an email is registered.

### 5. Brute-force protection / quotas
Review Identity Toolkit API quotas in Google Cloud and keep sign-in/account-creation limits appropriately tight for the expected traffic.

### 6. Google OAuth
Keep the Web client ID/secret managed by Google/Firebase. Do not hard-code a client secret in this static front-end. If a provider configuration changes, re-check the OAuth consent screen and authorized domains.

### 7. Admin security
The application uses a single bootstrap admin email (`dr.omir.ahmed@gmail.com`) and Firestore role checks. For a larger production deployment, move administrator authorization to Firebase Auth custom claims set from a trusted backend/Cloud Function.

### 8. Multi-factor authentication
For higher-risk deployments, consider upgrading to Google Cloud Identity Platform and adding MFA for administrator accounts first.

## User-facing security behavior

- Password reset never confirms whether an address exists.
- Email/password errors do not expose unnecessary account-enumeration detail.
- Google account conflicts are handled with a secure password sign-in + credential-link flow.
- User profile updates preserve the role; normal users cannot promote themselves through the client.
- Logout clears the active Firebase session and pending Google credential state.
