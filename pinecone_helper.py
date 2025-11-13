"""
Pinecone helper functions for querying and reranking
"""
import os
from pinecone import Pinecone
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def query_pinecone(question: str, top_k: int = 10, rerank_top_n: int = 3, index_name: str = "kakaotalk-qa", namespace: str = "default"):
    """
    Query Pinecone with semantic search using OpenAI embeddings and Pinecone reranking
    
    Args:
        question: User's question
        top_k: Number of initial results to retrieve
        rerank_top_n: Number of reranked results to return
        index_name: Pinecone index name
        namespace: Pinecone namespace
        
    Returns:
        List of relevant QA pairs with scores
    """
    try:
        # Initialize Pinecone and OpenAI
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if not pinecone_api_key:
            raise ValueError("PINECONE_API_KEY not found in environment variables")
        if not openai_api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        pc = Pinecone(api_key=pinecone_api_key)
        openai_client = OpenAI(api_key=openai_api_key)
        
        # Get the index with proper host
        index_info = pc.describe_index(index_name)
        index_host = index_info.host
        
        # Get the index
        index = pc.Index(host=index_host)
        
        print(f"🔍 Querying Pinecone for: {question}")
        
        # Generate embedding for the question using OpenAI
        print("🧠 Generating question embedding...")
        embedding_response = openai_client.embeddings.create(
            model="text-embedding-3-large",
            input=question
        )
        query_embedding = embedding_response.data[0].embedding
        
        # Query Pinecone with the embedding vector
        print(f"🔎 Searching Pinecone...")
        response = index.query(
            namespace=namespace,
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )
        
        print(f"✅ Pinecone query successful, got {len(response.matches)} results")
        
        # Rerank results using Pinecone reranker
        if len(response.matches) > 0:
            print(f"🎯 Reranking results...")
            
            # Prepare documents for reranking
            documents = []
            for match in response.matches:
                doc = {
                    "id": match.id,
                    "text": f"{match.metadata.get('question', '')} {match.metadata.get('answers', '')}"
                }
                documents.append(doc)
            
            # Rerank using Pinecone reranker
            try:
                rerank_response = pc.inference.rerank(
                    model="pinecone-rerank-v0",
                    query=question,
                    documents=documents,
                    top_n=rerank_top_n,
                    return_documents=False
                )
                
                # Extract reranked results
                results = []
                for item in rerank_response.data:
                    original_match = response.matches[item.index]
                    result = {
                        'id': original_match.id,
                        'score': item.score,  # Reranking score
                        'original_score': original_match.score,  # Original similarity score
                        'question': original_match.metadata.get('question', ''),
                        'answers': original_match.metadata.get('answers', ''),
                        'category': original_match.metadata.get('category', ''),
                        'source': original_match.metadata.get('source', ''),
                        'source_url': original_match.metadata.get('source_url', ''),
                        'value_score': original_match.metadata.get('value_score', 0)
                    }
                    results.append(result)
                
                print(f"📊 Retrieved {len(results)} reranked results")
                return results
                
            except Exception as rerank_error:
                print(f"⚠️ Reranking failed: {rerank_error}, returning original results")
                # Fall back to original results without reranking
                results = []
                for match in response.matches[:rerank_top_n]:
                    result = {
                        'id': match.id,
                        'score': match.score,
                        'question': match.metadata.get('question', ''),
                        'answers': match.metadata.get('answers', ''),
                        'category': match.metadata.get('category', ''),
                        'source': match.metadata.get('source', ''),
                        'source_url': match.metadata.get('source_url', ''),
                        'value_score': match.metadata.get('value_score', 0)
                    }
                    results.append(result)
                return results
        else:
            print("⚠️ No results found")
            return []
        
    except Exception as e:
        print(f"❌ Error querying Pinecone: {e}")
        import traceback
        traceback.print_exc()
        return []

def format_pinecone_results_for_gpt(results):
    """
    Format Pinecone results into a context string for GPT
    
    Args:
        results: List of Pinecone query results
        
    Returns:
        Formatted string for GPT context
    """
    if not results:
        return "관련 정보를 찾을 수 없습니다."
    
    context_parts = []
    
    for idx, result in enumerate(results, 1):
        part = f"""
참조 {idx} (관련도: {result['score']:.4f}, 카테고리: {result['category']})
질문: {result['question']}
답변: {result['answers']}
출처: {result['source']}
---"""
        context_parts.append(part)
    
    full_context = "\n".join(context_parts)
    
    return f"""다음은 사용자 질문과 가장 관련성이 높은 참조 정보입니다:

{full_context}

위 참조 정보를 바탕으로 사용자의 질문에 한국어로 답변해주세요."""

def test_pinecone_connection():
    """Test Pinecone connection and query"""
    try:
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            print("❌ PINECONE_API_KEY not found")
            return False
        
        pc = Pinecone(api_key=api_key)
        indexes = pc.list_indexes()
        
        print(f"✅ Pinecone connection successful")
        print(f"📋 Available indexes: {[idx.name for idx in indexes]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Pinecone connection failed: {e}")
        return False

if __name__ == "__main__":
    # Test the connection
    test_pinecone_connection()
    
    # Test query
    test_question = "블로그 상위 노출을 위해서는 어떻게 해야 하나요?"
    results = query_pinecone(test_question)
    
    if results:
        print(f"\n🎯 Test Query Results:")
        for idx, result in enumerate(results, 1):
            print(f"\n{idx}. Score: {result['score']:.4f}")
            print(f"   Question: {result['question'][:100]}...")
            print(f"   Category: {result['category']}")

