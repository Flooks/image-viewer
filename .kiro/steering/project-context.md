---
inclusion: always
---

# Reddit Image Viewer — Project Context

## What This Is

A locally-hosted web application for browsing images, GIFs, and videos from Reddit subreddits and user profiles. It also has an Android WebView wrapper for mobile use.

## Architecture

- Client-side SPA using vanilla TypeScript (ES2020 modules, no framework)
- Uses Reddit's public JSON API (no authentication required)
- Hash-based client-side routing (`#/r/pics`, `#/u/username`)
- Local HTTP server for development (`server.js` on port 8000)
- Android wrapper at `android/` loads the web app from bundled assets

## Project Structure

- `index.html` — entry point, loads `app.js` as ES module
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
- `android/` — Android WebView wrapper project (Java, Gradle)

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

## Android Wrapper

- Located at `android/`
- App name: "Viewer"
- `android/copy-web-assets.bat` (Windows) or `android/copy-web-assets.sh` (Linux/Mac) — compiles TS and copies web files to `android/app/src/main/assets/web/`
- WebView configured with: JS enabled, DOM storage, inline video playback, no autoplay gesture requirement
- Web assets served via `WebViewAssetLoader` over `https://appassets.androidplatform.net` (required for ES modules)
- Reddit API requests proxied through Java `shouldInterceptRequest` to bypass CORS
- Android-specific UI: single column, dark mode default, compact header, tap-to-cycle sort buttons
- Android detection in JS: `window.location.hostname === 'appassets.androidplatform.net'`
- Android CSS scoped under `body.android-app` class
- Biometric/PIN lock on app resume via `BiometricPrompt`
- `FLAG_SECURE` hides content in app switcher
- External links open in system browser
- Open `android/` in Android Studio to build and deploy

## Reddit API Details

- Subreddit endpoint: `https://www.reddit.com/r/{sub}/{sort}.json?t={timespan}&after={token}`
- User endpoint: `https://www.reddit.com/user/{name}/submitted/{sort}.json?t={timespan}&after={token}`
- Redgifs videos use a separate API with token-based auth (handled in `api.ts`)
- No Reddit API key needed — uses public JSON endpoints

## When Editing

- After changing any `.ts` file, run `npm run build` to recompile
- After changing web files that go into the Android app, run the copy-web-assets script
- Bump the `?v=` cache-busting param in `index.html` if changing `app.js` or `styles.css`
- The Android `index.html` copy has cache-busting params stripped automatically by the copy script

## Keeping Documentation in Sync

When making changes to the codebase, always check whether the following markdown files need updating:

- `README.md` — update if adding/removing features, changing setup steps, altering project structure, or modifying build/run instructions
- `.kiro/specs/reddit-image-viewer/requirements.md` — update if adding new user-facing behavior, changing acceptance criteria, or removing functionality
- `.kiro/specs/reddit-image-viewer/design.md` — update if changing component interfaces, data models, API endpoints, architecture, or adding/removing components
- `.kiro/specs/reddit-image-viewer/tasks.md` — update if adding new implementation tasks, completing existing tasks, or changing task scope
- `.kiro/steering/project-context.md` — update if changing project structure, conventions, build commands, or adding new top-level directories

Do not skip documentation updates. If a code change affects any of the above, update the relevant files in the same pass.
