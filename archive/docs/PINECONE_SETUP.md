# Pinecone Integration Setup Guide

## Overview
This guide will help you set up Pinecone integration for your KakaoTalk chatbot to provide semantic search and reranking capabilities.

## Prerequisites
1. Python 3.8+
2. Pinecone account (sign up at https://www.pinecone.io/)
3. OpenAI API key

## Setup Steps

### 1. Install Dependencies
```bash
cd /home/bitnami/context-hub/kakaotalk_app
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
```

### 3. Create Pinecone Index
The upsert script will automatically create the index if it doesn't exist. However, you can manually create it in the Pinecone console:

**Index Settings:**
- Name: `kakaotalk-qa`
- Dimensions: `1536` (for OpenAI text-embedding-ada-002)
- Metric: `cosine`
- Cloud: AWS
- Region: `us-east-1`

### 4. Upsert QA Data to Pinecone
Run the upsert script to load your qa.json data into Pinecone:

```bash
python upsert_to_pinecone.py
```

This will:
- Load all conversations from `qa.json`
- Convert them to Pinecone records format
- Upsert them in batches to Pinecone
- Display progress and final statistics

Expected output:
```
Loading QA data from qa.json...
Loaded 346 conversations

Converting to Pinecone records...

Upserting to Pinecone...
Starting upsert of 346 records in batches of 96...
Upserted batch 1/4 (96 records)
Upserted batch 2/4 (96 records)
Upserted batch 3/4 (96 records)
Upserted batch 4/4 (58 records)
Successfully upserted 346 records to Pinecone

Index stats: {...}

✅ Upsert complete!
```

### 5. Test Pinecone Connection
```bash
python pinecone_helper.py
```

This will test the connection and run a sample query.

### 6. Run the Application
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## How It Works

### Query Flow
1. **User asks question** via KakaoTalk → `/chat/` endpoint
2. **Semantic search** in Pinecone using the question
3. **Reranking** using `pinecone-rerank-v0` model
4. **Top results** sent to GPT-5 as context
5. **GPT-5 generates** Korean answer based on context
6. **Response sent** back to KakaoTalk

### Pinecone Query Parameters
- `top_k=10`: Retrieve 10 initial results from semantic search
- `rerank_top_n=5`: Rerank and keep top 5 most relevant results
- `model=pinecone-rerank-v0`: Use Pinecone's reranking model
- `rankFields=['question', 'answers']`: Rerank based on Q&A content

### API Endpoints

#### POST /chat/
Main chat endpoint for KakaoTalk messages.
- Receives user question
- Queries Pinecone with semantic search + reranking
- Sends results to GPT-5 for inference
- Returns Korean response

#### POST /upload-pdf
Upload PDF documents to add to knowledge base.
- Processes PDF with GPT-4
- Appends to reference.txt (legacy)
- Can be adapted to also upsert to Pinecone

## Troubleshooting

### Error: "PINECONE_API_KEY not found"
Make sure `.env` file exists and contains `PINECONE_API_KEY`.

### Error: "Index not found"
Run the upsert script first: `python upsert_to_pinecone.py`

### Empty Results
- Check if data was properly upserted: `python pinecone_helper.py`
- Verify index stats in Pinecone console
- Try with different queries

### Timeout Errors
- Increase timeout in `pinecone_helper.py`
- Check internet connection
- Verify Pinecone service status

## Performance Optimization

### Batch Size
- Current: 96 records per batch (optimal for text upserts)
- Adjust in `upsert_to_pinecone.py` if needed

### Query Parameters
You can adjust in `pinecone_helper.py`:
```python
# Increase for more comprehensive results
top_k=20  # More initial results

# Decrease for faster responses
rerank_top_n=3  # Fewer reranked results
```

### Caching (Optional)
Consider implementing Redis caching for frequent queries.

## Maintenance

### Adding New QA Data
1. Update `qa.json` with new conversations
2. Run `python upsert_to_pinecone.py` again
3. Script handles duplicates automatically

### Updating Existing Records
Use the same ID format (`qa_{idx}`) to overwrite existing records.

### Index Statistics
Check index usage in Pinecone console or via API:
```python
from pinecone import Pinecone
pc = Pinecone(api_key="...")
index = pc.index("kakaotalk-qa")
print(index.describe_index_stats())
```

## Cost Considerations

### Pinecone Pricing
- Free tier: 1 index, 100K vectors
- Serverless: Pay per read/write units
- Monitor usage in Pinecone console

### OpenAI Pricing
- Embedding: ~$0.0001 per 1K tokens
- GPT-5 inference: Variable based on model
- Reranking: Minimal cost per query

## Next Steps
- ✅ Data upserted to Pinecone
- ✅ Semantic search with reranking enabled
- ✅ GPT-5 integration with Korean output
- ✅ KakaoTalk response handling
- 🔄 Monitor and optimize query performance
- 🔄 Add more QA data as needed
- 🔄 Fine-tune reranking parameters





