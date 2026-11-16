import { useEffect, useRef, useState, type ReactNode } from 'react';
import { describeTraits } from '../game/bestiary';
import { KEEPERS, NODE_LABELS, type Intent } from '../game/data';
import {
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

type CombatAction = 'strike' | 'guard' | 'skill' | 'technique' | 'flask';
/** Keys 1–5 in ruleset 3; the first two rulesets keep their original 1–4. */
export function combatKeys(run: Run): CombatAction[] {
  return run.ruleset === 3
    ? ['strike', 'guard', 'skill', 'technique', 'flask']
    : ['strike', 'guard', 'skill', 'flask'];
}

/** Everything an intention does besides its damage, in the order the engine applies it. */
export function intentEffects(intent: Intent): string[] {
  return [
    ...(intent.guard ? [`+${intent.guard} guard`] : []),
    ...(intent.heal ? [`restores ${intent.heal}`] : []),
    ...(intent.fury ? [`+${intent.fury} fury`] : []),
    ...(intent.drain ? [`drains ${intent.drain} focus`] : []),
    ...(intent.weak ? [`weakens ${intent.weak}`] : []),
    ...(intent.frost ? [`frost ${intent.frost}`] : []),
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
function coaching(run: Run): string {
  const e = run.enemy!;
  const incoming = incomingDamage(run);
  if (e.stagger === 2)
    return 'It is staggered: its action is lost and your hits deal +50%. This is the moment for your strongest blow.';
  if (e.stagger === 1) return 'Still reeling: your hits deal +50% until it acts again.';
  if (incoming >= guardAmount(run))
    return `A heavy blow is coming. Guard absorbs ${guardAmount(run)} of it — or break its poise first and the blow never lands.`;
  if (incoming > 0 && incoming <= guardAmount(run) && e.poise! <= incoming)
    return 'Guard this whole blow and the perfect guard will break its poise.';
  if (!intentFor(run)!.damage)
    return 'It is not attacking this turn. A free turn to strike, or to drink a flask safely.';
  return `Read the line under each action: it is exactly what will happen. Poise ${e.poise}: wear it to zero to stagger.`;
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
  const k = KEEPERS[run.keeper];
  const e = run.enemy!;
  const v3 = run.ruleset === 3;
  const intent = intentFor(run)!;
  const upcoming = nextIntent(run)!;
  const chapter = Math.floor(run.depth / 4);
  const skipped = e.stagger === 2;
  const incoming = incomingDamage(run);
  const perHit = hitDamage(run, intent);
  const hits = intent.hits ?? 1;
  const strike = strikeDamage(run);
  const blocked = techniqueBlocked(run);
  const traits = describeTraits(e.traits);

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
      add('enemy', 'Staggered', 'call');
    if (e.phase === 2 && before.enemy.phase === 1) add('enemy', e.phase2?.name ?? '', 'call');
    if (taken > 0) add('hero', `−${taken}`, 'damage');
    if (taken < 0) add('hero', `+${-taken}`, 'heal');
    if ((run.stats?.parries ?? 0) > (before.stats?.parries ?? 0))
      add('hero', 'Perfect guard', 'call');
    else if (taken === 0 && before.turn !== run.turn && incomingDamage(before) > 0 && !v3)
      add('hero', 'Guarded', 'call');
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
  }, [run, e, v3]);

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
      title: 'Strike',
      detail: `Deal ${effectiveHit(run, strike.damage)}${strike.hits > 1 ? ' × 2' : ''} damage`,
      sub: `+${strikeFocus(run)} focus${strikeHealing(run) ? ` · heal ${strikeHealing(run)}` : ''}${
        v3 && e.traits?.thorns ? ` · thorns ${e.traits.thorns}` : ''
      }`,
    },
    {
      type: 'guard',
      icon: 'shield',
      title: 'Guard',
      detail: `Block ${guardAmount(run)} damage`,
      sub: `+2 focus${run.relics.includes('briar') ? ' · deal 3' : ''}${
        run.relics.includes('censer') ? ' · 2 poison' : ''
      }`,
    },
    {
      type: 'skill',
      icon: run.keeper === 'wayfarer' ? 'leaf' : 'sparkles',
      title: k.skill,
      detail: `Deal ${effectiveHit(run, skillDamage(run), run.keeper === 'seer')}${run.keeper === 'seer' ? ' piercing' : ''} damage`,
      sub: `${skillCost(run)} focus${
        run.keeper === 'wayfarer'
          ? ` · +${poisonAmount(run)} poison`
          : run.keeper === 'warden'
            ? ' · +5 guard'
            : ' · ignores guard'
      }`,
      special: true,
      reason: run.focus < skillCost(run) ? 'Not enough focus' : undefined,
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
                ? `Deal ${effectiveHit(run, guardAmount(run))} damage`
                : run.keeper === 'seer'
                  ? `Block all ${incoming} damage`
                  : `Deal ${e.poison * 2} poison damage`,
            sub: `${k.techniqueCost} focus${
              run.keeper === 'warden'
                ? ' · double poise damage'
                : run.keeper === 'seer'
                  ? ' · always perfect'
                  : ' · poison stays'
            }`,
            special: true,
            reason: blocked ?? undefined,
          },
        ]
      : []),
    {
      type: 'flask',
      icon: 'flask',
      title: 'Drink flask',
      detail: `Restore ${flaskHealing(run)} health`,
      sub: `${run.flasks} left${v3 ? ' · lifts frost and weakness' : ' · ends turn'}`,
      reason: !run.flasks ? 'No flasks left' : undefined,
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
    <section className="duel" aria-label="Turn-based combat">
      <div className="duel-arena">
        <Landscape chapter={chapter} />
        <div className="duel-shade" />
        <header className="duel-top">
          <div>
            <span className="eyebrow">{NODE_LABELS[nodeOf(run).kind].toUpperCase()}</span>
            <h2>{e.name}</h2>
          </div>
          <span className="duel-turn">
            TURN <b>{String(run.turn + 1).padStart(2, '0')}</b>
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
                <Chip text="Reduces every hit you take" explain={setExplain}>
                  <Icon name="shield" size={12} /> {run.armor} armor
                </Chip>
                {run.guard > 0 && (
                  <Chip tone="good" text="Absorbs damage this turn" explain={setExplain}>
                    {run.guard} guard
                  </Chip>
                )}
                {!!run.weak && (
                  <Chip tone="bad" text="Your hits deal 25% less" explain={setExplain}>
                    Weakened {run.weak}
                  </Chip>
                )}
                {!!run.frost && (
                  <Chip
                    tone="bad"
                    text="Costs this much health each enemy turn, then melts by 1"
                    explain={setExplain}
                  >
                    Frost {run.frost}
                  </Chip>
                )}
                {run.charge && (
                  <Chip tone="good" text="Your next Strike deals 6 more" explain={setExplain}>
                    Sharpened
                  </Chip>
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
                aria-label="Enemy health"
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
                  aria-label="Enemy poise"
                  aria-valuenow={e.stagger ? 0 : e.poise}
                  aria-valuemin={0}
                  aria-valuemax={e.maxPoise}
                >
                  <span>{e.stagger ? 'STAGGERED' : 'POISE'}</span>
                  <div className="poise-bar">
                    <i style={{ width: `${e.stagger ? 0 : (e.poise! / e.maxPoise) * 100}%` }} />
                  </div>
                  <b>{e.stagger ? `hits ×${staggerBonus(run)}` : e.poise}</b>
                </div>
              )}
              <div className="chips">
                {e.guard > 0 && (
                  <Chip text="Absorbs hit damage until broken" explain={setExplain}>
                    <Icon name="shield" size={12} /> {e.guard} guard
                  </Chip>
                )}
                {e.poison > 0 && (
                  <Chip
                    tone="good"
                    text="Deals this much after your action, then fades by 1"
                    explain={setExplain}
                  >
                    <Icon name="leaf" size={12} /> {e.poison} poison
                  </Chip>
                )}
                {!!e.fury && (
                  <Chip tone="bad" text="Added to every hit it lands" explain={setExplain}>
                    <Icon name="flame" size={12} /> {e.fury} fury
                  </Chip>
                )}
                {traits.map((t) => (
                  <Chip key={t.label} tone="trait" text={t.text} explain={setExplain}>
                    {t.label}
                  </Chip>
                ))}
              </div>
            </div>
            {floats('enemy')}
          </div>
        </div>
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
            <span className="eyebrow">
              {skipped ? 'STAGGERED · THIS ACTION IS LOST' : 'ENEMY INTENT'}
            </span>
            <strong>{intent.name}</strong>
            {v3 && (
              <span className="intent-next">
                Then: {upcoming.name}
                {upcoming.damage
                  ? ` · ${hitDamage(run, upcoming)}${(upcoming.hits ?? 1) > 1 ? ` × ${upcoming.hits}` : ''} damage`
                  : ''}
                {intentEffects(upcoming).length ? ` · ${intentEffects(upcoming).join(' · ')}` : ''}
              </span>
            )}
          </div>
          <p className="intent-value">
            {skipped ? (
              <>
                <b>0</b> incoming
              </>
            ) : intent.damage ? (
              <>
                <b>{incoming}</b> incoming{' '}
                <small>
                  (
                  {hits > 1
                    ? `${hits} hits of ${intent.damage + (e.fury ?? 0)}`
                    : `${intent.damage + (e.fury ?? 0)} raw`}
                  {' − '}
                  {run.armor} armor{hits > 1 ? ' each' : ''})
                </small>
              </>
            ) : intent.guard ? (
              <>
                <b>+{intent.guard}</b> enemy guard
              </>
            ) : intent.heal ? (
              <>
                <b>+{intent.heal}</b> enemy health
              </>
            ) : (
              <>
                <b>+{intent.fury}</b> fury
              </>
            )}
            {!skipped &&
              intentEffects(intent)
                .filter((_, i) => intent.damage > 0 || i > 0)
                .map((text) => <small key={text}>Also {text}</small>)}
          </p>
        </div>
      </div>
      {coach && run.ruleset === 3 && (
        <p className="duel-coach" role="note">
          <Icon name="flame" size={15} />
          <span>{coaching(run)}</span>
        </p>
      )}
      <div className="duel-controls">
        <div className="duel-controls-top">
          <span>
            YOUR MOVE <small>No rush. The dark can wait.</small>
          </span>
          <div className="focus-meter" aria-label={`Focus: ${run.focus} of 5`}>
            <span>FOCUS</span>
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
                    (b.reason ?? 'Nothing to restore')
                  ) : result.kills ? (
                    <b className="tag-good">Finishing blow</b>
                  ) : (
                    <>
                      {result.dealt > 0 && <span>Enemy −{result.dealt}</span>}
                      {result.breaks && <b className="tag-good">Breaks poise</b>}
                      {result.perfect && <b className="tag-good">Perfect guard</b>}
                      {result.fatal ? (
                        <b className="tag-bad">You would fall</b>
                      ) : (
                        <span className={result.taken > 0 ? 'cost' : ''}>
                          {result.taken > 0
                            ? `You −${result.taken}`
                            : result.taken < 0
                              ? `You +${-result.taken}`
                              : 'You take 0'}
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
          {v3
            ? 'Every action ends your turn; the last line of each is exactly what will happen. Break poise to cancel the enemy’s action. Guard a whole blow to wear its poise down.'
            : 'Every action ends your turn. Guard lasts one enemy action. Poison bypasses guard.'}
        </p>
      </div>
    </section>
  );
}
