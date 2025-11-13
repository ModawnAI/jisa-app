#!/usr/bin/env python3
"""
Regenerate commission JSON from Excel file - V2 with per-sheet configuration
ONLY extracts FC 수수료 (60%) columns (5-36)
"""

import pandas as pd
import json
from pathlib import Path

# Configuration for each sheet
# fc_col_start: Where "2025년 FC 수수료 0.6" column begins (0-indexed)
# rate_col: Where "환산율" is located (0-indexed)
SHEET_CONFIG = {
    'KB라이프': {'data_start_row': 12, 'product_col': 0, 'payment_col': 1, 'rate_col': 4, 'fc_col_start': 5},
    '미래에셋': {'data_start_row': 12, 'product_col': 1, 'payment_col': 3, 'rate_col': 4, 'fc_col_start': 5},
    '삼성생명': {'data_start_row': 12, 'product_col': 1, 'payment_col': 2, 'rate_col': 3, 'fc_col_start': 4},
    'IM라이프': {'data_start_row': 21, 'product_col': 1, 'payment_col': 2, 'rate_col': 3, 'fc_col_start': 4},
    '교보생명': {'data_start_row': 12, 'product_col': 0, 'payment_col': 1, 'rate_col': 4, 'fc_col_start': 6},
    '한화생명': {'data_start_row': 13, 'product_col': 1, 'payment_col': 4, 'rate_col': 6, 'fc_col_start': 7},  # !!
    'KB손해보험': {'data_start_row': 16, 'product_col': 1, 'payment_col': 3, 'rate_col': 5, 'fc_col_start': 6},
    '현대해상': {'data_start_row': 12, 'product_col': 0, 'payment_col': 4, 'rate_col': 5, 'fc_col_start': 6},
    '메리츠화재': {'data_start_row': 12, 'product_col': 0, 'payment_col': 2, 'rate_col': 4, 'fc_col_start': 5},
    'DB손해보험': {'data_start_row': 20, 'product_col': 0, 'payment_col': 2, 'rate_col': 4, 'fc_col_start': 6},
    '한화손해보험': {'data_start_row': 12, 'product_col': 0, 'payment_col': 1, 'rate_col': 3, 'fc_col_start': 4},
    '삼성화재': {'data_start_row': 12, 'product_col': 0, 'payment_col': 4, 'rate_col': 5, 'fc_col_start': 7},  # !!
    '라이나손보': {'data_start_row': 12, 'product_col': 0, 'payment_col': 3, 'rate_col': 5, 'fc_col_start': 6},
}

def regenerate_commission_json():
    xlsx_path = "file.xlsx"
    output_json = "commission_data_base_60pct_only.json"
    metadata_json = "commission_metadata_index.json"

    print("=" * 80)
    print("REGENERATING COMMISSION JSON FROM EXCEL - V2")
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

        # Get configuration for this sheet
        config = SHEET_CONFIG.get(company)
        if not config:
            print(f"  ⚠️  No configuration found, skipping")
            continue

        df = pd.read_excel(xlsx_path, sheet_name=company, header=None)

        data_start_row = config['data_start_row'] - 1  # Convert to 0-indexed
        product_col = config['product_col']
        payment_col = config['payment_col']
        rate_col = config['rate_col']
        fc_col_start = config['fc_col_start']

        print(f"  Data starts at row: {config['data_start_row']}")
        print(f"  Product column: {chr(65 + product_col)}, Payment column: {chr(65 + payment_col)}")
        print(f"  Rate column: {chr(65 + rate_col)}, FC 수수료 starts at: {chr(65 + fc_col_start)}")

        # Extract products
        products = []
        for row_idx in range(data_start_row, len(df)):
            product_name = df.iloc[row_idx, product_col]  # Configured column

            # Skip if no product name
            if pd.isna(product_name) or not isinstance(product_name, str) or len(product_name) < 3:
                continue

            # Skip summary rows and headers
            if any(keyword in str(product_name).lower() for keyword in ['합계', 'subtotal', 'total', '소계', '상품명', '상품분류']):
                continue

            payment_period = df.iloc[row_idx, payment_col]  # Configured column
            conversion_rate = df.iloc[row_idx, rate_col]  # Configured column

            # Extract FC 수수료 (60%) values - 32 columns starting from fc_col_start
            commission_rates = {}

            for col_idx in range(fc_col_start, fc_col_start + 32):  # 32 columns of commission data
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
                    if col_idx == fc_col_start:
                        key_parts.append("2025년 FC 수수료_0.6")

                    if h9 and str(h9).strip():
                        key_parts.append(str(h9).strip())
                    if h10 and str(h10).strip():
                        key_parts.append(str(h10).strip())

                    key = "_".join(key_parts) if key_parts else f"col_{col_idx}"

                    # Special handling for FC계 (last column of 32)
                    if col_idx == fc_col_start + 31:
                        key = "FC계"

                    # Add Total for the FC계 value
                    if col_idx == fc_col_start + 31:
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

        # Add company data
        if products:
            commission_data["companies"][company] = {
                "company_name": company,
                "products": products
            }

            metadata_index["companies"][company] = {
                "product_count": len(products),
                "sheet_name": company
            }

    # Update totals
    metadata_index["metadata"]["total_companies"] = len(commission_data["companies"])
    metadata_index["metadata"]["total_products"] = len(metadata_index["products"])

    # Save JSON files
    print("\n" + "=" * 80)
    print("Saving JSON files...")

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(commission_data, f, ensure_ascii=False, indent=2)
    print(f"✅ Commission data saved to: {output_json}")

    with open(metadata_json, 'w', encoding='utf-8') as f:
        json.dump(metadata_index, f, ensure_ascii=False, indent=2)
    print(f"✅ Metadata index saved to: {metadata_json}")

    print(f"\nTotal companies: {metadata_index['metadata']['total_companies']}")
    print(f"Total products: {metadata_index['metadata']['total_products']}")
    print("=" * 80)

    # Verification: Check KB 약속플러스
    print("\n" + "=" * 80)
    print("VERIFICATION: KB 약속플러스 5년납")
    print("=" * 80)

    kb_products = commission_data["companies"].get("KB라이프", {}).get("products", [])
    for product in kb_products:
        if "약속플러스" in product["metadata"]["상품명"] and product["metadata"]["납입기간"] == "5년납":
            print(f"✓ Found product: {product['metadata']['상품명']}")
            print(f"  환산율: {product['metadata']['환산율']}")
            rates = product["base_commission_rates"]
            print(f"  초년도 익월: {rates.get('2025년 FC 수수료_0.6_초년도_익월', 'N/A')}")
            print(f"  2차년도 13회차: {rates.get('2차년도_13회차', 'N/A')}")
            print(f"  FC계: {rates.get('FC계', 'N/A')}")
            print(f"  Total: {rates.get('Total', 'N/A')}")
            print(f"\n  Expected (from Excel):")
            print(f"    초년도 익월: 1.76346")
            print(f"    2차년도 13회차: 0.62856")
            print(f"    FC계 = Total: 2.91582")
            break

if __name__ == "__main__":
    regenerate_commission_json()
