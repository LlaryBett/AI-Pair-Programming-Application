# Collaboration Architecture & Scenarios

## Scenario 1: Owner Invites New Collaborator

- Owner uses `inviteCollaborator(email, role, documentId)`
- Backend validates, checks access, creates invitation with verifiable token, and sends email
- Invite link: `/invite/:token`
- **Fix:** Always include document context and verify permissions

---

## Scenario 2: User Accepts Invitation

- User visits `/invite/:token`
- Frontend verifies token, shows accept button
- On accept, backend verifies token, adds user to collaborators, returns documentId for redirect
- **Fix:** All role assignment and document context handled in backend

---

## Scenario 3: Real-time Permission Enforcement

- Socket middleware verifies user token and document access on connect
- On `codeChange`, backend checks edit permission before applying/broadcasting
- **Fix:** All permission checks are backend-enforced, not just frontend

---

## Scenario 4: Collaborator Leaves/Removed

- Owner removes collaborator via API
- Backend removes user, notifies via socket (`removedFromDocument`)
- Frontend listens for `removedFromDocument` and redirects user
- **Fix:** Clean up invitations and active sockets, notify user

---

## Scenario 5: Role Changes

- Owner updates collaborator role via API
- Backend updates DB, emits `roleUpdated` to document room
- Frontend listens for `roleUpdated` and updates local permissions
- **Fix:** Real-time sync and persistence of roles

---

## Scenario 6: Document Ownership Transfer

- Owner transfers ownership via API
- Backend updates owner, emits `ownershipTransferred` to room
- Frontend updates UI and permissions for new owner
- **Fix:** Prevent orphaned documents, notify all clients

---

## Scenario 7: Concurrent Editing Conflicts

- Use CRDTs or OT (e.g., Yjs) for shared document state
- Backend manages document state and syncs updates
- **Fix:** Prevent "last write wins", enable true collaborative editing

---

## Scenario 8: Offline Collaboration

- Frontend queues changes when offline (e.g., IndexedDB)
- On reconnect, queued changes are sent to backend
- **Fix:** Seamless offline/online experience

---

## Critical Endpoints

- `POST /invitations` - Create invite
- `POST /invitations/accept` - Accept invite
- `GET /documents/:id/collaborators` - List collaborators
- `PATCH /collaborators/:id/role` - Update role
- `DELETE /collaborators/:id` - Remove collaborator
- `POST /documents/:id/transfer` - Transfer ownership

---

## Socket.IO Events

- Server emits: `documentUpdated`, `permissionChanged`, `collaboratorJoined`, `collaboratorLeft`
- Client emits: `codeChange`, `cursorUpdate`, `roleChanged`

---

## Implementation Checklist

- [x] Backend permission middleware for all endpoints
- [x] Document-based socket rooms
- [x] Invitation expiry (24-48 hours)
- [x] Email verification for new users
- [x] Conflict resolution (CRDT/OT)
- [x] Offline change queue
- [x] Ownership transfer flow
- [x] Comprehensive event logging

---

## Data Flow

