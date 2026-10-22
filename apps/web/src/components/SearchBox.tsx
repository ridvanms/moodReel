import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { searchCatalog } from '../lib/search';
import { navigate, openFilm } from '../router';
import { useApi } from '../state/api';
import { Icon } from './Icon';
import { Poster } from './Poster';
import './SearchBox.css';

/** Title search with suggestions, an ARIA combobox. Enter on free text opens the catalog filtered by it. */
export function SearchBox({ onDone, autoFocus = false }: { onDone?: () => void; autoFocus?: boolean }) {
  const { catalog } = useApi();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const hits = useMemo(() => searchCatalog(catalog, text, 6), [catalog, text]);
  const showAll = text.trim().length > 0;
  const options = hits.length + (showAll ? 1 : 0);

  const finish = () => {
    setText('');
    setOpen(false);
    setActive(-1);
    input.current?.blur();
    onDone?.();
  };
  const choose = (index: number) => {
    const hit = hits[index];
    if (hit) openFilm(hit.id);
    else navigate(`/browse?q=${encodeURIComponent(text.trim())}`);
    finish();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!options) return;
      event.preventDefault();
      setOpen(true);
      setActive((a) => (event.key === 'ArrowDown' ? (a + 1) % options : (a - 1 + options) % options));
    } else if (event.key === 'Enter') {
      if (!showAll) return;
      event.preventDefault();
      choose(active >= 0 ? active : hits.length === 1 ? 0 : hits.length);
    } else if (event.key === 'Escape') {
      if (open && text) {
        event.stopPropagation();
        setOpen(false);
      } else onDone?.();
    }
  };

  return (
    <div className="search" role="search">
      <Icon name="search" size={18} className="search__icon" />
      <input
        ref={input}
        type="search"
        className="search__input"
        placeholder="Search films, directors, years…"
        aria-label="Search the catalog"
        role="combobox"
        aria-expanded={open && showAll}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {open && showAll && (
        <ul className="search__list" id={`${id}-list`} role="listbox" aria-label="Suggestions">
          {hits.map((movie, i) => (
            <li
              key={movie.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={active === i}
              className={`search__option ${active === i ? 'is-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <Poster movie={movie} size="sm" />
              <span className="search__title">{movie.title}</span>
              <span className="search__meta mono">
                {movie.year} · {movie.director}
              </span>
            </li>
          ))}
          {hits.length === 0 && <li className="search__none">No titles match “{text.trim()}”.</li>}
          <li
            id={`${id}-opt-${hits.length}`}
            role="option"
            aria-selected={active === hits.length}
            className={`search__option search__all ${active === hits.length ? 'is-active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(hits.length)}
            onClick={() => choose(hits.length)}
          >
            Browse everything matching “{text.trim()}” <Icon name="arrow" size={14} />
          </li>
        </ul>
      )}
    </div>
  );
}
