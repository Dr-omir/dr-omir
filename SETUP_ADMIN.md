# Dr.Omir — Admin Setup

## 1. Firebase Authentication
Create the administrator account in Firebase Authentication using Email/Password.

The current administrator email used by the security rules is:

`dr.omir.ahmed@gmail.com`

If you change the administrator email later, update the same email in:

- `js/services-auth.js`
- `firestore.rules`

## 2. Firestore Rules
Open Firebase Console → Firestore Database → Rules and replace the existing rules with the complete contents of `firestore.rules`.

Publish the rules.

The rules are designed so that:

- Public users can read educational content.
- Only the authenticated administrator can create, edit or delete categories, resources, videos and certificates.
- Normal users can read and update only their own profile.
- Normal users cannot change their role to `admin`.
- Users can create activity records only for their own UID.
- Only administrators can access activity records globally.
- The configured administrator email can bootstrap its own `users/{uid}` document as `role: "admin"` if the profile does not exist yet.

## 3. First admin login
Sign in once with the configured administrator account.

The application will create the admin profile automatically if it does not exist.

## 4. Admin Profile
Inside `Pages/admin.html`, use **Profile Settings** to edit:

- Full name
- University / Institution
- Specialty
- Profile photo URL
- Bio

The email is read-only from Firebase Authentication.

## 5. Important
Do not keep the old development rules that allow any authenticated user to write to content collections.
Only publish the final `firestore.rules` included in this project.
