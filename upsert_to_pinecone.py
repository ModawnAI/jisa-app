"""
Script to upsert qa.json data to Pinecone
"""
import json
import os
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def load_qa_data(json_path):
    """Load QA data from JSON file"""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def create_pinecone_records(conversations):
    """Convert QA conversations to Pinecone records format"""
    records = []
    
    for idx, conv in enumerate(conversations):
        # Create a unique ID
        record_id = f"qa_{idx}"
        
        # Combine question and answers for embedding
        answers_text = " ".join(conv.get('answers', []))
        chunk_text = f"{conv['question']} {answers_text}"
        
        # Create record with metadata
        record = {
            "_id": record_id,
            "chunk_text": chunk_text,
            "question": conv['question'],
            "answers": answers_text,
            "category": conv.get('category', ''),
            "source": conv.get('source', ''),
            "value_score": conv.get('value_score', 0)
        }
        
        records.append(record)
    
    return records

def upsert_to_pinecone(records, index_name="kakaotalk-qa", namespace="default"):
    """Upsert records to Pinecone index"""
    
    # Initialize Pinecone
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        raise ValueError("PINECONE_API_KEY not found in environment variables")
    
    pc = Pinecone(api_key=api_key)
    
    # Check if index exists, if not create it
    existing_indexes = [index.name for index in pc.list_indexes()]
    
    if index_name not in existing_indexes:
        print(f"Creating new index with integrated embeddings: {index_name}")
        try:
            pc.create_index(
                name=index_name,
                dimension=1536,  # Default for multilingual-e5-large
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                ),
                embedding={
                    "model": "multilingual-e5-large"
                }
            )
            print(f"Index {index_name} created successfully with multilingual-e5-large embeddings")
        except TypeError as e:
            print(f"⚠️  Embedding parameter may not be supported in this SDK version")
            print(f"   Creating index without embedding configuration...")
            pc.create_index(
                name=index_name,
                dimension=1536,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )
            print(f"Index {index_name} created successfully")
            print(f"⚠️  Note: You may need to configure embeddings in the Pinecone console")
    else:
        print(f"Index {index_name} already exists")
        print(f"⚠️  To recreate with embeddings, delete the index first:")
        print(f"    python -c \"from pinecone import Pinecone; import os; from dotenv import load_dotenv; load_dotenv(); pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY')); pc.delete_index('{index_name}')\"")
        print(f"    Then run this script again.")
    
    # Wait for index to be ready
    import time
    print("Waiting for index to be ready...")
    time.sleep(10)
    
    # Get the index with proper host
    index_info = pc.describe_index(index_name)
    index_host = index_info.host
    
    print(f"Index host: {index_host}")
    
    # Get the index
    index = pc.Index(host=index_host)
    
    # Upsert in batches (max 96 records per batch for text upserts)
    batch_size = 96
    total_records = len(records)
    
    print(f"Starting upsert of {total_records} records in batches of {batch_size}...")
    print(f"Namespace: {namespace}")
    
    for i in range(0, total_records, batch_size):
        batch = records[i:i + batch_size]
        try:
            # Use index.upsert_records(namespace, records)
            index.upsert_records(namespace, batch)
            print(f"Upserted batch {i//batch_size + 1}/{(total_records + batch_size - 1)//batch_size} ({len(batch)} records)")
        except Exception as e:
            print(f"Error upserting batch {i//batch_size + 1}: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"Successfully upserted {total_records} records to Pinecone")
    
    # Get index stats
    stats = index.describe_index_stats()
    print(f"\nIndex stats: {stats}")

def main():
    # Path to qa.json
    json_path = os.path.join(os.path.dirname(__file__), 'qa.json')
    
    print("Loading QA data from qa.json...")
    data = load_qa_data(json_path)
    
    conversations = data.get('conversations', [])
    print(f"Loaded {len(conversations)} conversations")
    
    print("\nConverting to Pinecone records...")
    records = create_pinecone_records(conversations)
    
    print(f"\nUpserting to Pinecone...")
    upsert_to_pinecone(records)
    
    print("\n✅ Upsert complete!")

if __name__ == "__main__":
    main()

