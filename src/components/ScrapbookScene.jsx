import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeftIcon, ArrowRightIcon, ArrowCounterClockwiseIcon, BookOpenIcon,
  BugIcon, CatIcon, ClockIcon, CloudIcon, CodeIcon, CoffeeIcon, CornersOutIcon,
  FireIcon, GraduationCapIcon, HeartIcon, ImageSquareIcon, LightningIcon, MagnifyingGlassIcon,
  MinusIcon, MoonIcon, PizzaIcon, PlusIcon, RocketIcon, SmileyIcon, SparkleIcon,
  StarFourIcon, StickerIcon, TrashIcon, UsersThreeIcon, WifiHighIcon, XIcon,
} from '@phosphor-icons/react';
import { scrapbookStickers } from '../data/scrapbook';
import {
  BOOK_SPREADS, BOOK_STORAGE_KEY, LAST_BOOK_POSITION,
  bookPositionFromSearch, positionLabel, readBook, toggleReaction,
} from '../utils/scrapbookBook';
import { prepareScrapbookPhoto } from '../utils/scrapbookPhoto';
import ScrapbookCover from './ScrapbookCover';
import ScrapbookNote from './ScrapbookNote';
import ScrapbookImage from './ScrapbookImage';
import ScrapbookReactions from './ScrapbookReactions';
import './ScrapbookScene.css';

