#!/usr/bin/env python3
"""
Ultra-Granular Upload for Hanwha November 2025 Document
Extracts EVERY cell from EVERY table with full metadata context.
Target: Hundreds of vectors for maximum query precision.

Extraction Strategy:
1. Each table cell becomes a separate vector with row/column context
2. Each product gets multiple vectors (one per commission type)
3. Full page summaries preserved
4. Text blocks chunked at sentence level
5. All headings with expanded context

Expected: 300-500+ vectors from 5 pages
"""

import os
import json
import glob
import re
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import OpenAI
from datetime import datetime
from typing import List, Dict, Any

load_dotenv()

# Initialize clients
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Constants
INDEX_NAME = "hof-branch-chatbot"
NAMESPACE = "hof-knowledge-base-max"  # Combined namespace
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072

# Document metadata
DOCUMENT_METADATA = {
    "document_title": "HO&F지사 11월 시책공지 - 한화생명 추가",
    "document_date": "2025-11-06",
    "company": "한화생명",
    "category": "insurance_commission_table",
    "sub_category": "promotion",
    "month": "2025-11",
    "is_promotion": True,
    "is_policy": True,
    "has_financial_data": True,
    "content_type": "insurance_commission_table"
}


def get_embedding(text: str, model: str = EMBEDDING_MODEL) -> List[float]:
    """Generate embeddings using OpenAI."""
    response = openai_client.embeddings.create(
        input=text,
        model=model,
        dimensions=EMBEDDING_DIMENSIONS
    )
    return response.data[0].embedding


