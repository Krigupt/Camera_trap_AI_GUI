# Sheet-Specific Tags Implementation

## Summary
Successfully implemented **sheet-specific tagging** system where tags are isolated per taxonomic level/sheet instead of being global across all sheets.

## What Changed

### 1. **Database Schema** (`src/models/ExcelData.ts`)
- Added `sheetSpecificImageTags` field: `{ [sheetName: string]: { [imagePath: string]: string[] } }`
- Kept `globalImageTags` as deprecated for backward compatibility
- Species classifications remain global (as intended)

**Structure:**
```typescript
sheetSpecificImageTags: {
  "class": {
    "IMG_0001.JPG": ["Blurry", "Low-light"],
    "IMG_0002.JPG": ["Body part"]
  },
  "order": {
    "IMG_0001.JPG": [], // No tags in order sheet
    "IMG_0003.JPG": ["Blends in"]
  },
  "species": {
    // ... tags specific to species sheet
  }
}
```

### 2. **API Routes** (`src/app/api/global-tags/route.ts`)

#### PUT Request
- Now requires: `filename`, `sheetName`, `imagePath`, `tags`
- Stores tags under the specific sheet name
- Updates all document instances with the same filename

#### GET Request
- Now requires: `filename`, `sheetName`
- Returns only tags for the requested sheet
- Response format: `{ sheetImageTags: { ... } }`

### 3. **Frontend Dashboard** (`src/app/dashboard/[id]/page.tsx`)

**Changes:**
- Renamed state: `globalImageTags` → `sheetImageTags`
- Renamed function: `fetchGlobalTags()` → `fetchSheetTags(filename, sheetName)`
- Tags now fetch when sheet is selected (not on initial load)
- All tag-related UI now uses sheet-specific tags
- Updated interface to include `sheetSpecificImageTags`

### 4. **Export API** (`src/app/api/export-tags/route.ts`)
- Updated to read from `sheetSpecificImageTags[sheetName]` instead of `globalImageTags`
- Each exported sheet now contains only tags specific to that taxonomic level

---

## How Tags Work Now

### **Tagging Behavior:**

1. **Tag an image in "Class" sheet:**
   - Tags: `["Blurry"]`
   - Stored in: `sheetSpecificImageTags.class.IMG_0001.JPG`
   - Visible in: **Class sheet only**

2. **View same image in "Order" sheet:**
   - Tags: `[]` (empty - clean slate)
   - Can add different tags independently

3. **Tag same image in "Order" sheet:**
   - Tags: `["Low-light", "Body part"]`
   - Stored in: `sheetSpecificImageTags.order.IMG_0001.JPG`
   - Does NOT affect Class sheet tags

### **Species Classification:**
- **Remains global** across all sheets (as intended)
- When you classify a species in any sheet, it appears in all sheets
- Updates both MongoDB and CSV data

---

## Testing Instructions

### **Test 1: Basic Sheet Isolation**

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Upload an Excel file with multiple taxonomic sheets

3. Select **"Class"** sheet

4. Select a row with images

5. Tag an image as **"Blurry"** and **"Low-light"**
   - ✅ Should see green tag icon with "2"

6. Switch to **"Order"** sheet

7. Find and select the SAME image
   - ✅ Should have NO tags (clean slate)
   - ✅ Green tag icon should NOT appear

8. Tag the same image as **"Body part"**
   - ✅ Should see green tag icon with "1"

9. Switch back to **"Class"** sheet
   - ✅ Should still see "Blurry" and "Low-light" tags
   - ✅ Should NOT see "Body part" tag

### **Test 2: Multiple Images in Same Sheet**

1. In "Class" sheet, select a row with multiple images

2. Tag first image as "Blurry"

3. Navigate to second image

4. Tag second image as "Low-light"

5. Switch back to first image
   - ✅ Should still only show "Blurry" tag
   - ✅ Count should show "1"

6. Navigate to second image
   - ✅ Should only show "Low-light" tag

### **Test 3: Species Classification (Global)**

1. In "Class" sheet, classify an image as "Coyote - Canis latrans"
   - ✅ Should see paw emoji (🐾)

