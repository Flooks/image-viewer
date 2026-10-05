---
inclusion: always
---

# Reddit Image Viewer — Project Context

## What This Is

A locally-hosted web application for browsing images, GIFs, and videos from Reddit subreddits and user profiles.

## Architecture

- Client-side SPA using vanilla TypeScript (ES2020 modules, no framework)
- Uses Reddit's OAuth API (`oauth.reddit.com`) via the local server proxy; the server holds the tokens
- Hash-based client-side routing (`#/r/pics`, `#/u/username`)
- Local HTTP server for development (`server.js` on port 8000)

## Project Structure

- `index.html` — entry point, loads `app.js` as ES module
- `reddit-auth.js` — server-side OAuth: opens Chrome (or Playwright's bundled Chromium) for login, intercepts the authorize redirect, stores a permanent refresh token in `.reddit-oauth.json` and refreshes access tokens
- `config.ts` — OAuth client settings (also imported by the server as `config.js`)
- `auth.ts` — OAuthManager: reads login state from `/auth/status`, starts login/logout
- `viewer.html` — full-size image viewer (Reddit redirects direct image navigation to its own media page)
- `types.ts` — all interfaces and type aliases
- `router.ts` — URLRouter (hash-based navigation)
- `validation.ts` — input validation for subreddit/usernames
- `api.ts` — APIClient, ResponseParser, RedgifsClient
- `scroll.ts` — InfiniteScrollManager, VirtualScrollManager
- `state.ts` — StateManager, LoadingIndicator, session storage
- `search.ts` — DebounceManager, SuggestionAPIClient, TypeaheadDropdown, SearchInterface
- `controls.ts` — SortInterface, ColumnSelector, VideoToggle, GalleryExpandToggle, DarkModeToggle, LayoutToggle
- `media.ts` — MetadataDisplay, GalleryCarousel, VideoPlayer, ExternalEmbedPlayer, MediaGallery, ErrorDisplay
- `app.ts` — bootstrap and initialization
- `styles.css` — all styling
- `server.js` — local server (Node.js, `127.0.0.1:8000`): static files, `/browser-proxy/` Reddit proxy, `/auth/*` endpoints, Redgifs proxy

## Key Conventions

- All TypeScript compiles to JS in the same directory (no `dist/` folder)
- Imports use `./module.js` extension (required for ES modules in browser)
- `index.html` uses cache-busting query params (`?v=123`) on script/css tags — bump these when making changes
- User preferences (column count, toggles, dark mode, masonry, sort order, timespan) are saved in `localStorage` (`reddit-image-viewer-preferences`), so they carry across tabs and restarts
- No test framework is currently set up; tests are defined in the spec but not yet implemented

## Build & Run

- `npm run build` — compile TypeScript
- `npm run dev` — compile with watch mode
- `start-server.bat` / `start-server.sh` — start local server on port 8000
- Open `http://localhost:8000`

## Reddit API Details

- Unauthenticated `www.reddit.com/*.json` endpoints were blocked by Reddit in May 2026; the app needs to be logged in
- Subreddit endpoint: `https://oauth.reddit.com/r/{sub}/{sort}?t={timespan}&after={token}&raw_json=1`
- User endpoint: `https://oauth.reddit.com/user/{name}/submitted?sort={sort}&t={timespan}&after={token}&raw_json=1`
- Subreddit suggestions: `https://oauth.reddit.com/api/subreddit_autocomplete_v2?query={q}&include_over_18=true&include_profiles=false&limit=10`
- User suggestions: `https://oauth.reddit.com/search?q={q}&type=user&limit=10`
- All Reddit requests go through `/browser-proxy/`, which adds the bearer token server-side (only for `https://oauth.reddit.com`); the browser never sees the token
- Redgifs videos use a separate API with token-based auth (proxied by `server.js`)
- Reddit redirects direct browser navigation to `i.redd.it`/`preview.redd.it` to its own media page, so clicking an image opens `viewer.html#<url>` for Reddit-hosted images
- Login uses RedReader's client ID (Reddit is not currently issuing new app credentials); switch to own credentials in `config.ts` when available
- Auth endpoints: `GET /auth/status`, `POST /auth/login` (starts login, client polls status), `POST /auth/logout` (revokes the token)
- Google sign-in is blocked in the automated login window; users must sign in to Reddit with username/email

## When Editing

- After changing any `.ts` file, run `npm run build` to recompile
- Bump the `?v=` cache-busting param in `index.html` if changing any `.js` module or `styles.css` (only `app.js` and `styles.css` carry `?v=`; other modules may need a hard refresh, Ctrl+F5)
- Restart the server after changing `server.js`, `reddit-auth.js` or `config.ts`

## Server Security

A permanent Reddit token lives on disk, so keep these in place:
- The server listens on `127.0.0.1` only
- The static handler refuses dotfiles, `node_modules` and paths outside the app folder (`.reddit-oauth.json`, `.reddit-browser-profile/`)
- `/browser-proxy/` and `/auth/*` reject requests whose `Host` isn't `localhost:8000` / `127.0.0.1:8000`
- Proxy responses carry no `Access-Control-Allow-Origin` header, so other websites can't read Reddit data through the proxy

## Keeping Documentation in Sync

When making changes to the codebase, always check whether the following markdown files need updating:

- `README.md` — update if adding/removing features, changing setup steps, altering project structure, or modifying build/run instructions
- `.kiro/specs/reddit-image-viewer/requirements.md` — update if adding new user-facing behavior, changing acceptance criteria, or removing functionality
- `.kiro/specs/reddit-image-viewer/design.md` — update if changing component interfaces, data models, API endpoints, architecture, or adding/removing components
- `.kiro/specs/reddit-image-viewer/tasks.md` — update if adding new implementation tasks, completing existing tasks, or changing task scope
- `.kiro/steering/project-context.md` — update if changing project structure, conventions, build commands, or adding new top-level directories

Do not skip documentation updates. If a code change affects any of the above, update the relevant files in the same pass.
