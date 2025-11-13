##### 기본 정보 설정 단계
# import
from fastapi import Request, FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import openai
from openai import OpenAI
from google import genai
from google.genai import types
import threading   # 동시에 여러 작업(그림 생성, 카카오톡 메시지 전송)을 가능하게 하는 패키지
import time
import queue as q   # 카카오톡 답변을 큐에 저장함
import os    # 답변 결과를 텍스트 파일로 저장할 때 저장 경로 생성하는데 사용.
import requests
import asyncio
import aiohttp
import json
import tempfile
import shutil
from dotenv import load_dotenv
from pinecone_helper import query_pinecone, format_pinecone_results_for_gpt
from rag_chatbot import rag_answer
from commission_detector import detect_commission_query
from commission_service import query_commission, format_commission_for_gpt

# Load environment variables
load_dotenv()

# API Keys
API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

##### 기능함수 구현 단계 #####

# 메시지 전송
# ChatGPT의 답변을 카카오톡 서버로 전달하기 위한 함수.
def textReponseFormat(bot_response):
    response = {"version": "2.0", "template": {"outputs": [{"simpleText": {"text": bot_response}}], "quickReplies":[]}}

    return response


# 응답 초과 시 답변
# 답변 시간이 지연되면 지연 안내 메시지를 보내고, 답변을 요청하기 위한 버튼 생성 함수
def timeover():
    response = {"version": "2.0", "template":{
        "outputs":[
            {
                "simpleText": {
                    "text":"아직 제가 생각이 끝나지 않았어요.🙍‍♂️🙍‍♂️ \n잠시 후 아래 말풍선을 눌러주세요👆"
                }
            }
        ],
        "quickReplies":[
            {
                "action":"message",                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
                "label":"생각 다 끝났나요?🙋‍♂️",  # 버튼에 출력할 텍스트트
                "messageText": "생각 다 끝났나요?"  # 버튼을 클릭했을 때 채팅창에 생성되는 메시지
            }
        ]
    }}

    return response

