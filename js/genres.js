// Genres page: buttons on top, the films of the chosen genre below.
const buttons = document.getElementById('genre-buttons');
const grid = document.getElementById('film-grid');

const params = new URLSearchParams(location.search);
let current = params.get('genre') || 'all';

function showGenre(genreId) {
  current = genreId;
  history.replaceState(null, '', genreId === 'all' ? 'genres.html' : 'genres.html?genre=' + genreId);

  // buttons
  buttons.innerHTML = `<button class="${current === 'all' ? 'active' : ''}" onclick="showGenre('all')">All</button>`;
  genres.forEach((genre) => {
    buttons.innerHTML += `<button class="${current === genre.id ? 'active' : ''}" onclick="showGenre('${genre.id}')">${genre.name}</button>`;
  });

  // films
  const list = current === 'all' ? films : films.filter((film) => film.genre === current);
  grid.innerHTML = list.map(filmCardHtml).join('');
}

showGenre(current);
