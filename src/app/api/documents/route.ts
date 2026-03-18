// ============================================================
// PayGuard — Documents API Route
// List / get documents from database
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import {
  getAllDocuments,
  getDocument,
  deleteDocument,
} from '@/server/services/db/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const doc = await getDocument(id);
      if (!doc) return NextResponse.json({ error: 'Document non trouvé.' }, { status: 404 });

      return NextResponse.json({
        document: doc,
        report: doc.reportData ? JSON.parse(doc.reportData) : null,
        parsed: doc.parsedData ? JSON.parse(doc.parsedData) : null,
      });
    }

    const documents = await getAllDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Documents GET error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 });

    await deleteDocument(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Document DELETE error:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 });
  }
}
