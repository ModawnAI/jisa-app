/**
 * Login Page
 * User authentication with modern UI and JISA theme
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@modawn.ai');
  const [password, setPassword] = useState('AdminJISA2025!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('로그인에 실패했습니다.');
      }

      console.log('Login successful:', data.user.id);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-background to-accent flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8 animate-in fade-in duration-500">
          <div className="inline-block p-3 bg-primary rounded-2xl mb-4">
            <svg className="w-12 h-12 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">지사 JISA</h1>
          <p className="text-muted-foreground font-medium">
            KakaoTalk RAG 챗봇 관리 시스템
          </p>
        </div>

        {/* Login Card */}
        <Card className="animate-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle className="text-2xl">관리자 로그인</CardTitle>
            <CardDescription>
              관리자 계정으로 로그인하세요
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@jisa.app"
                    className="pl-11 h-11 bg-background"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="pl-11 h-11 bg-background"
                  />
                </div>
              </div>

              {/* Remember Me / Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center group cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary border-border rounded
                               focus:ring-2 focus:ring-ring focus:ring-offset-0
                               cursor-pointer transition-colors"
                  />
                  <span className="ml-2 text-muted-foreground group-hover:text-foreground transition-colors">
                    로그인 상태 유지
                  </span>
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  비밀번호 찾기
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11"
                size="lg"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    로그인
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">또는</span>
              </div>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                계정이 없으신가요?{' '}
                <Link
                  href="/auth/register"
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  회원가입
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground animate-in fade-in duration-700">
          <p className="font-semibold text-foreground">모드온 AI</p>
          <p className="mt-1 text-xs">벤처기업인증</p>
          <p className="mt-2 text-xs">대표: 정다운</p>
          <p className="text-xs">사업자등록번호: 145-87-03354</p>
          <p className="mt-2 text-xs">서울특별시 서초구 사평대로53길 94, 4층</p>
          <p className="mt-2 text-xs">E: <a href="mailto:info@modawn.ai" className="text-primary hover:text-primary/80 transition-colors">info@modawn.ai</a></p>
        </div>
      </div>
    </div>
  );
}
