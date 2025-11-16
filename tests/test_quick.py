#!/usr/bin/env python3
"""Quick test of namespace selection."""

from rag_chatbot import rag_answer

print("="*80)
print("QUICK TEST: Hanwha Product Commission Query")
print("="*80)

query = "한화생명 레이디H보장보험 종합 익월 수수료율 알려줘"
print(f"\nQuery: {query}\n")

answer = rag_answer(query, top_k=5)

print(f"\n{'='*80}")
print("FINAL ANSWER:")
print(f"{'='*80}")
print(answer)
print(f"\n{'='*80}\n")
