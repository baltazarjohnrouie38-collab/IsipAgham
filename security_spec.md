# IsipAgham Security Specification (Payload-First TDD)

## 1. Data Invariants
1. A user profile at `/users/{userId}` contains `email` (PII) and can ONLY be read, created, updated, or deleted by `request.auth.uid == userId`. No blanket `list` is allowed on `/users`.
2. A `/leaderboard/{userId}` document exposes ONLY `uid`, `nickname`, `xp`, and `updatedAt` (no email or PII), can be listed/read by signed-in users, and can only be written by `request.auth.uid == userId`.
3. Every `/materials/{materialId}`, `/studySets/{setId}`, `/quizAttempts/{attemptId}`, `/studySessions/{sessionId}`, `/aiMessages/{messageId}`, and `/visualizerScenarios/{scenarioId}` document must have `userId == request.auth.uid` on create and read/list/delete, and `userId` is immutable on update.
4. On `create`, `createdAt == request.time` (and `updatedAt == request.time` where present). On `update`, `createdAt == existing().createdAt` and `updatedAt == request.time`.
5. Every string has explicit `.size()` bounds; every array has explicit `.size()` bounds; every document ID matches `^[a-zA-Z0-9_\-]+$`.
6. Updates use strict `incoming().diff(existing()).affectedKeys().hasOnly([...])` to block shadow fields and privilege/XP spoofing beyond validated integer bounds (`0 <= xp <= 1000000`).
7. Opt-in Leaderboard Gate: Creating or updating `/leaderboard/{userId}` requires `users/{userId}.leaderboardJoined == true` via `getAfter(...)`, ensuring users only appear on the Global Leadership Board after explicitly activating it (and can leave anytime by deleting `/leaderboard/{userId}` and setting `leaderboardJoined: false`).

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read of `/users/userA`.
2. Authenticated userB reading `/users/userA` (cross-user PII access).
3. Authenticated userA listing `/users` collection (PII scraping).
4. Authenticated userA creating `/users/userA` with a shadow field `{ isAdmin: true }`.
5. Authenticated userA creating `/leaderboard/userA` containing an `email` field (PII leak).
6. Authenticated userB updating `/leaderboard/userA` XP.
7. Authenticated userA creating `/materials/mat1` with `userId: "userB"` (identity spoofing).
8. Authenticated userA creating `/materials/mat1` with `extractedText` exceeding 100,000 characters (resource poisoning).
9. Authenticated userA updating `/materials/mat1` to change `userId` or `createdAt` (immutable field tampering).
10. Authenticated userA listing `/studySets` without `where('userId', '==', uid)` or reading userB's `/studySets/setB`.
11. Authenticated userA creating `/users/userA` with `createdAt` set to a forged past client timestamp instead of `request.time`.
12. Authenticated userA creating `/materials/invalid$id!` with invalid path characters.
13. Authenticated userA creating `/leaderboard/userA` while `/users/userA.leaderboardJoined` is `false` (unactivated leaderboard bypass).

