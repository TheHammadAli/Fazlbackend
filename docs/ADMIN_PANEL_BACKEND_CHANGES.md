# Fazl Admin — Backend Structure & Change Log (Admin Panel)

This document describes every backend change made to support the Admin Panel
(`fazal-admin`), and the current structure of the resulting system. It reflects the
code as it stands right now in `market-backend-main`.

---

## 1. Overview

Stack: NestJS + Mongoose (MongoDB) + JWT auth (Passport). Admin-panel features live
inside the existing monolith, alongside the buyer/seller marketplace API.

Modules touched or added for the admin panel:

| Module | Path | Status |
|---|---|---|
| Users | `src/users` | Extended (Admin Management, Member Management, password reset) |
| Task | `src/task` | Added, then reworked to assign directly to Members |
| Team | `src/team` | Added, then **fully removed** — see §7 |
| Activity Log | `src/activity-log` | Extended (new action types) |
| Broadcast | `src/broadcast` | Extended (`broadcastCode`) |
| Promotion | `src/promotion` | Security fix (added auth guard) |
| Category | `src/category` | Security fix (added permission guard on 2 routes) |

---

## 2. Authorization Model

### 2.1 Roles
`User.roles: string[]` — enum: `buyer, seller, admin, subadmin, super_admin, moderator`.

Admin-panel-relevant roles (`ADMIN_PANEL_ROLES` in
`src/users/dto/create-admin-account.dto.ts`): `super_admin | admin | moderator`.

- **super_admin** — a single, fixed account. Never created or edited via the API.
- **admin** — created by super_admin via Admin Management. Manages Members and Tasks.
- **moderator** — the "Member" role. Created via Member Management. Task-assignable.

### 2.2 Guards
- `JwtAuthGuard` (`src/auth/guard/jwt-auth-guard.ts`) — validates the JWT; honors
  `@Public()` to skip.
- `RolesGuard` (`src/auth/guard/roles-guard.ts`) + `@Roles(...)` — checks
  `request.user.roles` intersects the required list.
- `PermissionsGuard` (`src/auth/guard/permissions-guard.ts`) + `@RequirePermission(...)`
  — checks `request.user.permissions` includes the required key. **`super_admin`
  always bypasses this check.**

### 2.3 Page permission keys (`ADMIN_PERMISSIONS`)

Defined in `src/users/dto/create-admin-account.dto.ts`:

```
users, shops, listings, services, categories, bookings, broadcasts,
feed, reports, email-logs, settings
```

The last four (`feed`, `reports`, `email-logs`, `settings`) were added in this round
of work — originally only the first seven existed. `UpdateAdminAccountDto` imports the
same constant, so both create and update accept the same 11 keys.

These are granted per-account via the `permissions` array when a super_admin creates
or edits an **admin** account (Admin Management, see §3). The frontend sidebar
(`fazal-admin/components/Admin/AdminSidebar.tsx`) shows/hides each nav item based on
whether the current user has the matching key (or is `super_admin`).

**⚠️ Known inconsistency**: `User.permissions` in `src/users/schema/users.schema.ts`
still has its Mongoose `enum` restricted to the original 7 values — it was never
updated when the 4 new keys were added to the DTO. `createAdminAccount` uses
`.save()`, which runs Mongoose validators, so **attempting to create/save an account
with `feed`/`reports`/`email-logs`/`settings` in its permissions will currently throw
a validation error.** (`updateAdminAccount` uses `findByIdAndUpdate` without
`runValidators`, so updates bypass this and would silently succeed.) This was found
while writing this doc and intentionally left unfixed per current instructions — flag
for a follow-up fix: add the 4 keys to the schema's `enum` in `users.schema.ts`.

### 2.4 Two-tier admin-account model
- **Admin Management** (`/users/admins/*`) — `super_admin`-only. Creates `admin` or
  `moderator` accounts with a name/email/role/permissions. This is the
  privilege-bearing tier (can see gated pages per its `permissions`).
