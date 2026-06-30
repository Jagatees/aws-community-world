import { get, list, put } from '@vercel/blob';

const CARD_PREFIX = 'aws-community-day-singapore/cards/';
const PHOTO_PREFIX = 'aws-community-day-singapore/photos/';
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const CATEGORY = 'aws-community-day-singapore';

function createJsonResponse(body, init = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers ?? {}),
    },
  });
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getBlobAuthOptions() {
  const options = {};
  if (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID) {
    options.oidcToken = process.env.VERCEL_OIDC_TOKEN;
    options.storeId = process.env.BLOB_STORE_ID;
  }
  return options;
}

function getImageExtension(contentType) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

function normalizeText(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function parseCoordinate(value, min, max) {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
    return null;
  }
  return coordinate;
}

async function readJsonBlob(pathname) {
  const result = await get(pathname, {
    access: 'public',
    ...getBlobAuthOptions(),
  });

  if (!result?.stream) return null;
  return new Response(result.stream).json();
}

async function readAllCards() {
  const cards = [];
  let cursor;
  let hasMore = true;

  while (hasMore) {
    const result = await list({
      prefix: CARD_PREFIX,
      limit: 1000,
      cursor,
      ...getBlobAuthOptions(),
    });

    const pageCards = await Promise.all(
      result.blobs
        .filter((blob) => blob.pathname.endsWith('.json'))
        .map((blob) => readJsonBlob(blob.pathname).catch(() => null))
    );

    cards.push(...pageCards.filter(Boolean));
    hasMore = result.hasMore;
    cursor = result.cursor;
  }

  return cards.sort((a, b) => Number(a.createdAt ?? 0) - Number(b.createdAt ?? 0));
}

export async function GET() {
  try {
    const pins = await readAllCards();
    return createJsonResponse({ pins });
  } catch (error) {
    console.error('Failed to load AWS Community Day pins', error);
    return createJsonResponse({ pins: [], error: 'Unable to load photo pins' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const country = normalizeText(form.get('country'), 96);
    const lat = parseCoordinate(form.get('lat'), -90, 90);
    const lng = parseCoordinate(form.get('lng'), -180, 180);

    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return createJsonResponse({ error: 'Photo is required' }, { status: 400 });
    }

    if (!file.type?.startsWith('image/')) {
      return createJsonResponse({ error: 'Only images can be uploaded' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return createJsonResponse({ error: 'Photo is too large' }, { status: 413 });
    }

    if (!country || lat === null || lng === null) {
      return createJsonResponse({ error: 'Country location is required' }, { status: 400 });
    }

    const id = normalizeText(form.get('id'), 80) || createId();
    const createdAt = Date.now();
    const extension = getImageExtension(file.type);
    const photoPath = `${PHOTO_PREFIX}${id}.${extension}`;
    const authOptions = getBlobAuthOptions();
    const imageBlob = await put(photoPath, file, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      contentType: file.type,
      ...authOptions,
    });

    const pin = {
      id,
      name: 'AWS Community Day Singapore guest',
      avatarUrl: imageBlob.url,
      imagePathname: imageBlob.pathname,
      category: CATEGORY,
      location: country,
      country,
      lat,
      lng,
      createdAt,
    };

    await put(`${CARD_PREFIX}${id}.json`, JSON.stringify(pin), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
      contentType: 'application/json',
      ...authOptions,
    });

    return createJsonResponse({ pin }, { status: 201 });
  } catch (error) {
    console.error('Failed to save AWS Community Day pin', error);
    return createJsonResponse({ error: 'Unable to save photo pin' }, { status: 500 });
  }
}
