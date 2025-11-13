#!/usr/bin/env python3
"""
Upload Hanwha Life November 2025 Policy Document to Pinecone
Creates a separate namespace with multiple chunked vectors for accurate querying.

Features:
- Intelligent chunking by content type (tables, headings, text blocks)
- Rich metadata for precise filtering
- Separate namespace for isolated queries
- Multiple vectors per document for granular search
"""

import os
import json
import glob
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
NAMESPACE = "hanwha-november-2025"  # Separate namespace for this document
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


def chunk_by_content_type(page_data: Dict[str, Any], page_num: int) -> List[Dict[str, Any]]:
    """
    Chunk a page by content type for granular search.

    Chunking strategy:
    1. Each table becomes a separate vector (with full table data)
    2. Headings become vectors (with surrounding context)
    3. Text blocks become vectors
    4. Full page markdown as a summary vector

    Returns:
        List of chunks with text and metadata
    """
    chunks = []

    # Extract items
    items = page_data.get('items', [])
    page_text = page_data.get('text', '')
    page_md = page_data.get('md', '')

    # Strategy 1: Full page summary (for broad queries)
    if page_md:
        chunks.append({
            "text": page_md,
            "metadata": {
                **DOCUMENT_METADATA,
                "chunk_type": "page_summary",
                "page_number": page_num,
                "item_types": list(set([item.get('type') for item in items])),
                "searchable_text": page_text[:500]  # First 500 chars for preview
            }
        })

    # Strategy 2: Individual tables (most important for queries)
    for idx, item in enumerate(items):
        if item.get('type') == 'table':
            table_rows = item.get('rows', [])
            table_html = item.get('html', '')
            table_csv = item.get('csv', '')
            table_md = item.get('md', '')

            # Extract product names and rates from table
            products = []
            rates = {}

            if table_rows and len(table_rows) > 0:
                headers = table_rows[0] if len(table_rows) > 0 else []

                # Extract products from first column (skip header row)
                for row in table_rows[1:]:
                    if row and len(row) > 0:
                        product_name = row[0]
                        if product_name and product_name.strip():
                            products.append(product_name)

                            # Extract rates
                            if len(row) > 2:
                                rates[product_name] = {
                                    "comprehensive_current": row[2] if len(row) > 2 else "",
                                    "comprehensive_13th": row[3] if len(row) > 3 else "",
                                    "fc_policy_current": row[4] if len(row) > 4 else "",
                                    "fc_policy_13th": row[5] if len(row) > 5 else "",
                                    "hq_policy_current": row[6] if len(row) > 6 else "",
                                    "hq_policy_13th": row[7] if len(row) > 7 else ""
                                }

            # Create searchable text combining markdown and CSV
            searchable_table_text = f"""
보험 상품 시책 테이블 (페이지 {page_num})

{table_md}

상품 목록: {', '.join(products[:10])}

CSV 데이터:
{table_csv[:1000]}
            """.strip()

            chunks.append({
                "text": searchable_table_text,
                "metadata": {
                    **DOCUMENT_METADATA,
                    "chunk_type": "table",
                    "page_number": page_num,
                    "table_index": idx,
                    "row_count": len(table_rows),
                    "column_count": len(table_rows[0]) if table_rows else 0,
                    "products": products[:20],  # First 20 products
                    "has_commission_rates": True,
                    "table_html": table_html[:2000],  # First 2000 chars
                    "table_csv": table_csv[:2000],
                    "searchable_text": searchable_table_text
                }
            })

    # Strategy 3: Headings with context
    for idx, item in enumerate(items):
        if item.get('type') in ['heading', 'paragraph_title']:
            heading_text = item.get('value', '')
            heading_md = item.get('md', '')

            # Get surrounding context (next few items)
            context_items = items[idx:min(idx+3, len(items))]
            context_text = '\n\n'.join([
                ci.get('value', ci.get('md', ''))
                for ci in context_items
            ])

            chunks.append({
                "text": f"{heading_md}\n\n{context_text}",
                "metadata": {
                    **DOCUMENT_METADATA,
                    "chunk_type": "heading_with_context",
                    "page_number": page_num,
                    "heading": heading_text,
                    "heading_level": item.get('lvl', 1),
                    "searchable_text": context_text[:300]
                }
            })

    # Strategy 4: Text blocks
    for idx, item in enumerate(items):
        if item.get('type') == 'text':
            text_content = item.get('value', '')
            if len(text_content.strip()) > 20:  # Only meaningful text blocks
                chunks.append({
                    "text": text_content,
                    "metadata": {
                        **DOCUMENT_METADATA,
                        "chunk_type": "text_block",
                        "page_number": page_num,
                        "text_length": len(text_content),
                        "searchable_text": text_content[:300]
                    }
                })

    return chunks


