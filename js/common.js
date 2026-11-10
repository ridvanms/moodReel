// Things both pages use.

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

// Mark the current page in the menu.
const page = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('nav a').forEach((link) => {
  if (link.getAttribute('href') === page) {
    link.classList.add('active');
  }
});
