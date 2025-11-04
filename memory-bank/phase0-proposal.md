# Phase 0 Proposal - METCON Defaults

**Status:** 🟡 Awaiting review and approval  
**Date:** 2025-10-08

This document contains proposed defaults for Phase 0 requirements. Review and adjust to match your actual METCON processes.

---

## 1. Gold Refining Pipeline (Proposed)

### Station 1: Receiving
**Purpose:** Accept incoming material, verify documentation, establish baseline weight

- **Step 1.1** - Visual Inspection *(instruction)*
  - Check material condition
  - Verify batch paperwork matches physical delivery
  - Note any visible contaminants or damage
  
- **Step 1.2** - Initial Weigh-In *(mass_check)*
  - **Expected:** Varies per batch (from job sheet)
  - **Tolerance:** ±1.0g (accounts for packaging/moisture)
  - Place material on calibrated scale
  - Photo required
  
- **Step 1.3** - Documentation *(checklist)*
  - Job number verified
  - Customer details recorded
  - Material type confirmed (gold jewelry, scrap, industrial)
  - Chain of custody signature

### Station 2: Pre-Processing
**Purpose:** Prepare material for refining, remove obvious contaminants

- **Step 2.1** - Material Sorting *(instruction)*
  - Separate by type (jewelry, wire, electronic scrap)
  - Remove non-metallic attachments (stones, plastics)
  - Visual inspection for hazardous materials
  
- **Step 2.2** - Pre-Process Weigh *(mass_check)*
  - **Expected:** From Step 1.2 result
  - **Tolerance:** ±0.5g
  - Verify no material loss during sorting
  
- **Step 2.3** - Safety Check *(checklist)*
  - PPE verified (gloves, goggles, apron)
  - Ventilation system operational
  - Fire suppression equipment accessible

### Station 3: Refining
**Purpose:** Chemical/thermal processing to purify gold

- **Step 3.1** - Pre-Refining Weigh *(mass_check)*
  - **Expected:** From Step 2.2 result
  - **Tolerance:** ±0.2g (tighter control at this stage)
  - Photo required
  
- **Step 3.2** - Refining Process *(instruction)*
  - Load material into refining vessel
  - Follow chemical addition sequence per SOP
  - Monitor temperature and reaction time
  - Record process parameters
  
- **Step 3.3** - Process Completion *(signature)*
  - Operator confirms process complete
  - Time and temperature logs attached
  - Supervisor sign-off required

### Station 4: Assay & Quality Control
**Purpose:** Verify purity and quality of refined gold

- **Step 4.1** - Post-Refining Weigh *(mass_check)*
  - **Expected:** Calculated from Step 3.1 (with expected yield loss %)
  - **Tolerance:** ±0.5g OR ±0.3% (whichever is larger)
  - Photo required
  
- **Step 4.2** - Assay Sample Preparation *(instruction)*
  - Take representative sample
  - Document sample weight and location
  - Submit to assay equipment
  
- **Step 4.3** - Purity Verification *(mass_check + checklist)*
  - Assay result must be ≥99.5% pure (or customer spec)
  - Record purity percentage
  - If fails: return to refining (creates red flag)

### Station 5: Casting & Final Processing
**Purpose:** Cast into bars/granules, prepare for delivery

- **Step 5.1** - Pre-Cast Weigh *(mass_check)*
  - **Expected:** From Step 4.1 result
  - **Tolerance:** ±0.1g (highest precision)
  - Photo required
  
- **Step 5.2** - Casting Process *(instruction)*
  - Melt and pour into molds
  - Cool and remove from molds
  - Visual inspection for defects
  
- **Step 5.3** - Final Weigh *(mass_check)*
  - **Expected:** From Step 5.1 result
  - **Tolerance:** ±0.1g
  - Photo required
  
- **Step 5.4** - Stamping & Marking *(checklist)*
  - Apply batch number stamp
  - Record bar/granule count
  - Purity mark applied (if required)
  
- **Step 5.5** - Final Documentation *(signature)*
  - QC inspector approval
  - Photography of final product
  - Packaging instructions confirmed

### Station 6: Shipping/Delivery
**Purpose:** Secure packaging and handoff to customer

- **Step 6.1** - Final Verification *(checklist)*
  - Count matches Step 5.4 record
  - All documentation complete
  - Customer notification sent
  
- **Step 6.2** - Packaging *(instruction)*
  - Secure packaging per security protocol
  - Seal and label
  - Photo of sealed package
  
- **Step 6.3** - Handoff *(signature)*
  - Shipping company or customer signature
  - Chain of custody complete
  - Batch marked complete in system

---

