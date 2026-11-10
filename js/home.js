// Home page: one card per genre with how many films it has.
const genreGrid = document.getElementById('genre-grid');

genres.forEach((genre) => {
  const count = films.filter((film) => film.genre === genre.id).length;
  const first = films.find((film) => film.genre === genre.id);
  genreGrid.innerHTML += `<a class="genre-card" href="genres.html?genre=${genre.id}" style="border-top-color: ${first.colors[1]}">
      <h3>${genre.name}</h3>
      <p>${count} films</p>
    </a>`;
});
