#!/usr/bin/env python3
"""
Regenerate commission JSON from Excel file
ONLY extracts FC 수수료 (60%) columns (5-36)
"""

import pandas as pd
import json
from pathlib import Path

def regenerate_commission_json():
    xlsx_path = "file.xlsx"
    output_json = "commission_data_base_60pct_only.json"
    metadata_json = "commission_metadata_index.json"

    print("=" * 80)
    print("REGENERATING COMMISSION JSON FROM EXCEL")
    print("=" * 80)

    # Load Excel
    xl_file = pd.ExcelFile(xlsx_path)
    print(f"\nFound {len(xl_file.sheet_names)} sheets")

    # Structure to hold all data
    commission_data = {
        "metadata": {
            "source_file": "file.xlsx",
            "base_percentage": 60,
            "description": "Commission data at 60% base rate (FC 수수료 columns only)"
        },
        "companies": {}
    }

    # Metadata index for search
    metadata_index = {
        "metadata": {
            "total_products": 0,
            "total_companies": 0
        },
        "companies": {},
        "products": []
    }

    # Process each company sheet (skip 'FC 합계')
    company_sheets = [s for s in xl_file.sheet_names if s != 'FC 합계']

    for company in company_sheets:
        print(f"\nProcessing: {company}")

        df = pd.read_excel(xlsx_path, sheet_name=company, header=None)

        # Find data start row (typically row 12, index 11)
        # Special handling for 한화생명 where product names are in column B
        product_col = 0  # Column A by default
        data_start_row = None

        # Check if this is a special format sheet (like 한화생명)
        if company in ['한화생명', 'IM라이프', '삼성생명', 'KB손해보험', '미래에셋']:
            # For these sheets, check column B for product names
            for idx in range(10, 20):
                if idx < len(df):
                    col_b = df.iloc[idx, 1]  # Column B
                    if pd.notna(col_b) and isinstance(col_b, str) and len(col_b) > 10:
                        if '상품명' not in str(col_b) and company[:2] in str(col_b):
                            data_start_row = idx
                            product_col = 1  # Use column B
                            break
        else:
            # Standard format: product names in column A
            for idx in range(10, 15):
                if idx < len(df):
                    first_col = df.iloc[idx, 0]
                    if pd.notna(first_col) and isinstance(first_col, str) and len(first_col) > 5:
                        # Check it's not a header
                        if '상품명' not in str(first_col):
                            data_start_row = idx
                            break

        if data_start_row is None:
            print(f"  ⚠️ Could not find data start row, skipping")
            continue

        print(f"  Data starts at row: {data_start_row + 1}, product column: {chr(65 + product_col)}")

        # Extract products
        products = []
        for row_idx in range(data_start_row, len(df)):
            product_name = df.iloc[row_idx, 0]  # Column A

            # Skip if no product name
            if pd.isna(product_name) or not isinstance(product_name, str) or len(product_name) < 3:
                continue

            # Skip summary rows
            if any(keyword in str(product_name).lower() for keyword in ['합계', 'subtotal', 'total', '소계']):
                continue

            payment_period = df.iloc[row_idx, 1]  # Column B
            conversion_rate = df.iloc[row_idx, 4]  # Column E

            # Extract FC 수수료 (60%) values - ONLY columns 5-36
            commission_rates = {}

            for col_idx in range(5, 37):  # Columns F (5) to AJ (36)
                if col_idx >= df.shape[1]:
                    break

                value = df.iloc[row_idx, col_idx]

                if pd.notna(value) and isinstance(value, (int, float)):
                    # Build key from headers (rows 8, 9, 10)
                    h8 = df.iloc[7, col_idx] if col_idx < len(df.iloc[7]) and pd.notna(df.iloc[7, col_idx]) else ''
                    h9 = df.iloc[8, col_idx] if col_idx < len(df.iloc[8]) and pd.notna(df.iloc[8, col_idx]) else ''
                    h10 = df.iloc[9, col_idx] if col_idx < len(df.iloc[9]) and pd.notna(df.iloc[9, col_idx]) else ''

                    # Create unique key with section identifier
                    key_parts = []

                    # Add "2025년 FC 수수료_0.6_" prefix for first column
                    if col_idx == 5:
                        key_parts.append("2025년 FC 수수료_0.6")

                    if h9 and str(h9).strip():
                        key_parts.append(str(h9).strip())
                    if h10 and str(h10).strip():
                        key_parts.append(str(h10).strip())

                    key = "_".join(key_parts) if key_parts else f"col_{col_idx}"

                    # Special handling for FC계
                    if col_idx == 35:
                        key = "FC계"

                    # Add Total for the FC계 value
                    if col_idx == 35:
                        commission_rates["Total"] = float(value)

                    commission_rates[key] = float(value)

            # Only add if we have commission data
            if commission_rates:
                product_data = {
                    "row_number": row_idx + 1,  # 1-indexed for Excel
                    "metadata": {
                        "상품명": product_name,
                        "납입기간": payment_period if pd.notna(payment_period) else "",
                        "환산율": float(conversion_rate) if pd.notna(conversion_rate) and isinstance(conversion_rate, (int, float)) else 0
                    },
                    "base_commission_rates": commission_rates
                }
                products.append(product_data)

                # Add to metadata index
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

        commission_data["companies"][company] = {
            "company_name": company,
            "products": products
        }

        metadata_index["companies"][company] = {
            "product_count": len(products)
        }

    # Update metadata counts
    metadata_index["metadata"]["total_companies"] = len(commission_data["companies"])
    metadata_index["metadata"]["total_products"] = sum(len(c["products"]) for c in commission_data["companies"].values())

    # Save commission data JSON
    print(f"\n{'='*80}")
    print("Saving JSON files...")

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(commission_data, f, ensure_ascii=False, indent=2)
    print(f"✅ Commission data saved to: {output_json}")

    # Save metadata index
    with open(metadata_json, 'w', encoding='utf-8') as f:
        json.dump(metadata_index, f, ensure_ascii=False, indent=2)
    print(f"✅ Metadata index saved to: {metadata_json}")

    print(f"\nTotal companies: {len(commission_data['companies'])}")
    print(f"Total products: {sum(len(c['products']) for c in commission_data['companies'].values())}")
    print(f"{'='*80}")

    # Verify KB 약속플러스 5년납
    print("\n" + "=" * 80)
    print("VERIFICATION: KB 약속플러스 5년납")
    print("=" * 80)

    kb_life = commission_data["companies"]["KB라이프"]
    for product in kb_life["products"]:
        if "약속플러스" in product["metadata"]["상품명"] and product["metadata"]["납입기간"] == "5년납":
            rates = product["base_commission_rates"]
            print(f"✓ Found product: {product['metadata']['상품명'][:60]}")
            print(f"  환산율: {product['metadata']['환산율']}")
            print(f"  초년도 익월: {rates.get('2025년 FC 수수료_0.6_초년도_익월', 'NOT FOUND')}")
            print(f"  2차년도 13회차: {rates.get('2차년도_13회차', 'NOT FOUND')}")
            print(f"  FC계: {rates.get('FC계', 'NOT FOUND')}")
            print(f"  Total: {rates.get('Total', 'NOT FOUND')}")

            # Expected values
            print(f"\n  Expected (from Excel):")
            print(f"    초년도 익월: 1.76346")
            print(f"    2차년도 13회차: 0.62856")
            print(f"    FC계 = Total: 2.91582")
            break

if __name__ == "__main__":
    regenerate_commission_json()
