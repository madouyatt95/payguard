// ============================================================
// PayGuard — Text Normalizer for French Payslips
// ============================================================

// Common OCR misreadings on French payslips
const OCR_CORRECTIONS: [RegExp, string][] = [
  [/salaire\s*de\s*bas[eé]/gi, 'Salaire de base'],
  [/sa[li]a[li]re\s*de\s*base/gi, 'Salaire de base'],
  [/h[eé]ures?\s*norma[li]es?/gi, 'Heures normales'],
  [/h[eé]ures?\s*supp(?:l[eé]mentaires?)?/gi, 'Heures supplémentaires'],
  [/h\s*[.,]\s*supp?/gi, 'H. Supp'],
  [/net\s*[aà]\s*payer/gi, 'Net à payer'],
  [/net\s*imposab[li]e/gi, 'Net imposable'],
  [/net\s*fiscal/gi, 'Net fiscal'],
  [/brut\s*mensue[li]/gi, 'Brut mensuel'],
  [/tota[li]\s*brut/gi, 'Total brut'],
  [/cong[eé]s?\s*pay[eé]s?/gi, 'Congés payés'],
  [/absence[s]?\s*injustifi[eé]es?/gi, 'Absences injustifiées'],
  [/s[eé]curit[eé]\s*socia[li]e/gi, 'Sécurité sociale'],
  [/retra[li]te\s*compl[eé]mentaire/gi, 'Retraite complémentaire'],
  [/pr[eé]l[eè]vement\s*[aà]\s*la\s*source/gi, 'Prélèvement à la source'],
  [/ind[eé]mnit[eé]\s*transport/gi, 'Indemnité transport'],
  [/ind[eé]mnit[eé]\s*repas/gi, 'Indemnité repas'],
  [/prime\s*d['\u2019]anciennet[eé]/gi, 'Prime d\'ancienneté'],
  [/majora[tl]ion/gi, 'Majoration'],
  [/cotisa[tl]ion/gi, 'Cotisation'],
  [/conven[tl]ion\s*co[li]{2}ective/gi, 'Convention collective'],
  [/activit[eé]\s*partie[li]{2}e/gi, 'Activité partielle'],
  [/CSG\s*d[eé]ductib[li]e/gi, 'CSG déductible'],
  [/CSG\s*non\s*d[eé]ductib[li]e/gi, 'CSG non déductible'],
  [/CRDS/gi, 'CRDS'],
  [/URSSAF/gi, 'URSSAF'],
];

// Known payroll field patterns
const PAYROLL_VOCABULARY = [
  'salaire de base', 'heures normales', 'heures supplémentaires',
  'brut', 'net imposable', 'net à payer', 'net fiscal',
  'congés payés', 'absences', 'prime', 'indemnité',
  'cotisation', 'sécurité sociale', 'retraite', 'CSG', 'CRDS',
  'prélèvement à la source', 'PAS', 'transport', 'panier',
  'ancienneté', 'majoration', 'taux', 'base', 'montant',
  'activité partielle', 'convention collective',
  'qualification', 'coefficient', 'échelon',
  'matricule', 'SIRET', 'APE', 'NAF', 'URSSAF',
  'cumul', 'imposable', 'fiscal', 'employeur', 'salarié',
];

// Money patterns: detect amounts in French format
const MONEY_PATTERNS = [
  /(\d[\d\s]*[.,]\d{2})\s*€/g,
  /€\s*(\d[\d\s]*[.,]\d{2})/g,
  /(\d{1,3}(?:[\s.]\d{3})*[.,]\d{2})/g,
];

// Percentage detection
const PERCENT_PATTERN = /(\d+[.,]\d+)\s*%/g;

// Date patterns (French)
const DATE_PATTERNS = [
  /\d{2}[\/.\-]\d{2}[\/.\-]\d{4}/g,
  /\d{2}\s+(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)\s+\d{4}/gi,
  /(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)\s+\d{4}/gi,
];

// Hour patterns
const HOUR_PATTERNS = [
  /(\d+[.,]\d{2})\s*h(?:eures?)?/gi,
  /(\d+)\s*h\s*(\d+)/gi,
  /(\d+[.,]\d{2})\s*heures/gi,
];

export class TextNormalizer {
  /**
   * Full normalization pipeline for French payslip text
   */
  normalize(rawText: string): NormalizationResult {
    let text = rawText;
    const corrections: string[] = [];

    // Step 1: Clean whitespace
    text = this.cleanWhitespace(text);

    // Step 2: Fix common OCR errors
    const ocrResult = this.fixOCRErrors(text);
    text = ocrResult.text;
    corrections.push(...ocrResult.corrections);

    // Step 3: Normalize number formats
    text = this.normalizeNumbers(text);

    // Step 4: Clean OCR artifacts
    text = this.cleanArtifacts(text);

    // Step 5: Detect structured elements
    const amounts = this.detectAmounts(text);
    const percentages = this.detectPercentages(text);
    const dates = this.detectDates(text);
    const hours = this.detectHours(text);
    const sections = this.detectSections(text);
    const payLines = this.detectPayLines(text);

    return {
      normalizedText: text,
      corrections,
      detectedAmounts: amounts,
      detectedPercentages: percentages,
      detectedDates: dates,
      detectedHours: hours,
      detectedSections: sections,
      detectedPayLines: payLines,
      vocabulary: PAYROLL_VOCABULARY,
    };
  }

  private cleanWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\t ]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private fixOCRErrors(text: string): { text: string; corrections: string[] } {
    const corrections: string[] = [];
    let result = text;

    for (const [pattern, replacement] of OCR_CORRECTIONS) {
      const match = result.match(pattern);
      if (match) {
        corrections.push(`"${match[0]}" → "${replacement}"`);
        result = result.replace(pattern, replacement);
      }
    }

    // Fix common number OCR: "l" → "1", "O" → "0" in numeric contexts
    result = result.replace(/(?<=\d)l(?=\d)/g, '1');
    result = result.replace(/(?<=\d)O(?=\d)/g, '0');
    result = result.replace(/(?<=\d)o(?=\d)/g, '0');

    return { text: result, corrections };
  }

  private normalizeNumbers(text: string): string {
    // Normalize frequent spacing in big numbers: "1 234,56" → keep as is (French format)
    // But fix: "1. 234,56" → "1 234,56"
    return text.replace(/(\d)\.\s(\d{3})/g, '$1 $2');
  }

  private cleanArtifacts(text: string): string {
    return text
      .replace(/[|¦]+/g, ' ') // OCR pipe artifacts
      .replace(/_{3,}/g, '') // Underline artifacts
      .replace(/={3,}/g, '') // Equal sign artifacts
      .replace(/\*{3,}/g, '') // Star artifacts
      .replace(/-{5,}/g, '---') // Long dashes
      .replace(/\.{5,}/g, '...') // Long dots
      .trim();
  }

  detectAmounts(text: string): DetectedAmount[] {
    const amounts: DetectedAmount[] = [];
    for (const pattern of MONEY_PATTERNS) {
      let match;
      const p = new RegExp(pattern.source, pattern.flags);
      while ((match = p.exec(text)) !== null) {
        const raw = match[1] || match[0];
        const value = parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
        if (!isNaN(value) && value > 0) {
          amounts.push({
            raw: match[0],
            value,
            position: match.index,
          });
        }
      }
    }
    // Deduplicate by position
    return amounts.filter((a, i, arr) =>
      arr.findIndex(b => Math.abs(b.position - a.position) < 3) === i
    );
  }

  detectPercentages(text: string): DetectedPercentage[] {
    const results: DetectedPercentage[] = [];
    let match;
    const p = new RegExp(PERCENT_PATTERN.source, PERCENT_PATTERN.flags);
    while ((match = p.exec(text)) !== null) {
      results.push({
        raw: match[0],
        value: parseFloat(match[1].replace(',', '.')),
        position: match.index,
      });
    }
    return results;
  }

  detectDates(text: string): string[] {
    const dates: string[] = [];
    for (const pattern of DATE_PATTERNS) {
      let match;
      const p = new RegExp(pattern.source, pattern.flags);
      while ((match = p.exec(text)) !== null) {
        dates.push(match[0]);
      }
    }
    return [...new Set(dates)];
  }

  detectHours(text: string): DetectedHours[] {
    const results: DetectedHours[] = [];
    for (const pattern of HOUR_PATTERNS) {
      let match;
      const p = new RegExp(pattern.source, pattern.flags);
      while ((match = p.exec(text)) !== null) {
        const value = parseFloat((match[1] || match[0]).replace(',', '.'));
        if (!isNaN(value)) {
          results.push({ raw: match[0], value, position: match.index });
        }
      }
    }
    return results;
  }

  detectSections(text: string): DetectedSection[] {
    const sections: DetectedSection[] = [];
    const sectionPatterns = [
      { pattern: /(?:RÉMUNÉRATION|REMUNERATION|ELEMENTS DE PAIE|SALAIRE)/gi, name: 'earnings' },
      { pattern: /(?:COTISATIONS|CHARGES SOCIALES|CONTRIBUTIONS)/gi, name: 'contributions' },
      { pattern: /(?:NET\s*(?:À|A)\s*PAYER|NET FISCAL|NET IMPOSABLE)/gi, name: 'net' },
      { pattern: /(?:CONGES|REPOS|ABSENCES)/gi, name: 'leave' },
      { pattern: /(?:CUMULS?|ANNÉE|ANNEE)/gi, name: 'cumulated' },
      { pattern: /(?:EMPLOYEUR|ENTREPRISE|SOCIÉTÉ|SOCIETE)/gi, name: 'employer' },
      { pattern: /(?:SALARIÉ|SALARIE|EMPLOYE)/gi, name: 'employee' },
    ];

    for (const { pattern, name } of sectionPatterns) {
      let match;
      const p = new RegExp(pattern.source, pattern.flags);
      while ((match = p.exec(text)) !== null) {
        sections.push({ name, rawText: match[0], position: match.index });
      }
    }

    return sections.sort((a, b) => a.position - b.position);
  }

  detectPayLines(text: string): DetectedPayLine[] {
    const lines = text.split('\n');
    const payLines: DetectedPayLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // A pay line typically has: label ... numbers
      const hasAmount = /\d+[.,]\d{2}/.test(line);
      const hasLabel = /[a-zA-ZÀ-ÿ]{3,}/.test(line);

      if (hasAmount && hasLabel && line.length > 10) {
        const amounts = this.detectAmounts(line);
        payLines.push({
          lineNumber: i + 1,
          rawText: line,
          amounts: amounts.map(a => a.value),
          isLikelyPayLine: true,
        });
      }
    }

    return payLines;
  }
}

// Supporting interfaces
export interface NormalizationResult {
  normalizedText: string;
  corrections: string[];
  detectedAmounts: DetectedAmount[];
  detectedPercentages: DetectedPercentage[];
  detectedDates: string[];
  detectedHours: DetectedHours[];
  detectedSections: DetectedSection[];
  detectedPayLines: DetectedPayLine[];
  vocabulary: string[];
}

export interface DetectedAmount {
  raw: string;
  value: number;
  position: number;
}

export interface DetectedPercentage {
  raw: string;
  value: number;
  position: number;
}

export interface DetectedHours {
  raw: string;
  value: number;
  position: number;
}

export interface DetectedSection {
  name: string;
  rawText: string;
  position: number;
}

export interface DetectedPayLine {
  lineNumber: number;
  rawText: string;
  amounts: number[];
  isLikelyPayLine: boolean;
}
