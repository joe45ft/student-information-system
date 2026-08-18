import test from "node:test";
import assert from "node:assert/strict";
import { CLIENT_JS } from "../src/client.js";

test("automatic refresh is safe, configurable and form-aware",()=>{
  assert.match(CLIENT_JS,/AUTO_REFRESH_SECONDS = 60/);
  assert.match(CLIENT_JS,/student-ims-auto-refresh/);
  assert.match(CLIENT_JS,/document.hidden/);
  assert.match(CLIENT_JS,/formDirty/);
  assert.match(CLIENT_JS,/window.location.reload\(\)/);
  assert.match(CLIENT_JS,/data-auto-refresh-toggle/);
  assert.match(CLIENT_JS,/data-permission-action/);
  assert.match(CLIENT_JS,/data-reset-role-defaults/);
  assert.match(CLIENT_JS,/window.confirm/);
});
