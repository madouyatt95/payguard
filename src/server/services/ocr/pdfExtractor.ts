// ============================================================
// PayGuard — PDF Text Extraction Service
// ============================================================

export interface PdfExtractionResult {
  text: string;
  pages: number;
  info: {
    title?: string;
    author?: string;
    creationDate?: string;
  };
  confidence: number; // estimated quality 0-1
}

export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractionResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);

    // Estimate confidence based on text quality
    const text = data.text || '';
    const confidence = estimateTextConfidence(text);

    return {
      text: cleanExtractedText(text),
      pages: data.numpages || 1,
      info: {
        title: data.info?.Title,
        author: data.info?.Author,
        creationDate: data.info?.CreationDate,
      },
      confidence,
    };
  } catch (error: any) {
    console.error('PDF extraction error:', error);
    throw new Error(`Impossible de lire le fichier PDF. Assurez-vous que le fichier n'est pas protégé ou corrompu. (Détail technique : ${error.message || 'unknown error'})`);
  }
}

function estimateTextConfidence(text: string): number {
  if (!text || text.trim().length < 50) return 0.1;

  let score = 0.5;
  const lower = text.toLowerCase();

  // Check for typical payslip keywords (French)
  const keywords = ['salaire', 'brut', 'net', 'cotisation', 'bulletin', 'salarié', 'employeur',
    'heures', 'taux', 'base', 'période', 'siret', 'convention', 'prime', 'retenue',
    'sécurité sociale', 'retraite', 'prévoyance', 'imposable', 'paiement'];

  const found = keywords.filter(k => lower.includes(k));
  score += Math.min(found.length / keywords.length, 0.3);

  // Check for numbers (amounts)
  const numbers = text.match(/\d+[.,]\d{2}/g);
  if (numbers && numbers.length > 5) score += 0.1;
  if (numbers && numbers.length > 15) score += 0.1;

  // Penalty for too many special chars (sign of bad OCR)
  const specialChars = text.match(/[^\w\s€,.;:/-àâäéèêëïîôùûüÿçœæ]/gi);
  if (specialChars && specialChars.length / text.length > 0.1) score -= 0.15;

  // Penalty for very short text
  if (text.length < 300) score -= 0.2;

  return Math.max(0.1, Math.min(1, score));
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}
