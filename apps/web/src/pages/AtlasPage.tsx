import { DIM_META, DIMS, exclusionReason, GENRE_LABEL, GENRES, type Dim, type MovieSummary } from '@moodreel/core';
import { useMemo, useState, type CSSProperties } from 'react';
import { CommunityPulse } from '../components/CommunityPulse';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { hash } from '../lib/format';
import { Link, openFilm } from '../router';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import './AtlasPage.css';

export function AtlasPage() {
  const { catalog } = useApi();
  return (
    <div className="page atlas">
      <header className="page-head">
        <p className="kicker">Atlas</p>
        <h1>
          The catalog, <em>mapped by feeling</em>
        </h1>
        <p className="page-head__lead">
          Every film in MoodReel is scored on ten mood dimensions. Put any two of them on the axes and see where the films land, then check how each genre feels on average.
        </p>
      </header>
      <Scatter catalog={catalog} />
      <GenreHeatmap catalog={catalog} />
      <Decades catalog={catalog} />
      <CommunityPulse refreshKey={0} onOpen={openFilm} />
    </div>
  );
}

/* ── Scatter ──────────────────────────────────────────────────────────── */

const PAD = { l: 52, r: 16, t: 16, b: 52 };

function Scatter({ catalog }: { catalog: MovieSummary[] }) {
  const { rulesQuery } = useStore();
  // A squarer plot on phones keeps dots and labels legible instead of shrinking a wide chart.
  const narrow = useMediaQuery('(max-width: 640px)');
  const W = narrow ? 460 : 1000;
  const H = narrow ? 440 : 500;
  const sx = (v: number) => PAD.l + (v / 10) * (W - PAD.l - PAD.r);
  const sy = (v: number) => H - PAD.b - (v / 10) * (H - PAD.t - PAD.b);
  const [x, setX] = useState<Dim>('fear');
  const [y, setY] = useState<Dim>('mindbend');
  const [hover, setHover] = useState<string | null>(null);
  const rules = useMemo(() => ({ ...rulesQuery, exclude: [] }), [rulesQuery]);
  const hasRules = Object.keys(rules.dealbreakers).length > 0;

  const points = useMemo(
    () =>
      catalog.map((m) => {
        // A small, stable jitter so films with identical scores do not hide each other.
        const h = hash(m.id);
        const jx = ((h % 100) / 100 - 0.5) * 0.3;
        const jy = (((h >>> 8) % 100) / 100 - 0.5) * 0.3;
        return { m, px: sx(clamp(m.profile[x] + jx)), py: sy(clamp(m.profile[y] + jy)), out: hasRules && Boolean(exclusionReason(m, rules)) };
      }),
    [catalog, x, y, rules, hasRules, narrow],
  );
  const active = points.find((p) => p.m.id === hover) ?? null;
  const passing = points.filter((p) => !p.out).length;

  return (
    <section className="section atlas__card" aria-labelledby="scatter-title">
      <div className="section__head">
        <div>
          <h2 id="scatter-title">Mood map</h2>
          <p>Each dot is a film. Hover to identify it, click to open it.</p>
        </div>
        <div className="atlas__axes">
          <DimSelect label="Across" value={x} onChange={setX} />
          <DimSelect label="Up" value={y} onChange={setY} />
        </div>
      </div>
      <div className="atlas__legend" aria-hidden={!hasRules}>
        {hasRules ? (
          <>
            <span>
              <i className="atlas__key atlas__key--in" /> Passes your house rules ({passing})
            </span>
            <span>
              <i className="atlas__key atlas__key--out" /> Hidden by your rules ({points.length - passing})
            </span>
          </>
        ) : (
          <span>All {points.length} films. Switch on house rules to see which ones they hide.</span>
        )}
      </div>
      <figure className="scatter">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Films plotted by ${DIM_META[x].label} (across) and ${DIM_META[y].label} (up)`} onPointerLeave={() => setHover(null)}>
          {[0, 2, 4, 6, 8, 10].map((t) => (
            <g key={t} className="scatter__grid">
              <line x1={sx(t)} x2={sx(t)} y1={PAD.t} y2={H - PAD.b} />
              <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} />
              <text x={sx(t)} y={H - PAD.b + 18} textAnchor="middle">
                {t}
              </text>
              <text x={PAD.l - 10} y={sy(t) + 4} textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          <text className="scatter__axis" x={W - PAD.r} y={H - 6} textAnchor="end">
            {DIM_META[x].label} → {DIM_META[x].high}
          </text>
          <text className="scatter__axis" x={12} y={PAD.t + 4} transform={`rotate(-90 12 ${PAD.t + 4})`} textAnchor="end">
            {DIM_META[y].label} → {DIM_META[y].high}
          </text>
          {points
            .slice()
            .sort((a, b) => Number(b.out) - Number(a.out))
            .map((p) => (
              <g key={p.m.id} className={`scatter__pt ${p.out ? 'is-out' : ''} ${hover === p.m.id ? 'is-hover' : ''}`} onPointerEnter={() => setHover(p.m.id)} onClick={() => openFilm(p.m.id)}>
                <circle className="scatter__hit" cx={p.px} cy={p.py} r={11} />
                <circle className="scatter__dot" cx={p.px} cy={p.py} r={hover === p.m.id ? 7 : 5} />
              </g>
            ))}
        </svg>
        {active && (
          <div
            className={`scatter__tip ${active.px > W * 0.62 ? 'is-left' : ''}`}
            style={{ left: `${(active.px / W) * 100}%`, top: `${(active.py / H) * 100}%` } as CSSProperties}
            role="status"
          >
            <b>{active.m.title}</b>
            <span className="mono">{active.m.year}</span>
            <span>
              {DIM_META[x].label} <b className="mono">{active.m.profile[x]}</b> · {DIM_META[y].label} <b className="mono">{active.m.profile[y]}</b>
            </span>
            {active.out && <span className="scatter__tip-out">hidden by your rules</span>}
          </div>
        )}
      </figure>
    </section>
  );
}

function DimSelect({ label, value, onChange }: { label: string; value: Dim; onChange: (d: Dim) => void }) {
  return (
    <label className="fselect">
      <span className="fselect__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as Dim)}>
        {DIMS.map((d) => (
          <option key={d} value={d}>
            {DIM_META[d].label}
          </option>
        ))}
      </select>
    </label>
  );
}

const clamp = (v: number) => Math.min(10, Math.max(0, v));

/* ── Genre × mood heatmap ─────────────────────────────────────────────── */

function GenreHeatmap({ catalog }: { catalog: MovieSummary[] }) {
  const rows = useMemo(
    () =>
      GENRES.map((g) => {
        const films = catalog.filter((m) => m.genres.includes(g));
        const avg = Object.fromEntries(DIMS.map((d) => [d, films.length ? films.reduce((s, m) => s + m.profile[d], 0) / films.length : 0])) as Record<Dim, number>;
        return { g, n: films.length, avg };
      }).filter((r) => r.n > 0),
    [catalog],
  );
  return (
    <section className="section atlas__card" aria-labelledby="heat-title">
      <div className="section__head">
        <div>
          <h2 id="heat-title">How each genre feels</h2>
          <p>Average score per genre on every dimension, 0 to 10. The deeper the pink, the stronger the feeling.</p>
        </div>
        <div className="heat__scale" aria-hidden="true">
          <span>0</span>
          <i />
          <span>10</span>
        </div>
      </div>
      <div className="heat__wrap">
        <table className="heat">
          <thead>
            <tr>
              <th scope="col">Genre</th>
              {DIMS.map((d) => (
                <th key={d} scope="col">
                  {DIM_META[d].short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ g, n, avg }) => (
              <tr key={g}>
                <th scope="row">
                  {GENRE_LABEL[g]} <span className="mono">{n}</span>
                </th>
                {DIMS.map((d) => (
                  <td key={d} style={{ '--v': avg[d] / 10 } as CSSProperties} className={avg[d] >= 6 ? 'is-strong' : ''} title={`${GENRE_LABEL[g]} · ${DIM_META[d].label}: ${avg[d].toFixed(1)}`}>
                    {avg[d].toFixed(1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── Films per decade ─────────────────────────────────────────────────── */

function Decades({ catalog }: { catalog: MovieSummary[] }) {
  const bars = useMemo(() => {
    const counts = new Map<number, number>();
    for (const m of catalog) {
      const d = Math.floor(m.year / 10) * 10;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0] - b[0]);
  }, [catalog]);
  const max = Math.max(...bars.map(([, n]) => n));
  return (
    <section className="section atlas__card" aria-labelledby="decades-title">
      <div className="section__head">
        <div>
          <h2 id="decades-title">Films per decade</h2>
          <p>From Hitchcock to last year. Tap a decade to browse it.</p>
        </div>
      </div>
      <ol className="decades">
        {bars.map(([decade, n]) => (
          <li key={decade}>
            <Link to={`/browse?decade=${decade}`} className="decades__bar" title={`${n} films from the ${decade}s`}>
              <span className="decades__col">
                <span className="decades__n mono">{n}</span>
                <span className="decades__fill" style={{ height: `${(n / max) * 82}%` }} />
              </span>
              <span className="decades__label mono">{decade}s</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
