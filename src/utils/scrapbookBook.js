import { scrapbookStickers } from '../data/scrapbook.js';

export const BOOK_STORAGE_KEY = 'aws-community-scrapbook-v2';
const LEGACY_STORAGE_KEY = 'aws-community-scrapbook-v1';

export const BOOK_SPREADS = Object.freeze([
  Object.freeze({ id: 'hello-cloud', label: 'Pages 01–02' }),
  Object.freeze({ id: 'kiro-and-me', label: 'Pages 03–04' }),
  Object.freeze({ id: 'cloud-playground', label: 'Pages 05–06' }),
  Object.freeze({ id: 'our-people', label: 'Pages 07–08' }),
  Object.freeze({ id: 'next-adventure', label: 'Pages 09–10' }),
]);
export const LAST_BOOK_POSITION = BOOK_SPREADS.length + 1;

// Keep this model independent of React and its sticker rendering components.
const DEFAULT_STICKER_IDS = new Set(Object.keys(scrapbookStickers));
const NOTE_FONTS = new Set(['hand', 'sans', 'serif', 'mono']);
const NOTE_SIZES = new Set([18, 24, 32]);
const INVALID_IDS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_IMAGE_SOURCE_LENGTH = 450_000;
const MAX_BOOK_IMAGE_SOURCE_LENGTH = 2_000_000;
const MAX_BOOK_IMAGES = 8;

const isRecord = (value) => {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isSide = (value) => value === 'left' || value === 'right';
const isId = (value) => typeof value === 'string' && value.length > 0
  && value.length <= 120 && value.trim().length > 0
  && Array.from(value).every((character) => character.codePointAt(0) >= 32 && character.codePointAt(0) !== 127)
  && !INVALID_IDS.has(value);

export function blankBook() {
  return {
    version: 2,
    spreads: Object.fromEntries(BOOK_SPREADS.map(({ id }) => [id, { stickers: [], notes: [], images: [] }])),
  };
}

function sanitizeReactions(value) {
  if (!isRecord(value)) return {};
  return { reactions: { heart: value.heart === true, thumbsup: value.thumbsup === true } };
}

export function toggleReaction(item, type) {
  if (!isRecord(item) || (type !== 'heart' && type !== 'thumbsup')) return item;
  const reactions = sanitizeReactions(item.reactions).reactions ?? { heart: false, thumbsup: false };
  return { ...item, reactions: { ...reactions, [type]: !reactions[type] } };
}

function sanitizeSticker(value, validStickerIds) {
  if (!isRecord(value) || !isId(value.id) || !validStickerIds.has(value.sticker)
    || !isSide(value.side) || ![value.x, value.y, value.rotation].every(Number.isFinite)) return null;
  return {
    id: value.id,
    sticker: value.sticker,
    side: value.side,
    x: clamp(value.x, 0, 100),
    y: clamp(value.y, 0, 100),
    rotation: value.rotation,
    ...sanitizeReactions(value.reactions),
  };
}

function sanitizeNote(value) {
  if (!isRecord(value) || !isId(value.id) || typeof value.text !== 'string'
    || !NOTE_FONTS.has(value.font) || !NOTE_SIZES.has(value.size)
    || typeof value.color !== 'string' || !/^#[\da-f]{6}$/i.test(value.color)
    || !isSide(value.side) || ![value.x, value.y].every(Number.isFinite)) return null;
  return {
    id: value.id,
    text: value.text.slice(0, 800),
    font: value.font,
    color: value.color,
    size: value.size,
    side: value.side,
    x: clamp(value.x, 4, 90),
    y: clamp(value.y, 6, 90),
    ...(Number.isFinite(value.width) ? { width: clamp(value.width, 20, 88) } : {}),
    ...sanitizeReactions(value.reactions),
  };
}

function isRasterDataURL(value) {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_SOURCE_LENGTH) return false;
  const match = /^data:image\/(jpeg|png|webp);base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/.exec(value);
  if (!match || !match[2]) return false;
  const header = globalThis.atob(match[2].slice(0, 16));
  if (match[1] === 'jpeg') return header.startsWith('\xff\xd8\xff');
  if (match[1] === 'png') return header.startsWith('\x89PNG\r\n\x1a\n');
  return header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP';
}

function sanitizeImage(value) {
  if (!isRecord(value) || !isId(value.id) || !isRasterDataURL(value.src)
    || !isSide(value.side) || ![value.x, value.y, value.width].every(Number.isFinite)) return null;
  const width = clamp(value.width, 20, 70);
  return {
    id: value.id,
    src: value.src,
    side: value.side,
    width,
    x: clamp(value.x, 4, 94 - width),
    y: clamp(value.y, 6, 80),
    caption: typeof value.caption === 'string' ? value.caption.slice(0, 120) : '',
    ...sanitizeReactions(value.reactions),
  };
}

function sanitizeItems(values, limit, sanitize) {
  if (!Array.isArray(values)) return [];
  const result = [];
  const ids = new Set();
  for (const value of values) {
    const item = sanitize(value);
    if (!item || ids.has(item.id)) continue;
    ids.add(item.id);
    result.push(item);
    if (result.length === limit) break;
  }
  return result;
}

