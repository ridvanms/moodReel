import { GENRE_LABEL, GENRES } from '@moodreel/core';
import { Icon } from '../components/Icon';
import { Oracle } from '../components/Oracle';
import { isGenre } from '../lib/genres';
import { Link } from '../router';
import { useGenreFilms } from './GenresPage';
import './OraclePage.css';

/** Step one picks a genre (or any), step two is the Oracle's questions, step three the film. */
export function OraclePage({ params }: { params: URLSearchParams }) {
  const raw = params.get('genre');
  if (raw === 'any') return <div className="page"><Oracle key="any" genre={null} /></div>;
  if (isGenre(raw)) return <div className="page"><Oracle key={raw} genre={raw} /></div>;
  return <GenreStep />;
}

function GenreStep() {
  const films = useGenreFilms();
  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">The Oracle · step 1 of 3</p>
        <h1>
          Not sure what to watch? <em>Ask the Oracle.</em>
        </h1>
        <p className="page-head__lead">First pick a genre. Then the Oracle asks a few yes-or-no questions and chooses one film for you, with its description.</p>
      </header>
      <ol className="ostep__flow" aria-label="How it works">
        <li className="is-on">
          <span className="mono">1</span> Pick a genre
        </li>
        <li>
          <span className="mono">2</span> Answer the questions
        </li>
        <li>
          <span className="mono">3</span> Get your film
        </li>
      </ol>
      <ul className="ostep__genres">
        <li>
          <Link to="/oracle?genre=any" className="ostep__genre ostep__genre--any">
            <Icon name="orb" size={22} />
            <span className="ostep__name">Any genre</span>
            <span className="ostep__count mono">all films</span>
          </Link>
        </li>
        {GENRES.filter((g) => (films.get(g)?.length ?? 0) >= 4).map((g) => (
          <li key={g}>
            <Link to={`/oracle?genre=${g}`} className="ostep__genre">
              <span className="ostep__name">{GENRE_LABEL[g]}</span>
              <span className="ostep__count mono">{films.get(g)!.length} films</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
