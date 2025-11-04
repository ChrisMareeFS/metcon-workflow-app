# Analytics Flow Integration

## Overview

Analytics data is now **automatically populated** as batches progress through your flows. The system intelligently captures metrics based on station names and step types.

## How It Works

When an operator completes a step in the flow, the system:
1. Checks the station/step template name and type
2. Extracts relevant data from the step completion
3. Automatically populates the appropriate analytics fields
4. Performs calculations (FTT hours, recovery %, loss/gain)

## Data Capture Rules

### 1. **Melting Received Timestamp**
- **Triggers:** Station name contains "melting" or "receiving"
- **Captures:** `melting_received_at` timestamp
- **Additional:** Can also capture `supplier`, `drill_number`, `destination` if provided in step data

**Example step data:**
```json
{
  "supplier": "Geita Gold Refinery Limited (Tanzania)",
  "drill_number": "S0001",
  "destination": "Export"
}
```

### 2. **Received Weight & Fine Content**
- **Triggers:** `mass_check` type step with "receiving" or "initial" in name
- **Captures:**
  - `received_weight_g` from `measured_mass`, `mass`, or `weight` field
  - `fine_content_percent` from `fine_content_percent`, `fine_percent`, or `purity` field
  - **Auto-calculates:** `fine_grams_received = received_weight_g * fine_content_percent / 100`

**Example step data:**
```json
{
  "measured_mass": 125469.3,
  "fine_content_percent": 99.98
}
```

### 3. **Expected Output Weight**
- **Triggers:** `mass_check` type step with "expected", "pre-cast", or "target" in name
- **Captures:** `expected_output_g` from weight field

**Example step data:**
```json
{
  "mass": 125000.0
}
```

### 4. **First Export / First Pour**
- **Triggers:** Station name contains "export", "first pour", or "casting"
- **Captures:**
  - `first_export_at` timestamp
  - `output_weight_g` and `first_time_recovery_g` from `output_weight`, `pour_weight`, or `weight`
  - **Auto-calculates:** `ftt_hours` (business hours from melting to export, excluding weekends)
  - **Auto-adds:** First entry to `recovery_pours` array

**Example step data:**
```json
{
  "output_weight": 120500.5
}
```

### 5. **Recovery Pours**
- **Triggers:** Station name contains "recovery"
- **Captures:** Adds entry to `recovery_pours` array with `pour_weight`, timestamp, and pour number

**Example step data:**
```json
{
  "pour_weight": 2500.3
}
```

### 6. **Automatic Calculations**

The system continuously calculates:

- **Total Recovery:** Sum of all recovery pours
- **Overall Recovery %:** `(total_recovery_g / fine_grams_received) * 100`
- **Loss/Gain:** `actual_output_g - expected_output_g`
- **Loss/Gain %:** `(loss_gain_g / expected_output_g) * 100`

If `expected_output_g` is not explicitly set, the system assumes 99.5% recovery:
```
expected_output_g = fine_grams_received * 0.995
```

## Station Naming Best Practices

For automatic analytics capture to work best, use these naming conventions:

### Capture Receiving Data
- "Receiving", "Material Receiving", "Initial Weigh-In"
- "Melting Received", "At Melting"

### Capture Export Data
- "First Export", "Export Pour", "First Casting"
- "Primary Pour", "Initial Output"

### Capture Recovery Data
- "Recovery Pour 2", "Secondary Recovery"
- "Tertiary Recovery", "Final Recovery"

### Capture Expected Weight
- "Expected Weight", "Pre-Cast Weight"
- "Target Weight", "Calculated Output"

## Example Flow Execution

### Batch: `8931_G_01`

#### Step 1: Receiving Station - Initial Weigh
**Operator completes with data:**
```json
{
  "measured_mass": 125469.3,
  "fine_content_percent": 99.98,
  "supplier": "Geita Gold Refinery Limited",
  "drill_number": "S0001"
}
```

**System captures:**
- ✅ `received_weight_g = 125469.3`
- ✅ `fine_content_percent = 99.98`
- ✅ `fine_grams_received = 125444.21` (auto-calculated)
- ✅ `supplier = "Geita Gold Refinery Limited"`
- ✅ `drill_number = "S0001"`

#### Step 2: Melting Station
**Operator completes:**
```json
{
  "temperature": 1200,
  "duration_minutes": 45
}
```

**System captures:**
- ✅ `melting_received_at = 2025-10-14 14:30:00` (timestamp)

#### Step 3: Refining Station - Expected Weight
**Operator enters target:**
```json
{
  "mass": 125000.0
}
```

**System captures:**
- ✅ `expected_output_g = 125000.0`

#### Step 4: First Export
**Operator completes:**
```json
{
  "output_weight": 120500.5
}
```

**System captures:**
- ✅ `first_export_at = 2025-10-15 10:30:00`
- ✅ `output_weight_g = 120500.5`
- ✅ `first_time_recovery_g = 120500.5`
- ✅ `ftt_hours = 20` (auto-calculated, excludes weekends)
- ✅ Adds to `recovery_pours[0]`

**System calculates:**
- ✅ `total_recovery_g = 120500.5`
- ✅ `overall_recovery_percent = 96.06%`
- ✅ `loss_gain_g = -4499.5` (loss)
- ✅ `loss_gain_percent = -3.60%`

#### Step 5: Recovery Pour 2
**Operator completes:**
```json
{
  "pour_weight": 2800.0
}
```

**System captures:**
- ✅ Adds to `recovery_pours[1]`

**System re-calculates:**
- ✅ `total_recovery_g = 123300.5`
- ✅ `overall_recovery_percent = 98.29%`
- ✅ `loss_gain_g = -1699.5`
- ✅ `loss_gain_percent = -1.36%`

#### Step 6: Batch Completion
**When batch reaches final step:**
- ✅ `status = 'completed'`
- ✅ `completed_at = timestamp`
- ✅ All analytics finalized

## Viewing Analytics

Once batches flow through with this data captured:

1. **Dashboard → Analytics** - View YTD metrics
2. **Backend API** - Query `/api/analytics?year=2025`
3. **Database** - All fields populated in `batches` collection

## Field Mapping Reference

| Frontend Input Name | Backend Field | Notes |
|---------------------|---------------|-------|
| `measured_mass`, `mass`, `weight` | `received_weight_g` | At receiving station |
| `fine_content_percent`, `fine_percent`, `purity` | `fine_content_percent` | Purity percentage |
| `output_weight`, `pour_weight` | `first_time_recovery_g` | First export |
| `pour_weight` | Added to `recovery_pours` | Recovery stations |
| `supplier` | `supplier` | Optional, at receiving |
| `drill_number` | `drill_number` | Optional, shipment tracking |
| `destination` | `destination` | Optional, where material goes |

## Testing

To test the automatic capture:

1. Create a batch with appropriate naming conventions
2. Complete steps with the data structure shown above
3. Check batch document in MongoDB - analytics fields should populate
4. View analytics dashboard - metrics should update

## Migration Note

Existing batches without this data will show `null` for analytics fields. Only new batches flowing through after this integration will have analytics populated automatically.

## Future Enhancements

- Auto-detect station types without relying on names (using flow metadata)
- AI-powered weight extraction from scale photos
- Real-time analytics dashboard updates
- Alerts for batches exceeding loss thresholds