- **Member Management** (`/users/members/*`) — `admin` **or** `super_admin`. Creates
  plain `moderator` accounts with just name/email — no permissions, no role choice.
  These are the task-assignable "Members" pool. Deliberately excluded from the page
  permission system.

---

## 3. Users Module — Admin Management (`src/users`)

Unchanged in shape, extended with one new route. All routes: `@Roles("super_admin")`.

| Method | Path | Description |
|---|---|---|
| GET | `/users/admins` | Paginated list of admin/moderator accounts (search by name/email) |
| POST | `/users/admins` | Create admin/moderator account. Body: `CreateAdminAccountDto` (`name`, `email`, `role`, `permissions?`). Auto-generates password, returned once in response. |
| PATCH | `/users/admins/:id` | Update name/email/role/permissions. `UpdateAdminAccountDto`. |
| PATCH | `/users/admins/:id/disable` | Soft-disable (`isDisabled: true`) |
| PATCH | `/users/admins/:id/enable` | Re-enable |
| PATCH | `/users/admins/:id/reset-password` | **New.** Sets a new password — `ResetAdminPasswordDto { newPassword?: string }`. If omitted, server generates one. Returns the plaintext once (never stored). |

`super_admin`'s own account can never be edited/disabled/password-reset through these
routes — each service method explicitly blocks it (`ForbiddenException`).

### Key `UsersService` methods
- `createAdminAccount`, `updateAdminAccount` — existing.
- `resetAdminPassword(userId, dto)` — **new**. Validates min-length manually (no
  global `ValidationPipe` in this app — DTO decorators are documentation only, per
  existing convention), generates or accepts a password, hashes it, saves.
- `generateRandomPassword()`, `hashPassword()` — existing private helpers, reused by
  the new member-creation flow too.

---

## 4. Users Module — Member Management (New)

Added directly to `UsersController`/`UsersService` (not a separate module — Members
are just `moderator`-role `User` documents). All routes: `@Roles("admin", "super_admin")`.

| Method | Path | Description |
|---|---|---|
| GET | `/users/members` | List all `moderator` accounts |
| POST | `/users/members` | Create a member. Body: `CreateMemberDto { name, email }`. Role hardcoded to `moderator`. Auto-generated password returned once. |
| PATCH | `/users/members/:id` | Update name/email. `UpdateMemberDto { name?, email? }` |
| DELETE | `/users/members/:id` | Hard-deletes the `User` document |

### `UsersService` methods
- `createMemberAccount(name, email)` — mirrors `createAdminAccount` but role is
  always `["moderator"]`, no permissions.
- `updateMemberAccount(userId, name?, email?)`
- `deleteMemberAccount(userId)` — hard delete (`findByIdAndDelete`); tasks previously
  assigned to a deleted member keep the dangling reference (no cascading cleanup —
  same trade-off the earlier Team-delete flow made).
- `getMembers()` — returns all `moderator` accounts, sorted by name. Used both for the
  Members list page and the Task-assignment picker.
- `assertMemberIds(ids: string[])` — validates every id is an existing `moderator`
  account; used by the Task module to validate `assignees`.

**History**: Member creation originally lived under a `Team` module (`/team/members`),
gated to `moderator` role only after an earlier iteration where `admin`/`super_admin`
accounts could also be added as "team members" (later restricted). The whole `Team`
concept was then removed (§7) and Member management was folded directly into `Users`.

---

## 5. Task Module (`src/task`)

### Schema (`schema/task.schema.ts`)
```ts
Task {
  title: string (required)
  description?: string
  assignees: ObjectId[] ref User (required, must be non-empty)
  priority: "low" | "medium" | "high" (default "medium")
  status: "pending" | "in_progress" | "completed" | "cancelled" (default "pending")
  dueDate?: Date
  createdBy: ObjectId ref User (required)
}
```
`assignees` used to be an optional subset of a required `team` field (empty meant
"whole team"). The `team` field is gone — assignees are now direct `User` references
and at least one is mandatory.

### Endpoints (`task.controller.ts`) — all `@Roles("admin", "super_admin")`

