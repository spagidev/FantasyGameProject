import { bundledCount, type AtlasSource } from '../atlas/bundled';
import { SLOVAK_REGIONS } from '../atlas/regions';
import type { Meta } from '../game/meta';
import { provinceOfKraj, PROVINCES } from '../atlas/provinces';
import { CampaignMap } from './CampaignMap';
import { useT } from '../i18n';
import { Icon } from './Icon';
export function AtlasSetup({
  area,
  onArea,
  source,
  onSource,
  loading,
  error,
  onCancel,
  meta,
}: {
  /** Records, for the campaign map: which charts are walked, rekindled and named. */
  meta?: Meta;
  area: string;
  onArea: (v: string) => void;
  source: AtlasSource;
  onSource: (v: AtlasSource) => void;
  loading: boolean;
  error: string;
  onCancel: () => void;
}) {
  const t = useT();
  const s = t.setup;
  const offline = source === 'original';
  const count = bundledCount(area);
  const bundled = source === 'bundled';
  return (
    <section className="atlas-setup" aria-label={s.geoLabel}>
      <span className="eyebrow">{s.eyebrow}</span>
      <h3>{s.title}</h3>
      <p>{s.intro}</p>
      <div className="atlas-source-picker" role="group" aria-label={s.sourceLabel}>
        <button
          aria-pressed={source === 'bundled'}
          disabled={loading}
          onClick={() => onSource('bundled')}
        >
          {s.bundled}
        </button>
        <button
          aria-pressed={source === 'live'}
          disabled={loading}
          onClick={() => onSource('live')}
        >
          {s.live}
        </button>
        <button aria-pressed={offline} disabled={loading} onClick={() => onSource('original')}>
          {s.original}
        </button>
      </div>
      {bundled && (
        <>
          <CampaignMap
            cities={meta?.cities ?? {}}
            selected={provinceOfKraj(area)?.code ?? null}
            onSelect={(code) =>
              onArea(
                code ? (PROVINCES.find((p) => p.code === code)?.kraj ?? 'Slovakia') : 'Slovakia',
              )
            }
          />
          <p className="campaign-note">{s.campaignNote}</p>
        </>
      )}
      {!offline && (
        <>
          <label htmlFor="atlas-region">{s.regionLabel}</label>
          <input
            id="atlas-region"
            value={area}
            onChange={(e) => onArea(e.target.value)}
            maxLength={100}
            disabled={loading}
            placeholder={s.regionPlaceholder}
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
          {!bundled && (
            <details className="slovak-regions">
              <summary>{s.krajSummary}</summary>
              <div>
                <button disabled={loading} onClick={() => onArea('Slovakia')}>
                  {s.allSlovakia}
                </button>
                {SLOVAK_REGIONS.map((r) => (
                  <button key={r.code} disabled={loading} onClick={() => onArea(r.name)}>
                    {r.name}
                  </button>
                ))}
              </div>
            </details>
          )}
          <p className={`bundled-availability ${!count ? 'unavailable' : ''}`} role="status">
            <Icon name={count ? 'check' : 'info'} size={16} />
            <span>{count ? s.chartsHere(count, source === 'live') : s.noneHere}</span>
          </p>
          <small>{s.accents}</small>
        </>
      )}
      {loading && (
        <div className="atlas-loading" role="status">
          <Icon name="compass" />
          <span>
            {s.charting(area)}
            <small>{source === 'bundled' ? s.openingChart : s.tracing}</small>
          </span>
          <button className="text-button" onClick={onCancel}>
            {t.common.cancel}
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
  const s = useT().setup;
  return (
    <section className="regional-atlas-preview">
      <span className="eyebrow">{s.previewEyebrow}</span>
      <Icon name="compass" size={70} />
      <h2>{s.previewTitle}</h2>
      <p>
        {s.somewhereInside}
        <strong>{area.trim() || s.yourRegion}</strong>
        {s.familiarRoads}
      </p>
      <div className="veiled-city" aria-hidden="true">
        ✦ &nbsp; · &nbsp; ♜ &nbsp; · &nbsp; ✧
      </div>
      <p className="muted">
        {s.sealed} {bundledCount(area) > 0 && s.chartsReady(bundledCount(area))}
      </p>
    </section>
  );
}
