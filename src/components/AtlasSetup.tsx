import { bundledCount, type AtlasSource } from '../atlas/bundled';
import { SLOVAK_REGIONS } from '../atlas/regions';
import { Icon } from './Icon';
export function AtlasSetup({
  area,
  onArea,
  source,
  onSource,
  loading,
  error,
  onCancel,
}: {
  area: string;
  onArea: (v: string) => void;
  source: AtlasSource;
  onSource: (v: AtlasSource) => void;
  loading: boolean;
  error: string;
  onCancel: () => void;
}) {
  const offline = source === 'original';
  const count = bundledCount(area);
  return (
    <section className="atlas-setup" aria-label="Choose atlas geography">
      <span className="eyebrow">WHERE SHOULD THE VEIL FALL?</span>
      <h3>Somewhere you might remember.</h3>
      <p>
        Choose a country or administrative region. We’ll hide a city or town inside it. You still
        have to discover and name the city.
      </p>
      <div className="atlas-source-picker" role="group" aria-label="Atlas map source">
        <button
          aria-pressed={source === 'bundled'}
          disabled={loading}
          onClick={() => onSource('bundled')}
        >
          Bundled maps
        </button>
        <button
          aria-pressed={source === 'live'}
          disabled={loading}
          onClick={() => onSource('live')}
        >
          Live map
        </button>
        <button aria-pressed={offline} disabled={loading} onClick={() => onSource('original')}>
          Original offline chart
        </button>
      </div>
      {!offline && (
        <>
          <label htmlFor="atlas-region">Country or region</label>
          <input
            id="atlas-region"
            value={area}
            onChange={(e) => onArea(e.target.value)}
            maxLength={100}
            disabled={loading}
            placeholder="Slovakia, Bratislavský kraj, Austria…"
            list="atlas-regions"
            autoComplete="off"
          />
          <datalist id="atlas-regions">
            <option value="Slovakia" />
            {SLOVAK_REGIONS.map((r) => (
              <option key={r.code} value={r.name} />
            ))}
            <option value="Austria" />
            <option value="Germany" />
          </datalist>
          <details className="slovak-regions">
            <summary>Slovakia · choose one of the eight kraje</summary>
            <div>
              <button disabled={loading} onClick={() => onArea('Slovakia')}>
                All of Slovakia
              </button>
              {SLOVAK_REGIONS.map((r) => (
                <button key={r.code} disabled={loading} onClick={() => onArea(r.name)}>
                  {r.name}
                </button>
              ))}
            </div>
          </details>
          <p className={`bundled-availability ${!count ? 'unavailable' : ''}`} role="status">
            <Icon name={count ? 'check' : 'info'} size={16} />
            <span>
              {count
                ? `${count} bundled ${count === 1 ? 'chart' : 'charts'} in this area. ${source === 'live' ? 'Used automatically if the live provider fails.' : 'Ready to play without the map provider.'}`
                : 'No bundled charts here yet. Choose Slovakia or a kraj, or use Live map.'}
            </span>
          </p>
          <small>
            Accents are optional for Slovak names. Elsewhere, use a full local or English
            administrative name, or an ISO region code. Live maps need the provider; bundled maps
            ship with Emberwake. Both save the complete chart with your journey.
          </small>
        </>
      )}
      {loading && (
        <div className="atlas-loading" role="status">
          <Icon name="compass" />
          <span>
            Charting an unknown city inside {area}…
            <small>
              {source === 'bundled'
                ? 'Opening a chart from your collection.'
                : 'Finding the boundary, then tracing connected roads. This may take a minute.'}
            </small>
          </span>
          <button className="text-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}
      {error && (
        <p className="atlas-setup-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
export function RegionalAtlasPreview({ area }: { area: string }) {
  return (
    <section className="regional-atlas-preview">
      <span className="eyebrow">THE LOST ATLAS · YOUR CHOSEN REGION</span>
      <Icon name="compass" size={70} />
      <h2>A city without its name.</h2>
      <p>
        Somewhere inside <strong>{area.trim() || 'your chosen country or region'}</strong>, familiar
        roads lead to unfamiliar things.
      </p>
      <div className="veiled-city" aria-hidden="true">
        ✦ &nbsp; · &nbsp; ♜ &nbsp; · &nbsp; ✧
      </div>
      <p className="muted">
        The chart stays sealed until you begin. Follow the roads, uncover the land, and remember
        which city lies beneath the fantasy.{' '}
        {bundledCount(area) > 0 && `${bundledCount(area)} bundled charts are ready in this area.`}
      </p>
    </section>
  );
}