const STICKERS = scrapbookStickers;
const FILTERS = [
  ['all', 'All stickers'], ['cute', 'Cute things'], ['funny', 'Funny little moods'],
  ['countries', 'Countries'], ['friends', 'Kiro & friends'], ['service', 'AWS services'],
  ['community', 'Community'], ['words', 'Little notes'],
];
const TYPE_ORDER = { friends: 0, cute: 1, funny: 2, countries: 3, service: 4, community: 5, words: 6 };
const STICKER_ENTRIES = Object.entries(STICKERS).sort(([, a], [, b]) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
const WORD_ICONS = {
  bug: BugIcon, cat: CatIcon, clock: ClockIcon, cloud: CloudIcon, code: CodeIcon,
  coffee: CoffeeIcon, fire: FireIcon, lightning: LightningIcon, moon: MoonIcon,
  pizza: PizzaIcon, rocket: RocketIcon, smile: SmileyIcon, sparkle: SparkleIcon,
  undo: ArrowCounterClockwiseIcon, wifi: WifiHighIcon,
};
const STARS = Array.from({ length: 65 }, (_, i) => ({
  left: `${(i * 37.71 + 5) % 100}%`, top: `${(i * 19.37 + 8) % 100}%`,
  size: i % 9 === 0 ? 3 : i % 3 === 0 ? 2 : 1, delay: `${-(i % 7)}s`,
}));

function KiroStamp({ lazy }) {
  return <span className="sb-kiro-stamp" aria-hidden="true"><img src="/aws-service-icons/kiro.svg" alt="" draggable="false" loading={lazy ? 'lazy' : 'eager'} decoding="async" /><span>KIRO</span></span>;
}

function StickerArtwork({ id, lazy = false }) {
  const sticker = STICKERS[id];
  if (!sticker) return null;
  if (sticker.type === 'friends') return <img className="sb-friend-art" src={sticker.src} alt={sticker.label} draggable="false" loading={lazy ? 'lazy' : 'eager'} decoding="async" />;
  if (sticker.type === 'cute' || sticker.type === 'countries') return (
    <span className={`sb-branded-sticker sb-branded-${sticker.type}`}>
      <img className={`sb-friend-art sb-art-${sticker.type}`} src={sticker.src} alt={sticker.label} draggable="false" loading={lazy ? 'lazy' : 'eager'} decoding="async" />
      {!sticker.branded && <KiroStamp lazy={lazy} />}
    </span>
  );
  if (sticker.type === 'words' || sticker.type === 'funny') {
    const Icon = WORD_ICONS[sticker.icon] || SparkleIcon;
    return (
      <span className={`sb-branded-sticker sb-branded-${sticker.type}`}>
        <span className={`sb-word-sticker ${sticker.type === 'funny' ? 'sb-funny-sticker' : ''}`} style={{ '--sticker-color': sticker.color }}>
          <Icon weight="duotone" />
          <span>{sticker.label}</span>
        </span>
        <KiroStamp lazy={lazy} />
      </span>
    );
  }
  if (sticker.type === 'community') {
    const Mark = id === 'sbg' ? GraduationCapIcon : id === 'hero' ? StarFourIcon : id === 'builder' ? HeartIcon : UsersThreeIcon;
    const name = id === 'hero' ? 'HERO' : id === 'builder' ? 'BUILDER' : id === 'sbg' ? 'SBG' : id === 'ambassador' ? 'KIRO' : 'USER GROUP';
    return (
      <span className={`sb-community-sticker sb-community-${id}`} style={{ '--sticker-color': sticker.color }}>
        <span className="sb-badge-top">{id === 'ambassador' ? 'AMBASSADOR' : 'AWS COMMUNITY'}</span>
        <Mark weight="duotone" />
        <strong>{name}</strong>
        <span className="sb-badge-bottom">{id === 'sbg' ? 'STUDENT BUILDERS' : 'BETTER TOGETHER'}</span>
      </span>
    );
  }
  return (
    <span className="sb-service-sticker">
      <img src={sticker.src} alt="" draggable="false" loading={lazy ? 'lazy' : 'eager'} decoding="async" />
      <span>{id === 'lambda' ? 'Lambda' : id === 's3' ? 'S3' : id === 'dynamodb' ? 'DynamoDB' : id === 'bedrock' ? 'Bedrock' : id === 'ec2' ? 'EC2' : id === 'eventbridge' ? 'EventBridge' : 'Kiro'}</span>
    </span>
  );
}


const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const EMPTY_SPREAD = { stickers: [], notes: [], images: [] };
const POSITIONS = Array.from({ length: LAST_BOOK_POSITION + 1 }, (_, i) => i);

function storedBookPayload(book) {
  return JSON.stringify({ ...book, spreads: Object.fromEntries(Object.entries(book.spreads).map(([id, value]) => [id,
    { ...value, notes: value.notes.filter((note) => note.text.trim()) },
  ])) });
}

function MovableSticker({ item, selected, onSelect, onMove, onDelete, onReact, pageRef }) {
  const elementRef = useRef(null);
  const dragRef = useRef(null);

  function startDrag(event) {
    if (event.button !== 0 || event.target.closest('button')) return;
    event.stopPropagation();
    onSelect(item.id);
    const bounds = pageRef.current.getBoundingClientRect();
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: item.x, originY: item.y, x: item.x, y: item.y, width: bounds.width, height: bounds.height };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!drag) return;
    drag.x = clamp(drag.originX + (event.clientX - drag.startX) / drag.width * 100, 5, 95);
    drag.y = clamp(drag.originY + (event.clientY - drag.startY) / drag.height * 100, 6, 94);
    elementRef.current.style.left = `${drag.x}%`;
    elementRef.current.style.top = `${drag.y}%`;
  }

  function finishDrag() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    onMove(item.id, { x: drag.x, y: drag.y });
  }

  function handleKey(event) {
    if (event.target.closest('button')) return;
    const moves = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] };
    if (moves[event.key]) {
      event.preventDefault(); event.stopPropagation();
      const [dx, dy] = moves[event.key];
      onMove(item.id, { x: clamp(item.x + dx, 5, 95), y: clamp(item.y + dy, 6, 94) });
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault(); event.stopPropagation(); onDelete(item.id);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); onSelect(item.id);
    }
  }

  return <div ref={elementRef}
    className={`sb-movable-sticker sb-reactable ${selected ? 'is-selected' : ''}`}
    style={{ left: `${item.x}%`, top: `${item.y}%`, '--sticker-rotation': `${item.rotation}deg` }}
    data-sb-interactive="true" role="group"
    aria-label={`${STICKERS[item.sticker].label} sticker. Drag or use arrow keys to move; Delete to remove.`}
    tabIndex={0} onPointerDown={startDrag} onPointerMove={moveDrag}
    onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}
    onClick={(event) => { event.stopPropagation(); onSelect(item.id); }}
    onFocus={() => onSelect(item.id)} onKeyDown={handleKey}>
    <StickerArtwork id={item.sticker} />
    {selected && <div className="sb-sticker-actions">
      <button type="button" onClick={(event) => { event.stopPropagation(); onMove(item.id, { rotation: (item.rotation + 15) % 360 }); }} aria-label="Rotate selected sticker"><ArrowCounterClockwiseIcon /></button>
      <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(item.id); }} aria-label="Remove selected sticker"><TrashIcon /></button>
    </div>}
    <ScrapbookReactions reactions={item.reactions} onReact={onReact} label={STICKERS[item.sticker].label} visible={selected} />
  </div>;
}

