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
- Virtual scrolling (DOM recycling for large feeds)
- Image placeholder aspect ratios (prevents layout shift during loading)
- Sticky header (shows on scroll up)
- Toggle to show/hide videos and GIFs
- Toggle to expand galleries inline
- Scroll position preservation when toggling options
- Client-side routing with bookmarkable URLs
- Session persistence for all user preferences
- Typeahead search with subreddit/user suggestions
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

The application is split into focused ES2020 modules:

- `index.html` — Main HTML entry point
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

## Android App

An Android WebView wrapper is included in the `android/` directory, allowing the app to run as a native Android application named "Viewer".

### Features (Android-specific)

- Single-column layout optimized for mobile screens
- Dark mode enabled by default
- Compact header: search and controls fit in two rows
- Tap-to-cycle sort selector (workaround for WebView select dropdown issues)
- Biometric/PIN lock: app requires authentication when resuming from background
- Privacy screen: content hidden in app switcher (FLAG_SECURE)
- Reddit API requests proxied through Java to bypass CORS restrictions
- External links open in the system browser

### Setup

1. Install [Android Studio](https://developer.android.com/studio)
2. Copy web assets into the Android project:

   **On Windows:**
   ```bash
   android\copy-web-assets.bat
   ```

   **On Linux/Mac:**
   ```bash
   bash android/copy-web-assets.sh
   ```

3. Open the `android/` folder in Android Studio
4. Let Gradle sync, then run on an emulator or connected device

### Deploying to a Physical Device

1. Enable Developer Options on your phone (tap Build Number 7 times in Settings → About Phone)
2. Enable USB Debugging in Developer Options
3. Connect via USB and select your device in Android Studio's device dropdown
4. Click Run

The app stays installed after disconnecting the USB cable.

### Debugging

- Open Chrome on your PC and go to `chrome://inspect` to get full DevTools for the WebView
- In Android Studio, use the Logcat tab filtered by "WebView" for console messages

### Notes

- The copy-web-assets script compiles TypeScript and copies all web files to `android/app/src/main/assets/web/`
- Cache-busting query params are stripped automatically
- Web assets are served via `WebViewAssetLoader` over a virtual HTTPS origin to support ES modules
- Reddit API calls are proxied through Java (`shouldInterceptRequest`) to avoid CORS issues
- NSFW subreddits may not load due to Reddit API restrictions on unauthenticated requests

### Known Limitations

- Native `<select>` dropdowns don't work in this WebView configuration; sort controls use tap-to-cycle buttons instead
- NSFW content requires Reddit OAuth authentication (not yet implemented)

## Requirements

- Modern browser with ES2020 module support (for web version)
- Internet connection for Reddit API access
- Android Studio with SDK 34 (for Android version)