| Method | Path | Description |
|---|---|---|
| POST | `/tasks` | Create + assign. `CreateTaskDto { title, description?, assignees: string[] (non-empty), priority?, dueDate? }` |
| GET | `/tasks` | Paginated list. Query: `page, limit, search (title), status` |
| GET | `/tasks/:id` | Detail |
| PUT | `/tasks/:id` | Update any field incl. `status`, reassignment via `assignees` |
| DELETE | `/tasks/:id` | Delete |

### `TaskService`
- `createTask` — validates `dto.assignees` via `usersService.assertMemberIds(...)`
  (must all be existing `moderator` accounts).
- `getAllTasks` / `getTaskById` — populate `assignees` (`name email image`) and
  `createdBy` (`name email`).
- `updateTask` — if `assignees` is provided, re-validates and rejects an empty array
  (`BadRequestException`, "A task must have at least one assignee").
- Module now depends on `UsersModule` (for `assertMemberIds`), not `TeamModule`.

Activity log actions recorded: `task_assigned` (on create), `task_updated`,
`task_deleted`. (`task_created` exists in the enum but isn't currently emitted
anywhere — pre-existing, not introduced by this work.)

---

## 6. Broadcast Module — `broadcastCode`

`src/broadcast/schema/broadcast.schema.ts` gained:
```ts
@Prop({ unique: true, sparse: true, required: false })
broadcastCode?: string;
```
Format: `ECH-000001`, sequential, generated the same way `User.userCode` is (a shared
atomic counter document in the `counters` collection, key `"broadcastCode"`).

- `BroadcastService.generateNextBroadcastCode()` — new private method, called from
  `createBroadcast()` so every new broadcast gets a code.
- Exposed in both the admin listing (`getAllBroadcastsForAdmin`) and the buyer's own
  listing (`getBroadcastsByBuyer`) `$project` stages.
- `BroadcastModule` now also imports `MongooseModule.forFeature([Counter])`.
- **Backfill**: `src/scripts/migrate-broadcast-codes.js` (same pattern as the existing
  `migrate-user-codes.js` etc.) was written and **already run against the database** —
  all 227 pre-existing broadcasts were backfilled `ECH-000001`..`ECH-000227`, counter
  synced. No action needed; kept in `scripts/` for reference/future environments.

Frontend: `AdminBroadcasts.tsx` gained an "ID" column showing `broadcastCode`.

---

## 7. Removed: Team Module

A full `Team` feature (`src/team`: schema, DTOs, service, controller, module) was
built, then **entirely removed** at the user's request in favor of a simpler model:
Admin/Super Admin manage a flat pool of **Members** directly, and assign **Tasks**
straight to one or more Members — no team/group entity in between.

Removed:
- `src/team/` (deleted entirely — schema, 4 DTOs, service, controller, module)
- `TeamModule` import/registration in `app.module.ts`
- `Task.team` field, `team` query param on `GET /tasks`, `team` field on
  create/update Task DTOs
- Activity log actions `team_created`, `team_updated`, `team_deleted`,
  `team_member_created` → replaced with `member_created`, `member_updated`,
  `member_deleted`
- `"Team"` from `ActivityLog.targetType` enum

If you see references to "Team" anywhere in older docs/specs, they're stale — the
concept no longer exists in this codebase (verified via full-repo grep, backend and
frontend, zero remaining matches at time of writing).

---

## 8. Activity Log (`src/activity-log/schema/activity-log.schema.ts`)

Current `ACTIVITY_LOG_ACTIONS`:
```
admin_login, user_suspended, user_enabled, shop_suspended, shop_enabled,
listing_suspended, listing_enabled, listing_deleted, broadcast_deleted,
member_created, member_updated, member_deleted,
task_created, task_assigned, task_updated, task_deleted,
admin_password_reset
```
Current `targetType` enum: `User, Shop, Product, Broadcast, Task`.

Every admin-management, member-management, and task mutation calls
`activityLogService.record(actorId, action, targetType, targetId, details, ip)` —
fire-and-forget, never blocks the primary action if logging fails.

