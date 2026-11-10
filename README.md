# MoodReel

**Live site:** https://ridvanms.github.io/moodReel/

Not sure what to watch tonight? Answer three short questions and the Oracle picks a film for you, with its description and why it fits.

Made with HTML, CSS and JavaScript, without frameworks or a build step. Open `index.html` in a browser to run it.

## Pages

| Page | File | What it does |
|---|---|---|
| Home | `index.html` | Intro, the genres and a few films to try. A genre opens the Oracle with that genre already chosen. |
| Oracle | `oracle.html` | Three questions on one page (genre, newer or older, and a question for that genre), then one film with its description and why it fits |

More pages (genres, a page per film and a watchlist) are ready on the [`later-pages`](https://github.com/ridvanms/moodReel/tree/later-pages) branch for the next stage.

## Files

| File | What it is |
|---|---|
| `css/style.css` | All the styles |
| `js/films.js` | The genres, the Oracle questions and the films |
| `js/common.js` | Code both pages use: the film poster box and the menu |
| `js/home.js`, `js/oracle.js` | One small script per page |

## How the Oracle chooses

Every genre has four films. After the genre, the Oracle asks whether you want a newer film (from 2005 or later) or an older one, and then a question for that genre, for example “Do you want it to be really scary?” for horror. The two yes/no answers point to exactly one of the four films.
