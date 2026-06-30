import { geoCentroid } from 'd3-geo';
import { feature as topoFeature } from 'topojson-client';
import { useEffect, useMemo, useRef, useState } from 'react';
import countriesTopo from 'world-atlas/countries-110m.json';
import ClassicGlobeScene from './ClassicGlobeScene';
import CountryDropdown from './CountryDropdown';
import FlatMapScene from './FlatMapScene';
import GlobeErrorBoundary from './GlobeErrorBoundary';

const COUNTRY_NAME_OVERRIDES = {
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Central African Rep.': 'Central African Republic',
  'Dem. Rep. Congo': 'Congo - Kinshasa',
  'Dominican Rep.': 'Dominican Republic',
  'Eq. Guinea': 'Equatorial Guinea',
  'S. Sudan': 'South Sudan',
  'Solomon Is.': 'Solomon Islands',
  'United States of America': 'United States',
  'W. Sahara': 'Western Sahara',
};

const EXTRA_COUNTRY_LOCATIONS = [
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
];

const OMIT_COUNTRIES = new Set(['Antarctica']);

function buildCountryLocations() {
  const seen = new Set();
  const locations = [];
  const countries = topoFeature(countriesTopo, countriesTopo.objects.countries).features;

  function addLocation(name, lat, lng) {
    if (!name || OMIT_COUNTRIES.has(name) || seen.has(name) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    seen.add(name);
    locations.push({ name, lat, lng });
  }

  countries.forEach((country) => {
    const rawName = country.properties?.name;
    const name = COUNTRY_NAME_OVERRIDES[rawName] ?? rawName;
    const [lng, lat] = geoCentroid(country);
    addLocation(name, lat, lng);
  });

  EXTRA_COUNTRY_LOCATIONS.forEach((country) => {
    addLocation(country.name, country.lat, country.lng);
  });

  return locations.sort((a, b) => a.name.localeCompare(b.name));
}

const COUNTRY_LOCATIONS = buildCountryLocations();
const COUNTRY_NAMES = COUNTRY_LOCATIONS.map((country) => country.name);
const BOARD_CARD_POSITIONS = [
  { left: '9%', top: '12%', rotate: '-5deg' },
  { left: '37%', top: '8%', rotate: '3deg' },
  { left: '66%', top: '14%', rotate: '-2deg' },
  { left: '17%', top: '42%', rotate: '4deg' },
  { left: '48%', top: '38%', rotate: '-4deg' },
  { left: '72%', top: '46%', rotate: '5deg' },
  { left: '31%', top: '68%', rotate: '-2deg' },
  { left: '60%', top: '69%', rotate: '3deg' },
];
const PHOTO_PINS_ENDPOINT = '/api/community-day-pins';
const MAX_PHOTO_DIMENSION = 1200;
const PHOTO_UPLOAD_QUALITY = 0.82;

function normalizeStoredPin(pin) {
  if (!pin?.id || !pin?.avatarUrl || !pin?.country) return null;
  const lat = Number(pin.lat);
  const lng = Number(pin.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: String(pin.id),
    name: pin.name || 'AWS Community Day Singapore guest',
    avatarUrl: pin.avatarUrl,
    category: 'aws-community-day-singapore',
    location: pin.location || pin.country,
    country: pin.country,
    lat,
    lng,
    createdAt: Number(pin.createdAt) || Date.now(),
  };
}

function addOrReplacePin(currentPins, nextPin) {
  if (currentPins.some((pin) => pin.id === nextPin.id)) {
    return currentPins.map((pin) => (pin.id === nextPin.id ? nextPin : pin));
  }
  return [...currentPins, nextPin];
}

function releaseObjectUrl(url, photoUrls) {
  if (!url || !photoUrls.has(url)) return;
  URL.revokeObjectURL(url);
  photoUrls.delete(url);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Unable to read image'));
    };
    image.src = imageUrl;
  });
}

async function loadImageSource(file) {
  if ('createImageBitmap' in window) {
    try {
      return createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fall through to the image element path for formats unsupported by createImageBitmap.
    }
  }

  return loadImageElement(file);
}

async function compressPhotoForUpload(file) {
  const image = await loadImageSource(file);
  const sourceWidth = image.width;
  const sourceHeight = image.height;
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Unable to prepare image canvas');
  context.drawImage(image, 0, 0, width, height);
  image.close?.();

  const webpBlob = await canvasToBlob(canvas, 'image/webp', PHOTO_UPLOAD_QUALITY);
  const jpegBlob = webpBlob || await canvasToBlob(canvas, 'image/jpeg', 0.88);
  if (!jpegBlob) throw new Error('Unable to prepare image');

  const extension = jpegBlob.type === 'image/webp' ? 'webp' : 'jpg';
  return new File([jpegBlob], `community-day-photo.${extension}`, { type: jpegBlob.type });
}

