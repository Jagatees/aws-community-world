import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOK_SPREADS, BOOK_STORAGE_KEY, LAST_BOOK_POSITION, blankBook,
  bookPositionFromSearch, positionLabel, readBook, toggleReaction, validateBook, welcomeBook,
} from '../src/utils/scrapbookBook.js';

const spreadId = BOOK_SPREADS[0].id;
const sticker = (overrides = {}) => ({
  id: 'sticker-1', sticker: 'kiro', side: 'left', x: 20, y: 30, rotation: -4, ...overrides,
});
const note = (overrides = {}) => ({
  id: 'note-1', text: 'Hello, cloud!\nBuild together.', font: 'hand',
  color: '#293b3a', size: 24, side: 'right', x: 12, y: 40, ...overrides,
});
const pngSource = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
const image = (overrides = {}) => ({
  id: 'photo-1', src: pngSource, side: 'right', x: 12, y: 40, width: 36, caption: '', ...overrides,
});
const storage = (values) => ({ getItem: (key) => values[key] ?? null });

test('new books have five independent blank spreads and two closed cover positions', () => {
  const first = blankBook();
  const second = blankBook();
  assert.equal(first.version, 2);
  assert.equal(LAST_BOOK_POSITION, 6);
  assert.deepEqual(Object.keys(first.spreads), BOOK_SPREADS.map(({ id }) => id));
  for (const spread of Object.values(first.spreads)) assert.deepEqual(spread, { stickers: [], notes: [], images: [] });
  first.spreads[spreadId].stickers.push(sticker());
  assert.equal(second.spreads[spreadId].stickers.length, 0);
  assert.equal(first.spreads[BOOK_SPREADS[1].id].stickers.length, 0);
});

test('legacy stickers retain their artwork and page side when migrating to page-local coordinates', () => {
  const old = {
    [spreadId]: [
      { id: 'left', sticker: 'kiro-love', x: 18, y: 26, rotation: -9 },
      { id: 'seam', sticker: 'sbg', x: 50, y: 88, rotation: 7 },
      { id: 'right', sticker: 'lambda', x: 76, y: 64, rotation: 11 },
      { id: 'invalid', sticker: 'kiro', x: 99, y: 30, rotation: 0 },
    ],
  };
  const book = readBook(storage({ 'aws-community-scrapbook-v1': JSON.stringify(old) }));
  assert.deepEqual(book.spreads[spreadId].stickers, [
    { id: 'left', sticker: 'kiro-love', side: 'left', x: 36, y: 26, rotation: -9 },
    { id: 'seam', sticker: 'sbg', side: 'left', x: 100, y: 88, rotation: 7 },
    { id: 'right', sticker: 'lambda', side: 'right', x: 52, y: 64, rotation: 11 },
  ]);
  assert.deepEqual(book.spreads[spreadId].notes, []);
});

test('current book takes precedence, retaining plain multiline text and validated appearance', () => {
  const value = blankBook();
  const text = '<b>just text</b>\n& one more line';
  value.spreads[spreadId] = {
    stickers: [sticker({ x: -20, y: 140 })],
    notes: [note({ text, x: -1, y: 120, font: 'mono', color: '#ABCDEF', size: 32 })],
  };
  const book = readBook(storage({
    [BOOK_STORAGE_KEY]: JSON.stringify(value),
    'aws-community-scrapbook-v1': JSON.stringify({ [spreadId]: [sticker()] }),
  }));
  assert.deepEqual(book.spreads[spreadId].stickers[0], sticker({ x: 0, y: 100 }));
  assert.deepEqual(book.spreads[spreadId].notes[0], note({ text, x: 4, y: 90, font: 'mono', color: '#ABCDEF', size: 32 }));
});

