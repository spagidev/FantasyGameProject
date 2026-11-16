import { useState } from 'react';
import { BOSSES, ELITES, FOES, ORDINARY, describeTraits, type Foe } from '../game/bestiary';
import { CHAPTERS, KEEPERS, LORE, RELICS, type KeeperId, type RelicId } from '../game/data';
import { DEEDS, KNOWN_CHARTS, duskUnlocked, unlockedRelics, type Meta } from '../game/meta';
import { EnemyPortrait, RelicIcon } from './Art';
import { intentEffects } from './Combat';
import { PROVINCES, campaignProgress, type ProvinceCode } from '../atlas/provinces';
import { CampaignMap } from './CampaignMap';
import { useT } from '../i18n';
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
  const t = useT();
  const c = t.chronicle;
  const [tab, setTab] = useState<Tab>('memories');
  const [province, setProvince] = useState<ProvinceCode | null>(null);
  const pool = unlockedRelics(meta);
  const relicIds = Object.keys(RELICS) as RelicId[];
  const foes = Object.keys(FOES);
  const tabs: { id: Tab; label: string; count: string }[] = [
    { id: 'memories', label: c.tabMemories, count: `${lore.length}/${LORE.length}` },
    { id: 'deeds', label: c.tabDeeds, count: `${meta.deeds.length}/${DEEDS.length}` },
    {
      id: 'relics',
      label: c.tabRelics,
      count: `${meta.relics.length}/${relicIds.length}`,
    },
    { id: 'bestiary', label: c.tabBestiary, count: `${meta.foes.length}/${foes.length}` },
    {
      id: 'atlas',
      label: c.tabAtlas,
      count: `${Object.keys(meta.cities).length}/${Math.max(KNOWN_CHARTS, Object.keys(meta.cities).length)}`,
    },
    { id: 'records', label: c.tabRecords, count: `${wins}/${runs}` },
  ];
  return (
    <section className="chronicle">
      <div className="chronicle-header">
        <span className="eyebrow">{c.eyebrow}</span>
        <h1>
          {c.titleA}
          <em>{c.titleEm}</em>
        </h1>
        <p>{c.sub}</p>
        <div className="chronicle-counts">
          <span>
            <b>{lore.length}</b> {c.memoriesTail(LORE.length)}
          </span>
          <span>
            <b>{runs}</b> {c.expeditionsTail(runs)}
          </span>
          <span>
            <b>{wins}</b> {c.crossingsTail(wins)}
          </span>
        </div>
      </div>
      <div className="chronicle-tabs" role="tablist" aria-label={c.sections}>
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
                  <span className="eyebrow">{unlocked ? c.memoryReturned : c.waiting}</span>
                  <h2>{unlocked ? entry.title : c.unwritten}</h2>
                  <p>{unlocked ? entry.text : c.unwrittenText}</p>
                </article>
              );
            })}
          </div>
        )}
        {tab === 'deeds' && (
          <>
            <p className="codex-note">{c.deedsNote}</p>
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
                        {done ? c.unlocked : c.unlocks}: {RELICS[d.unlocks].name}
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
              {c.relicsNote(pool.length, relicIds.length, meta.relics.length)}
            </p>
            <div className="codex-grid">
              {relicIds.map((id) => {
                const open = pool.includes(id);
                const found = meta.relics.includes(id);
                const deed = DEEDS.find((d) => d.unlocks === id);
                const province = PROVINCES.find((p) => p.boon === id);
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
                      {t.app.rarity[RELICS[id].rarity].toUpperCase()}
                    </span>
                    <h2>{open ? RELICS[id].name : c.notInWorld}</h2>
                    <p>
                      {open
                        ? RELICS[id].description
                        : province
                          ? c.boonOf(province.name)
                          : c.byDeed(deed?.name ?? '')}
                    </p>
                    <small>
                      {found
                        ? RELICS[id].flavor
                        : open
                          ? c.notCarried
                          : province
                            ? c.rekindleBoth(province.name)
                            : deed?.text}
                    </small>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {tab === 'bestiary' && (
          <>
            <p className="codex-note">{c.bestiaryNote}</p>
            {CHAPTERS.map((chapter, ci) => (
              <div key={chapter.name} className="bestiary-realm">
                <h2>{chapter.name}</h2>
                <div className="codex-grid">
                  {[...ORDINARY[ci], ...ELITES[ci], BOSSES[ci]].map((foe) => (
                    <FoeCard
                      key={foe.id}
                      foe={foe}
                      met={meta.foes.includes(foe.id)}
                      rank={
                        BOSSES[ci] === foe
                          ? c.rankBoss
                          : ELITES[ci].includes(foe)
                            ? c.rankElite
                            : ''
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
            <p className="codex-note">{c.atlasNote}</p>
            <CampaignMap cities={meta.cities} selected={province} onSelect={setProvince} />
            <h2 className="campaign-heading">{c.legends}</h2>
            <div className="codex-grid campaign-legends">
              {campaignProgress(meta.cities).map((p) => (
                <article
                  key={p.province.code}
                  className={`codex-card ${p.recovered ? 'is-done' : 'is-open'}`}
                >
                  <span className="eyebrow">{p.province.kraj.toUpperCase()}</span>
                  <h2>{p.province.name}</h2>
                  <small>{c.provinceCounts(p.completed, p.total, p.walked, p.named)}</small>
                  <p>{p.recovered ? p.province.legend : p.province.rumor}</p>
                  <small>
                    {p.recovered ? c.boonRecovered : c.itsBoon}
                    {RELICS[p.province.boon].name} — {RELICS[p.province.boon].description}
                  </small>
                </article>
              ))}
            </div>
            <h2 className="campaign-heading">{c.passport}</h2>
            <div className="codex-grid">
              {Object.entries(meta.cities).map(([key, city]) => (
                <article
                  key={key}
                  className={`codex-card passport ${city.name ? 'is-done' : 'is-open'}`}
                >
                  <Icon name={city.name ? 'map' : 'compass'} size={18} />
                  <span className="eyebrow">{city.area.toUpperCase()}</span>
                  <h2>{city.name ?? city.title}</h2>
                  <p>{city.name ? c.chartedAs(city.title) : c.stillVeiled}</p>
                  <small>
                    {c.walkedTag}
                    {city.completed ? c.completedTag : ''}
                    {city.name ? c.namedTag : ''}
                  </small>
                </article>
              ))}
              {Array.from(
                { length: Math.max(0, KNOWN_CHARTS - Object.keys(meta.cities).length) },
                (_, i) => (
                  <article key={i} className="codex-card is-open passport">
                    <Icon name="eye" size={18} />
                    <h2>{c.uncharted}</h2>
                    <p>{c.beginAtlas}</p>
                  </article>
                ),
              )}
            </div>
          </>
        )}
        {tab === 'records' && <Records meta={meta} runs={runs} wins={wins} />}
      </div>
      <button className="secondary-button" onClick={onBack}>
        <Icon name="compass" size={17} /> {c.back}
      </button>
    </section>
  );
}

function FoeCard({ foe, met, rank }: { foe: Foe; met: boolean; rank: string }) {
  const t = useT();
  const c = t.chronicle;
  if (!met)
    return (
      <article className="codex-card is-open foe-card">
        <Icon name="eye" size={18} />
        {rank && <span className="eyebrow">{rank.toUpperCase()}</span>}
        <h2>{c.notDefeated}</h2>
        <p>{c.somethingWaits(!!rank)}</p>
      </article>
    );
  const line = (pattern: Foe['pattern']) =>
    pattern
      .map((i) =>
        [
          i.name,
          ...(i.damage ? [(i.hits ?? 1) > 1 ? `${i.hits} × ${i.damage}` : `${i.damage}`] : []),
          ...intentEffects(i, t),
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
        {c.foeStats(foe.health, foe.poise)}
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
  const t = useT();
  const c = t.chronicle;
  const days = Object.entries(meta.daily).sort().reverse().slice(0, 7);
  return (
    <div className="records">
      <div className="record-keepers">
        {(Object.keys(KEEPERS) as KeeperId[]).map((id) => (
          <article key={id} className="codex-card is-done">
            <span className="eyebrow">{KEEPERS[id].title.toUpperCase()}</span>
            <h2>{KEEPERS[id].name}</h2>
            <p>
              {c.bestScore} <b>{(meta.best[id] ?? 0).toLocaleString(t.locale)}</b>
            </p>
            <small>{c.deepestNight(duskUnlocked(meta, id))}</small>
          </article>
        ))}
        <article className="codex-card is-done">
          <span className="eyebrow">{c.allRoads}</span>
          <h2>{c.winsOfRuns(wins, runs)}</h2>
          <p>{c.expeditionsCompleted}</p>
          <small>{c.streakLine(meta.streak, meta.bestStreak)}</small>
        </article>
      </div>
      <h2 className="records-title">{c.lastRoads}</h2>
      {meta.history.length ? (
        <div className="history-scroll">
          <table className="history">
            <thead>
              <tr>
                <th>{c.colKeeper}</th>
                <th>{c.colRoad}</th>
                <th>{c.colNight}</th>
                <th>{c.colOutcome}</th>
                <th>{c.colTurns}</th>
                <th>{c.colScore}</th>
              </tr>
            </thead>
            <tbody>
              {meta.history.map((h, i) => (
                <tr key={i}>
                  <td>{KEEPERS[h.keeper].name}</td>
                  <td>{h.daily ? c.daily(h.daily) : h.atlas ? c.lostAtlas : c.crossing}</td>
                  <td>{t.night.duskLine(h.dusk)}</td>
                  <td>{h.won ? c.completed : c.fellAfter(h.crossed)}</td>
                  <td>{h.turns || '–'}</td>
                  <td>{h.score.toLocaleString(t.locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="codex-note">{c.noneEnded}</p>
      )}
      {days.length > 0 && (
        <>
          <h2 className="records-title">{c.dailyRoads}</h2>
          <ul className="daily-list">
            {days.map(([date, score]) => (
              <li key={date}>
                <span>{date}</span>
                <b>{score.toLocaleString(t.locale)}</b>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
