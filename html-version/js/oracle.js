// The Oracle: pick a genre, answer two questions, get one film.
const box = document.getElementById('oracle-box');

let chosenGenre = null;
let wantsNewer = null;

function startOracle() {
  chosenGenre = null;
  wantsNewer = null;
  let html = '<p class="step">Step 1 of 3</p><h2>Pick a genre</h2><div class="answers">';
  genres.forEach((genre) => {
    html += `<button class="btn" onclick="pickGenre('${genre.id}')">${genre.name}</button>`;
  });
  box.innerHTML = html + '</div>';
}

function pickGenre(genreId) {
  chosenGenre = genreId;
  ask('Step 2 of 3', 'Do you want a newer film (from 2005 or later)?', 'answerNewer');
}

function answerNewer(answer) {
  wantsNewer = answer;
  const genre = genres.find((g) => g.id === chosenGenre);
  ask('Step 3 of 3', genre.question, 'answerLast');
}

function answerLast(answer) {
  const film = films.find((f) => f.genre === chosenGenre && f.year >= 2005 === wantsNewer && f.extra === answer);
  showResult(film);
}

function ask(step, question, handler) {
  box.innerHTML = `<p class="step">${step}</p>
    <h2>${question}</h2>
    <div class="answers">
      <button class="btn btn-pink" onclick="${handler}(true)">Yes</button>
      <button class="btn" onclick="${handler}(false)">No</button>
    </div>
    <button class="link" onclick="startOracle()">Start over</button>`;
}

function showResult(film) {
  box.innerHTML = `<p class="step">The Oracle picked</p>
    <div class="result">
      ${posterHtml(film)}
      <div>
        <h2>${film.title}</h2>
        <p class="info">${film.year} · ${film.director} · ${hours(film.minutes)}</p>
        <p>${film.description}</p>
        <div class="buttons">
          <button class="btn btn-pink" id="save-button" onclick="saveFilm('${film.id}')"></button>
          <a class="btn" href="film.html?id=${film.id}">More about it</a>
        </div>
        <button class="link" onclick="startOracle()">Ask again</button>
      </div>
    </div>`;
  updateSaveButton(film.id);
}

function saveFilm(id) {
  toggleWatchlist(id);
  updateSaveButton(id);
}

function updateSaveButton(id) {
  document.getElementById('save-button').textContent = isSaved(id) ? '✓ In your watchlist' : '+ Add to watchlist';
}

startOracle();
