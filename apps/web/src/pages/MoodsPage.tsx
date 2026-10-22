import { Icon } from '../components/Icon';
import { MoodTile } from '../components/MoodTile';
import { RuleToggles } from '../components/RuleToggles';
import { MOODS } from '../lib/moods';
import { Link } from '../router';
import './MoodsPage.css';

export function MoodsPage() {
  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">Moods</p>
        <h1>
          Start from a <em>feeling</em>
        </h1>
        <p className="page-head__lead">
          Twelve evenings we keep coming back to. Each mood is a recipe of wishes on ten dimensions; open one to see what fits, or let the reel choose for you.
        </p>
      </header>

      <section className="section moods__rules" aria-labelledby="rules-title">
        <div>
          <h2 id="rules-title" className="moods__rules-title">
            House rules
          </h2>
          <p className="moods__rules-note">They apply to every mood below.</p>
        </div>
        <RuleToggles />
      </section>

      <ul className="moodgrid moodgrid--all">
        {MOODS.map((mood, i) => (
          <li key={mood.slug}>
            <MoodTile mood={mood} index={i} />
          </li>
        ))}
        <li>
          <Link to="/discover" className="moodtile moodtile--own">
            <span className="moodtile__num mono">DIY</span>
            <span className="moodtile__own-mark" aria-hidden="true">
              <Icon name="sliders" size={34} />
            </span>
            <span className="moodtile__text">
              <span className="moodtile__title">Mix your own</span>
              <span className="moodtile__line">Drag the mood map, set ten sliders, add rules.</span>
            </span>
            <Icon name="arrow" size={18} className="moodtile__arrow" />
          </Link>
        </li>
      </ul>
    </div>
  );
}
