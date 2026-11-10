// Home page: one card per genre. Clicking it starts the Oracle with that genre.
const genreGrid = document.getElementById('genre-grid');

genres.forEach((genre) => {
  const count = films.filter((film) => film.genre === genre.id).length;
  const first = films.find((film) => film.genre === genre.id);
  genreGrid.innerHTML += `<a class="genre-card" href="oracle.html?genre=${genre.id}" style="border-top-color: ${first.color}">
      <h3>${genre.name}</h3>
      <p>${count} films</p>
    </a>`;
});
