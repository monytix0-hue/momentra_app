# Expense Photo Receipts — Design Document

## Overview
Attach photo receipts to personal & group expense transactions across iOS, Android, and Web. Users can snap a receipt at the time of entry or attach one later.

## Existing Infrastructure
- `POST /storage/upload/{bucket}/{path}` → Returns `{path, public_url}`
- iOS: `NetworkService.uploadStorageObject()` — multipart upload
- Android: `AuthRepository.uploadBusinessReceipt()` — multipart pattern already established
- Web: Standard `FormData` + `XMLHttpRequest`/`fetch`

## Data Model

### Database — `transaction_receipts` table (Supabase migration)
```sql
CREATE TABLE transaction_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  group_expense_id UUID REFERENCES group_expenses(id) ON DELETE CASCADE,
  -- ^ exactly one of these two must be set (CHECK constraint)
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  thumbnail_url TEXT,
  mime_type TEXT,
  file_size_bytes INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_transaction_or_expense CHECK (
    (transaction_id IS NOT NULL AND group_expense_id IS NULL)
    OR (transaction_id IS NULL AND group_expense_id IS NOT NULL)
  )
);

-- Index for quick lookup
CREATE INDEX idx_receipts_transaction ON transaction_receipts(transaction_id);
CREATE INDEX idx_receipts_group_expense ON transaction_receipts(group_expense_id);
CREATE INDEX idx_receipts_user ON transaction_receipts(user_id);
```

### Bucket: `receipts`
- Already created via Supabase storage setup
- Path pattern: `receipts/{user_id}/{uuid}.{ext}`
- Public-read, private-write

## API Endpoints

### POST `/storage/upload/receipt` (New convenience endpoint)
**Multipart form:**
- `file` (required) — image file
- `transaction_id` (optional) — link to personal transaction
- `group_expense_id` (optional) — link to group expense
- `compress` (optional, default: `true`)

**Returns** `{receipt_id, public_url, thumbnail_url, file_path, mime_type, file_size_bytes}`

### GET `/transactions/{id}/receipt` (Existing pattern — add receipt reference)
### GET `/group-expenses/{id}/receipt`

Add `receipt_url` to existing transaction/expense response schemas via JOIN or subquery.

## Platform Implementation

### iOS — SwiftUI
1. **Camera Picker:** `UIImagePickerController` with `.camera` source
2. **Photo Library Picker:** `PHPickerViewController` (iOS 14+)
3. **Compression:** `jpegData(compressionQuality: 0.7)` — max 2MB
4. **Upload:** `NetworkService.uploadStorageObject()` with bucket `receipts`
5. **Display:** `AsyncImage` in transaction row, full-screen on tap
6. **UI:** Camera icon button next to amount field on transaction add/edit sheet

### Android — Jetpack Compose
1. **Camera:** `ActivityResultContracts.TakePicture()` with temp URI
2. **Gallery:** `ActivityResultContracts.GetContent("image/*")`
3. **Compression:** `Bitmap.compress(Bitmap.CompressFormat.JPEG, 70, outputStream)` — max 2MB
4. **Upload:** `MomentraApi.kt` — new `@Multipart @POST("storage/upload/receipt")` endpoint using `@Part MultipartBody.Part`
5. **Display:** `Coil` `AsyncImage` in ledger rows, `Dialog` on tap
6. **UI:** Paperclip/camera icon on `QuickAddCard` and transaction detail screen

### Web — React/Next.js
1. **Capture:** `<input type="file" accept="image/*" capture="environment">` for mobile
2. **Drop area:** Drag-and-drop on desktop
3. **Compression:** `canvas.toBlob()` — client-side JPEG compression at 0.7 quality
4. **Upload:** `fetch('/storage/upload/receipt', { method: 'POST', body: formData })`
5. **Display:** `<img>` with lightbox on click
6. **UI:** Camera paperclip icon next to description field in add-expense form

## Image Specs
| Property | Value |
|----------|-------|
| Max dimension | 2048px (longest side) |
| Max file size | 2 MB |
| Format | JPEG |
| Thumbnail | 200px square center-crop |
| Storage path | `receipts/{user_id}/{uuid}.jpg` |

## Edge Cases
- **No camera permission** → Gracefully fall back to photo library
- **Large file rejection** → Client-side compression before upload
- **Offline** → Queue with local cache, upload later
- **Delete transaction** → Cascade delete receipts
- **Replace receipt** → Re-upload replaces existing (delete old from storage)
- **Expense has multiple receipts** → Receipts table supports multiple per transaction/expense

## Future (Not Now)
- OCR text extraction → auto-categorize amounts
- Receipt scanning ML model
- PDF receipts

---

## Work Order for Pipeline

### Coder Agent (qwen3-coder-next)
1. **Supabase migration** — `transaction_receipts` table + bucket config
2. **Backend** — `/storage/upload/receipt` endpoint + receipt CRUD
3. **iOS** — Picker + compression + upload + display
4. **Android** — Picker + compression + upload + display
5. **Web** — Client compression + upload + display

### Reviewer Agent (Gemini 2.5 Pro)
- Review all 5 changesets for correctness and consistency

### Debugger Agent (GPT-4.1)
- Fix any issues found during review
