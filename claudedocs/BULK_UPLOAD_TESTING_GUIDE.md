# Bulk Employee Upload - Testing Guide

**Database:** kuixphvkbuuzfezoeyii
**Date:** November 17, 2025
**Feature:** Phase 1 - Bulk Employee Upload System

## 🎯 Testing Objectives

1. Verify CSV upload UI works correctly
2. Validate file upload and parsing
3. Test validation error handling
4. Confirm database insertion
5. Verify UI feedback and refresh

## 📋 Pre-Test Checklist

- [ ] Development server running on http://localhost:3000
- [ ] Admin user logged in
- [ ] Database accessible (kuixphvkbuuzfezoeyii)
- [ ] CSV template available at `/public/templates/employee-upload-template.csv`

## 🧪 Test Scenarios

### Test 1: Template Download
**Steps:**
1. Navigate to http://localhost:3000/admin/credentials
2. Click "Bulk Upload Employees" to expand section
3. Click "📥 Download Template" button

**Expected Results:**
- ✅ File downloads as `employee-upload-template.csv`
- ✅ File contains 4 sample employees with Korean names
- ✅ Headers: full_name, email, employee_id, department, position, tier, role, phone_number, team, hire_date, location

### Test 2: Valid CSV Upload (Drag & Drop)
**Steps:**
1. Expand "Bulk Upload Employees" section
2. Drag the downloaded template file to the upload area
3. Verify file appears with green checkmark
4. Click "Upload Employees" button
5. Wait for upload to complete

**Expected Results:**
- ✅ Upload shows spinning loader during processing
- ✅ Success message appears in green box
- ✅ Summary shows: "Successfully uploaded 4 employees"
- ✅ Stats: Total rows: 4, Inserted: 4, Invalid: 0
- ✅ List of 4 uploaded employees displayed with tiers
- ✅ Credentials table refreshes automatically
- ✅ Stats cards update with new counts
- ✅ File is cleared from upload area

### Test 3: Valid CSV Upload (Click to Upload)
**Steps:**
1. Expand "Bulk Upload Employees" section
2. Click "Click to upload" link
3. Select the CSV template from file browser
4. Click "Upload Employees" button

**Expected Results:**
- Same as Test 2

### Test 4: Invalid File Type
**Steps:**
1. Try to upload a .txt or .xlsx file

**Expected Results:**
- ✅ Alert: "Please upload a CSV file"
- ✅ File is not accepted
- ✅ Upload area remains empty

### Test 5: Duplicate Employee ID
**Steps:**
1. Edit the template CSV to have duplicate employee_id values
2. Upload the modified CSV

**Expected Results:**
- ✅ Error message in red box
- ✅ Error: "Duplicate employee detected"
- ✅ Details: "One or more employee IDs or emails already exist"
- ✅ Hint: "Check for duplicate employee_id or email values"

### Test 6: Missing Required Fields
**Steps:**
1. Create CSV with missing `full_name` or `employee_id`
2. Upload the file

**Expected Results:**
- ✅ Error message in red box
- ✅ Validation errors listed by row number
- ✅ Example: "Row 2: Full name is required (full_name)"

### Test 7: Invalid Tier Value
**Steps:**
1. Edit CSV to have tier = "invalid" or "premium"
2. Upload the file

**Expected Results:**
- ✅ Validation error shown
- ✅ Message: "Invalid tier \"invalid\". Must be one of: free, basic, pro, enterprise"
- ✅ Row number indicated

### Test 8: Invalid Role Value
**Steps:**
1. Edit CSV to have role = "invalid" or "director"
2. Upload the file

**Expected Results:**
- ✅ Validation error shown
- ✅ Message: "Invalid role \"invalid\". Must be one of: user, junior, senior, manager, admin, ceo"
- ✅ Row number indicated

### Test 9: Invalid Email Format
**Steps:**
1. Edit CSV to have email = "notanemail" (without @)
2. Upload the file

**Expected Results:**
- ✅ Validation error shown
- ✅ Message: "Invalid email format"
- ✅ Row number indicated

### Test 10: Partial Success (Mixed Valid/Invalid)
**Steps:**
1. Create CSV with 2 valid rows and 2 invalid rows
2. Upload the file

**Expected Results:**
- ✅ Success message appears
- ✅ Summary shows: Total: 4, Inserted: 2, Invalid: 2
- ✅ List of 2 successfully uploaded employees
- ✅ "Validation Warnings" section shows 2 errors with row numbers
- ✅ Credentials table shows 2 new employees
- ✅ Stats cards update correctly

### Test 11: Empty CSV File
**Steps:**
1. Create CSV with only headers, no data rows
2. Upload the file

**Expected Results:**
- ✅ Error: "CSV file is empty or has no valid records"

### Test 12: Large CSV File
**Steps:**
1. Create CSV with 50+ employees
2. Upload the file

**Expected Results:**
- ✅ All employees processed
- ✅ Upload takes longer (loading indicator shows)
- ✅ Success message with correct count
- ✅ Pagination works in credentials table

## 🔍 Database Verification

After each successful upload, verify in Supabase:

```sql
-- Check uploaded credentials
SELECT
  full_name,
  employee_id,
  status,
  metadata->>'tier' as tier,
  metadata->>'role' as role,
  metadata->>'bulk_upload' as bulk_upload,
  created_at
FROM user_credentials
WHERE metadata->>'bulk_upload' = 'true'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- ✅ All uploaded employees present
- ✅ status = 'pending'
- ✅ tier and role stored in metadata
- ✅ bulk_upload flag = true
- ✅ created_at timestamps correct

## 🐛 Known Issues

None currently identified.

## 📝 Test Results Log

### Run #1 - [Date]
**Tester:** [Name]
**Results:**
- [ ] Test 1: Template Download - PASS/FAIL
- [ ] Test 2: Valid Upload (Drag) - PASS/FAIL
- [ ] Test 3: Valid Upload (Click) - PASS/FAIL
- [ ] Test 4: Invalid File Type - PASS/FAIL
- [ ] Test 5: Duplicate Employee - PASS/FAIL
- [ ] Test 6: Missing Fields - PASS/FAIL
- [ ] Test 7: Invalid Tier - PASS/FAIL
- [ ] Test 8: Invalid Role - PASS/FAIL
- [ ] Test 9: Invalid Email - PASS/FAIL
- [ ] Test 10: Partial Success - PASS/FAIL
- [ ] Test 11: Empty CSV - PASS/FAIL
- [ ] Test 12: Large CSV - PASS/FAIL

**Notes:**
[Add any observations or issues encountered]

## ✅ Success Criteria

All tests must pass with:
- ✅ No UI errors or broken functionality
- ✅ Correct validation messages
- ✅ Accurate database insertion
- ✅ Proper error handling
- ✅ UI refreshes and updates correctly

## 🚀 Next Steps After Testing

1. Create auto-code generation API
2. Link codes to credentials
3. Test complete employee verification flow
