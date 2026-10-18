import { REEL_WINNER_INDEX, timecode, type MoodQuery, type PickResult } from '@moodreel/core';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDialog } from '../hooks/useDialog';
import { useReducedMotion } from '../hooks/useMediaQuery';
import { clientId } from '../lib/clientId';
import { hash, imdbSearch, letterboxdSearch } from '../lib/format';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import { Fingerprint } from './Fingerprint';
import { Icon } from './Icon';
import { Poster } from './Poster';
import './PickFlow.css';

type Phase = 'loading' | 'spinning' | 'ticket' | 'accepted' | 'error';

const FRAME = 148;
const GAP = 14;
const SPIN_MS = 4200;

export function PickFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { api } = useApi();
  const { query, dispatch } = useStore();
  const reduced = useReducedMotion();
  const dialog = useDialog<HTMLDivElement>(open, onClose);
  const [phase, setPhase] = useState<Phase>('loading');
  const [result, setResult] = useState<PickResult | null>(null);
  const [error, setError] = useState('');
  const skipped = useRef<string[]>([]);
  const strip = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);

  const roll = useCallback(async () => {
    setPhase('loading');
    setError('');
    const q: MoodQuery = { ...query, exclude: [...query.exclude, ...skipped.current] };
    try {
      const next = await api.pick(q, { seed: Math.floor(Math.random() * 2 ** 31) });
      setResult(next);
      setPhase(reduced ? 'ticket' : 'spinning');
    } catch (e) {
      setError((e as Error).message);
      setPhase('error');
    }
  }, [api, query, reduced]);

  useEffect(() => {
    if (!open) return;
    skipped.current = [];
    void roll();
    // Only when the dialog opens; later rolls are user-driven.
  }, [open]);

  // Spin: ease the strip so the winner lands under the gate, slightly off-centre first, then settle.
  useLayoutEffect(() => {
    if (phase !== 'spinning' || !strip.current || !viewport.current || !result) return;
    const width = viewport.current.clientWidth;
    const centre = REEL_WINNER_INDEX * (FRAME + GAP) + FRAME / 2 - width / 2;
    const overshoot = ((hash(result.pick.movie.id + result.seed) % 100) / 100 - 0.5) * FRAME * 0.5;
    const spin = strip.current.animate(
      [
        { transform: 'translateX(0)', filter: 'blur(2.5px)' },
        { transform: `translateX(${-(centre + overshoot)}px)`, filter: 'blur(0)' },
      ],
      { duration: SPIN_MS, easing: 'cubic-bezier(0.1, 0.75, 0.12, 1)', fill: 'forwards' },
    );
    let settle: Animation | null = null;
    spin.onfinish = () => {
      settle = strip.current!.animate([{ transform: `translateX(${-(centre + overshoot)}px)` }, { transform: `translateX(${-centre}px)` }], {
        duration: 420,
        easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)',
        fill: 'forwards',
      });
      settle.onfinish = () => setTimeout(() => setPhase('ticket'), 380);
    };
    return () => {
      spin.cancel();
      settle?.cancel();
    };
  }, [phase, result]);

  const vote = (verdict: 'watch' | 'skip') => {
    if (!result) return;
    const mood = Object.fromEntries(Object.entries(query.dims).map(([dim, c]) => [dim, c!.target]));
    api.feedback({ clientId: clientId(), movieId: result.pick.movie.id, verdict, mood }).catch(() => undefined);
  };

  const accept = () => {
    if (!result) return;
    vote('watch');
    dispatch({ type: 'addWatch', id: result.pick.movie.id });
    setPhase('accepted');
  };
  const another = () => {
    if (!result) return;
    vote('skip');
    skipped.current.push(result.pick.movie.id);
    void roll();
  };
  const seen = () => {
    if (!result) return;
    dispatch({ type: 'toggleSeen', id: result.pick.movie.id });
    skipped.current.push(result.pick.movie.id);
    void roll();
  };

  if (!open) return null;
  const movie = result?.pick.movie;
  const seat = movie ? hash(movie.id + (result?.seed ?? 0)) : 0;

  return (
    <div className="pick" role="dialog" aria-modal="true" aria-label="Tonight’s pick" ref={dialog}>
      <div className="pick__backdrop" onClick={onClose} />
      <div className="pick__stage">
        <button type="button" className="btn btn--icon btn--ghost pick__close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>

        {(phase === 'loading' || phase === 'spinning') && (
          <div className="reel" aria-live="polite">
            <p className="eyebrow reel__label">{phase === 'loading' ? 'Loading the reel…' : 'The reel is spinning…'}</p>
            <div className="reel__viewport" ref={viewport}>
              <div className="reel__gate" aria-hidden="true" />
              <div className="reel__strip" ref={strip} style={{ gap: GAP }}>
                {result?.reel.map((m, i) => (
                  <div key={`${m.id}-${i}`} className="reel__frame" style={{ width: FRAME }}>
                    <Poster movie={m} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="pick__message">
            <h2>Nothing left to spin</h2>
            <p>{error}</p>
            <button type="button" className="btn btn--primary" onClick={onClose} data-autofocus>
              Back to my rules
            </button>
          </div>
        )}

        {(phase === 'ticket' || phase === 'accepted') && movie && result && (
          <article className="ticket" aria-labelledby="ticket-title">
            <div className="ticket__main">
              <p className="ticket__brand mono">MoodReel · screening tonight</p>
              <div className="ticket__film">
                <Poster movie={movie} size="lg" className="ticket__poster" />
                <div className="ticket__info">
                  <h2 id="ticket-title" className="ticket__title">
                    {movie.title}
                  </h2>
                  <p className="ticket__meta mono">
                    {movie.year} · {movie.director} · {timecode(movie.runtime)}
                  </p>
                  <p className="ticket__blurb">{movie.blurb}</p>
                  <ul className="ticket__reasons">
                    {result.pick.reasons.slice(0, 4).map((r) => (
                      <li key={r.text} className={`chip chip--${r.tone === 'warn' ? 'warn' : 'good'}`}>
                        {r.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {Object.keys(query.dims).length > 0 && <Fingerprint movie={movie} query={query} compact />}
            </div>
            <div className="ticket__stub mono" aria-label={`Screen ${(seat % 9) + 1}, row ${(seat % 14) + 1}, seat ${(seat % 22) + 1}`}>
              <span>
                Screen<b>{(seat % 9) + 1}</b>
              </span>
              <span>
                Row<b>{(seat % 14) + 1}</b>
              </span>
              <span>
                Seat<b>{(seat % 22) + 1}</b>
              </span>
              <span className="ticket__match">
                {result.pick.score}
                <small>%</small>
              </span>
            </div>
            <div className="ticket__actions">
              {phase === 'ticket' ? (
                <>
                  <button type="button" className="btn btn--primary" onClick={accept} data-autofocus>
                    <Icon name="check" size={16} /> I’ll watch it!
                  </button>
                  <button type="button" className="btn" onClick={another}>
                    <Icon name="shuffle" size={16} /> Another
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={seen}>
                    <Icon name="eye" size={16} /> Seen it
                  </button>
                </>
              ) : (
                <>
                  <p className="ticket__done">Enjoy the film! I saved it to your list.</p>
                  <a className="btn" href={imdbSearch(movie.title, movie.year)} target="_blank" rel="noreferrer">
                    IMDb <Icon name="external" size={14} />
                  </a>
                  <a className="btn" href={letterboxdSearch(movie.title)} target="_blank" rel="noreferrer">
                    Letterboxd <Icon name="external" size={14} />
                  </a>
                  <button type="button" className="btn btn--ghost" onClick={onClose} data-autofocus>
                    Close
                  </button>
                </>
              )}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
