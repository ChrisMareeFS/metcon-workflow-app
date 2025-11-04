# System Patterns - METCON Architecture

## High-Level Architecture

```
┌─────────────────┐
│  Web Frontend   │ (Operator/Admin/Analyst screens)
│  (Mobile-first) │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────┐
│   API Server    │ (Business logic, validation, RBAC)
└────────┬────────┘
         │
    ┌────┴─────┬──────────┬──────────┐
    ↓          ↓          ↓          ↓
┌────────┐ ┌──────┐  ┌──────────┐ ┌────────┐
│MongoDB │ │Object│  │ AI OCR   │ │ Auth   │
│        │ │Store │  │ Service  │ │Service │
└────────┘ └──────┘  └──────────┘ └────────┘
```

## Core Architectural Decisions

### Why MongoDB
- **Flexible schema:** Flows evolve, steps vary by pipeline
- **Audit-friendly:** Document model perfect for event sourcing
- **Embedded objects:** Steps, photos, signatures nest naturally
- **Indexing:** Fast queries for WIP board and analytics
- **No complex joins:** Denormalization accepted for read performance

### Why Object Storage (separate from DB)
- **Photo size:** Keep MongoDB lean, images in blob storage
- **Lifecycle:** Auto-expire old photos per retention policy
- **Cost:** Cheaper than DB storage
- **Direct access:** Pre-signed URLs for photo display

### Why Private AI Endpoints
- **Compliance:** Sensitive batch data never hits public APIs
- **Control:** Can swap AI providers without changing app
- **Auditability:** All AI calls logged
- **Fallback:** If OCR fails, operator can manually enter

## Key Design Patterns

### 1. Event Sourcing (Audit Trail)
All batch changes are **append-only events**, never updates:

```
Batch document contains:
- Current state (station, step, status)
- Events array (immutable, ordered):
  [
    { type: "created", timestamp, user, data },
    { type: "step_completed", timestamp, user, data },
    { type: "mass_check", timestamp, user, mass, photo, tolerance },
    { type: "exception_flagged", timestamp, user, reason, approver }
  ]
```

**Benefits:**
- Complete history reconstruction
- Audit trail built-in
- Can replay to any point
- No data loss

### 2. Flow Versioning
Flows are **versioned and immutable** once in use:

```
Flow document:
- flow_id: "gold_refining"
- version: "v1.2"
- effective_date: "2025-01-15"
- status: "active" | "draft" | "archived"
- stations: [...]
- steps: [...]
```

When a flow changes:
- New version created
- Existing batches continue on old version
- New batches use new version
- Analytics can filter by flow version

**Benefits:**
- Process drift visible
- No mid-flight changes
- Compliance traceability

### 3. State Machine (Batch Status)
Batches follow strict state transitions:

```
created → in_progress → [station/step progression] → completed
                    ↓
                flagged → [requires approval] → in_progress
                    ↓
                blocked → [admin intervention]
```

**Rules:**
- Can't skip steps
- Can't move backward (except admin override with reason)
- Flagged batches require clearance
- All transitions logged as events

### 4. RBAC (Role-Based Access Control)
Three primary roles:

| Role | Can Do | Can't Do |
|------|--------|----------|
| **Operator** | Start batches, complete steps, take photos, flag issues | Edit flows, see other operators' performance, approve red flags |
| **Admin** | All operator + create/edit flows, manage users, approve red flags | Delete audit logs |
| **Analyst** | View all analytics, export data | Execute batches, edit flows |

**Special:** Supervisors (Operator + red flag approval)

Permissions checked at:
- API endpoint level
- Data query level
- UI element visibility

### 5. Mass Check Pattern
Standard sequence for weight validation:

```
1. Display expected mass & tolerance
2. Operator places item on scale
3. Take photo of scale display
4. Submit to AI OCR service
5. AI returns: { value: 148.3, confidence: 0.95, unit: "g" }
6. System checks: |actual - expected| ≤ tolerance
7. If pass: green checkmark, continue
8. If fail: red flag, require reason + approval
9. Store: photo, OCR result, tolerance decision, timestamp
```

