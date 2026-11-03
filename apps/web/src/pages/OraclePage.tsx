import { GENRE_LABEL, GENRES } from '@moodreel/core';
import { Oracle } from '../components/Oracle';
import { RuleToggles } from '../components/RuleToggles';
import { isGenre } from '../lib/genres';
import { Link } from '../router';
import { useGenreFilms } from './GenresPage';
import './OraclePage.css';

/** First a genre (or any), then the Oracle's questions, then the film. */
export function OraclePage({ params }: { params: URLSearchParams }) {
  const raw = params.get('genre');
  const genre = isGenre(raw) ? raw : raw === 'any' ? null : undefined;
  return <div className="page">{genre === undefined ? <GenreStep /> : <Oracle key={genre ?? 'any'} genre={genre} />}</div>;
}

function GenreStep() {
  const films = useGenreFilms();
  return (
    <section className="ostep" aria-labelledby="ostep-title">
      <span className="orb" aria-hidden="true" />
      <h1 id="ostep-title">The Oracle</h1>
      <p className="ostep__lead">Pick a genre and answer a few questions. The Oracle will choose one film for you.</p>
      <RuleToggles only={['noSadEnding']} />
      <ul className="ostep__genres">
        <li>
          <Link to="/oracle?genre=any" className="btn btn--primary ostep__genre">
            Any genre
          </Link>
        </li>
        {GENRES.filter((g) => (films.get(g)?.length ?? 0) >= 4).map((g) => (
          <li key={g}>
            <Link to={`/oracle?genre=${g}`} className="btn ostep__genre">
              {GENRE_LABEL[g]}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
