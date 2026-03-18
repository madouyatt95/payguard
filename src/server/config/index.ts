// ============================================================
// PayGuard — Business Configuration
// ============================================================
import { BusinessConfiguration } from '@/server/types';

export const DEFAULT_CONFIG: BusinessConfiguration = {
  // Salary thresholds
  salaryVariationThresholdPercent: 10,

  // OCR & parsing confidence
  ocrConfidenceThreshold: 0.6,
  parsingConfidenceThreshold: 0.5,

  // Alert sensitivity
  alertSensitivity: 'prudent',

  // SMIC 2024 values (configurable for updates)
  smicHoraireBrut: 11.65,
  smicMensuelBrut: 1766.92,

  // Standard monthly hours
  monthlyHoursFullTime: 151.67,

  // Overtime rates
  overtimeTier1Rate: 1.25,
  overtimeTier2Rate: 1.50,

  // All rules enabled by default
  enabledRules: ['*'],
  disabledRules: [],

  // Custom thresholds
  customThresholds: {
    netGrossRatioMin: 0.55,
    netGrossRatioMax: 0.85,
    bonusVariationThreshold: 50,
    hoursVariationThreshold: 20,
    primeDisparitionMonths: 2,
  },
};

export function getConfig(overrides?: Partial<BusinessConfiguration>): BusinessConfiguration {
  return { ...DEFAULT_CONFIG, ...overrides };
}
