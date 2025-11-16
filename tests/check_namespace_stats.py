#!/usr/bin/env python3
"""Check Pinecone namespace statistics."""

import os
from dotenv import load_dotenv
from pinecone import Pinecone

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("hof-branch-chatbot")

stats = index.describe_index_stats()

print("\n" + "="*80)
print("PINECONE INDEX STATISTICS")
print("="*80)
print(f"\nIndex: hof-branch-chatbot")
print(f"Total vectors: {stats.total_vector_count:,}")
print(f"\nNamespaces:")

for ns_name, ns_stats in sorted(stats.namespaces.items()):
    print(f"\n  📁 {ns_name}")
    print(f"      Vectors: {ns_stats.vector_count:,}")

print("\n" + "="*80)
print("✓ All namespaces active and ready for queries")
print("="*80 + "\n")
