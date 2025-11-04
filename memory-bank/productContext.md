# Product Context - METCON Workflow App

## Why This Project Exists

METCON processes precious metals (gold, silver, PGMs) through complex workflows requiring:
- Strict SOP adherence
- Accurate mass tracking at multiple checkpoints
- Complete audit trail for compliance
- Real-time visibility into batch status
- Data-driven insights for continuous improvement

Current state likely involves manual tracking, paper forms, and disconnected systems leading to:
- Rework and wastage from errors
- Slow turnaround times
- Limited visibility into bottlenecks
- Difficult compliance auditing
- No performance insights

## Problems We're Solving

### For Operators
- **Complexity:** Hard to remember every SOP step correctly
- **Errors:** Manual weight entry introduces mistakes
- **Ambiguity:** Unclear what to do when mass is off-spec
- **Accountability:** Hard to prove what was actually done

### For Admins
- **Control:** Can't easily enforce standard procedures
- **Visibility:** Don't know where batches are stuck
- **Changes:** Hard to update SOPs across teams
- **Compliance:** Manual audit trail reconstruction

### For Analysts
- **Data access:** Hard to extract meaningful data
- **Inconsistency:** Different people track differently
- **Time waste:** Manual report building from scattered sources
- **No trends:** Can't see patterns in exceptions or performance

## How It Should Work

### Operator Experience (Primary Focus)
1. **Start:** Scan batch job paper → system identifies the right workflow
2. **Execute:** Follow clear, step-by-step instructions on screen
3. **Validate:** Take photo of scale → system reads it automatically
4. **Resolve:** If out of tolerance, guided through exception process
5. **Complete:** Move to next step; system tracks everything

**Key UX Goals:**
- Zero training needed - intuitive interface
- One clear action at a time
- Immediate feedback (green/red)
- No typing when possible (scan, photo, tap)
- Mobile-friendly for shop floor

### Admin Experience
1. **Define once:** Set up gold flow with stations, steps, tolerances
2. **Monitor:** Watch WIP board for stuck batches or flags
3. **Adjust:** Change tolerances or add steps without coding
4. **Manage:** Control user roles and permissions

**Key UX Goals:**
- Visual flow builder
- Real-time monitoring dashboard
- Quick tolerance adjustments
- Clear permission model

### Analyst Experience
1. **Access:** Open pre-built report (no query building)
2. **Filter:** Select date range, metal type, station, user
3. **Review:** See charts and tables
4. **Export:** Download CSV with full details

**Key UX Goals:**
- No SQL knowledge needed
- Standard reports cover 90% of needs
- Fast loading (pre-aggregated where possible)
- Reliable exports match what's shown

## User Journey Maps

### Happy Path (Operator)
```
Scan batch paper
  ↓
See: "Gold Refining - Step 1: Initial Inspection"
  ↓
Read instructions, complete checklist
  ↓
Step says: "Weigh incoming material"
  ↓
Place on scale, take photo
  ↓
System: "148.3g detected - Within tolerance ✓"
  ↓
Sign and move to next step
  ↓
Batch advances; WIP board updates
```

### Exception Path (Operator)
```
Weigh step shows: "Expected: 150g ±0.5g"
  ↓
Take photo of scale showing 145.2g
  ↓
System: "Out of tolerance - variance -4.8g ⚠️"
  ↓
Required: Enter reason + supervisor approval
  ↓
Type note: "Material loss during transfer"
  ↓
Supervisor scans badge to approve
  ↓
Batch continues with red flag visible
```

### Analyst Path
```
Open Analytics → "Mass Checks & Variances"
  ↓
Filter: Last 30 days, Gold, All stations
  ↓
See: 45 total checks, 3 out of tolerance
  ↓
Drill into variances, see photos + notes
  ↓
Download CSV with all data
```

## Success Metrics

### MVP Success (3 months after deployment)
- 90% of batches tracked from start to finish
- <5% OCR read failures requiring manual entry
- Average batch turnaround time measured and baselined
- Zero compliance gaps in audit trail
- Positive operator feedback (simple, fast, clear)

### Long-term Success (12 months)
- 15% reduction in turnaround time
- 50% reduction in tolerance exceptions
- 100% audit trail coverage
- Self-service analytics (minimal analyst requests)
- Operators prefer digital over paper

## Design Principles

1. **Clarity over features:** One clear action beats ten options
2. **Photo proof everything:** Visual evidence builds trust
3. **Fail safely:** Out-of-tolerance stops progress until resolved
4. **Audit by default:** Everything logged, immutable, timestamped
5. **Mobile-first:** Works on tablet/phone at the station
6. **No dead ends:** Every error state has clear next step
7. **Progressive disclosure:** Show what's needed now, hide complexity


