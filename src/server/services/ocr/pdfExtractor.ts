// ============================================================
// PayGuard — PDF Text Extraction Service (via pdf2json)
// ============================================================
import PDFParser from 'pdf2json';

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
  return new Promise((resolve, reject) => {
    try {
      const pdfParser = new PDFParser(null, 1 as any);

      pdfParser.on("pdfParser_dataError", (errData: any) => {
        console.error('PDF extraction error:', errData.parserError);
        reject(new Error(`Impossible de lire le fichier PDF. Moteur d'extraction en échec. (Détail: ${errData.parserError?.message || 'Inconnu'})`));
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        // Reconstruct visual structure by sorting native PDF string blocks by their Y and X coordinates
        // This solves disjointed table layouts where numbers are separated from their labels.
        const text = reconstructTextFromCoordinates(pdfData) || '';
        
        // Estimate confidence based on text quality
        const confidence = estimateTextConfidence(text);
        
        resolve({
          text: cleanExtractedText(text),
          pages: pdfData.Pages ? pdfData.Pages.length : 1,
          info: {
            title: pdfData.Meta?.Title,
            author: pdfData.Meta?.Author,
            creationDate: pdfData.Meta?.CreationDate,
          },
          confidence,
        });
      });

      pdfParser.parseBuffer(buffer);
    } catch (e: any) {
      console.error('PDF extraction exception:', e);
      reject(new Error(`Impossible de lire le fichier PDF. Assurez-vous que le fichier n'est pas protégé. (Détail technique : ${e.message || 'unknown error'})`));
    }
  });
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

/**
 * Mathematically rebuilds table rows by grouping disconnected PDF text blocks 
 * that share identical (within a micro-tolerance) vertical coordinates.
 * This ensures "Gross Salary" and its monetary values remain on the exact same line,
 * crucial for our subsequent Regex pipeline.
 */
function reconstructTextFromCoordinates(pdfData: any): string {
  let fullText = '';
  // pdf2json Y coordinates: 0.5 unit tolerance usually easily encompasses visually aligned texts
  const Y_TOLERANCE = 0.5; 

  if (!pdfData || !pdfData.formImage || !Array.isArray(pdfData.formImage.Pages)) {
    return '';
  }

  for (const page of pdfData.formImage.Pages) {
    if (!page.Texts) continue;
    
    // Group texts by Y coordinate
    const lines: { y: number; texts: { x: number; text: string }[] }[] = [];

    for (const textItem of page.Texts) {
      if (!textItem.R || textItem.R.length === 0) continue;
      
      // decodeURIComponent translates the URL-encoded hex strings exported by pdf2json
      const rawString = textItem.R.map((r: any) => {
        try {
            return decodeURIComponent(r.T);
        } catch(e) {
            return r.T; // fallback if bad encoding
        }
      }).join('');
      
      const cleanedString = rawString.trim();
      if (!cleanedString) continue;

      const y = textItem.y;
      const x = textItem.x;

      // Scan for a vertically aligned horizontal text line
      let line = lines.find(l => Math.abs(l.y - y) <= Y_TOLERANCE);
      if (!line) {
        line = { y: y, texts: [] };
        lines.push(line);
      }
      
      line.texts.push({ x: x, text: cleanedString });
    }

    // Sort lines by Y (top to bottom)
    lines.sort((a, b) => a.y - b.y);

    // Sort text blocks within each line by X (left to right) and join cleanly.
    for (const line of lines) {
      line.texts.sort((a, b) => a.x - b.x);
      
      // Spacing preserves distinct chunks for regex matchers downstream
      const lineStr = line.texts.map(t => t.text).join('   ');
      fullText += lineStr + '\n';
    }
  }

  return fullText;
}
