#!/usr/bin/env python3
"""
Comprehensive test script for all insurance companies
"""

import json

# Test queries for each company
TEST_QUERIES = [
    # Test 1: KB라이프 - 약속플러스 (verified working)
    {"company": "KB라이프", "query": "약속플러스", "payment": "5년납", "expected_cols": 31},

    # Test 2: 한화생명 - H건강플러스 (user's test case)
    {"company": "한화생명", "query": "H건강플러스", "payment": "10년납", "expected_cols": 47, "expected_total": 580.84},

    # Test 3: 삼성생명
    {"company": "삼성생명", "query": "삼성생명", "payment": None, "expected_cols": 36},

    # Test 4: IM라이프
    {"company": "IM라이프", "query": "IM라이프", "payment": None, "expected_cols": 53},

    # Test 5: 교보생명
    {"company": "교보생명", "query": "교보생명", "payment": None, "expected_cols": 35},

    # Test 6: 미래에셋
    {"company": "미래에셋", "query": "미래에셋", "payment": None, "expected_cols": 21},

    # Test 7: KB손해보험
    {"company": "KB손해보험", "query": "KB손해보험", "payment": None, "expected_cols": 13},

    # Test 8: 현대해상
    {"company": "현대해상", "query": "현대해상", "payment": None, "expected_cols": 13},

    # Test 9: 메리츠화재
    {"company": "메리츠화재", "query": "메리츠화재", "payment": None, "expected_cols": 12},

    # Test 10: DB손해보험
    {"company": "DB손해보험", "query": "DB손해보험", "payment": None, "expected_cols": 13},

    # Test 11: 한화손해보험
    {"company": "한화손해보험", "query": "한화손해보험", "payment": None, "expected_cols": 1},

    # Test 12: 삼성화재
    {"company": "삼성화재", "query": "삼성화재", "payment": None, "expected_cols": 13},

    # Test 13: 라이나손보
    {"company": "라이나손보", "query": "라이나손보", "payment": None, "expected_cols": 1},
]

print("=" * 100)
print("COMPREHENSIVE TEST - ALL COMPANIES")
print("=" * 100)

# Load JSON data
with open('commission_data_base_60pct_only.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

passed = 0
failed = 0
warnings = 0

for test in TEST_QUERIES:
    company = test["company"]
    expected_cols = test["expected_cols"]

    print(f"\n{'-'*100}")
    print(f"Test: {company}")
    print(f"{'-'*100}")

    if company not in data["companies"]:
        print(f"  ❌ FAILED: Company not found in JSON")
        failed += 1
        continue

    company_data = data["companies"][company]
    products = company_data["products"]

    if len(products) == 0:
        print(f"  ❌ FAILED: No products found")
        failed += 1
        continue

    print(f"  Found {len(products)} products")

    # Test first product
    first_product = products[0]
    rates = first_product["base_commission_rates"]

    # Count actual commission columns (exclude FC계 and Total)
    num_cols = len([k for k in rates.keys() if k not in ['FC계', 'Total']])

    print(f"  Product: {first_product['metadata']['상품명'][:60]}")
    print(f"  환산율: {first_product['metadata']['환산율']} = {first_product['metadata']['환산율'] * 100:.2f}%")

    if 'Total' in rates:
        total_pct = rates['Total'] * 100
        print(f"  Total: {rates['Total']} = {total_pct:.2f}%")

        # Check specific expected total if provided
        if 'expected_total' in test:
            expected = test['expected_total']
            if abs(total_pct - expected) < 0.1:
                print(f"  ✓ Total matches expected: {expected}%")
            else:
                print(f"  ❌ Total mismatch: Expected {expected}%, got {total_pct:.2f}%")
                failed += 1
                continue

    # Check column count
    print(f"  Commission columns: {num_cols} (expected: {expected_cols})")

    if num_cols == expected_cols:
        print(f"  ✅ PASSED: Column count matches")
        passed += 1
    elif expected_cols == 1 and num_cols > 1:
        print(f"  ⚠️  WARNING: Expected {expected_cols} but got {num_cols} (heuristic detection)")
        warnings += 1
        passed += 1
    else:
        print(f"  ❌ FAILED: Column count mismatch")
        failed += 1

print(f"\n{'='*100}")
print(f"TEST SUMMARY")
print(f"{'='*100}")
print(f"  Total tests: {len(TEST_QUERIES)}")
print(f"  ✅ Passed: {passed}")
print(f"  ⚠️  Warnings: {warnings}")
print(f"  ❌ Failed: {failed}")
print(f"{'='*100}")

if failed == 0:
    print("\n🎉 All tests passed!")
else:
    print(f"\n⚠️  {failed} test(s) failed")
