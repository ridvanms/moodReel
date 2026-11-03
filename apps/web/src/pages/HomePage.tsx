import { GENRES, type MovieSummary } from '@moodreel/core';
import { GenreCard } from '../components/GenreCard';
import { Icon } from '../components/Icon';
import { Shelf } from '../components/Shelf';
import { Link } from '../router';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import { useGenreFilms } from './GenresPage';
import './HomePage.css';

export function HomePage() {
  const { byId } = useApi();
  const { state } = useStore();
  const films = useGenreFilms();
  const saved = state.watchlist.map((id) => byId.get(id)).filter((m): m is MovieSummary => m !== undefined);

  return (
    <div className="page home">
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">
          What are we watching <em>tonight?</em>
        </h1>
        <p className="hero__lead">Can’t decide? Answer a few questions and the Oracle will pick a film for you.</p>
        <div className="hero__cta">
          <Link to="/oracle" className="btn btn--primary btn--large">
            <Icon name="orb" size={18} /> Ask the Oracle
          </Link>
          <Link to="/genres" className="btn btn--large">
            Browse genres
          </Link>
        </div>
      </section>

      <section className="section" aria-labelledby="genres-title">
        <div className="section__head">
          <h2 id="genres-title">Genres</h2>
          <Link to="/browse" className="link-arrow">
            All films <Icon name="arrow" size={16} />
          </Link>
        </div>
        <ul className="ggrid">
          {GENRES.filter((g) => (films.get(g)?.length ?? 0) > 0).map((g) => (
            <li key={g}>
              <GenreCard genre={g} films={films.get(g)!} />
            </li>
          ))}
        </ul>
      </section>

      {saved.length > 0 && <Shelf title="Your watchlist" items={saved.map((movie) => ({ movie }))} more={{ to: '/list', label: 'Open' }} />}
    </div>
  );
}
