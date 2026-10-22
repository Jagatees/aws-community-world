import { HeartIcon, ThumbsUpIcon } from '@phosphor-icons/react';
import './ScrapbookReactions.css';

const REACTIONS = [
  { type: 'heart', name: 'Heart', Icon: HeartIcon },
  { type: 'thumbsup', name: 'Thumbs up', Icon: ThumbsUpIcon },
];
const stopPropagation = (event) => event.stopPropagation();
const stopReactionKey = (event) => {
  if (event.key !== 'Escape') event.stopPropagation();
};

export default function ScrapbookReactions({
  reactions = {}, onReact, label = 'Scrapbook item', visible = false,
}) {
  const hasReaction = Boolean(reactions.heart || reactions.thumbsup);

  return <div
    className={`sb-reactions${visible || hasReaction ? ' is-visible' : ''}`}
    role="group"
    aria-label={`Reactions to ${label}`}
    data-sb-interactive="true"
    onClick={stopPropagation}
    onDoubleClick={stopPropagation}
    onPointerDown={stopPropagation}
    onPointerUp={stopPropagation}
    onKeyDown={stopReactionKey}
    onKeyUp={stopReactionKey}
  >
    {REACTIONS.map((reaction) => {
      const { type, name } = reaction;
      const Icon = reaction.Icon;
      const active = Boolean(reactions[type]);
      const title = `${name} reaction on ${label}`;
      return <button
        key={type}
        type="button"
        className={`sb-reaction-button sb-reaction-${type}`}
        aria-label={`${title}: ${active ? '1 reaction, yours' : '0 reactions'}`}
        aria-pressed={active}
        title={title}
        onClick={(event) => {
          event.stopPropagation();
          onReact?.(type);
        }}
      >
        <Icon weight={active ? 'fill' : 'regular'} aria-hidden="true" />
        <span aria-hidden="true">{active ? 1 : 0}</span>
      </button>;
    })}
  </div>;
}
