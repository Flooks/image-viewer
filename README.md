# Reddit Image Viewer

A locally-hosted web application for browsing images, GIFs, and videos from Reddit subreddits and user profiles.

## Features

- Browse images, GIFs, and videos from any subreddit or user profile
- Multi-subreddit support (e.g. `pics+art+earthporn`)
- GIF playback using Reddit's MP4 variants with click-to-play
- External video embedding (Redgifs) with click-to-play previews
- Gallery carousel with thumbnail previews and loading indicators
- Multiple sort options (Hot, New, Top, Best, Rising, Controversial)
- Timespan filtering for Top and Controversial posts
- Configurable grid layout (1-6 columns)
- Masonry layout option (Pinterest-style)
- Dark mode with persistent preference
- Keyboard navigation (arrow keys for gallery carousels)
- Lazy video loading (videos only load when scrolled into view)
- Infinite scroll with aggressive pre-loading
- Sticky header (shows on scroll up)
- Toggle to show/hide videos and GIFs
- Toggle to expand galleries inline
- Scroll position preservation when toggling options
- Client-side routing with bookmarkable URLs
- Session persistence for all user preferences
- Helpful error messages for missing/banned/private content

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile TypeScript:
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

## Project Structure

- `index.html` — Main HTML
- `app.ts` — TypeScript source
- `app.js` — Compiled JavaScript
- `styles.css` — Styling
- `start-server.sh / .bat` — Server scripts

## Requirements

- Modern browser with ES2020 support
- Internet connection for Reddit API access
