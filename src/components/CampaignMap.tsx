import { PROVINCE_ART } from '../artwork';
import { useId } from 'react';
import { useT } from '../i18n';
import type { Meta } from '../game/meta';
import {
  campaignMap,
  campaignProgress,
  type ProvinceCode,
  type ProvinceProgress,
} from '../atlas/provinces';

/** Per-province nudges (map units) so neighbouring labels do not collide. */
const LABEL_OFFSET: Record<ProvinceCode, [number, number]> = {
  'SK-BL': [48, 34],
  'SK-TA': [-2, -34],
  'SK-TC': [-30, -20],
  'SK-NI': [4, -4],
  'SK-ZI': [6, 26],
  'SK-BC': [14, 8],
  'SK-PV': [10, 24],
  'SK-KI': [-34, 14],
};

/** Break a province name onto two lines of similar length, without its leading article. */
function nameLines(name: string): string[] {
  const words = name.replace(/^The /, '').toUpperCase().split(' ');
  if (words.length < 2) return words;
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

const FONT = 21;

function markerStates(p: ProvinceProgress): ('open' | 'walked' | 'done')[] {
  const states: ('open' | 'walked' | 'done')[] = [];
  for (let i = 0; i < p.total; i++)
    states.push(i < p.completed ? 'done' : i < p.walked ? 'walked' : 'open');
  return states;
}

export function CampaignMap({
  cities,
  selected,
  onSelect,
}: {
  cities: Meta['cities'];
  selected?: ProvinceCode | null;
  onSelect?: (code: ProvinceCode | null) => void;
}) {
  const t = useT();
  const STATE_LABEL = {
    open: t.campaign.notWalked,
    walked: t.campaign.walked,
    done: t.campaign.rekindled,
  } as const;
  const clipId = useId().replace(/:/g, '');
  const progress = campaignProgress(cities);
  const rekindled = progress.reduce((n, p) => n + p.completed, 0);
  const totalCities = progress.reduce((n, p) => n + p.total, 0);
  const current = progress.find((p) => p.province.code === selected);
  const choose = (code: ProvinceCode) => onSelect?.(selected === code ? null : code);
  const outline = campaignMap.outline.map(([x, y]) => `${x},${y}`).join(' ');
  const named = campaignMap.cities.filter((c) => cities[c.key]?.name);
  return (
    <div className={`campaign-map ${selected ? 'has-selection' : ''}`}>
      <svg
        className="campaign-svg"
        viewBox={`0 0 ${campaignMap.width} ${campaignMap.height}`}
        role="img"
        aria-label={t.campaign.mapLabel(rekindled, totalCities)}
      >
        <defs>
          <clipPath id={clipId}>
            <polygon points={outline} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {progress.map(({ province }) => (
            <g
              key={province.code}
              aria-hidden="true"
              className={`campaign-province ${selected === province.code ? 'is-selected' : ''}`}
              onClick={onSelect ? () => choose(province.code) : undefined}
            >
              {campaignMap.cells
                .filter((c) => c.region === province.code)
                .map((c) => (
                  <polygon
                    key={c.id}
                    points={c.points.map(([x, y]) => `${x},${y}`).join(' ')}
                    fill={province.tint}
                    stroke={province.tint}
                    strokeWidth={1.5}
                  />
                ))}
            </g>
          ))}
        </g>
        <polygon className="campaign-outline" points={outline} fill="none" />
        {selected && (
          <g clipPath={`url(#${clipId})`} aria-hidden="true" pointerEvents="none">
            {campaignMap.cells
              .filter((c) => c.region === selected)
              .map((c) => (
                <polygon
                  key={c.id}
                  className="campaign-selected-edge"
                  points={c.points.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill="none"
                />
              ))}
          </g>
        )}
        {progress.map((p) => {
          const cs = campaignMap.cities.filter((c) => c.region === p.province.code);
          const mx = cs.reduce((n, c) => n + c.x, 0) / cs.length;
          const my = cs.reduce((n, c) => n + c.y, 0) / cs.length;
          const [dx, dy] = LABEL_OFFSET[p.province.code];
          const x = mx + dx;
          const y = my + dy;
          const states = markerStates(p);
          const lines = nameLines(p.province.name);
          const markY = y + (lines.length - 1) * FONT * 1.05 + 20;
          return (
            <g
              key={p.province.code}
              className="campaign-label-group"
              pointerEvents="none"
              aria-hidden="true"
            >
              <text className="campaign-label" textAnchor="middle" fontSize={FONT}>
                {lines.map((line, i) => (
                  <tspan key={line} x={x} y={y + i * FONT * 1.05}>
                    {line}
                  </tspan>
                ))}
              </text>
              {states.map((s, i) => (
                <circle
                  key={i}
                  className={`campaign-marker is-${s}`}
                  cx={x + (i - (states.length - 1) / 2) * 22}
                  cy={markY}
                  r={7}
                >
                  <title>{STATE_LABEL[s]}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {named.map((c) => (
          <g key={c.key} className="campaign-named" pointerEvents="none">
            <path
              className="campaign-star"
              d={`M${c.x},${c.y - 7} L${c.x + 2},${c.y - 2} L${c.x + 7},${c.y - 2} L${c.x + 3},${c.y + 1.5} L${c.x + 4.5},${c.y + 7} L${c.x},${c.y + 3.5} L${c.x - 4.5},${c.y + 7} L${c.x - 3},${c.y + 1.5} L${c.x - 7},${c.y - 2} L${c.x - 2},${c.y - 2} Z`}
            />
            <text className="campaign-city" x={c.x} y={c.y + 24} textAnchor="middle" fontSize={18}>
              {cities[c.key].name}
            </text>
          </g>
        ))}
      </svg>
      {onSelect && (
        <ul className="campaign-buttons">
          {progress.map((p) => (
            <li key={p.province.code}>
              <button
                type="button"
                data-province={p.province.code}
                aria-pressed={selected === p.province.code}
                onClick={() => choose(p.province.code)}
                style={{ ['--tint' as string]: p.province.tint }}
              >
                <b>{p.province.name}</b>
                <span>{t.campaign.buttonLine(p.province.kraj, p.completed, p.total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="campaign-detail" aria-live="polite">
        {current ? (
          <>
            {PROVINCE_ART[current.province.code] && (
              <img
                className="province-crest"
                src={PROVINCE_ART[current.province.code]}
                width={64}
                height={64}
                alt=""
              />
            )}
            <h3>{current.province.name}</h3>
            <span className="eyebrow">{current.province.kraj}</span>
            <p className="campaign-counts">
              {t.campaign.counts(current.total, current.walked, current.completed, current.named)}
            </p>
            {current.recovered ? (
              <p>{current.province.legend}</p>
            ) : (
              <p>
                {current.province.rumor}
                {t.campaign.rumorTail}
              </p>
            )}
          </>
        ) : (
          <p className="muted">{t.campaign.choose}</p>
        )}
      </div>
    </div>
  );
}