**Failure modes:**
- OCR confidence <0.85: prompt re-take
- OCR can't read: manual entry allowed (flagged)
- Photo too blurry: quality check before submit

### 6. Pre-made Analytics Pattern
Reports are **defined queries, not custom query builders**:

```
Report definition:
- name: "Mass Checks & Variances"
- query: aggregation pipeline
- filters: [user, metal_type, station, date_range, tolerance_status]
- output: table + chart
- export: CSV with all detail rows
```

**Benefits:**
- Fast (can be pre-aggregated)
- Reliable (tested queries)
- Simple UX (no SQL knowledge)
- Consistent results

Reports run as:
1. User opens report page
2. Sets filters (optional)
3. Backend runs predefined aggregation
4. Returns summary + detail data
5. CSV export has same data as shown

## Component Flow (MVP)

### Operator Flow: Complete a Mass Check Step

```
1. Operator at Step Runner screen
2. Step type: "mass_check"
3. Display: "Expected: 150g ±0.5g"
4. Button: "Take Photo of Scale"
   ↓
5. Camera opens (or file upload)
6. Operator captures scale display
   ↓
7. Show preview: "Analyzing..."
8. POST /api/batches/{id}/mass-check
   - photo file
   - step_id
   - expected_mass
   - tolerance
   ↓
9. API server:
   - Upload photo to object storage
   - Call AI OCR service (private endpoint)
   - Receive OCR result
   - Check tolerance
   - Create event (mass_check)
   - Update batch state
   ↓
10. Response:
    - status: "within_tolerance" | "out_of_tolerance"
    - actual_mass: 148.3
    - ocr_confidence: 0.96
    - photo_url: (presigned)
   ↓
11. Frontend shows result:
    - Green: "148.3g ✓ Within tolerance" → Continue button
    - Red: "148.3g ⚠️ Out of tolerance (-1.7g)" → Require reason form
```

### Admin Flow: Create Gold Refining Flow

```
1. Admin → Flow Builder
2. Create new flow: "Gold Refining v2.0"
3. Add stations: Receiving, Refining, Assay, Casting, QC
4. For each station, add steps:
   - Step type: instruction | checklist | mass_check | signature | photo
   - Step name
   - Instructions/content
   - Required fields
   - Tolerance (if mass_check)
5. Save as "draft"
6. Preview/test with dummy batch
7. Set effective_date
8. Publish → status: "active"
9. Previous flow version auto-archived
```

### Analyst Flow: View Mass Variances

```
1. Analyst → Analytics → "Mass Checks & Variances"
2. Default: Last 30 days, all pipelines
3. Filters:
   - Date range picker
   - Metal type: Gold | Silver | PGMs
   - Station: dropdown
   - Tolerance status: All | Within | Out of tolerance
   - User: dropdown (all operators)
4. Click "Apply Filters"
   ↓
5. API: GET /api/analytics/mass-variances?date_from=X&date_to=Y&metal=gold...
6. Backend runs predefined query:
   - Aggregate all mass_check events
   - Calculate variance %
   - Group by station/user
   - Count within/out of tolerance
   ↓
7. Response:
   - summary: { total: 124, within: 119, out: 5, avg_variance: 0.12% }
   - by_station: [...]
   - by_user: [...]
   - detail_rows: [{ batch, step, expected, actual, variance, user, timestamp }]
   ↓
8. Display:
   - Summary cards at top
   - Bar chart: variances by station
   - Table: detail rows (sortable)
   - Button: "Download CSV"
9. CSV export includes all detail_rows (not just visible page)
```

## Data Model (Core Collections)

