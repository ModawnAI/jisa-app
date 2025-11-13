#!/usr/bin/env python3
"""Consolidate all vectors from general-info into hof-knowledge-base-max."""

from pinecone import Pinecone
import os
from dotenv import load_dotenv

load_dotenv()
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("hof-branch-chatbot")

SOURCE_NAMESPACE = "general-info"
TARGET_NAMESPACE = "hof-knowledge-base-max"

print("="*80)
print("CONSOLIDATING NAMESPACES")
print("="*80)

# Get stats before
stats_before = index.describe_index_stats()
source_count = stats_before.namespaces.get(SOURCE_NAMESPACE, {}).vector_count or 0
target_count_before = stats_before.namespaces.get(TARGET_NAMESPACE, {}).vector_count or 0

print(f"\nBefore:")
print(f"  {SOURCE_NAMESPACE}: {source_count} vectors")
print(f"  {TARGET_NAMESPACE}: {target_count_before} vectors")

if source_count == 0:
    print(f"\n✗ No vectors found in {SOURCE_NAMESPACE}")
    exit(1)

# First, get all vector IDs from source namespace
print(f"\n🔍 Getting all vector IDs from {SOURCE_NAMESPACE}...")

results = index.query(
    vector=[0.01] * 3072,
    top_k=source_count,
    namespace=SOURCE_NAMESPACE,
    include_metadata=False  # We only need IDs for now
)

vector_ids = [match.id for match in results.matches]
print(f"✓ Found {len(vector_ids)} vector IDs")

# Fetch actual vectors with values using fetch API
print(f"\n📥 Fetching full vectors with embeddings...")
fetched = index.fetch(ids=vector_ids, namespace=SOURCE_NAMESPACE)

print(f"✓ Fetched {len(fetched.vectors)} vectors with embeddings")

# Copy vectors to target namespace
print(f"\n📤 Copying vectors to {TARGET_NAMESPACE}...")

vectors_to_upsert = []
for vec_id, vector_data in fetched.vectors.items():
    vectors_to_upsert.append({
        "id": vec_id,
        "values": vector_data.values,
        "metadata": vector_data.metadata
    })

# Upsert in batches
batch_size = 100
for i in range(0, len(vectors_to_upsert), batch_size):
    batch = vectors_to_upsert[i:i+batch_size]
    index.upsert(vectors=batch, namespace=TARGET_NAMESPACE)
    print(f"  ✓ Uploaded batch {i//batch_size + 1}/{(len(vectors_to_upsert)-1)//batch_size + 1}")

print(f"✓ Copied {len(vectors_to_upsert)} vectors to {TARGET_NAMESPACE}")

# Get stats after
import time
time.sleep(2)
stats_after = index.describe_index_stats()
target_count_after = stats_after.namespaces.get(TARGET_NAMESPACE, {}).vector_count or 0

print(f"\n{'='*80}")
print("CONSOLIDATION COMPLETE")
print(f"{'='*80}")
print(f"\nAfter:")
print(f"  {SOURCE_NAMESPACE}: {source_count} vectors (original)")
print(f"  {TARGET_NAMESPACE}: {target_count_after} vectors (was {target_count_before})")
print(f"\n✓ Added {target_count_after - target_count_before} vectors to {TARGET_NAMESPACE}")
print(f"\nNext step: Delete {SOURCE_NAMESPACE} namespace if no longer needed")
