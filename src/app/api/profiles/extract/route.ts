import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPdf } from '@/server/services/ocr/pdfExtractor';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, error: 'Le fichier doit être un PDF' }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text using our existing PDF extractor
    const extraction = await extractTextFromPdf(buffer);
    const text = extraction.text.toLowerCase();

    // ========================================================================
    // Heuristics: Extract Contract Information
    // ========================================================================
    const result = {
      contractType: 'CDI', // Default
      isCadre: false,
      isFullTime: true,
      weeklyHours: 35,
      collectiveAgreement: '',
    };

    // 1. Contract Type
    if (text.includes('durée déterminée') || text.includes('cdd')) {
      result.contractType = 'CDD';
    } else if (text.includes('apprentissage') || text.includes('alternance') || text.includes('professionnalisation')) {
      result.contractType = 'Apprentissage';
    } else if (text.includes('intérimaire') || text.includes('intérim')) {
      result.contractType = 'Interim';
    } else {
      result.contractType = 'CDI';
    }

    // 2. Cadre Status
    if (text.includes('statut cadre') || text.match(/\bcadre\b/)) {
      // Check if it's not "cadre de" (like "dans le cadre de")
      const cadreMatch = text.match(/.{0,20}\bcadre\b.{0,20}/g);
      if (cadreMatch && cadreMatch.some(m => !m.includes('dans le cadre'))) {
         result.isCadre = true;
      }
    }
    
    // Forfait jours implies Cadre very often in France
    if (text.includes('forfait jours') || text.includes('218 jours')) {
      result.isCadre = true;
    }

    // 3. Working hours & Full time / Part time
    if (text.includes('temps partiel')) {
      result.isFullTime = false;
      const hoursMatch = text.match(/([0-9]{1,2}(?:[,.][0-9]{1,2})?)\s*heures?\s*(?:par|par|hebdo)/i);
      if (hoursMatch) {
        result.weeklyHours = parseFloat(hoursMatch[1].replace(',', '.'));
      } else {
        result.weeklyHours = 24; // Default part-time minimum in France
      }
    } else {
      result.isFullTime = true;
      if (text.includes('39 heures') || text.includes('39h')) {
        result.weeklyHours = 39;
      } else if (text.includes('37 heures') || text.includes('37h')) {
        result.weeklyHours = 37;
      } else {
        result.weeklyHours = 35; // Default full time
      }
    }

    // 4. Convention Collective
    // Looking for well known conventions
    if (text.includes('syntec') || text.includes('bureau d\'études')) {
      result.collectiveAgreement = 'SYNTEC';
    } else if (text.includes('métallurgie') || text.includes('metallurgie')) {
      result.collectiveAgreement = 'METALLURGIE';
    } else if (text.includes('bâtiment') || text.includes('travaux publics') || text.includes('btp')) {
      result.collectiveAgreement = 'BTP';
    } else if (text.includes('hcr') || text.includes('hôtels, cafés, restaurants')) {
      result.collectiveAgreement = 'HCR';
    } else if (text.includes('commerce de détail') || text.includes('commerce de gros')) {
      result.collectiveAgreement = 'COMMERCE';
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Données extraites avec succès depuis le contrat de travail'
    });

  } catch (error: any) {
    console.error('Contract extraction error:', error);
    return NextResponse.json({ success: false, error: 'Échec de l\'analyse du contrat: ' + error.message }, { status: 500 });
  }
}
