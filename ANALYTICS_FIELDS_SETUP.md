# Analytics Data Fields - Setup Complete

## Overview

The Batch model has been extended with fields to support comprehensive Year-to-Date (YTD) analytics for precious metals processing.

## Changes Made

### 1. Backend Model (`backend/src/models/Batch.ts`)

**New Interfaces:**
- `IRecoveryPour` - Tracks individual recovery pours with weight, timestamp, and pour number

**New Fields Added to IBatch:**

#### Material & Source (for analytics)
- `supplier`: string - Supplier name (e.g., "Geita Gold Refinery Limited")
- `drill_number`: string - Shipment tracking number
- `destination`: string - Where material is being sent

#### Weight & Fine Content (for analytics)
- `received_weight_g`: number - Gross weight received at melting
- `fine_content_percent`: number - Purity percentage (e.g., 99.98)
- `fine_grams_received`: number - Calculated: received_weight * fine_content_percent / 100
- `output_weight_g`: number - Weight of first export pour
- `recovery_pours`: IRecoveryPour[] - All recovery pours

#### Recovery Metrics (for analytics)
- `first_time_recovery_g`: number - Gold in first export pour
- `total_recovery_g`: number - Sum of all recovery pours
- `overall_recovery_percent`: number - total_recovery / fine_grams_received * 100

#### Timing Milestones (for analytics)
- `melting_received_at`: Date | null - When material arrives at melting station
- `first_export_at`: Date | null - When first bars are exported
- `ftt_hours`: number | null - First Time Through hours (excluding weekends)

#### Loss/Gain Tracking (for analytics)
- `expected_output_g`: number - Based on fine content and process
- `actual_output_g`: number - Sum of all outputs
- `loss_gain_g`: number - actual - expected (negative = loss, positive = gain)
- `loss_gain_percent`: number - loss_gain / expected * 100

**New Indexes Added:**
- `created_at + pipeline` - For monthly batches by metal type
- `melting_received_at` - For FTT analysis
- `first_export_at` - For recovery timing
- `pipeline + status + completed_at` - For completed batch analytics

### 2. Frontend Types (`frontend/src/services/batchService.ts`)

All backend fields have been mirrored in the frontend `Batch` interface with appropriate TypeScript types (Dates as strings for JSON serialization).

### 3. Sample Data (`backend/seed-analytics-batches.ts`)

A new seed script has been created to populate the database with 12 sample batches:
- 10 completed batches with full analytics data
- 2 in-progress batches
- Data range: October 2025 (for YTD testing)
- Realistic variations in:
  - Suppliers
  - Weights and recovery rates
  - FTT timing
  - Loss/gain percentages

## How to Test

### 1. Seed Sample Analytics Data

Run the analytics batch seed script:

```bash
cd backend
npx tsx seed-analytics-batches.ts
```

This will create sample batches with populated analytics fields.

### 2. Verify in MongoDB

Check that batches have the new fields populated:

```javascript
db.batches.findOne({ batch_number: "8931_G_01" })
```

You should see fields like `supplier`, `fine_grams_received`, `overall_recovery_percent`, etc.

### 3. Query Analytics Data

Example queries you can now run:

#### Monthly Batches Count
```javascript
db.batches.aggregate([
  {
    $match: {
      created_at: {
        $gte: new Date("2025-01-01"),
        $lte: new Date("2025-12-31")
      }
    }
  },
  {
    $group: {
      _id: {
        year: { $year: "$created_at" },
        month: { $month: "$created_at" },
        pipeline: "$pipeline"
      },
      count: { $sum: 1 }
    }
  }
])
```

#### YTD Loss/Gain
```javascript
db.batches.aggregate([
  {
    $match: {
      status: "completed",
      loss_gain_g: { $exists: true }
    }
  },
  {
    $group: {
      _id: "$pipeline",
      total_loss_gain: { $sum: "$loss_gain_g" },
      avg_recovery: { $avg: "$overall_recovery_percent" },
      batches: { $sum: 1 }
    }
  }
])
```

#### Average FTT Hours
```javascript
db.batches.aggregate([
  {
    $match: {
      ftt_hours: { $exists: true, $ne: null }
    }
  },
  {
    $group: {
      _id: "$pipeline",
      avg_ftt_hours: { $avg: "$ftt_hours" },
      min_ftt_hours: { $min: "$ftt_hours" },
      max_ftt_hours: { $max: "$ftt_hours" }
    }
  }
])
```

## Analytics Metrics Now Supported

With these fields, you can now calculate all 9 requested analytics:

1. ✅ **Batches processed per month** - Use `created_at` + `pipeline`
2. ✅ **Fine content** - `fine_grams_received` per batch
3. ✅ **Loss/gain grams Au** - `loss_gain_g` per batch
4. ✅ **YTD Loss/gain cumulative** - Sum of `loss_gain_g`
5. ✅ **YTD Loss/gain cumulative % of fine g received** - Sum(`loss_gain_g`) / Sum(`fine_grams_received`) * 100
6. ✅ **First Time Through (FTT) hours** - `ftt_hours` field
7. ✅ **First Time Through Recovery %** - `first_time_recovery_g` / `fine_grams_received` * 100
8. ✅ **Overall recovery %** - `overall_recovery_percent` field
9. ✅ **Maximum gain or loss per month** - Max/Min of `loss_gain_g` grouped by month

## Migration Notes

- All new fields are **optional** (`?` in TypeScript, not required in Mongoose)
- Existing batches will have these fields as `null` or `undefined`
- New batches should populate these fields as they progress through stations
- Analytics queries should handle null values gracefully (e.g., filter by `{ field: { $exists: true, $ne: null } }`)

## Next Steps

Now that the data model is ready, you can:

1. **Build API endpoints** to calculate and serve analytics
2. **Create analytics dashboard** in the frontend with charts
3. **Add API routes** for each of the 9 analytics reports
4. **Implement CSV export** functionality
5. **Add filters** (date range, pipeline, supplier, etc.)

## Performance Considerations

The new indexes ensure that analytics queries will be fast:
- Use `created_at + pipeline` index for time-based queries
- Use `melting_received_at` and `first_export_at` for FTT analysis
- Use `pipeline + status + completed_at` for completed batch reports

For large datasets, consider:
- Pre-aggregating monthly totals
- Caching frequently-accessed reports (5-minute TTL)
- Pagination for detailed batch lists









