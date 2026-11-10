// Home page: the genres, and a few films to try.
const genreGrid = document.getElementById('genre-grid');
const filmGrid = document.getElementById('film-grid');

genres.forEach((genre) => {
  const count = films.filter((film) => film.genre === genre.id).length;
  genreGrid.innerHTML += `<a class="genre-card" href="oracle.html?genre=${genre.id}">
      <span class="genre-emoji">${genre.emoji}</span>
      <span>
        <b>${genre.name}</b>
        <small>${count} films</small>
      </span>
    </a>`;
});

// One film from every genre.
genres.forEach((genre) => {
  const film = films.find((f) => f.genre === genre.id);
  filmGrid.innerHTML += `<div class="film-card">
      ${posterHtml(film)}
      <div class="film-text">
        <h3>${film.title}</h3>
        <p class="meta">${film.year} • ${genre.name}</p>
        <p>${film.description}</p>
      </div>
    </div>`;
});
