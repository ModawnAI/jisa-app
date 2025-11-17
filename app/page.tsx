export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold text-primary-600 mb-4">
        지사 (JISA)
      </h1>
      <p className="text-gray-600 text-center max-w-md">
        KakaoTalk RAG 챗봇 통합 관리 플랫폼
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/admin"
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          관리자
        </a>
        <a
          href="/api/kakao/chat"
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          API 테스트
        </a>
      </div>
    </main>
  )
}
