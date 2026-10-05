---
inclusion: always
---

# Reddit Image Viewer — Project Context

## What This Is

A locally-hosted web application for browsing images, GIFs, and videos from Reddit subreddits and user profiles.

## Architecture

- Client-side SPA using vanilla TypeScript (ES2020 modules, no framework)
- Uses Reddit's public JSON API (no authentication required)
- Hash-based client-side routing (`#/r/pics`, `#/u/username`)
- Local HTTP server for development (`server.js` on port 8000)

## Project Structure

- `index.html` — entry point, loads `app.js` as ES module
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
- `server.js` — local dev server (Node.js, port 8000)

## Key Conventions

- All TypeScript compiles to JS in the same directory (no `dist/` folder)
- Imports use `./module.js` extension (required for ES modules in browser)
- `index.html` uses cache-busting query params (`?v=123`) on script/css tags — bump these when making changes
- Session storage is used for user preferences (column count, dark mode, toggles)
- No test framework is currently set up; tests are defined in the spec but not yet implemented

## Build & Run

- `npm run build` — compile TypeScript
- `npm run dev` — compile with watch mode
- `start-server.bat` / `start-server.sh` — start local server on port 8000
- Open `http://localhost:8000`

## Reddit API Details

- Subreddit endpoint: `https://www.reddit.com/r/{sub}/{sort}.json?t={timespan}&after={token}`
- User endpoint: `https://www.reddit.com/user/{name}/submitted/{sort}.json?t={timespan}&after={token}`
- Redgifs videos use a separate API with token-based auth (handled in `api.ts`)
- No Reddit API key needed — uses public JSON endpoints

## When Editing

- After changing any `.ts` file, run `npm run build` to recompile
- Bump the `?v=` cache-busting param in `index.html` if changing `app.js` or `styles.css`

## Keeping Documentation in Sync

When making changes to the codebase, always check whether the following markdown files need updating:

- `README.md` — update if adding/removing features, changing setup steps, altering project structure, or modifying build/run instructions
- `.kiro/specs/reddit-image-viewer/requirements.md` — update if adding new user-facing behavior, changing acceptance criteria, or removing functionality
- `.kiro/specs/reddit-image-viewer/design.md` — update if changing component interfaces, data models, API endpoints, architecture, or adding/removing components
- `.kiro/specs/reddit-image-viewer/tasks.md` — update if adding new implementation tasks, completing existing tasks, or changing task scope
- `.kiro/steering/project-context.md` — update if changing project structure, conventions, build commands, or adding new top-level directories

Do not skip documentation updates. If a code change affects any of the above, update the relevant files in the same pass.