## 2. Analytics Reports & Filters (Proposed)

### Report 1: Batches in Progress
**Purpose:** Real-time view of active batches and where they're stuck

**Data Shown:**
- Batch number
- Pipeline (gold/silver/PGMs)
- Current station
- Current step
- Time at current step
- Assigned operator
- Priority level
- Flags (if any)

**Filters:**
- Date range (started date)
- Pipeline (gold/silver/PGMs/all)
- Station (dropdown of all stations)
- Operator (dropdown of users)
- Priority (normal/high)
- Status (in_progress/flagged/blocked)
- Time threshold ("Stuck >4 hours", ">8 hours", ">24 hours")

**CSV Export Columns:** All above + started_at, last_updated_at, total_time_elapsed

---

### Report 2: Mass Checks & Variances
**Purpose:** Track weight changes through the process, identify loss patterns

**Data Shown:**
- Batch number
- Station & step
- Expected mass
- Actual mass (OCR detected)
- Variance (g and %)
- Tolerance status (within/out)
- Operator
- Timestamp
- Photo link

**Filters:**
- Date range (check performed date)
- Pipeline (gold/silver/PGMs/all)
- Station (dropdown)
- Operator (dropdown)
- Tolerance status (all/within/out of tolerance)
- Variance threshold ("Show >0.5%", ">1%", ">2%")

**Aggregates:**
- Total checks performed
- % within tolerance
- Average variance (g and %)
- Largest variance (highlight)

**CSV Export:** All detail rows + photo URLs

---

### Report 3: Exceptions & Sign-offs
**Purpose:** Audit trail of all red flags, reasons, and approvals

**Data Shown:**
- Batch number
- Exception type (out_of_tolerance, process_failure, other)
- Station & step
- Reason (operator note)
- Approved by (supervisor)
- Approval timestamp
- Resolution action
- Current batch status

**Filters:**
- Date range (exception occurred)
- Pipeline
- Station
- Exception type (dropdown)
- Approved by (supervisor dropdown)
- Resolution status (approved/pending/rejected)

**CSV Export:** All detail rows + full reason text + resolution notes

---

### Report 4: Operator Performance
**Purpose:** Track operator efficiency and accuracy (not punitive, for training)

**Data Shown (Per Operator):**
- Operator name
- Batches completed
- Avg time per batch
- Avg time per step
- Steps completed
- Mass checks performed
- Mass check accuracy (% within tolerance)
- Exceptions flagged
- Total work hours (derived from timestamps)

**Filters:**
- Date range
- Operator (dropdown or "All")
- Pipeline
- Station (if operator works multiple stations)

**Leaderboard View (Optional):**
- Rank by: Batches completed, Accuracy %, Avg time
- Weighted score: (Batches × Accuracy) / Avg Time

**CSV Export:** Per-operator summary + drill-down option for operator's batch list

---

### Report 5: Station Throughput
**Purpose:** Identify bottlenecks and capacity by station

**Data Shown (Per Station):**
- Station name
- Batches processed
- Avg time at station
- Min/Max time at station
- Currently active batches
- Operators assigned
- Throughput (batches per day/week)

**Filters:**
- Date range
- Pipeline
- Station (compare specific or all)

**Visualization:**
- Bar chart: Avg time by station
- Line chart: Throughput over time (daily/weekly)

**CSV Export:** Station summary + batch-level detail for selected station

---

### Report 6: Yield & Loss Analysis
**Purpose:** Track material loss through refining process

**Data Shown:**
- Batch number
- Initial mass (Step 1.2)
- Pre-refining mass (Step 3.1)
- Post-refining mass (Step 4.1)
- Final mass (Step 5.3)
- Total loss (g and %)
- Loss by stage:
  - Pre-processing loss
  - Refining loss (expected vs actual)
  - Casting loss
- Expected yield (from assay/purity)
- Actual yield

**Filters:**
- Date range (batch completed)
- Pipeline
- Operator (refining step operator)
- Loss threshold ("Show >3%", ">5%", ">10%")

**Aggregates:**
- Avg yield %
- Total material processed (g)
- Total loss (g)
- Loss trend over time

**CSV Export:** All batch detail + stage-by-stage mass progression

---

### Report 7: Turnaround Time (TAT)
**Purpose:** Measure end-to-end batch completion time

**Data Shown:**
- Batch number
- Started at (Step 1.1)
- Completed at (Step 6.3)
- Total turnaround time (hours/days)
- Time per station (breakdown)
- Working time vs idle time
- Exceptions/delays encountered
- Priority level

**Filters:**
- Date range (completed date)
- Pipeline
- Priority (normal/high)
- TAT threshold ("Show >24h", ">48h", ">72h")
- Include/exclude flagged batches