function EditablePaper({ side, number, spread, selectedSticker, selectedNote, selectedImage, editingNote,
  pendingSticker, pendingPhoto, onPaperClick, onStickerSelect, onStickerMove, onStickerDelete,
  onNoteSelect, onNoteEdit, onNoteChange, onNoteDelete, onNoteFinish, onReact,
  onImageSelect, onImageChange, onImageDelete, disabled }) {
  const pageRef = useRef(null);
  const ghostRef = useRef(null);

  function pagePosition(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: clamp((event.clientX - bounds.left) / bounds.width * 100, 4, 96), y: clamp((event.clientY - bounds.top) / bounds.height * 100, 6, 94) };
  }

  function movePreview(event) {
    if ((!pendingSticker && !pendingPhoto) || !ghostRef.current || event.pointerType === 'touch') return;
    const point = pagePosition(event);
    ghostRef.current.style.left = `${point.x}%`;
    ghostRef.current.style.top = `${point.y}%`;
    ghostRef.current.style.opacity = event.target.closest('[data-sb-interactive]') ? '0' : '.7';
  }

  return <div ref={pageRef}
    className={`sb-paper sb-paper-${side} sb-blank-paper ${pendingSticker || pendingPhoto ? 'sb-placement-ready' : ''}`}
    role="group" aria-label={`Page ${number}. Click to write${pendingSticker ? ` or place ${STICKERS[pendingSticker].label}` : pendingPhoto ? ' or place your photo' : ''}.`}
    inert={disabled || undefined}
    tabIndex={disabled ? -1 : 0}
    onClick={(event) => {
      if (disabled || event.target.closest('[data-sb-interactive]')) return;
      onPaperClick(side, pagePosition(event));
    }}
    onPointerMove={movePreview}
    onPointerLeave={() => { if (ghostRef.current) ghostRef.current.style.opacity = '0'; }}
    onKeyDown={(event) => {
      if (event.target !== event.currentTarget || disabled || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault(); onPaperClick(side, { x: 22, y: 25 });
    }}>
    <span className="sb-paper-grain" aria-hidden="true" />
    <span className="sb-page-number">{String(number).padStart(2, '0')}</span>
    {spread.notes.filter((note) => note.side === side).map((note) => <ScrapbookNote
      key={note.id} note={note} selected={!disabled && selectedNote === note.id} editing={!disabled && editingNote === note.id}
      onSelect={onNoteSelect} onEdit={onNoteEdit} onChange={onNoteChange}
      onDelete={onNoteDelete} onFinish={onNoteFinish} onReact={(type) => onReact('notes', note.id, type)} pageRef={pageRef} />)}
    {(spread.images || []).filter((image) => image.side === side).map((image) => <ScrapbookImage
      key={image.id} image={image} selected={!disabled && selectedImage === image.id}
      onSelect={onImageSelect} onChange={onImageChange} onDelete={onImageDelete}
      onReact={(type) => onReact('images', image.id, type)} pageRef={pageRef} />)}
    {spread.stickers.filter((item) => item.side === side).map((item) => <MovableSticker
      key={item.id} item={item} selected={!disabled && selectedSticker === item.id} onSelect={onStickerSelect}
      onMove={onStickerMove} onDelete={onStickerDelete} onReact={(type) => onReact('stickers', item.id, type)} pageRef={pageRef} />)}
    {pendingSticker && !disabled && <div ref={ghostRef} className="sb-placement-ghost" aria-hidden="true"><StickerArtwork id={pendingSticker} /></div>}
    {pendingPhoto && !disabled && <div ref={ghostRef} className="sb-placement-ghost sb-photo-ghost" aria-hidden="true"><img src={pendingPhoto.src} alt="" /></div>}
  </div>;
}