test('malformed entries, unknown sticker names, prototype names and duplicate ids are ignored', () => {
  const value = blankBook();
  value.spreads[spreadId] = {
    stickers: [
      null, [], sticker({ sticker: '__proto__' }), sticker({ sticker: 'toString' }),
      sticker({ side: 'middle' }), sticker({ x: Infinity }), sticker(), sticker({ x: 70 }),
    ],
    notes: [
      note({ id: '__proto__' }), note({ font: 'cursive' }), note({ color: 'red' }),
      note({ size: 14 }), note({ side: 'front' }), note({ text: 123 }), note(), note(),
    ],
  };
  const book = validateBook(value);
  assert.deepEqual(book.spreads[spreadId].stickers, [sticker()]);
  assert.deepEqual(book.spreads[spreadId].notes, [note()]);
  assert.deepEqual(validateBook(Object.create(value)), blankBook());
  assert.deepEqual(validateBook({ version: 2, spreads: Object.create(value.spreads) }), blankBook());
  const polluted = JSON.parse('{"version":2,"spreads":{"__proto__":{"polluted":true}}}');
  assert.deepEqual(validateBook(polluted), blankBook());
  assert.equal({}.polluted, undefined);
});

test('valid items are bounded in count and text length without invalid items consuming capacity', () => {
  const value = blankBook();
  value.spreads[spreadId] = {
    stickers: [null, ...Array.from({ length: 35 }, (_, i) => sticker({ id: `s-${i}` }))],
    notes: [null, ...Array.from({ length: 25 }, (_, i) => note({ id: `n-${i}`, text: 'a'.repeat(900) }))],
  };
  const book = validateBook(value);
  assert.equal(book.spreads[spreadId].stickers.length, 30);
  assert.equal(book.spreads[spreadId].notes.length, 20);
  assert.equal(book.spreads[spreadId].notes[0].text.length, 800);
});

test('storage errors and invalid JSON cannot prevent the welcome book from opening', () => {
  assert.deepEqual(readBook({ getItem() { throw new Error('storage unavailable'); } }), welcomeBook());
  assert.deepEqual(readBook(storage({ [BOOK_STORAGE_KEY]: '{broken' })), welcomeBook());
  assert.deepEqual(readBook(storage({ [BOOK_STORAGE_KEY]: '[]' })), welcomeBook());
  assert.deepEqual(readBook(storage({ [BOOK_STORAGE_KEY]: 'null' })), welcomeBook());
  const old = { [spreadId]: [{ id: 'saved', sticker: 'kiro', x: 60, y: 30, rotation: 0 }] };
  const recovered = readBook(storage({
    [BOOK_STORAGE_KEY]: '{broken', 'aws-community-scrapbook-v1': JSON.stringify(old),
  }));
  assert.equal(recovered.spreads[spreadId].stickers[0].id, 'saved');
});

test('caller-provided artwork allowlist controls both saved and migrated stickers', () => {
  const value = blankBook();
  value.spreads[spreadId].stickers = [sticker(), sticker({ id: 'custom', sticker: 'future-art' })];
  const book = readBook(storage({ [BOOK_STORAGE_KEY]: JSON.stringify(value) }), new Set(['future-art']));
  assert.deepEqual(book.spreads[spreadId].stickers, [sticker({ id: 'custom', sticker: 'future-art' })]);
  assert.equal(welcomeBook(blankBook(), new Set(['kiro-world'])).spreads[spreadId].stickers.length, 1);
});

test('the welcome spread is editable, offered once, and leaves other pages blank', () => {
  const empty = blankBook();
  const first = welcomeBook(empty);
  assert.equal(first.welcomeVersion, 1);
  assert.equal(first.spreads[spreadId].notes[0].text, 'Welcome to the\ncommunity scrapbook');
  assert.equal(first.spreads[spreadId].notes[0].width, 82);
  assert.equal(first.spreads[spreadId].notes[1].text, 'Leave a kind word, add a sticker, or share a photo. Show the world what makes your community special.');
  assert.deepEqual(first.spreads[spreadId].stickers.map(({ sticker: id }) => id), ['kiro-world', 'kiro-lambda', 'hero', 'builder', 'sbg']);
  for (const { id } of BOOK_SPREADS.slice(1)) assert.deepEqual(first.spreads[id], empty.spreads[id]);
  assert.equal(empty.spreads[spreadId].notes.length, 0, 'initial model is not mutated');
  assert.deepEqual(welcomeBook(first), first, 'reopening does not duplicate the welcome');

  first.spreads[spreadId] = { notes: [], stickers: [], images: [] };
  const reopened = readBook(storage({ [BOOK_STORAGE_KEY]: JSON.stringify(first) }));
  assert.deepEqual(reopened, first, 'deleted welcome stays deleted after saving and reloading');
});

