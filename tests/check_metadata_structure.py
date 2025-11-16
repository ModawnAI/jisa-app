#!/usr/bin/env python3
"""Check actual metadata structure in Hanwha namespace."""

from pinecone import Pinecone
import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

index = pc.Index("hof-branch-chatbot")

# Query for sample records
response = openai_client.embeddings.create(
    input="레이디H보장",
    model="text-embedding-3-large",
    dimensions=3072
)
embedding = response.data[0].embedding

results = index.query(
    vector=embedding,
    top_k=3,
    namespace="hanwha-november-2025",
    filter={"chunk_type": "table_cell_commission"},
    include_metadata=True
)

print("="*80)
print("SAMPLE METADATA FROM HANWHA NAMESPACE")
print("="*80)

if results.matches:
    for idx, match in enumerate(results.matches, 1):
        print(f"\n[Record {idx}] Score: {match.score:.4f}")
        print("-"*80)
        meta = match.metadata
        print(json.dumps(meta, indent=2, ensure_ascii=False))
        print()
else:
    print("No results found")
