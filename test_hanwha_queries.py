#!/usr/bin/env python3
"""
Test queries against the Hanwha November 2025 namespace.
Validates that the uploaded vectors can be accurately queried.
"""

import os
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import OpenAI

load_dotenv()

# Initialize clients
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Constants
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


def query_namespace(query_text: str, top_k: int = 4, filters: dict = None):
    """Query the Hanwha namespace."""
    print(f"\n{'='*80}")
    print(f"QUERY: {query_text}")
    print(f"{'='*80}")

    # Generate embedding
    query_embedding = get_embedding(query_text)

    # Query Pinecone
    index = pc.Index(INDEX_NAME)
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        namespace=NAMESPACE,
        filter=filters,
        include_metadata=True
    )

    # Display results
    print(f"\nFound {len(results['matches'])} results:\n")

    for idx, match in enumerate(results['matches'], 1):
        score = match['score']
        metadata = match.get('metadata', {})

        print(f"[Result {idx}] Score: {score:.4f}")
        print(f"  - Chunk Type: {metadata.get('chunk_type', 'N/A')}")
        print(f"  - Page: {metadata.get('page_number', 'N/A')}")
        print(f"  - Category: {metadata.get('category', 'N/A')}")

        if metadata.get('chunk_type') == 'table':
            print(f"  - Table Info:")
            print(f"    - Rows: {metadata.get('row_count', 'N/A')}")
            print(f"    - Columns: {metadata.get('column_count', 'N/A')}")
            if metadata.get('products'):
                products = metadata['products'][:5]
                print(f"    - Sample Products: {', '.join(products)}")

        # Show preview
        preview = metadata.get('searchable_text', '')[:200]
        if preview:
            print(f"  - Preview: {preview}...")

        print()

    return results


def main():
    """Run test queries."""
    print("Testing Hanwha November 2025 Namespace")
    print(f"Index: {INDEX_NAME}")
    print(f"Namespace: {NAMESPACE}\n")

    # Test queries
    test_queries = [
        # Query 1: Specific product commission
        {
            "query": "한화생명 레이디H보장보험 수수료율은?",
            "filters": {"chunk_type": "table"}
        },

        # Query 2: General product search
        {
            "query": "H건강플러스 시책 정보",
            "filters": None
        },

        # Query 3: Table-specific search
        {
            "query": "제로백H종신 20년납 익월 수수료",
            "filters": {"chunk_type": "table"}
        },

        # Query 4: Page-specific search
        {
            "query": "11월 한화생명 프로모션 전체 내용",
            "filters": {"chunk_type": "page_summary"}
        },

        # Query 5: Heading search
        {
            "query": "한화생명 11월 시책공지",
            "filters": {"chunk_type": "heading_with_context"}
        },

        # Query 6: Multi-product query
        {
            "query": "H10건강, H간병보험, Need AI 암보험 비교",
            "filters": None
        }
    ]

    for test in test_queries:
        query_namespace(test["query"], filters=test["filters"])
        input("Press Enter to continue to next query...")

    print("\n" + "="*80)
    print("Testing complete!")
    print("="*80)


if __name__ == "__main__":
    main()
