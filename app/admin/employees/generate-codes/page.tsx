/**
 * Employee Code Generation Page
 * Admin UI to generate codes for all 52 employees
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Key,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  Copy,
} from 'lucide-react';

interface GeneratedCode {
  sabon: string;
  name: string;
  code: string;
  namespace: string;
  vectors: number;
}

interface PopulateResult {
  success: boolean;
  message: string;
  summary: {
    totalEmployees: number;
    credentialsCreated: number;
    credentialsUpdated: number;
    credentialsSkipped: number;
    codesGenerated: number;
    errors: number;
  };
  codes: GeneratedCode[];
  errors: string[];
}

export default function GenerateCodesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PopulateResult | null>(null);

  const generateCodes = async () => {
    if (!confirm('모든 직원(52명)의 코드를 생성하시겠습니까?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/employees/populate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate codes');
      }

      setResult(data);
      alert(`성공적으로 ${data.summary.codesGenerated}개의 코드를 생성했습니다!`);
    } catch (error: any) {
      console.error('Generation error:', error);
      alert(error.message || '코드 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCodes = () => {
    if (!result) return;

    const csv = [
      'Employee ID,Name,Code,Namespace,Vector Count',
      ...result.codes.map(
        (c) => `${c.sabon},"${c.name}",${c.code},${c.namespace},${c.vectors}`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-codes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    alert('코드가 다운로드되었습니다.');
  };

  const copyAllCodes = () => {
    if (!result) return;

    const text = result.codes
      .map((c) => `${c.sabon} | ${c.name} | ${c.code} | ${c.namespace}`)
      .join('\n');

    navigator.clipboard.writeText(text);
    alert('모든 코드가 복사되었습니다.');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('코드가 복사되었습니다.');
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generate Employee Codes</h1>
        <p className="text-muted-foreground mt-1">
          52명의 직원을 위한 인증 코드 및 RAG 네임스페이스 생성
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Code Generation
          </CardTitle>
          <CardDescription>
            Master.md에서 52명의 직원에 대한 자격 증명 및 확인 코드 생성
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* What will happen */}
          <div className="space-y-3">
            <h3 className="font-semibold">이 작업은 다음을 수행합니다:</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                <strong>user_credentials</strong> 테이블에 52명의 직원 생성/업데이트
              </li>
              <li>
                각 직원에 대해 고유한 <strong>verification code</strong> 생성
              </li>
              <li>
                코드를 <strong>Pinecone namespace</strong>에 연결 (예: employee_J00124)
              </li>
              <li>
                <strong>RAG 액세스</strong> 활성화 및 벡터 수 설정
              </li>
              <li>관리자 패널에서 코드를 보고 배포할 수 있습니다</li>
            </ul>
          </div>

          {/* Safety notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>안전 알림:</strong> 이 작업은 멱등적입니다. 여러 번 실행해도
              안전하며 기존 코드는 보존됩니다.
            </AlertDescription>
          </Alert>

          {/* Generate Button */}
          <Button
            onClick={generateCodes}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                코드 생성 중...
              </>
            ) : (
              <>
                <Key className="mr-2 h-5 w-5" />
                52명의 직원 코드 생성
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.summary.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">직원</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Created</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {result.summary.credentialsCreated}
                </div>
                <p className="text-xs text-muted-foreground">새로 생성</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Updated</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {result.summary.credentialsUpdated}
                </div>
                <p className="text-xs text-muted-foreground">업데이트됨</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Codes</CardTitle>
                <Key className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {result.summary.codesGenerated}
                </div>
                <p className="text-xs text-muted-foreground">생성된 코드</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Errors</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.summary.errors}</div>
                <p className="text-xs text-muted-foreground">오류</p>
              </CardContent>
            </Card>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{result.errors.length}개의 오류 발생:</strong>
                <ul className="mt-2 list-disc list-inside text-sm">
                  {result.errors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>...외 {result.errors.length - 5}개</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {result.summary.errors === 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>성공!</strong> 모든 직원 코드가 성공적으로 생성되었습니다.
              </AlertDescription>
            </Alert>
          )}

          {/* Generated Codes Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>생성된 코드</CardTitle>
                  <CardDescription>
                    각 직원의 인증 코드 및 네임스페이스 정보
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyAllCodes} variant="outline" size="sm">
                    <Copy className="mr-2 h-4 w-4" />
                    전체 복사
                  </Button>
                  <Button onClick={downloadCodes} size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    CSV 다운로드
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[600px] overflow-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium w-[80px]">사번</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">이름</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">코드</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">네임스페이스</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">벡터</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.codes.map((code) => (
                      <tr key={code.sabon} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3 font-mono font-medium">
                          {code.sabon}
                        </td>
                        <td className="px-4 py-3">{code.name}</td>
                        <td className="px-4 py-3">
                          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                            {code.code}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs text-muted-foreground">
                            {code.namespace}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline">{code.vectors}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyCode(code.code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>다음 단계</CardTitle>
              <CardDescription>코드 생성 후 수행할 작업</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-semibold mb-2">1. 코드 배포</h4>
                <p className="text-sm text-muted-foreground">
                  이메일, 카카오톡 또는 기타 메신저를 통해 각 직원에게 코드를 전송합니다.
                </p>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-semibold mb-2">2. 등록 안내</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  직원이 카카오톡 채널에서 다음과 같이 등록하도록 안내:
                </p>
                <code className="block rounded bg-background p-2 text-sm">
                  /등록 [받은코드]
                </code>
              </div>

              <div className="rounded-lg bg-accent border border-border p-4">
                <h4 className="font-semibold mb-2">3. RAG 사용</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  등록 후 "/" 명령어로 급여 정보 조회:
                </p>
                <div className="space-y-1">
                  <code className="block rounded bg-background p-2 text-sm">
                    /내 최종지급액은?
                  </code>
                  <code className="block rounded bg-background p-2 text-sm">
                    /이번 달 수수료는?
                  </code>
                  <code className="block rounded bg-background p-2 text-sm">
                    /환수가 얼마야?
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
