import { KEEPERS, RELICS, type KeeperId } from '../game/data';
import { DUSK_MAX, DUSK_RULES, type Run } from '../game/engine';
import { DEEDS, duskUnlocked, scoreOf, type Meta } from '../game/meta';
import { Icon } from './Icon';

/** Choose how hard the night is. Every active rule is listed before leaving. */
export function DuskPicker({
  meta,
  keeper,
  dusk,
  onDusk,
  disabled,
}: {
  meta: Meta;
  keeper: KeeperId;
  dusk: number;
  onDusk: (level: number) => void;
  disabled?: boolean;
}) {
  const open = duskUnlocked(meta, keeper);
  const best = meta.best[keeper];
  return (
    <div className="night-picker">
      <div className="sidebar-heading">
        <span className="eyebrow">03 · CHOOSE YOUR NIGHT</span>
        <h2>How deep is the dark?</h2>
      </div>
      <div className="dusk-levels" role="group" aria-label="Dusk level">
        {Array.from({ length: DUSK_MAX + 1 }, (_, level) => (
          <button
            key={level}
            aria-pressed={dusk === level}
            aria-label={`Dusk ${level}${level > open ? ', locked' : ''}`}
            disabled={disabled || level > open}
            onClick={() => onDusk(level)}
          >
            {level > open ? <Icon name="eye" size={11} /> : level}
          </button>
        ))}
      </div>
      {dusk === 0 ? (
        <p className="dusk-summary">
          <b>Dusk 0 · The road as written.</b> No added hardship.
          {open === 0 && ` Complete an expedition with ${KEEPERS[keeper].name} to open Dusk 1.`}
        </p>
      ) : (
        <div className="dusk-summary">
          <b>
            Dusk {dusk} · score ×{(1 + dusk * 0.2).toFixed(1)}
          </b>
          <ol>
            {DUSK_RULES.slice(0, dusk).map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </div>
      )}
      <p className="night-record">
        <Icon name="flame" size={13} />
        {best
          ? `${KEEPERS[keeper].name}’s best: ${best.toLocaleString('en')} · Dusk ${open} open`
          : `${KEEPERS[keeper].name} has no record yet.`}
        {meta.streak > 1 && ` · ${meta.streak} roads completed in a row`}
      </p>
    </div>
  );
}

/** The ending screen's account of the expedition: nothing hidden, every line added up. */
export function ScoreCard({
  run,
  meta,
  earned,
  previousBest,
}: {
  run: Run;
  meta: Meta;
  earned: string[];
  previousBest: number;
}) {
  const score = scoreOf(run);
  const deeds = DEEDS.filter((d) => earned.includes(d.id));
  const record = score.total > previousBest && score.total > 0;
  return (
    <div className="score-card">
      <div className="score-total">
        <span className="eyebrow">{record ? 'A NEW BEST' : 'THIS ROAD'}</span>
        <strong>{score.total.toLocaleString('en')}</strong>
        <small>
          {previousBest > 0 && !record
            ? `${KEEPERS[run.keeper].name}’s best: ${previousBest.toLocaleString('en')}`
            : record && previousBest > 0
              ? `Previous best: ${previousBest.toLocaleString('en')}`
              : `${KEEPERS[run.keeper].name}’s first record`}
        </small>
      </div>
      <dl className="score-lines">
        {score.lines.map((line) => (
          <div key={line.label}>
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
        {score.multiplier > 1 && (
          <div>
            <dt>Dusk {run.dusk}</dt>
            <dd>×{score.multiplier.toFixed(1)}</dd>
          </div>
        )}
      </dl>
      {(deeds.length > 0 ||
        (run.phase === 'won' && run.ruleset === 3 && (run.dusk ?? 0) < DUSK_MAX)) && (
        <ul className="score-news">
          {run.phase === 'won' &&
            run.ruleset === 3 &&
            duskUnlocked(meta, run.keeper) === (run.dusk ?? 0) + 1 && (
              <li>
                <Icon name="eye" size={15} />
                <span>
                  <b>Dusk {(run.dusk ?? 0) + 1} is open</b> for {KEEPERS[run.keeper].name}: a harder
                  night, a higher score.
                </span>
              </li>
            )}
          {deeds.map((d) => (
            <li key={d.id}>
              <Icon name="sparkles" size={15} />
              <span>
                <b>{d.name}</b> · {d.text}
                {d.unlocks && ` New relic on future roads: ${RELICS[d.unlocks].name}.`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
