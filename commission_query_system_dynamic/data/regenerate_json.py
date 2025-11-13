#!/usr/bin/env python3
"""
Regenerate commission JSON from Excel file - V3 with DYNAMIC column detection
Each sheet is analyzed independently to find the correct FC계 column
"""

import pandas as pd
import json
from pathlib import Path

def col_name(idx):
    """Convert column index to Excel column name"""
    if idx < 26:
        return chr(65 + idx)
    first = (idx - 26) // 26
    second = (idx - 26) % 26
    return chr(65 + first) + chr(65 + second)

def find_fc_columns(df, company):
    """Dynamically find FC start and end columns for a company"""
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
                    break
        if fc_start:
            break

    if fc_start is None:
        return None

    # Method 1: Look for FC계
    fc_end = None
    for col_idx in range(fc_start, min(fc_start + 60, df.shape[1])):
        for row_idx in [7, 8, 9, 10]:
            if row_idx < len(df) and col_idx < len(df.iloc[row_idx]):
                val = str(df.iloc[row_idx, col_idx]) if pd.notna(df.iloc[row_idx, col_idx]) else ''
                if 'FC계' == val or 'FC 계' == val:
                    fc_end = col_idx
                    break
        if fc_end:
            break

    # Method 2: If no FC계, analyze data pattern
    if fc_end is None:
        # Find first product rows
        data_start_rows = []
        for idx in range(10, 25):
            if idx < len(df):
                col_a = df.iloc[idx, 0]
                col_b = df.iloc[idx, 1] if df.shape[1] > 1 else None

                if pd.notna(col_a) and isinstance(col_a, str) and len(col_a) > 3:
                    if '합계' not in col_a and '상품명' not in col_a:
                        data_start_rows.append(idx)
                elif pd.notna(col_b) and isinstance(col_b, str) and len(col_b) > 3:
                    if '합계' not in col_b and '상품명' not in col_b:
                        data_start_rows.append(idx)

                if len(data_start_rows) >= 5:
                    break

        if data_start_rows:
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
                from collections import Counter
                fc_end = Counter(last_numeric_cols).most_common(1)[0][0]

    if fc_end:
        num_cols = fc_end - fc_start + 1
        return {
            'fc_start': fc_start,
            'fc_end': fc_end,
            'num_cols': num_cols
        }

    return None

# Configuration for each sheet (product, payment, rate columns)
SHEET_CONFIG = {
    'KB라이프': {'data_start_row': 12, 'product_col': 0, 'payment_col': 1, 'rate_col': 4},
    '미래에셋': {'data_start_row': 12, 'product_col': 1, 'payment_col': 3, 'rate_col': 4},
    '삼성생명': {'data_start_row': 12, 'product_col': 1, 'payment_col': 2, 'rate_col': 3},
    'IM라이프': {'data_start_row': 21, 'product_col': 1, 'payment_col': 2, 'rate_col': 3},
    '교보생명': {'data_start_row': 12, 'product_col': 0, 'payment_col': 1, 'rate_col': 4},
    '한화생명': {'data_start_row': 13, 'product_col': 1, 'payment_col': 4, 'rate_col': 6},
    'KB손해보험': {'data_start_row': 16, 'product_col': 1, 'payment_col': 3, 'rate_col': 5},
    '현대해상': {'data_start_row': 12, 'product_col': 0, 'payment_col': 4, 'rate_col': 5},
    '메리츠화재': {'data_start_row': 12, 'product_col': 0, 'payment_col': 2, 'rate_col': 4},
    'DB손해보험': {'data_start_row': 20, 'product_col': 0, 'payment_col': 2, 'rate_col': 4},
    '한화손해보험': {'data_start_row': 12, 'product_col': 0, 'payment_col': 1, 'rate_col': 3},
    '삼성화재': {'data_start_row': 12, 'product_col': 0, 'payment_col': 4, 'rate_col': 5},
    '라이나손보': {'data_start_row': 12, 'product_col': 0, 'payment_col': 3, 'rate_col': 5},
}

