import { useRef, useState, type ChangeEvent } from 'react';
import { CHAPTERS, KEEPERS } from '../game/data';
import { decodeSave, MAX_SAVE_BYTES, type Save } from '../game/storage';
import { Icon } from './Icon';

export function Journal({ save, onRestore }: { save: Save; onRestore: (save: Save) => void }) {
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
    setStatus('Your journal export is ready. Keep the file somewhere you can find it again.');
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
      setError('This file is too large. Choose an Emberwake journal smaller than 2 MB.');
      return;
    }
    try {
      const decoded = decodeSave(await file.text());
      if (id !== request.current) return;
      if (!decoded) {
        setError(
          'This is not a compatible Emberwake journal. Your current progress has not changed.',
        );
        return;
      }
      setPending(decoded);
    } catch {
      if (id === request.current)
        setError('This file could not be read. Your current progress has not changed.');
    }
  }

  return (
    <div className="journal-content">
      <p>
        Your stories belong to you. Download a journal to keep a backup or carry your exact
        expedition to another browser.
      </p>
      <button className="primary-button" onClick={download}>
        <Icon name="book" size={17} /> Download journal
      </button>
      <div className="journal-divider">
        <span>OR BRING A STORY BACK</span>
      </div>
      <label className="journal-file">
        <span>
          <Icon name="thread" size={20} />
          <strong>Choose a journal file</strong>
        </span>
        <small>Emberwake .json · up to 2 MB · stays on your device</small>
        <input
          type="file"
          accept=".json,application/json"
          aria-label="Choose a journal file"
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
          <span className="eyebrow">A STORY READY TO RETURN</span>
          <h3>
            {pending.run
              ? `${KEEPERS[pending.run.keeper].name} · ${pending.run.depth < 0 ? 'The road ahead' : CHAPTERS[Math.floor(pending.run.depth / 4)].short}`
              : 'A keeper’s chronicle'}
          </h3>
          {pending.run?.ruleset === 1 && (
            <p className="journal-classic">
              Classic crossing · the original rules and exact turn are preserved.
            </p>
          )}
          <div className="journal-summary">
            <span>
              <b>{pending.profile.lore.length}</b> memories
            </span>
            <span>
              <b>{pending.profile.wins}</b> victories
            </span>
            {pending.run && (
              <span>
                <b>
                  {pending.run.health}/{pending.run.maxHealth}
                </b>{' '}
                vitality
              </span>
            )}
          </div>
          <p>
            Restoring replaces the expedition and chronicle on this device. Download your current
            journal first if you want to keep both.
          </p>
          <button className="secondary-button" onClick={() => onRestore(pending)}>
            Restore this journal <Icon name="arrow" size={15} />
          </button>
        </div>
      )}
      <p className="journal-privacy">
        <Icon name="shield" size={13} /> Files are checked and opened here. Nothing is uploaded.
      </p>
    </div>
  );
}
