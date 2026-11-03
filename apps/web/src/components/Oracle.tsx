import { emptyQuery, GENRE_LABEL, QUESTIONS, timecode, type Genre, type OracleAnswer, type OracleState, type OracleStep } from '@moodreel/core';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { clientId } from '../lib/clientId';
import { withGenre } from '../lib/genres';
import { Link, navigate } from '../router';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import { Icon } from './Icon';
import { Poster } from './Poster';
import './Oracle.css';

const ANSWERS: Array<{ id: OracleAnswer; label: string; short: string }> = [
  { id: 'yes', label: 'Yes', short: 'Yes' },
  { id: 'probably', label: 'Probably', short: 'Probably' },
  { id: 'unknown', label: 'Don’t care', short: 'Don’t care' },
  { id: 'probablyNot', label: 'Probably not', short: 'Prob. not' },
  { id: 'no', label: 'No', short: 'No' },
];
const ANSWER_LABEL = Object.fromEntries(ANSWERS.map((a) => [a.id, a.label])) as Record<OracleAnswer, string>;

/** `genre` is null for "any genre"; the genre is chosen on the step before the questions. */
export function Oracle({ genre }: { genre: Genre | null }) {
  const { api, catalog } = useApi();
  const { rulesQuery, dispatch } = useStore();
  const ruleCount = Object.keys(rulesQuery.dealbreakers).length;
  const [respectRules, setRespectRules] = useState(true);
  const [history, setHistory] = useState<OracleStep[]>([]);
  const [state, setState] = useState<OracleState | null>(null);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const total = useRef(catalog.length);

  const run = useCallback(
    async (steps: OracleStep[]) => {
      setThinking(true);
      try {
        setError('');
        const base = respectRules && ruleCount > 0 ? rulesQuery : emptyQuery();
        const query = withGenre(base, genre, catalog);
        const next = await api.oracle(steps, query.exclude.length || ruleCount ? query : undefined);
        if (steps.length === 0) total.current = Math.round(next.effectiveCandidates);
        setState(next);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setThinking(false);
      }
    },
    [api, catalog, genre, rulesQuery, respectRules, ruleCount],
  );

  useEffect(() => {
    void run(history);
    // Re-run only when the answers, the genre or the rule toggle change, not when unrelated state elsewhere moves.
  }, [history, respectRules, genre]);

  const answer = useCallback(
    (id: OracleAnswer) => {
      if (!state?.question || state.done || thinking) return;
      const questionId = state.question.id;
      setHistory((h) => [...h, { questionId, answer: id }]);
    },
    [state, thinking],
  );
  const undo = () => setHistory((h) => h.slice(0, -1));
  const restart = () => {
    setHistory([]);
    setAccepted(false);
  };

  // 1–5 answer, Backspace undoes: the Oracle is quickest from the keyboard.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select') || event.metaKey || event.ctrlKey || event.altKey) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < ANSWERS.length) {
        event.preventDefault();
        answer(ANSWERS[index]!.id);
      } else if (event.key === 'Backspace' && history.length && !state?.done) {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, history.length, state?.done]);

  const top = state?.top ?? [];
  const leader = top[0];
  const clarity = leader ? Math.min(1, leader.probability / 0.45) : 0;
  const left = state ? Math.max(1, Math.round(state.effectiveCandidates)) : total.current;
  // Progress on a log scale: halving the field is equal progress at every stage.
  const progress = state?.done ? 1 : Math.min(0.96, Math.max(0.02, 1 - Math.log(left) / Math.log(Math.max(2, total.current))));

  return (
    <section className="oracle" aria-labelledby="oracle-title">
      <div className="oracle__intro">
        <div>
          <p className="kicker">The Oracle · step {state?.done ? 3 : 2} of 3</p>
          <h1 id="oracle-title">{genre ? <>The Oracle: <em>{GENRE_LABEL[genre].toLowerCase()}</em></> : <>The Oracle: <em>any genre</em></>}</h1>
          <p className="oracle__lead">Answer a few questions. Each one is chosen to split the films still in the running as evenly as possible, so five to eight answers usually do it.</p>
          <p>
            <button type="button" className="link-arrow link-arrow--button" onClick={() => navigate('/oracle')}>
              <Icon name="arrow" size={14} className="flip" /> Change genre
            </button>
          </p>
        </div>
        {ruleCount > 0 && (
          <label className="oracle__rules">
            <input type="checkbox" checked={respectRules} onChange={(e) => setRespectRules(e.target.checked)} />
            Respect my house rules ({ruleCount})
          </label>
        )}
      </div>

      {error && (
        <p className="oracle__error" role="alert">
          {error}
        </p>
      )}

      <div className="oracle__grid">
        <div className="oracle__stage">
          <div className={`orb ${thinking ? 'is-thinking' : ''} ${state?.done ? 'is-done' : ''}`} style={{ '--progress': progress } as CSSProperties} aria-hidden="true">
            <span className="orb__core" />
            <span className="orb__ring" />
          </div>

          <div className="oracle__meter" role="progressbar" aria-label="How sure the Oracle is" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="oracle__left mono" aria-live="polite">
            {state?.done ? 'Decided' : `≈${left} of ${total.current} films still in the running`}
          </p>

          <AnimatePresence mode="wait">
            {state && !state.done && state.question && (
              <motion.div
                key={state.question.id}
                className="oracle__card"
                initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="mono oracle__number">Question {String(state.question.number).padStart(2, '0')}</p>
                <h2 className="oracle__question" aria-live="polite">
                  {state.question.text}
                </h2>
                <p className="oracle__hint">{state.question.hint}</p>
                <div className="oracle__answers" role="group" aria-label="Your answer">
                  {ANSWERS.map((a, i) => (
                    <button key={a.id} type="button" className={`oracle__answer oracle__answer--${a.id}`} onClick={() => answer(a.id)} disabled={thinking} aria-keyshortcuts={String(i + 1)}>
                      <kbd className="mono">{i + 1}</kbd>
                      <span className="oracle__answer-label">{a.label}</span>
                      <span className="oracle__answer-short">{a.short}</span>
                    </button>
                  ))}
                </div>
                <div className="oracle__tools">
                  {history.length > 0 && (
                    <button type="button" className="btn btn--ghost btn--small" onClick={undo}>
                      ← Undo last answer
                    </button>
                  )}
                  <span className="oracle__keys">Tip: keys 1–5 answer, Backspace undoes.</span>
                </div>
              </motion.div>
            )}

            {state?.done && leader && (
              <motion.div key="verdict" className="oracle__verdict" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <p className="eyebrow">After {state.asked} questions, the Oracle has spoken</p>
                <div className="oracle__winner">
                  <Link to={`/film/${leader.movie.id}`} className="oracle__winner-poster" aria-label={`Details for ${leader.movie.title}`}>
                    <Poster movie={leader.movie} size="lg" />
                  </Link>
                  <div className="oracle__winner-info">
                    <h2>{leader.movie.title}</h2>
                    <p className="mono oracle__winner-meta">
                      {leader.movie.year} · {leader.movie.director} · {timecode(leader.movie.runtime)}
                    </p>
                    <p>{leader.movie.blurb}</p>
                    <div className="oracle__winner-actions">
                      {accepted ? (
                        <p className="oracle__thanks">Saved to your list. Enjoy the film!</p>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => {
                            dispatch({ type: 'addWatch', id: leader.movie.id });
                            api.feedback({ clientId: clientId(), movieId: leader.movie.id, verdict: 'watch' }).catch(() => undefined);
                            setAccepted(true);
                          }}
                        >
                          <Icon name="check" size={16} /> I’ll watch it!
                        </button>
                      )}
                      <Link to={`/film/${leader.movie.id}`} className="btn">
                        Film page
                      </Link>
                      <button type="button" className="btn btn--ghost" onClick={restart}>
                        <Icon name="shuffle" size={16} /> Start over
                      </button>
                    </div>
                  </div>
                </div>
                {top.length > 1 && (
                  <div className="oracle__runners">
                    <p className="eyebrow">Also crossed its mind</p>
                    <ul>
                      {top.slice(1, 5).map((c) => (
                        <li key={c.movie.id}>
                          <Link to={`/film/${c.movie.id}`}>
                            <Poster movie={c.movie} size="sm" />
                            <span>{c.movie.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="oracle__mind" aria-label="What the Oracle is thinking">
          <p className="eyebrow">Inside the Oracle’s head</p>
          <ol className="oracle__top" style={{ filter: state?.done ? 'none' : `blur(${(1 - clarity) * 5}px)` }} aria-hidden={!state?.done}>
            {top.map((c) => (
              <li key={c.movie.id}>
                <span className="oracle__swatch" style={{ background: `linear-gradient(160deg, ${c.movie.palette[1]}, ${c.movie.palette[0]})` }} />
                <span className="oracle__top-title">{c.movie.title}</span>
                <span className="oracle__bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(3, Math.min(100, (c.probability / (leader?.probability || 1)) * 100))}%` }} />
                </span>
                <span className="mono oracle__pct">{Math.round(c.probability * 100)}%</span>
              </li>
            ))}
          </ol>
          {!state?.done && <p className="oracle__note">Titles come into focus as the Oracle grows surer.</p>}

          {history.length > 0 && (
            <div className="oracle__trail">
              <p className="eyebrow">Your answers</p>
              <ol>
                {history.map((step, i) => (
                  <li key={`${step.questionId}-${i}`}>
                    <span className="oracle__trail-q">{QUESTIONS.find((q) => q.id === step.questionId)?.text ?? step.questionId}</span>
                    <span className={`oracle__trail-a oracle__trail-a--${step.answer}`}>{ANSWER_LABEL[step.answer]}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