**Visualization:**
- Histogram: TAT distribution
- Trend line: Avg TAT over time
- Waterfall chart: Time breakdown by station

**Targets (Optional):**
- Set target TAT per pipeline (e.g., gold = 48h)
- Highlight batches exceeding target

**CSV Export:** All batches + full time breakdown

---

## 3. Tolerance Settings (Proposed)

### Default Tolerance Rules

| Station | Step Type | Expected Mass Range | Tolerance | Justification |
|---------|-----------|---------------------|-----------|---------------|
| Receiving | Initial Weigh-In | Any | ±1.0g | Accounts for packaging, moisture |
| Pre-Processing | Pre-Process Weigh | <100g | ±0.5g | Material cleaned, tighter control |
| Pre-Processing | Pre-Process Weigh | 100-500g | ±0.3% | Percentage-based for larger amounts |
| Pre-Processing | Pre-Process Weigh | >500g | ±0.2% | Percentage-based scaling |
| Refining | Pre-Refining Weigh | Any | ±0.2g | Critical control point |
| Assay/QC | Post-Refining Weigh | Any | ±0.5g OR ±0.3% | Allows for expected loss |
| Casting | Pre-Cast Weigh | Any | ±0.1g | Highest precision needed |
| Casting | Final Weigh | Any | ±0.1g | Final product tolerance |

### Alternative: Simplified Tolerance
If the above is too complex, use a **single standard:**
- **All mass checks:** ±0.5g OR ±0.5% (whichever is larger)
- **Admins can override** per step in flow builder

### Out-of-Tolerance Approval Workflow

**Who Can Approve:**
1. **Operator:** Can flag and enter reason (required)
2. **Supervisor:** Can approve/reject flag
3. **Admin:** Can approve/reject + override system

**Approval Levels:**
- **Minor variance (<2g or <1%):** Supervisor approval sufficient
- **Major variance (≥2g or ≥1%):** Admin + written justification required
- **Critical variance (≥5g or ≥3%):** Admin + quality review meeting

**System Behavior:**
- Batch **cannot proceed** until approval received
- Supervisor notified immediately (email/SMS/app notification)
- Batch flagged on WIP board with ⚠️ icon
- All approvals logged with timestamp + IP address

---

## 4. Infrastructure & Security (Proposed)

### Cloud Provider & Region
**Recommendation:** AWS (most mature ecosystem)
- **Region:** US-West-2 (Oregon) OR US-East-1 (Virginia)
  - If METCON is Europe-based: EU-Central-1 (Frankfurt)
  - If compliance requires: Choose based on data residency rules
- **Services:**
  - EC2/ECS for API hosting
  - MongoDB Atlas (managed)
  - S3 for photo storage (with lifecycle policies)
  - CloudFront CDN for photo delivery
  - SES for email notifications

### Data Retention Policy
**Photos:**
- **Active batches:** Retain indefinitely
- **Completed batches:** 2 years hot storage, then:
  - Option A: Archive to Glacier (cheap, slow retrieval)
  - Option B: Delete after audit period (if legally allowed)
- **Flagged/exception batches:** 7 years minimum (compliance)

**Database:**
- **Batches:** Retain completed batches for 3 years
- **Audit logs:** 7 years (compliance requirement)
- **User activity:** 1 year

**Backups:**
- **Database:** Daily incremental, weekly full (30-day retention)
- **Photos:** Versioning enabled (30-day recovery window)

### Authentication & Authorization

**2-Factor Authentication (2FA):**
- **Primary login:** Username + Password
- **Second factor options:**
  1. **SMS code** (easiest for shop floor)
  2. **Authenticator app** (Google Authenticator, Authy)
  3. **Email code** (fallback)
- **Enrollment:** Mandatory for Admin/Supervisor, optional for Operator
- **Recovery:** Backup codes generated at enrollment

**Login Flow:**
```
1. User enters username + password
2. System validates credentials
3. If valid → send 2FA code via chosen method
4. User enters 6-digit code
5. System validates code (5-minute expiry)
6. Issue JWT token (1h expiry)
7. User logged in
```

**Session Management:**
- JWT stored in httpOnly cookie (XSS protection)
- Token refresh before expiry (silent renewal)
- "Remember this device" option (30-day bypass for 2FA)
- Automatic logout after 8 hours of inactivity

**Password Policy:**
- Minimum 10 characters
- Require: uppercase, lowercase, number, special character
- No common passwords (check against leaked DB)
- Rotation: Every 90 days for Admin, 180 days for others
- History: Can't reuse last 5 passwords

