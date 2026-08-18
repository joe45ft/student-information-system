# V6.0.3 Owner Form Submission Fix

Observed runtime behavior:
- POST /setup reaches the server.
- CSRF passes.
- Server validation receives required setup values as empty.

Fixes:
- Setup form uses explicit application/x-www-form-urlencoded encoding.
- Native browser required/minlength validation is restored.
- Client-side pre-submit validation reads the actual input values and does not
  intercept valid native form submissions.
- `formBody()` now parses URL-encoded and multipart forms directly through the
  Web Request API, with Hono parseBody as a fallback for other content types.
- Setup route logs only a safe diagnostic if all required values arrive empty.
- Setup test now verifies the exact submitted owner name and email reach the DB.
- Version synchronized to V6.0.3.
