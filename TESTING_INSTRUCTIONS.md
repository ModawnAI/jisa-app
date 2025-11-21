# Employee Code Testing Instructions

## Issue Resolved

✅ **Fixed**: Employee codes (format `EMP-XXXXX-XXX`) now work in KakaoTalk login.

### What Was Wrong
The KakaoTalk chat API regex pattern only matched admin codes like `ABC-DEF-GHI-JKL`, but not employee codes like `EMP-00124-673`.

### What Was Fixed
Updated the regex pattern in `app/api/kakao/chat/route.ts` to recognize both formats:
```typescript
// OLD: Only matched ABC-DEF-GHI-JKL
const codePattern = /([A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3})/;

// NEW: Matches both EMP-00124-673 AND ABC-DEF-GHI-JKL
const codePattern = /([A-Z]{3,4}-[A-Z0-9]{3,5}-[A-Z0-9]{3,5}(?:-[A-Z0-9]{3,5})?)/;
```

## Test Code Ready

✅ **Code**: `EMP-00137-C7B`
- Employee: J00137 (정다운)
- Status: Active and unused
- Namespace: `employee_J00137`
- Vectors: 5
- Expires: 2026-11-21

## How to Test

### Step 1: Open KakaoTalk
1. Open KakaoTalk app on your phone
2. Search for "JISA" channel
3. Add the JISA channel

### Step 2: Enter Code
Type the employee code exactly as shown:
```
EMP-00137-C7B
```

### Step 3: Expected Response
The bot should respond with:
```
✅ 인증이 완료되었습니다!

환영합니다, 정다운님!

이제 AI 챗봇을 사용하실 수 있습니다.
궁금한 내용을 자유롭게 질문해주세요.
```

### Step 4: Test a Query
After successful registration, try asking a question related to employee data:
```
내 수수료 정보 알려줘
```

The bot should query your employee namespace (`employee_J00137`) and return relevant information.

## Troubleshooting

### If Login Fails

1. **Check PM2 Status**
   ```bash
   pm2 list
   pm2 logs jisa-app --lines 50
   ```

2. **Verify Code in Database**
   ```bash
   npx tsx scripts/test-specific-code.ts
   ```

3. **Check Code Pattern Recognition**
   ```bash
   npx tsx scripts/test-kakao-code-verification.ts
   ```

4. **Reset Code if Already Used**
   ```bash
   npx tsx scripts/reset-employee-code.ts EMP-00137-C7B
   ```

### Common Issues

**Issue**: "유효하지 않은 인증 코드입니다"
- **Cause**: Code pattern not matching
- **Status**: ✅ FIXED (regex updated)

**Issue**: "이미 사용된 인증 코드입니다"
- **Cause**: Code was already used once
- **Solution**: Run reset script above

**Issue**: "만료된 인증 코드입니다"
- **Cause**: Code expired (not the case here, valid until 2026)
- **Solution**: Generate new code

## Available Test Codes

All 52 employee codes are available. Here are a few unused ones you can test with:

```
EMP-00137-C7B  ← Reset and ready to test
EMP-00124-673  ← Employee J00124 (김기현)
EMP-00127-LP5  ← Employee J00127 (김진성)
EMP-00128-H4F  ← Employee J00128 (박현권)
```

To check status of any code:
```bash
npx tsx scripts/check-verification-codes.ts
```

## System Status

✅ **Database**: All 52 employee codes stored correctly
✅ **Pattern Matching**: Updated to recognize employee code format
✅ **PM2**: Restarted with latest changes
✅ **Test Code**: EMP-00137-C7B reset and ready
✅ **Credentials**: Linked to employee_J00137 namespace with 5 vectors

## After Testing

If the test is successful:
1. The code will be marked as "used" in the database
2. A profile will be created for the KakaoTalk user
3. The profile will be linked to `employee_J00137` namespace
4. User can start querying their employee-specific data

To test again with the same code:
```bash
npx tsx scripts/reset-employee-code.ts EMP-00137-C7B
```

## Support Commands

The user can also use these commands in KakaoTalk:

**Delete Account**:
```
/delete
```
or
```
/삭제
```

This will remove their profile and allow them to register again with a new code.

---

**Last Updated**: 2025-11-21
**Status**: ✅ Ready for Testing
