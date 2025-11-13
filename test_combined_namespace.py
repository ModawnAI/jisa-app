#!/usr/bin/env python3
"""Test queries in combined hof-knowledge-base-max namespace."""

from rag_chatbot import rag_answer
import sys

# Test queries for Hanwha commission data
test_queries = [
    "한화생명 레이디H보장보험 종합 익월 수수료율은?",
    "한화생명 퇴직연금보험 FC시책 13차월 수수료는?",
    "한화생명 11월 시책 중 종합 익월이 7.5%인 상품은?",
    "일반적인 Ho&F 보험 상품 질문은?",  # Should work for general namespace too
]

print("="*80)
print("COMBINED NAMESPACE TEST - hof-knowledge-base-max")
print("="*80)
print("\nTesting both Hanwha and general queries in single namespace...\n")

for i, query in enumerate(test_queries, 1):
    print(f"\n{'='*80}")
    print(f"TEST {i}/4: {query}")
    print(f"{'='*80}")

    try:
        answer = rag_answer(query, top_k=5)
        print(f"\n✓ Query successful")
        print(f"Answer preview: {answer[:200]}...")
    except Exception as e:
        print(f"\n✗ Query failed: {e}")

    print()

print("\n" + "="*80)
print("✓ Combined namespace test complete!")
print("="*80)
