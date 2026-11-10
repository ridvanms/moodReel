import { GENRES } from '@moodreel/core';
import { GenreCard } from '../components/GenreCard';
import { Link } from '../router';
import { useGenreFilms } from './GenresPage';
import './HomePage.css';

export function HomePage() {
  const films = useGenreFilms();

  return (
    <div className="page home">
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">
          What are we watching <em>tonight?</em>
        </h1>
        <p className="hero__lead">Can’t decide? Answer a few questions and the Oracle will pick a film for you.</p>
        <div className="hero__cta">
          <Link to="/oracle" className="btn btn--primary btn--large">
            Ask the Oracle
          </Link>
          <Link to="/genres" className="btn btn--large">
            Browse genres
          </Link>
        </div>
      </section>

      <section className="section" aria-labelledby="genres-title">
        <h2 id="genres-title" className="home__title">
          Genres
        </h2>
        <ul className="ggrid">
          {GENRES.filter((g) => (films.get(g)?.length ?? 0) > 0).map((g) => (
            <li key={g}>
              <GenreCard genre={g} films={films.get(g)!} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
