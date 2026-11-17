import { TIPS, type TipId } from '../game/tips';
import { useT } from '../i18n';
import { Icon } from './Icon';

/** One keeper's-guide note, in the flow above the board. Never a modal; never covers a control. */
export function GuideNote({
  id,
  onGotIt,
  onHide,
}: {
  id: TipId;
  onGotIt: () => void;
  onHide: () => void;
}) {
  const t = useT();
  const note = t.tips?.[id] ?? TIPS[id];
  const headingId = `guide-note-${id}`;
  return (
    <aside className="guide-note" role="note" aria-live="polite" aria-labelledby={headingId}>
      <div className="guide-note-body">
        <span className="eyebrow">
          <Icon name="book" size={12} /> {t.guide.eyebrow}
        </span>
        <h2 id={headingId}>{note.title}</h2>
        <p>{note.text}</p>
      </div>
      <div className="guide-note-actions">
        <button className="primary-button" onClick={onGotIt}>
          {t.guide.gotIt}
        </button>
        <button className="guide-note-hide" onClick={onHide}>
          {t.guide.hide}
        </button>
      </div>
    </aside>
  );
}
