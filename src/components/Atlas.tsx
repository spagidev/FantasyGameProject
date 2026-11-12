import { useEffect, useId, useState } from 'react';
import {
  ATLAS_SITES,
  atlasGeography,
  atlasSites,
  atlasSite,
  atlasObjective,
  atlasNeighbours,
  bearing,
  charted,
  newAtlas,
  type Point,
} from '../game/atlas';
import { nodeAt, type Action, type Run, type MapNode } from '../game/engine';
import { Icon } from './Icon';

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
  const [zoom, setZoom] = useState(true);
  const uid = useId().replace(/:/g, '');
  useEffect(() => setSelected(state.position), [state.position]);
  const site = atlasSite(selected, state);
  const p = pack.points[state.position];
  const neighbours = atlasNeighbours(state);
  const movable = !!run && run.phase === 'map';
  const next = run ? atlasObjective(run) : ATLAS_SITES[1];
  const canEnter = movable && current.depth === run!.depth + 1;
  const seen = sites.filter((s) => charted(state, s.id));
  const fogPoints = state.visited.map((id) => pack.points[id]);
  if (state.recognized) fogPoints.push(pack.points.haven);
  const canCollect =
    ['cache', 'haven', 'spring'].includes(current.kind) && !state.collected.includes(current.id);
  const viewBox = zoom
    ? `${Math.max(0, Math.min(500, p[0] - 250))} ${Math.max(0, Math.min(405, p[1] - 202.5))} 500 405`
    : '0 0 1000 810';
  return (
    <section className="atlas-board" aria-label="The Lost Atlas">
      <div className="atlas-heading">
        <div>
          <span className="eyebrow">THE LOST ATLAS · CHART I</span>
          <h2>
            {state.recognized
              ? `${state.chart?.city ?? 'Monaco'}, beneath the veil`
              : (state.chart?.title ?? 'The Saltbound Coast')}
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
            'Your next encounter is here.'
          ) : (
            <>
              Next: {charted(state, next.id) ? next.name : 'an echo in the mist'} ·{' '}
              {bearing(state.position, next.id, state)}. Walk the connected roads to reach it.
            </>
          )}
        </p>
      )}
      <div className={`atlas-canvas ${zoom ? 'atlas-zoomed' : ''}`}>
        <svg
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
            {pack.edges.map((e, i) => (
              <polyline
                key={i}
                points={line(e.points)}
                fill="none"
                stroke={state.roads.includes(i) ? '#f8e3ad' : '#6e603e'}
                strokeWidth={state.roads.includes(i) ? 3.4 : 2}
                strokeDasharray={state.roads.includes(i) ? undefined : '3 5'}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity=".8"
              />
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
              done = s.depth !== undefined && run && s.depth <= run.depth;
            return (
              <g
                key={s.id}
                aria-hidden="true"
                className="atlas-landmark"
                onClick={() => setSelected(s.id)}
              >
                {active && <circle cx={q[0]} cy={q[1]} r="31" fill={`url(#${uid}halo)`} />}
                <circle
                  cx={q[0]}
                  cy={q[1]}
                  r={s.id.startsWith('bell') ? 16 : 12}
                  fill={done ? '#4c6654' : '#1a3434'}
                  stroke={active ? '#ffe3ac' : '#cfb37a'}
                  strokeWidth="2"
                />
                <text x={q[0]} y={q[1] + 5} textAnchor="middle" fill="#f9dfaa" fontSize="18">
                  {done ? '✓' : glyph(s.id)}
                </text>
              </g>
            );
          })}
          <g aria-hidden="true" pointerEvents="none">
            <circle cx={p[0]} cy={p[1]} r="29" fill={`url(#${uid}halo)`} />
            <path
              d={`M${p[0]} ${p[1] - 30}l8 13-8 6-8-6z`}
              fill="#ffe4a2"
              stroke="#654e32"
              strokeWidth="1.5"
            />
          </g>
        </svg>
        <span className="atlas-north" aria-label="North is up">
          N<br />↑
        </span>
        <span
          className="atlas-scale"
          style={{
            width: `${(500 / (state.chart?.metresPerPixel ?? 3.52) / (zoom ? 500 : 1000)) * 100}%`,
          }}
          aria-label="Map scale: approximately 500 paces"
        >
          500 paces
        </span>
        <div className="atlas-tools">
          <button
            onClick={() => setZoom((z) => !z)}
            aria-pressed={zoom}
            aria-label={zoom ? 'Show whole chart' : 'Zoom to keeper'}
          >
            <Icon name="eye" size={16} />
            {zoom ? 'Whole chart' : 'Closer'}
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
              {selected !== state.position && neighbours.some((n) => n.id === selected) && (
                <button
                  className="secondary-button"
                  disabled={!movable}
                  onClick={() => dispatch?.({ type: 'atlas-move', to: selected })}
                >
                  Walk here <Icon name="arrow" size={15} />
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
                  onClick={() => onInspect(nodeAt(run.seed, site.depth!, site.lane!))}
                >
                  Scout encounter
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
            {selected === state.position &&
              current.depth !== undefined &&
              current.depth > run.depth + 1 && (
                <p className="atlas-ward">
                  A bell ward seals this place. Resolve the next encounter first.
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
                    onClick={() => dispatch?.({ type: 'atlas-move', to: n.id })}
                  >
                    <Icon name="compass" size={17} />
                    <span>
                      <strong>
                        {charted(state, n.id) ? atlasSite(n.id, state).name : 'Beyond the veil'}
                      </strong>
                      <small>
                        {bearing(state.position, n.id, state)} · {n.metres} paces
                        {state.visited.includes(n.id) ? ' · walked' : ''}
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
        Roads and shorelines survived. Their names did not. Explore, prepare, and ring the three
        bells.
      </p>
      <div className="atlas-journal-stats">
        <span>
          <b>{a.steps}</b> roads walked
        </span>
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
