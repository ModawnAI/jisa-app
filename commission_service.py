"""
Commission Service - Python Wrapper
Calls the Node.js commission query system and formats results
"""

import subprocess
import json
import os
from pathlib import Path

# Path to the commission system
COMMISSION_SYSTEM_PATH = Path(__file__).parent / "commission_query_system_dynamic"
COMMISSION_SCRIPT = COMMISSION_SYSTEM_PATH / "src" / "nl_query_system_dynamic.js"


def query_commission(user_query: str) -> dict:
    """
    Query the commission system

    Args:
        user_query: User's question about insurance commission

    Returns:
        dict with commission results or error
    """
    try:
        print(f"[Commission] Querying: {user_query}")

        # Create a temporary script to run the commission query
        temp_script = COMMISSION_SYSTEM_PATH / "temp_query.js"
        script_content = f"""
import {{ NaturalLanguageCommissionSystem }} from './src/nl_query_system_dynamic.js';

async function main() {{
    const system = new NaturalLanguageCommissionSystem();
    const result = await system.executeQuery('{user_query}');
    console.log('__RESULT_START__');
    console.log(JSON.stringify(result, null, 2));
    console.log('__RESULT_END__');
}}

main().catch(error => {{
    console.error('Error:', error);
    process.exit(1);
}});
"""

        # Write temporary script
        temp_script.write_text(script_content, encoding='utf-8')

        # Run the Node.js script (use full path to node)
        result = subprocess.run(
            ['/opt/bitnami/node/bin/node', str(temp_script)],
            cwd=str(COMMISSION_SYSTEM_PATH),
            capture_output=True,
            text=True,
            timeout=30
        )

        # Clean up temp file
        if temp_script.exists():
            temp_script.unlink()

        # Parse output
        output = result.stdout

        # Extract JSON result
        if '__RESULT_START__' in output and '__RESULT_END__' in output:
            start_idx = output.index('__RESULT_START__') + len('__RESULT_START__')
            end_idx = output.index('__RESULT_END__')
            json_str = output[start_idx:end_idx].strip()

            commission_result = json.loads(json_str)
            print(f"[Commission] Query successful: {commission_result['status']}")
            return commission_result
        else:
            print(f"[Commission] Failed to parse output")
            print(f"[Commission] stdout: {output}")
            print(f"[Commission] stderr: {result.stderr}")
            return {
                'status': 'error',
                'message': '수수료 정보를 가져오는 데 실패했습니다.',
                'error': 'Parse error'
            }

    except subprocess.TimeoutExpired:
        print("[Commission] Timeout error")
        return {
            'status': 'error',
            'message': '수수료 조회 시간이 초과되었습니다.',
            'error': 'Timeout'
        }
    except Exception as e:
        print(f"[Commission] Error: {e}")
        return {
            'status': 'error',
            'message': '수수료 조회 중 오류가 발생했습니다.',
            'error': str(e)
        }


def format_commission_for_gpt(result: dict) -> str:
    """
    Format commission result as context for GPT (plain text, no emojis, no technical details)

    Args:
        result: Commission query result

    Returns:
        Formatted context string for GPT
    """
    if result['status'] == 'error':
        return f"수수료 조회 오류: {result.get('message', '수수료 정보를 찾을 수 없습니다.')}"

    lines = []

    # Best match product
    best_match = result['best_match']
    lines.append("=== 수수료 조회 결과 ===")
    lines.append("")
    lines.append(f"상품명: {best_match['product_name']}")
    lines.append(f"보험회사: {best_match['company']}")
    lines.append(f"납입기간: {best_match['payment_period']}")

    # Add 환산율 (conversion rate) if available - as raw decimal for GPT to convert
    metadata = best_match.get('metadata', {})
    if '환산율' in metadata:
        conversion_rate = metadata['환산율']
        lines.append(f"환산율: {conversion_rate}")

    lines.append("")

    # Commission data - NO 배율, NO 공식
    comm_data = result['commission_data']
    percentage = result['percentage']
    lines.append(f"수수료율 ({percentage}% 기준):")
    lines.append("")

    # Commission rates details - FILTER OUT col_X and only show meaningful keys
    rates = list(comm_data['product']['commission_rates'].items())

    # Filter out technical column names and only keep meaningful keys
    meaningful_rates = []
    for key, value in rates:
        # Skip col_X pattern keys (most common unwanted keys)
        if key.startswith('col_') or key.startswith('Col_'):
            continue
        meaningful_rates.append((key, value))

    # Show only meaningful rates with cleaner key names
    for key, value in meaningful_rates:
        # Clean up key name: remove technical patterns like "2025년 FC 수수료_0.6_0.6_"
        clean_key = key
        if '_0.6_0.6_' in clean_key:
            clean_key = clean_key.split('_0.6_0.6_')[-1]  # Take part after the pattern
        if '2025년 FC 수수료_' in clean_key:
            clean_key = clean_key.replace('2025년 FC 수수료_', '')

        lines.append(f"{clean_key}: {value}")

    lines.append("")

    return '\n'.join(lines)


def format_commission_result(result: dict) -> str:
    """
    Format commission result as Kakao message text (DEPRECATED - use GPT instead)

    Args:
        result: Commission query result

    Returns:
        Formatted message string
    """
    if result['status'] == 'error':
        return f"❌ {result.get('message', '수수료 정보를 찾을 수 없습니다.')}\n\n오류: {result.get('error', 'Unknown')}"

    lines = []

    # Header
    lines.append("💰 수수료 조회 결과")
    lines.append("━━━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("")

    # Best match
    best_match = result['best_match']
    lines.append(f"🎯 최적 매칭 상품 (일치도: {best_match['match_score']:.2f})")
    lines.append(f"  · 상품명: {best_match['product_name'][:50]}...")
    lines.append(f"  · 회사: {best_match['company']}")
    lines.append(f"  · 납입기간: {best_match['payment_period']}")
    lines.append("")

    # Commission info
    comm_data = result['commission_data']
    percentage = result['percentage']
    lines.append(f"📊 수수료 정보 ({percentage}%)")
    lines.append(f"  · 배율: {comm_data['multiplier_ratio']:.6f}x")
    lines.append(f"  · 계산식: {comm_data['calculation_formula']}")
    lines.append("")

    # Commission rates (top 5)
    lines.append("💵 수수료율 상세 (상위 5개)")
    rates = list(comm_data['product']['commission_rates'].items())[:5]
    for key, value in rates:
        lines.append(f"  · {key}: {value:.5f}")

    total_rates = len(comm_data['product']['commission_rates'])
    if total_rates > 5:
        lines.append(f"  ... 외 {total_rates - 5}개 항목")

    lines.append("")

    # Alternatives
    if result.get('alternatives') and len(result['alternatives']) > 0:
        lines.append("🔍 기타 유사 상품")
        for i, alt in enumerate(result['alternatives'][:2], 1):
            lines.append(f"  {i}. {alt['product_name'][:40]}...")
            lines.append(f"     {alt['company']} | {alt['payment_period']}")
        lines.append("")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━━━")

    return '\n'.join(lines)


if __name__ == "__main__":
    # Test
    test_query = "약속플러스 5년납 60%"
    print(f"Testing commission query: {test_query}")
    print("=" * 80)

    result = query_commission(test_query)
    formatted = format_commission_result(result)

    print(formatted)
