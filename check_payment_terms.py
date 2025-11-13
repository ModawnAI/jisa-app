#!/usr/bin/env python3
"""Check payment term values in Hanwha namespace."""

from pinecone import Pinecone
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

index = pc.Index("hof-branch-chatbot")

# Query for 제로백H종신
response = openai_client.embeddings.create(
    input="제로백H종신",
    model="text-embedding-3-large",
    dimensions=3072
)
embedding = response.data[0].embedding

results = index.query(
    vector=embedding,
    top_k=10,
    namespace="hanwha-november-2025",
    filter={"chunk_type": "table_cell_commission"},
    include_metadata=True
)

print("="*80)
print("제로백H종신 Payment Term Values:")
print("="*80)

seen = set()
for match in results.matches:
    meta = match.metadata
    product = meta.get('product_name', '')
    if "제로백" in product:
        payment = meta.get('payment_term', 'N/A')
        key = (product, payment)
        if key not in seen:
            seen.add(key)
            print(f"\nProduct: {product}")
            print(f"  Payment Term: '{payment}'")
            print(f"  Commission: {meta.get('commission_label')}")
            print(f"  Rate: {meta.get('commission_value')}")

print(f"\n{'='*80}")
print(f"Total unique product+payment combinations: {len(seen)}")
print("="*80)
