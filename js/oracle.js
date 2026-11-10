// The Oracle: answer three questions, then the Oracle picks one film.
const form = document.getElementById('oracle-form');
const result = document.getElementById('result');

let answers = { genre: null, newer: null, extra: null };

function showForm() {
  const genre = findGenre(answers.genre);

  let html = '<h3>1. What genre do you feel like?</h3><div class="options">';
  genres.forEach((g) => {
    html += optionButton('genre', g.id, `${g.emoji} ${g.name}`);
  });
  html += '</div>';

  html += '<h3>2. Newer or older film?</h3><div class="options">';
  html += optionButton('newer', true, 'Newer (2005 and later)');
  html += optionButton('newer', false, 'Older (before 2005)');
  html += '</div>';

  if (genre) {
    html += `<h3>3. ${genre.question}</h3><div class="options">`;
    html += optionButton('extra', true, 'Yes');
    html += optionButton('extra', false, 'No');
    html += '</div>';
  } else {
    html += '<h3 class="muted">3. Pick a genre first</h3>';
  }

  const ready = answers.genre && answers.newer !== null && answers.extra !== null;
  html += `<button class="btn" onclick="askOracle()" ${ready ? '' : 'disabled'}>Ask the Oracle</button>`;

  form.innerHTML = html;
}

function optionButton(question, value, label) {
  const selected = answers[question] === value ? 'selected' : '';
  const arg = typeof value === 'string' ? `'${value}'` : value;
  return `<button class="option ${selected}" onclick="choose('${question}', ${arg})">${label}</button>`;
}

function choose(question, value) {
  answers[question] = value;
  // A new genre means a new third question.
  if (question === 'genre') answers.extra = null;
  showForm();
}

function askOracle() {
  const film = films.find((f) => f.genre === answers.genre && f.year >= 2005 === answers.newer && f.extra === answers.extra);
  const genre = findGenre(film.genre);

  form.hidden = true;
  result.hidden = false;
  result.innerHTML = `<p class="label">The Oracle picked for you:</p>
    <div class="result-film">
      ${posterHtml(film)}
      <div>
        <h2>${film.title} (${film.year})</h2>
        <p class="meta">${genre.name} • ${film.minutes} min • ${film.director}</p>
      </div>
    </div>
    <p>${film.description}</p>
    <p class="why">Why it fits: you wanted ${answers.newer ? 'a newer' : 'an older'} ${genre.name.toLowerCase()} film ${genre[answers.extra ? 'yes' : 'no']}.</p>
    <button class="btn btn-ghost" onclick="tryAgain()">↻ Try again with other answers</button>`;
}

function tryAgain() {
  answers = { genre: null, newer: null, extra: null };
  result.hidden = true;
  form.hidden = false;
  showForm();
}

// Coming from a genre on the home page (oracle.html?genre=horror) picks that genre already.
const genreFromLink = new URLSearchParams(location.search).get('genre');
if (findGenre(genreFromLink)) answers.genre = genreFromLink;

showForm();
