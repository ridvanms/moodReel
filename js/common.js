// Things every page uses: the watchlist and drawing a film card.

function getWatchlist() {
  return JSON.parse(localStorage.getItem('watchlist')) || [];
}

function isSaved(id) {
  return getWatchlist().includes(id);
}

function toggleWatchlist(id) {
  let list = getWatchlist();
  if (list.includes(id)) {
    list = list.filter((filmId) => filmId !== id);
  } else {
    list.push(id);
  }
  localStorage.setItem('watchlist', JSON.stringify(list));
}

function findFilm(id) {
  return films.find((film) => film.id === id);
}

function genreName(id) {
  return genres.find((genre) => genre.id === id).name;
}

function hours(minutes) {
  return Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'min';
}

// A simple "poster": a card in the film's colour with its title.
function posterHtml(film) {
  return `<div class="poster" style="background-color: ${film.color}">
      <span>${film.title}</span>
    </div>`;
}

function filmCardHtml(film) {
  return `<a class="film-card" href="film.html?id=${film.id}">
      ${posterHtml(film)}
      <h3>${film.title}</h3>
      <p>${film.year} · ${genreName(film.genre)}</p>
    </a>`;
}

// Mark the current page in the menu.
let page = location.pathname.split('/').pop() || 'index.html';
if (page === 'film.html') page = 'genres.html';
document.querySelectorAll('nav a').forEach((link) => {
  if (link.getAttribute('href') === page) {
    link.classList.add('active');
  }
});