# ChatGPT에게 질문/답변 받기 - NEW VERSION WITH COMMISSION DETECTION
def getTextFromGPT(prompt):
    """
    Uses commission detection first, then RAG chatbot
    - If commission query detected: routes to commission system
    - Otherwise: uses RAG chatbot with Gemini Flash + Pinecone + Gemini 2.5 Pro
    """
    # === STEP 1: Commission Detection ===
    print("=" * 80)
    print("🔍 Step 1: Commission Detection")
    detection_result = detect_commission_query(prompt)
    print(f"   Is Commission Query: {detection_result['is_commission_query']}")
    print(f"   Confidence: {detection_result['confidence']:.2f}")
    print(f"   Matched Keywords: {detection_result['matched_keywords']}")
    print(f"   Reasoning: {detection_result['reasoning']}")
    print("=" * 80)

    # === STEP 2: Route Based on Detection ===
    if detection_result['is_commission_query'] and detection_result['confidence'] >= 0.5:
        print("🎯 Routing to COMMISSION SYSTEM")
        print("=" * 80)
        try:
            # Query commission system
            commission_result = query_commission(prompt)

            # Format commission data as context for GPT (no emojis, plain text)
            commission_context = format_commission_for_gpt(commission_result)
            print(f"✅ Commission data retrieved")
            print(f"📝 Commission context length: {len(commission_context)} characters")

            # Create commission-specific system prompt
            system_prompt = f"""너는 한국 보험 수수료 전문가 AI 어시스턴트입니다.

참조 정보 (보험 수수료 데이터베이스):
{commission_context}

답변 지침:
1. **반드시 한국어로만** 답변하세요

2. **CRITICAL: 모든 숫자는 백분율(%)로 변환**
   - 참조 정보의 모든 값에 100을 곱하세요
   - 변환 예시:
     * 0.405 → 40.5%
     * 1.76346 → 176.35%
     * 2.91582 → 291.58%
     * 3.64478 → 364.48%
     * 4.85970 → 485.97%
     * 7.28955 → 728.96%
     * 9.71940 → 971.94%
     * 8.0 → 800% (NOT 8.0!)
   - 규칙: 값 × 100 = 백분율
   - 1.0 = 100%, 2.0 = 200%, 0.5 = 50%, 8.0 = 800%

3. **응답 형식** (간결하고 명확하게):
[상품명]
회사: [회사명]
환산율: [X]%
초년도 익월: [Y]%
2차년도: [Z]%
Total: [W]%

4. **절대 금지 사항 (CRITICAL - 위반시 응답 거부)**:
   - ❌ 컬럼/필드 이름: col_8, col_19, col_20~col_43 같은 기술 용어 절대 사용 금지
   - ❌ 수식/계산: "계산식", "공식", "배율", "×", "÷" 같은 표현 금지
   - ❌ 분석 용어: "분포", "합산", "패턴", "구간" 사용 금지
   - ❌ 소수점 표시: 0.08148, 2.50842 같은 소수 형식 금지 (무조건 % 변환)
   - ❌ 기술 설명: 데이터 구조, 테이블 구조 설명 금지
   - ❌ 실무 팁: "실무 활용 팁", "비교", "판단" 같은 조언 금지
   - ❌ 유사 상품: 다른 상품 추천/나열 금지

5. **응답 방식**:
   - 사용자가 요청한 상품의 수수료율만 백분율로 간단히 제시
   - 있는 데이터만 표시 (없으면 "해당 정보 없음"이라고만 표시)
   - 추가 설명, 해석, 분석 일체 금지

6. 답변 끝에 출처 추가: 📚 출처: 보험수수료 데이터베이스
"""

            # Call Gemini with commission context
            print("=" * 80)
            print("🤖 Gemini 요청 시작 (Commission)")
            print(f"📝 사용자 질문: {prompt}")
            print(f"🧠 시스템 프롬프트 길이: {len(system_prompt)} 문자")

            # Use Gemini Flash Latest
            client = genai.Client(api_key=GEMINI_API_KEY)
            model = "gemini-flash-latest"

            # Combine system prompt and user query
            full_prompt = f"{system_prompt}\n\n사용자 질문: {prompt}"

            # Create contents with proper structure
            contents = [
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=full_prompt)]
                )
            ]

            # Configure with ultrathink (maximum thinking budget)
            config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=10000),  # UltraThink mode
                image_config=types.ImageConfig(image_size="1K")
            )

            # Stream response
            content = ""
            for chunk in client.models.generate_content_stream(
                model=model,
                contents=contents,
                config=config
            ):
                if chunk.text:
                    content += chunk.text

            print("✅ Gemini 응답 수신 완료 (Commission)")
            print(f"✅ Commission GPT response extracted: {len(content)} characters")

            if content and content.strip():
                return content
            else:
                print("❌ Failed to extract GPT response")
                raise Exception("No content in GPT response")

        except Exception as e:
            print(f"❌ Commission 시스템 오류: {e}")
            print("⚠️ Fallback to RAG...")
            # Fall through to RAG system

    # === STEP 3: Use RAG System (Default) ===
    print("📚 Routing to RAG SYSTEM")
    print("=" * 80)
    try:
        # Use the new RAG chatbot with top 10 retrieval
        answer = rag_answer(prompt, top_k=10)
        return answer
    except Exception as e:
        print(f"❌ RAG 챗봇 오류: {e}")
        print("⚠️ Fallback to old Pinecone method...")

        # Fallback to old method if RAG fails
        pinecone_results = query_pinecone(prompt, top_k=10, rerank_top_n=5)
    
    if pinecone_results:
        # Pinecone 결과를 GPT용 컨텍스트로 포맷팅
        reference_content = format_pinecone_results_for_gpt(pinecone_results)
        print(f"✅ Pinecone에서 {len(pinecone_results)}개의 관련 정보 찾음")
        
        # Extract only one source and one URL from the top Pinecone result
        source = ""
        source_url = ""
        if pinecone_results:
            source = pinecone_results[0].get('source', '')
            source_url = pinecone_results[0].get('source_url', '')
        
        # Format sources with URLs
        sources_text_parts = []
        if source:
            sources_text_parts.append(f"📚 출처: {source}")
        if source_url:
            sources_text_parts.append(f"🔗 참조링크: {source_url}")
        
        sources_text = "\n".join(sources_text_parts) if sources_text_parts else ""
    else:
        # Pinecone 결과가 없어도 일반 지식으로 답변
        reference_content = "참조 데이터베이스에 직접적인 관련 정보가 없습니다. 마케팅 전문가로서의 일반적인 지식과 베스트 프랙티스를 바탕으로 답변해주세요."
        sources_text = ""
        print("⚠️ Pinecone에서 관련 정보를 찾지 못함 - 일반 지식으로 답변 시도")
    
    system_prompt = f"""너는 한국 마케팅 전문가 AI 어시스턴트입니다.
    사용자의 질문에 대해 전문적이고 실용적인 답변을 제공하세요.
    
    참조 정보 (실제 마케팅 전문가들의 Q&A):
    {reference_content}
    
    답변 지침:
    1. **반드시 한국어로만** 답변하세요
    2. **300-500자로 상세하게** 답변하세요 (짧은 답변 금지!)
    3. **사용자의 질문을 깊이 이해하고 확장**하여 답변하세요
    4. 참조 정보가 있다면 이를 활용하되, **당신의 전문 지식과 결합**하여 더 포괄적인 답변을 제공하세요
    5. 참조 정보가 불충분하거나 없어도, **마케팅 전문가로서의 일반적인 지식과 베스트 프랙티스**를 바탕으로 답변하세요
    6. 구체적인 예시, 단계별 설명, 실행 가능한 조언을 반드시 포함하여 답변을 풍부하게 하세요
    7. 여러 참조가 있다면 핵심을 종합하고, 추가적인 인사이트를 더하세요
    8. 친절하고 전문적인 톤을 유지하세요
    9. 답변 끝에 출처 정보를 추가하세요: {sources_text}
    
    답변 접근법:
    - 질문의 본질적인 의도를 파악하세요
    - 참조 정보 + 일반 마케팅 지식을 통합하세요
    - 실용적이고 행동 가능한 조언을 제공하세요
    - 필요시 관련된 트렌드나 추가 고려사항을 언급하세요
    
    답변 형식:
    [200자 이내의 명확하고 확장된 전문가 답변]
    
    {sources_text}"""

    client = OpenAI(api_key=API_KEY, timeout=60.0)  # Increased timeout for chat
    
    try:
        # Enhanced OpenAI Responses API with reasoning and better logging
        print("=" * 80)
        print("🤖 GPT 요청 시작")
        print(f"📝 사용자 질문: {prompt}")
        print(f"🧠 시스템 프롬프트 길이: {len(system_prompt)} 문자")
        print(f"⏰ 요청 시간: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Prepare input with system and user messages
        input_messages = [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user", 
                "content": prompt
            }
        ]
        
        print(f"📨 입력 메시지 수: {len(input_messages)}")
        
        response = client.responses.create(
            model="gpt-5-nano",
            input=input_messages,
            text={
                "format": {
                    "type": "text"
                },
                "verbosity": "medium"
            },
            reasoning={
                "effort": "medium"
            },
            tools=[],
            store=True
        )
        
        print("✅ GPT 응답 수신 완료")
        print(f"🔍 응답 타입: {type(response)}")
        print(f"📊 응답 속성: {dir(response)}")
        
        # Enhanced response debugging
        if hasattr(response, '__dict__'):
            print(f"📋 응답 전체 구조: {response.__dict__}")
        
        # Try multiple extraction methods
        content = None
        extraction_method = "unknown"
        
        # Method 1: Check for output attribute
        if hasattr(response, 'output') and response.output:
            print("🔄 추출 방법 1: output 속성 사용")
            if isinstance(response.output, list) and len(response.output) > 0:
                # Look for message type in output array
                print(f"   📊 총 output 항목 수: {len(response.output)}")
                for i, output_item in enumerate(response.output):
                    item_type = type(output_item).__name__
                    item_obj_type = getattr(output_item, 'type', 'no_type_attr')
                    print(f"   📋 output[{i}] 클래스: {item_type}, type 속성: {item_obj_type}")
                    
                    # Show all attributes for debugging
                    if hasattr(output_item, '__dict__'):
                        attrs = list(output_item.__dict__.keys())[:5]  # First 5 attributes
                        print(f"   🔍 output[{i}] 주요 속성: {attrs}")
                    
                    if hasattr(output_item, 'type') and output_item.type == 'message':
                        print(f"   ✅ 메시지 타입 발견: output[{i}]")
                        if hasattr(output_item, 'content') and output_item.content:
                            if isinstance(output_item.content, list) and len(output_item.content) > 0:
                                text_item = output_item.content[0]
                                if hasattr(text_item, 'text'):
                                    content = text_item.text
                                    extraction_method = f"output[{i}].content[0].text"
                                    break
                                else:
                                    print(f"   ⚠️ text_item 속성: {dir(text_item)}")
                    elif hasattr(output_item, 'text') and output_item.text:
                        content = output_item.text
                        extraction_method = f"output[{i}].text"
                        print(f"   ✅ 텍스트 발견: output[{i}].text")
                        break
                    elif hasattr(output_item, 'content') and output_item.content:
                        # Try to extract from content if it's a string
                        if isinstance(output_item.content, str):
                            content = output_item.content
                            extraction_method = f"output[{i}].content"
                            print(f"   ✅ 콘텐츠 발견: output[{i}].content")
                            break
                        # Try to extract from content if it's a list with text items
                        elif isinstance(output_item.content, list) and len(output_item.content) > 0:
                            for j, content_item in enumerate(output_item.content):
                                if hasattr(content_item, 'text') and content_item.text:
                                    content = content_item.text
                                    extraction_method = f"output[{i}].content[{j}].text"
                                    print(f"   ✅ 중첩 텍스트 발견: output[{i}].content[{j}].text")
                                    break
                            if content:
                                break
                
                # Fallback to first item if no message found
                if not content:
                    output_item = response.output[0]
                    content = str(output_item)
                    extraction_method = "output[0] string conversion"
            else:
                content = str(response.output)
                extraction_method = "output string conversion"
        
        # Method 2: Check for text attribute
        elif hasattr(response, 'text'):
            print("🔄 추출 방법 2: text 속성 사용")
            content = response.text
            extraction_method = "direct text attribute"
        
        # Method 3: Check for choices (like chat completions)
        elif hasattr(response, 'choices') and response.choices:
            print("🔄 추출 방법 3: choices 속성 사용")
            if len(response.choices) > 0 and hasattr(response.choices[0], 'message'):
                content = response.choices[0].message.content
                extraction_method = "choices[0].message.content"
        
        # Method 4: String conversion fallback
        else:
            print("🔄 추출 방법 4: 전체 응답 문자열 변환")
            content = str(response)
            extraction_method = "full response string conversion"
        
        print(f"🎯 사용된 추출 방법: {extraction_method}")
        print(f"📝 추출된 내용 미리보기: '{content[:100] if content else 'None'}...'")
        print(f"📏 응답 길이: {len(content) if content else 0} 문자")
        
        # Check for reasoning if available
        if hasattr(response, 'reasoning'):
            print(f"🧠 추론 정보 포함됨: {response.reasoning}")
        
        print("=" * 80)
        
        if content and content.strip():
            return content
        else:
            print("❌ 빈 응답 감지")
            return "죄송합니다. GPT에서 빈 응답을 받았습니다. 다시 시도해주세요."
            
    except Exception as e:
        print("=" * 80)
        print(f"❌ GPT 응답 오류 발생")
        print(f"🚨 오류 타입: {type(e).__name__}")
        print(f"📄 오류 메시지: {str(e)}")
        print(f"⏰ 오류 시간: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        return "죄송합니다. 답변을 생성하는 중 오류가 발생했습니다."


# 텍스트 파일 초기화
# 메인 함수에서 3.5초 이후에 생성된 답변 또는 그림 정보는 임시로 저장함.
# 사용자에게 답변을 전송한 후에는 필요가 없으므로 이미시 저장 정보 초기화함.
def dbReset(filename):
    with open(filename, 'w') as f:
        f.write("")

# Callback 처리 함수
async def send_callback_response(callback_url, response_text):
    """
    콜백 URL로 응답을 전송합니다.
    
    Args:
        callback_url (str): 카카오에서 제공한 콜백 URL
        response_text (str): 전송할 응답 텍스트
    """
    try:
        print(f"콜백 응답 전송 시작: {callback_url}")
        
        # 카카오 챗봇 콜백 응답 형식에 맞게 설정
        response_data = {
            "version": "2.0",
            "template": {
                "outputs": [
                    {
                        "simpleText": {
                            "text": response_text
                        }
                    }
                ]
            }
        }
        
        headers = {
            'Content-Type': 'application/json',
        }
        print("응답 데이터:", json.dumps(response_data, ensure_ascii=False)[:200] + "...")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(callback_url, json=response_data, headers=headers) as resp:
                if resp.status == 200:
                    print(f"콜백 응답 전송 성공: {callback_url}")
                    response_text = await resp.text()
                    print(f"콜백 응답: {response_text}")
                else:
                    response_text = await resp.text()
                    print(f"콜백 응답 전송 실패: {resp.status}, {response_text}")
    except Exception as e:
        print(f"콜백 응답 전송 중 오류 발생: {e}")

async def process_callback_response(callback_url, question, delay_seconds=2):
    """
    GPT로 답변을 생성하고 콜백 URL로 전송하는 비동기 함수
    
    Args:
        callback_url (str): 카카오에서 제공한 콜백 URL
        question (str): 사용자의 질문
        delay_seconds (int): 지연 시간(초)
    """
    try:
        # 실제 처리 전 대기 시간 (선택적)
        await asyncio.sleep(delay_seconds)
        
        # GPT로 답변 생성
        print(f"질문: {question}에 대한 GPT 응답 생성 중...")
        answer = getTextFromGPT(question)
        print(f"생성된 답변: {answer[:100]}...")
        
        # 빈 답변이면 기본 메시지로 대체
        if not answer or answer.strip() == "":
            answer = "죄송합니다. 답변을 생성하는 중 문제가 발생했습니다. 다시 시도해주세요."
            print("빈 답변 감지, 기본 메시지로 대체")
        
        # 콜백 URL로 응답 전송
        await send_callback_response(callback_url, answer)
        print(f"GPT 응답 전송 완료")
    except Exception as e:
        error_message = f"GPT 응답 처리 중 오류 발생: {str(e)}"
        print(error_message)
        # 오류 발생 시에도 사용자에게 응답
        await send_callback_response(callback_url, f"죄송합니다. 답변을 생성하는 중 오류가 발생했습니다: {str(e)}")

def processCallback(callback_data):
    # Callback에서 받은 데이터 처리
    user_id = callback_data.get('userRequest', {}).get('user', {}).get('id', 'unknown')
    utterance = callback_data.get('userRequest', {}).get('utterance', '')
    
    print(f"Processing callback for user {user_id}: {utterance}")
    
    # ChatGPT 응답 생성
    bot_response = getTextFromGPT(utterance)
    response = textReponseFormat(bot_response)
    
    return response

# PDF 처리 함수
def process_pdf_with_openai(file_path: str) -> str:
    """PDF 파일을 OpenAI responses API로 직접 처리"""
    try:
        client = OpenAI(api_key=API_KEY, timeout=300.0)  # Increased to 5 minutes
        
        # 1. 파일을 OpenAI에 업로드
        with open(file_path, 'rb') as file:
            uploaded_file = client.files.create(
                file=file,
                purpose='assistants'
            )
        
        # 2. 업로드된 파일 ID를 사용하여 responses API 호출
        response = client.responses.create(
            model="gpt-4.1",
            input=[
                {
                    "role": "user",
                    "content": [
                        { 
                            "type": "input_text", 
                            "text": "이 PDF 파일의 내용을 한국어로 엄청 자세하게 요약해주세요. 주요 내용과 핵심 포인트를 모두 포함해주세요." 
                        },
                        {
                            "type": "input_file",
                            "file_id": uploaded_file.id
                        }
                    ]
                }
            ]
        )
        
        # 3. 업로드된 파일 삭제 (정리)
        try:
            client.files.delete(uploaded_file.id)
        except:
            pass  # 삭제 실패해도 계속 진행
        
        # 4. 응답에서 텍스트 추출
        if hasattr(response, 'output') and response.output:
            if isinstance(response.output, list) and len(response.output) > 0:
                output_item = response.output[0]
                if hasattr(output_item, 'text'):
                    return output_item.text
                elif hasattr(output_item, 'content'):
                    return output_item.content
                else:
                    return str(output_item)
            else:
                return str(response.output)
        elif hasattr(response, 'text'):
            return response.text
        else:
            return str(response)
            
    except Exception as e:
        error_msg = str(e)
        print(f"PDF 처리 오류: {error_msg}")
        
        # 타임아웃 에러에 대한 구체적인 메시지
        if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
            return f"PDF 처리 시간이 초과되었습니다. 파일이 너무 크거나 복잡할 수 있습니다. 다시 시도해주세요."
        else:
            return f"PDF 처리 중 오류가 발생했습니다: {error_msg}"

def append_to_reference_file(content: str, pdf_filename: str, filename: str = "reference.txt"):
    """추출된 내용을 reference.txt 파일에 추가 (깔끔한 텍스트만)"""
    try:
        file_path = os.path.join(os.path.dirname(__file__), filename)
        
        # 현재 시간을 한국어 형식으로 생성
        import datetime
        now = datetime.datetime.now()
        
        # 요일 한국어 변환
        weekdays = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
        weekday_kr = weekdays[now.weekday()]
        
        # 오전/오후 구분
        if now.hour < 12:
            ampm = "오전"
            hour_12 = now.hour if now.hour != 0 else 12
        else:
            ampm = "오후"
            hour_12 = now.hour if now.hour <= 12 else now.hour - 12
        
        # 한국어 시간 형식 생성
        korean_time = f"{now.year}년 {now.month}월 {now.day}일 ({weekday_kr}) {ampm} {hour_12}시 {now.minute}분"
        
        # 기존 내용 읽기
        existing_content = ""
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                existing_content = f.read()
                
        # 기존 타임스탬프 업데이트
        if "최종 업데이트:" in existing_content:
            # 기존 타임스탬프 라인을 새로운 시간으로 교체
            lines = existing_content.split('\n')
            for i, line in enumerate(lines):
                if line.startswith("최종 업데이트:"):
                    lines[i] = f"최종 업데이트: {korean_time}"
                    break
            existing_content = '\n'.join(lines)
        else:
            # 타임스탬프가 없으면 맨 앞에 추가
            timestamp_header = f"최종 업데이트: {korean_time}\n참조 파일: reference.txt\n\n"
            existing_content = timestamp_header + existing_content
        
        # ResponseOutputText 형태의 내용에서 실제 텍스트만 추출
        clean_text = content
        
        # ResponseOutputText 패턴이 있으면 텍스트만 추출
        print(f"🔍 원본 내용 미리보기: {content[:200]}...")
        
        if "[ResponseOutputText(" in content and "text='" in content:
            try:
                import re
                
                # ResponseOutputText 전체 구조에서 text 부분만 추출
                # [ResponseOutputText(annotations=[], text='실제내용', type='output_text', logprobs=[])]
                pattern = r"text='(.*?)'(?:,\s*type='output_text')"
                match = re.search(pattern, content, re.DOTALL)
                
                if match:
                    clean_text = match.group(1)
                    # 이스케이프된 문자들 복원
                    clean_text = clean_text.replace("\\'", "'")
                    clean_text = clean_text.replace('\\"', '"')
                    clean_text = clean_text.replace('\\n', '\n')
                    clean_text = clean_text.replace('\\t', '\t')
                    clean_text = clean_text.replace('\\r', '\r')
                    print(f"✅ 정규식으로 깔끔한 텍스트 추출 완료 (길이: {len(clean_text)})")
                    print(f"📝 추출된 텍스트 미리보기: {clean_text[:100]}...")
                else:
                    print("⚠️ 정규식 매칭 실패, 수동 추출 시도")
                    # 수동 추출 시도
                    start_marker = "text='"
                    start_idx = content.find(start_marker)
                    if start_idx != -1:
                        start_idx += len(start_marker)
                        
                        # 끝 패턴 찾기
                        end_marker = "', type='output_text'"
                        end_idx = content.find(end_marker, start_idx)
                        
                        if end_idx != -1:
                            clean_text = content[start_idx:end_idx]
                            # 이스케이프된 문자들 복원
                            clean_text = clean_text.replace("\\'", "'")
                            clean_text = clean_text.replace('\\"', '"')
                            clean_text = clean_text.replace('\\n', '\n')
                            clean_text = clean_text.replace('\\t', '\t')
                            clean_text = clean_text.replace('\\r', '\r')
                            print(f"✅ 수동 추출 성공 (길이: {len(clean_text)})")
                            print(f"📝 추출된 텍스트 미리보기: {clean_text[:100]}...")
                        else:
                            print("❌ 수동 추출도 실패")
                    else:
                        print("❌ text=' 마커를 찾을 수 없음")
                        
            except Exception as e:
                print(f"⚠️ 텍스트 추출 중 오류: {e}")
                
        elif "text='" in content:
            print("🔍 단순 text=' 패턴 감지, 추출 시도")
            try:
                start_marker = "text='"
                start_idx = content.find(start_marker)
                if start_idx != -1:
                    start_idx += len(start_marker)
                    
                    # 다양한 끝 패턴 시도
                    end_patterns = ["', type='output_text'", "', type=", "', logprobs=", "'$"]
                    end_idx = -1
                    
                    for pattern in end_patterns:
                        temp_idx = content.find(pattern, start_idx)
                        if temp_idx != -1:
                            end_idx = temp_idx
                            print(f"✅ 끝 패턴 발견: {pattern}")
                            break
                    
                    if end_idx != -1:
                        clean_text = content[start_idx:end_idx]
                        # 이스케이프된 문자들 복원
                        clean_text = clean_text.replace("\\'", "'")
                        clean_text = clean_text.replace('\\"', '"')
                        clean_text = clean_text.replace('\\n', '\n')
                        clean_text = clean_text.replace('\\t', '\t')
                        clean_text = clean_text.replace('\\r', '\r')
                        print(f"✅ 단순 패턴 추출 성공 (길이: {len(clean_text)})")
                        print(f"📝 추출된 텍스트 미리보기: {clean_text[:100]}...")
            except Exception as e:
                print(f"⚠️ 단순 패턴 추출 오류: {e}")
        else:
            print("ℹ️ ResponseOutputText 패턴이 없음, 원본 사용")
            
        print(f"🎯 최종 텍스트 길이: {len(clean_text)}")
        
        # 새 내용 추가 (파일명과 깔끔한 텍스트만)
        new_content = f"\n\nFILENAME: {pdf_filename}\n{clean_text}\n--- 내용 끝 ---\n"
        
        # 파일에 쓰기
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(existing_content + new_content)
        
        print(f"PDF 내용이 {filename}에 추가되었습니다 (파일명: {pdf_filename})")
        return True
        
    except Exception as e:
        print(f"파일 저장 오류: {e}")
        return False

##### (3) 서버 생성 단계
app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js 개발 서버
        "https://ann-inventional-marisela.ngrok-free.app",  # ngrok 도메인
        "https://*.ngrok-free.app",  # 모든 ngrok 도메인 허용
        "https://jisa.flowos.work",  # Production domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "kakaoTest"}

@app.post("/")    # POST to root when using --root-path /chat (becomes /chat/ externally)
async def chat_root(request: Request):
    kakaorequest = await request.json()
    return await mainChat(kakaorequest)   # 서버로 답변 전송

@app.post("/callback/")    # Callback URL for delayed responses
async def callback(request: Request):
    callback_data = await request.json()
    return processCallback(callback_data)

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """PDF 파일 업로드 및 처리 엔드포인트 (즉시 응답)"""
    try:
        # 파일 타입 검증
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            shutil.copyfileobj(file.file, tmp_file)
            tmp_file_path = tmp_file.name
        
        # 즉시 응답 반환 (백그라운드에서 처리)
        asyncio.create_task(process_pdf_background(tmp_file_path, file.filename))
        
        return {
            "message": "PDF upload successful, processing in background",
            "filename": file.filename,
            "status": "processing"
        }
            
    except Exception as e:
        print(f"PDF 업로드 오류: {e}")
        raise HTTPException(status_code=500, detail=f"PDF upload failed: {str(e)}")

async def process_pdf_background(tmp_file_path: str, filename: str):
    """백그라운드에서 PDF 처리"""
    try:
        print(f"🔄 백그라운드 PDF 처리 시작: {filename}")
        
        # PDF 처리
        extracted_content = process_pdf_with_openai(tmp_file_path)
        
        # reference.txt에 추가 (파일명과 함께)
        success = append_to_reference_file(extracted_content, filename)
        
        if success:
            print(f"✅ PDF 처리 완료: {filename}")
        else:
            print(f"❌ PDF 저장 실패: {filename}")
            
    except Exception as e:
        print(f"❌ 백그라운드 PDF 처리 오류: {e}")
    finally:
        # 임시 파일 삭제
        try:
            os.unlink(tmp_file_path)
            print(f"🗑️ 임시 파일 삭제: {tmp_file_path}")
        except:
            pass

##### (4) 메인 함수 구현 단계 #####

# 메인 함수
async def mainChat(kakaorequest):
    # 사용자 발화 텍스트 가져오기
    utterance = kakaorequest.get("userRequest", {}).get("utterance", "")
    # 카카오 callback URL 가져오기
    callback_url = kakaorequest.get("userRequest", {}).get("callbackUrl", "")
    
    print(f'사용자 질문: {utterance}')
    print(f'콜백 URL: {callback_url}')
    
    # 콜백 URL이 있는 경우 비동기 처리
    if callback_url:
        # 즉시 응답 반환 (useCallback 필수)
        temp_response = {
            "version": "2.0",
            "useCallback": True,
            "data": {
                "text": "질문에 대한 답변을 준비 중입니다. 잠시만 기다려주세요..."
            }
        }
        
        # 비동기 태스크 생성
        try:
            task = asyncio.create_task(process_callback_response(callback_url, utterance))
            print(f"비동기 GPT 응답 태스크 생성됨")
        except Exception as e:
            print(f"태스크 생성 중 오류 발생: {e}")
        
        return temp_response
    else:
        # 콜백 URL이 없는 경우 동기적으로 처리
        try:
            # 동기적으로 처리하기 위해 run_until_complete 사용
            answer = getTextFromGPT(utterance)
            
            # 카카오 챗봇 응답 형식
            response_body = {
                "version": "2.0",
                "template": {
                    "outputs": [
                        {
                            "simpleText": {
                                "text": answer
                            }
                        }
                    ]
                }
            }
            return response_body
        except Exception as e:
            # 오류 발생 시 응답
            error_message = f"답변을 생성하는 중 오류가 발생했습니다: {str(e)}"
            response_body = {
                "version": "2.0",
                "template": {
                    "outputs": [
                        {
                            "simpleText": {
                                "text": error_message
                            }
                        }
                    ]
                }
            }
            return response_body  

# ChatGPT답변/ DALL.E 사진 요청 및 응답 확인 함수
def responseOpenAI(request, response_queue, filename):
    # 사용자가 버튼을 클릭하여 답변 완성 여부를 요청한 경우
    if '생각 다 끝났나요?' in request["userRequest"]["utterance"]:
        # 텍스트 파일 열기
        with open(filename) as f:
            last_update = f.read()

        # 텍스트 파일 내 저장된 정보가 있을 경우 큐에 저장
        if len(last_update.split()) > 1:
            kind, bot_res, prompt = last_update.split()[0], last_update.split()[1], last_update.split()[2]
            response_queue.put(textReponseFormat(bot_res))
            dbReset(filename)

    # 일반 채팅인 경우 (모든 메시지를 ChatGPT에게 전달)
    else:
        dbReset(filename)
        prompt = request["userRequest"]["utterance"]
        print(f"Processing prompt: {prompt}")
        bot_res = getTextFromGPT(prompt)
        print(f"GPT response: {bot_res}")
        response_queue.put(textReponseFormat(bot_res))
        save_log = "ask " + str(bot_res) + " " + str(prompt)
        with open(filename, 'w') as f:
            f.write(save_log)