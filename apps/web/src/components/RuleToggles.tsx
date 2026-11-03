import { DEAL_LABEL, type BooleanDealbreaker } from '@moodreel/core';
import { useStore } from '../state/store';
import './RuleToggles.css';

export const RULES: Array<{ key: BooleanDealbreaker; hint: string }> = [
  { key: 'noSadEnding', hint: 'Skips films with a sad ending, without telling you which ones.' },
  { key: 'happyOnly', hint: 'Only films you walk out of smiling.' },
  { key: 'noGore', hint: 'No blood or graphic violence.' },
  { key: 'noJumpscares', hint: 'No sudden scares.' },
  { key: 'noAnimalDeath', hint: 'Not a single animal dies.' },
  { key: 'familyFriendly', hint: 'Suitable for all ages.' },
];

/** Standing rules as switches. They live in the store, so every page and every pick respects them. */
export function RuleToggles({ only, size = 'md' }: { only?: BooleanDealbreaker[]; size?: 'md' | 'lg' }) {
  const { rulesQuery: query, dispatch } = useStore();
  const rules = only ? RULES.filter((r) => only.includes(r.key)) : RULES;
  return (
    <ul className={`rules rules--${size}`}>
      {rules.map(({ key, hint }) => {
        const on = Boolean(query.dealbreakers[key]);
        return (
          <li key={key}>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              title={hint}
              className={`rule ${on ? 'is-on' : ''}`}
              onClick={() => dispatch(on ? { type: 'remove', keys: [`deal:${key}`] } : { type: 'upsert', effect: { kind: 'deal', key } })}
            >
              <span className="rule__track" aria-hidden="true">
                <span className="rule__thumb" />
              </span>
              {DEAL_LABEL[key]}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
