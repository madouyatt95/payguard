// ============================================================
// PayGuard — API Route: Comparison
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getDemoComparison, SERIES_IDS } from '@/server/services/demo/data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || SERIES_IDS;

  try {
    const comparison = getDemoComparison(ids);
    if (!comparison) {
      return NextResponse.json(
        { success: false, error: 'Au moins 2 documents sont nécessaires pour la comparaison' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: comparison });
  } catch (error) {
    console.error('Comparison API error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la comparaison' },
      { status: 500 }
    );
  }
}
