import { useId, useState, type KeyboardEvent } from 'react';
import { readJson, writeJson } from '../lib/storage';
import { Dealbreakers } from './Dealbreakers';
import { DimSliders } from './DimSliders';
import { MoodMap } from './MoodMap';
import { Presets } from './Presets';
import './Mixer.css';

const TABS = [
  { id: 'map', label: 'Map' },
  { id: 'fine', label: 'Fine-tune' },
  { id: 'rules', label: 'Rules' },
] as const;
type Tab = (typeof TABS)[number]['id'];

interface Props {
  highlighted: ReadonlySet<string>;
  excluded: Readonly<Record<string, unknown>>;
  byReason: Partial<Record<string, number>>;
  onOpen: (id: string) => void;
}

export function Mixer({ highlighted, excluded, byReason, onOpen }: Props) {
  const [tab, setTab] = useState<Tab>(() => readJson<Tab>('moodreel:tab', 'map'));
  const base = useId();
  const choose = (next: Tab) => {
    setTab(next);
    writeJson('moodreel:tab', next);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const index = TABS.findIndex((t) => t.id === tab);
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = TABS[(index + delta + TABS.length) % TABS.length]!.id;
    choose(next);
    document.getElementById(`${base}-tab-${next}`)?.focus();
  };

  return (
    <section className="mixer panel" aria-labelledby={`${base}-title`}>
      <header className="mixer__head">
        <div>
          <p className="eyebrow">Control desk</p>
          <h2 id={`${base}-title`}>Tune it by hand</h2>
        </div>
        <div className="mixer__tabs" role="tablist" aria-label="Ways to tune" onKeyDown={onKeyDown}>
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`${base}-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className={`mixer__tab ${tab === t.id ? 'is-on' : ''}`}
              onClick={() => choose(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <div id={`${base}-panel-${tab}`} role="tabpanel" aria-labelledby={`${base}-tab-${tab}`} className="mixer__body">
        {tab === 'map' && (
          <>
            <MoodMap highlighted={highlighted} excluded={excluded} onOpen={onOpen} />
            <div className="mixer__presets">
              <p className="eyebrow">Or pick an evening</p>
              <Presets />
            </div>
          </>
        )}
        {tab === 'fine' && <DimSliders />}
        {tab === 'rules' && <Dealbreakers excludedCount={byReason} />}
      </div>
    </section>
  );
}