**Role-Based Access:**
- **Operator:** Execute batches, view own performance
- **Supervisor:** All operator + approve red flags, view team performance
- **Admin:** All supervisor + create/edit flows, manage users, system settings
- **Analyst:** Read-only access to all analytics, CSV export

### Tech Stack Decision

**Recommended Stack (Balanced):**

**Frontend:**
- **Framework:** React 18 + TypeScript
- **UI:** Shadcn UI (modern, customizable, accessible)
- **State:** Zustand (lightweight, simple)
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod validation
- **Camera:** react-camera-pro
- **Charts:** Recharts (analytics)
- **Build:** Vite

**Backend:**
- **Runtime:** Node.js 20 LTS + TypeScript
- **Framework:** Express.js (mature, widely supported)
- **Validation:** Zod (shared with frontend)
- **Auth:** jsonwebtoken + bcrypt
- **2FA:** speakeasy (TOTP generation) + twilio (SMS)
- **File Upload:** multer + sharp (image processing)
- **Testing:** Jest + Supertest

**Database:**
- **MongoDB Atlas** (M10 cluster for production)
- **ODM:** Mongoose (schema validation, middleware)

**Storage:**
- **AWS S3** (photo storage)
- **Sharp:** Resize images on upload (thumbnail + full)

**AI OCR:**
- **Primary:** OpenAI Vision API (GPT-4 Vision)
- **Fallback:** Google Cloud Vision API
- **Confidence threshold:** 0.85 (below this = manual entry prompt)

---

## 5. Additional Feature: 2FA Login Screen

### Login Screen Flow

**Screen 1: Username & Password**
```
┌─────────────────────────────────────┐
│          METCON Workflow            │
│                                     │
│  [Username field]                   │
│  [Password field]                   │
│                                     │
│  [x] Remember this device           │
│                                     │
│       [Login Button]                │
│                                     │
│  Forgot password?                   │
└─────────────────────────────────────┘
```

**Screen 2: 2FA Code Entry** (after valid username/password)
```
┌─────────────────────────────────────┐
│       Two-Factor Authentication     │
│                                     │
│  A 6-digit code has been sent to:   │
│  •••••••@example.com                │
│                                     │
│  [___] [___] [___] [___] [___] [___]│
│   (auto-focus, auto-advance)        │
│                                     │
│       [Verify Button]               │
│                                     │
│  Didn't receive code?               │
│  [Resend] | [Try another method]    │
│                                     │
│  Code expires in: 4:32              │
└─────────────────────────────────────┘
```

**Screen 3: Initial Setup** (first login or 2FA enrollment)
```
┌─────────────────────────────────────┐
│      Set Up Two-Factor Auth         │
│                                     │
│  Choose your verification method:   │
│                                     │
│  ○ Text message (SMS)               │
│     [Phone number field]            │
│                                     │
│  ○ Authenticator app                │
│     [Show QR code]                  │
│                                     │
│  ○ Email                            │
│     [Email field]                   │
│                                     │
│  [Continue]                         │
│                                     │
│  ⚠️ Save your backup codes after    │
│     setup (in case you lose access) │
└─────────────────────────────────────┘
```

### Features:
- **Responsive:** Works on mobile, tablet, desktop
- **Accessibility:** Keyboard navigation, screen reader support
- **Security:** Rate limiting (5 attempts, then 15-min lockout)
- **UX:** Clear error messages, loading states
- **Recovery:** Backup codes + admin reset option

---

## Review Checklist

Please review and mark ✅ or adjust:

- [ ] **Gold Pipeline:** Stations/steps make sense? Missing anything?
- [ ] **Tolerances:** ±0.5g reasonable? Need different values?
- [ ] **Analytics:** 7 reports cover your needs? Filters correct?
- [ ] **Approvals:** Supervisor role sufficient? Need more levels?
- [ ] **Retention:** 2 years for photos OK? Longer/shorter?
- [ ] **2FA:** SMS + Authenticator sufficient? Mandatory for all roles?
- [ ] **Tech Stack:** React + Node.js + MongoDB good? Other preferences?
- [ ] **Cloud:** AWS OK? Need different region?

---

## Next Steps After Approval

Once you approve (or adjust) these defaults:

1. **Update Memory Bank** with final specs
2. **Set up repository structure**
3. **Install dependencies** (frontend + backend)
4. **Create docker-compose** for local dev
5. **Build 2FA login screen** (Phase 1 start)
6. **Create skeleton app** (navigation, API, DB)

Estimated time to working prototype: **3-5 days**

---

**Ready for your feedback!** Let me know what to change, then we'll lock it in and start building.


