# V6.0.4 Native Setup Build Fix

- Removes all setup submit JavaScript interception from `public/app.js`.
- Keeps `/setup` as a 100% native HTML POST form.
- Keeps the V6.0.3 server-side URL-encoded/multipart body parser fix.
- Keeps browser native `required`, `type=email`, and `minlength` validation.
- Keeps the setup-flow integration test that verifies owner name/email reach the database.
- Synchronizes the application version to V6.0.4.
