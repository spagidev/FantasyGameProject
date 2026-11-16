import type { RegionalChart } from './atlas/types';
import { bundledCount, type AtlasSource } from './atlas/bundled';
import { prepareChart } from './atlas/prepare';
import { campaignMap } from './atlas/provinces';
import { AtlasSetup, RegionalAtlasPreview } from './components/AtlasSetup';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CHAPTERS,
  EVENTS,
  KEEPERS,
  LORE,
  RELICS,
  RELIC_SETS,
  setOf,
  WAYLIGHTS,
  type KeeperId,
  type RelicId,
} from './game/data';
import {
  attackOf,
  realmOf,
  encountersEntered,
  encountersWon,
  canBuy,
  canEvent,
  incomingDamage,
  intentFor,
  makeEnemy,
  newRun,
  nextNodes,
  nodeOf,
  priceOf,
  restAmount,
  transition,
  waylightFor,
  victoryCoins,
  type Action,
  type Run,
  type MapNode,
  type ShopItem,
} from './game/engine';
import {
  advanceSave,
  decodeSave,
  emptySave,
  metaOf,
  SAVE_KEY,
  LEGACY_SAVE_KEY,
  type Save,
} from './game/storage';
import { DEEDS, dailyRoad, duskUnlocked, unlockedRelics, type Meta } from './game/meta';
import { Chronicle } from './components/Chronicle';
import { DuskPicker, ScoreCard } from './components/Night';
import { KeeperPortrait, Landscape, RelicIcon, SceneArt } from './components/Art';
import { Icon, type IconName } from './components/Icon';
import { Modal } from './components/Modal';
import { RouteMap } from './components/RouteMap';
import { Combat, combatKeys } from './components/Combat';
import { play, setSound } from './sound';
import { VOICES, pageFor } from './game/lore';
import { Journal } from './components/Journal';
import { Scout, TalentChoice, WaylightsPanel } from './components/Strategy';
import { AtlasMap, AtlasJournal } from './components/Atlas';
import { OfflineBadge } from './components/OfflineBadge';
import { DICTS, LanguageProvider, useT, type Lang } from './i18n';

type Warning = '' | 'unreadable' | 'unavailable' | 'full';
// Errors that are ours are kept as codes and written in the current language when shown.
const MAP_CANCELLED = '\u0000cancelled';
const MAP_FAILED = '\u0000failed';
function load(): { save: Save; warning: Warning } {
  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return { save: emptySave(), warning: '' };
    const save = decodeSave(raw);
    return {
      save: save ?? emptySave(),
      warning: save ? '' : 'unreadable',
    };
  } catch {
    return {
      save: emptySave(),
      warning: 'unavailable',
    };
  }
}

const keeperIds = Object.keys(KEEPERS) as KeeperId[];
const terminal = (run: Run | null) => run?.phase === 'won' || run?.phase === 'lost';
function seedFrom(text: string) {
  return Array.from(text).reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) | 0, 5381) >>> 0;
}

// A shared road: ?road=<seed in base36>&keeper=<id>&dusk=<n>, read once at load.
function readShare() {
  if (typeof location === 'undefined') return null;
  const q = new URLSearchParams(location.search);
  const road = q.get('road');
  const who = q.get('keeper');
  if (road === null && who === null && q.get('dusk') === null) return null;
  const exact = road !== null && /^[0-9a-z]{1,7}$/.test(road) ? parseInt(road, 36) : NaN;
  const duskNum = Number(q.get('dusk'));
  return {
    road: Number.isFinite(exact) && exact <= 0xffffffff ? road : null,
    exact,
    keeper: keeperIds.find((id) => id === who),
    dusk: Number.isInteger(duskNum) && duskNum >= 0 ? duskNum : 0,
  };
}
const SHARED = readShare();

