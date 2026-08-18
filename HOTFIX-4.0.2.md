# V4.0.2 Cloudflare Subrequest Hotfix

This release fixes:

`Too many subrequests by single Worker invocation`

The previous cold-start schema initializer sent individual Turso requests for
tables, permissions, and role permissions.

V4.0.2 now:

1. Checks a small `app_meta` schema-version marker.
2. Uses one Turso `batch()` call for the complete first-time schema/permission seed.
3. Stores the schema-version marker after successful initialization.
4. Retries initialization safely if a transient initialization error occurs.

No Cloudflare paid-plan upgrade or custom subrequest limit is required for this fix.
