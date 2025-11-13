/**
 * Register Page
 * User registration with access code and modern JISA theme
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Mail, Lock, User, Key, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    accessCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (formData.password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (!formData.accessCode) {
      setError('인증 코드를 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Verify access code
      const verifyResponse = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formData.accessCode }),
      });

      if (!verifyResponse.ok) {
        const verifyError = await verifyResponse.json();
        throw new Error(verifyError.error || '유효하지 않은 인증 코드입니다.');
      }

      const { role, tier, metadata } = await verifyResponse.json();

      // Step 2: Create Supabase auth user
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('회원가입에 실패했습니다.');
      }

      // Step 3: Create profile with role/tier from code
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: formData.email,
        full_name: formData.fullName,
        role: role || 'user',
        subscription_tier: tier || 'free',
        metadata: metadata || {},
      });

      if (profileError) {
        throw new Error('프로필 생성에 실패했습니다.');
      }

      // Step 4: Mark access code as used
      await fetch('/api/auth/use-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.accessCode,
          userId: authData.user.id,
        }),
      });

      console.log('Registration successful:', authData.user.id);

      // Redirect to login with success message
      router.push('/auth/login?registered=true');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || '회원가입에 실패했습니다. 다시 시도해주세요.');
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
            <UserPlus className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">지사 JISA</h1>
          <p className="text-muted-foreground font-medium">
            새 계정 만들기
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-card-foreground">회원가입</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              인증 코드가 필요합니다
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/50 rounded-lg flex items-start animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-sm font-medium text-card-foreground">
                이름
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="홍길동"
                  className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-lg
                             text-foreground placeholder:text-muted-foreground
                             focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                             transition-all duration-200"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-card-foreground">
                이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="example@company.com"
                  className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-lg
                             text-foreground placeholder:text-muted-foreground
                             focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                             transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-card-foreground">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="최소 8자 이상"
                  className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-lg
                             text-foreground placeholder:text-muted-foreground
                             focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                             transition-all duration-200"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                영문, 숫자, 특수문자 조합 권장
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-card-foreground">
                비밀번호 확인
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="비밀번호 재입력"
                  className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-lg
                             text-foreground placeholder:text-muted-foreground
                             focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                             transition-all duration-200"
                />
              </div>
            </div>

            {/* Access Code */}
            <div className="space-y-2">
              <label htmlFor="accessCode" className="block text-sm font-medium text-card-foreground">
                인증 코드
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  id="accessCode"
                  name="accessCode"
                  type="text"
                  value={formData.accessCode}
                  onChange={handleChange}
                  required
                  placeholder="HXK-9F2-M7Q-3WP"
                  className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-lg
                             text-foreground placeholder:text-muted-foreground font-mono uppercase
                             focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                             transition-all duration-200"
                />
              </div>
              <div className="mt-2 p-3 bg-accent rounded-lg border border-border">
                <p className="text-xs text-accent-foreground flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>관리자로부터 받은 인증 코드를 입력하세요. 코드는 역할과 구독 티어를 결정합니다.</span>
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 mt-6
                         bg-primary text-primary-foreground rounded-lg font-semibold
                         hover:bg-primary/90
                         active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary
                         transition-all duration-200 shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  회원가입
                </>
              )}
            </button>
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

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              이미 계정이 있으신가요?{' '}
              <Link
                href="/auth/login"
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                로그인
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground animate-in fade-in duration-700">
          <p className="font-semibold text-foreground">모드온 AI</p>
          <p className="mt-1 text-xs">벤처기업인증</p>
          <p className="mt-2 text-xs">대표: 정다운</p>
          <p className="text-xs">사업자등록번호: 145-87-03354</p>
          <p className="mt-2 text-xs">서울특별시 서초구 사평대로53길 94, 4층</p>
          <p className="mt-2 text-xs">연락처: <a href="mailto:info@modawn.ai" className="text-primary hover:text-primary/80 transition-colors">info@modawn.ai</a></p>
        </div>
      </div>
    </div>
  );
}
