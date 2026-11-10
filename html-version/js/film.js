// Film page: everything about one film, chosen with ?id= in the address.
const filmBox = document.getElementById('film');
const id = new URLSearchParams(location.search).get('id');
const film = findFilm(id);

function showFilm() {
  if (!film) {
    filmBox.innerHTML = '<h1>Film not found</h1><p><a href="genres.html">Back to genres</a></p>';
    return;
  }
  document.title = film.title + ' · MoodReel';

  const others = films.filter((f) => f.genre === film.genre && f.id !== film.id);

  filmBox.innerHTML = `<p class="back"><a href="genres.html?genre=${film.genre}">← ${genreName(film.genre)}</a></p>
    <div class="film-page">
      ${posterHtml(film)}
      <div>
        <h1>${film.title}</h1>
        <p class="info">${film.year} · ${film.director} · ${hours(film.minutes)} · ${genreName(film.genre)}</p>
        <p class="description">${film.description}</p>
        <button class="btn btn-pink" onclick="toggleWatchlist('${film.id}'); showFilm()">
          ${isSaved(film.id) ? '✓ In your watchlist' : '+ Add to watchlist'}
        </button>
      </div>
    </div>
    <h2>More ${genreName(film.genre).toLowerCase()}</h2>
    <div class="film-grid">${others.map(filmCardHtml).join('')}</div>`;
}

showFilm();