export default function App() {
  const [loaded] = useState(load);
  const share = loaded.save.run ? null : SHARED;
  useEffect(() => {
    if (!SHARED) return;
    const q = new URLSearchParams(location.search);
    ['road', 'keeper', 'dusk'].forEach((k) => q.delete(k));
    const rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
  }, []);
  const [sharedSeed] = useState(() =>
    share?.road ? { text: share.road, value: share.exact } : null,
  );
  const [save, setSave] = useState(loaded.save);
  const [warning, setWarning] = useState<Warning>(loaded.warning);
  const [keeper, setKeeper] = useState<KeeperId>(share?.keeper ?? loaded.save.profile.lastKeeper);
  const [seed, setSeed] = useState(share?.road ?? '');
  const [expedition, setExpedition] = useState<'classic' | 'atlas'>(
    loaded.save.run?.atlas ? 'atlas' : 'classic',
  );
  const [atlasArea, setAtlasArea] = useState('Slovakia');
  const [atlasSource, setAtlasSource] = useState<AtlasSource>('bundled');
  const [atlasNotice, setAtlasNotice] = useState('');
  const offlineAtlas = atlasSource === 'original';
  const [atlasLoading, setAtlasLoading] = useState(false);
  const [atlasError, setAtlasError] = useState('');
  const atlasRequest = useRef<AbortController | null>(null);
  const [view, setView] = useState<'journey' | 'chronicle'>('journey');
  const [modal, setModal] = useState<'help' | 'abandon' | 'journal' | null>(null);
  const [saved, setSaved] = useState(false);
  const [scouted, setScouted] = useState<MapNode | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const run = save.run;
  const meta = metaOf(save.profile);
  const lang: Lang = meta.lang ?? 'en';
  const t = DICTS[lang];
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const [dusk, setDusk] = useState(() =>
    share
      ? Math.min(
          share.dusk,
          duskUnlocked(metaOf(loaded.save.profile), share.keeper ?? loaded.save.profile.lastKeeper),
        )
      : 0,
  );
  const night = Math.min(dusk, duskUnlocked(meta, keeper));
  // Deeds completed since this page opened, for the toast and the ending screen.
  const knownDeeds = useRef(meta.deeds);
  const [earned, setEarned] = useState<string[]>([]);
  const [toast, setToast] = useState<string[]>([]);
  const bestBefore = useRef(run ? (meta.best[run.keeper] ?? 0) : 0);
  if (run && !terminal(run)) bestBefore.current = meta.best[run.keeper] ?? 0;
  const today = dailyRoad(new Date());
  const chapter = run ? realmOf(run) : 0;
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
      setWarning('full');
      setSaved(false);
    }
  }, [save]);

  useEffect(() => {
    const fresh = meta.deeds.filter((id) => !knownDeeds.current.includes(id));
    knownDeeds.current = meta.deeds;
    if (!fresh.length) return;
    setEarned((e) => [...e, ...fresh]);
    setToast(fresh);
    play('deed');
    const timer = setTimeout(() => setToast([]), 6500);
    return () => clearTimeout(timer);
  }, [meta.deeds]);

  useEffect(() => setSound(meta.sound), [meta.sound]);
  const bells = run?.bells ?? 0;
  const rung = useRef(bells);
  useEffect(() => {
    if (bells > rung.current) play('bell');
    rung.current = bells;
  }, [bells]);

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
        !run ||
        run.phase !== 'combat' ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof HTMLElement &&
          (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) ||
            event.target.isContentEditable))
      )
        return;
      const type = combatKeys(run)[Number(event.key) - 1];
      if (type && /^[1-5]$/.test(event.key)) {
        event.preventDefault();
        dispatch({ type });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run?.phase, run?.ruleset, modal, scouted, view, dispatch]);

  function cancelAtlas() {
    atlasRequest.current?.abort();
    atlasRequest.current = null;
    setAtlasLoading(false);
  }
  useEffect(() => () => atlasRequest.current?.abort(), []);
  async function start(
    options: { daily?: boolean; keeper?: KeeperId; dusk?: number; classic?: boolean } = {},
  ) {
    if (atlasRequest.current) return;
    const who = options.daily ? today.keeper : (options.keeper ?? keeper);
    const mode = options.daily || options.classic ? 'classic' : expedition;
    const level = options.daily ? 0 : Math.min(options.dusk ?? night, duskUnlocked(meta, who));
    const newSeed = options.daily
      ? today.seed
      : seed.trim() && !options.keeper
        ? sharedSeed && seed.trim() === sharedSeed.text
          ? sharedSeed.value
          : seedFrom(seed.trim())
        : crypto.getRandomValues(new Uint32Array(1))[0];
    let selectedChart: boolean | RegionalChart = mode === 'atlas';
    if (mode === 'atlas' && !offlineAtlas) {
      const controller = new AbortController();
      atlasRequest.current = controller;
      setAtlasLoading(true);
      setAtlasError('');
      const timeout = setTimeout(() => controller.abort(), 110000);
      try {
        const result = await prepareChart(
          atlasArea.trim(),
          newSeed,
          atlasSource as 'bundled' | 'live',
          controller.signal,
          fetch,
          // Charts already rekindled are passed over while another remains in the area.
          campaignMap.cities.filter((c) => meta.cities[c.key]?.completed).map((c) => c.id),
        );
        if (atlasRequest.current !== controller || controller.signal.aborted) return;
        selectedChart = result.chart;
        setAtlasNotice(result.fallback ? atlasArea.trim() : '');
      } catch (error) {
        if (atlasRequest.current === controller)
          setAtlasError(
            controller.signal.aborted
              ? MAP_CANCELLED
              : error instanceof Error
                ? error.message
                : MAP_FAILED,
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
    if (mode !== 'atlas' || offlineAtlas) setAtlasNotice('');
    setEarned([]);
    setKeeper(who);
    setSave((s) => ({
      ...s,
      run: newRun(who, newSeed, selectedChart, {
        dusk: level,
        pool: unlockedRelics(metaOf(s.profile)),
        ...(options.daily ? { daily: today.id } : {}),
      }),
      profile: { ...s.profile, lastKeeper: who },
    }));
    setView('journey');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const setLang = (next: Lang) =>
    setSave((s) => ({
      ...s,
      profile: { ...s.profile, meta: { ...metaOf(s.profile), lang: next } },
    }));
  const atlasErrorText =
    atlasError === MAP_CANCELLED
      ? t.app.atlasCancelled
      : atlasError === MAP_FAILED
        ? t.app.atlasFailed
        : atlasError;
  const warningText = {
    unreadable: t.app.warnUnreadable,
    unavailable: t.app.warnUnavailable,
    full: t.app.warnFull,
    '': '',
  }[warning];

  return (
    <LanguageProvider lang={lang}>
      <div
        className={`app-shell ${run ? 'is-playing' : 'is-lobby'} ${view === 'chronicle' ? 'show-chronicle' : ''}`}
        data-phase={run?.phase ?? 'setup'}
      >
        <header className="site-header">
          <a
            className="brand"
            href="#"
            aria-label={t.app.homeLabel}
            onClick={(e) => {
              e.preventDefault();
              setView('journey');
            }}
          >
            <span className="brand-sigil">
              <Icon name="flame" size={27} />
            </span>
            <span>
              EMBERWAKE<small>{t.app.brandSub}</small>
            </span>
          </a>
          <nav aria-label={t.app.navLabel}>
            <button
              className={view === 'journey' ? 'nav-item active' : 'nav-item'}
              onClick={() => setView('journey')}
            >
              <Icon name="compass" />
              <span>{t.app.navExpedition}</span>
            </button>
            <button
              className={view === 'chronicle' ? 'nav-item active' : 'nav-item'}
              onClick={() => {
                cancelAtlas();
                setView('chronicle');
              }}
            >
              <Icon name="book" />
              <span>{t.app.navChronicle}</span>
              <small>
                {save.profile.lore.length}/{LORE.length}
              </small>
            </button>
          </nav>
          <div className="header-tools">
            <button
              aria-label={t.app.openJournal}
              className="journal-shortcut"
              onClick={() => setModal('journal')}
            >
              <Icon name="book" size={17} />
              <span>{t.app.journal}</span>
            </button>
            <button
              aria-label={t.app.howToPlayLabel}
              className="help-button"
              onClick={() => setModal('help')}
            >
              <Icon name="info" size={17} />
              <span>{t.app.howToPlay}</span>
            </button>
          </div>
        </header>

        {warning && (
          <div className="storage-warning" role="alert">
            <Icon name="info" />
            {warningText}
            <button aria-label={t.app.dismissStorage} onClick={() => setWarning('')}>
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
              meta={meta}
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
                      ? t.app.eyebrowRun(
                          CHAPTERS[chapter].name.toUpperCase(),
                          run.phase === 'combat',
                        )
                      : t.app.eyebrowLobby}
                  </div>
                  <h1>
                    {!run ? (
                      <>
                        {t.app.h1Lobby}
                        <em>{t.app.h1LobbyEm}</em>
                      </>
                    ) : terminal(run) ? (
                      run.phase === 'won' ? (
                        <>
                          {t.app.h1Won}
                          <em>{t.app.h1WonEm}</em>
                        </>
                      ) : (
                        <>
                          {t.app.h1Lost}
                          <em>{t.app.h1LostEm}</em>
                        </>
                      )
                    ) : (
                      <>
                        {t.app.h1Mid}
                        <em>{t.app.h1MidEm}</em>
                      </>
                    )}
                  </h1>
                  <p>
                    {!run
                      ? t.app.leadLobby
                      : terminal(run)
                        ? t.app.leadEnded
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
                        {t.app.prepare} <Icon name="arrow" size={17} />
                      </button>
                      <button className="hero-rules" onClick={() => setModal('help')}>
                        <Icon name="book" size={17} /> {t.app.guide}
                      </button>
                    </div>
                  )}
                </div>
                <div className="journey-metadata">
                  <span className="edition-badge">
                    <i />{' '}
                    {run?.atlas || (!run && expedition === 'atlas')
                      ? t.app.editionAtlas
                      : run?.ruleset === 1
                        ? t.app.editionFirst
                        : run?.ruleset === 2
                          ? t.app.editionRekindled
                          : run?.daily
                            ? t.app.editionToday(run.daily)
                            : `${t.app.editionNight}${run ? ` · ${t.app.duskTag(run.dusk ?? 0)}` : ''}`}
                  </span>
                  <div className="meta-items">
                    <span>
                      <Icon name="map" size={15} /> {t.app.realms3}
                    </span>
                    <span>
                      <Icon name="eye" size={15} /> {t.app.noHiddenRolls}
                    </span>
                    <span>
                      <Icon name="heart" size={15} /> {t.app.ownPace}
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
                    {t.app.encountersCount(encountersEntered(run))}
                  </span>
                </div>
              )}

              {!run && (
                <div className="builder-heading" id="expedition-builder">
                  <div>
                    <span className="eyebrow">{t.app.builderEyebrow}</span>
                    <h2>{t.app.builderTitle}</h2>
                  </div>
                  <span>
                    <Icon name="flame" size={16} />
                    {t.app.builderNote}
                  </span>
                </div>
              )}
              {run && atlasNotice && (
                <p className="atlas-fallback-notice" role="status">
                  <Icon name="info" size={17} />
                  {t.app.atlasFallback(atlasNotice)}
                </p>
              )}
              <div className={`game-layout ${run ? 'play-layout' : 'launch-layout'}`}>
                <div className="game-main" ref={boardRef}>
                  {run?.atlas && run.phase !== 'map' && (
                    <details className="atlas-fold">
                      <summary>{t.app.atlasFold}</summary>
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
                    <Combat
                      run={run}
                      dispatch={dispatch}
                      coach={save.profile.wins === 0 && run.depth < 4}
                    />
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
                      meta={meta}
                      earned={earned}
                      previousBest={bestBefore.current}
                      onAgain={
                        run.ruleset === 3 && !run.atlas && !run.daily
                          ? () =>
                              void start({
                                keeper: run.keeper,
                                classic: true,
                                dusk:
                                  run.phase === 'won'
                                    ? Math.min(duskUnlocked(meta, run.keeper), (run.dusk ?? 0) + 1)
                                    : (run.dusk ?? 0),
                              })
                          : undefined
                      }
                      onRestart={() => {
                        setKeeper(run.keeper);
                        setDusk(duskUnlocked(meta, run.keeper));
                        setSave((s) => ({ ...s, run: null }));
                        window.scrollTo({ top: 0, behavior: 'instant' });
                      }}
                    />
                  )}
                  <div className="beneath-board">
                    <span>
                      <Icon name="flame" size={15} />{' '}
                      {run ? t.app.bellsAwakened(run.bells) : t.app.emberLine}
                    </span>
                    <span>
                      {run
                        ? t.app.roadCode(run.seed.toString(36).toUpperCase())
                        : t.app.strategyNotSpeed}
                    </span>
                  </div>
                </div>

                <aside
                  className="journey-sidebar"
                  aria-label={run ? t.app.sidebarRun : t.app.sidebarLobby}
                >
                  {!run ? (
                    <>
                      <div className="setup-section-label">
                        <span>01</span>
                        <div>
                          <small>{t.app.step1}</small>
                          <h2>{t.app.step1Title}</h2>
                        </div>
                      </div>
                      <div
                        className="expedition-picker"
                        role="group"
                        aria-label={t.app.chooseExpedition}
                      >
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
                            {t.app.firstCrossing}
                            <small>{t.app.firstCrossingNote}</small>
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
                            {t.app.lostAtlas} <i>{t.app.explore}</i>
                            <small>{t.app.lostAtlasNote}</small>
                          </span>
                        </button>
                      </div>
                      {expedition === 'atlas' && (
                        <AtlasSetup
                          meta={meta}
                          area={atlasArea}
                          onArea={(v) => {
                            setAtlasArea(v);
                            setAtlasError('');
                          }}
                          source={atlasSource}
                          onSource={(v) => {
                            setAtlasSource(v);
                            setAtlasError('');
                          }}
                          loading={atlasLoading}
                          error={atlasErrorText}
                          onCancel={cancelAtlas}
                        />
                      )}
                      <div className="sidebar-heading">
                        <span className="eyebrow">{t.app.step2}</span>
                        <h2>{t.app.step2Title}</h2>
                      </div>
                      <div className="keeper-picker" role="group" aria-label={t.app.chooseKeeper}>
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
                              keeper === 'warden'
                                ? 'shield'
                                : keeper === 'seer'
                                  ? 'sparkles'
                                  : 'leaf'
                            }
                            size={23}
                          />
                        </div>
                        <p>{KEEPERS[keeper].description}</p>
                        <div className="keeper-base-stats">
                          <span>
                            <Icon name="heart" size={14} />
                            {t.app.healthN(KEEPERS[keeper].health)}
                          </span>
                          <span>
                            <Icon name="sword" size={14} />
                            {t.app.attackN(KEEPERS[keeper].attack)}
                          </span>
                          <span>
                            <Icon name="shield" size={14} />
                            {t.app.armorN(KEEPERS[keeper].armor)}
                          </span>
                        </div>
                        <span className="keeper-style">{KEEPERS[keeper].style}</span>
                      </div>
                      <DuskPicker
                        meta={meta}
                        keeper={keeper}
                        dusk={night}
                        onDusk={setDusk}
                        disabled={atlasLoading}
                      />
                      <div className="start-section">
                        <label className="seed-label" htmlFor="journey-seed">
                          {t.app.seedLabel} <span>{t.app.seedHint}</span>
                        </label>
                        <input
                          disabled={atlasLoading}
                          id="journey-seed"
                          maxLength={64}
                          placeholder={t.app.seedPlaceholder}
                          value={seed}
                          onChange={(e) => setSeed(e.target.value)}
                        />
                        <button
                          className="primary-button"
                          onClick={() => void start()}
                          disabled={
                            atlasLoading ||
                            (expedition === 'atlas' &&
                              !offlineAtlas &&
                              (atlasArea.trim().length < 2 ||
                                (atlasSource === 'bundled' && !bundledCount(atlasArea))))
                          }
                        >
                          {atlasLoading ? t.app.preparing : t.app.begin}
                          <Icon name="arrow" size={18} />
                        </button>
                        <span className="start-note">
                          <Icon name="check" size={13} /> {t.app.savedNote}
                        </span>
                        <button
                          className="daily-button"
                          disabled={atlasLoading}
                          onClick={() => void start({ daily: true })}
                        >
                          <Icon name="sun" size={16} />
                          <span>
                            {t.app.todaysRoad(today.id)}
                            <small>
                              {t.app.dailyBlurb(KEEPERS[today.keeper].name)}{' '}
                              {meta.daily[today.id]
                                ? t.app.dailyBest(meta.daily[today.id].toLocaleString(t.locale))
                                : t.app.dailyNone}
                            </small>
                          </span>
                        </button>
                      </div>
                      <div className="lore-note">
                        <Icon name="book" size={18} />
                        <p>
                          {t.app.loreNote1}
                          <br />
                          {t.app.loreNote2}
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
                          <span className="eyebrow">{t.app.roadAhead}</span>
                          <h3>{t.app.choosePath}</h3>
                          <p className="muted">{t.app.everyCrossing}</p>
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
                                <small>{t.node[node.kind]}</small>
                                <strong>{node.name}</strong>
                                <em>
                                  {['battle', 'boss', 'elite'].includes(node.kind)
                                    ? t.app.fightLine(
                                        makeEnemy(node, run.ruleset, run.dusk).maxHealth,
                                        victoryCoins(run, node),
                                      )
                                    : node.kind === 'event'
                                      ? t.app.eventLine
                                      : node.kind === 'camp'
                                        ? t.app.campLine
                                        : t.app.shopLine}
                                </em>
                                {run.ruleset >= 2 && waylightFor(node) && (
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
                            <span>{t.app.storySoFar}</span>
                          </div>
                          <ol aria-label={t.app.journeyLog}>
                            {run.log.slice(-5).map((entry, i) => (
                              <li key={`${entry}-${i}`}>{entry}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {!terminal(run) && (
                        <button className="abandon-button" onClick={() => setModal('abandon')}>
                          <Icon name="flag" size={13} /> {t.app.leaveThis}
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
                      <strong>{t.app.feature1}</strong>
                      <small>{t.app.feature1Note}</small>
                    </span>
                  </div>
                  <div>
                    <Icon name="gem" />
                    <span>
                      <strong>{t.app.feature2}</strong>
                      <small>{t.app.feature2Note}</small>
                    </span>
                  </div>
                  <div>
                    <Icon name="book" />
                    <span>
                      <strong>{t.app.feature3}</strong>
                      <small>{t.app.feature3Note}</small>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        <footer className="site-footer">
          <span>
            EMBERWAKE <i>·</i> {t.app.footerMade}
          </span>
          <button
            className="save-status"
            aria-label={t.app.manageJournal}
            onClick={() => setModal('journal')}
          >
            <i className={saved ? 'saved-dot' : ''} />
            {saved ? t.app.savedHere : t.app.playingTab} · {t.app.journal}{' '}
            <Icon name="book" size={12} />
          </button>
          <OfflineBadge />
          <button
            className="sound-toggle"
            aria-label={meta.sound ? t.app.soundOff : t.app.soundOn}
            aria-pressed={meta.sound}
            onClick={() => {
              setSound(!meta.sound);
              setSave((s) => ({
                ...s,
                profile: { ...s.profile, meta: { ...metaOf(s.profile), sound: !meta.sound } },
              }));
            }}
          >
            <Icon name="bell" size={17} />
            <span>{meta.sound ? t.app.soundIsOn : t.app.soundIsOff}</span>
          </button>
          <div className="lang-switch" role="group" aria-label={t.app.languageGroup}>
            <button
              lang="en"
              aria-label="English"
              aria-pressed={lang === 'en'}
              onClick={() => setLang('en')}
            >
              EN
            </button>
            <i aria-hidden="true">·</i>
            <button
              lang="sk"
              aria-label="Slovenčina"
              aria-pressed={lang === 'sk'}
              onClick={() => setLang('sk')}
            >
              SK
            </button>
          </div>
          <button onClick={() => setModal('help')}>
            {t.app.keepLight} <Icon name="external" size={12} />
          </button>
        </footer>
        {toast.length > 0 && (
          <div className="deed-toast" role="status">
            {DEEDS.filter((d) => toast.includes(d.id)).map((d) => (
              <p key={d.id}>
                <Icon name="sparkles" size={16} />
                <span>
                  <b>{t.app.deed(d.name)}</b>
                  {d.unlocks ? t.app.deedFuture(RELICS[d.unlocks].name) : d.text}
                </span>
              </p>
            ))}
          </div>
        )}
        <div className="sr-only" role="status" aria-live="polite">
          {run
            ? run.phase === 'combat'
              ? t.app.srCombat(
                  run.turn + 1,
                  run.health,
                  intentFor(run)?.name ?? '',
                  intentFor(run)?.damage ?? 0,
                )
              : run.phase === 'map'
                ? t.app.srMap
                : run.phase === 'reward'
                  ? t.app.srReward
                  : run.phase === 'lost'
                    ? t.app.srLost
                    : run.phase === 'won'
                      ? t.app.srWon
                      : run.phase
            : t.app.srLobby}
        </div>

        {modal === 'help' && (
          <Modal title={t.app.helpTitle} onClose={() => setModal(null)}>
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
          <Modal title={t.app.journalTitle} onClose={() => setModal(null)}>
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
          <Modal title={t.app.abandonTitle} onClose={() => setModal(null)}>
            <p>{t.app.abandonBody}</p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setModal(null)}>
                {t.app.keepWalking}
              </button>
              <button
                className="danger-button"
                onClick={() => {
                  setSave((s) => ({ ...s, run: null }));
                  setModal(null);
                }}
              >
                {t.app.leaveExpedition}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </LanguageProvider>
  );
}

function KeeperPanel({ run }: { run: Run }) {
  const t = useT();
  return (
    <div className="keeper-panel">
      <div className="keeper-mini">
        <div className="portrait-frame">
          <KeeperPortrait keeper={run.keeper} />
        </div>
        <div>
          <span className="eyebrow">{t.app.yourKeeper}</span>
          <h2>{KEEPERS[run.keeper].name}</h2>
          <span className="muted">{KEEPERS[run.keeper].title}</span>
        </div>
        <Icon name="flame" size={21} />
      </div>
      <div className="health-label">
        <span>
          <Icon name="heart" size={14} /> {t.app.vitality}
        </span>
        <strong>
          {run.health}
          <small> / {run.maxHealth}</small>
        </strong>
      </div>
      <div
        className="health-bar"
        role="meter"
        aria-label={t.app.keeperHealth}
        aria-valuenow={run.health}
        aria-valuemin={0}
        aria-valuemax={run.maxHealth}
      >
        <i style={{ width: `${(run.health / run.maxHealth) * 100}%` }} />
      </div>
      <div className="run-stats">
        <span>
          <Icon name="sword" /> <b>{attackOf(run)}</b>
          <small>{t.common.attack}</small>
        </span>
        <span>
          <Icon name="shield" /> <b>{run.armor}</b>
          <small>{t.common.armor}</small>
        </span>
        <span>
          <Icon name="coins" /> <b>{run.coins}</b>
          <small>{t.common.coinsLabel}</small>
        </span>
        <span>
          <Icon name="flask" />{' '}
          <b>
            {run.flasks}
            <i>/5</i>
          </b>
          <small>{t.common.flasks}</small>
        </span>
      </div>
    </div>
  );
}

/** A relic's set, how many of it are carried, and the bonus once all three are. */
function SetLine({ id, carried }: { id: RelicId; carried: RelicId[] }) {
  const t = useT();
  const set = setOf(id);
  if (!set) return null;
  const { name, relics, bonus } = RELIC_SETS[set];
  const have = relics.filter((r) => carried.includes(r)).length;
  return (
    <span className={`relic-set ${have === 3 ? 'is-complete' : ''}`}>
      {name} · {have}/3{have === 3 ? ` · ${bonus}` : ` · ${t.app.allThree(bonus)}`}
    </span>
  );
}

function RelicInventory({ ids }: { ids: RelicId[] }) {
  const t = useT();
  return (
    <section className="relic-inventory">
      <div className="section-label">
        <Icon name="gem" size={15} />
        <span>{t.app.relicsCarried}</span>
        <small>{ids.length}</small>
      </div>
      {ids.length ? (
        <div className="relic-list">
          {ids.map((id) => (
            <div className="inventory-relic" key={id} title={RELICS[id].flavor}>
              <RelicIcon id={id} size={30} />
              <span>
                <strong>{RELICS[id].name}</strong>
                <small>{RELICS[id].description}</small>
                <SetLine id={id} carried={ids} />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-relics">
          {t.app.noRelics1}
          <br />
          {t.app.noRelics2}
        </p>
      )}
    </section>
  );
}

function Rewards({ run, dispatch }: { run: Run; dispatch: (a: Action) => void }) {
  const t = useT();
  const trove = run.side;
  const boss = !trove && run.depth % 4 === 3;
  const site = !trove && run.ruleset >= 2 ? waylightFor(nodeOf(run)) : null;
  return (
    <section className="scene-board reward-board">
      <Landscape chapter={realmOf(run)} />
      <div className="scene-content">
        <span className="scene-sigil">
          <Icon name={boss ? 'bell' : 'gem'} size={34} />
        </span>
        {run.enemy && (
          <p className="victory-beat">
            <b>{t.app.falls(run.enemy.name)}</b>
            {run.stats && run.turn > 0 && t.app.turnsN(run.turn)}
          </p>
        )}
        <span className="eyebrow">
          {trove ? t.app.troveYours : boss ? t.app.bellRemembers : t.app.darkYields}
        </span>
        <h2>{boss ? t.app.memoryAwakens : t.app.somethingWorth}</h2>
        {boss && run.enemy?.id && VOICES[run.enemy.id]?.fall && (
          <p className="voice-fall">{VOICES[run.enemy.id].fall}</p>
        )}
        <p className="scene-lead">{boss ? CHAPTERS[realmOf(run)].memory : t.app.rewardLead}</p>
        {boss && pageFor(`${run.keeper}-bell-${run.bells}`) && run.ruleset === 3 && (
          <blockquote className="keeper-page">
            <SceneArt id={`journal-${run.keeper}`} />
            <p>{pageFor(`${run.keeper}-bell-${run.bells}`)!.text}</p>
            <cite>{t.app.journalPage(KEEPERS[run.keeper].name)}</cite>
          </blockquote>
        )}
        <div className="reward-coins">
          {trove ? (
            <>
              <Icon name="gem" size={16} /> {run.log.at(-1)}
            </>
          ) : (
            <>
              <Icon name="coins" size={16} /> {t.app.coinsCollected(victoryCoins(run))}
            </>
          )}
          {run.relics.includes('thread') && <span>{t.app.plusHealth}</span>}
        </div>
        {site && (
          <div className="reward-waylight">
            <Icon name="flame" size={20} />
            <span>
              <strong>{t.app.rekindled(WAYLIGHTS[site].name)}</strong>
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
                <RelicIcon id={id} size={56} />
              </span>
              <span className={`eyebrow rarity-${RELICS[id].rarity}`}>
                {run.ruleset === 3
                  ? t.app.relicTagRarity(t.app.rarity[RELICS[id].rarity])
                  : t.app.relicTag}
              </span>
              <h3>{RELICS[id].name}</h3>
              <p>{RELICS[id].description}</p>
              <SetLine id={id} carried={run.relics} />
              <em>{RELICS[id].flavor}</em>
              <span className="take-relic">
                {t.app.carryRelic} <Icon name="arrow" size={14} />
              </span>
            </button>
          ))}
        </div>
        <button
          className="secondary-button heal-reward"
          onClick={() => dispatch({ type: 'reward', id: 'heal' })}
        >
          <Icon name="heart" size={16} /> {t.app.leaveRelics}{' '}
          <span>
            ({run.health}/{run.maxHealth})
          </span>
        </button>
      </div>
    </section>
  );
}

function Encounter({ run, dispatch }: { run: Run; dispatch: (a: Action) => void }) {
  const t = useT();
  const node = nodeOf(run);
  const event = EVENTS[node.eventIndex];
  const shop = run.phase === 'shop';
  return (
    <section className="scene-board encounter-board">
      <Landscape chapter={realmOf(run)} />
      <div className="scene-content">
        {run.phase === 'event' && <SceneArt id={event.options[0].lore} />}
        <span className="scene-sigil">
          <Icon name={node.kind} size={34} />
        </span>
        <span className="eyebrow">
          {run.phase === 'event'
            ? event.eyebrow.toUpperCase()
            : shop
              ? t.app.shopEyebrow
              : t.app.campEyebrow}
        </span>
        <h2>{node.name}</h2>
        <p className="scene-lead">
          {run.phase === 'event' ? event.text : shop ? t.app.shopLead : t.app.campLead}
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
              {(run.shop ?? []).map((id) => (
                <button
                  className={`story-option shop-relic rarity-${RELICS[id].rarity}`}
                  key={id}
                  disabled={!canBuy(run, id)}
                  onClick={() => dispatch({ type: 'buy', item: id })}
                >
                  <RelicIcon id={id} size={34} />
                  <span>
                    <strong>{RELICS[id].name}</strong>
                    <small>
                      {t.app.relicInShop(t.app.rarity[RELICS[id].rarity])}
                      {RELICS[id].description}
                      <SetLine id={id} carried={run.relics} />
                    </small>
                  </span>
                  <span className="price">
                    {priceOf(run, id)}
                    <Icon name="coins" size={15} />
                  </span>
                </button>
              ))}
              {(
                [
                  {
                    item: 'flask',
                    title: t.app.flaskTitle,
                    description: t.app.flaskDesc,
                    icon: 'flask',
                  },
                  {
                    item: 'heal',
                    title: t.app.healTitle,
                    description: t.app.healDesc,
                    icon: 'heart',
                  },
                  {
                    item: 'forge',
                    title: t.app.forgeTitle,
                    description: t.app.forgeDesc,
                    icon: 'sword',
                  },
                ] as { item: ShopItem; title: string; description: string; icon: IconName }[]
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
                      {run.purchased.includes(o.item) ? t.app.alreadyBought : o.description}
                    </small>
                  </span>
                  <span className="price">
                    {run.purchased.includes(o.item) ? (
                      <Icon name="check" />
                    ) : (
                      <>
                        {priceOf(run, o.item)}
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
                  <strong>{t.app.restTitle}</strong>
                  <small>{t.app.restDesc(restAmount(run), run.health, run.maxHealth)}</small>
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
                  <strong>{t.app.bottleTitle}</strong>
                  <small>{t.app.bottleDesc(run.flasks)}</small>
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
                  <strong>{t.app.temperTitle}</strong>
                  <small>{t.app.temperDesc}</small>
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
              {shop ? t.app.continueBuying : t.app.continueResting} <Icon name="arrow" size={15} />
            </button>
            <p className="scene-hint">{shop ? t.app.shopHint(run.coins) : t.app.campHint}</p>
          </>
        )}
      </div>
    </section>
  );
}

function ShareRoad({ run }: { run: Run }) {
  const t = useT();
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(''), 5000);
    return () => clearTimeout(t);
  }, [note]);
  const url = `${location.origin}/?road=${run.seed.toString(36)}&keeper=${run.keeper}&dusk=${run.dusk ?? 0}`;
  return (
    <div className="share-road">
      <button
        className="secondary-button"
        onClick={() => {
          const write = navigator.clipboard?.writeText(url);
          if (!write) return setNote(t.app.copyUnavailable(url));
          write.then(
            () => setNote(t.app.linkCopied),
            () => setNote(t.app.copyUnavailable(url)),
          );
        }}
      >
        <Icon name="book" size={17} /> {t.app.copyLink}
      </button>
      <span className="scene-hint" role="status" aria-live="polite">
        {note}
      </span>
    </div>
  );
}

function Ending({
  run,
  dispatch,
  meta,
  earned,
  previousBest,
  onAgain,
  onRestart,
}: {
  run: Run;
  dispatch: (a: Action) => void;
  meta: Meta;
  earned: string[];
  previousBest: number;
  onAgain?: () => void;
  onRestart: () => void;
}) {
  const t = useT();
  const lost = run.phase === 'lost';
  const choosing = run.phase === 'ending';
  return (
    <section className="scene-board ending-board">
      <Landscape chapter={lost ? realmOf(run) : 2} />
      <div className="scene-content">
        {!choosing && <SceneArt id={lost ? 'fallen' : (run.ending ?? 'dawn')} />}
        <span className="scene-sigil">
          <Icon name={lost ? 'flame' : 'sun'} size={40} />
        </span>
        <span className="eyebrow">
          {lost
            ? t.app.endLost
            : choosing
              ? t.app.endChoosing
              : run.atlas
                ? t.app.endAtlas
                : run.daily
                  ? t.app.endDaily(run.daily)
                  : run.ruleset === 3
                    ? t.app.endNight(run.dusk ?? 0)
                    : run.ruleset === 2
                      ? t.app.endRekindled
                      : t.app.endFirst}
        </span>
        <h2>
          {lost
            ? t.app.endTitleLost
            : choosing
              ? t.app.endTitleChoosing
              : run.ending === 'dawn'
                ? t.app.endTitleDawn
                : t.app.endTitleHearth}
        </h2>
        <p className="scene-lead">
          {lost
            ? t.app.endLeadLost(CHAPTERS[realmOf(run)].name)
            : choosing
              ? t.app.endLeadChoosing
              : LORE.find((l) => l.id === run.ending)?.text}
        </p>
        {run.phase === 'won' && run.ruleset === 3 && pageFor(`${run.keeper}-${run.ending}`) && (
          <blockquote className="keeper-page">
            <p>{pageFor(`${run.keeper}-${run.ending}`)!.text}</p>
          </blockquote>
        )}
        {choosing ? (
          <div className="encounter-options">
            <button
              className="story-option"
              onClick={() => dispatch({ type: 'ending', choice: 'dawn' })}
            >
              <Icon name="sun" size={25} />
              <span>
                <strong>{t.app.shareSunrise}</strong>
                <small>{t.app.shareSunriseNote}</small>
              </span>
              <Icon name="arrow" />
            </button>
            <button
              className="story-option"
              onClick={() => dispatch({ type: 'ending', choice: 'hearth' })}
            >
              <Icon name="book" size={25} />
              <span>
                <strong>{t.app.bringStories}</strong>
                <small>{t.app.bringStoriesNote}</small>
              </span>
              <Icon name="arrow" />
            </button>
          </div>
        ) : (
          <>
            <div className="ending-stats">
              <div>
                <strong>{run.bells}/3</strong>
                <span>{t.app.bellsAwake}</span>
              </div>
              <div>
                <strong>{run.relics.length}</strong>
                <span>{t.app.relicsCarriedStat}</span>
              </div>
              <div>
                <strong>{encountersWon(run)}/12</strong>
                <span>{t.app.encountersWonStat}</span>
              </div>
            </div>
            <ScoreCard run={run} meta={meta} earned={earned} previousBest={previousBest} />
            <div className="ending-actions">
              {onAgain && (
                <button className="primary-button" onClick={onAgain}>
                  <Icon name="flame" size={17} />
                  {lost
                    ? t.app.tryAgain(KEEPERS[run.keeper].name)
                    : t.app.walkAgain(KEEPERS[run.keeper].name)}
                </button>
              )}
              <button
                className={onAgain ? 'secondary-button' : 'primary-button'}
                onClick={onRestart}
              >
                <Icon name="reset" size={17} /> {onAgain ? t.app.chooseAnother : t.app.walkAnother}
              </button>
            </div>
            {run.ruleset === 3 && !run.atlas && !run.daily && <ShareRoad run={run} />}
            <p className="scene-hint">{t.app.memoriesRemain}</p>
          </>
        )}
      </div>
    </section>
  );
}

function Help() {
  return (
    <div className="help-content">
      <p>
        You carry the last ember through three realms. Awaken their bells, discover why the sun went
        dark, and choose how the story ends. Nothing is rolled in secret: every number you see is
        the number that happens.
      </p>
      <div className="help-step">
        <span>01</span>
        <div>
          <h3>Read the road</h3>
          <p>
            Every realm is four crossings: a waylight guardian, two crossings arranged by your seed,
            then the bell guardian. Scout any node for free to see exactly what waits there. Before
            each guardian at least one sanctuary and one trader are within reach.
          </p>
        </div>
      </div>
      <div className="help-step">
        <span>02</span>
        <div>
          <h3>Read your enemy</h3>
          <p>
            You always act first, and the enemy’s next two intentions are shown. Under every action
            is its exact result this turn: damage dealt, damage taken, and whether it breaks poise
            or lands a perfect guard. Armor reduces every hit; multi-hit attacks lose armor from
            each hit.
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
          <b>Skill · Technique</b>
          <small>
            Spend focus on your
            <br />
            keeper’s two abilities.
          </small>
        </span>
        <span>
          <Icon name="flask" />
          <b>Flask</b>
          <small>
            Restore 16 health.
            <br />
            Lifts frost and weakness.
          </small>
        </span>
      </div>
      <div className="help-step">
        <span>03</span>
        <div>
          <h3>Break their poise</h3>
          <p>
            Every hit wears down the enemy’s <b>poise</b>. At zero it is <b>staggered</b>: it loses
            its next action, and your hits deal +50% until it acts again. Then it recovers, a little
            steadier than before. Time the break so it cancels the heavy blow, not a harmless turn.
          </p>
          <p>
            A <b>perfect guard</b> — absorbing an entire attack — turns the damage you blocked into
            poise damage. Guarding the big hit is also how you set up the break.
          </p>
        </div>
      </div>
      <p className="help-tip">
        <Icon name="info" /> <b>Poison</b> deals its stacks after your action, ignores guard, then
        fades by 1. <b>Fury</b> is added to every hit an enemy lands. <b>Frost</b> costs you its
        stacks each enemy turn, then melts by 1. <b>Weakened</b> hits deal 25% less. <b>Thorns</b>{' '}
        cost you health when you Strike; <b>plated</b> enemies shrug off small hits; <b>regrowth</b>{' '}
        heals them every turn. Guardians change their pattern below half health.
      </p>
      <div className="help-step">
        <span>04</span>
        <div>
          <h3>Know your keeper</h3>
          <p>
            <b>Warden:</b> Sundering blow (3 focus) hits for 2× attack + 3 and guards 5. Shield bash
            (2) hits for her Guard value and wears poise twice as fast.
            <br />
            <b>Seer:</b> starts with 1 extra focus and guards 4 more. Starfire (3) pierces guard and
            plating. Foresee (2) guards exactly the incoming blow: always perfect.
            <br />
            <b>Wayfarer:</b> Strike heals 2. Nightbloom (2) adds 5 poison. Quicken (2) makes the
            poison bite twice at once without fading.
          </p>
        </div>
      </div>
      <div className="help-step">
        <span>05</span>
        <div>
          <h3>Build something</h3>
          <p>
            After each victory take one of three relics, or recover 12 health. Elites and guardians
            offer rarer ones; traders sell three more. Free a waylight at the start of each realm
            for health, coins or focus on every later crossing, and learn one keeper lesson after
            each of the first two bells.
          </p>
        </div>
      </div>
      <div className="help-step">
        <span>06</span>
        <div>
          <h3>Come back to a harder night</h3>
          <p>
            Completing a road opens the next <b>Dusk</b> level for that keeper: listed hardships, a
            higher score. <b>Deeds</b> add new relics to the ones future roads can offer. Nothing
            ever raises a keeper’s starting strength; there are no timers and nothing to buy.
          </p>
        </div>
      </div>
      <div className="help-step">
        <span>✦</span>
        <div>
          <h3>The Lost Atlas</h3>
          <p>
            A second kind of expedition, drawn over real OpenStreetMap roads. Inside each realm the
            three encounters may be taken in any order; its bell guardian waits for all three, so
            plan a route that spends your lamp oil well. Each day your lamp oil carries you a fixed
            distance; then you make camp. Your camp is a hearth-wagon, a small town that travels
            with you: each evening either build one work onto it (a stove, a still, a toll-box…) or
            rest by its fire for 8 health — never both. Works and waylights pay at dawn, and every
            night the enemies ahead grow a little tougher. Choose a province on the map of the realm
            to decide where the veil falls; rekindle both of its hidden cities to recover its
            legend. Select a landmark to plan a route: the map shows its distance and walking time,
            and one button walks it. Small finds lie on some roads. If you recognize the real city,
            name it in the field journal for +2 attack. One guess per bell.
          </p>
        </div>
      </div>
      <div className="help-footer">
        <Icon name="check" size={16} /> Autosaved on this device after every move.
        <br />
        Keyboard: 1 Strike · 2 Guard · 3 Skill · 4 Technique · 5 Flask · Esc closes dialogs.
      </div>
    </div>
  );
}
