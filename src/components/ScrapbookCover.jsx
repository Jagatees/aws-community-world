import { ArrowRightIcon, CloudIcon, SparkleIcon } from '@phosphor-icons/react';
import './ScrapbookCover.css';

export default function ScrapbookCover({ back = false, onOpen, disabled = false }) {
  const label = back ? 'Reopen scrapbook' : 'Open scrapbook';

  return (
    <div className={`sb-closed-book-wrap${back ? ' sb-closed-book-back' : ''}`}>
      <button
        type="button"
        className="sb-closed-book"
        aria-label={label}
        onClick={onOpen}
        disabled={disabled}
      >
        <span className="sb-closed-volume" aria-hidden="true">
          <span className="sb-closed-backboard" />
          <span className="sb-closed-leaf-block" />
          <span className="sb-closed-bookmark" />
          <span className="sb-closed-binding" />
          <span className="sb-closed-face">
            <span className="sb-closed-cloth" />
            <span className="sb-closed-emboss-border" />
            <span className="sb-closed-binding-ridge" />
            {back ? (
              <>
                <span className="sb-closed-cloud"><CloudIcon weight="regular" /></span>
                <span className="sb-closed-back-note">There’s always<br />another page.</span>
                <span className="sb-closed-back-imprint">AWS COMMUNITY SCRAPBOOK</span>
                <span className="sb-closed-back-spark"><SparkleIcon weight="fill" /></span>
              </>
            ) : (
              <>
                <span className="sb-closed-edition">A LITTLE BOOK OF BIG POSSIBILITIES</span>
                <span className="sb-closed-title">
                  <span className="sb-closed-aws">AWS<span className="sb-closed-smile" /></span>
                  <span>Community</span>
                  <span className="sb-closed-title-last">Scrapbook</span>
                </span>
                <span className="sb-closed-title-star"><SparkleIcon weight="fill" /></span>
                <span className="sb-closed-cover-sticker">
                  <img src="/scrapbook/kiro-world.webp" alt="" draggable="false" />
                </span>
                <span className="sb-closed-hand-note">made of people.<br />full of possibility.</span>
                <span className="sb-closed-volume-number">VOL. 01 · BETTER TOGETHER</span>
              </>
            )}
          </span>
        </span>
      </button>
      <span className="sb-closed-caption" aria-hidden="true">{back ? 'One more little idea?' : 'Your story starts here.'}<span>{back ? 'Reopen the book' : 'Click to open'}<ArrowRightIcon /></span></span>
    </div>
  );
}