2. Switch to "Order" sheet, find same image
   - ✅ Should still see paw emoji
   - ✅ Species dropdown should show "Coyote - Canis latrans" selected

3. Switch to "Species" sheet, find same image
   - ✅ Should still show the same species classification
   - ✅ This confirms species is global (as intended)

### **Test 4: Export Functionality**

1. Tag various images across different sheets:
   - Class sheet: Tag IMG_0001 as "Blurry"
   - Order sheet: Tag IMG_0001 as "Low-light"
   - Species sheet: Tag IMG_0002 as "Body part"

2. Click "Export Tagged Data"

3. Select "Tagged Excel Analysis"

4. Download and open the Excel file

5. Check each sheet:
   - ✅ Class sheet should show IMG_0001 under "Blurry" column only
   - ✅ Order sheet should show IMG_0001 under "Low-light" column only
   - ✅ Species sheet should show IMG_0002 under "Body part" column only

### **Test 5: Tag Persistence**

1. Tag an image in "Class" sheet

2. Refresh the browser

3. Select "Class" sheet again
   - ✅ Tags should persist

4. Switch to "Order" sheet
   - ✅ Should still have no tags for that image

---

## API Testing (Optional)

### Test with cURL:

**1. Add sheet-specific tags:**
```bash
curl -X PUT http://localhost:3000/api/global-tags \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test_data.xlsx",
    "sheetName": "class",
    "imagePath": "IMG_0001.JPG",
    "tags": ["Blurry", "Low-light"]
  }'
```

**2. Fetch sheet-specific tags:**
```bash
curl "http://localhost:3000/api/global-tags?filename=test_data.xlsx&sheetName=class"
```

**Expected Response:**
```json
{
  "sheetImageTags": {
    "IMG_0001.JPG": ["Blurry", "Low-light"]
  }
}
```

**3. Verify isolation - fetch different sheet:**
```bash
curl "http://localhost:3000/api/global-tags?filename=test_data.xlsx&sheetName=order"
```

**Expected Response:**
```json
{
  "sheetImageTags": {}
}
```

---

## Migration Notes

### **Existing Data:**
- Old `globalImageTags` field is kept for backward compatibility
- New system uses `sheetSpecificImageTags`
- No automatic migration needed - new tags will use new structure

### **If you want to migrate existing global tags:**

Run this script in MongoDB (optional):
```javascript
db.exceldatas.find({ globalImageTags: { $exists: true, $ne: {} } }).forEach(doc => {
  if (!doc.sheetSpecificImageTags) {
    doc.sheetSpecificImageTags = {};
  }
  
  // Copy global tags to all sheets for this document
  doc.sheetSpecificImageTags[doc.sheetName] = doc.globalImageTags;
  
  db.exceldatas.updateOne(
    { _id: doc._id },
    { $set: { sheetSpecificImageTags: doc.sheetSpecificImageTags } }
  );
});
```

---

## Files Modified

1. ✅ `src/models/ExcelData.ts` - Added sheet-specific schema
2. ✅ `src/app/api/global-tags/route.ts` - Updated API logic
3. ✅ `src/app/dashboard/[id]/page.tsx` - Updated frontend logic
4. ✅ `src/app/api/export-tags/route.ts` - Updated export logic

---

## Rollback Instructions (if needed)

If you need to revert to global tags:

1. Restore the following files from git:
   ```bash
   git checkout HEAD -- src/models/ExcelData.ts
   git checkout HEAD -- src/app/api/global-tags/route.ts
   git checkout HEAD -- src/app/dashboard/[id]/page.tsx
   git checkout HEAD -- src/app/api/export-tags/route.ts
   ```

2. Restart your development server

---

## Benefits of Sheet-Specific Tags

✅ **Granular Control:** Tag images differently for each taxonomic level  
✅ **No Conflicts:** Tags in one sheet don't affect others  
✅ **Flexibility:** Analyze image quality per taxonomic classification  
✅ **Organized:** Export files show tags specific to each sheet  
✅ **Species Still Global:** Species classification remains consistent across all sheets  

---

## Implementation Complete! 🎉

The tagging system now supports sheet-specific tags as requested. Each taxonomic level (Class, Order, Family, Genus, Species) maintains its own independent set of tags for images.

