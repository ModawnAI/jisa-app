#!/usr/bin/env python3
"""
Analyze FC columns for each company to determine correct column ranges
"""

import pandas as pd
import json

xl_file = pd.ExcelFile('file.xlsx')
company_sheets = [s for s in xl_file.sheet_names if s != 'FC 합계']

def col_name(idx):
    """Convert column index to Excel column name"""
    if idx < 26:
        return chr(65 + idx)
    first = (idx - 26) // 26
    second = (idx - 26) % 26
    return chr(65 + first) + chr(65 + second)

print("=" * 120)
print("COMPREHENSIVE ANALYSIS OF FC COLUMNS FOR EACH COMPANY")
print("=" * 120)

results = {}

for company in company_sheets:
    df = pd.read_excel('file.xlsx', sheet_name=company, header=None)

    print(f"\n{'-'*120}")
    print(f"{company}")
    print(f"{'-'*120}")

    # Find rate column (0.6 or 0.65)
    fc_start = None
    rate = None

    for col_idx in range(20):
        for row_idx in [7, 8]:
            if row_idx < len(df) and col_idx < len(df.iloc[row_idx]):
                val = str(df.iloc[row_idx, col_idx]) if pd.notna(df.iloc[row_idx, col_idx]) else ''
                if val in ['0.6', '0.65']:
                    fc_start = col_idx
                    rate = val
                    print(f"  Rate {rate} found at: {col_name(col_idx)} (idx {col_idx})")
                    break
        if fc_start:
            break

    if fc_start is None:
        print(f"  ⚠️  Could not find rate column")
        continue

    # Method 1: Look for FC계
    fc_gye_col = None
    for col_idx in range(fc_start, min(fc_start + 60, df.shape[1])):
        for row_idx in [7, 8, 9, 10]:
            if row_idx < len(df) and col_idx < len(df.iloc[row_idx]):
                val = str(df.iloc[row_idx, col_idx]) if pd.notna(df.iloc[row_idx, col_idx]) else ''
                if 'FC계' == val or 'FC 계' == val:
                    fc_gye_col = col_idx
                    print(f"  FC계 found at: {col_name(col_idx)} (idx {col_idx})")
                    break
        if fc_gye_col:
            break

    # Method 2: If no FC계, find where numeric data ends using first 5 product rows
    if fc_gye_col is None:
        print(f"  No FC계 found, analyzing data pattern...")

        # Find first product rows
        data_start_rows = []
        for idx in range(10, 25):  # Search rows 11-25
            if idx < len(df):
                col_a = df.iloc[idx, 0]
                col_b = df.iloc[idx, 1] if df.shape[1] > 1 else None

                # Check if this looks like a product row
                if pd.notna(col_a) and isinstance(col_a, str) and len(col_a) > 3:
                    if '합계' not in col_a and '상품명' not in col_a:
                        data_start_rows.append(idx)
                elif pd.notna(col_b) and isinstance(col_b, str) and len(col_b) > 3:
                    if '합계' not in col_b and '상품명' not in col_b:
                        data_start_rows.append(idx)

                if len(data_start_rows) >= 5:
                    break

        if data_start_rows:
            # Check where numeric values end across multiple rows
            last_numeric_cols = []

            for row_idx in data_start_rows[:5]:
                consecutive_empty = 0
                last_numeric = None

                for col_idx in range(fc_start, min(fc_start + 60, df.shape[1])):
                    val = df.iloc[row_idx, col_idx]

                    if pd.notna(val) and isinstance(val, (int, float)) and val != 0:
                        last_numeric = col_idx
                        consecutive_empty = 0
                    else:
                        consecutive_empty += 1
                        if consecutive_empty >= 3:
                            break

                if last_numeric:
                    last_numeric_cols.append(last_numeric)

            if last_numeric_cols:
                # Use the most common last column
                from collections import Counter
                most_common = Counter(last_numeric_cols).most_common(1)[0][0]
                fc_gye_col = most_common
                print(f"  Last numeric column (heuristic): {col_name(fc_gye_col)} (idx {fc_gye_col})")

    if fc_gye_col:
        num_cols = fc_gye_col - fc_start + 1
        results[company] = {
            'fc_start': fc_start,
            'fc_gye': fc_gye_col,
            'num_cols': num_cols,
            'rate': rate
        }
        print(f"  ✓ Range: {col_name(fc_start)} to {col_name(fc_gye_col)} = {num_cols} columns")
    else:
        print(f"  ⚠️  Could not determine column range")

print("\n" + "=" * 120)
print("FINAL SUMMARY")
print("=" * 120)

for company, data in sorted(results.items()):
    print(f"{company:25s}: {data['num_cols']:2d} columns  [{col_name(data['fc_start'])} to {col_name(data['fc_gye'])}]  (rate: {data['rate']})")

# Save to JSON for reference
with open('fc_column_analysis.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\n✓ Analysis saved to: fc_column_analysis.json")
