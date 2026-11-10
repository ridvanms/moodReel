# MoodReel

**Live site:** https://ridvanms.github.io/moodReel/

MoodReel helps you decide what to watch tonight. Pick a genre, answer a few questions from the Oracle and get one film with its description, then keep it in your watchlist.

## Pages

| Page | URL | What it does |
|---|---|---|
| **Home** | `#/` | “Ask the Oracle”, “Browse genres” and every genre. |
| **Genres** | `#/genres`, `#/genres/<genre>` | Every genre as a card; a genre page lists its films. |
| **Oracle** | `#/oracle` | Pick a genre (or any) and answer yes/no questions until one film is left. Each question is the one with the highest expected information gain over the films still in the running. |
| **Film** | `#/film/<id>` | Poster, description, content warnings and similar films. |
| **Watchlist** | `#/list` | Saved films and films you have seen. |

A plain HTML, CSS and JavaScript version of the same site, with no build step, lives in [`html-version/`](html-version/).

## Architecture

```mermaid
flowchart LR
  subgraph core["packages/core (pure TypeScript, no dependencies)"]
    C[Catalog · 141 films] --> E[Recommendation engine]
    M[Genre · rules] --> X[Effects → query]
    X --> E
    O[Oracle]
  end
  subgraph server["apps/server (Express 5)"]
    A[REST API + zod validation] --> core
    S[(community.json)] --- A
  end
  subgraph web["apps/web (React 19 + Vite)"]
    UI[Interface] --> R[Remote API client] --> A
    UI --> L[Local API client] --> core
  end
```

- **`packages/core`** – all the logic, shared by the server and the browser: types, catalog, recommendation engine, the draw, the oracle and a natural-language parser (exposed by the API). No external dependencies; 198 tests.
- **`apps/server`** – an Express 5 API with zod validation, rate limiting, helmet (CSP), compression, structured logs, graceful shutdown and a JSON store with atomic writes (temp file + rename) for community votes. In production it also serves the built client.
- **`apps/web`** – the React client. One contract (`Api`) has two implementations: an HTTP client for the server and a local one that runs the engine in the browser. If the server does not answer at startup, the site quietly switches to local mode. The same code therefore also builds into **a single HTML file** that needs no server. Pages use a small hash router (`#/film/up-2009`), so deep links work on GitHub Pages and even from a file opened on disk, with scroll positions restored on Back.
- **Design** – a dark, single-theme screening room: deep navy surfaces, warm off-white text and one hot dark pink (`#e0186f`) reserved for things you can press.

### How a match is scored

1. Every film has a profile on 10 dimensions from 0 to 10: fear, tension, mind-bending, laughs, romance, action, tears, darkness, wonder and pace. Plus the kind of ending (bright / bittersweet / open / sad / bleak), content warnings and an age rating.
2. Every wish is a constraint `{ target, tolerance, min, max, weight }`. The fit on one dimension is Gaussian around the target, with a steep penalty outside min/max.
3. Dimensions combine through a **weighted geometric mean**, so one badly missed wish drags the whole score down, as it should. Similarity to example films (distance in profile space plus Jaccard over themes), genre affinity (“scary” prefers horror over a war film that happens to score 4 on fear) and keywords join the same mean.
4. **Maximal Marginal Relevance** decides which 12 films to show, so the list is not ten copies of the same film.
5. Community votes enter as a small (±5%) Bayesian prior with Beta(2, 2), so one lucky vote cannot launch a film to the top.
6. The `/api/pick` endpoint draws with a softmax over the scores: almost always from the top, but not robotically. (The website itself leaves the choosing to the Oracle.)

### The Oracle

All films start with equal weight. Every question has a soft probability p(film) that the honest answer is “yes”. Each answer (“yes”, “probably”, “don't care”…) updates the weights Bayes-style, with 7% noise because people (and hand-scored profiles) are not perfect. The next question is the one that minimises the expected entropy. The API is stateless: the client sends the history and the server replays it.

## Running it

You need **Node.js 22.12+**.

```bash
git clone https://github.com/ridvanms/moodreel.git
cd moodreel
npm install
npm run dev        # API on :4000 + Vite on :5173 (proxying to the API)
```

Open http://localhost:5173.

| Script | What it does |
|---|---|
| `npm run dev` | Server and client in development mode (hot reload). |
| `npm test` | Every test (core, server, web). |
| `npm run typecheck` | TypeScript check of all three packages. |
| `npm run build` | Production build of the client and an esbuild bundle of the server. |
| `npm start` | Starts the production server on :4000; it also serves the client. |
| `npm run build:static` | The whole site as one HTML file in `apps/web/dist-standalone/`, which works without a server (GitHub Pages, a USB stick, an email attachment). |

### Server settings

| Variable | Default | |
|---|---|---|
| `PORT` | `4000` | |
| `HOST` | `0.0.0.0` | |
| `DATA_DIR` | `./data` | Where `community.json` is stored. |
| `WEB_DIST` | `../web/dist` | The built client; empty means API only. |
| `TRUST_PROXY` | `0` | Number of proxy hops in front of the server (for correct rate limiting). |
| `NODE_ENV` | `development` | `production` switches on JSON logs. |

## API

Every response is JSON; errors look like `{ error, message, issues? }`.

| Method | Path | |
|---|---|---|
| GET | `/api/health` | Is the server alive. |
| GET | `/api/movies` | The catalog (cached for 5 minutes). |
| GET | `/api/movies/:id` | One film plus its 6 nearest neighbours. |
| POST | `/api/parse` | `{ text }` → recognised effects, `replace`/`refine` mode, unknown words, detected mood. |
| POST | `/api/recommend` | `{ query, limit?, seed? }` → results with reasons, plus a report of which film was excluded and why. |
| POST | `/api/pick` | `{ query, seed? }` → the chosen film, the frames for the reel, alternatives. Reproducible by `seed`. |
| POST | `/api/oracle` | `{ history, query? }` → the next question or the verdict. |
| POST | `/api/feedback` | `{ clientId, movieId, verdict, mood? }` – an anonymous vote, one per person every 6 hours. |
| GET | `/api/stats` | The community pulse for the week. |

## Layout

```
moodreel/
├── packages/core/        # engine, parser, oracle, catalog (+ tests)
│   └── src/
│       ├── catalog/      # 141 hand-profiled films
│       ├── engine/       # filters, scoring, MMR, draw, similarity
│       ├── nlp/          # normalisation, vocabulary, titles, parser
│       └── oracle/       # questions and information gain
├── apps/server/          # Express API, store, middleware (+ tests)
└── apps/web/             # React client (+ tests)
    └── src/
        ├── pages/        # home, genres, oracle, film, watchlist
        ├── components/   # header, posters, genre cards, oracle
        ├── lib/          # genres, storage
        └── state/        # store and API context
```

## Notes on the data

- Mood profiles, ending types and content warnings were scored by hand for this project. They are subjective, which is exactly why the interface always shows the numbers and the reasons.
- No posters are downloaded from anywhere: each one is generated in code from the film's palette and genre. No external API keys, no tracking.
- Blurbs contain no spoilers; the kind of ending sits behind a button.