def extract_table_cells(table_item: Dict[str, Any], page_num: int, table_idx: int) -> List[Dict[str, Any]]:
    """
    Extract every cell from a table as individual vectors.

    Strategy:
    - Each cell gets its own vector with full row/column context
    - Product name cells get enhanced metadata
    - Commission cells get rate type and period metadata
    - Cross-reference cells with headers for semantic meaning
    """
    chunks = []
    rows = table_item.get('rows', [])

    if len(rows) < 2:
        return chunks

    # First row is headers
    headers = rows[0]

    # Strategy 1: Extract each product row as multiple vectors (one per column)
    for row_idx, row in enumerate(rows[1:], start=1):
        if not row or len(row) == 0:
            continue

        product_name = row[0] if len(row) > 0 else ""
        payment_term = row[1] if len(row) > 1 else ""

        # Skip empty product names
        if not product_name or not product_name.strip():
            continue

        # Clean product name for better matching
        clean_product = product_name.replace("(일반/간편)", "").replace("일반/간편", "").strip()

        # Extract each commission cell as a separate vector
        commission_types = [
            ("comprehensive_current", "종합 익월", 2),
            ("comprehensive_13th", "종합 13차월", 3),
            ("fc_policy_current", "1차시책(FC시책) 익월", 4),
            ("fc_policy_13th", "1차시책(FC시책) 13차월", 5),
            ("hq_policy_current", "2차시책(본부시책) 익월", 6),
            ("hq_policy_13th", "2차시책(본부시책) 13차월", 7)
        ]

        for comm_key, comm_label, col_idx in commission_types:
            if col_idx >= len(row):
                continue

            commission_value = row[col_idx]

            # Create searchable text for this specific commission
            searchable_text = f"""
상품명: {product_name}
{f'납기: {payment_term}' if payment_term else ''}
시책 유형: {comm_label}
수수료율: {commission_value}

페이지: {page_num}
테이블 정보: 한화생명 11월 시책 수수료율표
            """.strip()

            # Create a natural language description
            natural_desc = f"{clean_product}"
            if payment_term:
                natural_desc += f" {payment_term}"
            natural_desc += f" {comm_label} 수수료율은 {commission_value}입니다."

            chunks.append({
                "text": f"{searchable_text}\n\n{natural_desc}",
                "metadata": {
                    **DOCUMENT_METADATA,
                    "chunk_type": "table_cell_commission",
                    "page_number": page_num,
                    "table_index": table_idx,
                    "row_index": row_idx,
                    "column_index": col_idx,

                    # Product info
                    "product_name": product_name,
                    "product_name_clean": clean_product,
                    "payment_term": payment_term,

                    # Commission info
                    "commission_type": comm_key,
                    "commission_label": comm_label,
                    "commission_value": commission_value,
                    "commission_category": comm_label.split()[0],  # 종합, 1차시책, 2차시책
                    "commission_period": "익월" if "익월" in comm_label else "13차월",

                    # Search optimization
                    "searchable_text": searchable_text,
                    "natural_description": natural_desc,

                    # Flags
                    "is_current_month": "익월" in comm_label,
                    "is_13th_month": "13차월" in comm_label,
                    "is_fc_policy": "FC시책" in comm_label,
                    "is_hq_policy": "본부시책" in comm_label,
                    "is_comprehensive": "종합" in comm_label
                }
            })

        # Strategy 2: Create a row summary vector (all commissions for one product)
        all_commissions = []
        for i in range(2, min(8, len(row))):
            if i < len(headers):
                all_commissions.append(f"{headers[i]}: {row[i]}")

        row_summary = f"""
상품: {product_name}
{f'납기: {payment_term}' if payment_term else ''}

수수료율:
{chr(10).join(all_commissions)}

출처: HO&F지사 11월 시책공지 (페이지 {page_num})
        """.strip()

        chunks.append({
            "text": row_summary,
            "metadata": {
                **DOCUMENT_METADATA,
                "chunk_type": "table_row_summary",
                "page_number": page_num,
                "table_index": table_idx,
                "row_index": row_idx,
                "product_name": product_name,
                "product_name_clean": clean_product,
                "payment_term": payment_term,
                "all_commission_values": [row[i] for i in range(2, min(8, len(row)))],
                "searchable_text": row_summary
            }
        })

    # Strategy 3: Column summaries (all products for one commission type)
    for col_idx, header in enumerate(headers[2:8], start=2):
        products_in_column = []

        for row in rows[1:]:
            if len(row) > col_idx and len(row) > 0:
                product = row[0]
                value = row[col_idx]
                if product and product.strip():
                    products_in_column.append(f"- {product}: {value}")

        if products_in_column:
            column_summary = f"""
시책 유형: {header}
수수료율 목록:

{chr(10).join(products_in_column[:15])}

페이지 {page_num} - 한화생명 11월 시책
            """.strip()

            chunks.append({
                "text": column_summary,
                "metadata": {
                    **DOCUMENT_METADATA,
                    "chunk_type": "table_column_summary",
                    "page_number": page_num,
                    "table_index": table_idx,
                    "column_index": col_idx,
                    "column_header": header,
                    "product_count": len(products_in_column),
                    "searchable_text": column_summary
                }
            })

    # Strategy 4: Full table as a comprehensive reference
    table_md = table_item.get('md', '')
    if table_md:
        chunks.append({
            "text": f"한화생명 11월 시책 전체 수수료율표 (페이지 {page_num})\n\n{table_md}",
            "metadata": {
                **DOCUMENT_METADATA,
                "chunk_type": "table_full",
                "page_number": page_num,
                "table_index": table_idx,
                "row_count": len(rows),
                "column_count": len(headers),
                "products": [row[0] for row in rows[1:] if row and len(row) > 0 and row[0]],
                "searchable_text": table_md[:1000]
            }
        })

    return chunks


