# Firestore Security Specification - Eventra

## Data Invariants
1. A registration must link to a valid event.
2. A registration must belong to the authenticated user who created it (`userId` match).
3. Registration status defaults to `pending` and can only be changed by an admin.
4. User roles can only be set to `admin` by another admin or via internal initialization (not via client SDK).

## The Dirty Dozen Payloads (Rejection Targets)

1. **Identity Spoofing**: Attempt to create a registration with another user's ID.
   - Payload: `{ "eventId": "ev1", "userId": "attacker_id", "status": "pending", ... }` where auth uid is `victim_id`.
2. **State Shortcutting**: Attempt to create a registration with status `approved`.
   - Payload: `{ "eventId": "ev1", "status": "approved", ... }`
3. **Ghost Field Poisoning**: Injecting fields like `isVip` or `bypassPayment`.
   - Payload: `{ "eventId": "ev1", "isVip": true, ... }`
4. **Privilege Escalation**: User attempting to change their own role to `admin`.
   - Payload: `{ "role": "admin" }` on `/users/uid`.
5. **Orphaned Registration**: Creating a registration for a non-existent event ID.
   - Payload: `{ "eventId": "deleted_event", ... }`
6. **Denial of Wallet (ID Poisoning)**: Document ID with 1MB of junk characters.
7. **PII Leak**: Authenticated user trying to read another user's registration.
8. **Terminal State Break**: Attempting to edit a registration after it's been `rejected`.
9. **Query Scraping**: Attempting a `list` on registrations without a `userId` filter.
10. **Timestamp Fraud**: Providing a client-side `createdAt` that is in the future.
11. **Relational Sync Bypass**: Updating a registration without verifying the parent event still exists.
12. **Anonymous Write**: Attempting to register without being signed in or verified.

## Test Strategy
- Use `firebase/rules-unit-testing`.
- Verify `PERMISSION_DENIED` for all Dirty Dozen payloads.
- Verify `ALLOW` for valid registration flow and admin management.
