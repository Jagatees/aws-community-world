import { useEffect, useRef, useState } from 'react';
import { buildSubmissionUrl } from '../utils/communitySubmission';
import './CommunitySubmission.css';

export default function CommunitySubmission({ darkMode }) {
  const dialog = useRef(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('profile');
  const [error, setError] = useState('');
  useEffect(() => { if (open && !dialog.current.open) dialog.current.showModal(); }, [open]);
  function submit(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const url = buildSubmissionUrl(form);
      // The visitor reviews and submits the public issue on GitHub.
      window.open(url, '_blank', 'noopener,noreferrer');
      setError('');
    } catch (e) { setError(e.message); }
  }
  return <>
    <button type="button" className="community-suggest-trigger" onClick={() => setOpen(true)} aria-label="Suggest a missing profile or event" title="Suggest a missing profile or event">＋<span> Suggest</span></button>
    {open && <dialog ref={dialog} className={`community-submission${darkMode ? '' : ' community-submission-light'}`} aria-labelledby="submission-title" onClose={() => setOpen(false)} onClick={event => { if (event.target === dialog.current) { const r = dialog.current.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.current.close(); } }}>
      <div className="submission-heading"><div><p>Help the community grow</p><h2 id="submission-title">Who are we missing?</h2></div><button type="button" aria-label="Close suggestion form" onClick={() => dialog.current.close()}>×</button></div>
      <p className="submission-intro">Suggest a public profile, group, or event. We’ll review the source before adding it to the globe.</p>
      <form onSubmit={submit}>
        <label>What would you like to add?<select name="kind" value={kind} onChange={e => setKind(e.target.value)}><option value="profile">Profile or community group</option><option value="event">Event</option></select></label>
        <label>{kind === 'event' ? 'Event name' : 'Person or group name'}<input name="name" required maxLength={100} autoComplete="off" /></label>
        <div className="submission-row">
          <label>Category<select name="category" key={kind}>{(kind === 'event' ? ['Kiro Event', 'Community Day', 'Builder Loft event', 'Other event'] : ['AWS Hero', 'Community Builder', 'User Group', 'Student Builder Group', 'Kiro Ambassador', 'AWS Ambassador', 'Other']).map(label => <option key={label}>{label}</option>)}</select></label>
          <label>City / country<input name="location" required maxLength={100} placeholder="Or Online" /></label>
        </div>
        <label>Official profile or event link<input name="source" type="url" required maxLength={350} placeholder="https://…" /></label>
        {kind === 'event' && <label>Event date<input name="date" type="date" required /></label>}
        <label>Anything else? <span>(optional)</span><textarea name="notes" rows={3} maxLength={500} placeholder="For example, a public announcement confirming their ambassador status." /></label>
        <p className="submission-note">Next: review and submit on GitHub. A GitHub account is required; submitted details will be public. Please share only public profile and event information.</p>
        {error && <p role="alert">{error}</p>}
        <button className="submission-submit" type="submit">Review on GitHub ↗</button>
      </form>
    </dialog>}
  </>;
}
