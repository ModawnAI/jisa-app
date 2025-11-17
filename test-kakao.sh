#!/bin/bash

# Test KakaoTalk endpoint
echo "========================================"
echo "Testing KakaoTalk Endpoint"
echo "========================================"

# Test data - simulates KakaoTalk webhook
TEST_DATA='{
  "userRequest": {
    "utterance": "안녕하세요",
    "user": {
      "id": "test-user-123",
      "properties": {
        "nickname": "테스트유저"
      }
    },
    "callbackUrl": null
  },
  "bot": {
    "id": "test-bot",
    "name": "JISA Bot"
  }
}'

echo ""
echo "1. Testing localhost:3000 (Direct)"
echo "========================================"
curl -X POST http://localhost:3000/api/kakao/chat \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""
echo "2. Testing via nginx (https://jisa.flowos.work)"
echo "========================================"
curl -X POST https://jisa.flowos.work/api/kakao/chat \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "========================================"
echo "Test Complete"
echo "Check your npm run dev logs for verbose output"
echo "========================================"