def process_document(json_file_path: str) -> List[Dict[str, Any]]:
    """Process the JSON document and create chunks."""
    print(f"Loading document: {json_file_path}")

    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    all_chunks = []
    pages = data.get('pages', [])

    print(f"Processing {len(pages)} pages...")

    for page in pages:
        page_num = page.get('page', 0)
        print(f"  - Processing page {page_num}...")

        chunks = chunk_by_content_type(page, page_num)
        all_chunks.extend(chunks)
        print(f"    Created {len(chunks)} chunks from page {page_num}")

    return all_chunks


def upload_to_pinecone(chunks: List[Dict[str, Any]], batch_size: int = 100):
    """Upload chunks to Pinecone with embeddings."""
    index = pc.Index(INDEX_NAME)

    print(f"\nUploading {len(chunks)} chunks to Pinecone...")
    print(f"  - Index: {INDEX_NAME}")
    print(f"  - Namespace: {NAMESPACE}")

    vectors = []

    for idx, chunk in enumerate(chunks):
        # Generate embedding
        print(f"  Generating embedding {idx+1}/{len(chunks)}...", end='\r')
        embedding = get_embedding(chunk['text'])

        # Create vector
        vector = {
            "id": f"hanwha_nov2025_chunk_{idx}_{datetime.now().timestamp()}",
            "values": embedding,
            "metadata": {
                **chunk['metadata'],
                "chunk_index": idx,
                "total_chunks": len(chunks),
                "upload_timestamp": datetime.now().isoformat()
            }
        }

        vectors.append(vector)

        # Upload in batches
        if len(vectors) >= batch_size:
            index.upsert(vectors=vectors, namespace=NAMESPACE)
            print(f"\n  Uploaded batch of {len(vectors)} vectors")
            vectors = []

    # Upload remaining vectors
    if vectors:
        index.upsert(vectors=vectors, namespace=NAMESPACE)
        print(f"\n  Uploaded final batch of {len(vectors)} vectors")

    print(f"\n✓ Successfully uploaded {len(chunks)} chunks to namespace '{NAMESPACE}'")


def main(auto_confirm=False):
    """Main execution."""
    # Find the Hanwha file
    script_dir = Path(__file__).parent / "MODIFIED"
    json_files = list(script_dir.glob("*한화생명*.json"))

    if not json_files:
        # Try alternative path
        json_files = glob.glob(str(script_dir / "*.json"))
        json_files = [f for f in json_files if "Ho&F" in f]

    if not json_files:
        print("Error: Could not find Hanwha Life JSON file")
        return

    json_file = json_files[0]
    print(f"Found document: {json_file}")

    # Process document
    chunks = process_document(json_file)

    # Print summary
    print(f"\n=== Chunking Summary ===")
    chunk_types = {}
    for chunk in chunks:
        chunk_type = chunk['metadata']['chunk_type']
        chunk_types[chunk_type] = chunk_types.get(chunk_type, 0) + 1

    for chunk_type, count in chunk_types.items():
        print(f"  - {chunk_type}: {count} chunks")

    print(f"\n  Total chunks: {len(chunks)}")

    # Ask for confirmation
    if not auto_confirm:
        try:
            response = input(f"\nUpload {len(chunks)} chunks to namespace '{NAMESPACE}'? (y/n): ")
            if response.lower() != 'y':
                print("Upload cancelled.")
                return
        except EOFError:
            # Running non-interactively, proceed with upload
            print(f"\nAuto-confirming upload (non-interactive mode)")
            pass

    # Upload to Pinecone
    upload_to_pinecone(chunks)

    # Print query examples
    print("\n=== Example Queries ===")
    print("1. '한화생명 레이디H보장보험 수수료율'")
    print("2. 'H건강플러스 시책 비율'")
    print("3. '11월 한화생명 프로모션'")
    print("4. '제로백H종신 20년납 수수료'")
    print("\nTo query this namespace in your RAG chatbot, use:")
    print(f"  namespace='{NAMESPACE}'")


if __name__ == "__main__":
    import sys
    auto_confirm = "--yes" in sys.argv or "-y" in sys.argv
    main(auto_confirm=auto_confirm)
