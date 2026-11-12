import { validRegionalChart, type RegionalChart } from './atlas/types';
import { AtlasSetup, RegionalAtlasPreview } from './components/AtlasSetup';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CHAPTERS,
  EVENTS,
  KEEPERS,
  LORE,
  NODE_LABELS,
  RELICS,
  WAYLIGHTS,
  type KeeperId,
  type RelicId,
} from './game/data';
import {
  canBuy,
  canEvent,
  incomingDamage,
  intentFor,
  makeEnemy,
  newRun,
  nextNodes,
  nodeAt,
  transition,
  guardAmount,
  skillDamage,
  strikeFocus,
  strikeHealing,
  poisonAmount,
  waylightFor,
  victoryCoins,
  type Action,
  type Run,
  type MapNode,
} from './game/engine';
import {
  advanceSave,
  decodeSave,
  emptySave,
  SAVE_KEY,
  LEGACY_SAVE_KEY,
  type Save,
} from './game/storage';
import { EnemyPortrait, KeeperPortrait, Landscape } from './components/Art';
import { Icon, type IconName } from './components/Icon';
import { Modal } from './components/Modal';
import { RouteMap } from './components/RouteMap';
import { Journal } from './components/Journal';
import { Scout, TalentChoice, WaylightsPanel } from './components/Strategy';
import { AtlasMap, AtlasJournal } from './components/Atlas';

function load(): { save: Save; warning: string } {
  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return { save: emptySave(), warning: '' };
    const save = decodeSave(raw);
    return {
      save: save ?? emptySave(),
      warning: save ? '' : 'The previous save could not be read. A new journey is available.',
    };
  } catch {
    return {
      save: emptySave(),
      warning: 'Browser storage is unavailable. Your journey will last only for this tab.',
    };
  }
}

const keeperIds = Object.keys(KEEPERS) as KeeperId[];
const terminal = (run: Run | null) => run?.phase === 'won' || run?.phase === 'lost';
function seedFrom(text: string) {
  return Array.from(text).reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) | 0, 5381) >>> 0;
}

