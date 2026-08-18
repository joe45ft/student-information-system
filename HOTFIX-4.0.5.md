# V4.0.5 Setup Submission Hotfix

Changes:
- Setup form has an explicit `action="/setup"`.
- Setup submit button has explicit `type="submit"`.
- Browser-side HTML validation is disabled for setup (`novalidate`) so the server returns readable validation errors.
- The button visibly changes to "Creating Owner..." when a POST is sent.
- Successful setup uses HTTP 303 to force a clean GET redirect after POST.
- Includes all V4.0.4 and V4.0.3 fixes.
