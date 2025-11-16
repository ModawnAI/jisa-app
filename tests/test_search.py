#!/usr/bin/env python3
import os
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import OpenAI

# Load from current directory
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

INDEX_NAME = "hof-branch-chatbot"
NAMESPACE = "hof-knowledge-base-max"

# Search for "보증보험 동의" related content
index = pc.Index(INDEX_NAME)

# Create embedding for search
response = openai_client.embeddings.create(
    model="text-embedding-3-large",
    input="보증보험 동의 절차 보증 보험 가입 동의서 서류",
    dimensions=3072
)
query_embedding = response.data[0].embedding

# Search without filters first
print("=" * 60)
print("SEARCHING: 보증보험 동의 절차")
print("=" * 60)

results = index.query(
    vector=query_embedding,
    top_k=20,
    namespace=NAMESPACE,
    include_metadata=True
)

print(f"\nFound {len(results.matches)} results\n")

for i, match in enumerate(results.matches[:10], 1):
    meta = match.metadata
    print(f"\n[{i}] Score: {match.score:.3f}")
    print(f"Chunk Type: {meta.get('chunk_type', 'N/A')}")
    print(f"Content Type: {meta.get('content_type', 'N/A')}")
    print(f"Title: {meta.get('title', 'N/A')}")

    # Show searchable text or full text
    text = meta.get('searchable_text', meta.get('full_text', meta.get('natural_description', 'N/A')))
    if text and text != 'N/A':
        preview = text[:300] + "..." if len(text) > 300 else text
        print(f"Text: {preview}")

    print("-" * 60)
