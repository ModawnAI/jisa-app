#!/usr/bin/env python3
"""Delete general-info namespace after consolidation."""

from pinecone import Pinecone
import os
from dotenv import load_dotenv
import time

load_dotenv()
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("hof-branch-chatbot")

print("="*80)
print("DELETING GENERAL-INFO NAMESPACE")
print("="*80)

# Get stats before deletion
stats_before = index.describe_index_stats()
general_count = stats_before.namespaces.get("general-info", {}).vector_count or 0

if general_count:
    print(f"\nBefore: {general_count} vectors in general-info")

    # Delete all vectors in namespace
    index.delete(delete_all=True, namespace="general-info")
    print("✓ Deleted all vectors from general-info namespace")
else:
    print("\nNo vectors found in general-info namespace")

# Get stats after deletion
time.sleep(2)
stats_after = index.describe_index_stats()

print("\n" + "="*80)
print("CURRENT NAMESPACE STATUS")
print("="*80)
for ns_name, ns_stats in sorted(stats_after.namespaces.items()):
    print(f"  📁 {ns_name}: {ns_stats.vector_count} vectors")

print("\n" + "="*80)
print("✓ general-info namespace deletion complete!")
print("="*80)
