/**
 * CSV Template Download API
 *
 * Provides employee upload CSV template
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const csvContent = `full_name,email,employee_id,department,position,tier,role,phone_number,team,hire_date,location
홍길동,hong@company.com,EMP001,영업팀,시니어 영업사원,pro,senior,010-1234-5678,1팀,2024-01-15,서울
김영희,kim@company.com,EMP002,마케팅팀,주니어 마케터,basic,junior,010-2345-6789,디지털팀,2024-03-01,부산
박철수,park@company.com,EMP003,IT팀,매니저,enterprise,manager,010-3456-7890,개발팀,2023-06-01,서울`

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="employee-upload-template.csv"'
    }
  })
}
