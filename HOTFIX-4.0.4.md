# V4.0.4 Owner Setup Reliability Hotfix

Fixes first Owner setup when the database insert succeeds but the initial session cannot be created using an unreliable insert ID.

Changes:
- Re-reads the newly created Owner by email and uses the persisted Turso `users.id`.
- No longer depends on `lastInsertRowid` for the `INSERT ... SELECT` first-owner statement.
- If the Owner was already created by a previous failed setup request, `/setup` sends the user to Login with a clear message.
- If initial session creation fails after the user was saved, the account remains usable and the user is sent to Login.
- Audit logging can no longer break successful Owner setup.

No Turso database reset is required.
