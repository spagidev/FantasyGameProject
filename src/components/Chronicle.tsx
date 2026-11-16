import { useState } from 'react';
import { BOSSES, ELITES, FOES, ORDINARY, describeTraits, type Foe } from '../game/bestiary';
import { CHAPTERS, KEEPERS, LORE, RELICS, type KeeperId, type RelicId } from '../game/data';
import { DEEDS, KNOWN_CHARTS, duskUnlocked, unlockedRelics, type Meta } from '../game/meta';
import { EnemyPortrait, RelicIcon } from './Art';
import { intentEffects } from './Combat';
import { Icon } from './Icon';

type Tab = 'memories' | 'deeds' | 'relics' | 'bestiary' | 'atlas' | 'records';

export function Chronicle({
  lore,
  runs,
  wins,
  meta,
  onBack,
}: {
  lore: string[];
  runs: number;
  wins: number;
  meta: Meta;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>('memories');
  const pool = unlockedRelics(meta);
  const relicIds = Object.keys(RELICS) as RelicId[];
  const foes = Object.keys(FOES);
  const tabs: { id: Tab; label: string; count: string }[] = [
    { id: 'memories', label: 'Memories', count: `${lore.length}/${LORE.length}` },
    { id: 'deeds', label: 'Deeds', count: `${meta.deeds.length}/${DEEDS.length}` },
    {
      id: 'relics',
      label: 'Relics',
      count: `${meta.relics.length}/${relicIds.length}`,
    },
    { id: 'bestiary', label: 'Bestiary', count: `${meta.foes.length}/${foes.length}` },
    {
      id: 'atlas',
      label: 'Atlas',
      count: `${Object.keys(meta.cities).length}/${Math.max(KNOWN_CHARTS, Object.keys(meta.cities).length)}`,
    },
    { id: 'records', label: 'Records', count: `${wins}/${runs}` },
  ];
  return (
    <section className="chronicle">
      <div className="chronicle-header">
        <span className="eyebrow">THE THINGS THE FIRE COULD NOT TAKE</span>
        <h1>
          The keeper’s <em>chronicle.</em>
        </h1>
        <p>A world is not gone while someone remembers its stories.</p>
        <div className="chronicle-counts">
          <span>
            <b>{lore.length}</b> / {LORE.length} memories
          </span>
          <span>
            <b>{runs}</b> expeditions ended
          </span>
          <span>
            <b>{wins}</b> crossings completed
          </span>
        </div>
      </div>
      <div className="chronicle-tabs" role="tablist" aria-label="Chronicle sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="chronicle-panel"
            onClick={() => setTab(t.id)}
          >
            {t.label} <small>{t.count}</small>
          </button>
        ))}
      </div>
      <div id="chronicle-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'memories' && (
          <div className="lore-grid">
            {LORE.map((entry, i) => {
              const unlocked = lore.includes(entry.id);
              return (
                <article className={`lore-card ${unlocked ? 'unlocked' : 'locked'}`} key={entry.id}>
                  <span className="lore-number">{String(i + 1).padStart(2, '0')}</span>
                  <Icon name={unlocked ? 'book' : 'eye'} size={24} />
                  <span className="eyebrow">
                    {unlocked ? 'A MEMORY RETURNED' : 'WAITING IN THE DARK'}
                  </span>
                  <h2>{unlocked ? entry.title : 'An unwritten page'}</h2>
                  <p>
                    {unlocked
                      ? entry.text
                      : 'Walk a little farther. Speak to a stranger. Some stories can only be found on the road.'}
                  </p>
                </article>
              );
            })}
          </div>
        )}
        {tab === 'deeds' && (
          <>
            <p className="codex-note">
              Deeds never make a keeper stronger. Some add a new relic to the ones future roads can
              offer.
            </p>
            <div className="codex-grid">
              {DEEDS.map((d) => {
                const done = meta.deeds.includes(d.id);
                return (
                  <article key={d.id} className={`codex-card ${done ? 'is-done' : 'is-open'}`}>
                    <Icon name={done ? 'check' : 'flag'} size={18} />
                    <h2>{d.name}</h2>
                    <p>{d.text}</p>
                    {d.unlocks && (
                      <small>
                        {done ? 'Unlocked' : 'Unlocks'}: {RELICS[d.unlocks].name}
                      </small>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
        {tab === 'relics' && (
          <>
            <p className="codex-note">
              {pool.length} of {relicIds.length} relics can appear on your roads. You have carried{' '}
              {meta.relics.length}.
            </p>
            <div className="codex-grid">
              {relicIds.map((id) => {
                const open = pool.includes(id);
                const found = meta.relics.includes(id);
                const deed = DEEDS.find((d) => d.unlocks === id);
                return (
                  <article
                    key={id}
                    className={`codex-card rarity-${RELICS[id].rarity} ${found ? 'is-done' : 'is-open'}`}
                  >
                    {open ? (
                      <RelicIcon id={id} size={found ? 40 : 18} />
                    ) : (
                      <Icon name="eye" size={18} />
                    )}
                    <span className={`eyebrow rarity-${RELICS[id].rarity}`}>
                      {RELICS[id].rarity.toUpperCase()}
                    </span>
                    <h2>{open ? RELICS[id].name : 'A relic not yet in the world'}</h2>
                    <p>{open ? RELICS[id].description : `Unlocked by the deed “${deed?.name}”.`}</p>
                    <small>
                      {found ? RELICS[id].flavor : open ? 'Not yet carried.' : deed?.text}
                    </small>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {tab === 'bestiary' && (
          <>
            <p className="codex-note">
              Defeat a creature to record its pattern here. Scouting on the road always shows what
              stands ahead.
            </p>
            {CHAPTERS.map((chapter, c) => (
              <div key={chapter.name} className="bestiary-realm">
                <h2>{chapter.name}</h2>
                <div className="codex-grid">
                  {[...ORDINARY[c], ...ELITES[c], BOSSES[c]].map((foe) => (
                    <FoeCard
                      key={foe.id}
                      foe={foe}
                      met={meta.foes.includes(foe.id)}
                      rank={
                        BOSSES[c] === foe ? 'Bell guardian' : ELITES[c].includes(foe) ? 'Elite' : ''
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        {tab === 'atlas' && (
          <>
            <p className="codex-note">
              Every chart is a real place. Walk it for a stamp, finish its expedition, and name the
              city beneath the veil to write its true name here.
            </p>
            <div className="codex-grid">
              {Object.entries(meta.cities).map(([key, city]) => (
                <article
                  key={key}
                  className={`codex-card passport ${city.name ? 'is-done' : 'is-open'}`}
                >
                  <Icon name={city.name ? 'map' : 'compass'} size={18} />
                  <span className="eyebrow">{city.area.toUpperCase()}</span>
                  <h2>{city.name ?? city.title}</h2>
                  <p>
                    {city.name ? `Charted as ${city.title}.` : 'Its true name is still veiled.'}
                  </p>
                  <small>
                    Walked{city.completed ? ' · expedition completed' : ''}
                    {city.name ? ' · named' : ''}
                  </small>
                </article>
              ))}
              {Array.from(
                { length: Math.max(0, KNOWN_CHARTS - Object.keys(meta.cities).length) },
                (_, i) => (
                  <article key={i} className="codex-card is-open passport">
                    <Icon name="eye" size={18} />
                    <h2>An uncharted place</h2>
                    <p>Begin a Lost Atlas expedition to find it.</p>
                  </article>
                ),
              )}
            </div>
          </>
        )}
        {tab === 'records' && <Records meta={meta} runs={runs} wins={wins} />}
      </div>
      <button className="secondary-button" onClick={onBack}>
        <Icon name="compass" size={17} /> Return to the expedition
      </button>
    </section>
  );
}

function FoeCard({ foe, met, rank }: { foe: Foe; met: boolean; rank: string }) {
  if (!met)
    return (
      <article className="codex-card is-open foe-card">
        <Icon name="eye" size={18} />
        {rank && <span className="eyebrow">{rank.toUpperCase()}</span>}
        <h2>Not yet defeated</h2>
        <p>Something waits in {rank ? 'a harder place' : 'the dark'}.</p>
      </article>
    );
  const line = (pattern: Foe['pattern']) =>
    pattern
      .map((i) =>
        [
          i.name,
          ...(i.damage ? [(i.hits ?? 1) > 1 ? `${i.hits} × ${i.damage}` : `${i.damage}`] : []),
          ...intentEffects(i),
        ].join(' · '),
      )
      .join('  →  ');
  return (
    <article className="codex-card is-done foe-card">
      <span className="foe-face">
        <EnemyPortrait art={foe.art} id={foe.id} tint={foe.tint} />
      </span>
      {rank && <span className="eyebrow">{rank.toUpperCase()}</span>}
      <h2>{foe.name}</h2>
      <p>{foe.blurb}</p>
      <small>
        {foe.health} health · {foe.poise} poise
        {describeTraits(foe.traits)
          .map((t) => ` · ${t.label}`)
          .join('')}
      </small>
      <small className="foe-pattern">{line(foe.pattern)}</small>
      {foe.phase2 && (
        <small className="foe-pattern">
          <b>{foe.phase2.name}:</b> {line(foe.phase2.pattern)}
        </small>
      )}
    </article>
  );
}

function Records({ meta, runs, wins }: { meta: Meta; runs: number; wins: number }) {
  const days = Object.entries(meta.daily).sort().reverse().slice(0, 7);
  return (
    <div className="records">
      <div className="record-keepers">
        {(Object.keys(KEEPERS) as KeeperId[]).map((id) => (
          <article key={id} className="codex-card is-done">
            <span className="eyebrow">{KEEPERS[id].title.toUpperCase()}</span>
            <h2>{KEEPERS[id].name}</h2>
            <p>
              Best score <b>{(meta.best[id] ?? 0).toLocaleString('en')}</b>
            </p>
            <small>Deepest night open: Dusk {duskUnlocked(meta, id)}</small>
          </article>
        ))}
        <article className="codex-card is-done">
          <span className="eyebrow">ALL ROADS</span>
          <h2>
            {wins} of {runs}
          </h2>
          <p>expeditions completed</p>
          <small>
            Current streak {meta.streak} · longest {meta.bestStreak}
          </small>
        </article>
      </div>
      <h2 className="records-title">The last roads</h2>
      {meta.history.length ? (
        <div className="history-scroll">
          <table className="history">
            <thead>
              <tr>
                <th>Keeper</th>
                <th>Road</th>
                <th>Night</th>
                <th>Outcome</th>
                <th>Turns</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {meta.history.map((h, i) => (
                <tr key={i}>
                  <td>{KEEPERS[h.keeper].name}</td>
                  <td>{h.daily ? `Daily ${h.daily}` : h.atlas ? 'Lost Atlas' : 'Crossing'}</td>
                  <td>Dusk {h.dusk}</td>
                  <td>{h.won ? 'Completed' : `Fell after ${h.crossed}`}</td>
                  <td>{h.turns || '–'}</td>
                  <td>{h.score.toLocaleString('en')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="codex-note">No expedition has ended yet.</p>
      )}
      {days.length > 0 && (
        <>
          <h2 className="records-title">Daily roads</h2>
          <ul className="daily-list">
            {days.map(([date, score]) => (
              <li key={date}>
                <span>{date}</span>
                <b>{score.toLocaleString('en')}</b>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
