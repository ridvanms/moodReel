import { useId, useState } from 'react';
import { Icon } from './Icon';
import './Faq.css';

/** An accordion: one answer open at a time, keyboard and screen-reader friendly. */
export function Faq({ items }: { items: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <div className="faq">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className={`faq__item ${isOpen ? 'is-open' : ''}`}>
            <h3>
              <button type="button" id={`${base}-q${i}`} aria-expanded={isOpen} aria-controls={`${base}-a${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                <span>{item.q}</span>
                <Icon name="chevronDown" size={20} className="faq__chev" />
              </button>
            </h3>
            <div id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`} className="faq__answer" hidden={!isOpen}>
              <p>{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
