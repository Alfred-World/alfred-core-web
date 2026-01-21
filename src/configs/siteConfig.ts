/**
 * Site Code Constants
 * Centralized configuration for all site codes in the system
 */

export const SITE_CODES = {
  CNV: 'S-CNV',
  CNVSB: 'S-CNVSB',
  DRL: 'S-DRL',
  OFFI: 'S-OFFI',
  PRJ: 'S-PRJ',
  TLJ: 'S-TLJ',
  TGT: 'S-TGT'
} as const

export type SiteCodeType = (typeof SITE_CODES)[keyof typeof SITE_CODES]

/**
 * Site Information
 * Display names and metadata for each site
 */
export const SITE_INFO = {
  [SITE_CODES.CNV]: {
    code: SITE_CODES.CNV,
    name: 'CNV Site',
    description: 'Construction Vessel Site'
  },
  [SITE_CODES.CNVSB]: {
    code: SITE_CODES.CNVSB,
    name: 'CNVSB Site',
    description: 'Construction Vessel Sub Site'
  },
  [SITE_CODES.DRL]: {
    code: SITE_CODES.DRL,
    name: 'DRL Site',
    description: 'Drilling Site'
  },
  [SITE_CODES.OFFI]: {
    code: SITE_CODES.OFFI,
    name: 'OFFI Site',
    description: 'Office Site'
  },
  [SITE_CODES.PRJ]: {
    code: SITE_CODES.PRJ,
    name: 'PRJ Site',
    description: 'Project Site'
  },
  [SITE_CODES.TLJ]: {
    code: SITE_CODES.TLJ,
    name: 'TLJ Site',
    description: 'TLJ Site'
  },
  [SITE_CODES.TGT]: {
    code: SITE_CODES.TGT,
    name: 'TGT Site',
    description: 'Target Site'
  }
} as const

/**
 * Statistic Routes
 * Path generators for statistic pages
 */
export const STATISTIC_ROUTES = {
  tracking: (siteCode: SiteCodeType) => `/statistic/${siteCode}`,
  create: (siteCode: SiteCodeType) => `/statistic/${siteCode}/create`,
  detail: (siteCode: SiteCodeType, id: string | number) => `/statistic/${siteCode}/view/${id}`
} as const

/**
 * Report Routes
 * Path generators for report pages
 */
const REPORT_PATH = '/statistic/reports';

export const REPORT_ROUTES = {
  chemicalUsed: `${REPORT_PATH}/chemical-used`,
  doUsed: `${REPORT_PATH}/do-used`,
  fuelGas: `${REPORT_PATH}/fuel-gas`,
  emergencyDrill: `${REPORT_PATH}/emergency-drill`,
  flaredGas: `${REPORT_PATH}/flared-gas`,
  hseTraining: `${REPORT_PATH}/hse-training`,
  incidentNearmiss: `${REPORT_PATH}/incident-nearmiss`,
  producedWater: `${REPORT_PATH}/produced-water`,
  violatedFishingBoat: `${REPORT_PATH}/violated-fishing-boat`,
  workingManhoursOffice: `${REPORT_PATH}/working-manhours-office`,
  observationCard: `${REPORT_PATH}/observation-card`,
  manhours: `${REPORT_PATH}/manhours`,
  electricityConsumption: `${REPORT_PATH}/electricity-consumption`,
  airPollution: `${REPORT_PATH}/air-pollution`,
  emission: `${REPORT_PATH}/emission`
} as const
