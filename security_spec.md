# Security Specification — Holly & Hearth Holiday Planner

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document in `/users/{userId}` and its subcollections (`members`, `gifts`, `events`, `supplies`, `secretSantaDraws`) belongs strictly to the authenticated, email-verified user whose `request.auth.uid == userId` and `data.ownerId == request.auth.uid`.
2. **Master Gate Parent Existence**: No subcollection record (`members`, `gifts`, `events`, `supplies`, `secretSantaDraws`) can be created or updated unless the parent `/users/{userId}` workspace document exists.
3. **Immutable Identity & Creation Metadata**: `ownerId` and `createdAt` are immutable after document creation. `createdAt` must equal `request.time` on creation, and `updatedAt` must equal `request.time` on every creation and update.
4. **Strict Schema & Bounds Enforcement**: No extra/shadow fields are allowed (`hasOnly` / `hasAll`). Every string field has strict `.size()` bounds, numeric budgets are bounded `[0, 1000000]`, enum fields are restricted to valid allowlists, and document IDs match `^[a-zA-Z0-9_\-]+$` with length `<= 128`.
5. **Bounded Secret Santa Arrays**: `participants` and `assignments` lists are strictly bounded to `2..30` entries with validated element types.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: Reading or writing `/users/uid1/gifts/g1` with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Writing with `request.auth.uid == "uid1"` and `token.email_verified == false` -> `PERMISSION_DENIED`.
3. **Cross-User Read/List Scrape**: User `uid2` listing `/users/uid1/gifts` -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Create**: User `uid1` creating `/users/uid1/members/m1` with `ownerId: "uid2"` -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: Creating or updating a gift with an extra field `isAdmin: true` -> `PERMISSION_DENIED`.
6. **ID Poisoning**: Creating `/users/uid1/gifts/invalid$id..with..chars` or a 300-char ID -> `PERMISSION_DENIED`.
7. **Denial-of-Wallet Oversized String**: Creating a gift with `notes` > 400 characters or `title` > 140 characters -> `PERMISSION_DENIED`.
8. **Negative or Astronomical Budget**: Creating a gift with `estimatedPrice: -50` or `actualPrice: 99999999` -> `PERMISSION_DENIED`.
9. **Client-Forged Timestamps**: Creating a member with `createdAt` set to a past client date instead of `request.time` -> `PERMISSION_DENIED`.
10. **Immutable Field Tampering**: Updating a gift to mutate `createdAt` or `ownerId` -> `PERMISSION_DENIED`.
11. **Invalid Enum Injection**: Creating a gift with `status: "stolen"` or member with `listStatus: "vip"` -> `PERMISSION_DENIED`.
12. **Unbounded Array Attack**: Creating a Secret Santa draw with 500 participants -> `PERMISSION_DENIED`.
