// Things both pages use.

function findGenre(id) {
  return genres.find((genre) => genre.id === id);
}

// A film "poster": a box in the film's colour with its genre emoji.
function posterHtml(film) {
  return `<div class="poster" style="background-color: ${film.color}">${findGenre(film.genre).emoji}</div>`;
}

// Mark the current page in the menu.
const page = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('nav a').forEach((link) => {
  if (link.getAttribute('href') === page) {
    link.classList.add('active');
  }
});
