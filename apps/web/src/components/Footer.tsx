import { MOODS } from '../lib/moods';
import { Link } from '../router';
import { useApi } from '../state/api';
import { Icon } from './Icon';
import './Footer.css';

export function Footer() {
  const { api, catalog } = useApi();
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true">
              <Icon name="reel" size={22} />
            </span>
            <span className="brand__word">
              Mood<span>Reel</span>
            </span>
          </Link>
          <p>Pick a film by how you feel. {catalog.length} films, scored by hand on ten mood dimensions, with posters generated in code and endings kept under lock.</p>
          <p className="mono footer__mode">{api.mode === 'remote' ? 'Live API · Express + React' : 'The engine runs in your browser'}</p>
        </div>
        <nav className="footer__col" aria-label="Explore">
          <p className="eyebrow">Explore</p>
          <Link to="/discover">Mood lab</Link>
          <Link to="/moods">All moods</Link>
          <Link to="/browse">Browse the catalog</Link>
          <Link to="/atlas">Atlas</Link>
        </nav>
        <nav className="footer__col" aria-label="Popular moods">
          <p className="eyebrow">Popular moods</p>
          {MOODS.slice(0, 4).map((m) => (
            <Link key={m.slug} to={`/moods/${m.slug}`}>
              {m.title}
            </Link>
          ))}
        </nav>
        <nav className="footer__col" aria-label="You">
          <p className="eyebrow">You</p>
          <Link to="/oracle">Ask the Oracle</Link>
          <Link to="/list">My list</Link>
          <a href="https://github.com/ridvanms/moodReel" target="_blank" rel="noreferrer">
            Source code <Icon name="external" size={12} />
          </a>
        </nav>
      </div>
      <div className="footer__base">
        <p>© {new Date().getFullYear()} MoodReel. Film data scored for this project; no tracking, no accounts.</p>
        <button type="button" className="link-arrow link-arrow--button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Back to top <Icon name="arrow" size={14} className="footer__up" />
        </button>
      </div>
    </footer>
  );
}
