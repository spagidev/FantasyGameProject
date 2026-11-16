import { CHAPTERS, EVENTS, KEEPERS, TALENTS, WAYLIGHTS, type WaylightId } from '../game/data';
import { describeTraits, FOES } from '../game/bestiary';
import { TERRAIN } from '../game/terrain';
import { encounterState, siteAt } from '../game/atlas';
import {
  realmOf,
  availableTalents,
  makeEnemy,
  nextNodes,
  nightsOf,
  priceOf,
  restAmount,
  roadBenefits,
  victoryCoins,
  waylightFor,
  type Action,
  type MapNode,
  type Run,
} from '../game/engine';
import { Landscape } from './Art';
import { intentEffects } from './Combat';
import { Icon, type IconName } from './Icon';
import type { Intent } from '../game/data';
import { useT } from '../i18n';

function PatternList({ pattern, armor }: { pattern: Intent[]; armor: number | null }) {
  const t = useT();
  return (
    <ol className="scout-pattern">
      {pattern.map((intent, i) => {
        const hits = intent.hits ?? 1;
        return (
          <li key={`${intent.name}-${i}`}>
            <span>{i + 1}</span>
            <div>
              <strong>{intent.name}</strong>
              <p>
                {[
                  ...(intent.damage > 0
                    ? [
                        t.strategy.rawDamage(
                          hits,
                          intent.damage,
                          armor !== null ? Math.max(0, intent.damage - armor) * hits : null,
                        ),
                      ]
                    : []),
                  ...intentEffects(intent, t),
                ].join(' · ')}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Scout({
  run,
  node,
  onTravel,
}: {
  run: Run | null;
  node: MapNode;
  onTravel: () => void;
}) {
  const t = useT();
  const s = t.strategy;
  const combat = ['battle', 'elite', 'boss'].includes(node.kind);
  const enemy = combat
    ? makeEnemy(node, run?.ruleset ?? 3, run?.dusk ?? 0, run ? nightsOf(run) : 0)
    : null;
  const site = (run?.ruleset ?? 3) >= 2 ? waylightFor(node) : null;
  const v3 = (run?.ruleset ?? 3) === 3;
  const traits = describeTraits(enemy?.traits);
  const reachable = run && nextNodes(run).some((n) => n.id === node.id);
  return (
    <div className="scout-content">
      <div className="scout-meta">
        <span>
          <Icon name={node.kind} />
          {t.node[node.kind]}
        </span>
        <span>
          {s.crossingOf(CHAPTERS[Math.floor(node.depth / 4)].short, (node.depth % 4) + 1)}
        </span>
      </div>
      {enemy && (
        <>
          <div className="scout-rewards">
            <span>
              <Icon name="heart" size={17} />
              <b>{enemy.maxHealth}</b> {s.enemyHealth}
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
              {s.coinsRelic}
            </span>
          </div>
          {enemy.id && <p className="scout-blurb">{FOES[enemy.id].blurb}</p>}
          {enemy.maxPoise !== undefined && (
            <div className="scout-traits">
              <span title={s.poiseTitle}>{s.poiseN(enemy.maxPoise)}</span>
              {traits.map((t) => (
                <span key={t.label} title={t.text}>
                  {t.label} · {t.text}
                </span>
              ))}
              {node.terrain && (
                <span title={TERRAIN[node.terrain].flavor}>
                  {TERRAIN[node.terrain].name} · {TERRAIN[node.terrain].rule}
                </span>
              )}
            </div>
          )}
          <span className="eyebrow">{s.patternEyebrow}</span>
          <PatternList pattern={enemy.pattern} armor={run ? run.armor : null} />
          {enemy.phase2 && (
            <>
              <span className="eyebrow">{s.belowHalf(enemy.phase2.name)}</span>
              <PatternList pattern={enemy.phase2.pattern} armor={run ? run.armor : null} />
            </>
          )}
        </>
      )}
      {site && (
        <div className="scout-site">
          <Icon name={WAYLIGHTS[site].icon as IconName} size={26} />
          <div>
            <span className="eyebrow">{s.waylightEyebrow}</span>
            <h3>{WAYLIGHTS[site].name}</h3>
            <p>{WAYLIGHTS[site].text}</p>
            <strong>{WAYLIGHTS[site].benefit}</strong>
            <small>{s.waylightNote}</small>
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
          <p>{s.campIntro}</p>
          <div>
            <strong>{s.rest}</strong>
            <span>{s.restDesc(run ? restAmount(run) : 20)}</span>
          </div>
          <div>
            <strong>{s.refill}</strong>
            <span>{s.refillDesc}</span>
          </div>
          <div>
            <strong>{s.temper}</strong>
            <span>{s.temperDesc}</span>
          </div>
        </div>
      )}
      {node.kind === 'shop' && (
        <div className="scout-story">
          <p>{s.shopIntro}</p>
          {v3 && (
            <div>
              <strong>{s.threeRelics}</strong>
              <span>
                {run
                  ? s.relicPrices(priceOf(run, 'briar'), priceOf(run, 'chime'))
                  : s.relicPricesDefault}
              </span>
            </div>
          )}
          <div>
            <strong>{s.aFlask}</strong>
            <span>{s.nCoins(run ? priceOf(run, 'flask') : 14)}</span>
          </div>
          <div>
            <strong>{s.restore20}</strong>
            <span>{s.nCoins(run ? priceOf(run, 'heal') : 18)}</span>
          </div>
          <div>
            <strong>{s.gain2}</strong>
            <span>{s.nCoins(run ? priceOf(run, 'forge') : 35)}</span>
          </div>
        </div>
      )}
      {reachable ? (
        <button className="primary-button" onClick={onTravel}>
          {s.takePath} <Icon name="arrow" size={17} />
        </button>
      ) : (
        <p className="scout-unreachable">
          {!run
            ? s.unreachableLobby
            : node.id.startsWith('trove-')
              ? s.trove
              : run.atlas
                ? {
                    done: s.done,
                    open: s.open,
                    sealed: node.kind === 'boss' ? s.sealedBoss : s.sealedLater,
                  }[
                    encounterState(run, siteAt(node.depth, node.lane, run.atlas) ?? { id: '' }) ??
                      'sealed'
                  ]
                : node.depth <= run.depth
                  ? s.behind
                  : node.depth === run.depth + 1
                    ? s.beyondReach
                    : s.future}
        </p>
      )}
      <p className="scout-free">
        <Icon name="eye" size={13} /> {s.scoutFree}
      </p>
    </div>
  );
}

export function WaylightsPanel({ run }: { run: Run }) {
  const t = useT();
  const s = t.strategy;
  if (run.ruleset === 1)
    return (
      <div className="classic-notice">
        <Icon name="book" size={15} />
        <span>{s.classic}</span>
      </div>
    );
  const benefits = roadBenefits(run);
  return (
    <section className="waylight-ledger" aria-label={s.ledger}>
      <div className="section-label">
        <Icon name="flame" size={15} />
        <span>{s.lightBehind}</span>
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
            {s.eachCrossing}
            {benefits.coins ? s.plusCoins(benefits.coins) : ''}
            {benefits.coins && benefits.health ? ' · ' : ''}
            {benefits.health ? s.plusHealth(benefits.health) : ''}
            {!benefits.health && !benefits.coins ? s.observatories : ''}
            {benefits.focus > 0 && <span>{s.startFocus(benefits.focus)}</span>}
          </p>
        </>
      ) : (
        <p className="empty-relics">{s.freeWaylight}</p>
      )}
      {run.talents.length > 0 && (
        <div className="lesson-list">
          <span className="eyebrow">{s.lessons}</span>
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
  const s = useT().strategy;
  return (
    <section className="scene-board talent-board">
      <Landscape chapter={realmOf(run)} />
      <div className="scene-content">
        <span className="scene-sigil">
          <Icon name="sparkles" size={34} />
        </span>
        <span className="eyebrow">{s.talentEyebrow}</span>
        <h2>{s.talentTitle}</h2>
        <p className="scene-lead">{s.talentLead(KEEPERS[run.keeper].name)}</p>
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
                {s.rememberLesson} <Icon name="arrow" size={14} />
              </span>
            </button>
          ))}
        </div>
        <p className="scene-hint">{s.talentHint}</p>
      </div>
    </section>
  );
}