### batches
```javascript
{
  _id: ObjectId,
  batch_number: "B-2025-0001",
  pipeline: "gold",
  flow_id: "gold_refining",
  flow_version: "v1.0",
  current_station: "refining",
  current_step: "step_3",
  status: "in_progress" | "flagged" | "completed",
  priority: "normal" | "high",
  created_at: ISODate,
  started_at: ISODate,
  completed_at: ISODate,
  events: [
    {
      event_id: UUID,
      type: "step_completed",
      timestamp: ISODate,
      user_id: ObjectId,
      station: "receiving",
      step: "step_1",
      data: { ... }
    }
  ],
  flags: [
    {
      type: "out_of_tolerance",
      step: "step_3",
      reason: "...",
      approved_by: ObjectId,
      timestamp: ISODate
    }
  ]
}
```

### flows
```javascript
{
  _id: ObjectId,
  flow_id: "gold_refining",
  version: "v1.0",
  name: "Gold Refining Process",
  pipeline: "gold",
  status: "active",
  created_by: ObjectId,
  effective_date: ISODate,
  stations: [
    {
      station_id: "receiving",
      name: "Receiving",
      order: 1,
      steps: [
        {
          step_id: "step_1",
          type: "mass_check",
          name: "Initial Weigh-in",
          instructions: "...",
          expected_mass: 150,
          tolerance: 0.5,
          tolerance_unit: "g",
          required: true
        }
      ]
    }
  ]
}
```

### photos
```javascript
{
  _id: ObjectId,
  batch_id: ObjectId,
  event_id: UUID,
  step_id: "step_3",
  storage_url: "s3://bucket/path",
  hash: "sha256...",
  size_bytes: 245123,
  exif: { ... },
  ocr_result: {
    value: 148.3,
    confidence: 0.96,
    raw_text: "148.3g"
  },
  uploaded_at: ISODate,
  uploaded_by: ObjectId
}
```

### users
```javascript
{
  _id: ObjectId,
  username: "operator1",
  email: "...",
  role: "operator" | "admin" | "analyst",
  permissions: [],
  stations: ["receiving", "refining"],
  active: true,
  created_at: ISODate
}
```

## Security Patterns

### Authentication Flow
```
1. User logs in → API validates credentials
2. API issues JWT token (short-lived, 1h)
3. Token includes: user_id, role, permissions
4. Frontend stores in httpOnly cookie
5. Every API call includes token
6. API middleware validates token + checks permissions
7. Token refresh before expiry
```

### Data Encryption
- **At rest:** MongoDB encryption enabled
- **In transit:** TLS 1.3 for all connections
- **Photos:** Encrypted in object storage
- **Sensitive fields:** Hash passwords (bcrypt), encrypt PII if needed

### Audit Logging
Every sensitive action logged:
```javascript
{
  action: "approve_red_flag",
  user_id: ObjectId,
  batch_id: ObjectId,
  timestamp: ISODate,
  ip_address: "...",
  user_agent: "...",
  details: { ... }
}
```

## Performance Patterns

### Indexes (MongoDB)
```
batches:
  - batch_number (unique)
  - status + current_station
  - pipeline + status
  - created_at

flows:
  - flow_id + version
  - status + effective_date

photos:
  - batch_id + event_id
  - uploaded_at
```

### Caching Strategy
- **Flow definitions:** Cache active flows (invalidate on publish)
- **User permissions:** Cache for token lifetime
- **Analytics:** Cache pre-aggregated reports (5 min TTL)
- **Photos:** CDN with presigned URLs (1h expiry)

### Pagination
- WIP Board: 50 batches per page
- Analytics: 100 rows per page
- CSV export: Stream large results

## Future Patterns (Post-MVP)

### IoT Device Integration
- Scale auto-sends weight via API
- No photo needed if IoT scale used
- Still log scale_id and calibration status

### AI-Assisted Flow Builder
- Suggest steps based on pipeline type
- Learn from historical flows
- Detect anomalies in step order

### Real-time Notifications
- WebSocket connection for live WIP updates
- Push alerts for stuck batches
- Supervisor approval requests


