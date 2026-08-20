# Student IMS Next V1.4.8 — Keep Owner Reset

- Replaces full factory reset with **Reset All Data — Keep Owner**.
- Deletes all academic and operational data, all other users, all other sessions, permission overrides, logs, password reset requests, and organization settings.
- Preserves the currently authenticated OWNER account, password, role/status, and only the current session.
- Resets organization settings to defaults.
- Keeps D1 schema and migrations intact.
- Requires Owner password, exact phrase `KEEP OWNER AND DELETE ALL DATA`, acknowledgement, and final browser confirmation.
- Redirects to Dashboard after success; `/setup` is not used.
