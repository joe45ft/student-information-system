# Setup Flow Build Test Fix

The deployed application and package are V6.0.1.

The previous build failure was caused only by a stale test assertion that
expected `V6.0.0`.

The test now reads the current version from `package.json` and verifies the
rendered setup page against that value. This prevents future version bumps from
breaking the build for the same reason.
