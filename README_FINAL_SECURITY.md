# Dr.Omir — Final Security Notes

## Firestore
Publish `firestore.rules` from the Firebase Console after reviewing the admin email.

The rules use two layers:
1. A one-time bootstrap path for `dr.omir.ahmed@gmail.com` to create its own admin profile.
2. Role-based admin authorization after the `users/{uid}` profile exists.

Normal users cannot self-promote because user profile updates must keep `role == "user"`.

Public collections (`categories`, `resources`, `videos`, `certificates`) are read-only for the public and admin-write only.

Activities can be created only for the signed-in user's own UID; global activity access is admin-only.
