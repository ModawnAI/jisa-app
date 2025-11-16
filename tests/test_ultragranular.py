#!/usr/bin/env python3
"""
Test ultra-granular Hanwha vectors with specific commission queries.
"""

import os
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import OpenAI

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

INDEX_NAME = "hof-branch-chatbot"
NAMESPACE = "hanwha-november-2025"
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072


def get_embedding(text: str) -> list:
    """Generate embedding for query."""
    response = openai_client.embeddings.create(
        input=text,
        model=EMBEDDING_MODEL,
        dimensions=EMBEDDING_DIMENSIONS
    )
    return response.data[0].embedding


def test_query(query_text: str, filters: dict = None, top_k: int = 5):
    """Test a single query."""
    print(f"\n{'='*80}")
    print(f"QUERY: {query_text}")
    if filters:
        print(f"FILTERS: {filters}")
    print(f"{'='*80}\n")

    query_embedding = get_embedding(query_text)
    index = pc.Index(INDEX_NAME)
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        namespace=NAMESPACE,
        filter=filters,
        include_metadata=True
    )

    for idx, match in enumerate(results['matches'], 1):
        metadata = match.get('metadata', {})
        score = match['score']

        print(f"[{idx}] Score: {score:.4f} | Type: {metadata.get('chunk_type')}")

        # Show detailed metadata based on chunk type
        chunk_type = metadata.get('chunk_type')

        if chunk_type == 'table_cell_commission':
            print(f"    📊 Product: {metadata.get('product_name')}")
            print(f"       Payment: {metadata.get('payment_term', 'N/A')}")
            print(f"       Commission: {metadata.get('commission_label')}")
            print(f"       Rate: {metadata.get('commission_value')}")
            print(f"       Category: {metadata.get('commission_category')}")
            print(f"       Period: {metadata.get('commission_period')}")

        elif chunk_type == 'table_row_summary':
            print(f"    📊 Product: {metadata.get('product_name')}")
            print(f"       Payment: {metadata.get('payment_term', 'N/A')}")
            rates = metadata.get('all_commission_values', [])
            if rates:
                print(f"       All Rates: {', '.join(str(r) for r in rates[:4])}...")

        elif chunk_type == 'table_column_summary':
            print(f"    📊 Column: {metadata.get('column_header')}")
            print(f"       Products: {metadata.get('product_count')} products")

        # Show preview
        preview = metadata.get('searchable_text', '')[:200]
        if preview and chunk_type in ['table_cell_commission', 'table_row_summary']:
            print(f"    Preview: {preview.strip()[:120]}...")

        print()

    return results


# Run comprehensive tests
print("="*80)
print("ULTRA-GRANULAR HANWHA VECTOR TESTING")
print(f"Index: {INDEX_NAME} | Namespace: {NAMESPACE}")
print("="*80)

# Test 1: Specific product + specific commission type
print("\n" + "🔍 TEST 1: Specific Product + Commission Type")
test_query(
    "레이디H보장보험 종합 익월 수수료율",
    {"chunk_type": "table_cell_commission"}
)

# Test 2: Product with payment term
print("\n" + "🔍 TEST 2: Product + Payment Term + Period")
test_query(
    "제로백H종신 20년납 13차월",
    {"chunk_type": "table_cell_commission"}
)

# Test 3: FC policy comparison
print("\n" + "🔍 TEST 3: FC Policy (1차시책) Search")
test_query(
    "H건강플러스 1차시책 FC시책",
    {"chunk_type": "table_cell_commission", "is_fc_policy": True}
)

# Test 4: Row summary (all commissions for one product)
print("\n" + "🔍 TEST 4: All Commissions for One Product")
test_query(
    "H당뇨 전체 수수료",
    {"chunk_type": "table_row_summary"}
)

# Test 5: Column summary (all products for one commission type)
print("\n" + "🔍 TEST 5: All Products for Commission Type")
test_query(
    "종합 익월 전체 상품",
    {"chunk_type": "table_column_summary"}
)

# Test 6: Current month only (익월)
print("\n" + "🔍 TEST 6: Current Month Commissions Only")
test_query(
    "Need AI 암보험 익월",
    {"chunk_type": "table_cell_commission", "is_current_month": True}
)

# Test 7: 13th month only
print("\n" + "🔍 TEST 7: 13th Month Commissions Only")
test_query(
    "에이스H보장 13차월",
    {"chunk_type": "table_cell_commission", "is_13th_month": True}
)

# Test 8: HQ policy only (본부시책)
print("\n" + "🔍 TEST 8: HQ Policy (본부시책) Only")
test_query(
    "케어백간병플러스 본부시책",
    {"chunk_type": "table_cell_commission", "is_hq_policy": True}
)

print("\n" + "="*80)
print("✓ All ultra-granular tests completed!")
print("="*80)

# Check namespace stats
index = pc.Index(INDEX_NAME)
stats = index.describe_index_stats()
ns_stats = stats.namespaces.get(NAMESPACE, None)

if ns_stats:
    print(f"\nNamespace '{NAMESPACE}' contains {ns_stats.vector_count} vectors")
    print(f"Ultra-granular extraction successful! 🎉")
