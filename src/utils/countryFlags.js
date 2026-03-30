const COUNTRY_ALIASES = {
  'bosnia and herzegovina': 'BA',
  'cape verde': 'CV',
  'cote divoire': 'CI',
  'curacao': 'CW',
  'czech republic': 'CZ',
  czechia: 'CZ',
  'hong kong': 'HK',
  iran: 'IR',
  'ivory coast': 'CI',
  kosovo: 'XK',
  laos: 'LA',
  macedonia: 'MK',
  moldova: 'MD',
  'north korea': 'KP',
  palestine: 'PS',
  russia: 'RU',
  'south korea': 'KR',
  syria: 'SY',
  taiwan: 'TW',
  tanzania: 'TZ',
  uae: 'AE',
  uk: 'GB',
  us: 'US',
  usa: 'US',
  'united states': 'US',
  'united states of america': 'US',
  venezuela: 'VE',
  'viet nam': 'VN',
};

const regionNames =
  typeof Intl !== 'undefined' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

const countryNameToCode = new Map();

if (regionNames) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (const first of letters) {
    for (const second of letters) {
      const code = `${first}${second}`;
      const name = regionNames.of(code);

      if (name && name !== code) {
        countryNameToCode.set(normalizeCountryName(name), code);
      }
    }
  }
}

function normalizeCountryName(country) {
  return country
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[().,'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function countryCodeToFlag(code) {
  if (!code || code.length !== 2) return '';

  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

export function formatCountryWithFlag(country) {
  if (!country) return country;

  const normalized = normalizeCountryName(country);
  const code = COUNTRY_ALIASES[normalized] ?? countryNameToCode.get(normalized);

  if (!code) {
    return country;
  }

  return `${countryCodeToFlag(code)} ${country}`;
}
