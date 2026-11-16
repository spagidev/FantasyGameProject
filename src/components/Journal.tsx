import { useRef, useState, type ChangeEvent } from 'react';
import { CHAPTERS, KEEPERS } from '../game/data';
import { decodeSave, MAX_SAVE_BYTES, type Save } from '../game/storage';
import { useT } from '../i18n';
import { Icon } from './Icon';

export function Journal({ save, onRestore }: { save: Save; onRestore: (save: Save) => void }) {
  const t = useT();
  const [pending, setPending] = useState<Save | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const request = useRef(0);

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(save)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `emberwake-${save.run ? save.run.seed.toString(36) : 'journal'}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    setStatus(t.journal.exportReady);
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const id = ++request.current;
    setPending(null);
    setError('');
    setStatus('');
    if (file.size > MAX_SAVE_BYTES) {
      setError(t.journal.tooLarge);
      return;
    }
    try {
      const decoded = decodeSave(await file.text());
      if (id !== request.current) return;
      if (!decoded) {
        setError(t.journal.incompatible);
        return;
      }
      setPending(decoded);
    } catch {
      if (id === request.current) setError(t.journal.unreadable);
    }
  }

  return (
    <div className="journal-content">
      <p>{t.journal.intro}</p>
      <button className="primary-button" onClick={download}>
        <Icon name="book" size={17} /> {t.journal.download}
      </button>
      <div className="journal-divider">
        <span>{t.journal.orBring}</span>
      </div>
      <label className="journal-file">
        <span>
          <Icon name="thread" size={20} />
          <strong>{t.journal.chooseFile}</strong>
        </span>
        <small>{t.journal.fileHint}</small>
        <input
          type="file"
          accept=".json,application/json"
          aria-label={t.journal.chooseFile}
          onChange={selectFile}
        />
      </label>
      {error && (
        <p className="journal-error" role="alert">
          <Icon name="info" size={15} />
          {error}
        </p>
      )}
      {status && (
        <p className="journal-status" role="status">
          {status}
        </p>
      )}
      {pending && (
        <div className="journal-preview">
          <span className="eyebrow">{t.journal.readyEyebrow}</span>
          <h3>
            {pending.run
              ? `${KEEPERS[pending.run.keeper].name} · ${pending.run.depth < 0 ? t.journal.roadAhead : CHAPTERS[Math.floor(pending.run.depth / 4)].short}`
              : t.journal.chronicleTitle}
          </h3>
          {pending.run?.ruleset === 1 && <p className="journal-classic">{t.journal.classic}</p>}
          <div className="journal-summary">
            <span>
              <b>{pending.profile.lore.length}</b> {t.journal.memories}
            </span>
            <span>
              <b>{pending.profile.wins}</b> {t.journal.victories}
            </span>
            {pending.run && (
              <span>
                <b>
                  {pending.run.health}/{pending.run.maxHealth}
                </b>{' '}
                {t.journal.vitality}
              </span>
            )}
          </div>
          <p>{t.journal.restoreWarn}</p>
          <button className="secondary-button" onClick={() => onRestore(pending)}>
            {t.journal.restore} <Icon name="arrow" size={15} />
          </button>
        </div>
      )}
      <p className="journal-privacy">
        <Icon name="shield" size={13} /> {t.journal.privacy}
      </p>
    </div>
  );
}
