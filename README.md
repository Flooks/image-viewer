# Reddit Image Viewer

A locally-hosted web application for browsing images and videos from Reddit subreddits and user profiles.

## Features

- Browse images and videos from any subreddit or user profile
- Multiple sort options (Hot, New, Top, Best, Rising, Controversial)
- Timespan filtering for Top and Controversial posts
- Configurable grid layout (1-6 columns)
- Gallery carousel for multi-image posts
- Video playback support
- Client-side routing with bookmarkable URLs
- Session persistence for user preferences

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile TypeScript (optional, for development):
   ```bash
   npm run build
   ```

3. Open `index.html` in your web browser

## Usage

- Enter a subreddit name (e.g., "pics") or username (e.g., "spez")
- Select between subreddit or user profile mode
- Choose sort order and timespan
- Adjust grid columns to your preference
- Toggle video visibility and gallery expand mode

## URL Patterns

- Subreddit: `/r/<subreddit-name>`
- User profile: `/u/<username>`

## Project Structure

- `index.html` - Main HTML structure
- `app.ts` - TypeScript source with type definitions
- `app.js` - Compiled JavaScript (generated)
- `styles.css` - Application styling
- `package.json` - Project configuration
- `tsconfig.json` - TypeScript configuration

## Requirements

- Modern web browser with ES2020 support
- Internet connection to access Reddit API

## License

MIT
