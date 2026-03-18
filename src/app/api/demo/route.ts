// ============================================================
// PayGuard — API Route: Demo Analysis
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getDemoReport, getDemoParsedDocument, getDemoExtraction, DEMO_SCENARIOS } from '@/server/services/demo/data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get('scenario') || 'normal-cdi';
  const action = searchParams.get('action') || 'report';

  try {
    switch (action) {
      case 'report': {
        const prevIds = searchParams.get('previousIds')?.split(',').filter(Boolean) || [];
        const report = getDemoReport(scenarioId, prevIds);
        return NextResponse.json({ success: true, data: report });
      }
      case 'parsed': {
        const parsed = getDemoParsedDocument(scenarioId);
        return NextResponse.json({ success: true, data: parsed });
      }
      case 'extraction': {
        const extraction = getDemoExtraction(scenarioId);
        return NextResponse.json({ success: true, data: extraction });
      }
      case 'scenarios': {
        return NextResponse.json({ success: true, data: DEMO_SCENARIOS });
      }
      default:
        return NextResponse.json({ success: false, error: 'Action inconnue' }, { status: 400 });
    }
  } catch (error) {
    console.error('Demo API error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération de la démo' },
      { status: 500 }
    );
  }
}
