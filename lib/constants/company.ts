/**
 * Company Information Constants
 *
 * Official company details for 모드온 AI
 * Used throughout the application for branding and legal information
 */

export const COMPANY_INFO = {
  name: '모드온 AI',
  nameEn: 'Modawn AI',

  certification: '벤처기업인증',

  ceo: '정다운',

  businessNumber: '145-87-03354',

  address: '서울특별시 서초구 사평대로53길 94, 4층',
  addressEn: '4F, 94, Sapyeong-daero 53-gil, Seocho-gu, Seoul, Republic of Korea',

  contact: {
    email: 'info@modawn.ai',
  },

  copyright: `© ${new Date().getFullYear()} 모드온 AI`,

  // App specific
  appName: 'JISA',
  appVersion: '1.0.0',
} as const;

export type CompanyInfo = typeof COMPANY_INFO;
