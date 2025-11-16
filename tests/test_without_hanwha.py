#!/usr/bin/env python3
"""Test queries without explicitly mentioning 한화생명."""

from rag_chatbot import rag_answer

test_queries = [
    "레이디H보장보험 종합 익월 수수료율",
    "제로백H종신 20년납 수수료",
    "H건강플러스 1차시책",
    "Need AI 암보험 익월",
    "에이스H보장 본부시책 13차월"
]

for query in test_queries:
    print("="*80)
    print(f"Query: {query}")
    print("="*80)

    answer = rag_answer(query, top_k=5)

    print(f"\nAnswer Preview (first 200 chars):\n{answer[:200]}...\n")
    print("="*80 + "\n")

    import time
    time.sleep(1)
