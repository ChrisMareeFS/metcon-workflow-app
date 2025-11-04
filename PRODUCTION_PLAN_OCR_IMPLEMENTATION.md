# Production Plan OCR Implementation
**Date:** November 3, 2025  
**Feature:** OCR-powered Production Plan Form Processing

---

## Overview

Implemented a complete OCR system to capture data from Production Plan Forms (like the MG Metal Concentrators form), automatically extract all relevant fields, and integrate with the batch tracking system.

---

## Components Created

### 1. **Backend Model** ✅
**File:** `backend/src/models/ProductionPlan.ts`

**Features:**
- Complete data model for production plan forms
- Input production items (package numbers, supplier, weights, gold/silver fine content)
- Output production tracking
- OCR metadata (confidence scores, processing timestamps)
- Batch linking capability
- Full audit trail (uploaded by, timestamps)

**Key Fields:**
```typescript
- plan_number: string (e.g., "9017")
- pass_number: string (e.g., "PP021")
- start_time, end_time: Date
- input_items: Array of production items
  - package_number, supplier, weights, percentages, fine content
- input_summary: Totals and aggregates
- output_items: Destination and shipped items
- ocr_confidence: 0-1 score
- batch_id: Link to batch system
```

### 2. **OCR Processing Service** ✅
**File:** `backend/src/services/productionPlanOcr.ts`

**Features:**
- Image pre-processing (greyscale, normalize, sharpen, threshold)
- Tesseract.js integration with optimized settings
- Intelligent text extraction:
  - Plan number and pass number detection
  - Date/time parsing (format: YYYY/MM/DD HH:MM)
  - Table row extraction from input production section
  - Summary totals extraction
  - Output production item parsing
- Validation with confidence thresholds
- Error detection and reporting

**Key Functions:**
```typescript
- processProductionPlanOcr(imageBuffer): Extract all data
- validateOcrResult(): Check quality and completeness
- Helper parsers for dates, numbers, and tables
```

**Validation Rules:**
- OCR confidence must be ≥ 70%
- Plan number required
- Pass number required
- At least one input item required
- All input items must have package number and weight

### 3. **API Routes** ✅
**File:** `backend/src/routes/productionPlanRoutes.ts`

**Endpoints:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/production-plans/upload` | operator, admin | Upload image for OCR processing |
| POST | `/api/production-plans/manual-entry` | operator, admin | Manual entry without OCR |
| POST | `/api/production-plans/:id/link-batch` | operator, admin | Link to batch |
| GET | `/api/production-plans` | all | List with filters |
| GET | `/api/production-plans/:id` | all | Get single plan |
| PUT | `/api/production-plans/:id` | operator, admin | Update/correct data |
| DELETE | `/api/production-plans/:id` | admin | Delete plan |

**Features:**
- Multipart form upload with multer
- 10MB file size limit
- Image-only file filtering
- Automatic OCR processing on upload
- Duplicate detection (by plan_number)
- Error handling with detailed OCR validation messages
- Population of user and batch references

### 4. **Frontend Service** ✅
**File:** `frontend/src/services/productionPlanService.ts`

**TypeScript Interfaces:**
```typescript
- ProductionPlan: Complete plan data
- ProductionPlanItem: Input production row
- OutProductionItem: Output production row
- UploadProductionPlanResponse: API response with OCR results
```

**Service Methods:**
```typescript
- uploadProductionPlan(file): Upload and process with OCR
- getProductionPlans(filters): List all plans
- getProductionPlan(id): Get single plan details
- updateProductionPlan(id, updates): Manual corrections
- linkToBatch(id, batchId): Associate with batch
- deleteProductionPlan(id): Remove plan
- createManualProductionPlan(data): Manual entry
```

### 5. **Frontend Upload Component** ✅
**File:** `frontend/src/pages/batches/ProductionPlanUpload.tsx`

**UI Features:**
- Drag-and-drop file upload area
- Image preview before processing
- Real-time OCR processing indicator
- Success view with extracted data:
  - Plan number, pass number, confidence score
  - Total items count, total weight, gold fine
  - Color-coded confidence levels (green ≥90%, yellow ≥70%, red <70%)
- Detailed error messages with validation feedback
- Tips for better OCR results
- Full input items table preview
- Actions: View Details, Upload Another

**User Experience:**
1. Select production plan form image
2. Preview uploaded image
3. Click "Process Form"
4. View OCR extraction results
5. Navigate to details or upload another

### 6. **Dashboard Integration** ✅
**File:** `frontend/src/pages/Dashboard.tsx`

Added new dashboard card:
- **Production Plans** tile
- Visible to operators and admins
- Orange gradient design
- Direct navigation to upload page

### 7. **Batch Integration** ✅
**File:** `backend/src/models/Batch.ts`

Updated batch model:
- Added `production_plan_id` field
- Indexed for efficient queries
- Links batches to their source production plans
- Enables traceability from form → batch → completion

---

## Data Flow

```
1. Operator uploads form image
   ↓
2. Backend pre-processes image
   ↓
3. Tesseract OCR extracts text
   ↓
4. Parser extracts structured data
   ↓
5. Validation checks quality
   ↓
6. Save to MongoDB
   ↓
7. Display results to operator
   ↓
8. Optional: Link to batch
   ↓
