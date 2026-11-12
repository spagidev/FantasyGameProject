import { SLOVAK_REGIONS } from '../atlas/regions';
import { Icon } from './Icon';
export function AtlasSetup({
  area,
  onArea,
  offline,
  onOffline,
  loading,
  error,
  onCancel,
}: {
  area: string;
  onArea: (v: string) => void;
  offline: boolean;
  onOffline: (v: boolean) => void;
  loading: boolean;
  error: string;
  onCancel: () => void;
}) {
  return (
    <section className="atlas-setup" aria-label="Choose atlas geography">
      <span className="eyebrow">WHERE SHOULD THE VEIL FALL?</span>
      <h3>Somewhere you might remember.</h3>
      <p>
        Choose a country or administrative region. We’ll hide a city or town inside it. You still
        have to discover and name the city.
      </p>
      <div className="atlas-source-picker" role="group" aria-label="Atlas map source">
        <button aria-pressed={!offline} disabled={loading} onClick={() => onOffline(false)}>
          Country or region
        </button>
        <button aria-pressed={offline} disabled={loading} onClick={() => onOffline(true)}>
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
          <small>
            Accents are optional for Slovak names. Elsewhere, use a full local or English
            administrative name, or an ISO region code. Map preparation needs internet; exploration
            then uses your saved chart.
          </small>
        </>
      )}
      {loading && (
        <div className="atlas-loading" role="status">
          <Icon name="compass" />
          <span>
            Charting an unknown city inside {area}…
            <small>
              Finding the boundary, then tracing connected roads. This may take a minute.
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
        which city lies beneath the fantasy.
      </p>
    </section>
  );
}
