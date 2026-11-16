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

/** Distances the way a hiking map prints them. */
export const metres = (m: number) =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
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
  const built = worksOf(run.atlas);
  return (
    <div className="wagon-summary" role="group" aria-label="Hearth-wagon works">
      <strong>The hearth-wagon</strong>
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
        <span>Nothing built yet — make camp to build</span>
      )}
    </div>
  );
}

/** What the next dawn brings if the keeper makes this choice tonight. */
function dawnPreview(run: Run, work: WorkId | null) {
  const a = run.atlas!;
  const works = work ? [...worksOf(a), work] : worksOf(a);
  const count = (id: string) => run.waylights.filter((w) => w === id).length;
  const health = count('well') * 2 + (works.includes('stove') ? 4 : 0);
  const coins = count('kiln') * 4 + (works.includes('strongbox') ? 6 : 0);
  const flask = works.includes('still') && run.flasks < 2;
  const parts = ['full lamp oil'];
  if (coins) parts.push(`+${coins} coins`);
  if (health) parts.push(`+${health} health`);
  if (flask) parts.push('+1 flask');
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
  const [hover, setHover] = useState<WorkId | null>(null);
  const preview = dawnPreview(run, hover);
  const hint = (work: WorkId | null) => ({
    onMouseEnter: () => setHover(work),
    onFocus: () => setHover(work),
  });
  return (
    <Modal title="Evening at the wagon" onClose={onClose}>
      <div className="wagon-dialog">
        <SceneArt id="wagon" />
        <p>
          Each evening the keeper may build one work onto the hearth-wagon or rest by its fire,
          never both.
        </p>
        <p className="wagon-purse">
          <Icon name="coins" size={14} /> You carry {run.coins} coins
        </p>
        <div className="wagon-dawn" aria-live="polite">
          <b>
            Day {preview.day} dawns: {preview.parts.join(' · ')}
          </b>
          <span>
            The dark gathers: enemies ahead gain 2% health{' '}
            {preview.ward ? 'every second night' : 'each night'}
          </span>
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
              <strong>Rest by the fire</strong>
              <span>
                Restore {REST_HEALING} health ({run.health}/{run.maxHealth} now)
              </span>
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
                      <Icon name="check" size={14} /> Built
                    </>
                  ) : (
                    <>
                      <Icon name="coins" size={14} /> {work.cost}
                      {blocked === 'Not enough coins' && <small>Not enough coins</small>}
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
          <span className="eyebrow">THE LOST ATLAS · CHART I</span>
          <h2>
            {state.recognized
              ? `${state.chart?.city ?? 'Monaco'}, beneath the veil`
              : state.chart
                ? province
                  ? `A veiled city of ${province.name}`
                  : state.chart.title
                : 'The Saltbound Coast'}
          </h2>
          {state.chart && <span className="atlas-area-hint">Hidden city · {state.chart.area}</span>}
          <p>
            {run
              ? 'The world has forgotten its name. Its shape remembers.'
              : 'Real geography. Forgotten names. A world to uncover.'}
          </p>
        </div>
        <span className="atlas-seal">
          <Icon name="compass" size={26} />
          <small>VEYR</small>
        </span>
      </div>
      {next && movable && (
        <p className="atlas-next">
          <Icon name="flag" size={15} />
          {canEnter ? (
            anyOrder ? (
              `An open encounter is here. ${open.length - 1} more ${open.length === 2 ? 'waits' : 'wait'} in this realm, in any order.`
            ) : (
              'Your next encounter is here.'
            )
          ) : anyOrder ? (
            <>
              {open.length} encounters are open in this realm: take them in any order; the bell
              guardian waits for all three. Nearest:{' '}
              {charted(state, next.id) ? next.name : 'an echo in the mist'} ·{' '}
              {bearing(state.position, next.id, state)}.
            </>
          ) : (
            <>
              Next: {charted(state, next.id) ? next.name : 'an echo in the mist'} ·{' '}
              {bearing(state.position, next.id, state)}. Walk the connected roads to reach it.
            </>
          )}
        </p>
      )}
      {days && run && (
        <div
          className={`atlas-day ${stranded ? 'is-stranded' : ''} ${omenOf(run) ? 'has-omen' : ''}`}
        >
          <strong>Day {state.day}</strong>
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
            aria-label="Lamp oil left today"
            aria-valuemin={0}
            aria-valuemax={state.range}
            aria-valuenow={Math.min(state.oil!, state.range!)}
          >
            <i style={{ width: `${Math.min(100, (state.oil! / state.range!) * 100)}%` }} />
          </div>
          <span>
            Lamp oil for <b>{metres(state.oil!)}</b> more today
            {stranded && ' · not enough for any road from here'}
          </span>
          <button
            className="secondary-button"
            data-action="camp"
            disabled={!movable}
            onClick={() => setEvening(true)}
            title="Start a new day with full oil. Waylights pay at dawn; the dark gathers a little."
          >
            Make camp
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
        aria-label="Pannable chart. Drag or use the arrow keys to pan, plus and minus to zoom, 0 for the whole chart."
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
          aria-label={`Fantasy chart of real terrain. ${seen.length} of ${ATLAS_SITES.length} landmarks charted. You are at ${current.name}.`}
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
              {state.chart ? 'THE UNWRITTEN WORLD' : 'THE NAMELESS SEA'}
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
        <span className="atlas-north" aria-label="North is up">
          N<br />↑
        </span>
        <span
          className="atlas-scale"
          style={{
            width: `${(500 / (state.chart?.metresPerPixel ?? 3.52) / vw) * 100}%`,
          }}
          aria-label="Map scale: 500 metres"
        >
          500 m
        </span>
        <div className="atlas-tools">
          <button
            onClick={() => zoomAt(view.scale * 1.5)}
            aria-label="Zoom in"
            disabled={view.scale >= 4}
          >
            +
          </button>
          <button
            onClick={() => zoomAt(view.scale / 1.5)}
            aria-label="Zoom out"
            disabled={view.scale <= 1}
          >
            −
          </button>
          <button
            onClick={() => {
              panned.current = false;
              centreOn(state.position);
            }}
            aria-label="Centre on keeper"
          >
            <Icon name="compass" size={16} />
            Keeper
          </button>
          <button
            onClick={() => {
              panned.current = true;
              setView({ cx: W / 2, cy: H / 2, scale: 1 });
            }}
            aria-label="Show whole chart"
          >
            <Icon name="eye" size={16} />
            Whole chart
          </button>
        </div>
        <span className="atlas-discovery">
          {seen.length}/{ATLAS_SITES.length} landmarks charted
        </span>
      </div>
      <div className="atlas-attribution">
        <span>
          Geography ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap contributors
          </a>{' '}
          ·{' '}
          <a href="/atlas/NOTICE.md" target="_blank" rel="noreferrer">
            ODbL · data & source
          </a>
          {state.chart?.source.provider === 'OpenStreetMap / Geofabrik' && (
            <span className="atlas-source-note">
              {' '}
              · Bundled roads · historical snapshot (2022 or earlier)
            </span>
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
              Download this map’s data
            </button>
          )}
        </span>
        <span>✦ Keeper &nbsp; ◇ Landmark &nbsp; ♜ Bell</span>
      </div>
      {!run ? (
        <div className="atlas-preview-note">
          <Icon name="flame" />
          <p>
            Choose a keeper and begin. Follow real roads through the veil, ring three bells, and
            discover which place the world has forgotten.
          </p>
        </div>
      ) : (
        <>
          <div className="atlas-location" aria-live="polite">
            <div>
              <span className="eyebrow">
                {selected === state.position ? 'YOU ARE HERE' : 'CHARTED LANDMARK'}
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
                    ? 'Walk this route'
                    : affordable === 0
                      ? 'Out of oil for today'
                      : 'Walk as far as the oil lasts'}{' '}
                  <Icon name="arrow" size={15} />
                </button>
              )}
              {selected === state.position && canEnter && (
                <button
                  className="primary-button"
                  onClick={() => dispatch?.({ type: 'travel', lane: current.lane! })}
                >
                  Enter encounter <Icon name="arrow" size={15} />
                </button>
              )}
              {site.depth !== undefined && onInspect && (
                <button
                  className="text-button"
                  onClick={() => onInspect(nodeOf(run, site.depth!, site.lane!))}
                >
                  Scout encounter
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
                    Challenge the guardian <Icon name="swords" size={15} />
                  </button>
                  {onInspect && (
                    <button className="text-button" onClick={() => onInspect(guard)}>
                      Scout the guardian
                    </button>
                  )}
                </>
              )}
              {selectedGuard && onInspect && (
                <button className="text-button" onClick={() => onInspect(selectedGuard)}>
                  Scout the guardian
                </button>
              )}
              {selected === state.position && canCollect && (
                <button
                  className="secondary-button"
                  disabled={!movable || (current.kind === 'spring' && run.flasks >= 5)}
                  onClick={() => dispatch?.({ type: 'atlas-collect' })}
                >
                  {current.kind === 'spring' && run.flasks >= 5
                    ? 'Flasks full · return later'
                    : 'Gather this kindness'}
                </button>
              )}
              {selected === state.position && state.collected.includes(current.id) && (
                <span className="atlas-status">This kindness is already gathered.</span>
              )}
            </div>
            {route && (
              <p className="atlas-plan">
                <Icon name="compass" size={15} />
                <span>
                  <b>{metres(route.metres)}</b> · about {walkingTime(route.metres)} on foot ·{' '}
                  {route.edges.length} {route.edges.length === 1 ? 'road' : 'roads'}
                  {days &&
                    (affordable === route.edges.length
                      ? ' · within today’s oil'
                      : ' · farther than today’s oil: camp on the way')}
                </span>
              </p>
            )}
            {movable && selected !== state.position && !route && (
              <p className="atlas-plan">
                <Icon name="compass" size={15} />
                <span>No charted road leads there yet. Walk into the veil to find one.</span>
              </p>
            )}
            {(guard || selectedGuard) && (
              <p className="atlas-plan">
                <Icon name="swords" size={15} />
                <span>
                  Guarded by <b>{(guard ?? selectedGuard)!.name}</b>. Optional: win the fight to
                  claim this trove and choose from three rare relics. The road does not advance, and
                  a trove left for a later realm is guarded by something stronger.
                </span>
              </p>
            )}
            {selected === state.position && encounterState(run, current) === 'sealed' && (
              <p className="atlas-ward">
                {current.depth! % 4 === 3 && Math.floor(current.depth! / 4) === run.bells
                  ? 'The bell guardian waits until the other three encounters of this realm are done.'
                  : 'A bell ward seals this place. Ring this realm’s bell first.'}
              </p>
            )}
          </div>
          {movable && (
            <div className="atlas-roads">
              <span className="eyebrow">ROADS FROM {current.name.toUpperCase()}</span>
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
                        {charted(state, n.id) ? atlasSite(n.id, state).name : 'Beyond the veil'}
                      </strong>
                      <small>
                        {bearing(state.position, n.id, state)} · {metres(n.metres)} ·{' '}
                        {walkingTime(n.metres)}
                        {roadCost(run!, n.metres) > reach
                          ? ' · needs a new day'
                          : state.roads.includes(n.index)
                            ? ' · walked'
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
              {run.phase === 'won' || run.phase === 'lost'
                ? 'This expedition has ended. Its chart remains in your journal.'
                : 'Resolve the encounter to walk the roads again.'}
            </p>
          )}
          <details className="atlas-index">
            <summary>Charted landmarks · select to inspect</summary>
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
  const a = run.atlas!;
  const [name, setName] = useState('');
  const canGuess =
    run.phase === 'map' && !a.recognized && !a.attempts.some((g) => g.bell === run.bells);
  const [expanded, setExpanded] = useState(false);
  const clues = a.visited.map((id) => atlasSite(id, a));
  return (
    <section className="atlas-journal">
      <span className="eyebrow">A GEOGRAPHY OF MEMORY</span>
      <h3>The field journal</h3>
      <p>
        {a.chart
          ? 'The roads survived. Their names did not.'
          : 'Roads and shorelines survived. Their names did not.'}{' '}
        Explore, prepare, and ring the three bells.
      </p>
      <div className="atlas-journal-stats">
        <span>
          <b>{a.steps}</b> roads walked
        </span>
        {a.day !== undefined && (
          <span>
            <b>{a.day}</b> {a.day === 1 ? 'day' : 'days'}
          </span>
        )}
        <span>
          <b>{run.bells}/3</b> bells awake
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
        {expanded
          ? 'Fold the clues'
          : `Read ${clues.length} field ${clues.length === 1 ? 'note' : 'notes'}`}{' '}
        <Icon name="book" size={14} />
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
          <h4>{a.chart?.city ?? 'Monaco'} remembers.</h4>
          <p>
            Your blade gained 2 attack. The Rose Hearth is charted; walk there to gather its
            kindness.
          </p>
          <a
            href={
              a.chart
                ? `https://www.openstreetmap.org/#map=14/${a.chart.centre[1]}/${a.chart.centre[0]}`
                : 'https://www.openstreetmap.org/#map=14/43.737/7.425'
            }
            target="_blank"
            rel="noreferrer"
          >
            Compare with the waking world ↗
          </a>
          <a
            href={
              a.chart
                ? `https://mapy.com/en/turisticka?x=${a.chart.centre[0]}&y=${a.chart.centre[1]}&z=14`
                : 'https://mapy.com/en/turisticka?x=7.425&y=43.737&z=14'
            }
            target="_blank"
            rel="noreferrer"
          >
            Open the hiking map on Mapy.com ↗
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
          <label htmlFor="atlas-place">
            {a.chart ? 'Which city lies beneath the veil?' : 'Does this coast feel familiar?'}
          </label>
          <p>
            Name the city for +2 attack and the location of a hidden hearth. A country or region is
            not the answer. Recognition is optional.
          </p>
          <input
            id="atlas-place"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="The place beneath the fantasy…"
            disabled={!canGuess}
          />
          <button className="secondary-button" disabled={!canGuess || !name.trim()}>
            Remember its name
          </button>
          <small>
            {run.phase === 'won' || run.phase === 'lost'
              ? 'This expedition has ended. Name the city on another journey.'
              : canGuess
                ? 'One attempt per bell stage. No penalty for a wrong name.'
                : run.phase !== 'map'
                  ? 'Finish this encounter before naming the land.'
                  : 'Ring another bell for another attempt.'}
          </small>
        </form>
      )}
    </section>
  );
}
