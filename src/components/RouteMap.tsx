import { CHAPTERS, NODE_LABELS, WAYLIGHTS } from '../game/data';
import { nextNodes, nodeAt, waylightFor, type MapNode, type Run } from '../game/engine';
import { Landscape } from './Art';
import { Icon } from './Icon';

export function RouteMap({
  run,
  onInspect,
}: {
  run: Run | null;
  onInspect: (node: MapNode) => void;
}) {
  const chapter = run ? Math.floor(Math.min(11, run.depth + 1) / 4) : 0;
  const start = chapter * 4;
  const available = run ? nextNodes(run) : [];
  const seed = run?.seed ?? 18293;
  const xs = [23, 50, 77];
  const ys = [79, 59, 39, 19];
  return (
    <section className={`route-board chapter-${chapter}`} aria-label="Expedition route">
      <Landscape chapter={chapter} />
      <div className="board-shade" />
      <div className="board-top">
        <div>
          <span className="eyebrow">CHAPTER {['I', 'II', 'III'][chapter]} / III</span>
          <h2>{CHAPTERS[chapter].name}</h2>
          <p>{CHAPTERS[chapter].subtitle}</p>
        </div>
        <span className="map-coordinate">
          VEYR · {['N 48° 12′', 'N 51° 08′', 'N 58° 33′'][chapter]}
        </span>
      </div>
      <div className="route-network">
        <svg
          className="route-lines"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {[0, 1, 2].flatMap((row) =>
            [0, 1, 2].flatMap((from) =>
              (row === 2 ? [1] : [0, 1, 2])
                .filter((to) => Math.abs(from - to) <= 1)
                .map((to) => {
                  const visited =
                    run?.path.includes(`${start + row}-${from}`) &&
                    run?.path.includes(`${start + row + 1}-${to}`);
                  return (
                    <path
                      key={`${row}-${from}-${to}`}
                      d={`M${xs[from]} ${ys[row]} C${xs[from]} ${ys[row] - 10} ${xs[to]} ${ys[row + 1] + 10} ${xs[to]} ${ys[row + 1]}`}
                      className={visited ? 'walked' : ''}
                    />
                  );
                }),
            ),
          )}
          <path d="M50 98V89" className="origin-line" />
        </svg>
        {[0, 1, 2, 3].flatMap((row) =>
          (row === 3 ? [1] : [0, 1, 2]).map((lane) => {
            const node = nodeAt(seed, start + row, lane);
            const visited = run?.path.includes(node.id);
            const enabled = available.some((n) => n.id === node.id);
            const site = (run?.ruleset ?? 2) === 2 ? waylightFor(node) : null;
            return (
              <div
                className={`map-stop ${enabled ? 'available' : ''} ${visited ? 'visited' : ''} ${node.kind === 'boss' ? 'guardian-stop' : ''}`}
                key={node.id}
                style={{ left: `${xs[lane]}%`, top: `${ys[row]}%` }}
              >
                <button
                  className={`map-node node-${node.kind}`}
                  aria-label={`Scout ${NODE_LABELS[node.kind]}: ${node.name}${site ? ` · ${WAYLIGHTS[site].name}` : ''}`}
                  onClick={() => onInspect(node)}
                  title={`Scout ${node.name}`}
                >
                  <Icon
                    name={visited ? 'check' : node.kind}
                    size={node.kind === 'boss' ? 24 : 20}
                  />
                </button>
                <span>
                  {node.kind === 'boss'
                    ? node.name
                    : site
                      ? WAYLIGHTS[site].name
                      : NODE_LABELS[node.kind]}
                </span>
              </div>
            );
          }),
        )}
        <div className="map-origin">
          <Icon name="flame" size={17} />
          <span>{chapter === 0 ? 'CINDERFALL' : 'THE ROAD CONTINUES'}</span>
        </div>
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-dot" />{' '}
          {run ? 'Scout any node · travel glowing paths' : 'Click a node to scout the road'}
        </span>
        <span>
          <Icon name="compass" size={14} /> A road worth remembering
        </span>
      </div>
    </section>
  );
}
