import { useEffect, useState } from 'react'
import { slides } from './content.js'
import './slides.css'

function readSlide() {
  const number = Number(window.location.hash.slice(1))
  return Number.isInteger(number) ? Math.max(0, Math.min(slides.length - 1, number - 1)) : 0
}

export default function Presentation() {
  const [current, setCurrent] = useState(readSlide)
  const [fullscreenError, setFullscreenError] = useState('')
  const slide = slides[current]

  function goTo(index) {
    window.location.hash = String(Math.max(0, Math.min(slides.length - 1, index)) + 1)
  }

  useEffect(() => {
    const onHash = () => setCurrent(readSlide())
    const onKey = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return
      const index = readSlide()
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
        event.preventDefault()
        goTo(index + 1)
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
        event.preventDefault()
        goTo(index - 1)
      } else if (event.key === 'Home') {
        event.preventDefault()
        goTo(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        goTo(slides.length - 1)
      }
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  async function toggleFullscreen() {
    try {
      setFullscreenError('')
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      setFullscreenError('Fullscreen is unavailable in this browser. You can use the browser’s fullscreen shortcut.')
    }
  }

  return (
    <div className="deck">
      <header className="deck-header">
        <a className="deck-brand" href="/">AWS <span>Globe</span></a>
        <div className="deck-tools">
          <span className="deck-draft">Presentation draft</span>
          <button onClick={toggleFullscreen}>Fullscreen</button>
        </div>
      </header>

      <main className="deck-stage" aria-label="Presentation">
        <article className={`deck-slide${slide.performance ? ' deck-slide-performance' : ''}${slide.comparison ? ' deck-slide-comparison' : ''}${slide.closing ? ' deck-slide-closing' : ''}`} key={current} aria-roledescription="slide" aria-label={`${current + 1} of ${slides.length}`}>
          <div className="deck-copy" aria-live="polite" aria-atomic="true">
            <p className="deck-eyebrow">{slide.label}</p>
            <h1>{slide.title}</h1>
            <p className="deck-description">{slide.text}</p>
            {slide.performance && <div className="deck-performance-evidence">
              <table><caption>Fewer image elements after grouping</caption><thead><tr><th scope="col">View</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody><tr><th scope="row">Student groups</th><td>696</td><td>15</td></tr><tr><th scope="row">User Groups</th><td>488</td><td>8</td></tr></tbody></table>
              <p>Local comparison · September 2026<br />Image counts measure reduced work, not FPS gains.</p>
            </div>}
            {slide.presenter && <div className="deck-presenter"><strong>{slide.presenter}</strong><span>{slide.role}</span></div>}
            {!slide.ready && <span className="deck-placeholder-label">Content to follow</span>}
          </div>
          {slide.closing ? null : slide.comparison ? <div className="deck-comparison">
            {(slide.comparisonImages || [
              { title: 'Before: competing markers', caption: 'Historical code · 2 September 2026', src: '/slides/markers-before.png', alt: 'Historical Student Builder Groups globe with overlapping portraits and markers' },
              { title: 'After: grouped discovery', caption: 'Current local version', src: '/slides/markers-after.png', alt: 'Current Student Builder Groups globe with numeric geographic clusters' },
            ]).map((item) => <figure key={item.src} className={slide.portraitComparison ? 'deck-portrait-comparison' : ''}><figcaption><strong>{item.title}</strong><span>{item.caption}</span></figcaption><a href={item.src} target="_blank" rel="noreferrer" aria-label={`Open full screenshot: ${item.title}`}><img src={item.src} alt={item.alt} /></a></figure>)}
            <p>{slide.comparisonCaption || 'Group nearby profiles, then reveal detail as you zoom. Local screenshots use different data snapshots; this is a visual comparison.'}</p>
          </div> : slide.points ? <div className="deck-story-points">{slide.points.map((point) => <section key={point.title}><h2>{point.title}</h2><p>{point.text}</p>{point.href && <a className="deck-demo-link" href={point.href} target="_blank" rel="noreferrer">{point.linkLabel} ↗</a>}</section>)}</div> : slide.image ? <div className="deck-project-image"><img src={slide.image} alt={slide.imageAlt} /><a href="/" target="_blank" rel="noreferrer">Explore awscommunityglobe.click ↗</a></div> : <div className="deck-visual">
            <span className="deck-visual-mark" aria-hidden="true">+</span>
            <p>{slide.visual}</p>
            <span>Visual placeholder</span>
          </div>}
          <div className="deck-slide-footer"><span>AWS Globe</span><span>{String(current + 1).padStart(2, '0')}</span></div>
        </article>
      </main>

      <footer className="deck-controls">
        <p className="deck-hint">Use ← → to navigate</p>
        <nav className="deck-pagination" aria-label="Choose a slide">
          {slides.map((item, index) => <button key={index} onClick={() => goTo(index)} aria-label={`Slide ${index + 1}: ${item.title}`} aria-current={index === current ? 'step' : undefined}>{index + 1}</button>)}
        </nav>
        <div className="deck-arrows">
          <button aria-label="Previous slide" onClick={() => goTo(current - 1)} disabled={current === 0}>←</button>
          <span>{current + 1} / {slides.length}</span>
          <button aria-label="Next slide" onClick={() => goTo(current + 1)} disabled={current === slides.length - 1}>→</button>
        </div>
      </footer>
      {slide.notes && <details className="deck-notes" key={`notes-${current}`}><summary>{slide.notesLabel || 'Speaking notes & renderer reference'}</summary><div>{slide.notes.map((note) => <p key={note}>{note}</p>)}<h2>{slide.referenceTitle || 'Implementations in the codebase'}</h2><ul>{slide.implementations.map((item) => <li key={item}>{item}</li>)}</ul></div></details>}
      {fullscreenError && <p className="deck-error" role="status">{fullscreenError}</p>}
    </div>
  )
}

