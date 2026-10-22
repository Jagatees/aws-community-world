import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowsOutCardinalIcon, MinusIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import ScrapbookReactions from './ScrapbookReactions';
import './ScrapbookImage.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const stopPropagation = (event) => event.stopPropagation();

export default function ScrapbookImage({ image, selected, onSelect, onChange, onDelete, onReact, pageRef }) {
  const elementRef = useRef(null);
  const dragRef = useRef(null);
  const maxYRef = useRef(80);
  const captionRef = useRef(null);
  const originalCaptionRef = useRef('');
  const [editingCaption, setEditingCaption] = useState(false);
  const width = clamp(image.width || 36, 20, 70);

  useLayoutEffect(() => {
    if (!editingCaption || !captionRef.current) return;
    captionRef.current.focus({ preventScroll: true });
    captionRef.current.select();
  }, [editingCaption]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    const page = pageRef.current;
    if (!element || !page) return;
    function keepPhotoOnPage() {
      const pageHeight = page.getBoundingClientRect().height;
      if (!pageHeight) return;
      // Leave room for the reaction row as well as the whole photo card.
      const photoHeight = element.getBoundingClientRect().height;
      maxYRef.current = clamp(96 - (photoHeight + 34) / pageHeight * 100, 6, 80);
      element.style.top = `${clamp(image.y, 6, maxYRef.current)}%`;
    }
    keepPhotoOnPage();
    const observer = new ResizeObserver(keepPhotoOnPage);
    observer.observe(page);
    observer.observe(element);
    return () => observer.disconnect();
  }, [image.y, width, pageRef]);

  function startDrag(event, fromHandle = false) {
    event.stopPropagation();
    if (event.button !== 0 || !pageRef.current || (!fromHandle && event.target.closest('button, input'))) return;
    event.preventDefault();
    onSelect(image.id);
    const bounds = pageRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX, startY: event.clientY,
      width: bounds.width, height: bounds.height,
      originX: image.x, originY: clamp(image.y, 6, maxYRef.current),
      x: image.x, y: clamp(image.y, 6, maxYRef.current),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!drag || !elementRef.current) return;
    drag.x = clamp(drag.originX + (event.clientX - drag.startX) / drag.width * 100, 4, 94 - width);
    drag.y = clamp(drag.originY + (event.clientY - drag.startY) / drag.height * 100, 6, maxYRef.current);
    elementRef.current.style.left = `${drag.x}%`;
    elementRef.current.style.top = `${drag.y}%`;
  }

  function finishDrag() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    onChange(image.id, { x: drag.x, y: drag.y });
  }

  function resizeImage(change) {
    const nextWidth = clamp(width + change, 20, 70);
    onChange(image.id, { width: nextWidth, x: clamp(image.x, 4, 94 - nextWidth) });
  }

  function editCaption(event) {
    event.stopPropagation();
    onSelect(image.id);
    originalCaptionRef.current = image.caption || '';
    setEditingCaption(true);
  }

  function handleCaptionKey(event) {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      setEditingCaption(false);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onChange(image.id, { caption: originalCaptionRef.current });
      setEditingCaption(false);
    }
  }

  function handleKey(event) {
    if (event.target.closest('button, input')) return;
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 5 : 1;
      onChange(image.id, {
        x: clamp(image.x + direction[0] * step, 4, 94 - width),
        y: clamp(clamp(image.y, 6, maxYRef.current) + direction[1] * step, 6, maxYRef.current),
      });
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      onDelete(image.id);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      onSelect(image.id);
    }
  }

  return <figure
    ref={elementRef}
    className={`sb-community-image sb-reactable${selected ? ' is-selected' : ''}`}
    style={{ left: `${image.x}%`, top: `${image.y}%`, width: `${width}%` }}
    data-sb-interactive="true"
    role="group"
    aria-label={`${image.caption || 'Community photo'}. Drag or use arrow keys to move; Delete to remove.`}
    tabIndex={0}
    onPointerDown={startDrag}
    onPointerMove={moveDrag}
    onPointerUp={finishDrag}
    onPointerCancel={finishDrag}
    onLostPointerCapture={finishDrag}
    onClick={(event) => { event.stopPropagation(); onSelect(image.id); }}
    onFocus={() => onSelect(image.id)}
    onKeyDown={handleKey}
  >
    <img className="sb-community-image-photo" src={image.src} alt={image.caption || 'Community photo'} draggable="false" />
    <figcaption>{editingCaption ? <input
      ref={captionRef}
      className="sb-image-caption-input"
      type="text"
      aria-label="Photo name"
      placeholder="Community photo"
      value={image.caption || ''}
      maxLength={120}
      onChange={(event) => onChange(image.id, { caption: event.target.value })}
      onBlur={() => setEditingCaption(false)}
      onKeyDown={handleCaptionKey}
      onPointerDown={stopPropagation}
      onClick={stopPropagation}
    /> : <button
      type="button"
      className="sb-image-caption-button"
      aria-label={`Edit photo name: ${image.caption || 'Community photo'}`}
      title="Click to edit photo name"
      onClick={editCaption}
      onPointerDown={stopPropagation}
    >{image.caption || 'Community photo'}</button>}</figcaption>
    {selected && <div className="sb-image-actions" role="group" aria-label="Photo controls" onClick={stopPropagation}>
      <button type="button" className="sb-image-move" aria-label="Move photo. Drag or use arrow keys on the photo."
        title="Move photo" onPointerDown={(event) => startDrag(event, true)}
        onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}
      ><ArrowsOutCardinalIcon /></button>
      <button type="button" aria-label="Make photo smaller" title="Smaller" disabled={width <= 20} onClick={() => resizeImage(-5)}><MinusIcon /></button>
      <button type="button" aria-label="Make photo larger" title="Larger" disabled={width >= 70} onClick={() => resizeImage(5)}><PlusIcon /></button>
      <button type="button" aria-label="Rename photo" title="Rename photo" onClick={editCaption}><PencilSimpleIcon /></button>
      <button type="button" aria-label="Remove photo" title="Remove photo" onClick={() => onDelete(image.id)}><TrashIcon /></button>
    </div>}
    <ScrapbookReactions reactions={image.reactions} onReact={onReact} label={image.caption || 'Community photo'} visible={selected} />
  </figure>;
}
