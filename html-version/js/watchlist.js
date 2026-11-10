// Watchlist page: the films you saved, kept in the browser (localStorage).
const watchBox = document.getElementById('watchlist');

function showWatchlist() {
  const saved = getWatchlist().map(findFilm).filter((film) => film);

  if (saved.length === 0) {
    watchBox.innerHTML = `<div class="empty">
        <p>Your watchlist is empty.</p>
        <a class="btn btn-pink" href="oracle.html">Ask the Oracle</a>
      </div>`;
    return;
  }

  watchBox.innerHTML = saved
    .map((film) => `<div class="watch-row">
        <a href="film.html?id=${film.id}">${posterHtml(film)}</a>
        <div>
          <h3><a href="film.html?id=${film.id}">${film.title}</a></h3>
          <p>${film.year} · ${genreName(film.genre)}</p>
        </div>
        <button class="btn" onclick="toggleWatchlist('${film.id}'); showWatchlist()">Remove</button>
      </div>`)
    .join('');
}

showWatchlist();