def regenerate_commission_json():
    xlsx_path = "file.xlsx"
    output_json = "commission_data_base_60pct_only.json"
    metadata_json = "commission_metadata_index.json"

    print("==" * 40)
    print("REGENERATING COMMISSION JSON - V3 DYNAMIC COLUMN DETECTION")
    print("==" * 40)

    xl_file = pd.ExcelFile(xlsx_path)
    print(f"\nFound {len(xl_file.sheet_names)} sheets")

    commission_data = {
        "metadata": {
            "source_file": "file.xlsx",
            "base_percentage": 60,
            "description": "Commission data at 60% base rate (FC 수수료 columns - dynamically detected)"
        },
        "companies": {}
    }

    metadata_index = {
        "metadata": {
            "total_products": 0,
            "total_companies": 0
        },
        "companies": {},
        "products": []
    }

    company_sheets = [s for s in xl_file.sheet_names if s != 'FC 합계']

    for company in company_sheets:
        print(f"\n{'--'*40}")
        print(f"Processing: {company}")
        print(f"{'--'*40}")

        config = SHEET_CONFIG.get(company)
        if not config:
            print(f"  ⚠️  No configuration found, skipping")
            continue

        df = pd.read_excel(xlsx_path, sheet_name=company, header=None)

        # Dynamically find FC columns
        fc_info = find_fc_columns(df, company)
        if not fc_info:
            print(f"  ⚠️  Could not find FC columns, skipping")
            continue

        fc_col_start = fc_info['fc_start']
        fc_col_end = fc_info['fc_end']
        num_fc_cols = fc_info['num_cols']

        data_start_row = config['data_start_row'] - 1
        product_col = config['product_col']
        payment_col = config['payment_col']
        rate_col = config['rate_col']

        print(f"  Data starts at row: {config['data_start_row']}")
        print(f"  Product col: {col_name(product_col)}, Payment col: {col_name(payment_col)}, Rate col: {col_name(rate_col)}")
        print(f"  FC columns: {col_name(fc_col_start)} to {col_name(fc_col_end)} ({num_fc_cols} columns)")

        products = []
        for row_idx in range(data_start_row, len(df)):
            product_name = df.iloc[row_idx, product_col]

            if pd.isna(product_name) or not isinstance(product_name, str) or len(product_name) < 3:
                continue

            if any(keyword in str(product_name).lower() for keyword in ['합계', 'subtotal', 'total', '소계', '상품명', '상품분류']):
                continue

            payment_period = df.iloc[row_idx, payment_col]
            conversion_rate = df.iloc[row_idx, rate_col]

            commission_rates = {}

            for col_idx in range(fc_col_start, fc_col_end + 1):
                if col_idx >= df.shape[1]:
                    break

                value = df.iloc[row_idx, col_idx]

                if pd.notna(value) and isinstance(value, (int, float)):
                    h8 = df.iloc[7, col_idx] if col_idx < len(df.iloc[7]) and pd.notna(df.iloc[7, col_idx]) else ''
                    h9 = df.iloc[8, col_idx] if col_idx < len(df.iloc[8]) and pd.notna(df.iloc[8, col_idx]) else ''
                    h10 = df.iloc[9, col_idx] if col_idx < len(df.iloc[9]) and pd.notna(df.iloc[9, col_idx]) else ''

                    key_parts = []

                    if col_idx == fc_col_start:
                        if '수수료' in str(h8):
                            key_parts.append("2025년 FC 수수료_0.6")

                    if h9 and str(h9).strip():
                        key_parts.append(str(h9).strip())
                    if h10 and str(h10).strip():
                        key_parts.append(str(h10).strip())

                    key = "_".join(key_parts) if key_parts else f"col_{col_idx}"

                    # FC계 is the last column
                    if col_idx == fc_col_end:
                        commission_rates["FC계"] = float(value)
                        commission_rates["Total"] = float(value)
                        key = "FC계"

                    commission_rates[key] = float(value)

            if commission_rates:
                product_data = {
                    "row_number": row_idx + 1,
                    "metadata": {
                        "상품명": product_name,
                        "납입기간": payment_period if pd.notna(payment_period) else "",
                        "환산율": float(conversion_rate) if pd.notna(conversion_rate) and isinstance(conversion_rate, (int, float)) else 0
                    },
                    "base_commission_rates": commission_rates
                }
                products.append(product_data)

                metadata_index["products"].append({
                    "product_name": product_name,
                    "product_name_normalized": product_name.lower().replace(" ", ""),
                    "payment_period": payment_period if pd.notna(payment_period) else "",
                    "payment_period_normalized": str(payment_period).lower().replace(" ", "") if pd.notna(payment_period) else "",
                    "company": company,
                    "row_number": row_idx + 1,
                    "keywords": product_name.lower().split(),
                    "metadata": {
                        "상품명": product_name,
                        "납입기간": payment_period if pd.notna(payment_period) else "",
                        "환산율": float(conversion_rate) if pd.notna(conversion_rate) and isinstance(conversion_rate, (int, float)) else 0
                    }
                })

        print(f"  Extracted {len(products)} products")

        if products:
            commission_data["companies"][company] = {
                "company_name": company,
                "products": products
            }

            metadata_index["companies"][company] = {
                "product_count": len(products),
                "sheet_name": company,
                "fc_columns": num_fc_cols
            }

    metadata_index["metadata"]["total_companies"] = len(commission_data["companies"])
    metadata_index["metadata"]["total_products"] = len(metadata_index["products"])

    print("\n" + "==" * 40)
    print("Saving JSON files...")

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(commission_data, f, ensure_ascii=False, indent=2)
    print(f"✅ Commission data saved to: {output_json}")

    with open(metadata_json, 'w', encoding='utf-8') as f:
        json.dump(metadata_index, f, ensure_ascii=False, indent=2)
    print(f"✅ Metadata index saved to: {metadata_json}")

    print(f"\nTotal companies: {metadata_index['metadata']['total_companies']}")
    print(f"Total products: {metadata_index['metadata']['total_products']}")
    print("==" * 40)

if __name__ == "__main__":
    regenerate_commission_json()