def chunk_text_sentences(text: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Split text into sentence-level chunks for granular search."""
    chunks = []

    # Split by sentences (Korean-aware)
    sentences = re.split(r'[.!?。]+\s*', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

    # Group into small chunks (2-3 sentences)
    for i in range(0, len(sentences), 2):
        chunk_sentences = sentences[i:i+3]
        chunk_text = '. '.join(chunk_sentences)

        if len(chunk_text) > 30:
            chunks.append({
                "text": chunk_text,
                "metadata": {
                    **metadata,
                    "sentence_group_index": i // 2,
                    "sentence_count": len(chunk_sentences),
                    "searchable_text": chunk_text[:300]
                }
            })

    return chunks


def process_document_ultragranular(json_file_path: str) -> List[Dict[str, Any]]:
    """Process document with ultra-granular extraction."""
    print(f"Loading document: {json_file_path}")

    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    all_chunks = []
    pages = data.get('pages', [])

    print(f"Processing {len(pages)} pages with ultra-granular extraction...")

    for page in pages:
        page_num = page.get('page', 0)
        items = page.get('items', [])
        page_text = page.get('text', '')
        page_md = page.get('md', '')

        print(f"\n  Page {page_num}:")

        # 1. Page summary (full page context)
        if page_md:
            all_chunks.append({
                "text": f"페이지 {page_num} 전체 내용:\n\n{page_md}",
                "metadata": {
                    **DOCUMENT_METADATA,
                    "chunk_type": "page_full",
                    "page_number": page_num,
                    "searchable_text": page_text[:500]
                }
            })
            print(f"    ✓ Page summary: 1 chunk")

        # 2. Extract tables (ULTRA-GRANULAR)
        table_count = 0
        table_chunk_count = 0
        for idx, item in enumerate(items):
            if item.get('type') == 'table':
                table_chunks = extract_table_cells(item, page_num, idx)
                all_chunks.extend(table_chunks)
                table_count += 1
                table_chunk_count += len(table_chunks)

        if table_count > 0:
            print(f"    ✓ Tables: {table_count} tables → {table_chunk_count} cell-level chunks")

        # 3. Headings with context
        heading_count = 0
        for idx, item in enumerate(items):
            if item.get('type') in ['heading', 'paragraph_title']:
                heading_text = item.get('value', '')

                # Get surrounding context (next 3 items)
                context_items = items[idx:min(idx+4, len(items))]
                context_text = '\n\n'.join([
                    ci.get('value', ci.get('md', ''))
                    for ci in context_items
                ])

                all_chunks.append({
                    "text": context_text,
                    "metadata": {
                        **DOCUMENT_METADATA,
                        "chunk_type": "heading_with_context",
                        "page_number": page_num,
                        "heading": heading_text,
                        "heading_level": item.get('lvl', 1),
                        "searchable_text": context_text[:300]
                    }
                })
                heading_count += 1

        if heading_count > 0:
            print(f"    ✓ Headings: {heading_count} chunks")

        # 4. Text blocks (sentence-level)
        text_chunk_count = 0
        for item in items:
            if item.get('type') == 'text':
                text_content = item.get('value', '')
                if len(text_content.strip()) > 30:
                    sentence_chunks = chunk_text_sentences(text_content, {
                        **DOCUMENT_METADATA,
                        "chunk_type": "text_sentence_group",
                        "page_number": page_num
                    })
                    all_chunks.extend(sentence_chunks)
                    text_chunk_count += len(sentence_chunks)

        if text_chunk_count > 0:
            print(f"    ✓ Text blocks: {text_chunk_count} sentence-level chunks")

    return all_chunks


def delete_namespace(namespace: str):
    """Delete all vectors in a namespace."""
    index = pc.Index(INDEX_NAME)

    print(f"\nDeleting all vectors from namespace '{namespace}'...")

    # Delete all vectors in namespace
    index.delete(delete_all=True, namespace=namespace)

    print(f"✓ Namespace '{namespace}' cleared")


def upload_to_pinecone(chunks: List[Dict[str, Any]], batch_size: int = 100):
    """Upload chunks to Pinecone with embeddings."""
    index = pc.Index(INDEX_NAME)

    print(f"\nUploading {len(chunks)} chunks to Pinecone...")
    print(f"  - Index: {INDEX_NAME}")
    print(f"  - Namespace: {NAMESPACE}")
    print(f"  - Batch size: {batch_size}")

    vectors = []
    upload_count = 0

    for idx, chunk in enumerate(chunks):
        # Generate embedding
        if (idx + 1) % 10 == 0:
            print(f"  Progress: {idx+1}/{len(chunks)} ({(idx+1)/len(chunks)*100:.1f}%)", end='\r')

        embedding = get_embedding(chunk['text'])

        # Create vector
        vector = {
            "id": f"hanwha_nov2025_ultra_{idx}_{datetime.now().timestamp()}",
            "values": embedding,
            "metadata": {
                **chunk['metadata'],
                "chunk_index": idx,
                "total_chunks": len(chunks),
                "upload_timestamp": datetime.now().isoformat(),
                "extraction_version": "ultra_granular_v2"
            }
        }

        vectors.append(vector)

        # Upload in batches
        if len(vectors) >= batch_size:
            index.upsert(vectors=vectors, namespace=NAMESPACE)
            upload_count += len(vectors)
            print(f"\n  ✓ Uploaded batch: {upload_count}/{len(chunks)} total")
            vectors = []

    # Upload remaining vectors
    if vectors:
        index.upsert(vectors=vectors, namespace=NAMESPACE)
        upload_count += len(vectors)
        print(f"\n  ✓ Uploaded final batch: {upload_count}/{len(chunks)} total")

    print(f"\n✓ Successfully uploaded {len(chunks)} ultra-granular chunks!")


def main(auto_confirm=False):
    """Main execution."""
    # Find the Hanwha file
    script_dir = Path(__file__).parent / "MODIFIED"
    json_files = glob.glob(str(script_dir / "*.json"))
    json_files = [f for f in json_files if "Ho&F" in f]

    if not json_files:
        print("Error: Could not find Hanwha Life JSON file")
        return

    json_file = json_files[0]
    print(f"Found document: {json_file}")

    # Process document with ultra-granular extraction
    chunks = process_document_ultragranular(json_file)

    # Print summary
    print(f"\n{'='*80}")
    print(f"ULTRA-GRANULAR EXTRACTION SUMMARY")
    print(f"{'='*80}")

    chunk_types = {}
    for chunk in chunks:
        chunk_type = chunk['metadata']['chunk_type']
        chunk_types[chunk_type] = chunk_types.get(chunk_type, 0) + 1

    for chunk_type, count in sorted(chunk_types.items()):
        print(f"  - {chunk_type:30s}: {count:4d} chunks")

    print(f"\n  {'TOTAL CHUNKS':30s}: {len(chunks):4d}")
    print(f"{'='*80}")

    # Ask for confirmation
    if not auto_confirm:
        try:
            response = input(f"\nDelete old vectors and upload {len(chunks)} new ultra-granular chunks? (y/n): ")
            if response.lower() != 'y':
                print("Upload cancelled.")
                return
        except EOFError:
            print(f"\nAuto-confirming upload (non-interactive mode)")

    # Delete old namespace
    delete_namespace(NAMESPACE)

    # Upload new vectors
    upload_to_pinecone(chunks)

    # Print query examples
    print("\n" + "="*80)
    print("EXAMPLE QUERIES FOR ULTRA-GRANULAR VECTORS")
    print("="*80)
    print("\n1. Specific product + commission type:")
    print("   '레이디H보장보험 종합 익월 수수료'")
    print("\n2. Product + payment term:")
    print("   '제로백H종신 20년납 13차월 수수료율'")
    print("\n3. Commission type comparison:")
    print("   'H건강플러스 1차시책 vs 2차시책'")
    print("\n4. All products for a commission type:")
    print("   '종합 익월 수수료율 전체'")
    print("="*80)


if __name__ == "__main__":
    import sys
    auto_confirm = "--yes" in sys.argv or "-y" in sys.argv
    main(auto_confirm=auto_confirm)
