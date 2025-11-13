#!/usr/bin/env python3
"""
Test RAG chatbot with intelligent namespace selection.
"""

from rag_chatbot import rag_answer

# Test queries - should automatically select correct namespace
test_queries = [
    # Hanwha namespace queries (insurance products + commissions)
    {
        "query": "한화생명 레이디H보장보험 종합 익월 수수료율 알려줘",
        "expected_namespace": "hanwha-november-2025",
        "description": "Specific product + commission type"
    },
    {
        "query": "제로백H종신 20년납 수수료는 얼마야?",
        "expected_namespace": "hanwha-november-2025",
        "description": "Product + payment term"
    },
    {
        "query": "H건강플러스 1차시책 FC시책 수수료",
        "expected_namespace": "hanwha-november-2025",
        "description": "FC policy commission"
    },
    {
        "query": "Need AI 암보험 익월 수수료율",
        "expected_namespace": "hanwha-november-2025",
        "description": "Current month commission"
    },
    {
        "query": "한화 에이스H보장 13차월은?",
        "expected_namespace": "hanwha-november-2025",
        "description": "13th month commission"
    },

    # General namespace queries (education, schedule, etc.)
    {
        "query": "11월 4일 교육 일정 알려줘",
        "expected_namespace": "hof-knowledge-base-max",
        "description": "Education schedule"
    },
    {
        "query": "다음 주 워크샵 뭐 있어?",
        "expected_namespace": "hof-knowledge-base-max",
        "description": "Workshop schedule"
    },
    {
        "query": "신입 FC 시험 일정",
        "expected_namespace": "hof-knowledge-base-max",
        "description": "Exam schedule"
    }
]

print("="*80)
print("RAG CHATBOT - NAMESPACE SELECTION TEST")
print("="*80)

for idx, test in enumerate(test_queries, 1):
    print(f"\n{'='*80}")
    print(f"TEST {idx}/{len(test_queries)}: {test['description']}")
    print(f"Query: {test['query']}")
    print(f"Expected Namespace: {test['expected_namespace']}")
    print(f"{'='*80}")

    # Run query (this will print namespace selection in the logs)
    answer = rag_answer(test['query'], top_k=5)

    print(f"\n📝 ANSWER:")
    print(answer)
    print(f"\n{'='*80}\n")

    # Pause between queries
    import time
    time.sleep(2)

print("\n" + "="*80)
print("✓ All tests completed!")
print("="*80)