export default function ScrapbookScene() {
  const [position, setPosition] = useState(() => bookPositionFromSearch(window.location.search));
  const [book, setBook] = useState(() => readBook());
  const [trayOpen, setTrayOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [stickerSearch, setStickerSearch] = useState('');
  const [pendingSticker, setPendingSticker] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [turning, setTurning] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState('');
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const sceneRef = useRef(null);
  const stageRef = useRef(null);
  const trayRef = useRef(null);
  const trayToggleRef = useRef(null);
  const photoInputRef = useRef(null);
  const photoReadId = useRef(0);
  const turnTimers = useRef([]);
  const statusTimer = useRef(null);
  const turnLock = useRef(false);
  const swipeStart = useRef(null);
  const suppressPaperClick = useRef(false);
  const suppressClickTimer = useRef(null);
  const lastPersistedPayload = useRef(null);
  const initialStorageSync = useRef(true);
  const activeDraft = useRef(null);
  const spreadId = BOOK_SPREADS[position - 1]?.id;
  const spread = book.spreads[spreadId] || EMPTY_SPREAD;
  const closed = position === 0 || position === LAST_BOOK_POSITION;

  useEffect(() => {
    activeDraft.current = { id: editingNote, spreadId };
  }, [editingNote, spreadId]);

  useEffect(() => {
    function syncStoredBook(event) {
      if (event && event.key !== BOOK_STORAGE_KEY && event.key !== null) return;
      const incoming = readBook();
      lastPersistedPayload.current = storedBookPayload(incoming);
      setBook((current) => {
        const active = activeDraft.current;
        const draft = current.spreads[active?.spreadId]?.notes.find((note) => note.id === active?.id && !note.text.trim());
        if (draft && !incoming.spreads[active.spreadId].notes.some((note) => note.id === draft.id)) {
          incoming.spreads[active.spreadId].notes.push(draft);
        }
        return incoming;
      });
    }
    // Restore the newest browser copy before a stale open tab can save over it.
    initialStorageSync.current = true;
    syncStoredBook();
    window.addEventListener('storage', syncStoredBook);
    return () => window.removeEventListener('storage', syncStoredBook);
  }, []);

  useEffect(() => {
    if (initialStorageSync.current) { initialStorageSync.current = false; return; }
    const payload = storedBookPayload(book);
    if (payload === lastPersistedPayload.current) return;
    try {
      localStorage.setItem(BOOK_STORAGE_KEY, payload);
      lastPersistedPayload.current = payload;
    }
    catch { queueMicrotask(() => setStorageUnavailable(true)); }
  }, [book]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('spread', String(position));
    window.history.replaceState(null, '', url);
    stageRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [position]);

  useEffect(() => {
    function restorePosition() {
      if (new URLSearchParams(window.location.search).get('view') !== 'scrapbook') return;
      turnTimers.current.forEach(window.clearTimeout);
      turnLock.current = false;
      setTurning(null); setSelectedNote(null); setEditingNote(null);
      setSelectedSticker(null); setPendingSticker(null);
      setSelectedImage(null); setPendingPhoto(null); setPhotoLoading(false);
      photoReadId.current += 1;
      setPosition(bookPositionFromSearch(window.location.search));
    }
    window.addEventListener('popstate', restorePosition);
    return () => window.removeEventListener('popstate', restorePosition);
  }, []);

  useEffect(() => () => {
    turnTimers.current.forEach(window.clearTimeout);
    turnLock.current = false;
    window.clearTimeout(statusTimer.current);
    window.clearTimeout(suppressClickTimer.current);
    photoReadId.current += 1;
  }, []);

  const announce = useCallback((text) => {
    setMessage(text);
    window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setMessage(''), 3000);
  }, []);

  const finishNote = useCallback(() => {
    if (editingNote && spreadId) setBook((current) => ({ ...current, spreads: {
      ...current.spreads, [spreadId]: { ...current.spreads[spreadId],
        notes: current.spreads[spreadId].notes.filter((note) => note.id !== editingNote || note.text.trim()),
      },
    } }));
    setEditingNote(null); setSelectedNote(null);
  }, [editingNote, spreadId]);

  const turnTo = useCallback((next) => {
    if (turnLock.current || next === position || next < 0 || next > LAST_BOOK_POSITION) return;
    finishNote(); setSelectedSticker(null); setPendingSticker(null);
    setSelectedImage(null); setPendingPhoto(null); setPhotoLoading(false);
    photoReadId.current += 1;
    turnLock.current = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setPosition(next); turnLock.current = false; return; }
    const coverTransition = position === 0 || position === LAST_BOOK_POSITION || next === 0 || next === LAST_BOOK_POSITION;
    setTurning({ direction: next > position ? 'forward' : 'backward', from: position, cover: coverTransition });
    turnTimers.current = [
      window.setTimeout(() => setPosition(next), 230),
      window.setTimeout(() => { setTurning(null); turnLock.current = false; }, 650),
    ];
  }, [position, finishNote]);

  useEffect(() => {
    function keyDown(event) {
      if (event.key === 'Escape') {
        finishNote(); setTrayOpen(false); setSelectedSticker(null); setPendingSticker(null);
        setSelectedImage(null); setPendingPhoto(null); setPhotoLoading(false);
        photoReadId.current += 1;
        if (trayOpen) trayToggleRef.current?.focus();
        return;
      }
      if (trayOpen || event.target.closest('button, a, input, select, textarea, [tabindex="0"], [data-sb-interactive]')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); turnTo(position + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); turnTo(position - 1); }
    }
    window.addEventListener('keydown', keyDown);
    return () => window.removeEventListener('keydown', keyDown);
  }, [position, turnTo, trayOpen, finishNote]);

  useEffect(() => {
    if (trayOpen) trayRef.current?.querySelector('button')?.focus();
  }, [trayOpen]);

  function changeSpread(update) {
    if (!spreadId) return;
    setBook((current) => ({ ...current, spreads: { ...current.spreads,
      [spreadId]: update(current.spreads[spreadId]),
    } }));
  }

  function selectNote(id) {
    setSelectedSticker(null); setPendingSticker(null); setSelectedNote(id);
    setSelectedImage(null); setPendingPhoto(null);
  }

  function editNote(id) {
    if (editingNote !== id) finishNote();
    selectNote(id); setEditingNote(id);
  }

  function changeNote(id, patch) {
    changeSpread((current) => ({ ...current, notes: current.notes.map((note) => note.id === id ? { ...note, ...patch } : note) }));
  }

  function deleteNote(id) {
    changeSpread((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }));
    setSelectedNote(null); setEditingNote(null); announce('Note removed.');
  }

  function paperClick(side, point) {
    if (suppressPaperClick.current) { suppressPaperClick.current = false; return; }
    if (turnLock.current || !spreadId) return;
    finishNote(); setSelectedSticker(null); setSelectedImage(null);
    if (pendingPhoto) {
      const images = Object.values(book.spreads).flatMap((value) => value.images || []);
      if (images.length >= 8 || images.reduce((sum, image) => sum + image.src.length, 0) + pendingPhoto.src.length > 2_000_000) {
        announce('Your photo space is full. Remove a photo to make room.');
        return;
      }
      const image = { id: crypto.randomUUID(), ...pendingPhoto, side,
        x: clamp(point.x - 18, 4, 58), y: clamp(point.y - 12, 6, 75), width: 36 };
      changeSpread((current) => ({ ...current, images: [...(current.images || []), image] }));
      setSelectedImage(image.id); setPendingPhoto(null);
      announce('Photo placed. Drag to move it or use the controls to resize it.');
      return;
    }
    if (pendingSticker) {
      if (spread.stickers.length >= 30) { announce('This spread is full. Remove a sticker to make room.'); return; }
      const item = { id: crypto.randomUUID(), sticker: pendingSticker, side, x: point.x, y: point.y, rotation: 0 };
      changeSpread((current) => ({ ...current, stickers: [...current.stickers, item] }));
      setSelectedSticker(item.id); setPendingSticker(null);
      announce('Sticker placed. Drag to move it.');
      return;
    }
    if (spread.notes.filter((note) => note.text.trim()).length >= 20) { announce('This spread is full. Edit an existing note or try another page.'); return; }
    const note = { id: crypto.randomUUID(), side, text: '', x: clamp(point.x, 4, 70), y: clamp(point.y, 6, 85), font: 'hand', color: '#283b3a', size: 24 };
    changeSpread((current) => ({ ...current, notes: [...current.notes.filter((item) => item.text.trim()), note] }));
    setSelectedNote(note.id); setEditingNote(note.id);
  }

  function selectSticker(id) {
    finishNote(); setPendingSticker(null); setSelectedSticker(id);
    setSelectedImage(null); setPendingPhoto(null);
  }

  function updateSticker(id, patch) {
    changeSpread((current) => ({ ...current, stickers: current.stickers.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  function deleteSticker(id) {
    changeSpread((current) => ({ ...current, stickers: current.stickers.filter((item) => item.id !== id) }));
    setSelectedSticker(null); announce('Sticker removed.');
  }

  function chooseSticker(id) {
    finishNote(); setSelectedSticker(null); setPendingSticker(id); setTrayOpen(false);
    setSelectedImage(null); setPendingPhoto(null);
    announce(`Click a page to place ${STICKERS[id].label}. Escape cancels.`);
  }

  function toggleTray() {
    finishNote(); setPendingSticker(null); setSelectedSticker(null);
    setSelectedImage(null); setPendingPhoto(null);
    if (closed) turnTo(position === 0 ? 1 : BOOK_SPREADS.length);
    setTrayOpen((open) => !open);
  }

  function undoSticker() {
    changeSpread((current) => ({ ...current, stickers: current.stickers.slice(0, -1) }));
    setSelectedSticker(null); announce('Last added sticker removed.');
  }

  function reactToItem(collection, id, type) {
    changeSpread((current) => ({ ...current,
      [collection]: (current[collection] || []).map((item) => item.id === id ? toggleReaction(item, type) : item),
    }));
  }

  function selectImage(id) {
    finishNote(); setSelectedNote(null); setSelectedSticker(null);
    setPendingSticker(null); setPendingPhoto(null); setSelectedImage(id);
  }

  function updateImage(id, patch) {
    changeSpread((current) => ({ ...current,
      images: (current.images || []).map((image) => image.id === id ? { ...image, ...patch } : image),
    }));
  }

  function deleteImage(id) {
    changeSpread((current) => ({ ...current, images: (current.images || []).filter((image) => image.id !== id) }));
    setSelectedImage(null); announce('Photo removed.');
  }

  function requestPhoto() {
    finishNote(); setSelectedSticker(null); setSelectedImage(null);
    setPendingSticker(null); setPendingPhoto(null); setTrayOpen(false);
    if (closed) turnTo(position === 0 ? 1 : BOOK_SPREADS.length);
    photoInputRef.current?.click();
  }

  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const request = ++photoReadId.current;
    setPhotoLoading(true);
    try {
      const src = await prepareScrapbookPhoto(file);
      if (request !== photoReadId.current) return;
      const caption = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 80) || 'Community photo';
      setPendingPhoto({ src, caption });
      announce('Your photo is ready. Click a page to place it.');
    } catch (error) {
      if (request === photoReadId.current) announce(error.message || 'This photo could not be opened.');
    } finally {
      if (request === photoReadId.current) setPhotoLoading(false);
    }
  }

  function swipeEnd(event) {
    if (!swipeStart.current) return;
    const dx = event.clientX - swipeStart.current.x;
    const dy = event.clientY - swipeStart.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      suppressPaperClick.current = true;
      window.clearTimeout(suppressClickTimer.current);
      suppressClickTimer.current = window.setTimeout(() => { suppressPaperClick.current = false; }, 500);
      turnTo(position + (dx < 0 ? 1 : -1));
    }
    swipeStart.current = null;
  }

  async function toggleFullscreen() {
    finishNote();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (sceneRef.current?.requestFullscreen) await sceneRef.current.requestFullscreen();
      else announce('Fullscreen is unavailable in this browser.');
    } catch { announce('Fullscreen is unavailable in this browser.'); }
  }

  const hint = closed ? 'A little space for your story.' : pendingSticker
    ? `Click a page to place ${STICKERS[pendingSticker].label}. Press Escape to cancel.`
    : pendingPhoto ? 'Click a page to place your photo. Press Escape to cancel.'
    : 'Click to write. Add a sticker or photo. Leave a little love with a reaction.';
  const search = stickerSearch.trim().toLocaleLowerCase();
  const visibleStickers = STICKER_ENTRIES.filter(([id, item]) => (filter === 'all' || item.type === filter)
    && `${id} ${item.label} ${item.caption || ''} ${item.country || ''} ${(item.keywords || []).join(' ')} ${(item.tags || []).join(' ')}`.toLocaleLowerCase().includes(search));

  return <section ref={sceneRef} className={`scrapbook-scene sb-freeform-scene ${trayOpen ? 'sb-tray-is-open' : ''}`} aria-label="AWS community scrapbook">
    <div className="sb-cosmos" aria-hidden="true">
      <div className="sb-nebula" />
      {STARS.map((star, i) => <i key={i} style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay }} />)}
      <div className="sb-planet sb-planet-orange" /><div className="sb-planet sb-planet-lavender" />
      <CloudIcon className="sb-space-cloud sb-space-cloud-one" weight="duotone" /><CloudIcon className="sb-space-cloud sb-space-cloud-two" weight="duotone" />
      <img className="sb-space-kiro" src="/aws-service-icons/kiro.svg" alt="" />
    </div>
    <div className="sb-scene-top">
      <div className="sb-scene-intro"><span><BookOpenIcon weight="duotone" /> YOUR COMMUNITY SCRAPBOOK</span><h1>A little space. <em>Endless possibility.</em></h1><p className="sb-touch-hint">Tap a page to write. Choose a sticker, then tap to place it.</p></div>
      <div className="sb-scene-actions">
        <button type="button" className="sb-decorate-button sb-photo-button" onClick={requestPhoto} disabled={photoLoading || Boolean(turning)} aria-label="Add a community photo"><ImageSquareIcon weight="duotone" />{photoLoading ? 'Preparing…' : 'Photo'}</button>
        <button ref={trayToggleRef} type="button" className={`sb-decorate-button ${trayOpen ? 'is-active' : ''}`} aria-expanded={trayOpen} aria-controls="scrapbook-sticker-drawer" onClick={toggleTray}><StickerIcon weight="duotone" />Stickers<span>{STICKER_ENTRIES.length}</span></button>
      </div>
      <input ref={photoInputRef} className="sb-photo-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Choose a community photo" onChange={choosePhoto} />
    </div>

    <div ref={stageRef} className={`sb-stage ${closed ? 'sb-stage-closed' : ''}`} onPointerDown={(event) => {
      if (!event.target.closest('.sb-paper, [data-sb-interactive], .sb-closed-book')) { finishNote(); setSelectedSticker(null); setSelectedImage(null); }
    }}>
      <div className={`sb-book-scaler ${closed ? 'sb-closed-scaler' : ''} ${turning?.cover ? 'sb-cover-transition' : ''}`} style={{ '--book-zoom': zoom }}>
        {closed ? <ScrapbookCover back={position === LAST_BOOK_POSITION} onOpen={() => turnTo(position === 0 ? 1 : BOOK_SPREADS.length)} disabled={Boolean(turning)} /> : <div
          className={`sb-book sb-editable-book ${turning ? 'sb-is-turning' : ''}`} aria-busy={Boolean(turning)}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch' && !event.target.closest('[data-sb-interactive]')) swipeStart.current = { x: event.clientX, y: event.clientY };
          }} onPointerUp={swipeEnd} onPointerCancel={() => { swipeStart.current = null; }}>
          <div className="sb-book-cover" /><div className="sb-book-pages-edge" />
          <div className="sb-spread" key={spreadId}>
            {['left', 'right'].map((side, i) => <EditablePaper key={side} side={side} number={(position - 1) * 2 + i + 1} spread={spread}
              selectedSticker={selectedSticker} selectedNote={selectedNote} selectedImage={selectedImage} editingNote={editingNote}
              pendingSticker={pendingSticker} pendingPhoto={pendingPhoto} onPaperClick={paperClick} disabled={Boolean(turning)}
              onStickerSelect={selectSticker} onStickerMove={updateSticker} onStickerDelete={deleteSticker}
              onNoteSelect={selectNote} onNoteEdit={editNote} onNoteChange={changeNote} onNoteDelete={deleteNote} onNoteFinish={finishNote}
              onReact={reactToItem} onImageSelect={selectImage} onImageChange={updateImage} onImageDelete={deleteImage} />)}
          </div>
          <div className="sb-spine" aria-hidden="true" /><span className="sb-ribbon" aria-hidden="true" />
          {turning && !turning.cover && <div className={`sb-turn-sheet sb-turn-${turning.direction}`} aria-hidden="true"><div className="sb-turn-front"><div className={`sb-paper sb-paper-${turning.direction === 'forward' ? 'right' : 'left'}`}><span className="sb-paper-grain" /></div></div><div className="sb-turn-back"><SparkleIcon weight="duotone" /></div></div>}
        </div>}
      </div>
      <span className="sb-stage-note"><SparkleIcon weight="fill" />{hint}</span>
    </div>

    <footer className="sb-controls">
      <div className="sb-view-tools"><button type="button" onClick={() => setZoom((value) => Math.max(0.8, +(value - 0.1).toFixed(1)))} disabled={zoom <= 0.8} aria-label="Zoom out"><MinusIcon /></button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.2, +(value + 0.1).toFixed(1)))} disabled={zoom >= 1.2} aria-label="Zoom in"><PlusIcon /></button><span className="sb-tool-divider" /><button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen"><CornersOutIcon /></button></div>
      <nav className="sb-page-controls" aria-label="Scrapbook pages">
        <button type="button" className="sb-page-arrow" onClick={() => turnTo(position - 1)} disabled={position === 0 || Boolean(turning)} aria-label={position === 1 ? 'Close to front cover' : 'Previous spread'}><ArrowLeftIcon /></button>
        <div className="sb-page-indicator"><span>{String(position).padStart(2, '0')} <i>/ {String(LAST_BOOK_POSITION).padStart(2, '0')}</i></span><span>{positionLabel(position)}</span></div>
        <div className="sb-page-dots">{POSITIONS.map((item) => <button key={item} type="button" onClick={() => turnTo(item)} aria-label={`Go to ${positionLabel(item)}`} aria-current={position === item ? 'page' : undefined} disabled={Boolean(turning)}><i /></button>)}</div>
        <button type="button" className="sb-page-arrow" onClick={() => turnTo(position + 1)} disabled={position === LAST_BOOK_POSITION || Boolean(turning)} aria-label={position === BOOK_SPREADS.length ? 'Close to back cover' : position === 0 ? 'Open book' : 'Next spread'}><ArrowRightIcon /></button>
      </nav>
      <div className="sb-saved-note"><span className={storageUnavailable ? 'sb-storage-warning' : ''} />{storageUnavailable ? 'Changes stay for this visit' : 'Saved in this browser'}</div>
    </footer>

    {trayOpen && <aside ref={trayRef} id="scrapbook-sticker-drawer" className="sb-sticker-drawer" aria-label="Sticker drawer">
      <header><div><span>THE GOOD STUFF</span><h2>A little sticker joy.</h2></div><button type="button" onClick={() => { setTrayOpen(false); trayToggleRef.current?.focus(); }} aria-label="Close sticker drawer"><XIcon /></button></header>
      <p className="sb-drawer-intro">Choose a sticker. Click anywhere on a page to place it.</p>
      <label className="sb-sticker-search"><MagnifyingGlassIcon aria-hidden="true" /><span className="sb-screenreader">Search stickers</span><input type="search" value={stickerSearch} onChange={(event) => setStickerSearch(event.target.value)} placeholder="Cats, coffee, Singapore…" aria-controls="scrapbook-sticker-grid" /></label>
      <div className="sb-sticker-filters" role="group" aria-label="Filter stickers">{FILTERS.map(([id, name]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{name}</button>)}</div>
      <p className="sb-sticker-results" role="status" aria-live="polite" aria-atomic="true">{visibleStickers.length} of {STICKER_ENTRIES.length} stickers</p>
      <div className="sb-sticker-grid" id="scrapbook-sticker-grid">{visibleStickers.length ? visibleStickers.map(([id, item]) => <button type="button" className="sb-sticker-choice" key={id} onClick={() => chooseSticker(id)} aria-label={`Choose ${item.label} sticker`} disabled={Boolean(turning) || spread.stickers.length >= 30}><span><StickerArtwork id={id} lazy /></span><small>{item.label}</small><i><PlusIcon /></i></button>) : <p className="sb-sticker-empty">No stickers found. Try another search or category.</p>}</div>
      <div className="sb-drawer-footer"><span>{spread.stickers.length} / 30 on this spread</span><button type="button" onClick={undoSticker} disabled={!spread.stickers.length} aria-label="Undo last added sticker"><ArrowCounterClockwiseIcon /> Undo</button></div>
      <p className="sb-fan-note">A little fan-made joy. Marks belong to their owners.</p>
    </aside>}
    <div className={`sb-toast ${message ? 'is-visible' : ''}`} role="status" aria-live="polite">{message}</div>
    <span className="sb-screenreader" aria-live="polite">{positionLabel(position)}. {closed ? 'Click the cover to open the book.' : hint}</span>
  </section>;
}