9. Track through workflow
```

---

## OCR Optimization

### Image Pre-processing Pipeline:
1. **Greyscale** - Remove color, focus on contrast
2. **Normalize** - Enhance contrast
3. **Sharpen** - Improve text clarity
4. **Threshold** - Convert to black/white for clear text

### Tesseract Configuration:
```typescript
{
  language: 'eng',
  tessedit_char_whitelist: 'A-Za-z0-9.,/:() -',
  // Only allow expected characters to reduce noise
}
```

### Parser Logic:
- **Plan Number**: Find 4-digit number in header
- **Pass Number**: Match "PP" followed by digits
- **Timestamps**: Parse YYYY/MM/DD HH:MM format
- **Tables**: Split by whitespace, validate columns
- **Numbers**: Remove commas, handle decimals
- **Supplier**: Extract from known column position

---

## Error Handling

### OCR Validation Errors:
- **Low confidence** (<70%) → Manual review required
- **Missing plan number** → Cannot proceed
- **Missing pass number** → Cannot proceed
- **No input items** → Form not readable
- **Invalid weights** → Data quality issue

### Upload Errors:
- **File too large** (>10MB) → Rejected
- **Wrong file type** → Images only
- **Duplicate plan number** → Already processed
- **Network errors** → Retry with feedback

### User Feedback:
- Clear error messages
- Actionable tips for better results
- Option to retry or manual entry
- Display partial OCR results for correction

---

## Security & Validation

### Authentication:
- All routes require JWT authentication
- Only operators and admins can upload
- Only admins can delete

### File Upload Security:
- File type validation (images only)
- Size limit (10MB)
- Multer memory storage (no temp files)
- Content-Type checking

### Data Validation:
- Zod schemas for all inputs
- MongoDB schema validation
- OCR confidence thresholds
- Business logic validation (weights, percentages)

---

## Integration Points

### With Batches:
- `production_plan_id` field on Batch model
- Link production plans to batches via API
- Query batches by production plan
- Traceability from source document

### With Analytics:
- Input totals feed into batch expectations
- Gold fine content tracking
- Weight reconciliation
- Recovery rate calculations

### With Users:
- Track who uploaded each plan
- Audit trail of all actions
- Permission-based access

---

## Testing Checklist

### Backend:
- [ ] Upload valid production plan form image
- [ ] Test OCR with various image qualities
- [ ] Validate OCR confidence thresholds
- [ ] Test duplicate plan number detection
- [ ] Test batch linking
- [ ] Test manual entry fallback
- [ ] Test permissions (operator vs admin)
- [ ] Test pagination and filtering

### Frontend:
- [ ] Upload flow works end-to-end
- [ ] File preview displays correctly
- [ ] OCR processing indicator shows
- [ ] Success view displays extracted data
- [ ] Error messages are clear
- [ ] Table preview renders correctly
- [ ] Navigation to details works
- [ ] Dashboard card links correctly

### Integration:
- [ ] Link production plan to batch
- [ ] Query batches by production plan
- [ ] Verify audit trail
- [ ] Test with actual production plan forms
- [ ] Validate data accuracy (spot checks)

---

## Sample Form Structure

Based on the provided Production Plan Form (9017):

### Header Section:
- Plan Number: **9017**
- Pass Number: **PP021**
- Start Time: **2025/10/03 14:11**
- End Time: **2025/10/04 16:35**

### Input Production (10 rows):
| Row | Package | Supplier | Drill | Weight | Ag % | Ag Fine | Au % | Au Fine |
|-----|---------|----------|-------|--------|------|---------|------|---------|
| 1 | S13354 | Geita Gold Refinery | 0.0 | 13,107 | 0.00% | 0.0 | 99.99% | 13,106 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

### Summary:
- Carat: 23.97
- Total Weight: 125,795 g
- Total Gold Fine: 125,669 g

### Out Production:
- Destinations with weights and sign-offs

---

## Future Enhancements

### Phase 2:
- [ ] Auto-rotation detection for skewed images
- [ ] Multi-language OCR support
- [ ] Batch upload (multiple forms at once)
- [ ] AI-powered form field detection
- [ ] Confidence-based auto-approval
- [ ] Mobile app integration

### Phase 3:
- [ ] Real-time OCR preview during upload
- [ ] Historical accuracy tracking
- [ ] OCR model fine-tuning with actual forms
- [ ] Integration with digital signature capture
- [ ] Automated batch creation from production plans
- [ ] QR code generation for traceability

---

## Documentation

### API Documentation:
See `backend/src/routes/productionPlanRoutes.ts` for:
- Request/response formats
- Authentication requirements
- Validation rules
- Error codes

### Frontend Documentation:
See `frontend/src/services/productionPlanService.ts` for:
- TypeScript interfaces
- Service method signatures
- Usage examples

---

## Deployment Notes

### Dependencies:
```json
Backend:
- tesseract.js: ^4.x
- sharp: ^0.32.x
- multer: ^1.4.x

Frontend:
- (No new dependencies)
```

### Environment Variables:
```
None required - uses default Tesseract models
```

### Database:
- New collection: `productionplans`
- Indexes automatically created
- No migration required

---

## Success Metrics

### Accuracy Targets:
- **OCR Confidence**: ≥90% for automated processing
- **Plan Number Detection**: 100% accuracy required
- **Weight Extraction**: ≥95% accuracy
- **Item Count**: 100% accuracy

### Performance Targets:
- **Upload Speed**: <5 seconds for 5MB image
- **OCR Processing**: <10 seconds per form
- **API Response**: <2 seconds for list queries

### User Experience:
- **Success Rate**: ≥95% first-time uploads
- **Manual Correction**: <5% of uploads
- **Error Clarity**: Users understand next steps

---

## Conclusion

✅ **Production Plan OCR System Fully Implemented**

The system is ready for:
1. Production plan form uploads
2. Automatic OCR extraction
3. Manual corrections when needed
4. Batch integration and tracking
5. Full audit trail and traceability

**Next Steps:**
1. Test with actual production plan forms
2. Fine-tune OCR confidence thresholds based on real data
3. Gather operator feedback
4. Iterate on UX improvements