export default function App() {
  const [loaded] = useState(load);
  const [save, setSave] = useState(loaded.save);
  const [warning, setWarning] = useState(loaded.warning);
  const [keeper, setKeeper] = useState<KeeperId>(loaded.save.profile.lastKeeper);
  const [seed, setSeed] = useState('');
  const [expedition, setExpedition] = useState<'classic' | 'atlas'>(
    loaded.save.run?.atlas ? 'atlas' : 'classic',
  );
  const [atlasArea, setAtlasArea] = useState('Slovakia');
  const [offlineAtlas, setOfflineAtlas] = useState(false);
  const [atlasLoading, setAtlasLoading] = useState(false);
  const [atlasError, setAtlasError] = useState('');
  const atlasRequest = useRef<AbortController | null>(null);
  const [view, setView] = useState<'journey' | 'chronicle'>('journey');
  const [modal, setModal] = useState<'help' | 'abandon' | 'journal' | null>(null);
  const [saved, setSaved] = useState(false);
  const [scouted, setScouted] = useState<MapNode | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const run = save.run;
  const chapter = run
    ? Math.floor(Math.min(11, run.phase === 'map' ? run.depth + 1 : run.depth) / 4)
    : 0;
  const dispatch = useCallback(
    (action: Action) =>
      setSave((s) => {
        if (!s.run) return s;
        const next = transition(s.run, action);
        return next === s.run ? s : advanceSave(s, next);
      }),
    [],
  );

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      setSaved(true);
    } catch {
      setWarning(
        'Browser storage is unavailable or full. Keep this tab open to continue your journey.',
      );
      setSaved(false);
    }
  }, [save]);

  useEffect(() => {
    if (run && view === 'journey' && window.matchMedia('(max-width: 740px)').matches) {
      boardRef.current?.parentElement?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [run?.phase, run?.depth, view]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        modal ||
        scouted ||
        view !== 'journey' ||
        run?.phase !== 'combat' ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof HTMLElement &&
          (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) ||
            event.target.isContentEditable))
      )
        return;
      const type = ({ '1': 'strike', '2': 'guard', '3': 'skill', '4': 'flask' } as const)[
        event.key as '1'
      ];
      if (type) {
        event.preventDefault();
        dispatch({ type });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run?.phase, modal, scouted, view, dispatch]);

  function cancelAtlas() {
    atlasRequest.current?.abort();
    atlasRequest.current = null;
    setAtlasLoading(false);
  }
  useEffect(() => () => atlasRequest.current?.abort(), []);
  async function start() {
    if (atlasRequest.current) return;
    const newSeed = seed.trim()
      ? seedFrom(seed.trim())
      : crypto.getRandomValues(new Uint32Array(1))[0];
    let selectedChart: boolean | RegionalChart = expedition === 'atlas';
    if (expedition === 'atlas' && !offlineAtlas) {
      const controller = new AbortController();
      atlasRequest.current = controller;
      setAtlasLoading(true);
      setAtlasError('');
      const timeout = setTimeout(() => controller.abort(), 110000);
      try {
        const response = await fetch('/api/atlas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ region: atlasArea.trim(), seed: newSeed }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !validRegionalChart(data.chart))
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : 'The returned map could not be read. Please try again.',
          );
        if (atlasRequest.current !== controller || controller.signal.aborted) return;
        selectedChart = data.chart;
      } catch (error) {
        if (atlasRequest.current === controller)
          setAtlasError(
            controller.signal.aborted
              ? 'Map preparation was cancelled or timed out. Your saved journey has not changed.'
              : error instanceof Error
                ? error.message
                : 'The map could not be prepared. Please try again.',
          );
        return;
      } finally {
        clearTimeout(timeout);
        if (atlasRequest.current === controller) {
          atlasRequest.current = null;
          setAtlasLoading(false);
        }
      }
    }
    setSave((s) => ({
      ...s,
      run: newRun(keeper, newSeed, selectedChart),
      profile: { ...s.profile, lastKeeper: keeper },
    }));
    setView('journey');
  }

  return (
    <div
      className={`app-shell ${run ? 'is-playing' : 'is-lobby'} ${view === 'chronicle' ? 'show-chronicle' : ''}`}
      data-phase={run?.phase ?? 'setup'}
    >
      <header className="site-header">
        <a
          className="brand"
          href="#"
          aria-label="Emberwake home"
          onClick={(e) => {
            e.preventDefault();
            setView('journey');
          }}
        >
          <span className="brand-sigil">
            <Icon name="flame" size={27} />
          </span>
          <span>
            EMBERWAKE<small>THE LAST LIGHT</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className={view === 'journey' ? 'nav-item active' : 'nav-item'}
            onClick={() => setView('journey')}
          >
            <Icon name="compass" />
            <span>Expedition</span>
          </button>
          <button
            className={view === 'chronicle' ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              cancelAtlas();
              setView('chronicle');
            }}
          >
            <Icon name="book" />
            <span>Chronicle</span>
            <small>
              {save.profile.lore.length}/{LORE.length}
            </small>
          </button>
        </nav>
        <div className="header-tools">
          <button
            aria-label="Open journal"
            className="journal-shortcut"
            onClick={() => setModal('journal')}
          >
            <Icon name="book" size={17} />
            <span>Journal</span>
          </button>
          <button aria-label="How to play" className="help-button" onClick={() => setModal('help')}>
            <Icon name="info" size={17} />
            <span>How to play</span>
          </button>
        </div>
      </header>

      {warning && (
        <div className="storage-warning" role="alert">
          <Icon name="info" />
          {warning}
          <button aria-label="Dismiss storage message" onClick={() => setWarning('')}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <main id="main-content">
        {view === 'chronicle' ? (
          <Chronicle
            lore={save.profile.lore}
            runs={save.profile.runs}
            wins={save.profile.wins}
            onBack={() => setView('journey')}
          />
        ) : (
          <>
            <section className="page-intro">
              {!run && <div className="hero-atmosphere" aria-hidden="true" />}
              <div>
                <div className="eyebrow intro-eyebrow">
                  <span className="tiny-line" />{' '}
                  {run
                    ? `${CHAPTERS[chapter].name.toUpperCase()} · ${run.phase === 'combat' ? 'THE ENCOUNTER' : 'THE EXPEDITION'}`
                    : 'A TURN-BASED TALE OF THE LAST LIGHT'}
                </div>
                <h1>
                  {!run ? (
                    <>
                      Carry the light.<em>Defy the hollow.</em>
                    </>
                  ) : terminal(run) ? (
                    run.phase === 'won' ? (
                      <>
                        Some lights<em>never go out.</em>
                      </>
                    ) : (
                      <>
                        The ember fades.<em>The story remains.</em>
                      </>
                    )
                  ) : (
                    <>
                      Every path<em>leaves a memory.</em>
                    </>
                  )}
                </h1>
                <p>
                  {!run
                    ? 'The sun is gone. The world has forgotten why.\nOne ember, three bells, and a road into the unknown.'
                    : terminal(run)
                      ? 'Every crossing changes the keeper. Every ending leaves a beginning.'
                      : run.bells > chapter
                        ? CHAPTERS[chapter].memory
                        : CHAPTERS[chapter].passage}
                </p>
                {!run && (
                  <div className="hero-actions">
                    <button
                      className="primary-button"
                      onClick={() =>
                        document.getElementById('expedition-builder')?.scrollIntoView({
                          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                            ? 'instant'
                            : 'smooth',
                          block: 'start',
                        })
                      }
                    >
                      Prepare your journey <Icon name="arrow" size={17} />
                    </button>
                    <button className="hero-rules" onClick={() => setModal('help')}>
                      <Icon name="book" size={17} /> A keeper’s guide
                    </button>
                  </div>
                )}
              </div>
              <div className="journey-metadata">
                <span className="edition-badge">
                  <i />{' '}
                  {run?.atlas || (!run && expedition === 'atlas')
                    ? 'THE LOST ATLAS'
                    : run?.ruleset === 1
                      ? 'THE FIRST CROSSING'
                      : 'ROADS REKINDLED'}
                </span>
                <div className="meta-items">
                  <span>
                    <Icon name="map" size={15} /> 3 realms
                  </span>
                  <span>
                    <Icon name="eye" size={15} /> No hidden rolls
                  </span>
                  <span>
                    <Icon name="heart" size={15} /> Your own pace
                  </span>
                </div>
              </div>
            </section>

            {run && !terminal(run) && (
              <div className="expedition-bar">
                <div className="chapter-progress">
                  {CHAPTERS.map((c, i) => (
                    <div
                      key={c.name}
                      className={`${chapter === i ? 'current' : ''} ${run.bells > i ? 'complete' : ''}`}
                    >
                      <span>{run.bells > i ? <Icon name="check" size={13} /> : `0${i + 1}`}</span>
                      <strong>{c.short}</strong>
                    </div>
                  ))}
                </div>
                <span className="encounter-count">
                  {Math.max(0, run.depth + 1)} / 12 encounters
                </span>
              </div>
            )}

            {!run && (
              <div className="builder-heading" id="expedition-builder">
                <div>
                  <span className="eyebrow">THE NEXT CHAPTER IS YOURS</span>
                  <h2>A road worth remembering.</h2>
                </div>
                <span>
                  <Icon name="flame" size={16} />
                  Every choice leaves a little light.
                </span>
              </div>
            )}
            <div className={`game-layout ${run ? 'play-layout' : 'launch-layout'}`}>
              <div className="game-main" ref={boardRef}>
                {run?.atlas && run.phase !== 'map' && (
                  <details className="atlas-fold">
                    <summary>Unfold the atlas · return to your chart after this encounter</summary>
                    <AtlasMap run={run} onInspect={setScouted} />
                  </details>
                )}
                {!run || run.phase === 'map' ? (
                  !run && expedition === 'atlas' && !offlineAtlas ? (
                    <RegionalAtlasPreview area={atlasArea} />
                  ) : run?.atlas || (!run && expedition === 'atlas') ? (
                    <AtlasMap run={run} dispatch={dispatch} onInspect={setScouted} />
                  ) : (
                    <RouteMap run={run} onInspect={setScouted} />
                  )
                ) : run.phase === 'combat' ? (
                  <Combat run={run} dispatch={dispatch} />
                ) : run.phase === 'reward' ? (
                  <Rewards run={run} dispatch={dispatch} />
                ) : run.phase === 'talent' ? (
                  <TalentChoice run={run} dispatch={dispatch} />
                ) : ['camp', 'shop', 'event'].includes(run.phase) ? (
                  <Encounter run={run} dispatch={dispatch} />
                ) : (
                  <Ending
                    run={run}
                    dispatch={dispatch}
                    onRestart={() => {
                      setKeeper(run.keeper);
                      setSave((s) => ({ ...s, run: null }));
                    }}
                  />
                )}
                <div className="beneath-board">
                  <span>
                    <Icon name="flame" size={15} />{' '}
                    {run
                      ? `${run.bells} of 3 bells awakened`
                      : 'A small ember. An impossible journey.'}
                  </span>
                  <span>
                    {run ? `ROAD ${run.seed.toString(36).toUpperCase()}` : 'STRATEGY, NOT SPEED'}
                  </span>
                </div>
              </div>

              <aside
                className="journey-sidebar"
                aria-label={run ? 'Keeper and journey details' : 'Choose your keeper'}
              >
                {!run ? (
                  <>
                    <div className="setup-section-label">
                      <span>01</span>
                      <div>
                        <small>CHOOSE YOUR JOURNEY</small>
                        <h2>Where does your story begin?</h2>
                      </div>
                    </div>
                    <div className="expedition-picker" role="group" aria-label="Choose expedition">
                      <button
                        aria-pressed={expedition === 'classic'}
                        disabled={atlasLoading}
                        onClick={() => {
                          setExpedition('classic');
                          setAtlasError('');
                        }}
                      >
                        <Icon name="flame" size={18} />
                        <span>
                          The First Crossing<small>The original adventure</small>
                        </span>
                      </button>
                      <button
                        aria-pressed={expedition === 'atlas'}
                        disabled={atlasLoading}
                        onClick={() => {
                          setExpedition('atlas');
                          setAtlasError('');
                        }}
                      >
                        <Icon name="compass" size={19} />
                        <span>
                          The Lost Atlas <i>EXPLORE</i>
                          <small>Real terrain. A hidden world.</small>
                        </span>
                      </button>
                    </div>
                    {expedition === 'atlas' && (
                      <AtlasSetup
                        area={atlasArea}
                        onArea={(v) => {
                          setAtlasArea(v);
                          setAtlasError('');
                        }}
                        offline={offlineAtlas}
                        onOffline={(v) => {
                          setOfflineAtlas(v);
                          setAtlasError('');
                        }}
                        loading={atlasLoading}
                        error={atlasError}
                        onCancel={cancelAtlas}
                      />
                    )}
                    <div className="sidebar-heading">
                      <span className="eyebrow">02 · CHOOSE YOUR KEEPER</span>
                      <h2>Who carries the ember?</h2>
                    </div>
                    <div className="keeper-picker" role="group" aria-label="Choose your keeper">
                      {keeperIds.map((id) => (
                        <button
                          key={id}
                          className={`keeper-option ${keeper === id ? 'selected' : ''}`}
                          aria-label={KEEPERS[id].title.replace('The ', '')}
                          aria-pressed={keeper === id}
                          disabled={atlasLoading}
                          onClick={() => setKeeper(id)}
                        >
                          <KeeperPortrait keeper={id} />
                          <span>
                            <small>{KEEPERS[id].name}</small>
                            {KEEPERS[id].title.replace('The ', '')}
                          </span>
                          <i>{keeper === id ? <Icon name="check" size={10} /> : null}</i>
                        </button>
                      ))}
                    </div>
                    <div className="keeper-description" key={keeper}>
                      <div className="keeper-name">
                        <h3>
                          {KEEPERS[keeper].name}
                          <span>{KEEPERS[keeper].title}</span>
                        </h3>
                        <Icon
                          name={
                            keeper === 'warden' ? 'shield' : keeper === 'seer' ? 'sparkles' : 'leaf'
                          }
                          size={23}
                        />
                      </div>
                      <p>{KEEPERS[keeper].description}</p>
                      <div className="keeper-base-stats">
                        <span>
                          <Icon name="heart" size={14} />
                          {KEEPERS[keeper].health} health
                        </span>
                        <span>
                          <Icon name="sword" size={14} />
                          {KEEPERS[keeper].attack} attack
                        </span>
                        <span>
                          <Icon name="shield" size={14} />
                          {KEEPERS[keeper].armor} armor
                        </span>
                      </div>
                      <span className="keeper-style">{KEEPERS[keeper].style}</span>
                    </div>
                    <div className="start-section">
                      <label className="seed-label" htmlFor="journey-seed">
                        Journey seed <span>optional · the same word, the same road</span>
                      </label>
                      <input
                        disabled={atlasLoading}
                        id="journey-seed"
                        maxLength={64}
                        placeholder="A word to shape your road…"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                      />
                      <button
                        className="primary-button"
                        onClick={start}
                        disabled={
                          atlasLoading ||
                          (expedition === 'atlas' && !offlineAtlas && atlasArea.trim().length < 2)
                        }
                      >
                        {atlasLoading ? 'Preparing your atlas…' : 'Begin expedition'}
                        <Icon name="arrow" size={18} />
                      </button>
                      <span className="start-note">
                        <Icon name="check" size={13} /> Your progress is saved after every move.
                      </span>
                    </div>
                    <div className="lore-note">
                      <Icon name="book" size={18} />
                      <p>
                        “The dark is not empty.
                        <br />
                        It is full of things waiting to be remembered.”
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <KeeperPanel run={run} />
                    {run.atlas ? (
                      <AtlasJournal run={run} dispatch={dispatch} />
                    ) : run.phase === 'map' ? (
                      <div className="route-choices">
                        <span className="eyebrow">THE ROAD AHEAD</span>
                        <h3>Choose your path</h3>
                        <p className="muted">Every crossing asks something of you.</p>
                        {nextNodes(run).map((node) => (
                          <button
                            className={`route-choice choice-${node.kind}`}
                            key={node.id}
                            onClick={() => dispatch({ type: 'travel', lane: node.lane })}
                          >
                            <span className="choice-icon">
                              <Icon name={node.kind} />
                            </span>
                            <span>
                              <small>{NODE_LABELS[node.kind]}</small>
                              <strong>{node.name}</strong>
                              <em>
                                {['battle', 'boss', 'elite'].includes(node.kind)
                                  ? `${makeEnemy(node, run.ruleset).maxHealth} health · ${victoryCoins(run, node)} coins + relic`
                                  : node.kind === 'event'
                                    ? 'A story. A choice. A little consequence.'
                                    : node.kind === 'camp'
                                      ? 'Rest, refill a flask, or improve your blade.'
                                      : 'Trade coins for supplies and strength.'}
                              </em>
                              {run.ruleset === 2 && waylightFor(node) && (
                                <span className="route-site-benefit">
                                  <Icon name="flame" size={11} />
                                  {WAYLIGHTS[waylightFor(node)!].name} ·{' '}
                                  {WAYLIGHTS[waylightFor(node)!].short}
                                </span>
                              )}
                            </span>
                            <Icon name="chevron" size={16} />
                          </button>
                        ))}
                        <div className="road-memory">
                          <Icon name="book" size={15} />
                          <p>{run.log.at(-1)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="battle-log">
                        <div className="section-label">
                          <Icon name="book" size={15} />
                          <span>THE STORY SO FAR</span>
                        </div>
                        <ol aria-label="Journey log">
                          {run.log.slice(-5).map((entry, i) => (
                            <li key={`${entry}-${i}`}>{entry}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {!terminal(run) && (
                      <button className="abandon-button" onClick={() => setModal('abandon')}>
                        <Icon name="flag" size={13} /> Leave this expedition
                      </button>
                    )}
                  </>
                )}
              </aside>
              {run && (
                <div className="run-supplies">
                  <RelicInventory ids={run.relics} />
                  <WaylightsPanel run={run} />
                </div>
              )}
            </div>
            {!run && (
              <div className="feature-strip">
                <div>
                  <Icon name="swords" />
                  <span>
                    <strong>A battle of choices</strong>
                    <small>Read their intent. Make your move.</small>
                  </span>
                </div>
                <div>
                  <Icon name="gem" />
                  <span>
                    <strong>A different road each time</strong>
                    <small>Find relics. Build your own strength.</small>
                  </span>
                </div>
                <div>
                  <Icon name="book" />
                  <span>
                    <strong>A world worth remembering</strong>
                    <small>Discover the truth behind the dark.</small>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="site-footer">
        <span>
          EMBERWAKE <i>·</i> Made for the wanderers.
        </span>
        <button
          className="save-status"
          aria-label="Manage journal"
          onClick={() => setModal('journal')}
        >
          <i className={saved ? 'saved-dot' : ''} />
          {saved ? 'Saved on this device' : 'Playing in this tab'} · Journal{' '}
          <Icon name="book" size={12} />
        </button>
        <button onClick={() => setModal('help')}>
          Keep a little light with you <Icon name="external" size={12} />
        </button>
      </footer>
      <div className="sr-only" role="status" aria-live="polite">
        {run
          ? `${run.phase === 'combat' ? `Turn ${run.turn + 1}. Health ${run.health}. ${intentFor(run)?.name}: ${intentFor(run)?.damage} raw damage.` : run.phase === 'map' ? 'Choose your next path.' : run.phase === 'reward' ? 'Victory. Choose your reward.' : run.phase === 'lost' ? 'Your expedition has ended.' : run.phase === 'won' ? 'Your expedition is complete.' : run.phase}`
          : 'Choose a keeper and begin an expedition.'}
      </div>

      {modal === 'help' && (
        <Modal title="A little knowledge. A longer road." onClose={() => setModal(null)}>
          <Help />
        </Modal>
      )}
      {scouted && (
        <Modal title={scouted.name} onClose={() => setScouted(null)}>
          <Scout
            run={run}
            node={scouted}
            onTravel={() => {
              dispatch({ type: 'travel', lane: scouted.lane });
              setScouted(null);
            }}
          />
        </Modal>
      )}
      {modal === 'journal' && (
        <Modal title="Keep your story close." onClose={() => setModal(null)}>
          <Journal
            save={save}
            onRestore={(restored) => {
              setSave(restored);
              setKeeper(restored.profile.lastKeeper);
              setWarning('');
              setView('journey');
              setModal(null);
              requestAnimationFrame(() =>
                boardRef.current?.parentElement?.scrollIntoView({
                  behavior: 'instant',
                  block: 'start',
                }),
              );
            }}
          />
        </Modal>
      )}
      {modal === 'abandon' && (
        <Modal title="Leave the ember behind?" onClose={() => setModal(null)}>
          <p>
            Your current expedition will end. Discovered memories stay in your chronicle. You can
            also close this dialog and return whenever you like — your progress is saved.
          </p>
          <div className="modal-actions">
            <button className="secondary-button" onClick={() => setModal(null)}>
              Keep walking
            </button>
            <button
              className="danger-button"
              onClick={() => {
                setSave((s) => ({ ...s, run: null }));
                setModal(null);
              }}
            >
              Leave expedition
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function KeeperPanel({ run }: { run: Run }) {
  return (
    <div className="keeper-panel">
      <div className="keeper-mini">
        <div className="portrait-frame">
          <KeeperPortrait keeper={run.keeper} />
        </div>
        <div>
          <span className="eyebrow">YOUR KEEPER</span>
          <h2>{KEEPERS[run.keeper].name}</h2>
          <span className="muted">{KEEPERS[run.keeper].title}</span>
        </div>
        <Icon name="flame" size={21} />
      </div>
      <div className="health-label">
        <span>
          <Icon name="heart" size={14} /> Vitality
        </span>
        <strong>
          {run.health}
          <small> / {run.maxHealth}</small>
        </strong>
      </div>
      <div
        className="health-bar"
        role="meter"
        aria-label="Keeper health"
        aria-valuenow={run.health}
        aria-valuemin={0}
        aria-valuemax={run.maxHealth}
      >
        <i style={{ width: `${(run.health / run.maxHealth) * 100}%` }} />
      </div>
      <div className="run-stats">
        <span>
          <Icon name="sword" /> <b>{run.attack}</b>
          <small>Attack</small>
        </span>
        <span>
          <Icon name="shield" /> <b>{run.armor}</b>
          <small>Armor</small>
        </span>
        <span>
          <Icon name="coins" /> <b>{run.coins}</b>
          <small>Coins</small>
        </span>
        <span>
          <Icon name="flask" />{' '}
          <b>
            {run.flasks}
            <i>/5</i>
          </b>
          <small>Flasks</small>
        </span>
      </div>
    </div>
  );
}

function RelicInventory({ ids }: { ids: RelicId[] }) {
  return (
    <section className="relic-inventory">
      <div className="section-label">
        <Icon name="gem" size={15} />
        <span>RELICS CARRIED</span>
        <small>{ids.length} / 6</small>
      </div>
      {ids.length ? (
        <div className="relic-list">
          {ids.map((id) => (
            <div className="inventory-relic" key={id} title={RELICS[id].flavor}>
              <Icon name={RELICS[id].icon as IconName} />
              <span>
                <strong>{RELICS[id].name}</strong>
                <small>{RELICS[id].description}</small>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-relics">
          Every relic has a story.
          <br />
          You have yet to find your first.
        </p>
      )}
    </section>
  );
}

function Combat({ run, dispatch }: { run: Run; dispatch: (a: Action) => void }) {
  const k = KEEPERS[run.keeper];
  const e = run.enemy!;
  const intent = intentFor(run)!;
  const chapter = Math.floor(run.depth / 4);
  const specialDamage = skillDamage(run);
  return (
    <section className="combat-board" aria-label="Turn-based combat">
      <div className="arena">
        <Landscape chapter={chapter} />
        <div className="arena-shade" />
        <div className="board-top">
          <div>
            <span className="eyebrow">
              {NODE_LABELS[nodeAt(run.seed, run.depth, run.lane).kind].toUpperCase()}
            </span>
            <h2>{e.name}</h2>
          </div>
          <span className="turn-label">
            TURN <b>{String(run.turn + 1).padStart(2, '0')}</b>
          </span>
        </div>
        <div className="combat-figures">
          <div className="hero-figure">
            <KeeperPortrait keeper={run.keeper} />
            <span>{k.name}</span>
          </div>
          <div className="versus">✧</div>
          <div className="enemy-display">
            <EnemyPortrait art={e.art} />
            <div className="enemy-vitals">
              <div>
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
              <div className="enemy-statuses">
                {e.guard > 0 && (
                  <span>
                    <Icon name="shield" size={12} /> {e.guard} guard
                  </span>
                )}
                {e.poison > 0 && (
                  <span className="poison">
                    <Icon name="leaf" size={12} /> {e.poison} poison
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className={`intent-panel ${intent.damage > 10 ? 'danger-intent' : ''}`}>
          <span className="intent-icon">
            <Icon name={intent.damage ? 'sword' : intent.guard ? 'shield' : 'heart'} size={20} />
          </span>
          <div>
            <span className="eyebrow">ENEMY INTENT</span>
            <strong>{intent.name}</strong>
          </div>
          <p>
            {intent.damage ? (
              <>
                <b>{incomingDamage(run)}</b> incoming{' '}
                <small>
                  ({intent.damage} raw − {run.armor} armor)
                </small>
              </>
            ) : intent.guard ? (
              <>
                <b>+{intent.guard}</b> enemy guard
              </>
            ) : (
              <>
                <b>+{intent.heal}</b> enemy health
              </>
            )}
            {intent.drain ? <small>Also drains {intent.drain} focus</small> : null}
          </p>
        </div>
      </div>
      <div className="combat-controls">
        <div className="controls-heading">
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
        <div className="action-grid">
          <ActionButton
            icon="sword"
            title="Strike"
            number="1"
            detail={`Deal ${run.attack} damage`}
            sub={`+${strikeFocus(run)} focus${strikeHealing(run) ? ` · heal ${strikeHealing(run)}` : ''}`}
            onClick={() => dispatch({ type: 'strike' })}
          />
          <ActionButton
            icon="shield"
            title="Guard"
            number="2"
            detail={`Block ${guardAmount(run)} damage`}
            sub={`+2 focus${run.relics.includes('briar') ? ' · deal 3 damage' : ''}`}
            onClick={() => dispatch({ type: 'guard' })}
          />
          <ActionButton
            icon={run.keeper === 'wayfarer' ? 'leaf' : 'sparkles'}
            title={k.skill}
            number="3"
            detail={`Deal ${specialDamage}${run.keeper === 'seer' ? ' piercing' : ''} damage`}
            sub={`${k.cost} focus${run.keeper === 'wayfarer' ? ` · +${poisonAmount(run)} poison` : run.keeper === 'warden' ? ' · +5 guard' : ' · bypass guard'}`}
            disabled={run.focus < k.cost}
            onClick={() => dispatch({ type: 'skill' })}
            special
          />
          <ActionButton
            icon="flask"
            title="Drink flask"
            number="4"
            detail="Restore 16 health"
            sub={`${run.flasks} remaining · ends turn`}
            disabled={!run.flasks || run.health === run.maxHealth}
            onClick={() => dispatch({ type: 'flask' })}
          />
        </div>
        <p className="combat-footnote">
          <Icon name="info" size={12} /> Every action ends your turn. Guard lasts one enemy action.
          Poison bypasses guard.
        </p>
      </div>
    </section>
  );
}

function ActionButton({
  icon,
  title,
  number,
  detail,
  sub,
  disabled,
  special,
  onClick,
}: {
  icon: IconName;
  title: string;
  number: string;
  detail: string;
  sub: string;
  disabled?: boolean;
  special?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`action-button ${special ? 'special-action' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <div>
        <Icon name={icon} size={21} />
        <kbd>{number}</kbd>
      </div>
      <strong>{title}</strong>
      <span>{detail}</span>
      <small>{sub}</small>
    </button>
  );
}

function Rewards({ run, dispatch }: { run: Run; dispatch: (a: Action) => void }) {
  const boss = run.depth % 4 === 3;
  const site = run.ruleset === 2 ? waylightFor(nodeAt(run.seed, run.depth, run.lane)) : null;
  return (
    <section className="scene-board reward-board">
      <Landscape chapter={Math.floor(run.depth / 4)} />
      <div className="scene-content">
        <span className="scene-sigil">
          <Icon name={boss ? 'bell' : 'gem'} size={34} />
        </span>
        <span className="eyebrow">
          {boss ? 'A BELL REMEMBERS ITS SONG' : 'THE DARK YIELDS A LITTLE'}
        </span>
        <h2>{boss ? 'A memory awakens.' : 'Something worth carrying.'}</h2>
        <p className="scene-lead">
          {boss
            ? CHAPTERS[Math.floor(run.depth / 4)].memory
            : 'Among the ashes, a small thing catches the light.\nChoose one gift for the road ahead.'}
        </p>
        <div className="reward-coins">
          <Icon name="coins" size={16} /> +{victoryCoins(run)} coins collected
          {run.relics.includes('thread') && <span> · +5 health</span>}
        </div>
        {site && (
          <div className="reward-waylight">
            <Icon name="flame" size={20} />
            <span>
              <strong>{WAYLIGHTS[site].name} rekindled</strong>
              <small>{WAYLIGHTS[site].benefit}</small>
            </span>
          </div>
        )}
        <div className="reward-grid">
          {run.rewards.map((id) => (
            <button
              className="reward-card"
              key={id}
              onClick={() => dispatch({ type: 'reward', id })}
            >
              <span className="relic-large">
                <Icon name={RELICS[id].icon as IconName} size={32} />
              </span>
              <span className="eyebrow">RELIC</span>
              <h3>{RELICS[id].name}</h3>
              <p>{RELICS[id].description}</p>
              <em>{RELICS[id].flavor}</em>
              <span className="take-relic">
                Carry this relic <Icon name="arrow" size={14} />
              </span>
            </button>
          ))}
        </div>
        <button
          className="secondary-button heal-reward"
          onClick={() => dispatch({ type: 'reward', id: 'heal' })}
        >
          <Icon name="heart" size={16} /> Leave the relics · recover 12 health{' '}
          <span>
            ({run.health}/{run.maxHealth})
          </span>
        </button>
      </div>
    </section>
  );
}

function Encounter({ run, dispatch }: { run: Run; dispatch: (a: Action) => void }) {
  const node = nodeAt(run.seed, run.depth, run.lane);
  const event = EVENTS[node.eventIndex];
  const shop = run.phase === 'shop';
  return (
    <section className="scene-board encounter-board">
      <Landscape chapter={Math.floor(run.depth / 4)} />
      <div className="scene-content">
        <span className="scene-sigil">
          <Icon name={node.kind} size={34} />
        </span>
        <span className="eyebrow">
          {run.phase === 'event'
            ? event.eyebrow.toUpperCase()
            : shop
              ? 'EVERYTHING HAS A PRICE. NOT EVERYTHING IS GOLD.'
              : 'EVEN THE BRAVE NEED A LITTLE WARMTH'}
        </span>
        <h2>{node.name}</h2>
        <p className="scene-lead">
          {run.phase === 'event'
            ? event.text
            : shop
              ? 'A lantern sways above a stall of impossible things. The trader smiles as though she has been expecting you. “Just what you need. Always just what you need.”'
              : 'A fire burns in the hollow of an ancient tree. There is no one here, but two cups sit beside the coals. For a moment, the world feels almost kind.'}
        </p>
        <div className="encounter-options">
          {run.phase === 'event' ? (
            event.options.map((option, i) => (
              <button
                className="story-option"
                key={option.label}
                disabled={!canEvent(run, option)}
                onClick={() => dispatch({ type: 'event', option: i })}
              >
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                <Icon name="arrow" size={17} />
              </button>
            ))
          ) : shop ? (
            <>
              {(
                [
                  {
                    item: 'flask',
                    title: 'A bottled sunrise',
                    description: 'Gain 1 flask · restores 16 health in combat',
                    price: 14,
                    icon: 'flask',
                  },
                  {
                    item: 'heal',
                    title: 'A little kindness',
                    description: 'Restore 20 health immediately',
                    price: 18,
                    icon: 'heart',
                  },
                  {
                    item: 'forge',
                    title: 'An edge of dawn',
                    description: 'Permanently gain 2 attack',
                    price: 35,
                    icon: 'sword',
                  },
                ] as const
              ).map((o) => (
                <button
                  className="story-option"
                  key={o.item}
                  disabled={!canBuy(run, o.item)}
                  onClick={() => dispatch({ type: 'buy', item: o.item })}
                >
                  <Icon name={o.icon} size={22} />
                  <span>
                    <strong>{o.title}</strong>
                    <small>
                      {run.purchased.includes(o.item)
                        ? 'Already purchased this visit'
                        : o.description}
                    </small>
                  </span>
                  <span className="price">
                    {run.purchased.includes(o.item) ? (
                      <Icon name="check" />
                    ) : (
                      <>
                        {o.price}
                        <Icon name="coins" size={15} />
                      </>
                    )}
                  </span>
                </button>
              ))}
            </>
          ) : (
            <>
              <button
                className="story-option"
                disabled={run.health === run.maxHealth}
                onClick={() => dispatch({ type: 'camp', choice: 'rest' })}
              >
                <Icon name="heart" size={22} />
                <span>
                  <strong>Rest by the embers</strong>
                  <small>
                    Restore 18 health · {run.health}/{run.maxHealth} now
                  </small>
                </span>
                <Icon name="arrow" size={17} />
              </button>
              <button
                className="story-option"
                disabled={run.flasks >= 5}
                onClick={() => dispatch({ type: 'camp', choice: 'flask' })}
              >
                <Icon name="flask" size={22} />
                <span>
                  <strong>Bottle a little warmth</strong>
                  <small>Gain 1 flask · {run.flasks}/5 carried</small>
                </span>
                <Icon name="arrow" size={17} />
              </button>
              <button
                className="story-option"
                disabled={run.coins < 30}
                onClick={() => dispatch({ type: 'camp', choice: 'forge' })}
              >
                <Icon name="sword" size={22} />
                <span>
                  <strong>Temper your blade</strong>
                  <small>Permanently gain 2 attack</small>
                </span>
                <span className="price">
                  30
                  <Icon name="coins" size={15} />
                </span>
              </button>
            </>
          )}
        </div>
        {run.phase !== 'event' && (
          <>
            <button className="text-button" onClick={() => dispatch({ type: 'leave' })}>
              Continue without {shop ? 'buying' : 'resting'} <Icon name="arrow" size={15} />
            </button>
            <p className="scene-hint">
              {shop
                ? 'Each item can be bought once per visit.'
                : 'Choose one comfort, then return to the road.'}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function Ending({
  run,
  dispatch,
  onRestart,
}: {
  run: Run;
  dispatch: (a: Action) => void;
  onRestart: () => void;
}) {
  const lost = run.phase === 'lost';
  const choosing = run.phase === 'ending';
  return (
    <section className="scene-board ending-board">
      <Landscape chapter={lost ? Math.floor(run.depth / 4) : 2} />
      <div className="scene-content">
        <span className="scene-sigil">
          <Icon name={lost ? 'flame' : 'sun'} size={40} />
        </span>
        <span className="eyebrow">
          {lost
            ? 'NOT ALL ROADS END AT DAWN'
            : choosing
              ? 'THE LAST BELL RINGS'
              : run.atlas
                ? 'THE LOST ATLAS · COMPLETE'
                : 'THE FIRST CROSSING · COMPLETE'}
        </span>
        <h2>
          {lost
            ? 'Rest now, keeper.'
            : choosing
              ? 'What is the light for?'
              : run.ending === 'dawn'
                ? 'A thousand little suns.'
                : 'A different kind of light.'}
        </h2>
        <p className="scene-lead">
          {lost
            ? `You fall in ${CHAPTERS[Math.floor(run.depth / 4)].name}. The ember goes quiet, but the memories you found will outlive the dark. Another keeper will take the road.`
            : choosing
              ? '“Eira,” the king whispers. The heart of the sun opens in his hands. You could wake it, if the world will share its burden. Or you could carry him home, and teach Cinderfall another way to keep warm.'
              : LORE.find((l) => l.id === run.ending)?.text}
        </p>
        {choosing ? (
          <div className="encounter-options">
            <button
              className="story-option"
              onClick={() => dispatch({ type: 'ending', choice: 'dawn' })}
            >
              <Icon name="sun" size={25} />
              <span>
                <strong>Share the sunrise</strong>
                <small>Wake the sun. Let every name carry a little light.</small>
              </span>
              <Icon name="arrow" />
            </button>
            <button
              className="story-option"
              onClick={() => dispatch({ type: 'ending', choice: 'hearth' })}
            >
              <Icon name="book" size={25} />
              <span>
                <strong>Bring the stories home</strong>
                <small>Keep the night. Build a library around the hearth.</small>
              </span>
              <Icon name="arrow" />
            </button>
          </div>
        ) : (
          <>
            <div className="ending-stats">
              <div>
                <strong>{run.bells}/3</strong>
                <span>Bells awakened</span>
              </div>
              <div>
                <strong>{run.relics.length}</strong>
                <span>Relics carried</span>
              </div>
              <div>
                <strong>{run.depth + 1}/12</strong>
                <span>Roads crossed</span>
              </div>
            </div>
            <button className="primary-button" onClick={onRestart}>
              <Icon name="reset" size={17} /> Walk another road
            </button>
            <p className="scene-hint">
              Your memories remain in the chronicle. Each keeper starts equal.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function Chronicle({
  lore,
  runs,
  wins,
  onBack,
}: {
  lore: string[];
  runs: number;
  wins: number;
  onBack: () => void;
}) {
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
      <div className="lore-grid">
        {LORE.map((entry, i) => {
          const unlocked = lore.includes(entry.id);
          return (
            <article className={`lore-card ${unlocked ? 'unlocked' : 'locked'}`} key={entry.id}>
              <span className="lore-number">0{i + 1}</span>
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
      <button className="secondary-button" onClick={onBack}>
        <Icon name="compass" size={17} /> Return to the expedition
      </button>
    </section>
  );
}

function Help() {
  return (
    <div className="help-content">
      <p>
        You carry the last ember through three realms. Awaken their bells, discover why the sun went
        dark, and choose how the story ends.
      </p>
      <div className="help-step">
        <span>✦</span>
        <div>
          <h3>The Lost Atlas</h3>
          <p>
            Choose The Lost Atlas before beginning to explore a fantasy world drawn over real
            OpenStreetMap terrain. Walk connected roads to uncover the veil. Reach the next
            encounter, scout it, then enter. Resolve twelve encounters and awaken three bells. Side
            paths hide supplies; each gift can be gathered once. If you recognize the real place,
            name it in the field journal for +2 attack and a hidden hearth’s location. One guess per
            bell stage; recognition is optional. Your atlas saves with your journal.
          </p>
        </div>
      </div>
      <div className="help-step">
        <span>01</span>
        <div>
          <h3>Read the road</h3>
          <p>
            Scout any map node for free before choosing a glowing route. Encounters give coins and
            relics. Story choices change your strength or supplies. Sanctuaries offer one comfort;
            traders sell each item once.
          </p>
        </div>
      </div>
      <div className="help-step">
        <span>02</span>
        <div>
          <h3>Read your enemy</h3>
          <p>
            Their next move is always visible. You act first. Every action, including drinking a
            flask, ends your turn. Armor reduces damage before your temporary guard absorbs it.
          </p>
        </div>
      </div>
      <div className="help-actions">
        <span>
          <Icon name="sword" />
          <b>Strike</b>
          <small>
            Deal attack damage.
            <br />
            Gain 1 focus.
          </small>
        </span>
        <span>
          <Icon name="shield" />
          <b>Guard</b>
          <small>
            Block 9 + armor.
            <br />
            Gain 2 focus.
          </small>
        </span>
        <span>
          <Icon name="sparkles" />
          <b>Keeper skill</b>
          <small>
            Spend focus for your
            <br />
            unique ability.
          </small>
        </span>
        <span>
          <Icon name="flask" />
          <b>Flask</b>
          <small>
            Restore 16 health.
            <br />
            Still ends your turn.
          </small>
        </span>
      </div>
      <p className="help-tip">
        <Icon name="info" /> Guard lasts one enemy action. Enemy guard lasts until broken. Poison
        ticks after your action, bypasses guard, then loses one stack. Focus starts at 2 before
        waylight and lesson bonuses, and caps at 5.
      </p>
      <div className="help-step">
        <span>03</span>
        <div>
          <h3>Know your keeper</h3>
          <p>
            <b>Warden:</b> spend 3 focus for 2× attack + 3 damage and 5 guard.
            <br />
            <b>Seer:</b> Guard blocks 4 extra; spend 3 focus for 2× attack + 7 piercing damage.
            <br />
            <b>Wayfarer:</b> Strike heals 2; spend 2 focus for attack + 2 damage and 5 poison.
          </p>
        </div>
      </div>
      <div className="help-step">
        <span>04</span>
        <div>
          <h3>Carry what matters</h3>
          <p>
            After each victory, take a unique relic or recover 12 health. Relics last this
            expedition. Memories last beyond it. There are no permanent stat bonuses, timers, or
            purchases.
          </p>
        </div>
      </div>
      <div className="help-step">
        <span>05</span>
        <div>
          <h3>Leave a little light behind</h3>
          <p>
            At the start of each realm, choose which waylight to free: a Dawnwell heals 2 on future
            crossings, a Cinder Kiln earns 4 coins per crossing, and a Moth Observatory adds 1
            starting focus. They stack for this run and never generate rewards while you are away.
            After the first two bells, remember one keeper lesson to specialize your build.
          </p>
        </div>
      </div>
      <div className="help-footer">
        <Icon name="check" size={16} /> Autosaved on this device after every move.
        <br />
        Keyboard: 1 Strike · 2 Guard · 3 Skill · 4 Flask · Esc closes dialogs.
      </div>
    </div>
  );
}
