import { Icon } from '../components/Icon';
import { Link } from '../router';

export function NotFoundPage() {
  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">Error 404</p>
        <h1>
          This reel is <em>missing</em>
        </h1>
        <p className="page-head__lead">The page you were looking for was never in the projector. Try one of these instead.</p>
        <p>
          <Link to="/" className="btn btn--primary">
            <Icon name="arrow" size={16} /> Back to the lobby
          </Link>
        </p>
      </header>
    </div>
  );
}
