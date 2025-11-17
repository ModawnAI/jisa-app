/**
 * Invoice Download API - Generate and download PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: invoiceId } = await props.params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get invoice
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check access
    if (invoice.user_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['super_admin', 'org_admin'].includes(profile.role)) {
        return NextResponse.json(
          { error: 'Unauthorized to download this invoice' },
          { status: 403 }
        );
      }
    }

    // Generate PDF (simplified version - in production use a proper PDF library)
    const pdfContent = generateInvoicePDF(invoice);

    return new NextResponse(pdfContent as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice_${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error('GET /api/invoices/[id]/download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate PDF content for invoice
 * NOTE: This is a simplified placeholder. In production, use a proper PDF library like:
 * - @react-pdf/renderer
 * - pdfkit
 * - puppeteer for HTML-to-PDF conversion
 */
function generateInvoicePDF(invoice: any): Buffer {
  // Simple text-based PDF placeholder
  const content = `
INVOICE

Invoice Number: ${invoice.invoice_number}
Status: ${invoice.status}
Issue Date: ${invoice.issue_date}

Customer: ${invoice.customer_name || 'N/A'}
Email: ${invoice.customer_email || 'N/A'}

Items:
${JSON.stringify(invoice.items, null, 2)}

Amount: ${invoice.amount} ${invoice.currency}
Tax: ${invoice.tax_amount || 0} ${invoice.currency}
Total: ${invoice.total_amount} ${invoice.currency}

${invoice.notes ? `Notes: ${invoice.notes}` : ''}

---
This is an auto-generated invoice.
For questions, contact JISA support.
  `.trim();

  return Buffer.from(content, 'utf-8');
}
