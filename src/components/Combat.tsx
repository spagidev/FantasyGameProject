import { useEffect, useRef, useState, type ReactNode } from 'react';
import { describeTraits } from '../game/bestiary';
import { KEEPERS, type Intent } from '../game/data';
import { VOICES } from '../game/lore';
import { TERRAIN } from '../game/terrain';
import { omenOf, OMENS } from '../game/omens';
import {
  realmOf,
  effectiveHit,
  flaskHealing,
  guardAmount,
  hitDamage,
  incomingDamage,
  intentFor,
  nextIntent,
  nodeOf,
  poisonAmount,
  skillCost,
  skillDamage,
  staggerBonus,
  strikeDamage,
  strikeFocus,
  strikeHealing,
  techniqueBlocked,
  transition,
  type Action,
  type Run,
} from '../game/engine';
import { EnemyPortrait, KeeperPortrait, Landscape } from './Art';
import { Icon, type IconName } from './Icon';
import { play } from '../sound';
import { en, type Dict } from '../i18n/en';
import { useT } from '../i18n';

type CombatAction = 'strike' | 'guard' | 'skill' | 'technique' | 'flask';
/** Keys 1–5 in ruleset 3; the first two rulesets keep their original 1–4. */
export function combatKeys(run: Run): CombatAction[] {
  return run.ruleset === 3
    ? ['strike', 'guard', 'skill', 'technique', 'flask']
    : ['strike', 'guard', 'skill', 'flask'];
}

/** Everything an intention does besides its damage, in the order the engine applies it. */
export function intentEffects(intent: Intent, t: Dict = en): string[] {
  const c = t.combat;
  return [
    ...(intent.guard ? [c.effGuard(intent.guard)] : []),
    ...(intent.heal ? [c.effHeal(intent.heal)] : []),
    ...(intent.fury ? [c.effFury(intent.fury)] : []),
    ...(intent.drain ? [c.effDrain(intent.drain)] : []),
    ...(intent.weak ? [c.effWeak(intent.weak)] : []),
    ...(intent.frost ? [c.effFrost(intent.frost)] : []),
  ];
}
export function intentIcon(intent: Intent): IconName {
  return intent.damage ? 'sword' : intent.guard ? 'shield' : intent.heal ? 'heart' : 'flame';
}

/**
 * The exact result of an action, read from the engine itself rather than recalculated:
 * the interface can never disagree with the rules.
 */
function preview(run: Run, type: CombatAction) {
  const after = transition(run, { type });
  if (after === run) return null;
  const over = after.phase !== 'combat';
  return {
    kills: over && after.phase !== 'lost',
    fatal: after.phase === 'lost',
    dealt: run.enemy!.health - (over ? 0 : after.enemy!.health),
    taken: run.health - after.health,
    breaks: (after.stats?.staggers ?? 0) > (run.stats?.staggers ?? 0),
    perfect: (after.stats?.parries ?? 0) > (run.stats?.parries ?? 0),
  };
}

/** A status chip. Hover shows its meaning; a tap or click writes it under the arena. */
function Chip({
  tone = '',
  text,
  explain,
  children,
}: {
  tone?: string;
  text: string;
  explain: (text: string) => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`chip ${tone}`} title={text} onClick={() => explain(text)}>
      {children}
    </button>
  );
}

type Floater = { id: number; side: 'enemy' | 'hero'; text: string; tone: string };

/** One sentence of guidance for a keeper's very first fights, chosen from the situation. */
function coaching(run: Run, t: Dict): string {
  const c = t.combat;
  const e = run.enemy!;
  const incoming = incomingDamage(run);
  if (e.stagger === 2) return c.coachStaggered;
  if (e.stagger === 1) return c.coachReeling;
  if (incoming >= guardAmount(run)) return c.coachHeavy(guardAmount(run));
  if (incoming > 0 && incoming <= guardAmount(run) && e.poise! <= incoming) return c.coachPerfect;
  if (!intentFor(run)!.damage) return c.coachFree;
  return c.coachRead(e.poise);
}

