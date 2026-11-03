import { GENRE_LABEL } from '@moodreel/core';
import { Link } from '../router';
import { useApi } from '../state/api';
import { Icon } from './Icon';
import './Footer.css';

const POPULAR = ['horror', 'comedy', 'thriller', 'romance'] as const;

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
          <p>Not sure what to watch? Pick a genre, answer the Oracle and save the film to your watchlist. {catalog.length} films, no spoilers.</p>
          <p className="mono footer__mode">{api.mode === 'remote' ? 'Live API · Express + React' : 'The engine runs in your browser'}</p>
        </div>
        <nav className="footer__col" aria-label="Pages">
          <p className="eyebrow">Pages</p>
          <Link to="/">Home</Link>
          <Link to="/genres">Genres</Link>
          <Link to="/oracle">Oracle</Link>
          <Link to="/list">Watchlist</Link>
        </nav>
        <nav className="footer__col" aria-label="Popular genres">
          <p className="eyebrow">Popular genres</p>
          {POPULAR.map((g) => (
            <Link key={g} to={`/genres/${g}`}>
              {GENRE_LABEL[g]}
            </Link>
          ))}
        </nav>
        <nav className="footer__col" aria-label="Extras">
          <p className="eyebrow">Extras</p>
          <Link to="/browse">All films</Link>
          <Link to="/discover">Mood lab</Link>
          <Link to="/atlas">Atlas</Link>
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