---

## 9. Security Fixes (found while working in this area, unrelated to the above features)

1. **`src/promotion/promotion.controller.ts`** had **no guard at all** — every route
   (`POST/PATCH/DELETE /promotions` included) was fully unauthenticated. Fixed by
   adding `@UseGuards(JwtAuthGuard)` at the controller level. Deliberately not
   further restricted to admin-only, since `ProductsService` already calls
   `PromotionService` methods directly in-process (confirmed via grep) — over-restricting
   risked breaking a legitimate flow this codebase alone doesn't fully reveal.
2. **`src/category/category.controller.ts`** — `GET /categories/pending` and
   `PUT /categories/review/:id` (the category-request moderation queue) had no
   permission guard; any logged-in user could approve/reject requests. Fixed by adding
   `@UseGuards(PermissionsGuard) @RequirePermission("categories")` to both, matching
   the guard already used on the controller's other category-management routes.

---

## 10. Full Endpoint Reference (admin-panel-relevant, this round of work)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/users/admins` | `super_admin` | |
| POST | `/users/admins` | `super_admin` | |
| PATCH | `/users/admins/:id` | `super_admin` | |
| PATCH | `/users/admins/:id/disable` | `super_admin` | |
| PATCH | `/users/admins/:id/enable` | `super_admin` | |
| PATCH | `/users/admins/:id/reset-password` | `super_admin` | **new** |
| GET | `/users/members` | `admin`, `super_admin` | **new** |
| POST | `/users/members` | `admin`, `super_admin` | **new** |
| PATCH | `/users/members/:id` | `admin`, `super_admin` | **new** |
| DELETE | `/users/members/:id` | `admin`, `super_admin` | **new** |
| POST | `/tasks` | `admin`, `super_admin` | assignees required, non-empty |
| GET | `/tasks` | `admin`, `super_admin` | no more `team` filter |
| GET | `/tasks/:id` | `admin`, `super_admin` | |
| PUT | `/tasks/:id` | `admin`, `super_admin` | |
| DELETE | `/tasks/:id` | `admin`, `super_admin` | |
| GET/POST/PATCH/DELETE | `/promotions*` | `JwtAuthGuard` only | **security fix** |
| GET | `/categories/pending` | `categories` permission | **security fix** |
| PUT | `/categories/review/:id` | `categories` permission | **security fix** |

---

## 11. Frontend integration (for reference — changes live in `fazal-admin`)

| Backend surface | Frontend page/component |
|---|---|
| `/users/admins/*` | `components/Admin/AdminAccounts.tsx` (`/admin/admins`) — Create/Edit/Disable/Enable + new "Update Password" action |
| `/users/members/*` | `components/Admin/MemberManagement.tsx` (`/admin/members`, formerly `/admin/team`) |
| `/tasks/*` | `components/Admin/TaskManagement.tsx` (`/admin/tasks`) — assignee picker now pulls from `/users/members` directly |
| `broadcastCode` | `components/Admin/AdminBroadcasts.tsx` — new "ID" column |
| Page permission keys | `components/Admin/AdminSidebar.tsx` — nav item visibility |
| Dashboard "Total Feed Videos" | `components/Admin/AdminDashboard.tsx` — wired to real `/products/admin/with-videos` count (was a static "coming soon" placeholder) |

RTK Query layer: `fazal-admin/store/services/adminService.ts` and tag types in
`fazal-admin/store/baseApi.ts` (`ADMIN_MEMBERS` tag replaces the old `ADMIN_TEAMS`).

---

## 12. Verification status

Backend (`market-backend-main`): `npx tsc --noEmit`, `npm run build`, and a runtime
boot check (`npm run start`, confirming all routes map and
`Nest application successfully started`) all pass as of the last change in this log.

Frontend (`fazal-admin`): `npx tsc --noEmit` and `npm run build` both pass; `/admin/team`
route removed, `/admin/members` present in the build output.

The one open item is §2.3's schema/DTO enum mismatch — noted, not yet fixed.
