// ============================================================
// PayGuard — Upload API Route
// Real PDF text extraction + analysis pipeline
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPdf } from '@/server/services/ocr/pdfExtractor';
import { TextNormalizer } from '@/server/services/parsing/normalizer';
import { StructuredPayrollParser } from '@/server/services/parsing/parser';
import { AnalysisPipeline } from '@/server/services/analysis/pipeline';
import {
  createDocument,
  updateDocumentStatus,
} from '@/server/services/db/service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const profileId = formData.get('profileId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non supporté. Formats acceptés : PDF, PNG, JPEG.' }, { status: 400 });
    }

    // Validate file size (max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 400 });
    }

    // Create document in DB
    const doc = await createDocument({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      profileId: profileId || undefined,
    });

    // Update status: extracting
    await updateDocumentStatus(doc.id, 'extracting');

    // Extract text from PDF or Image
    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText = '';
    let extractionConfidence = 1.0;

    if (file.type === 'application/pdf') {
      const extraction = await extractTextFromPdf(buffer);
      if (!extraction.text.trim()) {
        return NextResponse.json({
          error: 'Le PDF semble être un scan (image sans texte intégrable). Veuillez le convertir en image (JPG/PNG) ou fournir un PDF numérique.',
          documentId: doc.id,
        }, { status: 422 });
      }
      rawText = extraction.text;
      extractionConfidence = extraction.confidence;
    } else {
      // It's an image: Run Tesseract.js OCR
      const Tesseract = (await import('tesseract.js')).default;
      
      // Update status to feedback to user that AI is running
      await updateDocumentStatus(doc.id, 'extracting_ai');
      
      try {
        const result = await Tesseract.recognize(
          buffer,
          'fra', // French dictionary
          { logger: m => console.log(m) }
        );
        rawText = result.data.text;
        extractionConfidence = result.data.confidence / 100; // Tesseract returns 0-100, we use 0-1
        
        if (extractionConfidence < 0.3) {
            return NextResponse.json({
                error: "La qualité de l'image est trop faible pour être lue correctement. Veuillez fournir une capture plus nette.",
                documentId: doc.id,
              }, { status: 422 });
        }
      } catch (err) {
        console.error('Tesseract OCR error:', err);
        return NextResponse.json({
          error: "Échec de l'intelligence artificielle de reconnaissance de caractères (OCR).",
          documentId: doc.id,
        }, { status: 500 });
      }
    }

    // Update status: parsing
    await updateDocumentStatus(doc.id, 'parsing', {
      rawText,
      extractionConfidence,
    });

    // Normalize text
    const normalizer = new TextNormalizer();
    const normalizedResult = normalizer.normalize(rawText);

    // Parse structured data
    const parser = new StructuredPayrollParser();
    const parsedDoc = parser.parse(
      normalizedResult.normalizedText,
      doc.id,
      extractionConfidence
    );

    // Update status: analyzing
    await updateDocumentStatus(doc.id, 'analyzing', {
      parsedData: JSON.stringify(parsedDoc),
    });

    // Run analysis pipeline
    const pipeline = new AnalysisPipeline();
    const report = pipeline.analyze(parsedDoc, []);

    // Update status: done
    await updateDocumentStatus(doc.id, 'done', {
      reportData: JSON.stringify(report),
    });

    return NextResponse.json({
      success: true,
      documentId: doc.id,
      report,
      parsedDocument: parsedDoc,
      extractionConfidence,
      message: 'Analyse terminée avec succès.',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur lors de l\'analyse du document.',
    }, { status: 500 });
  }
}
