# Student IMS Next V1.4.9

## Reset Button Visibility Fix

- Added an OWNER-only **Reset Data** item directly in the Administration sidebar.
- Added an OWNER-only **Reset Data** action in the Settings page header.
- Kept the original Settings → Danger Zone control as a third access point.
- Normalized OWNER role checks so legacy/case variation cannot hide the control.
- The destructive operation still requires current password, exact confirmation text, and acknowledgement.
- Reset preserves the current Owner account and current session.
- No schema migration is required.
