"""
Quick test script to verify Pinecone integration is working
"""
import os
from dotenv import load_dotenv

load_dotenv()

def test_environment():
    """Test that all required environment variables are set"""
    print("=" * 60)
    print("Testing Environment Variables")
    print("=" * 60)
    
    openai_key = os.getenv("OPENAI_API_KEY")
    pinecone_key = os.getenv("PINECONE_API_KEY")
    
    print(f"✅ OPENAI_API_KEY: {'Set' if openai_key else '❌ Not Set'}")
    print(f"✅ PINECONE_API_KEY: {'Set' if pinecone_key else '❌ Not Set'}")
    
    if not openai_key or not pinecone_key:
        print("\n⚠️ Please set missing API keys in .env file")
        return False
    
    print("\n✅ All environment variables are set!")
    return True

def test_pinecone_connection():
    """Test Pinecone connection"""
    print("\n" + "=" * 60)
    print("Testing Pinecone Connection")
    print("=" * 60)
    
    try:
        from pinecone import Pinecone
        
        api_key = os.getenv("PINECONE_API_KEY")
        pc = Pinecone(api_key=api_key)
        
        indexes = pc.list_indexes()
        index_names = [idx.name for idx in indexes]
        
        print(f"✅ Successfully connected to Pinecone")
        print(f"📋 Available indexes: {index_names}")
        
        return True
    except Exception as e:
        print(f"❌ Pinecone connection failed: {e}")
        return False

def test_pinecone_query():
    """Test a sample query"""
    print("\n" + "=" * 60)
    print("Testing Pinecone Query")
    print("=" * 60)
    
    try:
        from pinecone_helper import query_pinecone
        
        test_question = "블로그 상위 노출을 위해서는 어떻게 해야 하나요?"
        print(f"📝 Test Question: {test_question}")
        
        results = query_pinecone(test_question, top_k=5, rerank_top_n=3)
        
        if results:
            print(f"\n✅ Query successful! Retrieved {len(results)} results")
            print("\n" + "-" * 60)
            for idx, result in enumerate(results, 1):
                print(f"\n[Result {idx}]")
                print(f"Score: {result['score']:.4f}")
                print(f"Category: {result['category']}")
                print(f"Question: {result['question'][:100]}...")
                print(f"Answer: {result['answers'][:100]}...")
            print("\n" + "-" * 60)
            return True
        else:
            print("⚠️ No results found. Make sure data is upserted to Pinecone.")
            return False
            
    except Exception as e:
        print(f"❌ Query failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_gpt_integration():
    """Test GPT integration with Pinecone results"""
    print("\n" + "=" * 60)
    print("Testing GPT Integration")
    print("=" * 60)
    
    try:
        from pinecone_helper import query_pinecone, format_pinecone_results_for_gpt
        
        test_question = "인플루언서 마케팅을 할 때 주의해야 할 점은?"
        print(f"📝 Test Question: {test_question}")
        
        results = query_pinecone(test_question, top_k=5, rerank_top_n=3)
        
        if results:
            context = format_pinecone_results_for_gpt(results)
            print(f"\n✅ Context formatted for GPT")
            print(f"📏 Context length: {len(context)} characters")
            print(f"\n📄 Context preview:")
            print("-" * 60)
            print(context[:500] + "...")
            print("-" * 60)
            return True
        else:
            print("⚠️ No results to format")
            return False
            
    except Exception as e:
        print(f"❌ GPT integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("🔧 Pinecone Integration Test Suite")
    print("=" * 60)
    
    # Test 1: Environment Variables
    if not test_environment():
        print("\n❌ Environment test failed. Please fix .env file before continuing.")
        return
    
    # Test 2: Pinecone Connection
    if not test_pinecone_connection():
        print("\n❌ Pinecone connection failed. Please check API key and network.")
        return
    
    # Test 3: Query Test
    if not test_pinecone_query():
        print("\n⚠️ Query test failed. You may need to run upsert_to_pinecone.py first.")
        print("Run: python upsert_to_pinecone.py")
        return
    
    # Test 4: GPT Integration
    if not test_gpt_integration():
        print("\n❌ GPT integration test failed.")
        return
    
    # All tests passed
    print("\n" + "=" * 60)
    print("✅ All Tests Passed!")
    print("=" * 60)
    print("\n🎉 Your Pinecone integration is ready to use!")
    print("\nNext steps:")
    print("1. If you haven't already, run: python upsert_to_pinecone.py")
    print("2. Start the FastAPI server: uvicorn app:app --host 0.0.0.0 --port 8000")
    print("3. Test the /chat/ endpoint with a KakaoTalk request")

if __name__ == "__main__":
    main()





