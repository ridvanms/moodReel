import { ENDING_META, type Ending } from '@moodreel/core';
import { useState } from 'react';
import { Icon } from './Icon';

/** The ending type is a mild spoiler, so it stays behind a tap. */
export function EndingReveal({ ending }: { ending: Ending }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" className={`ending ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
      <Icon name={open ? 'unlock' : 'lock'} size={14} />
      {open ? (
        <>
          <span>{ENDING_META[ending].label}</span>
          <span className="ending__hint">{ENDING_META[ending].hint}</span>
        </>
      ) : (
        <span>What kind of ending?</span>
      )}
    </button>
  );
}
