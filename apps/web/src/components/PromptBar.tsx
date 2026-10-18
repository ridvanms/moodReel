import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useReducedMotion } from '../hooks/useMediaQuery';
import './PromptBar.css';

export const EXAMPLES = [
  'Something scary, but not too scary',
  'Something mind-bending like The Thing or Black Swan',
  'Pick me a movie, no sad endings',
  'Bad day, I need something uplifting',
  'With the kids, something magical, under 2 hours',
  'A romantic comedy from the 90s',
  'A dark thriller with a twist, no gore',
  'Something like Nolan, but shorter',
];

interface Props {
  take: number;
  busy: boolean;
  onSubmit: (text: string) => void;
  feedback: { tone: 'info' | 'warn'; text: string } | null;
}

export function PromptBar({ take, busy, onSubmit, feedback }: Props) {
  const [text, setText] = useState('');
  const [placeholder, setPlaceholder] = useState(0);
  const [clap, setClap] = useState(0);
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();
  const inputId = useId();
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focused || text || reduced) return;
    const timer = setInterval(() => setPlaceholder((p) => (p + 1) % EXAMPLES.length), 3600);
    return () => clearInterval(timer);
  }, [focused, text, reduced]);

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setClap((c) => c + 1);
    onSubmit(trimmed);
  };

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(text);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit(text);
    }
  };

  return (
    <form className="slate" onSubmit={onFormSubmit} aria-busy={busy}>
      <div className="slate__clapper" aria-hidden="true">
        <span key={clap} className={`slate__stick ${clap ? 'slate__stick--clap' : ''}`} />
        <span className="slate__base" />
      </div>
      <div className="slate__meta mono" aria-hidden="true">
        <span>Production: <b>tonight</b></span>
        <span>Scene: <b>mood</b></span>
        <span>Take: <b>{String(take).padStart(2, '0')}</b></span>
      </div>
      <label htmlFor={inputId} className="slate__label">
        Describe what you feel like watching
      </label>
      <div className="slate__field">
        <textarea
          id={inputId}
          ref={area}
          className="slate__input"
          rows={2}
          maxLength={400}
          value={text}
          placeholder={`${EXAMPLES[placeholder]}…`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn btn--primary slate__go" type="submit" disabled={busy || !text.trim()}>
          {busy ? 'Thinking…' : 'Find'}
        </button>
      </div>
      <div className="slate__examples">
        <span className="eyebrow">Try</span>
        {EXAMPLES.slice(0, 6).map((example) => (
          <button
            key={example}
            type="button"
            className="slate__example"
            onClick={() => {
              setText(example);
              submit(example);
              area.current?.focus();
            }}
          >
            {example}
          </button>
        ))}
      </div>
      <p className={`slate__feedback slate__feedback--${feedback?.tone ?? 'info'}`} role="status" aria-live="polite">
        {feedback?.text ?? ''}
      </p>
    </form>
  );
}
