# Dr.Omir Medical Platform

Static medical portfolio + Firebase authentication + Firestore educational library.

## Structure

```text
index.html
Pages/
  admin.html
  auth.html
  profile.html
css/
  style.css
  app.css
  admin.css
  admin-resources.css
  profile.css
js/
  firebase.js
  script.js
  auth-page.js
  profile.js
  admin.js
  services-auth.js
  services-categories.js
  services-resources.js
  services-videos.js
  services-certificates.js
  services-activity.js
assets/
  doctor-placeholder.svg
firestore.rules
SETUP_ADMIN.md
```

## Firebase

- Authentication: Email/Password + Google popup, email verification, password reset, secure Google account linking, persistent sessions, and production-oriented error handling.
- Firestore: users, categories, resources, videos, certificates, activities.
- Public content is readable by everyone.
- Content writes are administrator-only.
- User profiles are private to the owner, except administrators.

## Admin

The configured admin email is `dr.omir.ahmed@gmail.com`.

The admin dashboard includes an editable Admin Profile section.

## Security

Publish the included `firestore.rules` before using the site in production. The final rules prevent normal users from self-promoting to admin and restrict all content writes to the administrator role.

## Authentication hardening

See `AUTH_SECURITY_CHECKLIST.md` for the Firebase Console settings that must be applied before production.
