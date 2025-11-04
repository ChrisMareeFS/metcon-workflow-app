# METCON Workflow App - Project Brief

## What We're Building

A workflow app for METCON that:

- Moves batches (gold first, later silver/PGMs) through clear steps
- Enforces SOPs and mass checks (with photo + AI reading)
- Shows where every batch is right now
- Provides pre-made analytics reports you can filter and download
- Includes light gamification (time + accuracy, friendly leaderboard)

## Who It's For & The Outcome

### Users

**Operators:** scan → follow simple steps → weigh when asked → done.

**Admins:** define the standard flow once; adjust tolerances; manage users.

**Analysts:** open predefined reports, filter (user/metal/station/date), download CSV.

### Outcome
Less rework/wastage, faster turnaround, trustworthy audit trail.

## MVP Scope (First Usable Version)

- **Scan-to-Start:** scan batch job paper; AI (or rules) picks the right flow and opens step 1.
- **Step Runner:** single clear screen per step; instructions, attachments, signatures.
- **Mass Check:** photo of the scale → AI reads weight → tolerance check (green/red) → note if red.
- **WIP Board:** live view of where each batch is; flags for issues.
- **Batch Timeline:** everything that happened, with photos and timestamps.
- **Analytics (pre-made):** 
  - Batches in Progress
  - Mass Checks & Variances
  - Exceptions & Sign-offs
  - Operator Performance
  - Station Throughput
  - Yield/Loss
  - Turnaround Time
  - All with filters + CSV download
- **Security base:** role-based access, encrypted database, private AI calls.

### Nice-to-Add Soon After MVP
- Leaderboard
- Watchlists/notifications
- IoT device syncing
- AI-assisted flow authoring

## Build Phases

### Phase 0 — Align & stub (1–2 days)
- Write down the gold pipeline at "checklist" level (stations, step names, where to weigh)
- Decide tolerance defaults (e.g., ±0.2% or ±0.5 g)
- Confirm pre-made reports list and filters
- Set security basics: roles, password/SSO later, regions, retention

### Phase 1 — Skeleton app (1 week)
- Basic web shell: Home, Scan, WIP Board, Batch Detail (timeline), Analytics (empty tabs)
- API endpoints to scan/create a batch and fetch a flow
- Store batches, flows, events; save photos to object storage (placeholder OK)
- Show timeline, even with dummy events

### Phase 2 — Execution loop (1–2 weeks)
- Step Runner with validation
- Mass Check step with photo → AI OCR → tolerance decision
- Red-flag path: require a reason/supervisor sign-off
- WIP Board: filters by pipeline/station/status/priority/date
- Analytics tabs wired to predefined queries; CSV download working

### Phase 3 — Polish & safeguards (1 week)
- Gamification basics: My Performance (time & accuracy) + Leaderboard
- Permissions/visibility checks
- Audit log search
- CSV totals match dashboards
- Security hardening: private endpoints for AI, encryption, backups, audit alerts

### Next phases (future)
- Notifications/watchlists
- IoT sync
- AI-assisted flow builder

## Definition of Done

- Operator can scan → start → complete steps including a mass-check with photo + AI
- Out-of-tolerance mass is flagged and explained (note/sign-off captured)
- WIP Board shows live status; Batch timeline has every action + photo
- Analytics pages open pre-made reports, filter by user/metal/station/date, and download CSV (summary or row-level)
- Security baseline in place (RBAC, encrypted DB, private AI calls, immutable event log)

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| OCR misreads | Confidence threshold + re-capture prompt + photo proof |
| Process drift | Versioned flows; analytics by flow version |
| Data sprawl | Retention policy; object storage lifecycle |
| Rushing for speed | Leaderboard penalizes red flags; accuracy weighted |

## Immediate Next Steps (Phase 0)

1. Write the gold flow in 10–15 bullet lines (station → steps → weigh points)
2. List your pre-made reports and the filters you care about
3. Confirm tolerance defaults and who can approve red flags
4. Pick your cloud region and confirm data retention (how long to keep photos)


