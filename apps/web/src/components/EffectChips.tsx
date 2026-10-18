import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { shareUrl } from '../lib/share';
import { useApi } from '../state/api';
import { effectChips, useStore } from '../state/store';
import './EffectChips.css';

export function EffectChips() {
  const { state, dispatch } = useStore();
  const { byId } = useApi();
  const [copied, setCopied] = useState<'ok' | 'manual' | null>(null);
  const chips = effectChips(state.effects, byId);

  const share = async () => {
    const url = shareUrl(state.effects);
    try {
      await navigator.clipboard.writeText(url);
      setCopied('ok');
    } catch {
      window.prompt('Copy the link:', url);
      setCopied('manual');
    }
    setTimeout(() => setCopied(null), 2200);
  };

  return (
    <section className="wishes" aria-labelledby="wishes-title">
      <div className="wishes__head">
        <h2 id="wishes-title" className="eyebrow">
          Your wishes {chips.length > 0 && <span className="wishes__count">{chips.length}</span>}
        </h2>
        {chips.length > 0 && (
          <div className="wishes__actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={share}>
              {copied === 'ok' ? 'Link copied' : 'Share this mood'}
            </button>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => dispatch({ type: 'clear' })}>
              Clear
            </button>
          </div>
        )}
      </div>
      {chips.length === 0 ? (
        <p className="wishes__empty">No wishes yet, so you are looking at the whole catalog. Type something above or move a slider.</p>
      ) : (
        <ul className="wishes__list">
          <AnimatePresence initial={false}>
            {chips.map((chip) => (
              <motion.li
                key={chip.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.18 }}
                className={`chip wish ${chip.combo ? 'wish--combo' : ''}`}
                title={chip.detail}
              >
                <span className="wish__group">{chip.group}</span>
                <span className="wish__label">{chip.label}</span>
                <button type="button" className="wish__remove" aria-label={`Remove “${chip.label}”`} onClick={() => dispatch({ type: 'remove', keys: chip.keys })}>
                  ×
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