export function validateBook(value, validStickerIds = DEFAULT_STICKER_IDS) {
  const book = blankBook();
  try {
    if (!isRecord(value) || value.version !== 2 || !isRecord(value.spreads)) return book;
    if (value.welcomeVersion === 1) book.welcomeVersion = 1;
    let imageCount = 0;
    let imageSourceLength = 0;
    for (const { id } of BOOK_SPREADS) {
      if (!hasOwn(value.spreads, id) || !isRecord(value.spreads[id])) continue;
      const spread = value.spreads[id];
      book.spreads[id] = {
        stickers: sanitizeItems(spread.stickers, 30, (item) => sanitizeSticker(item, validStickerIds)),
        notes: sanitizeItems(spread.notes, 20, sanitizeNote),
        images: sanitizeItems(spread.images, MAX_BOOK_IMAGES, sanitizeImage).filter((image) => {
          if (imageCount >= MAX_BOOK_IMAGES || imageSourceLength + image.src.length > MAX_BOOK_IMAGE_SOURCE_LENGTH) return false;
          imageCount += 1;
          imageSourceLength += image.src.length;
          return true;
        }),
      };
    }
  } catch {
    // Storage is untrusted. An invalid record must not prevent opening the book.
    return blankBook();
  }
  return book;
}

// Welcome content is editable, so remember that it was offered even when a visitor
// clears it. Opening the book again must never bring deleted contributions back.
export function welcomeBook(value = blankBook(), validStickerIds = DEFAULT_STICKER_IDS) {
  const book = validateBook(value, validStickerIds);
  if (book.welcomeVersion === 1) return book;
  book.welcomeVersion = 1;
  const first = book.spreads[BOOK_SPREADS[0].id];
  if (first.notes.length || first.stickers.length || first.images.length) return book;
  first.notes = [
    {
      id: 'welcome-title', text: 'Welcome to the\ncommunity scrapbook', font: 'hand',
      color: '#293b3a', size: 32, side: 'left', x: 10, y: 12, width: 82,
    },
    {
      id: 'welcome-invitation', text: 'Leave a kind word, add a sticker, or share a photo. Show the world what makes your community special.',
      font: 'sans', color: '#53655e', size: 18, side: 'left', x: 11, y: 40, width: 76,
    },
    {
      id: 'welcome-signoff', text: 'Every community has a story.\nMake yourself at home.', font: 'hand',
      color: '#866345', size: 24, side: 'left', x: 11, y: 75, width: 76,
    },
  ];
  first.stickers = [
    { id: 'welcome-kiro-world', sticker: 'kiro-world', side: 'right', x: 36, y: 32, rotation: -9 },
    { id: 'welcome-kiro-lambda', sticker: 'kiro-lambda', side: 'right', x: 35, y: 68, rotation: 7 },
    { id: 'welcome-hero', sticker: 'hero', side: 'right', x: 80, y: 20, rotation: 9 },
    { id: 'welcome-builder', sticker: 'builder', side: 'right', x: 80, y: 45, rotation: -5 },
    { id: 'welcome-sbg', sticker: 'sbg', side: 'right', x: 80, y: 70, rotation: 8 },
  ].filter(({ sticker }) => validStickerIds.has(sticker));
  return book;
}

function migrateLegacyBook(value, validStickerIds) {
  const book = blankBook();
  if (!isRecord(value)) return book;
  for (const { id } of BOOK_SPREADS) {
    if (!hasOwn(value, id)) continue;
    book.spreads[id].stickers = sanitizeItems(value[id], 30, (item) => {
      if (!isRecord(item) || ![item.x, item.y, item.rotation].every(Number.isFinite)
        || item.x < 7 || item.x > 93 || item.y < 10 || item.y > 88) return null;
      return sanitizeSticker({
        ...item,
        side: item.x <= 50 ? 'left' : 'right',
        x: item.x <= 50 ? item.x * 2 : (item.x - 50) * 2,
      }, validStickerIds);
    });
  }
  return book;
}

function parseStoredValue(storage, key) {
  try {
    const value = storage?.getItem(key);
    return typeof value === 'string' ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function readBook(storage, validStickerIds = DEFAULT_STICKER_IDS) {
  try {
    const source = storage ?? globalThis.localStorage;
    const current = parseStoredValue(source, BOOK_STORAGE_KEY);
    if (isRecord(current) && current.version === 2 && isRecord(current.spreads)) {
      return welcomeBook(current, validStickerIds);
    }
    return welcomeBook(migrateLegacyBook(parseStoredValue(source, LEGACY_STORAGE_KEY), validStickerIds), validStickerIds);
  } catch {
    return welcomeBook(undefined, validStickerIds);
  }
}

export function bookPositionFromSearch(search = '') {
  const value = new URLSearchParams(search).get('spread');
  if (value === null || !/^\d+$/.test(value)) return 0;
  const position = Number(value);
  return Number.isInteger(position) && position >= 0 && position <= LAST_BOOK_POSITION ? position : 0;
}

export function positionLabel(position) {
  if (position === 0) return 'Front cover';
  if (position === LAST_BOOK_POSITION) return 'Back cover';
  return BOOK_SPREADS[position - 1]?.label ?? 'Front cover';
}