test('welcome migration preserves existing visitor contributions and seeds an empty existing book', () => {
  const value = blankBook();
  value.spreads[spreadId].notes = [note()];
  value.spreads[BOOK_SPREADS[3].id].stickers = [sticker()];
  const migrated = readBook(storage({ [BOOK_STORAGE_KEY]: JSON.stringify(value) }));
  assert.equal(migrated.welcomeVersion, 1);
  assert.deepEqual(migrated.spreads, value.spreads);
  const emptyMigration = readBook(storage({ [BOOK_STORAGE_KEY]: JSON.stringify(blankBook()) }));
  assert.deepEqual(emptyMigration, welcomeBook());
  const withPhoto = blankBook();
  withPhoto.spreads[spreadId].images = [image()];
  assert.deepEqual(welcomeBook(withPhoto).spreads, withPhoto.spreads, 'an existing photo also prevents overwriting the first spread');
});

test('reaction toggles are independent per contribution and survive saving', () => {
  const first = note();
  const other = sticker();
  const liked = toggleReaction(first, 'heart');
  assert.deepEqual(liked.reactions, { heart: true, thumbsup: false });
  assert.equal(first.reactions, undefined, 'original item is not mutated');
  assert.equal(other.reactions, undefined, 'other contributions are unchanged');
  const both = toggleReaction(liked, 'thumbsup');
  assert.deepEqual(both.reactions, { heart: true, thumbsup: true });
  assert.deepEqual(toggleReaction(both, 'heart').reactions, { heart: false, thumbsup: true });
  assert.deepEqual(toggleReaction(toggleReaction(other, 'thumbsup'), 'thumbsup').reactions, { heart: false, thumbsup: false });

  const book = welcomeBook();
  book.spreads[BOOK_SPREADS[1].id].notes = [both];
  book.spreads[BOOK_SPREADS[1].id].stickers = [toggleReaction(other, 'heart')];
  book.spreads[BOOK_SPREADS[1].id].images = [toggleReaction(image(), 'thumbsup')];
  const saved = readBook(storage({ [BOOK_STORAGE_KEY]: JSON.stringify(book) }));
  assert.deepEqual(saved.spreads[BOOK_SPREADS[1].id].notes[0].reactions, both.reactions);
  assert.deepEqual(saved.spreads[BOOK_SPREADS[1].id].stickers[0].reactions, { heart: true, thumbsup: false });
  assert.deepEqual(saved.spreads[BOOK_SPREADS[1].id].images[0].reactions, { heart: false, thumbsup: true });
});

test('reaction payloads accept only true booleans and unsupported reaction names do nothing', () => {
  const value = blankBook();
  value.spreads[spreadId].notes = [note({ reactions: { heart: 100, thumbsup: 'true', surprise: true } })];
  value.spreads[spreadId].stickers = [sticker({ reactions: { heart: true, thumbsup: false, count: 900 } })];
  const saved = validateBook(value);
  assert.deepEqual(saved.spreads[spreadId].notes[0].reactions, { heart: false, thumbsup: false });
  assert.deepEqual(saved.spreads[spreadId].stickers[0].reactions, { heart: true, thumbsup: false });
  const item = note({ reactions: 'corrupt' });
  assert.deepEqual(toggleReaction(item, 'heart').reactions, { heart: true, thumbsup: false });
  assert.equal(toggleReaction(item, 'constructor'), item);
  assert.equal(toggleReaction(item, '__proto__'), item);
  assert.equal(toggleReaction(null, 'heart'), null);
});

