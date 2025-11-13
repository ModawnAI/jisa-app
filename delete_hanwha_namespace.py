#!/usr/bin/env python3
"""Delete hanwha-november-2025 namespace."""

from pinecone import Pinecone
import os
from dotenv import load_dotenv
import time

load_dotenv()
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("hof-branch-chatbot")

print("="*80)
print("DELETING HANWHA-NOVEMBER-2025 NAMESPACE")
print("="*80)

# Get stats before deletion
stats_before = index.describe_index_stats()
hanwha_count = stats_before.namespaces.get("hanwha-november-2025", None)

if hanwha_count:
    print(f"\nBefore: {hanwha_count.vector_count} vectors in hanwha-november-2025")

    # Delete all vectors in namespace
    index.delete(delete_all=True, namespace="hanwha-november-2025")
    print("✓ Deleted all vectors from hanwha-november-2025 namespace")
else:
    print("\nNo vectors found in hanwha-november-2025 namespace")

# Get stats after deletion
time.sleep(2)
stats_after = index.describe_index_stats()

print("\n" + "="*80)
print("CURRENT NAMESPACE STATUS")
print("="*80)
for ns_name, ns_stats in sorted(stats_after.namespaces.items()):
    print(f"  📁 {ns_name}: {ns_stats.vector_count} vectors")

print("\n" + "="*80)
print("✓ Hanwha namespace deletion complete!")
print("="*80)
