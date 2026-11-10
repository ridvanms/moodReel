# MoodReel

**Live site:** https://ridvanms.github.io/moodReel/

Not sure what to watch tonight? Pick a genre, answer two questions from the Oracle and get a film with its description. Save the films you like to your watchlist.

Made with HTML, CSS and JavaScript, without frameworks or a build step. Open `index.html` in a browser to run it.

## Pages

| Page | File | What it does |
|---|---|---|
| Home | `index.html` | Intro, a button to the Oracle and all the genres |
| Genres | `genres.html` | The films of a genre (`genres.html?genre=horror`) |
| Oracle | `oracle.html` | Pick a genre, answer two yes/no questions, get a film |
| Film | `film.html` | One film with its description (`film.html?id=coco`) |
| Watchlist | `watchlist.html` | The films you saved |

## Files

| File | What it is |
|---|---|
| `css/style.css` | All the styles |
| `js/films.js` | The genres, the Oracle questions and the films |
| `js/common.js` | Code every page uses: the watchlist, film cards and the menu |
| `js/home.js`, `js/genres.js`, `js/oracle.js`, `js/film.js`, `js/watchlist.js` | One small script per page |

The watchlist is saved in the browser with `localStorage`, so it stays after you close the page.

## How the Oracle chooses

Every genre has four films. The first question is the same for all genres: a newer film (from 2005 or later) or an older one. The second question depends on the genre, for example “Do you want it to be really scary?” for horror. The two answers point to exactly one of the four films.
