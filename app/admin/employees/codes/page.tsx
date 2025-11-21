/**
 * Employee Codes Page
 *
 * Displays all employee verification codes with their RAG namespace information.
 * Allows admins to view and distribute codes to employees.
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Download, Key, Users, CheckCircle, XCircle } from 'lucide-react';

interface EmployeeCode {
  code: string;
  employee_sabon: string;
  pinecone_namespace: string;
  intended_recipient_name: string;
  intended_recipient_email: string;
  is_used: boolean;
  used_at: string | null;
  expires_at: string;
  rag_vector_count: number;
  metadata: {
    vector_count?: number;
    rag_enabled?: boolean;
  };
}

export default function EmployeeCodesPage() {
  const [codes, setCodes] = useState<EmployeeCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    used: 0,
    unused: 0,
    ragEnabled: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchEmployeeCodes();
  }, []);

  const fetchEmployeeCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('code_type', 'employee_registration')
        .not('employee_sabon', 'is', null)
        .order('employee_sabon', { ascending: true });

      if (error) throw error;

      setCodes(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const used = data?.filter(c => c.is_used).length || 0;
      const ragEnabled = data?.filter(c => c.pinecone_namespace).length || 0;

      setStats({
        total,
        used,
        unused: total - used,
        ragEnabled,
      });
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast.error('코드 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('코드가 복사되었습니다.');
  };

  const copyAllCodes = () => {
    const allCodes = codes
      .map(
        c =>
          `${c.employee_sabon} | ${c.intended_recipient_name} | ${c.code} | ${c.pinecone_namespace}`
      )
      .join('\n');

    navigator.clipboard.writeText(allCodes);
    alert('모든 코드가 복사되었습니다.');
  };

  const downloadCodes = () => {
    const csv = [
      'Employee ID,Name,Code,Namespace,Used,Expires,Vector Count',
      ...codes.map(
        c =>
          `${c.employee_sabon},"${c.intended_recipient_name}",${c.code},${c.pinecone_namespace},${c.is_used ? 'Yes' : 'No'},${new Date(c.expires_at).toLocaleDateString()},${c.metadata?.vector_count || 0}`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-codes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    alert('코드 목록이 다운로드되었습니다.');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Codes</h1>
          <p className="text-muted-foreground mt-1">
            직원별 인증 코드 및 RAG 네임스페이스 관리
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={copyAllCodes} variant="outline">
            <Copy className="mr-2 h-4 w-4" />
            전체 복사
          </Button>
          <Button onClick={downloadCodes}>
            <Download className="mr-2 h-4 w-4" />
            CSV 다운로드
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">전체 발급된 코드</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.used}</div>
            <p className="text-xs text-muted-foreground">사용된 코드</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unused</CardTitle>
            <XCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unused}</div>
            <p className="text-xs text-muted-foreground">미사용 코드</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RAG Enabled</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ragEnabled}</div>
            <p className="text-xs text-muted-foreground">RAG 활성화</p>
          </CardContent>
        </Card>
      </div>

      {/* Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Verification Codes</CardTitle>
          <CardDescription>
            각 직원의 인증 코드와 Pinecone 네임스페이스 정보
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium w-[100px]">사번</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">이름</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">코드</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">네임스페이스</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">벡터수</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">상태</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">만료일</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.code} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono font-medium">
                      {code.employee_sabon}
                    </td>
                    <td className="px-4 py-3">{code.intended_recipient_name}</td>
                    <td className="px-4 py-3">
                      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                        {code.code}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-muted-foreground">
                        {code.pinecone_namespace}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline">
                        {code.metadata?.vector_count || 0}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {code.is_used ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          사용됨
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="mr-1 h-3 w-3" />
                          미사용
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {new Date(code.expires_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(code.code)}
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

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>코드 배포 방법</CardTitle>
          <CardDescription>직원에게 코드를 전달하는 방법</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-semibold mb-2">1. 코드 복사</h4>
            <p className="text-sm text-muted-foreground">
              각 직원의 코드 옆에 있는 복사 버튼을 클릭하여 코드를 복사합니다.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-semibold mb-2">2. 직원에게 전달</h4>
            <p className="text-sm text-muted-foreground">
              이메일, 카카오톡, 또는 기타 메신저를 통해 직원에게 코드를 전달합니다.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-semibold mb-2">3. 등록 안내</h4>
            <p className="text-sm text-muted-foreground mb-2">
              직원이 카카오톡 채널에서 다음과 같이 등록하도록 안내합니다:
            </p>
            <code className="block rounded bg-background p-2 text-sm">
              /등록 [받은코드]
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              예시: /등록 EMP-00124-A3K
            </p>
          </div>

          <div className="rounded-lg bg-accent border border-border p-4">
            <h4 className="font-semibold mb-2 flex items-center">
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              RAG 기능 사용
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              등록 후, 직원은 "/" 명령어를 사용하여 자신의 급여 정보를 조회할 수 있습니다:
            </p>
            <code className="block rounded bg-background p-2 text-sm">
              /내 최종지급액은?
            </code>
            <code className="block rounded bg-background p-2 text-sm mt-1">
              /이번 달 수수료는?
            </code>
            <code className="block rounded bg-background p-2 text-sm mt-1">
              /환수가 얼마야?
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
