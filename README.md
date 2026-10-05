# Reddit Image Viewer

A locally-hosted web application for browsing images, GIFs, and videos from Reddit subreddits and user profiles.

## Features

- Browse images, GIFs, and videos from any subreddit or user profile
- Multi-subreddit support (e.g. `pics+art+earthporn`)
- GIF playback using Reddit's MP4 variants with click-to-play
- External video embedding (Redgifs) with click-to-play previews
- Gallery carousel with thumbnail previews and loading indicators
- Click an image to open it full size in a new tab (local viewer page)
- Post score and upvote percentage shown next to each post's age
- Multiple sort options (Hot, New, Top, Best, Rising, Controversial)
- Timespan filtering for Top and Controversial posts
- Configurable grid layout (1-6 columns)
- Masonry layout option (Pinterest-style)
- Dark mode with persistent preference
- Keyboard navigation (arrow keys for gallery carousels)
- Lazy video loading (videos only load when scrolled into view)
- Infinite scroll with aggressive pre-loading
- Virtual scrolling (DOM recycling for large feeds)
- Image placeholder aspect ratios (prevents layout shift during loading)
- Sticky header (shows on scroll up)
- Toggle to show/hide videos and GIFs
- Toggle to expand galleries inline
- Scroll position preservation when toggling options
- Client-side routing with bookmarkable URLs
- Ctrl/Cmd/Shift-click or middle-click subreddit and user links to open them in a new tab
- Preferences (columns, toggles, dark mode, sort order and timespan) remembered across tabs and restarts
- Typeahead search with subreddit/user suggestions
- Reddit login handled by the local server — log in once and stay logged in
- Helpful error messages for missing/banned/private content

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile TypeScript (the compiled `.js` files are committed, so this is only needed after editing `.ts` files):
   ```bash
   npm run build
   ```

3. Start the local server:

   **On Windows:**
   - Double-click `start-server.bat` for a visible console window
   - Or double-click `start-server-hidden.vbs` to run in background

   **On Ubuntu/Linux:**
   ```bash
   chmod +x start-server.sh restart-server.sh stop-server.sh
   ./start-server.sh          # foreground
   ./restart-server.sh        # background
   ./stop-server.sh           # stop
   ```

4. Open `http://localhost:8000`

5. Click **Login with Reddit**. A Chrome window opens at Reddit's authorization page: log in if asked and click **Allow**. The window closes by itself and you stay logged in — the server keeps a permanent refresh token in `.reddit-oauth.json` and renews access automatically. You only need to do this once.

   The login window uses Google Chrome if it's installed, otherwise Playwright's bundled Chromium. On Linux without Chrome, run `npx playwright install chromium` once (a desktop session is needed for the window to appear).

   **Sign in with your Reddit username/email, not "Continue with Google".** Google blocks sign-in from automated browser windows ("This browser or app may not be secure"). Use a password or Reddit's emailed one-time code instead; if your account only has Google sign-in, add a password in Reddit's account settings first.

   The server only listens on `127.0.0.1`, so the app is reachable from this machine only.

## Usage

- Enter a subreddit name (e.g. `pics`) or combine multiple with `+` (e.g. `pics+art`)
- Switch between subreddit and user profile mode
- Use sort order and timespan dropdowns to filter content
- Adjust column count and toggle masonry layout
- Use left/right arrow keys to navigate gallery carousels
- Toggle dark mode, video/GIF visibility, and gallery expansion

## URL Patterns

- Subreddit: `#/r/<name>` (e.g. `#/r/pics+art`)
- User profile: `#/u/<username>`

## Login Notes

- The login is stored in `.reddit-oauth.json` (never committed or served by the server). Treat it like a password.
- To log in on another machine without the login window, copy `.reddit-oauth.json` into its app folder and restart the server. Both machines then share the login, so **Logout on either one logs out both** (it revokes the token with Reddit).
- The login window keeps its own browser profile in `.reddit-browser-profile/`, so later logins are usually just a click on **Allow**.
- Login currently uses RedReader's Reddit client ID because Reddit isn't issuing new app credentials. When you have your own, set `USE_OWN_CREDENTIALS` and the values in `config.ts`, then run `npm run build`.
- If the server console shows `[Auth]` errors, those lines show which step of the login failed.

## Project Structure

The application is split into focused ES2020 modules:

- `index.html` — Main HTML entry point
- `server.js` — Local server: static files, Reddit API proxy (adds the OAuth token), Redgifs proxy
- `reddit-auth.js` — Server-side Reddit OAuth (login window, token storage and refresh)
- `config.ts` — OAuth client settings
- `auth.ts` — OAuthManager (login state in the browser)
- `viewer.html` — Full-size image viewer opened when clicking an image
- `types.ts` — All interfaces and type aliases
- `router.ts` — URLRouter class (hash-based navigation)
- `validation.ts` — Input validation for subreddit names and usernames
- `api.ts` — APIClient and ResponseParser (Reddit API communication)
- `scroll.ts` — InfiniteScrollManager and VirtualScrollManager
- `state.ts` — StateManager, LoadingIndicator, session storage utilities
- `search.ts` — DebounceManager, SuggestionAPIClient, TypeaheadDropdown, SearchInterface
- `controls.ts` — SortInterface, ColumnSelector, VideoToggle, GalleryExpandToggle, DarkModeToggle, LayoutToggle
- `media.ts` — MetadataDisplay, GalleryCarousel, VideoPlayer, ExternalEmbedPlayer, MediaGallery, ErrorDisplay
- `app.ts` — Bootstrap and initialization
- `styles.css` — All styling

## Requirements

- Node.js (for the local server)
- Modern browser with ES2020 module support
- Google Chrome, or Chromium via `npx playwright install chromium`, for the one-time login window
- Internet connection for Reddit API access
