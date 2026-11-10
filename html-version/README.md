# MoodReel – HTML, CSS and JavaScript version

The same idea as the main site, written with plain HTML, CSS and JavaScript (no frameworks, no build step).

Open `index.html` in a browser, or upload the whole folder to any static host (Netlify, GitHub Pages).

| File | What it is |
|---|---|
| `index.html` | Home: intro and the genres |
| `genres.html` | Films by genre (`genres.html?genre=horror`) |
| `oracle.html` | The Oracle: pick a genre, answer two questions, get a film |
| `film.html` | One film with its description (`film.html?id=coco`) |
| `watchlist.html` | Saved films, kept in the browser with `localStorage` |
| `css/style.css` | All the styles |
| `js/films.js` | The genres, the Oracle questions and the films |
| `js/common.js` | Shared code: watchlist, film cards, menu |
| `js/*.js` | One small script per page |