test('note widths are optional, finite, and constrained to the page', () => {
  const value = blankBook();
  value.spreads[spreadId].notes = [
    note({ id: 'wide', width: 130 }), note({ id: 'narrow', width: -5 }),
    note({ id: 'invalid', width: Infinity }),
  ];
  const [wide, narrow, invalid] = validateBook(value).spreads[spreadId].notes;
  assert.equal(wide.width, 88);
  assert.equal(narrow.width, 20);
  assert.equal(invalid.width, undefined);
});

test('photos retain safe raster data and plain captions while page bounds are clamped', () => {
  const value = blankBook();
  value.spreads[spreadId].images = [image({ width: 120, x: 100, y: -12, caption: '<b>Our community</b>'.repeat(10) })];
  const photo = validateBook(value).spreads[spreadId].images[0];
  assert.equal(photo.width, 70);
  assert.equal(photo.x, 24);
  assert.equal(photo.y, 6);
  assert.equal(photo.caption.length, 120);
  assert.ok(photo.caption.startsWith('<b>Our community</b>'), 'caption stays plain text');
  assert.equal(photo.src, pngSource);
  assert.deepEqual(readBook(storage({ [BOOK_STORAGE_KEY]: JSON.stringify(value) })).spreads[spreadId].images, [photo]);
});

test('malformed photo data, remote URLs, SVG and mismatched image types are discarded', () => {
  const value = blankBook();
  value.spreads[spreadId].images = [
    null, image({ id: 'remote', src: 'https://example.com/photo.png' }),
    image({ id: 'svg', src: 'data:image/svg+xml;base64,PHN2Zy8+' }),
    image({ id: 'fake-jpeg', src: pngSource.replace('/png;', '/jpeg;') }),
    image({ id: 'malformed', src: 'data:image/png;base64,not actual base64===' }),
    image({ id: 'empty', src: 'data:image/png;base64,' }),
    image({ id: 'unknown', src: 'data:image/gif;base64,R0lGODlh' }),
    image({ id: '__proto__' }), image({ side: 'middle' }), image({ width: Infinity }),
    image(), image({ caption: 'same id should not appear twice' }),
  ];
  assert.deepEqual(validateBook(value).spreads[spreadId].images, [image()]);
});

test('saved photos obey the global count and storage budget across spreads', () => {
  const value = blankBook();
  value.spreads[spreadId].images = Array.from({ length: 5 }, (_, i) => image({ id: `first-${i}` }));
  value.spreads[BOOK_SPREADS[1].id].images = Array.from({ length: 5 }, (_, i) => image({ id: `second-${i}` }));
  const count = (book) => Object.values(book.spreads).reduce((sum, spread) => sum + spread.images.length, 0);
  assert.equal(count(validateBook(value)), 8);

  const bigPng = (length) => `data:image/png;base64,${Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(length)]).toString('base64')}`;
  value.spreads[spreadId].images = Array.from({ length: 8 }, (_, i) => image({ id: `big-${i}`, src: bigPng(240_000) }));
  value.spreads[BOOK_SPREADS[1].id].images = [];
  assert.equal(count(validateBook(value)), 6, 'total data URLs stay within two million characters');
  value.spreads[spreadId].images = [image({ src: bigPng(340_000) })];
  assert.equal(count(validateBook(value)), 0, 'a single data URL cannot exceed 450,000 characters');
});

test('URL positions include closed covers and reject invalid or out-of-range positions', () => {
  for (let position = 0; position <= LAST_BOOK_POSITION; position += 1) {
    assert.equal(bookPositionFromSearch(`?view=scrapbook&spread=${position}`), position);
  }
  for (const search of ['', '?spread=', '?spread=-1', '?spread=7', '?spread=1.5', '?spread=Infinity', '?spread=abc', '?spread=0x2']) {
    assert.equal(bookPositionFromSearch(search), 0, search);
  }
  assert.equal(positionLabel(0), 'Front cover');
  assert.equal(positionLabel(1), 'Pages 01–02');
  assert.equal(positionLabel(5), 'Pages 09–10');
  assert.equal(positionLabel(6), 'Back cover');
});
