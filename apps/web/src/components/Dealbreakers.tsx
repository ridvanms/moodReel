import { DEAL_LABEL, type BooleanDealbreaker, type Effect } from '@moodreel/core';
import { useStore } from '../state/store';
import './Dealbreakers.css';

const SWITCHES: Array<{ key: BooleanDealbreaker; hint: string }> = [
  { key: 'noSadEnding', hint: 'Drops sad and bleak endings, without telling you which is which.' },
  { key: 'happyOnly', hint: 'Only films you walk out of smiling.' },
  { key: 'noGore', hint: 'No blood or graphic violence.' },
  { key: 'noJumpscares', hint: 'No sudden scares.' },
  { key: 'noAnimalDeath', hint: 'Not a single animal dies.' },
  { key: 'familyFriendly', hint: 'Suitable for all ages.' },
];

type Option = { id: string; label: string; effect: Effect | null };

const RUNTIME: Option[] = [
  { id: 'any', label: 'Any', effect: null },
  { id: '95', label: 'up to 95 min', effect: { kind: 'runtime', max: 95 } },
  { id: '120', label: 'up to 2 h', effect: { kind: 'runtime', max: 120 } },
  { id: 'long', label: 'over 2 h', effect: { kind: 'runtime', min: 121 } },
];

const ERA: Option[] = [
  { id: 'any', label: 'All', effect: null },
  { id: 'classic', label: 'up to 1999', effect: { kind: 'era', maxYear: 1999 } },
  { id: 'mid', label: '2000–2013', effect: { kind: 'era', minYear: 2000, maxYear: 2013 } },
  { id: 'new', label: '2014+', effect: { kind: 'era', minYear: 2014 } },
];

const FORMAT: Option[] = [
  { id: 'any', label: 'Everything', effect: null },
  { id: 'only', label: 'Animation only', effect: { kind: 'animation', mode: 'only' } },
  { id: 'exclude', label: 'No animation', effect: { kind: 'animation', mode: 'exclude' } },
];

export function Dealbreakers({ excludedCount }: { excludedCount: Partial<Record<string, number>> }) {
  const { query, dispatch } = useStore();
  const d = query.dealbreakers;

  const toggle = (key: BooleanDealbreaker) => {
    if (d[key]) dispatch({ type: 'remove', keys: [`deal:${key}`] });
    else dispatch({ type: 'upsert', effect: { kind: 'deal', key } });
  };

  const runtimeId = d.minRuntime && !d.maxRuntime ? 'long' : d.maxRuntime ? (d.maxRuntime <= 95 ? '95' : d.maxRuntime <= 120 ? '120' : 'custom') : 'any';
  const eraId = d.minYear === 2014 && !d.maxYear ? 'new' : d.maxYear === 1999 && !d.minYear ? 'classic' : d.minYear === 2000 && d.maxYear === 2013 ? 'mid' : d.minYear || d.maxYear ? 'custom' : 'any';
  const formatId = d.animation ?? 'any';

  return (
    <div className="deals">
      <ul className="deals__switches">
        {SWITCHES.map(({ key, hint }) => {
          const on = Boolean(d[key]);
          return (
            <li key={key}>
              <button type="button" role="switch" aria-checked={on} className={`deal ${on ? 'is-on' : ''}`} onClick={() => toggle(key)}>
                <span className="deal__track" aria-hidden="true">
                  <span className="deal__thumb" />
                </span>
                <span className="deal__text">
                  <span className="deal__label">{DEAL_LABEL[key]}</span>
                  <span className="deal__hint">{hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Segmented legend="Length" name="runtime" options={RUNTIME} value={runtimeId} onPick={(o) => apply(dispatch, 'runtime', o)} />
      <Segmented legend="Years" name="era" options={ERA} value={eraId} onPick={(o) => apply(dispatch, 'era', o)} />
      <Segmented legend="Format" name="format" options={FORMAT} value={formatId} onPick={(o) => apply(dispatch, 'animation', o)} />
      {Object.keys(excludedCount).length > 0 && <p className="deals__note">Films your rules exclude go dark on the contact sheet.</p>}
    </div>
  );
}

function apply(dispatch: ReturnType<typeof useStore>['dispatch'], key: string, option: Option) {
  if (option.effect) dispatch({ type: 'upsert', effect: option.effect });
  else dispatch({ type: 'remove', keys: [key] });
}

function Segmented({ legend, name, options, value, onPick }: { legend: string; name: string; options: Option[]; value: string; onPick: (o: Option) => void }) {
  return (
    <fieldset className="segmented">
      <legend className="eyebrow">{legend}</legend>
      <div className="segmented__options">
        {options.map((option) => (
          <label key={option.id} className={`segmented__option ${value === option.id ? 'is-on' : ''}`}>
            <input type="radio" name={name} value={option.id} checked={value === option.id} onChange={() => onPick(option)} />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