export function Combat({
  run,
  dispatch,
  coach = false,
}: {
  run: Run;
  dispatch: (a: Action) => void;
  coach?: boolean;
}) {
  const t = useT();
  const c = t.combat;
  const k = KEEPERS[run.keeper];
  const e = run.enemy!;
  const v3 = run.ruleset === 3;
  const intent = intentFor(run)!;
  const upcoming = nextIntent(run)!;
  const chapter = realmOf(run);
  const skipped = e.stagger === 2;
  const incoming = incomingDamage(run);
  const perHit = hitDamage(run, intent);
  const hits = intent.hits ?? 1;
  const strike = strikeDamage(run);
  const blocked = techniqueBlocked(run);
  const traits = describeTraits(e.traits);
  const ground = run.side ? undefined : nodeOf(run).terrain;

  // Floating feedback: compare this state with the one before it.
  const previous = useRef(run);
  const counter = useRef(0);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [explain, setExplain] = useState('');
  const [pulse, setPulse] = useState({ enemy: 0, hero: 0 });
  useEffect(() => {
    const before = previous.current;
    previous.current = run;
    if (before === run || before.depth !== run.depth || !before.enemy || before.phase !== 'combat')
      return;
    const next: Floater[] = [];
    const add = (side: Floater['side'], text: string, tone: string) =>
      next.push({ id: ++counter.current, side, text, tone });
    const dealt = before.enemy.health - e.health;
    const taken = before.health - run.health;
    if (dealt > 0) add('enemy', `−${dealt}`, 'damage');
    if (dealt < 0) add('enemy', `+${-dealt}`, 'heal');
    if ((run.stats?.staggers ?? 0) > (before.stats?.staggers ?? 0))
      add('enemy', c.floatStaggered, 'call');
    if (e.phase === 2 && before.enemy.phase === 1) add('enemy', e.phase2?.name ?? '', 'call');
    if (taken > 0) add('hero', `−${taken}`, 'damage');
    if (taken < 0) add('hero', `+${-taken}`, 'heal');
    if ((run.stats?.parries ?? 0) > (before.stats?.parries ?? 0))
      add('hero', c.floatPerfect, 'call');
    else if (taken === 0 && before.turn !== run.turn && incomingDamage(before) > 0 && !v3)
      add('hero', c.floatGuarded, 'call');
    if ((run.stats?.staggers ?? 0) > (before.stats?.staggers ?? 0)) play('stagger');
    else if ((run.stats?.parries ?? 0) > (before.stats?.parries ?? 0)) play('perfect');
    else if (taken > 0) play('hurt');
    else if (dealt > 0) play('strike');
    else if (taken < 0) play('heal');
    else if (before.turn !== run.turn) play('guard');
    if (!next.length) return;
    setFloaters(next);
    setPulse((p) => ({ enemy: p.enemy + (dealt > 0 ? 1 : 0), hero: p.hero + (taken > 0 ? 1 : 0) }));
    const timer = setTimeout(() => setFloaters([]), 1300);
    return () => clearTimeout(timer);
  }, [run, e, v3, c]);

  const buttons: {
    type: CombatAction;
    icon: IconName;
    title: string;
    detail: string;
    sub: string;
    special?: boolean;
    reason?: string;
  }[] = [
    {
      type: 'strike',
      icon: 'sword',
      title: c.strike,
      detail: c.strikeDetail(effectiveHit(run, strike.damage), strike.hits > 1),
      sub: `${c.plusFocus(strikeFocus(run))}${strikeHealing(run) ? c.healN(strikeHealing(run)) : ''}${
        v3 && e.traits?.thorns ? c.thornsN(e.traits.thorns) : ''
      }`,
    },
    {
      type: 'guard',
      icon: 'shield',
      title: c.guard,
      detail: c.guardDetail(guardAmount(run)),
      sub: `${c.plusFocus(2)}${run.relics.includes('briar') ? c.guardBriar : ''}${
        run.relics.includes('censer') ? c.guardCenser : ''
      }`,
    },
    {
      type: 'skill',
      icon: run.keeper === 'wayfarer' ? 'leaf' : 'sparkles',
      title: k.skill,
      detail: c.skillDetail(
        effectiveHit(run, skillDamage(run), run.keeper === 'seer'),
        run.keeper === 'seer',
      ),
      sub: `${c.focusCost(skillCost(run))}${
        run.keeper === 'wayfarer'
          ? c.plusPoison(poisonAmount(run))
          : run.keeper === 'warden'
            ? c.plusGuard5
            : c.ignoresGuard
      }`,
      special: true,
      reason: run.focus < skillCost(run) ? c.notEnoughFocus : undefined,
    },
    ...(v3
      ? [
          {
            type: 'technique' as const,
            icon: (run.keeper === 'warden'
              ? 'shield'
              : run.keeper === 'seer'
                ? 'eye'
                : 'leaf') as IconName,
            title: k.technique,
            detail:
              run.keeper === 'warden'
                ? c.techniqueDamage(effectiveHit(run, guardAmount(run)))
                : run.keeper === 'seer'
                  ? c.techniqueBlock(incoming)
                  : c.techniquePoison(e.poison * 2),
            sub: `${c.focusCost(k.techniqueCost)}${
              run.keeper === 'warden'
                ? c.doublePoise
                : run.keeper === 'seer'
                  ? c.alwaysPerfect
                  : c.poisonStays
            }`,
            special: true,
            reason: blocked ?? undefined,
          },
        ]
      : []),
    {
      type: 'flask',
      icon: 'flask',
      title: c.flask,
      detail: c.flaskDetail(flaskHealing(run)),
      sub: `${c.flasksLeft(run.flasks)}${v3 ? c.liftsFrost : c.endsTurn}`,
      reason: !run.flasks ? c.noFlasks : undefined,
    },
  ];

  const floats = (side: Floater['side']) => (
    <div className="floaters" aria-hidden="true">
      {floaters
        .filter((f) => f.side === side)
        .map((f) => (
          <b key={f.id} className={`floater floater-${f.tone}`}>
            {f.text}
          </b>
        ))}
    </div>
  );

  return (
    <section className="duel" aria-label={c.region}>
      <div className="duel-arena">
        <Landscape chapter={chapter} />
        <div className="duel-shade" />
        <header className="duel-top">
          <div>
            <span className="eyebrow">
              {run.side ? c.troveGuardian : t.node[nodeOf(run).kind].toUpperCase()}
            </span>
            <h2>{e.name}</h2>
          </div>
          <span className="duel-turn">
            {c.turn} <b>{String(run.turn + 1).padStart(2, '0')}</b>
          </span>
        </header>
        <div className="duel-sides">
          <div className="combatant combatant-hero">
            <span
              key={`h${pulse.hero}`}
              className={`duel-portrait ${pulse.hero ? 'figure-hit' : ''}`}
            >
              <KeeperPortrait keeper={run.keeper} />
            </span>
            <div className="vitals">
              <div className="vitals-name">
                <span>{k.name}</span>
                <strong>
                  {run.health} <small>/ {run.maxHealth}</small>
                </strong>
              </div>
              <div className="health-bar hero-health" aria-hidden="true">
                <i style={{ width: `${(run.health / run.maxHealth) * 100}%` }} />
              </div>
              <div className="chips">
                <Chip text={c.armorChipText} explain={setExplain}>
                  <Icon name="shield" size={12} /> {c.armorN(run.armor)}
                </Chip>
                {run.guard > 0 && (
                  <Chip tone="good" text={c.guardChipText} explain={setExplain}>
                    {c.guardN(run.guard)}
                  </Chip>
                )}
                {!!run.weak && (
                  <Chip tone="bad" text={c.weakenedText} explain={setExplain}>
                    {c.weakened(run.weak)}
                  </Chip>
                )}
                {!!run.frost && (
                  <Chip tone="bad" text={c.frostText} explain={setExplain}>
                    {c.frostN(run.frost)}
                  </Chip>
                )}
                {run.charge && (
                  <Chip tone="good" text={c.sharpenedText} explain={setExplain}>
                    {c.sharpened}
                  </Chip>
                )}
                {(['moth', 'hoarfrost', 'bells'] as const).map(
                  (id) =>
                    omenOf(run) === id && (
                      <Chip key={id} tone="omen" text={OMENS[id].rule} explain={setExplain}>
                        {OMENS[id].name}
                      </Chip>
                    ),
                )}
              </div>
            </div>
            {floats('hero')}
          </div>
          <div className={`combatant combatant-enemy ${e.stagger ? 'is-staggered' : ''}`}>
            <span
              key={`e${pulse.enemy}`}
              className={`duel-portrait ${pulse.enemy ? 'figure-hit' : ''}`}
            >
              <EnemyPortrait art={e.art} id={e.id} tint={e.tint} />
            </span>
            <div className="vitals">
              <div className="vitals-name">
                <span>{e.name}</span>
                <strong>
                  {e.health} <small>/ {e.maxHealth}</small>
                </strong>
              </div>
              <div
                className="health-bar enemy-health"
                role="meter"
                aria-label={c.enemyHealth}
                aria-valuenow={e.health}
                aria-valuemin={0}
                aria-valuemax={e.maxHealth}
              >
                <i style={{ width: `${(e.health / e.maxHealth) * 100}%` }} />
              </div>
              {e.maxPoise !== undefined && (
                <div
                  className="poise"
                  role="meter"
                  aria-label={c.enemyPoise}
                  aria-valuenow={e.stagger ? 0 : e.poise}
                  aria-valuemin={0}
                  aria-valuemax={e.maxPoise}
                >
                  <span>{e.stagger ? c.staggeredLabel : c.poiseLabel}</span>
                  <div className="poise-bar">
                    <i style={{ width: `${e.stagger ? 0 : (e.poise! / e.maxPoise) * 100}%` }} />
                  </div>
                  <b>{e.stagger ? c.hitsX(staggerBonus(run)) : e.poise}</b>
                </div>
              )}
              <div className="chips">
                {e.guard > 0 && (
                  <Chip text={c.enemyGuardText} explain={setExplain}>
                    <Icon name="shield" size={12} /> {c.guardN(e.guard).toLowerCase()}
                  </Chip>
                )}
                {e.poison > 0 && (
                  <Chip tone="good" text={c.poisonText} explain={setExplain}>
                    <Icon name="leaf" size={12} /> {c.poisonN(e.poison)}
                  </Chip>
                )}
                {!!e.fury && (
                  <Chip tone="bad" text={c.furyText} explain={setExplain}>
                    <Icon name="flame" size={12} /> {c.furyN(e.fury)}
                  </Chip>
                )}
                {traits.map((t) => (
                  <Chip key={t.label} tone="trait" text={t.text} explain={setExplain}>
                    {t.label}
                  </Chip>
                ))}
                {ground && (
                  <Chip tone="trait" text={TERRAIN[ground].rule} explain={setExplain}>
                    {TERRAIN[ground].name}
                  </Chip>
                )}
              </div>
            </div>
            {floats('enemy')}
          </div>
        </div>
        {v3 && e.id && VOICES[e.id] && (run.turn === 0 || (e.phase === 2 && e.step === 0)) && (
          <p className="duel-voice">
            {e.phase === 2 ? (VOICES[e.id].turn ?? VOICES[e.id].arrive) : VOICES[e.id].arrive}
          </p>
        )}
        {explain && (
          <p className="duel-explain" role="status">
            <Icon name="info" size={13} /> {explain}
          </p>
        )}
        <div
          className={`duel-intent ${!skipped && incoming > 10 ? 'is-danger' : ''} ${skipped ? 'is-skipped' : ''}`}
        >
          <span className="intent-icon">
            <Icon name={intentIcon(intent)} size={20} />
          </span>
          <div className="intent-name">
            <span className="eyebrow">{skipped ? c.staggeredSkip : c.enemyIntent}</span>
            <strong>{intent.name}</strong>
            {v3 && (
              <span className="intent-next">
                {c.then}
                {upcoming.name}
                {upcoming.damage
                  ? c.damageN(
                      `${hitDamage(run, upcoming)}${(upcoming.hits ?? 1) > 1 ? ` × ${upcoming.hits}` : ''}`,
                    )
                  : ''}
                {intentEffects(upcoming, t).length
                  ? ` · ${intentEffects(upcoming, t).join(' · ')}`
                  : ''}
              </span>
            )}
          </div>
          <p className="intent-value">
            {skipped ? (
              <>
                <b>0</b> {c.incoming}
              </>
            ) : intent.damage ? (
              <>
                <b>{incoming}</b> {c.incoming}{' '}
                <small>
                  (
                  {hits > 1
                    ? c.hitsOf(hits, intent.damage + (e.fury ?? 0))
                    : c.raw(intent.damage + (e.fury ?? 0))}
                  {c.armorSub(run.armor, hits > 1)})
                </small>
              </>
            ) : intent.guard ? (
              <>
                <b>+{intent.guard}</b> {c.enemyGuardInc}
              </>
            ) : intent.heal ? (
              <>
                <b>+{intent.heal}</b> {c.enemyHealthInc}
              </>
            ) : (
              <>
                <b>+{intent.fury}</b> {c.furyInc}
              </>
            )}
            {!skipped &&
              intentEffects(intent, t)
                .filter((_, i) => intent.damage > 0 || i > 0)
                .map((text) => <small key={text}>{c.also(text)}</small>)}
          </p>
        </div>
      </div>
      {coach && run.ruleset === 3 && (
        <p className="duel-coach" role="note">
          <Icon name="flame" size={15} />
          <span>{coaching(run, t)}</span>
        </p>
      )}
      <div className="duel-controls">
        <div className="duel-controls-top">
          <span>
            {c.yourMove} <small>{c.noRush}</small>
          </span>
          <div className="focus-meter" aria-label={c.focusLabel(run.focus)}>
            <span>{c.focus}</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} className={i < run.focus ? 'filled' : ''} />
            ))}
            <b>{run.focus}/5</b>
          </div>
        </div>
        <div className={`duel-actions actions-${buttons.length}`}>
          {buttons.map((b, i) => {
            const result = preview(run, b.type);
            return (
              <button
                key={b.type}
                data-action={b.type}
                className={`duel-action ${b.special ? 'is-special' : ''} ${result?.fatal ? 'is-fatal' : ''}`}
                disabled={!result}
                onClick={() => dispatch({ type: b.type })}
              >
                <span className="action-head">
                  <Icon name={b.icon} size={19} />
                  <strong>{b.title}</strong>
                  <kbd>{i + 1}</kbd>
                </span>
                <span className="action-detail">{b.detail}</span>
                <small>{b.sub}</small>
                <em className="action-result">
                  {!result ? (
                    (b.reason ?? c.nothingToRestore)
                  ) : result.kills ? (
                    <b className="tag-good">{c.finishing}</b>
                  ) : (
                    <>
                      {result.dealt > 0 && <span>{c.enemyMinus(result.dealt)}</span>}
                      {result.breaks && <b className="tag-good">{c.breaksPoise}</b>}
                      {result.perfect && <b className="tag-good">{c.perfectGuard}</b>}
                      {result.fatal ? (
                        <b className="tag-bad">{c.youFall}</b>
                      ) : (
                        <span className={result.taken > 0 ? 'cost' : ''}>
                          {result.taken > 0
                            ? c.youMinus(result.taken)
                            : result.taken < 0
                              ? c.youPlus(-result.taken)
                              : c.youTake0}
                        </span>
                      )}
                    </>
                  )}
                </em>
              </button>
            );
          })}
        </div>
        <p className="duel-footnote">
          <Icon name="info" size={12} />
          {v3 ? c.footnoteV3 : c.footnoteOld}
        </p>
      </div>
    </section>
  );
}
