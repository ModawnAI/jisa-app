/**
 * Delete/Logout Page
 * Allows users to logout by visiting /delete
 * Useful for testing new codes or switching accounts
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2, CheckCircle } from 'lucide-react'

export default function DeletePage() {
  const router = useRouter()
  const [status, setStatus] = useState<'logging-out' | 'success' | 'error'>('logging-out')
  const [message, setMessage] = useState('로그아웃 처리 중...')

  useEffect(() => {
    handleLogout()
  }, [])

  const handleLogout = async () => {
    try {
      // Call logout API
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('로그아웃 실패')
      }

      setStatus('success')
      setMessage('로그아웃되었습니다!')

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch (err) {
      console.error('Logout error:', err)
      setStatus('error')
      setMessage('로그아웃 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 text-center">
          {status === 'logging-out' && (
            <>
              <div className="mb-6">
                <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                로그아웃 중...
              </h1>
              <p className="text-gray-600">
                계정에서 로그아웃하고 있습니다
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-6">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                로그아웃 완료!
              </h1>
              <p className="text-gray-600 mb-4">
                성공적으로 로그아웃되었습니다.
              </p>
              <p className="text-sm text-gray-500">
                로그인 페이지로 이동합니다...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6">
                <LogOut className="w-16 h-16 text-red-600 mx-auto" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                오류 발생
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                로그인 페이지로 이동
              </button>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            새 코드로 재등록하려면 로그아웃 후 다시 로그인하세요
          </p>
        </div>
      </div>
    </div>
  )
}
