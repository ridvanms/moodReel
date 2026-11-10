# MoodReel

**Live site:** https://ridvanms.github.io/moodReel/

Not sure what to watch tonight? Pick a genre, answer two questions from the Oracle and get a film with its description.

Made with HTML, CSS and JavaScript, without frameworks or a build step. Open `index.html` in a browser to run it.

## Pages

| Page | File | What it does |
|---|---|---|
| Home | `index.html` | Intro, a button to the Oracle and all the genres. A genre card starts the Oracle with that genre. |
| Oracle | `oracle.html` | Pick a genre, answer two yes/no questions, get a film with its description |

More pages (genres, a page per film and a watchlist) are ready on the [`later-pages`](https://github.com/ridvanms/moodReel/tree/later-pages) branch for the next stage.

## Files

| File | What it is |
|---|---|
| `css/style.css` | All the styles |
| `js/films.js` | The genres, the Oracle questions and the films |
| `js/common.js` | Code both pages use: film posters and the menu |
| `js/home.js`, `js/oracle.js` | One small script per page |

## How the Oracle chooses

Every genre has four films. The first question is the same for all genres: a newer film (from 2005 or later) or an older one. The second question depends on the genre, for example “Do you want it to be really scary?” for horror. The two answers point to exactly one of the four films.
