import { useEffect, useId, useRef, useState } from 'react';
import {
  ATLAS_SITES,
  FINDS,
  atlasFinds,
  atlasRoute,
  roadCost,
  travels,
  atlasGeography,
  atlasSites,
  atlasSite,
  atlasObjective,
  atlasObjectives,
  encounterState,
  freeOrder,
  atlasNeighbours,
  bearing,
  charted,
  newAtlas,
  WORKS,
  REST_HEALING,
  worksOf,
  workBlocked,
  type WorkId,
  type Point,
} from '../game/atlas';
import {
  nextNodes,
  nodeOf,
  troveGuard,
  waylightFor,
  type Action,
  type Run,
  type MapNode,
} from '../game/engine';
import { SITE_ART, WORK_ART } from '../artwork';
import { omenOf, OMENS } from '../game/omens';
import { Modal } from './Modal';
import { SceneArt } from './Art';
import { provinceOfKraj } from '../atlas/provinces';
import { Icon, type IconName } from './Icon';
import { useLang, useT, type Dict } from '../i18n';

/** Distances the way a hiking map prints them. */
export const metres = (m: number, sep = '.') =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', sep)} km`;
/** Walking time at four kilometres an hour. */
export const walkingTime = (m: number) => {
  const minutes = Math.max(1, Math.round(m / (4000 / 60)));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

const line = (points: Point[]) => points.map((p) => p.join(',')).join(' ');
const glyph = (id: string) =>
  id.startsWith('bell')
    ? '♜'
    : id === 'origin'
      ? '♧'
      : id === 'haven'
        ? '❀'
        : id === 'cache'
          ? '◇'
          : id === 'spring'
            ? '♙'
            : id === 'lookout'
              ? '✧'
              : id === 'garden' || id === 'moths'
                ? '♧'
                : '⌂';

function WorkIcon({ id, size }: { id: WorkId; size: number }) {
  const art = WORK_ART[id];
  if (art) return <img src={art} alt="" width={size} height={size} />;
  const icon: Record<WorkId, IconName> = {
    stove: 'flame',
    still: 'flask',
    wheel: 'sword',
    rack: 'compass',
    strongbox: 'coins',
    ward: 'shield',
  };
  return <Icon name={icon[id]} size={size} />;
}

function WagonSummary({ run }: { run: Run }) {
  const t = useT().atlas;
  const built = worksOf(run.atlas);
  return (
    <div className="wagon-summary" role="group" aria-label={t.wagonGroup}>
      <strong>{t.wagonTitle}</strong>
      {built.length ? (
        <ul>
          {built.map((id) => (
            <li key={id} title={WORKS[id].effect}>
              <WorkIcon id={id} size={WORK_ART[id] ? 24 : 14} />
              {WORKS[id].name}
            </li>
          ))}
        </ul>
      ) : (
        <span>{t.wagonEmpty}</span>
      )}
    </div>
  );
}

/** What the next dawn brings if the keeper makes this choice tonight. */
function dawnPreview(run: Run, work: WorkId | null, t: Dict['atlas']) {
  const a = run.atlas!;
  const works = work ? [...worksOf(a), work] : worksOf(a);
  const count = (id: string) => run.waylights.filter((w) => w === id).length;
  const health = count('well') * 2 + (works.includes('stove') ? 4 : 0);
  const coins = count('kiln') * 4 + (works.includes('strongbox') ? 6 : 0);
  const flask = works.includes('still') && run.flasks < 2;
  const parts = [t.fullOil];
  if (coins) parts.push(t.dawnCoins(coins));
  if (health) parts.push(t.dawnHealth(health));
  if (flask) parts.push(t.dawnFlask);
  return { day: a.day! + 1, parts, ward: works.includes('ward') };
}

function EveningDialog({
  run,
  onClose,
  onChoose,
}: {
  run: Run;
  onClose: () => void;
  onChoose: (work: WorkId | null) => void;
}) {
  const t = useT().atlas;
  const [hover, setHover] = useState<WorkId | null>(null);
  const preview = dawnPreview(run, hover, t);
  const hint = (work: WorkId | null) => ({
    onMouseEnter: () => setHover(work),
    onFocus: () => setHover(work),
  });
  return (
    <Modal title={t.eveningTitle} onClose={onClose}>
      <div className="wagon-dialog">
        <SceneArt id="wagon" />
        <p>{t.eveningIntro}</p>
        <p className="wagon-purse">
          <Icon name="coins" size={14} /> {t.purse(run.coins)}
        </p>
        <div className="wagon-dawn" aria-live="polite">
          <b>{t.dawnLine(preview.day, preview.parts.join(' · '))}</b>
          <span>{t.darkGathers(preview.ward)}</span>
        </div>
        <div className="wagon-options">
          <button
            className="wagon-option"
            data-work="rest"
            onClick={() => onChoose(null)}
            {...hint(null)}
          >
            <Icon name="heart" size={22} />
            <span className="wagon-copy">
              <strong>{t.restFire}</strong>
              <span>{t.restFireDesc(REST_HEALING, run.health, run.maxHealth)}</span>
            </span>
          </button>
          {(Object.keys(WORKS) as WorkId[]).map((id) => {
            const work = WORKS[id];
            const blocked = workBlocked(run, id);
            return (
              <button
                key={id}
                className={`wagon-option ${blocked === 'Already built' ? 'is-built' : ''}`}
                data-work={id}
                disabled={!!blocked}
                onClick={() => onChoose(id)}
                {...hint(id)}
              >
                <WorkIcon id={id} size={WORK_ART[id] ? 52 : 22} />
                <span className="wagon-copy">
                  <strong>{work.name}</strong>
                  <span>{work.effect}</span>
                  <em>{work.flavor}</em>
                </span>
                <span className="wagon-cost">
                  {blocked === 'Already built' ? (
                    <>
                      <Icon name="check" size={14} /> {t.built}
                    </>
                  ) : (
                    <>
                      <Icon name="coins" size={14} /> {work.cost}
                      {blocked === 'Not enough coins' && <small>{t.notEnoughCoins}</small>}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

export function AtlasMap({
  run,
  dispatch,
  onInspect,
}: {
  run: Run | null;
  dispatch?: (a: Action) => void;
  onInspect?: (node: MapNode) => void;
}) {
  const t = useT().atlas;
  const sep = useT().decimalSep;
  const state = run?.atlas ?? newAtlas();
  const pack = atlasGeography(state);
  const sites = atlasSites(state);
  const current = atlasSite(state.position, state);
  const [selected, setSelected] = useState(state.position);
  const W = pack.width;
  const H = pack.height;
  const [view, setView] = useState(() => {
    const [x, y] = pack.points[state.position];
    const scale = 2;
    return {
      scale,
      cx: Math.min(W - W / scale / 2, Math.max(W / scale / 2, x)),
      cy: Math.min(H - H / scale / 2, Math.max(H / scale / 2, y)),
    };
  });
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const panned = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    view: typeof view;
    dragging: boolean;
  } | null>(null);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const clampView = (v: { cx: number; cy: number; scale: number }) => {
    const scale = Math.min(4, Math.max(1, v.scale));
    const w = W / scale;
    const h = H / scale;
    return {
      scale,
      cx: Math.min(W - w / 2, Math.max(w / 2, v.cx)),
      cy: Math.min(H - h / 2, Math.max(h / 2, v.cy)),
    };
  };
  /** Screen point to chart units under the current viewBox (honours letterboxing). */
  const toChart = (clientX: number, clientY: number, v = viewRef.current) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const w = W / v.scale;
    const h = H / v.scale;
    const k = Math.min(rect.width / w, rect.height / h) || 1;
    const ox = (rect.width - w * k) / 2;
    const oy = (rect.height - h * k) / 2;
    return {
      k,
      x: v.cx - w / 2 + (clientX - rect.left - ox) / k,
      y: v.cy - h / 2 + (clientY - rect.top - oy) / k,
    };
  };
  /** Zoom to `scale`, keeping the chart point under (clientX, clientY) fixed. */
  const zoomAt = (scale: number, clientX?: number, clientY?: number) => {
    const v = viewRef.current;
    const next = Math.min(4, Math.max(1, scale));
    if (clientX === undefined || clientY === undefined) {
      setView(clampView({ ...v, scale: next }));
    } else {
      const before = toChart(clientX, clientY, v);
      const rect = svgRef.current!.getBoundingClientRect();
      const w = W / next;
      const h = H / next;
      const k = Math.min(rect.width / w, rect.height / h) || 1;
      const ox = (rect.width - w * k) / 2;
      const oy = (rect.height - h * k) / 2;
      setView(
        clampView({
          scale: next,
          cx: before.x - (clientX - rect.left - ox) / k + w / 2,
          cy: before.y - (clientY - rect.top - oy) / k + h / 2,
        }),
      );
    }
    panned.current = true;
  };
  const centreOn = (id: string, scale?: number) => {
    const q = pack.points[id];
    setView(clampView({ cx: q[0], cy: q[1], scale: scale ?? viewRef.current.scale }));
  };
  useEffect(() => {
    // Wheel zoom: a native, non-passive listener so the page keeps scrolling unless the
    // map is focused (or Ctrl is held, as pinch-on-trackpad reports).
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && document.activeElement !== el) return;
      e.preventDefault();
      zoomAt(
        viewRef.current.scale * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)),
        e.clientX,
        e.clientY,
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        view: viewRef.current,
        dragging: false,
      };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: viewRef.current.scale };
      gesture.current = null;
    }
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      zoomAt(pinch.current.scale * (dist / pinch.current.dist), (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.dragging) {
      // Under 4 px it is still a click, so landmark selection keeps working.
      if (Math.hypot(dx, dy) < 4) return;
      g.dragging = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const k = toChart(0, 0, g.view).k;
    panned.current = true;
    setView(clampView({ ...g.view, cx: g.view.cx - dx / k, cy: g.view.cy - dy / k }));
  };
  const onPointerEnd = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (gesture.current?.id === e.pointerId) gesture.current = null;
  };
  const onMapKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.ctrlKey || e.metaKey || e.altKey) return;
    const v = viewRef.current;
    const step = W / v.scale / 5;
    const pan = (dx: number, dy: number) => {
      panned.current = true;
      setView(clampView({ ...v, cx: v.cx + dx, cy: v.cy + dy }));
    };
    const keys: Record<string, () => void> = {
      ArrowLeft: () => pan(-step, 0),
      ArrowRight: () => pan(step, 0),
      ArrowUp: () => pan(0, -step),
      ArrowDown: () => pan(0, step),
      '+': () => zoomAt(v.scale * 1.5),
      '=': () => zoomAt(v.scale * 1.5),
      '-': () => zoomAt(v.scale / 1.5),
      _: () => zoomAt(v.scale / 1.5),
      '0': () => {
        panned.current = true;
        setView({ cx: W / 2, cy: H / 2, scale: 1 });
      },
    };
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  };
  const compass = (b: string) => t.compass[b] ?? b;
  const [evening, setEvening] = useState(false);
  const [omenOpen, setOmenOpen] = useState(false);
  const uid = useId().replace(/:/g, '');
  useEffect(() => setSelected(state.position), [state.position]);
  const lastPosition = useRef(state.position);
  useEffect(() => {
    if (lastPosition.current === state.position) return;
    lastPosition.current = state.position;
    // Follow the keeper after a walk, unless the player has moved the map since the last one.
    if (!panned.current) centreOn(state.position);
    panned.current = false;
  });
  const site = atlasSite(selected, state);
  const p = pack.points[state.position];
  const neighbours = atlasNeighbours(state);
  const movable = !!run && run.phase === 'map';
  const next = run ? atlasObjective(run) : ATLAS_SITES[1];
  const canEnter = movable && nextNodes(run!).length > 0;
  const open = run ? atlasObjectives(run) : [];
  const anyOrder = run && freeOrder(state) && open.length > 1;
  const seen = sites.filter((s) => charted(state, s.id));
  const fogPoints = state.visited.map((id) => pack.points[id]);
  if (state.recognized) fogPoints.push(pack.points.haven);
  const guard = run ? troveGuard(run, current.id) : null;
  const canCollect =
    !guard &&
    ['cache', 'haven', 'spring'].includes(current.kind) &&
    !state.collected.includes(current.id);
  const selectedGuard = run && selected !== state.position ? troveGuard(run, selected) : null;
  const days = travels(state);
  const province = state.chart ? provinceOfKraj(state.chart.area) : undefined;
  const route = movable && selected !== state.position ? atlasRoute(state, selected) : null;
  const reach = days ? state.oil! : Infinity;
  // How much of the planned route today's oil covers.
  let affordable = 0;
  if (route) {
    let left = reach;
    for (const i of route.edges) {
      const cost = roadCost(run!, pack.edges[i].metres);
      if (cost > left) break;
      left -= cost;
      affordable++;
    }
  }
  const stranded = days && movable && neighbours.every((n) => roadCost(run!, n.metres) > reach);
  const finds = run && days ? atlasFinds(run.seed, state) : [];
  const pinArt = (s: (typeof sites)[number]) => {
    if (s.depth === undefined) return SITE_ART[s.kind === 'cache' ? 'chest' : s.kind];
    if (!run) return undefined;
    const node = nodeOf(run, s.depth, s.lane!);
    return SITE_ART[waylightFor(node) ?? node.kind];
  };
  const vw = W / view.scale;
  const vh = H / view.scale;
  const viewBox = `${view.cx - vw / 2} ${view.cy - vh / 2} ${vw} ${vh}`;
  return (
    <section className="atlas-board" aria-label="The Lost Atlas">
      <div className="atlas-heading">
        <div>
          <span className="eyebrow">{t.eyebrow}</span>
          <h2>
            {state.recognized
              ? t.beneathVeil(state.chart?.city ?? 'Monaco')
              : state.chart
                ? province
                  ? t.veiledCityOf(province.name)
                  : state.chart.title
                : t.saltbound}
          </h2>
          {state.chart && <span className="atlas-area-hint">{t.hiddenCity(state.chart.area)}</span>}
          <p>{run ? t.ledeRun : t.ledePreview}</p>
        </div>
        <span className="atlas-seal">
          <Icon name="compass" size={26} />
          <small>VEYR</small>
        </span>
      </div>
      {next && movable && (
        <p className="atlas-next">
          <Icon name="flag" size={15} />
          {canEnter
            ? anyOrder
              ? t.openHere(open.length - 1)
              : t.nextHere
            : anyOrder
              ? t.anyOrder(
                  open.length,
                  charted(state, next.id) ? next.name : t.echo,
                  compass(bearing(state.position, next.id, state)),
                )
              : t.nextIs(
                  charted(state, next.id) ? next.name : t.echo,
                  compass(bearing(state.position, next.id, state)),
                )}
        </p>
      )}
      {days && run && (
        <div
          className={`atlas-day ${stranded ? 'is-stranded' : ''} ${omenOf(run) ? 'has-omen' : ''}`}
        >
          <strong>{t.day(state.day ?? 0)}</strong>
          {omenOf(run) && (
            <button
              type="button"
              className="omen-chip"
              title={OMENS[omenOf(run)!].rule}
              aria-expanded={omenOpen}
              onClick={() => setOmenOpen((o) => !o)}
            >
              {OMENS[omenOf(run)!].name}
            </button>
          )}
          <div
            className="oil-meter"
            role="meter"
            aria-label={t.oilMeter}
            aria-valuemin={0}
            aria-valuemax={state.range}
            aria-valuenow={Math.min(state.oil!, state.range!)}
          >
            <i style={{ width: `${Math.min(100, (state.oil! / state.range!) * 100)}%` }} />
          </div>
          <span>
            {t.oilPre}
            <b>{metres(state.oil!, sep)}</b>
            {t.oilPost}
            {stranded && t.stranded}
          </span>
          <button
            className="secondary-button"
            data-action="camp"
            disabled={!movable}
            onClick={() => setEvening(true)}
            title={t.makeCampTitle}
          >
            {t.makeCamp}
          </button>
        </div>
      )}
      {days && run && omenOf(run) && omenOpen && (
        <p className="omen-line" role="status">
          <b>{OMENS[omenOf(run)!].name}.</b> {OMENS[omenOf(run)!].rule}{' '}
          <i>{OMENS[omenOf(run)!].flavor}</i>
        </p>
      )}
      {days && run && <WagonSummary run={run} />}
      {evening && run && dispatch && (
        <EveningDialog
          run={run}
          onClose={() => setEvening(false)}
          onChoose={(work) => {
            setEvening(false);
            dispatch(work ? { type: 'atlas-camp', work } : { type: 'atlas-camp' });
          }}
        />
      )}
      <div
        className="atlas-canvas atlas-pannable"
        ref={canvasRef}
        tabIndex={0}
        role="group"
        aria-label={t.canvasLabel}
        onKeyDown={onMapKey}
      >
        <svg
          ref={svgRef}
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          viewBox={viewBox}
          role="img"
          aria-label={t.chartLabel(seen.length, ATLAS_SITES.length, current.name)}
        >
          <defs>
            <pattern id={`${uid}sea`} width="26" height="26" patternUnits="userSpaceOnUse">
              <path
                d="M0 14 Q6 10 13 14 T26 14"
                fill="none"
                stroke="#658d88"
                strokeWidth=".7"
                opacity=".3"
              />
            </pattern>
            <pattern id={`${uid}trees`} width="17" height="20" patternUnits="userSpaceOnUse">
              <path d="M8 2l-5 11h10zM8 13v4" fill="#566b4e" stroke="#354f44" strokeWidth=".5" />
            </pattern>
            <pattern id={`${uid}paper`} width="50" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M1 4h2m15 13h1m24 26h2M7 38h1m24-30h1"
                stroke="#9f8358"
                strokeWidth="1"
                opacity=".3"
              />
            </pattern>
            <filter
              id={`${uid}soft`}
              filterUnits="userSpaceOnUse"
              x="-200"
              y="-200"
              width="1400"
              height="1210"
            >
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <mask
              id={`${uid}known`}
              maskUnits="userSpaceOnUse"
              x="-200"
              y="-200"
              width="1400"
              height="1210"
            >
              <rect x="-200" y="-200" width="1400" height="1210" fill="black" />
              <g fill="white" filter={`url(#${uid}soft)`}>
                {fogPoints.map((q, i) => (
                  <circle key={i} cx={q[0]} cy={q[1]} r="90" />
                ))}
                {state.roads.map((i) => (
                  <polyline
                    key={i}
                    points={line(pack.edges[i].points)}
                    fill="none"
                    stroke="white"
                    strokeWidth="170"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
              </g>
            </mask>
            <radialGradient id={`${uid}fog`}>
              <stop stopColor="#213737" />
              <stop offset="1" stopColor="#0b1a20" />
            </radialGradient>
            <radialGradient id={`${uid}halo`}>
              <stop stopColor="#ffdfa2" stopOpacity=".6" />
              <stop offset="1" stopColor="#e2b874" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1000" height="810" fill={`url(#${uid}fog)`} />
          <g className="fog-decoration" fill="none" stroke="#456260" strokeWidth=".8" opacity=".22">
            {[140, 260, 380].map((r) => (
              <circle key={r} cx="500" cy="405" r={r} />
            ))}
            <path d="M500 0v810M0 405h1000M0 0l1000 810M0 810L1000 0" />
          </g>
          <g mask={`url(#${uid}known)`}>
            <rect width="1000" height="810" fill="#315956" />
            <rect width="1000" height="810" fill={`url(#${uid}sea)`} />
            {(pack.lands ?? [pack.land]).map((land, i) => (
              <g key={i}>
                <polygon
                  points={line(land)}
                  fill="#bcb18c"
                  stroke="#e6d1a3"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <polygon points={line(land)} fill={`url(#${uid}paper)`} />
              </g>
            ))}
            {pack.features.map((f) =>
              ['road', 'river', 'coast'].includes(f.kind) ? (
                <polyline
                  key={f.id}
                  points={line(f.points)}
                  fill="none"
                  stroke={f.kind === 'road' ? '#766f56' : '#315956'}
                  strokeWidth={f.kind === 'river' ? 7 : f.kind === 'coast' ? 3 : 1.7}
                  opacity=".5"
                />
              ) : (
                <polygon
                  key={f.id}
                  points={line(f.points)}
                  fill={
                    f.kind === 'grove'
                      ? `url(#${uid}trees)`
                      : f.kind === 'water'
                        ? '#315956'
                        : '#8b876a'
                  }
                  stroke={f.kind === 'grove' ? '#65734f' : '#79765f'}
                  strokeWidth=".6"
                  opacity={f.kind === 'grove' || f.kind === 'water' ? '.9' : '.45'}
                />
              ),
            )}
            {pack.edges.map((e, i) =>
              state.roads.includes(i) ? (
                // A walked road carries a trail blaze: white, colour, white.
                <g key={i} fill="none" strokeLinejoin="round" strokeLinecap="round">
                  <polyline points={line(e.points)} stroke="#fbf3dc" strokeWidth="5.4" />
                  <polyline points={line(e.points)} stroke="#b4432c" strokeWidth="1.9" />
                </g>
              ) : (
                <polyline
                  key={i}
                  points={line(e.points)}
                  fill="none"
                  stroke="#6e603e"
                  strokeWidth="2"
                  strokeDasharray="3 5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity=".8"
                />
              ),
            )}
            {route?.edges.map((i, n) => (
              <polyline
                key={`route${i}`}
                className="atlas-route"
                points={line(pack.edges[i].points)}
                fill="none"
                stroke={n < affordable ? '#ffd27a' : '#e9e2c9'}
                strokeWidth="7"
                strokeDasharray={n < affordable ? undefined : '2 9'}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity=".75"
              />
            ))}
            {finds
              .filter((f) => !state.finds!.includes(f.edge))
              .map((f) => (
                <g key={f.edge} className="atlas-find">
                  <title>{`${FINDS[f.kind].name}: ${FINDS[f.kind].text}`}</title>
                  <path
                    d={`M${f.point[0]} ${f.point[1] - 9}l8 9-8 9-8-9z`}
                    fill="#f6d58e"
                    stroke="#5d4521"
                    strokeWidth="1.6"
                  />
                </g>
              ))}
          </g>
          <g
            fill="#bbbdac"
            fontFamily="Georgia,serif"
            fontSize="18"
            letterSpacing="5"
            opacity=".5"
            aria-hidden="true"
          >
            <text x="550" y="705">
              {state.chart ? t.unwrittenWorld : t.namelessSea}
            </text>
          </g>
          {seen.map((s) => {
            const q = pack.points[s.id],
              active = selected === s.id,
              done = !!run && encounterState(run, s) === 'done';
            return (
              <g
                key={s.id}
                aria-hidden="true"
                className="atlas-landmark"
                onClick={() => setSelected(s.id)}
              >
                {active && <circle cx={q[0]} cy={q[1]} r="31" fill={`url(#${uid}halo)`} />}
                {run && run.phase === 'map' && encounterState(run, s) === 'open' && (
                  <circle
                    className="atlas-open-ring"
                    cx={q[0]}
                    cy={q[1]}
                    r={s.id.startsWith('bell') ? 23 : 19}
                    fill="none"
                    stroke="#ffd27a"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                  />
                )}
                <circle
                  cx={q[0]}
                  cy={q[1]}
                  r={s.id.startsWith('bell') ? 16 : 12}
                  fill={done ? '#4c6654' : '#1a3434'}
                  stroke={active ? '#ffe3ac' : '#cfb37a'}
                  strokeWidth="2"
                />
                {pinArt(s) && !done ? (
                  <image href={pinArt(s)} x={q[0] - 15} y={q[1] - 15} width="30" height="30" />
                ) : (
                  <text x={q[0]} y={q[1] + 5} textAnchor="middle" fill="#f9dfaa" fontSize="18">
                    {done ? '✓' : glyph(s.id)}
                  </text>
                )}
              </g>
            );
          })}
          <g aria-hidden="true" pointerEvents="none">
            <circle cx={p[0]} cy={p[1]} r="29" fill={`url(#${uid}halo)`} />
            {run && SITE_ART[`keeper-${run.keeper}`] ? (
              <image
                href={SITE_ART[`keeper-${run.keeper}`]}
                x={p[0] - 17}
                y={p[1] - 50}
                width="34"
                height="34"
              />
            ) : (
              <path
                d={`M${p[0]} ${p[1] - 30}l8 13-8 6-8-6z`}
                fill="#ffe4a2"
                stroke="#654e32"
                strokeWidth="1.5"
              />
            )}
          </g>
        </svg>
        <span className="atlas-north" aria-label={t.northIsUp}>
          N<br />↑
        </span>
        <span
          className="atlas-scale"
          style={{
            width: `${(500 / (state.chart?.metresPerPixel ?? 3.52) / vw) * 100}%`,
          }}
          aria-label={t.scaleLabel}
        >
          500 m
        </span>
        <div className="atlas-tools">
          <button
            onClick={() => zoomAt(view.scale * 1.5)}
            aria-label={t.zoomIn}
            disabled={view.scale >= 4}
          >
            +
          </button>
          <button
            onClick={() => zoomAt(view.scale / 1.5)}
            aria-label={t.zoomOut}
            disabled={view.scale <= 1}
          >
            −
          </button>
          <button
            onClick={() => {
              panned.current = false;
              centreOn(state.position);
            }}
            aria-label={t.centreLabel}
          >
            <Icon name="compass" size={16} />
            {t.centreText}
          </button>
          <button
            onClick={() => {
              panned.current = true;
              setView({ cx: W / 2, cy: H / 2, scale: 1 });
            }}
            aria-label={t.wholeLabel}
          >
            <Icon name="eye" size={16} />
            {t.wholeText}
          </button>
        </div>
        <span className="atlas-discovery">
          {t.landmarksCharted(seen.length, ATLAS_SITES.length)}
        </span>
      </div>
      <div className="atlas-attribution">
        <span>
          {t.geography}{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            {t.osmContributors}
          </a>{' '}
          ·{' '}
          <a href="/atlas/NOTICE.md" target="_blank" rel="noreferrer">
            {t.dataSource}
          </a>
          {state.chart?.source.provider === 'OpenStreetMap / Geofabrik' && (
            <span className="atlas-source-note">{t.bundledNote}</span>
          )}
          {state.chart && (
            <button
              className="atlas-data-download"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify({ ...pack, city: undefined, aliases: undefined })], {
                    type: 'application/json',
                  }),
                );
                const link = document.createElement('a');
                link.href = url;
                link.download = 'emberwake-geography.json';
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              {t.downloadData}
            </button>
          )}
        </span>
        <span>
          ✦ {t.legendKeeper} &nbsp; ◇ {t.legendLandmark} &nbsp; ♜ {t.legendBell}
        </span>
      </div>
      {!run ? (
        <div className="atlas-preview-note">
          <Icon name="flame" />
          <p>{t.previewNote}</p>
        </div>
      ) : (
        <>
          <div className="atlas-location" aria-live="polite">
            <div>
              <span className="eyebrow">
                {selected === state.position ? t.youAreHere : t.charted}
              </span>
              <h3>{site.name}</h3>
              <p>{site.subtitle}</p>
            </div>
            <div className="atlas-location-actions">
              {route && (
                <button
                  className="primary-button"
                  data-action="walk-route"
                  disabled={affordable === 0}
                  onClick={() => dispatch?.({ type: 'atlas-walk', to: selected })}
                >
                  {affordable === route.edges.length
                    ? t.walkRoute
                    : affordable === 0
                      ? t.outOfOil
                      : t.walkAsFar}{' '}
                  <Icon name="arrow" size={15} />
                </button>
              )}
              {selected === state.position && canEnter && (
                <button
                  className="primary-button"
                  onClick={() => dispatch?.({ type: 'travel', lane: current.lane! })}
                >
                  {t.enterEncounter} <Icon name="arrow" size={15} />
                </button>
              )}
              {site.depth !== undefined && onInspect && (
                <button
                  className="text-button"
                  onClick={() => onInspect(nodeOf(run, site.depth!, site.lane!))}
                >
                  {t.scoutEncounter}
                </button>
              )}
              {selected === state.position && guard && (
                <>
                  <button
                    className="primary-button"
                    data-action="challenge"
                    disabled={!movable}
                    onClick={() => dispatch?.({ type: 'atlas-challenge' })}
                  >
                    {t.challenge} <Icon name="swords" size={15} />
                  </button>
                  {onInspect && (
                    <button className="text-button" onClick={() => onInspect(guard)}>
                      {t.scoutGuardian}
                    </button>
                  )}
                </>
              )}
              {selectedGuard && onInspect && (
                <button className="text-button" onClick={() => onInspect(selectedGuard)}>
                  {t.scoutGuardian}
                </button>
              )}
              {selected === state.position && canCollect && (
                <button
                  className="secondary-button"
                  disabled={!movable || (current.kind === 'spring' && run.flasks >= 5)}
                  onClick={() => dispatch?.({ type: 'atlas-collect' })}
                >
                  {current.kind === 'spring' && run.flasks >= 5 ? t.flasksFull : t.gather}
                </button>
              )}
              {selected === state.position && state.collected.includes(current.id) && (
                <span className="atlas-status">{t.gathered}</span>
              )}
            </div>
            {route && (
              <p className="atlas-plan">
                <Icon name="compass" size={15} />
                <span>
                  <b>{metres(route.metres, sep)}</b> · {t.about(walkingTime(route.metres))} ·{' '}
                  {t.roadCount(route.edges.length)}
                  {days && (affordable === route.edges.length ? t.withinOil : t.beyondOil)}
                </span>
              </p>
            )}
            {movable && selected !== state.position && !route && (
              <p className="atlas-plan">
                <Icon name="compass" size={15} />
                <span>{t.noRoad}</span>
              </p>
            )}
            {(guard || selectedGuard) && (
              <p className="atlas-plan">
                <Icon name="swords" size={15} />
                <span>
                  {t.guardedBy}
                  <b>{(guard ?? selectedGuard)!.name}</b>
                  {t.guardedNote}
                </span>
              </p>
            )}
            {selected === state.position && encounterState(run, current) === 'sealed' && (
              <p className="atlas-ward">
                {current.depth! % 4 === 3 && Math.floor(current.depth! / 4) === run.bells
                  ? t.wardGuardian
                  : t.wardBell}
              </p>
            )}
          </div>
          {movable && (
            <div className="atlas-roads">
              <span className="eyebrow">{t.roadsFrom(current.name)}</span>
              <div>
                {neighbours.map((n) => (
                  <button
                    data-destination={n.id}
                    key={n.id}
                    disabled={roadCost(run!, n.metres) > reach}
                    onClick={() => dispatch?.({ type: 'atlas-move', to: n.id })}
                  >
                    <Icon name="compass" size={17} />
                    <span>
                      <strong>
                        {charted(state, n.id) ? atlasSite(n.id, state).name : t.beyondVeil}
                      </strong>
                      <small>
                        {compass(bearing(state.position, n.id, state))} · {metres(n.metres, sep)} ·{' '}
                        {walkingTime(n.metres)}
                        {roadCost(run!, n.metres) > reach
                          ? t.needsDay
                          : state.roads.includes(n.index)
                            ? t.walked
                            : ''}
                      </small>
                    </span>
                    <Icon name="arrow" size={15} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {!movable && (
            <p className="atlas-ward">
              {run.phase === 'won' || run.phase === 'lost' ? t.ended : t.resolve}
            </p>
          )}
          <details className="atlas-index">
            <summary>{t.indexSummary}</summary>
            <div>
              {seen.map((s) => (
                <button
                  className={selected === s.id ? 'selected' : ''}
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                >
                  {glyph(s.id)} {s.name}
                  {state.visited.includes(s.id) ? ' ✓' : ''}
                </button>
              ))}
            </div>
          </details>
        </>
      )}
    </section>
  );
}

export function AtlasJournal({ run, dispatch }: { run: Run; dispatch: (a: Action) => void }) {
  const t = useT().atlas;
  const lang = useLang();
  const a = run.atlas!;
  const [name, setName] = useState('');
  const canGuess =
    run.phase === 'map' && !a.recognized && !a.attempts.some((g) => g.bell === run.bells);
  const [expanded, setExpanded] = useState(false);
  const clues = a.visited.map((id) => atlasSite(id, a));
  return (
    <section className="atlas-journal">
      <span className="eyebrow">{t.journalEyebrow}</span>
      <h3>{t.journalTitle}</h3>
      <p>
        {a.chart ? t.roadsSurvivedChart : t.roadsSurvivedCoast} {t.exploreRing}
      </p>
      <div className="atlas-journal-stats">
        <span>
          <b>{a.steps}</b> {t.roadsWalkedTail(a.steps)}
        </span>
        {a.day !== undefined && (
          <span>
            <b>{a.day}</b> {t.daysTail(a.day)}
          </span>
        )}
        <span>
          <b>{run.bells}/3</b> {t.bellsAwakeTail}
        </span>
      </div>
      <p className="atlas-journal-latest" role="status">
        {run.log.at(-1)}
      </p>
      <button
        className="text-button"
        onClick={() => setExpanded((x) => !x)}
        aria-expanded={expanded}
      >
        {expanded ? t.foldClues : t.readNotes(clues.length)} <Icon name="book" size={14} />
      </button>
      {expanded && (
        <ol className="atlas-clues">
          {clues.map((s) => (
            <li key={s.id}>
              <strong>{s.name}</strong>
              <p>{s.clue}</p>
            </li>
          ))}
        </ol>
      )}
      {a.recognized ? (
        <div className="atlas-recognized">
          <Icon name="sparkles" size={23} />
          <h4>{t.remembers(a.chart?.city ?? 'Monaco')}</h4>
          <p>{t.recognizedText}</p>
          <a
            href={
              a.chart
                ? `https://www.openstreetmap.org/#map=14/${a.chart.centre[1]}/${a.chart.centre[0]}`
                : 'https://www.openstreetmap.org/#map=14/43.737/7.425'
            }
            target="_blank"
            rel="noreferrer"
          >
            {t.compare}
          </a>
          <a
            href={
              a.chart
                ? `https://mapy.com/${lang}/turisticka?x=${a.chart.centre[0]}&y=${a.chart.centre[1]}&z=14`
                : `https://mapy.com/${lang}/turisticka?x=7.425&y=43.737&z=14`
            }
            target="_blank"
            rel="noreferrer"
          >
            {t.openMapy}
          </a>
        </div>
      ) : (
        <form
          className="atlas-guess"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({ type: 'atlas-name', name });
            setName('');
          }}
        >
          <label htmlFor="atlas-place">{a.chart ? t.guessChart : t.guessCoast}</label>
          <p>{t.guessIntro}</p>
          <input
            id="atlas-place"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.guessPlaceholder}
            disabled={!canGuess}
          />
          <button className="secondary-button" disabled={!canGuess || !name.trim()}>
            {t.remember}
          </button>
          <small>
            {run.phase === 'won' || run.phase === 'lost'
              ? t.guessEnded
              : canGuess
                ? t.guessOne
                : run.phase !== 'map'
                  ? t.guessFinish
                  : t.guessRing}
          </small>
        </form>
      )}
    </section>
  );
}
