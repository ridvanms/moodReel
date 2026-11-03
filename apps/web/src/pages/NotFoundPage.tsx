import { Link } from '../router';

export function NotFoundPage() {
  return (
    <div className="page">
      <header className="page-head">
        <h1>
          Page not found
        </h1>
        <p className="page-head__lead">This page doesn’t exist.</p>
        <p>
          <Link to="/" className="btn btn--primary">
            Go home
          </Link>
        </p>
      </header>
    </div>
  );
}
