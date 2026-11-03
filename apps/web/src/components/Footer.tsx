import { Link } from '../router';
import './Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <p>
          <b>MoodReel</b> © {new Date().getFullYear()}
        </p>
        <nav aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/genres">Genres</Link>
          <Link to="/oracle">Oracle</Link>
          <Link to="/swipe">Swipe</Link>
          <Link to="/list">Watchlist</Link>
        </nav>
      </div>
    </footer>
  );
}