function createPhotoId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getBoardCardStyle(index, isLatest) {
  const position = BOARD_CARD_POSITIONS[index % BOARD_CARD_POSITIONS.length];
  const rowOffset = Math.floor(index / BOARD_CARD_POSITIONS.length) * 2;
  return {
    left: `calc(${position.left} + ${rowOffset}%)`,
    top: `calc(${position.top} + ${rowOffset}%)`,
    width: 'clamp(86px, 18vw, 128px)',
    transform: `rotate(${position.rotate})`,
    animation: isLatest
      ? 'country-board-new-card 720ms cubic-bezier(0.2, 0.9, 0.2, 1.1) both'
      : 'country-board-card-in 520ms cubic-bezier(0.2, 0.9, 0.2, 1) both',
    animationDelay: `${Math.min(index * 70, 420)}ms`,
  };
}

export default function AwsCommunityDaySingaporeScene({ darkMode }) {
  const fileInputRef = useRef(null);
  const photoUrlsRef = useRef(new Set());
  const [draftPhoto, setDraftPhoto] = useState(null);
  const [photoPins, setPhotoPins] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [boardCountry, setBoardCountry] = useState(null);
  const [latestPinId, setLatestPinId] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const [photoStatus, setPhotoStatus] = useState('loading');
  const [photoError, setPhotoError] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);

  useEffect(() => {
    const photoUrls = photoUrlsRef.current;
    return () => {
      photoUrls.forEach((url) => URL.revokeObjectURL(url));
      photoUrls.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPhotoPins() {
      setPhotoStatus('loading');
      try {
        const response = await fetch(PHOTO_PINS_ENDPOINT, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || !contentType.includes('application/json')) {
          throw new Error('Photo pin API unavailable');
        }

        const data = await response.json();
        const nextPins = Array.isArray(data.pins)
          ? data.pins.map(normalizeStoredPin).filter(Boolean)
          : [];

        if (!cancelled) {
          setPhotoPins(nextPins);
          setPhotoStatus('ready');
          setPhotoError(null);
        }
      } catch (error) {
        console.warn('Using local-only photo pins', error);
        if (!cancelled) {
          setPhotoStatus('local');
          setPhotoError('Local preview; deployed site saves photos');
        }
      }
    }

    loadPhotoPins();
    return () => {
      cancelled = true;
    };
  }, []);

  const boardPins = useMemo(
    () => (boardCountry ? photoPins.filter((pin) => pin.country === boardCountry) : []),
    [boardCountry, photoPins]
  );

  const flyToTarget = useMemo(() => {
    if (!focusTarget) return null;
    return focusTarget;
  }, [focusTarget]);

  function createPinFromDraft(countryName, location, avatarUrl, createdAt = Date.now()) {
    if (!draftPhoto) return null;
    return {
      id: draftPhoto.id,
      name: 'AWS Community Day Singapore guest',
      avatarUrl,
      category: 'aws-community-day-singapore',
      location: location.name,
      country: location.name,
      lat: location.lat,
      lng: location.lng,
      createdAt,
    };
  }

  async function savePhotoPin(countryName, location) {
    const file = await compressPhotoForUpload(draftPhoto.file);
    const formData = new FormData();
    formData.set('id', draftPhoto.id);
    formData.set('country', countryName);
    formData.set('lat', String(location.lat));
    formData.set('lng', String(location.lng));
    formData.set('file', file);

    const response = await fetch(PHOTO_PINS_ENDPOINT, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Unable to save photo');
    }

    const savedPin = normalizeStoredPin(data.pin);
    if (!savedPin) throw new Error('Saved photo response was incomplete');

    return savedPin;
  }

  async function pinDraftPhoto(countryName) {
    const location = COUNTRY_LOCATIONS.find((country) => country.name === countryName);
    if (!draftPhoto || !location || savingPhoto) return;

    setSavingPhoto(true);
    setPhotoError(null);

    let nextPin;
    try {
      nextPin = await savePhotoPin(countryName, location);
      releaseObjectUrl(draftPhoto.url, photoUrlsRef.current);
      setPhotoStatus('ready');
    } catch (error) {
      console.warn('Saving photo pin locally only', error);
      nextPin = createPinFromDraft(countryName, location, draftPhoto.url);
      setPhotoStatus('local');
      setPhotoError('Saved locally only; Blob upload unavailable');
    }

    if (!nextPin) {
      setSavingPhoto(false);
      return;
    }

    setPhotoPins((currentPins) => addOrReplacePin(currentPins, nextPin));
    setLatestPinId(nextPin.id);
    setFocusTarget({
      lat: location.lat,
      lng: location.lng,
      nonce: nextPin.id,
    });
    setDraftPhoto(null);
    setSelectedCountry(null);
    setSavingPhoto(false);
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);
    photoUrlsRef.current.add(nextUrl);

    if (draftPhoto && !photoPins.some((pin) => pin.id === draftPhoto.id)) {
      URL.revokeObjectURL(draftPhoto.url);
      photoUrlsRef.current.delete(draftPhoto.url);
    }

    setDraftPhoto({ id: createPhotoId(), url: nextUrl, file });
    setSelectedCountry(null);
    setPhotoError(null);
  }

  function resetPhoto() {
    if (savingPhoto) return;
    if (draftPhoto) {
      URL.revokeObjectURL(draftPhoto.url);
      photoUrlsRef.current.delete(draftPhoto.url);
    }
    setDraftPhoto(null);
    setSelectedCountry(null);
  }

  function openPhotoPicker() {
    if (savingPhoto) return;
    fileInputRef.current?.click();
  }

  function handleCountryChange(countryName) {
    if (savingPhoto) return;
    if (!countryName) {
      setSelectedCountry(null);
      return;
    }

    setSelectedCountry(countryName);
    void pinDraftPhoto(countryName);
  }

  function openCountryBoard(payload) {
    const firstPin = Array.isArray(payload) ? payload[0] : payload;
    if (firstPin?.country) setBoardCountry(firstPin.country);
  }

  const panelBg = darkMode ? 'rgba(7, 16, 25, 0.78)' : 'rgba(255, 255, 255, 0.86)';
  const panelBorder = darkMode ? 'rgba(76, 109, 138, 0.45)' : 'rgba(160, 187, 212, 0.85)';
  const textColor = darkMode ? '#F7FBFF' : '#0F1923';
  const mutedColor = darkMode ? '#9AAEC0' : '#5C748B';
  const statusText = (() => {
    if (savingPhoto) return 'Saving photo to the globe';
    if (photoStatus === 'loading') return 'Loading community cards';
    if (photoError) return photoError;
    if (draftPhoto && selectedCountry) return `Pinned in ${selectedCountry}`;
    if (draftPhoto) return 'Choose country to pin photo';
    if (photoPins.length) return `${photoPins.length} ${photoPins.length === 1 ? 'card' : 'cards'} pinned`;
    return '2026 community photo globe';
  })();
  const globeProps = {
    category: 'aws-community-day-singapore',
    members: photoPins,
    onMarkerClick: openCountryBoard,
    cardOpen: Boolean(boardCountry),
    darkMode,
    flyToTarget,
    zoomCommand: null,
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <GlobeErrorBoundary
          resetKey={`aws-community-day-singapore-${darkMode}`}
          fallback={<FlatMapScene {...globeProps} hideControls />}
        >
          <ClassicGlobeScene {...globeProps} />
        </GlobeErrorBoundary>
      </div>

      <div
        className="pointer-events-none absolute inset-x-4 top-4 z-20 flex justify-center"
        style={{ color: textColor }}
      >
        <div
          className="max-w-[min(92vw,560px)] rounded-full px-4 py-2 text-center"
          style={{
            background: panelBg,
            border: `1px solid ${panelBorder}`,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          <p className="text-xs font-black uppercase" style={{ color: '#FF9900', letterSpacing: '0.1em' }}>
            AWS Community Day Singapore
          </p>
          <p className="text-xs font-semibold" style={{ color: mutedColor }}>
            {statusText}
          </p>
        </div>
      </div>

      {boardCountry && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center px-4 py-5"
          role="dialog"
          aria-modal="true"
          aria-label={`${boardCountry} photo board`}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close board"
            onClick={() => setBoardCountry(null)}
            style={{ background: 'rgba(3, 9, 15, 0.64)', border: 0 }}
          />

          <div
            className="relative flex max-h-[min(78vh,720px)] w-full max-w-4xl flex-col gap-3"
            style={{ color: '#FFF8E8' }}
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-black uppercase" style={{ color: '#FF9900', letterSpacing: '0.12em' }}>
                  {boardCountry}
                </p>
                <p className="text-sm font-bold">
                  {boardPins.length} {boardPins.length === 1 ? 'card' : 'cards'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBoardCountry(null)}
                className="min-h-10 rounded-full px-4 text-xs font-bold"
                style={{
                  color: '#FFF8E8',
                  background: 'rgba(7, 16, 25, 0.72)',
                  border: '1px solid rgba(255, 248, 232, 0.32)',
                }}
              >
                Close
              </button>
            </div>

            <div
              className="relative overflow-hidden rounded-md p-3"
              style={{
                height: 'min(62vh, 560px)',
                minHeight: '360px',
                background: 'linear-gradient(135deg, #5F351B 0%, #A06B36 32%, #6F3D1F 66%, #3E2111 100%)',
                boxShadow: '0 30px 70px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255,255,255,0.16)',
              }}
            >
              <div
                className="relative h-full overflow-hidden rounded-sm"
                style={{
                  background:
                    'linear-gradient(45deg, rgba(255,255,255,0.08) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.06) 75%, transparent 75%), #B9824F',
                  backgroundSize: '22px 22px',
                  boxShadow: 'inset 0 0 0 1px rgba(40, 20, 9, 0.35), inset 0 14px 34px rgba(60, 28, 10, 0.28)',
                }}
              >
                {boardPins.map((pin, index) => {
                  const isLatest = pin.id === latestPinId;
                  return (
                    <div
                      key={pin.id}
                      className="absolute"
                      aria-label={`${pin.country} board card`}
                      style={getBoardCardStyle(index, isLatest)}
                    >
                      <div
                        className="absolute left-1/2 top-[-7px] z-10 h-4 w-4 -translate-x-1/2 rounded-full"
                        style={{
                          background: '#FF9900',
                          border: '2px solid #FFF8E8',
                          boxShadow: '0 5px 8px rgba(54, 29, 11, 0.38)',
                          animation: isLatest ? 'country-board-pin-pop 600ms 460ms ease both' : undefined,
                        }}
                      />
                      <div
                        className="relative flex flex-col"
                        style={{
                          padding: '7px 7px 13px',
                          background: '#FFF8E8',
                          color: '#0F1923',
                          border: '1px solid rgba(15, 25, 35, 0.1)',
                          boxShadow: '0 13px 18px rgba(54, 29, 11, 0.28), inset 0 0 0 1px rgba(255,255,255,0.72)',
                        }}
                      >
                        <div
                          className="overflow-hidden"
                          style={{ aspectRatio: '4 / 3', background: '#0F1923' }}
                        >
                          <img src={pin.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                        </div>
                        <div
                          className="mt-2 grid gap-1 text-[8px] font-black uppercase"
                          style={{ letterSpacing: '0.06em', lineHeight: 1.12 }}
                        >
                          <span>AWS Community Day</span>
                          <span style={{ color: '#FF9900' }}>{pin.country}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <style>
            {`
              @keyframes country-board-card-in {
                from { opacity: 0; transform: translateY(-20px) scale(1.08) rotate(-7deg); }
                to { opacity: 1; }
              }
              @keyframes country-board-new-card {
                0% { opacity: 0; transform: translateY(-44px) scale(1.18) rotate(8deg); }
                62% { opacity: 1; transform: translateY(4px) scale(0.98) rotate(-3deg); }
                100% { opacity: 1; }
              }
              @keyframes country-board-pin-pop {
                0% { transform: translateX(-50%) scale(2.4); opacity: 0; }
                55% { transform: translateX(-50%) scale(0.86); opacity: 1; }
                100% { transform: translateX(-50%) scale(1); opacity: 1; }
              }
            `}
          </style>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-5 z-40 flex justify-center px-4">
        <div
          className="flex items-center justify-center gap-2 rounded-[28px] p-1"
          style={{
            maxWidth: 'calc(100vw - 32px)',
            flexWrap: 'wrap',
            background: panelBg,
            border: `1px solid ${panelBorder}`,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          <button
            type="button"
            onClick={openPhotoPicker}
            disabled={savingPhoto}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-5 text-xs font-bold disabled:cursor-wait"
            style={{
              color: '#0F1923',
              background: savingPhoto ? 'rgba(255, 153, 0, 0.62)' : '#FF9900',
              border: '1px solid #FF9900',
            }}
          >
            {savingPhoto ? 'Saving Photo' : draftPhoto ? 'Retake Photo' : photoPins.length ? 'Take Photo Again' : 'Take Photo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />

          {draftPhoto && (
            <CountryDropdown
              darkMode={darkMode}
              countries={COUNTRY_NAMES}
              selectedCountry={selectedCountry}
              onCountryChange={handleCountryChange}
              buttonLabel="Choose country"
              allowAll={false}
              className="text-xs"
              buttonStyle={{
                minHeight: '44px',
                maxWidth: 'min(62vw, 240px)',
                padding: '0 14px',
                borderRadius: '999px',
                border: `1px solid ${panelBorder}`,
                color: selectedCountry ? '#FF9900' : textColor,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            />
          )}

          {draftPhoto && (
            <button
              type="button"
              onClick={resetPhoto}
              disabled={savingPhoto}
              className="min-h-11 rounded-full px-4 text-xs font-semibold"
              style={{ color: textColor, background: 'transparent', border: `1px solid ${panelBorder}` }}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
