import {
  CHAPTERS,
  EVENTS,
  KEEPERS,
  NODE_LABELS,
  TALENTS,
  WAYLIGHTS,
  type WaylightId,
} from '../game/data';
import {
  availableTalents,
  makeEnemy,
  nextNodes,
  roadBenefits,
  victoryCoins,
  waylightFor,
  type Action,
  type MapNode,
  type Run,
} from '../game/engine';
import { Landscape } from './Art';
import { Icon, type IconName } from './Icon';

export function Scout({
  run,
  node,
  onTravel,
}: {
  run: Run | null;
  node: MapNode;
  onTravel: () => void;
}) {
  const combat = ['battle', 'elite', 'boss'].includes(node.kind);
  const enemy = combat ? makeEnemy(node, run?.ruleset ?? 2) : null;
  const site = (run?.ruleset ?? 2) === 2 ? waylightFor(node) : null;
  const reachable = run && nextNodes(run).some((n) => n.id === node.id);
  return (
    <div className="scout-content">
      <div className="scout-meta">
        <span>
          <Icon name={node.kind} />
          {NODE_LABELS[node.kind]}
        </span>
        <span>
          {CHAPTERS[Math.floor(node.depth / 4)].short} · crossing {(node.depth % 4) + 1}/4
        </span>
      </div>
      {enemy && (
        <>
          <div className="scout-rewards">
            <span>
              <Icon name="heart" size={17} />
              <b>{enemy.maxHealth}</b> enemy health
            </span>
            <span>
              <Icon name="coins" size={17} />
              <b>
                {run
                  ? victoryCoins(run, node)
                  : node.kind === 'boss'
                    ? 45
                    : node.kind === 'elite'
                      ? 32
                      : 18}
              </b>{' '}
              coins + relic choice
            </span>
          </div>
          <span className="eyebrow">THEIR PATTERN · REPEATS IN THIS ORDER</span>
          <ol className="scout-pattern">
            {enemy.pattern.map((intent, i) => (
              <li key={intent.name}>
                <span>{i + 1}</span>
                <div>
                  <strong>{intent.name}</strong>
                  <p>
                    {intent.damage > 0
                      ? `${intent.damage} raw damage${run ? ` · ${Math.max(0, intent.damage - run.armor)} after your armor` : ''}`
                      : intent.guard
                        ? `Gain ${intent.guard} enemy guard`
                        : `Restore ${intent.heal} enemy health`}
                    {intent.drain ? ` · drain ${intent.drain} focus` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
      {site && (
        <div className="scout-site">
          <Icon name={WAYLIGHTS[site].icon as IconName} size={26} />
          <div>
            <span className="eyebrow">A WAYLIGHT TO REKINDLE</span>
            <h3>{WAYLIGHTS[site].name}</h3>
            <p>{WAYLIGHTS[site].text}</p>
            <strong>{WAYLIGHTS[site].benefit}</strong>
            <small>
              Freed after victory. Benefits begin on later crossings; never while you are away.
            </small>
          </div>
        </div>
      )}
      {node.kind === 'event' && (
        <div className="scout-story">
          <p>{EVENTS[node.eventIndex].text}</p>
          {EVENTS[node.eventIndex].options.map((o) => (
            <div key={o.label}>
              <strong>{o.label}</strong>
              <span>{o.description}</span>
            </div>
          ))}
        </div>
      )}
      {node.kind === 'camp' && (
        <div className="scout-story">
          <p>A quiet place to prepare. Choose one comfort, then continue.</p>
          <div>
            <strong>Rest</strong>
            <span>Restore 18 health</span>
          </div>
          <div>
            <strong>Refill</strong>
            <span>Gain 1 flask, maximum 5</span>
          </div>
          <div>
            <strong>Temper your blade</strong>
            <span>Pay 30 coins · gain 2 attack</span>
          </div>
        </div>
      )}
      {node.kind === 'shop' && (
        <div className="scout-story">
          <p>
            Each item is available once per visit. Buy any combination you can afford, then leave
            freely.
          </p>
          <div>
            <strong>A flask</strong>
            <span>14 coins</span>
          </div>
          <div>
            <strong>Restore 20 health</strong>
            <span>18 coins</span>
          </div>
          <div>
            <strong>Gain 2 attack</strong>
            <span>35 coins</span>
          </div>
        </div>
      )}
      {reachable ? (
        <button className="primary-button" onClick={onTravel}>
          Take this path <Icon name="arrow" size={17} />
        </button>
      ) : (
        <p className="scout-unreachable">
          {!run
            ? 'Choose a keeper and begin an expedition to take this road.'
            : node.depth <= run.depth
              ? 'This crossing is behind you. The road leads forward.'
              : node.depth === run.depth + 1
                ? 'This lane is beyond reach from your current path. A neighboring lane stays open.'
                : 'A future crossing. Plan your route, then advance one path at a time.'}
        </p>
      )}
      <p className="scout-free">
        <Icon name="eye" size={13} /> Scouting is free. Your expedition has not moved.
      </p>
    </div>
  );
}

export function WaylightsPanel({ run }: { run: Run }) {
  if (run.ruleset === 1)
    return (
      <div className="classic-notice">
        <Icon name="book" size={15} />
        <span>
          Classic crossing · your original rules are preserved. New expeditions include waylights
          and remembered lessons.
        </span>
      </div>
    );
  const benefits = roadBenefits(run);
  return (
    <section className="waylight-ledger" aria-label="Waylights and remembered lessons">
      <div className="section-label">
        <Icon name="flame" size={15} />
        <span>THE LIGHT YOU LEAVE BEHIND</span>
        <small>{run.waylights.length}/3</small>
      </div>
      {run.waylights.length ? (
        <>
          <div className="waylight-list">
            {(Object.keys(WAYLIGHTS) as WaylightId[])
              .filter((id) => run.waylights.includes(id))
              .map((id) => (
                <div key={id}>
                  <Icon name={WAYLIGHTS[id].icon as IconName} />
                  <span>
                    <strong>
                      {WAYLIGHTS[id].name}
                      <b> ×{run.waylights.filter((w) => w === id).length}</b>
                    </strong>
                    <small>{WAYLIGHTS[id].short}</small>
                  </span>
                </div>
              ))}
          </div>
          <p className="waylight-yield">
            Each crossing: {benefits.coins ? `+${benefits.coins} coins` : ''}
            {benefits.coins && benefits.health ? ' · ' : ''}
            {benefits.health ? `+${benefits.health} health` : ''}
            {!benefits.health && !benefits.coins ? 'a road lit by the observatories' : ''}
            {benefits.focus > 0 && <span>Battles start with +{benefits.focus} focus (cap 5).</span>}
          </p>
        </>
      ) : (
        <p className="empty-relics">
          Free a waylight at the start of each realm. Let the road give something back.
        </p>
      )}
      {run.talents.length > 0 && (
        <div className="lesson-list">
          <span className="eyebrow">LESSONS REMEMBERED</span>
          {run.talents.map((id) => (
            <div className="inventory-relic" key={id}>
              <Icon name={TALENTS[id].icon as IconName} />
              <span>
                <strong>{TALENTS[id].name}</strong>
                <small>{TALENTS[id].description}</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function TalentChoice({ run, dispatch }: { run: Run; dispatch: (action: Action) => void }) {
  return (
    <section className="scene-board talent-board">
      <Landscape chapter={Math.floor(run.depth / 4)} />
      <div className="scene-content">
        <span className="scene-sigil">
          <Icon name="sparkles" size={34} />
        </span>
        <span className="eyebrow">THE BELL GIVES BACK WHAT THE FIRE TOOK</span>
        <h2>Remember who you could be.</h2>
        <p className="scene-lead">
          {KEEPERS[run.keeper].name} hears a familiar voice inside the bell. Not a command. A
          lesson. Choose one to carry into the next realm.
        </p>
        <div className="reward-grid">
          {availableTalents(run).map((id) => (
            <button
              className="reward-card talent-card"
              key={id}
              onClick={() => dispatch({ type: 'talent', id })}
            >
              <span className="relic-large">
                <Icon name={TALENTS[id].icon as IconName} size={30} />
              </span>
              <span className="eyebrow">{KEEPERS[run.keeper].title.toUpperCase()}</span>
              <h3>{TALENTS[id].name}</h3>
              <p>{TALENTS[id].description}</p>
              <em>{TALENTS[id].flavor}</em>
              <span className="take-relic">
                Remember this lesson <Icon name="arrow" size={14} />
              </span>
            </button>
          ))}
        </div>
        <p className="scene-hint">
          One lesson after each of the first two bells. Lasts this expedition. Choose a different
          road next time.
        </p>
      </div>
    </section>
  );
}
