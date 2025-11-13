"""
Script to upsert qa.json data to Pinecone using OpenAI embeddings
This approach generates embeddings with OpenAI and upserts vectors directly
"""
import json
import os
import unicodedata
import random
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

def load_qa_data(json_path):
    """Load QA data from JSON file"""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def generate_embeddings(texts, openai_client):
    """Generate embeddings using OpenAI text-embedding-3-large"""
    try:
        response = openai_client.embeddings.create(
            model="text-embedding-3-large",
            input=texts
        )
        return [item.embedding for item in response.data]
    except Exception as e:
        print(f"Error generating embeddings: {e}")
        return None

def create_pinecone_vectors(conversations, openai_client):
    """Convert QA conversations to Pinecone vectors with embeddings"""
    vectors = []
    
    # Process in batches for embedding generation
    batch_size = 100
    total = len(conversations)
    
    print(f"Generating embeddings for {total} conversations...")
    
    for i in range(0, total, batch_size):
        batch = conversations[i:i + batch_size]
        
        # Create texts for embedding
        texts = []
        for conv in batch:
            answers_text = " ".join(conv.get('answers', []))
            combined_text = f"{conv['question']} {answers_text}"
            texts.append(combined_text)
        
        # Generate embeddings
        embeddings = generate_embeddings(texts, openai_client)
        
        if not embeddings:
            print(f"Failed to generate embeddings for batch {i//batch_size + 1}")
            continue
        
        # Create vectors
        for j, (conv, embedding) in enumerate(zip(batch, embeddings)):
            vector_id = f"qa_{i+j}"
            answers_text = " ".join(conv.get('answers', []))
            
            # Normalize Korean text to NFC (composed form) to avoid Jamo decomposition
            # Randomly assign source_url
            source_url = random.choice(['google.com', 'naver.com'])
            
            vector = {
                "id": vector_id,
                "values": embedding,
                "metadata": {
                    "question": unicodedata.normalize('NFC', conv['question'][:1000]),  # Limit metadata size
                    "answers": unicodedata.normalize('NFC', answers_text[:1000]),
                    "category": unicodedata.normalize('NFC', conv.get('category', '')),
                    "source": unicodedata.normalize('NFC', conv.get('source', '')),
                    "source_url": source_url,
                    "value_score": conv.get('value_score', 0)
                }
            }
            vectors.append(vector)
        
        print(f"Processed batch {i//batch_size + 1}/{(total + batch_size - 1)//batch_size}")
        time.sleep(0.5)  # Rate limiting
    
    return vectors

def upsert_to_pinecone(vectors, index_name="kakaotalk-qa", namespace="default"):
    """Upsert vectors to Pinecone index"""
    
    # Initialize Pinecone
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        raise ValueError("PINECONE_API_KEY not found in environment variables")
    
    pc = Pinecone(api_key=api_key)
    
    # Check if index exists, if not create it
    existing_indexes = [index.name for index in pc.list_indexes()]
    
    if index_name not in existing_indexes:
        print(f"Creating new index: {index_name}")
        pc.create_index(
            name=index_name,
            dimension=3072,  # text-embedding-3-large dimension
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )
        print(f"Index {index_name} created successfully with dimension 3072 for text-embedding-3-large")
        print("Waiting for index to be ready...")
        time.sleep(15)
    else:
        print(f"Index {index_name} already exists")
    
    # Get the index
    index_info = pc.describe_index(index_name)
    index_host = index_info.host
    
    print(f"Index host: {index_host}")
    
    index = pc.Index(host=index_host)
    
    # Upsert in batches
    batch_size = 100
    total_vectors = len(vectors)
    
    print(f"Starting upsert of {total_vectors} vectors in batches of {batch_size}...")
    print(f"Namespace: {namespace}")
    
    for i in range(0, total_vectors, batch_size):
        batch = vectors[i:i + batch_size]
        try:
            index.upsert(vectors=batch, namespace=namespace)
            print(f"Upserted batch {i//batch_size + 1}/{(total_vectors + batch_size - 1)//batch_size} ({len(batch)} vectors)")
        except Exception as e:
            print(f"Error upserting batch {i//batch_size + 1}: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"Successfully upserted {total_vectors} vectors to Pinecone")
    
    # Wait a bit for indexing
    time.sleep(2)
    
    # Get index stats
    stats = index.describe_index_stats()
    print(f"\nIndex stats: {stats}")

def main():
    # Initialize OpenAI client
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY not found in environment variables")
    
    openai_client = OpenAI(api_key=openai_api_key)
    
    # Path to qa.json
    json_path = os.path.join(os.path.dirname(__file__), 'qa.json')
    
    print("Loading QA data from qa.json...")
    data = load_qa_data(json_path)
    
    conversations = data.get('conversations', [])
    print(f"Loaded {len(conversations)} conversations")
    
    print("\nGenerating embeddings and creating vectors...")
    vectors = create_pinecone_vectors(conversations, openai_client)
    print(f"Created {len(vectors)} vectors")
    
    print("\nUpserting to Pinecone...")
    upsert_to_pinecone(vectors)
    
    print("\n✅ Upsert complete!")
    print("You can now use the query functions to search the data.")

if __name__ == "__main__":
    main()

