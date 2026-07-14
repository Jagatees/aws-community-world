import { getCountryCode } from './countryFlags.js';

export const REGIONS = [
  { id: 'north-america', label: 'North America', icon: 'NA' },
  { id: 'south-america', label: 'South America', icon: 'SA' },
  { id: 'europe', label: 'Europe', icon: 'EU' },
  { id: 'asia', label: 'Asia', icon: 'AS' },
  { id: 'africa', label: 'Africa', icon: 'AF' },
  { id: 'oceania', label: 'Oceania', icon: 'OC' },
];

const REGION_CODES = {
  'north-america': new Set([
    'AG', 'BS', 'BB', 'BZ', 'CA', 'CR', 'CU', 'DM', 'DO', 'SV', 'GD', 'GT', 'HT', 'HN', 'JM',
    'MX', 'NI', 'PA', 'KN', 'LC', 'VC', 'TT', 'US', 'PR',
  ]),
  'south-america': new Set(['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE', 'GF', 'FK']),
  europe: new Set([
    'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
    'HU', 'IS', 'IE', 'IT', 'XK', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL', 'MK',
    'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'UA', 'GB', 'VA',
  ]),
  asia: new Set([
    'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'CY', 'GE', 'HK', 'IN', 'ID', 'IR',
    'IQ', 'IL', 'JP', 'JO', 'KZ', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP',
    'KP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'KR', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL',
    'TR', 'TM', 'AE', 'UZ', 'VN', 'YE',
  ]),
  africa: new Set([
    'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ',
    'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG',
    'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO',
    'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW', 'EH',
  ]),
  oceania: new Set(['AU', 'FJ', 'KI', 'MH', 'FM', 'NR', 'NZ', 'PW', 'PG', 'WS', 'SB', 'TO', 'TV', 'VU']),
};

const COUNTRY_CODE_OVERRIDES = {
  'bosnia & herzegovina': 'BA',
  'congo - kinshasa': 'CD',
  'democratic republic of congo': 'CD',
  'democratic republic of the congo': 'CD',
  'côte d’ivoire': 'CI',
  benin: 'BJ',
  fl: 'US',
  france: 'FR',
  'myanmar (burma)': 'MM',
  serbia: 'RS',
  'türkiye': 'TR',
  turkiye: 'TR',
  turkey: 'TR',
  'united kingdom': 'GB',
  'united kingdom of great britain and northern ireland': 'GB',
};

function resolveCountryCode(country) {
  if (!country) return null;
  const normalized = country.trim().toLocaleLowerCase();
  return COUNTRY_CODE_OVERRIDES[normalized] ?? getCountryCode(country);
}

export function getRegionForCountry(country) {
  const code = resolveCountryCode(country);
  if (!code) return null;
  return REGIONS.find((region) => REGION_CODES[region.id].has(code))?.id ?? null;
}

export function getRegionLabel(regionId) {
  return REGIONS.find((region) => region.id === regionId)?.label ?? regionId;
}
