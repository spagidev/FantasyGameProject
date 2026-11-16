import { KEEPERS, RELICS, type KeeperId } from '../game/data';
import { DUSK_MAX, DUSK_RULES, type Run } from '../game/engine';
import { DEEDS, duskUnlocked, scoreOf, type Meta } from '../game/meta';
import { useT } from '../i18n';
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
  const t = useT();
  const open = duskUnlocked(meta, keeper);
  const best = meta.best[keeper];
  return (
    <div className="night-picker">
      <div className="sidebar-heading">
        <span className="eyebrow">{t.night.step3}</span>
        <h2>{t.night.howDeep}</h2>
      </div>
      <div className="dusk-levels" role="group" aria-label={t.night.duskLevel}>
        {Array.from({ length: DUSK_MAX + 1 }, (_, level) => (
          <button
            key={level}
            aria-pressed={dusk === level}
            aria-label={t.night.duskAria(level, level > open)}
            disabled={disabled || level > open}
            onClick={() => onDusk(level)}
          >
            {level > open ? <Icon name="eye" size={11} /> : level}
          </button>
        ))}
      </div>
      {dusk === 0 ? (
        <p className="dusk-summary">
          <b>{t.night.dusk0}</b>
          {t.night.noHardship}
          {open === 0 && t.night.openDusk1(KEEPERS[keeper].name)}
        </p>
      ) : (
        <div className="dusk-summary">
          <b>{t.night.duskScore(dusk, (1 + dusk * 0.2).toFixed(1).replace('.', t.decimalSep))}</b>
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
          ? t.night.best(KEEPERS[keeper].name, best.toLocaleString(t.locale), open)
          : t.night.noRecord(KEEPERS[keeper].name)}
        {meta.streak > 1 && t.night.streak(meta.streak)}
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
  const t = useT();
  const score = scoreOf(run);
  const deeds = DEEDS.filter((d) => earned.includes(d.id));
  const record = score.total > previousBest && score.total > 0;
  return (
    <div className="score-card">
      <div className="score-total">
        <span className="eyebrow">{record ? t.night.newBest : t.night.thisRoad}</span>
        <strong>{score.total.toLocaleString(t.locale)}</strong>
        <small>
          {previousBest > 0 && !record
            ? t.night.bestOf(KEEPERS[run.keeper].name, previousBest.toLocaleString(t.locale))
            : record && previousBest > 0
              ? t.night.previousBest(previousBest.toLocaleString(t.locale))
              : t.night.firstRecord(KEEPERS[run.keeper].name)}
        </small>
      </div>
      <dl className="score-lines">
        {score.lines.map((line, i) => (
          <div key={score.parts[i].id}>
            <dt>{t.night.scoreLine(score.parts[i].id, score.parts[i].n, line.label)}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
        {score.multiplier > 1 && (
          <div>
            <dt>{t.night.duskLine(run.dusk ?? 0)}</dt>
            <dd>×{score.multiplier.toFixed(1).replace('.', t.decimalSep)}</dd>
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
                  <b>{t.night.duskOpen((run.dusk ?? 0) + 1)}</b>
                  {t.night.duskOpenFor(KEEPERS[run.keeper].name)}
                </span>
              </li>
            )}
          {deeds.map((d) => (
            <li key={d.id}>
              <Icon name="sparkles" size={15} />
              <span>
                <b>{d.name}</b> · {d.text}
                {d.unlocks && t.night.newRelic(RELICS[d.unlocks].name)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
