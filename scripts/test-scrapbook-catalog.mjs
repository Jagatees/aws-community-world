import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';
import { scrapbookStickers } from '../src/data/scrapbook.js';
import {
  BOOK_SPREADS, BOOK_STORAGE_KEY, blankBook, readBook,
} from '../src/utils/scrapbookBook.js';

const entries = Object.entries(scrapbookStickers);

test('the complete library contains exactly 100 distinct stickers in the promised categories', () => {
  assert.equal(entries.length, 100);
  assert.equal(new Set(entries.map(([, item]) => item.label)).size, 100);
  const imageSources = entries.filter(([, item]) => item.src).map(([, item]) => item.src);
  assert.equal(new Set(imageSources).size, imageSources.length, 'Image stickers must use distinct artwork');
  assert.deepEqual(Object.fromEntries(
    ['friends', 'cute', 'funny', 'countries', 'service', 'community', 'words'].map((type) => [
      type, entries.filter(([, item]) => item.type === type).length,
    ]),
  ), { friends: 6, cute: 20, funny: 24, countries: 32, service: 7, community: 5, words: 6 });
  for (const [id, sticker] of entries) {
    assert.match(id, /^[a-z0-9-]+$/, `Invalid sticker ID: ${id}`);
    assert.ok(sticker.label.trim(), `${id} needs an accessible label`);
    assert.ok(sticker.src || /^#[a-f\d]{6}$/i.test(sticker.color), `${id} has no artwork or badge color`);
  }
});

test('all 24 existing sticker IDs remain available for previously saved books', () => {
  const originalIds = [
    'kiro', 'lambda', 's3', 'dynamodb', 'bedrock', 'ec2', 'eventbridge',
    'hero', 'builder', 'sbg', 'usergroup', 'ambassador',
    'kiro-lambda', 'kiro-rocket', 'kiro-gaming', 'cloud-friends', 'kiro-world', 'kiro-love',
    'build-together', 'hello-world', 'ship-it', 'coffee-code', 'stay-curious', 'cloud-nine',
  ];
  for (const id of originalIds) assert.ok(Object.hasOwn(scrapbookStickers, id), `Missing original sticker: ${id}`);
});

test('every sticker survives saving and reloading with the default book allowlist', () => {
  const book = blankBook();
  book.welcomeVersion = 1;
  entries.forEach(([id], index) => {
    book.spreads[BOOK_SPREADS[index % BOOK_SPREADS.length].id].stickers.push({
      id: `saved-${id}`, sticker: id, side: index % 2 ? 'left' : 'right',
      x: 25, y: 35, rotation: 15,
      reactions: { heart: index % 2 === 0, thumbsup: index % 3 === 0 },
    });
  });
  const saved = JSON.stringify(book);
  const restored = readBook({ getItem: (key) => key === BOOK_STORAGE_KEY ? saved : null });
  assert.deepEqual(restored, book);
  assert.equal(Object.values(restored.spreads).flatMap(({ stickers }) => stickers).length, 100);
});

test('every image source is bundled locally and each illustration has visible transparent artwork', async () => {
  await Promise.all(entries.filter(([, item]) => item.src).map(async ([id, sticker]) => {
    assert.ok(sticker.src.startsWith('/'), `${id} should load from a local asset`);
    const asset = fileURLToPath(new URL(`../public${sticker.src}`, import.meta.url));
    await access(asset);
    if (sticker.type !== 'cute' && sticker.type !== 'friends') return;
    const artwork = sharp(asset);
    const metadata = await artwork.metadata();
    assert.ok(metadata.width >= 128 && metadata.height >= 128, `${id} is too small`);
    assert.ok(metadata.hasAlpha, `${id} needs a transparent background`);
    const { channels } = await artwork.stats();
    const alpha = channels.at(-1);
    assert.ok(alpha.min < 255, `${id} has no transparent pixels`);
    assert.ok(alpha.max > 0, `${id} is entirely transparent`);
  }));
});
