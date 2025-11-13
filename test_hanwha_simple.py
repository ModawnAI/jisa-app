#!/usr/bin/env python3
"""
Simple test script for Hanwha November 2025 namespace.
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


def test_query(query_text: str, filters: dict = None, top_k: int = 3):
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
        print(f"[{idx}] Score: {match['score']:.4f} | Type: {metadata.get('chunk_type')} | Page: {metadata.get('page_number')}")

        if metadata.get('chunk_type') == 'table' and metadata.get('products'):
            print(f"    Products: {', '.join(metadata['products'][:3])}...")

        preview = metadata.get('searchable_text', '')[:150]
        if preview:
            print(f"    Preview: {preview}...\n")

    return results


# Run tests
print("="*80)
print("TESTING HANWHA NOVEMBER 2025 NAMESPACE")
print(f"Index: {INDEX_NAME} | Namespace: {NAMESPACE}")
print("="*80)

# Test 1: Product commission table query
test_query("한화생명 레이디H보장보험 수수료율", {"chunk_type": "table"})

# Test 2: General product search
test_query("H건강플러스 시책 정보")

# Test 3: Specific product with payment term
test_query("제로백H종신 20년납 수수료", {"chunk_type": "table"})

# Test 4: Monthly promotion overview
test_query("11월 한화생명 프로모션", {"chunk_type": "page_summary"})

print("\n" + "="*80)
print("✓ All tests completed successfully!")
print("="*80)
