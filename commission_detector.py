"""
Commission Query Detector
Detects if a user query is related to insurance commission
"""

def detect_commission_query(query: str) -> dict:
    """
    Detect if a query is about commission

    Returns:
        dict with keys: is_commission_query, confidence, matched_keywords, reasoning
    """
    query_lower = query.lower().strip()
    matched_keywords = []
    strong_match = False

    # Keywords that indicate a commission query
    COMMISSION_KEYWORDS = [
        # Commission-related
        '수수료', '커미션', 'commission', '보험료', '수당',

        # Insurance types
        '종신보험', '변액연금', '건강보험', '실손보험', '암보험',
        '종신', '변액', '연금', '보험',

        # Common insurance products
        '약속플러스', '변액유니버셜', '무배당', '유니버셜', '어린이보험',

        # Companies
        'KB', '삼성', '미래에셋', '한화', '교보', '동양', '메트라이프',
        '처브', '라이나', '흥국', 'AIA', '푸르덴셜', 'DB',

        # Payment periods
        '년납', '일시납', '전기납', '평생납',

        # Percentage indicators
        '%', '프로', '퍼센트', '프로센트'
    ]

    # Strong indicators
    STRONG_INDICATORS = ['수수료', '커미션', 'commission', '%', '프로']

    # Check for keyword matches
    for keyword in COMMISSION_KEYWORDS:
        if keyword.lower() in query_lower:
            matched_keywords.append(keyword)
            if any(strong.lower() in keyword.lower() for strong in STRONG_INDICATORS):
                strong_match = True

    # Calculate confidence
    confidence = 0.0

    if strong_match:
        confidence = 0.9
    elif len(matched_keywords) >= 3:
        confidence = 0.8
    elif len(matched_keywords) >= 2:
        confidence = 0.6
    elif len(matched_keywords) == 1:
        confidence = 0.3

    # Check for percentage patterns
    import re
    percentage_pattern = re.compile(r'(\d+)\s*[%프프로센트]')
    if percentage_pattern.search(query_lower):
        confidence = max(confidence, 0.85)
        matched_keywords.append('percentage_indicator')

    # Check for product + percentage combination
    has_insurance = any(k in matched_keywords for k in ['종신보험', '변액연금', '보험'])
    has_percentage = percentage_pattern.search(query_lower) is not None

    if has_insurance and has_percentage:
        confidence = 0.95

    is_commission_query = confidence >= 0.5

    if is_commission_query:
        reasoning = f"발견된 키워드: {', '.join(matched_keywords)}. "
        if strong_match:
            reasoning += "강한 수수료 관련 키워드 발견."
        elif has_insurance and has_percentage:
            reasoning += "보험 상품과 퍼센트 조합 발견."
        else:
            reasoning += f"{len(matched_keywords)}개의 관련 키워드 발견."
    else:
        reasoning = "수수료 관련 키워드가 충분하지 않음."

    return {
        'is_commission_query': is_commission_query,
        'confidence': confidence,
        'matched_keywords': matched_keywords,
        'reasoning': reasoning
    }


if __name__ == "__main__":
    # Test cases
    test_queries = [
        "약속플러스 5년납 60%",
        "KB 종신보험 75% 수수료",
        "삼성 변액연금 85프로",
        "프레젠테이션 자료 찾아줘",
        "마케팅 전략"
    ]

    print("=" * 80)
    print("Commission Detection Test")
    print("=" * 80)

    for query in test_queries:
        result = detect_commission_query(query)
        print(f"\nQuery: {query}")
        print(f"  Is Commission: {result['is_commission_query']}")
        print(f"  Confidence: {result['confidence']:.2f}")
        print(f"  Keywords: {result['matched_keywords']}")
        print(f"  Reasoning: {result['reasoning']}")
