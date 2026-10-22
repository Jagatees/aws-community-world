import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowsOutCardinalIcon, CheckIcon, PaletteIcon, TrashIcon } from '@phosphor-icons/react';
import ScrapbookReactions from './ScrapbookReactions';
import './ScrapbookNote.css';

const FONTS = [
  ['hand', 'Handwritten'], ['sans', 'Simple'], ['serif', 'Bookish'], ['mono', 'Monospace'],
];
const COLORS = [
  ['#283b3a', 'Ink'], ['#9e4e1b', 'Warm orange'], ['#27675b', 'Forest green'],
  ['#795783', 'Plum'], ['#36587c', 'Blue'], ['#9b415b', 'Rose'],
];
const SIZES = [[18, 'Small'], [24, 'Medium'], [32, 'Large']];
const stopPropagation = (event) => event.stopPropagation();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function ScrapbookNote({
  note, selected, editing, onSelect, onEdit, onChange, onDelete, onFinish, onReact, pageRef,
}) {
  const noteRef = useRef(null);
  const editorRef = useRef(null);
  const textRef = useRef(null);
  const toolbarRef = useRef(null);
  const dragRef = useRef(null);
  const [toolbarPosition, setToolbarPosition] = useState({ left: 12, top: 12 });
  const noteWidth = clamp(note.width || 55, 20, 88);

  useLayoutEffect(() => {
    if (!editing || !editorRef.current) return;
    editorRef.current.focus({ preventScroll: true });
    const length = editorRef.current.value.length;
    editorRef.current.setSelectionRange(length, length);
  }, [editing, note.id]);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const text = editing ? editorRef.current : textRef.current;
    if (!page || !text) return;

    function resizeText() {
      const availableHeight = Math.max(26, page.clientHeight * (0.96 - note.y / 100));
      text.style.maxHeight = `${availableHeight}px`;
      if (editing) {
        text.style.height = '0px';
        text.style.height = `${Math.min(text.scrollHeight + 2, availableHeight)}px`;
      }
      const noteElement = noteRef.current;
      if (!noteElement) return;
      const bounds = noteElement.getBoundingClientRect();
      const pageBounds = page.getBoundingClientRect();
      const needsAbove = bounds.bottom + 34 > pageBounds.bottom - 6;
      const hasAboveSpace = bounds.top - pageBounds.top >= 36;
      noteElement.style.setProperty('--note-reactions-top', needsAbove ? hasAboveSpace ? 'auto' : '4px' : 'calc(100% + 6px)');
      noteElement.style.setProperty('--note-reactions-bottom', needsAbove && hasAboveSpace ? 'calc(100% + 6px)' : 'auto');
      const alignRight = bounds.left + 84 > pageBounds.right - 6;
      noteElement.style.setProperty('--note-reactions-left', alignRight ? 'auto' : '0');
      noteElement.style.setProperty('--note-reactions-right', alignRight ? '0' : 'auto');
    }

    resizeText();
    const observer = new ResizeObserver(resizeText);
    observer.observe(page);
    if (noteRef.current) observer.observe(noteRef.current);
    return () => observer.disconnect();
  }, [editing, note.text, note.font, note.size, note.width, note.x, note.y, pageRef]);

  useLayoutEffect(() => {
    if (!selected) return;

    function positionToolbar() {
      const anchor = noteRef.current;
      const toolbar = toolbarRef.current;
      if (!anchor || !toolbar) return;
      const rect = anchor.getBoundingClientRect();
      const toolbarRect = toolbar.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const left = clamp(rect.left, 12, Math.max(12, viewportWidth - toolbarRect.width - 12));
      const above = rect.top - toolbarRect.height - 12;
      const top = clamp(above > 12 ? above : rect.bottom + 12, 12,
        Math.max(12, viewportHeight - toolbarRect.height - 12));
      setToolbarPosition((current) => current.left === left && current.top === top
        ? current : { left, top });
    }

    positionToolbar();
    const observer = new ResizeObserver(positionToolbar);
    if (noteRef.current) observer.observe(noteRef.current);
    if (toolbarRef.current) observer.observe(toolbarRef.current);
    window.addEventListener('resize', positionToolbar);
    window.addEventListener('scroll', positionToolbar, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', positionToolbar);
      window.removeEventListener('scroll', positionToolbar, true);
    };
  }, [selected, note.x, note.y, note.width, note.font, note.size, note.text]);

  function editNote(event) {
    event.stopPropagation();
    onSelect(note.id);
    onEdit(note.id);
  }

  function startDrag(event) {
    event.stopPropagation();
    if (event.button !== 0 || !pageRef.current) return;
    event.preventDefault();
    onSelect(note.id);
    const bounds = pageRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX, startY: event.clientY,
      width: bounds.width, height: bounds.height,
      originX: note.x, originY: note.y, x: note.x, y: note.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!drag || !noteRef.current) return;
    drag.x = clamp(drag.originX + (event.clientX - drag.startX) / drag.width * 100, 4, 96 - noteWidth);
    drag.y = clamp(drag.originY + (event.clientY - drag.startY) / drag.height * 100, 6, 88);
    noteRef.current.style.left = `${drag.x}%`;
    noteRef.current.style.top = `${drag.y}%`;
    noteRef.current.style.width = `${noteWidth}%`;
  }

  function finishDrag() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    onChange(note.id, { x: drag.x, y: drag.y });
  }

  function handleMoveKey(event) {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 5 : 1;
    onChange(note.id, {
      x: clamp(note.x + direction[0] * step, 4, 96 - noteWidth),
      y: clamp(note.y + direction[1] * step, 6, 88),
    });
  }

  function handleEscape(event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    onFinish();
  }

  return <>
    <div
      ref={noteRef}
      className={`sb-editable-note sb-reactable sb-note-font-${note.font || 'hand'}${note.id === 'welcome-title' ? ' sb-welcome-title' : ''}${selected ? ' is-selected' : ''}${editing ? ' is-editing' : ''}`}
      style={{
        left: `${note.x}%`, top: `${note.y}%`, width: `${Math.min(noteWidth, 96 - note.x)}%`,
        '--note-font-scale': (note.size || 24) / 10,
        '--note-color': note.color || '#283b3a',
      }}
      data-sb-interactive="true"
      onClick={stopPropagation}
      onPointerDown={stopPropagation}
      onKeyDown={handleEscape}
    >
      {editing ? <textarea
        ref={editorRef}
        className="sb-note-editor"
        aria-label="Your scrapbook note"
        placeholder="Write a little something…"
        value={note.text}
        maxLength={800}
        rows={1}
        onChange={(event) => onChange(note.id, { text: event.target.value })}
        spellCheck="true"
      /> : <button
        ref={textRef}
        type="button"
        className={`sb-note-text${note.text ? '' : ' is-empty'}`}
        aria-label={note.text ? `Edit note: ${note.text}` : 'Write a scrapbook note'}
        onClick={editNote}
      >{note.text || 'Write a little something…'}</button>}
      {!editing && <ScrapbookReactions reactions={note.reactions} onReact={onReact}
        label={note.text.trim() ? `Note: ${note.text.replace(/\s+/g, ' ').trim().slice(0, 40)}` : 'Note'} visible={selected} />}
    </div>
    {selected && createPortal(<div
      ref={toolbarRef}
      className="sb-note-toolbar"
      style={toolbarPosition}
      role="group"
      aria-label="Note formatting"
      data-sb-interactive="true"
      onClick={stopPropagation}
      onPointerDown={stopPropagation}
      onKeyDown={handleEscape}
    >
      <div className="sb-note-toolbar-main">
        <button
          type="button"
          className="sb-note-tool sb-note-move"
          aria-label="Move note. Drag or use arrow keys. Hold Shift for larger steps."
          title="Move note"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={finishDrag}
          onKeyDown={handleMoveKey}
        ><ArrowsOutCardinalIcon /></button>
        <label className="sb-note-font-control">
          <span className="sb-note-control-label">Font</span>
          <select aria-label="Note font" value={note.font || 'hand'} onChange={(event) => onChange(note.id, { font: event.target.value })}>
            {FONTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="sb-note-size-control">
          <span className="sb-note-control-label">Size</span>
          <select aria-label="Note text size" value={note.size || 24} onChange={(event) => onChange(note.id, { size: Number(event.target.value) })}>
            {SIZES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="button" className="sb-note-tool sb-note-delete" aria-label="Delete note" title="Delete note" onClick={() => onDelete(note.id)}><TrashIcon /></button>
        <button type="button" className="sb-note-tool sb-note-done" aria-label="Finish editing note" title="Done" onClick={onFinish}><CheckIcon weight="bold" /></button>
      </div>
      <div className="sb-note-colors" role="group" aria-label="Note text color">
        {COLORS.map(([color, label]) => <button
          type="button"
          key={color}
          className="sb-note-color"
          style={{ '--swatch-color': color }}
          aria-label={`${label} text`}
          aria-pressed={note.color === color}
          title={label}
          onClick={() => onChange(note.id, { color })}
        >{note.color === color && <CheckIcon weight="bold" />}</button>)}
        <label className="sb-note-custom-color" title="Choose another color">
          <PaletteIcon />
          <span>Custom</span>
          <input type="color" aria-label="Custom note text color" value={note.color || '#283b3a'} onChange={(event) => onChange(note.id, { color: event.target.value })} />
        </label>
      </div>
    </div>, document.fullscreenElement || document.body)}
  </>;
}
