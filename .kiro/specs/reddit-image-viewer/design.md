# Design Document: Reddit Image Viewer

## Overview

The Reddit Image Viewer is a client-side web application that provides an intuitive interface for browsing images and videos from Reddit subreddits and user profiles. It is served by a small local Node.js server (`server.js`) that proxies Reddit's OAuth API (`oauth.reddit.com`) and handles login (see component 14). Reddit blocked its unauthenticated `.json` endpoints in May 2026, so the original no-authentication design no longer applies.

> Note: the "Implementation Details" sections later in this document describe the original design and still show `www.reddit.com/*.json` URLs in their code samples. The endpoints actually used are listed under components 2 and 8c.

The system follows a single-page application (SPA) architecture with client-side routing, allowing users to bookmark specific subreddits or user profiles and navigate using browser history. The interface provides flexible viewing options including sort order selection, timespan filtering, grid layout customization, and gallery display modes.

Key design goals:
- Simple local deployment: one local Node.js server, no external hosting
- Responsive grid-based layout with configurable column counts
- Efficient media loading with progressive rendering
- Intuitive navigation between subreddits and user profiles
- Robust error handling for API failures and missing content

## Architecture

### System Architecture

The application uses a client-side architecture with the following layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Environment                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Presentation Layer (UI)                  │  │
│  │  - Search Interface                                   │  │
│  │  - Source Selector (Subreddit/User)                   │  │
│  │  - Sort Interface (Order + Timespan)                  │  │
│  │  - Column Selector                                    │  │
│  │  - Video Toggle Control                               │  │
│  │  - Gallery Expand Toggle                              │  │
│  │  - Media Gallery (Grid Layout)                        │  │
│  │  - Metadata Display                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↕                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Application Layer                        │  │
│  │  - URL Router                                         │  │
│  │  - State Manager                                      │  │
│  │  - Media Filter                                       │  │
│  │  - Gallery Processor                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↕                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Data Layer                               │  │
│  │  - API Client                                         │  │
│  │  - Response Parser                                    │  │
│  │  - Preferences (localStorage)                         │  │
│  │  - OAuth Manager (login state only)                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕
              ┌──────────────────────────────┐
              │  Local server (server.js)    │
              │  - /browser-proxy/ (+ token) │
              │  - /auth/* (reddit-auth.js)  │
              └──────────────────────────────┘
                           ↕
              ┌──────────────────────────────┐
              │  Reddit OAuth API            │
              │  (oauth.reddit.com)          │
              └──────────────────────────────┘
```

### Component Interaction Flow

1. **User Input Flow**: User enters subreddit/username → URL Router updates browser URL → State Manager triggers API request
2. **Typeahead Flow**: User types in search input → Debounce Manager delays request → Suggestion API Client fetches suggestions → Typeahead Dropdown displays results → User selects suggestion → Search input populated → Content loads
3. **Data Fetch Flow**: API Client requests data → Response Parser extracts media posts → Media Filter applies video toggle → Gallery Processor handles gallery posts → Media Gallery renders content
4. **Navigation Flow**: User clicks author link → URL Router updates URL → State Manager loads new content
5. **Configuration Flow**: User changes settings (columns, sort, etc.) → State Manager updates → UI re-renders with new configuration

### Typeahead Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SearchInterface                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Input Field                                          │  │
│  │  [User types here...]                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  TypeaheadDropdown (positioned below input)          │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ ▸ r/programming (1.2M subscribers)              │ │  │
│  │  │ ▸ r/programmerhumor (800K subscribers)          │ │  │
│  │  │ ▸ r/programminghorror (150K subscribers)        │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Internal Components:                                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ DebounceManager  │  │ SuggestionAPI    │                │
│  │ - 300ms delay    │  │ - Fetch results  │                │
│  │ - Cancel timer   │  │ - Cancel requests│                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘

Event Flow:
1. User types → input event
2. DebounceManager starts 300ms timer
3. If user types again → cancel timer, start new timer
4. Timer expires → SuggestionAPIClient.fetch()
5. API returns results → TypeaheadDropdown.show(suggestions)
6. User clicks suggestion → populate input + load content
```

## Components and Interfaces

### 1. URL Router

**Responsibility**: Manages browser URL synchronization and routing

**Interface**:
```typescript
interface URLRouter {
  // Parse current URL and extract content source
  parseURL(): ContentSource | null;
  
  // Update browser URL based on content source
  updateURL(source: ContentSource): void;
  
  // Initialize routing and set up history listeners
  initialize(): void;
  
  // Navigate to a content source
  navigateTo(source: ContentSource): void;
}

type ContentSource = 
  | { type: 'subreddit', name: string }
  | { type: 'user', username: string };
```

**URL Patterns**:
- Subreddit: `/r/<subreddit-name>`
- User profile: `/u/<username>`
- Root: `/` (no content loaded)

### 2. API Client

**Responsibility**: Communicates with Reddit's OAuth API through the local proxy

**Interface**:
```typescript
interface APIClient {
  // Fetch posts from a subreddit
  fetchSubreddit(
    subreddit: string,
    sortOrder: SortOrder,
    timespan?: Timespan,
    after?: string
  ): Promise<RedditAPIResult>;
  
  // Fetch posts from a user profile
  fetchUserPosts(
    username: string,
    sortOrder: SortOrder,
    timespan?: Timespan,
    after?: string
  ): Promise<RedditAPIResult>;
}

interface RedditAPIResult {
  posts: RedditPost[];
  after: string | null;
}

type SortOrder = 'hot' | 'new' | 'top' | 'best' | 'rising' | 'controversial';
type Timespan = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
```

**API Endpoints** (requested as `/browser-proxy/<encoded URL>`):
- Subreddit: `https://oauth.reddit.com/r/{subreddit}/{sort}?t={timespan}&after={after}&raw_json=1`
- User: `https://oauth.reddit.com/user/{username}/submitted?sort={sort}&t={timespan}&after={after}&raw_json=1`

**Headers**:
- The local server adds `Authorization: Bearer <token>` and the configured `User-Agent`; the browser sends no auth headers

### 3. Response Parser

**Responsibility**: Extracts media content from Reddit API responses

**Interface**:
```typescript
interface ResponseParser {
  // Parse Reddit API response and extract media posts
  parseResponse(response: RedditAPIResponse): ParsedResult;
  
  // Extract image URL from post data
  extractImageURL(post: RedditPostData): string | null;
  
  // Extract video data from post data
  extractVideoData(post: RedditPostData): VideoData | null;
  
  // Extract gallery data from post data
  extractGalleryData(post: RedditPostData): GalleryData | null;
}

interface ParsedResult {
  mediaPosts: MediaPost[];
  after: string | null;
}

interface VideoData {
  url: string;
  fallbackURL?: string;
}

interface GalleryData {
  images: string[];
}
```

**Supported Image Formats**: JPEG, PNG, GIF, WEBP

### 4. State Manager

**Responsibility**: Manages application state and coordinates component updates

**Interface**:
```typescript
interface StateManager {
  // Current content source
  contentSource: ContentSource | null;
  
  // Sort configuration
  sortOrder: SortOrder;
  timespan: Timespan;
  
  // Display configuration
  columnCount: number;
  showVideos: boolean;
  expandGalleries: boolean;
  
  // Loaded content
  mediaPosts: MediaPost[];
  
  // Pagination state
  paginationToken: string | null;
  hasMoreContent: boolean;
  
  // Loading and error states
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  
  // Update methods
  setContentSource(source: ContentSource): void;
  setSortOrder(order: SortOrder): void;
  setTimespan(timespan: Timespan): void;
  setColumnCount(count: number): void;
  setShowVideos(show: boolean): void;
  setExpandGalleries(expand: boolean): void;
  
  // Load content
  loadContent(): Promise<void>;
  loadMoreContent(): Promise<void>;
}
```

### 5. Media Gallery

**Responsibility**: Renders media content in a grid layout

**Interface**:
```typescript
interface MediaGallery {
  // Render the gallery with current media posts
  render(posts: MediaPost[], config: GalleryConfig): void;
  
  // Clear the gallery
  clear(): void;
}

interface GalleryConfig {
  columnCount: number;
  showVideos: boolean;
  expandGalleries: boolean;
}
```

**Layout**: CSS Grid with configurable column count (1-6 columns)

### 6. Gallery Carousel

**Responsibility**: Displays gallery posts with navigation controls

**Interface**:
```typescript
interface GalleryCarousel {
  // Render carousel for a gallery post
  render(gallery: GalleryData, metadata: PostMetadata): HTMLElement;
  
  // Navigate to next image
  next(): void;
  
  // Navigate to previous image
  previous(): void;
  
  // Get current image index
  getCurrentIndex(): number;
}
```

### 7. Video Player

**Responsibility**: Renders embedded Reddit videos

**Interface**:
```typescript
interface VideoPlayer {
  // Render video player for a video post
  render(video: VideoData, metadata: PostMetadata): HTMLElement;
  
  // Pause video playback
  pause(): void;
}
```

### 8. Search Interface

**Responsibility**: Provides input for subreddit/username entry with typeahead suggestions

**Interface**:
```typescript
interface SearchInterface {
  // Render the search UI
  render(): HTMLElement;
  
  // Get current input value
  getValue(): string;
  
  // Get current source type (subreddit or user)
  getSourceType(): 'subreddit' | 'user';
  
  // Validate input
  validate(): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

**Validation Rules**:
- Subreddit: alphanumeric characters and underscores
- Username: alphanumeric characters, underscores, and hyphens
- Both: non-empty

### 8a. Typeahead Dropdown

**Responsibility**: Displays search suggestions as the user types

**Interface**:
```typescript
interface TypeaheadDropdown {
  // Show the dropdown with suggestions
  show(suggestions: SearchSuggestion[]): void;
  
  // Hide the dropdown
  hide(): void;
  
  // Check if dropdown is currently visible
  isVisible(): boolean;
  
  // Clear all suggestions
  clear(): void;
  
  // Get the currently active (highlighted) suggestion
  getActiveSuggestion(): SearchSuggestion | null;
  
  // Set the active suggestion by index
  setActiveSuggestion(index: number): void;
  
  // Handle keyboard navigation (up/down arrows)
  handleKeyboardNavigation(key: 'ArrowUp' | 'ArrowDown' | 'Enter' | 'Escape'): void;
}

interface SearchSuggestion {
  name: string;
  type: 'subreddit' | 'user';
  subscribers?: number; // For subreddits
  iconUrl?: string; // Optional icon
}
```

**Behavior**:
- Displays up to 10 suggestions
- Highlights suggestions on hover
- Supports keyboard navigation (arrow keys, Enter, Escape)
- Positioned directly below the search input
- Hidden when input is empty or has fewer than 2 characters
- Hidden on outside click, Escape key, or suggestion selection

### 8b. Debounce Manager

**Responsibility**: Delays API requests until user stops typing

**Interface**:
```typescript
interface DebounceManager {
  // Schedule a function to run after the debounce delay
  debounce(fn: () => void, delay: number): void;
  
  // Cancel any pending debounced function
  cancel(): void;
}
```

**Configuration**:
- Debounce delay: 300 milliseconds
- Cancels previous pending requests when new input is received

### 8c. Suggestion API Client

**Responsibility**: Fetches search suggestions from Reddit API

**Interface**:
```typescript
interface SuggestionAPIClient {
  // Fetch subreddit suggestions
  fetchSubredditSuggestions(query: string, signal?: AbortSignal): Promise<SearchSuggestion[]>;
  
  // Fetch username suggestions
  fetchUsernameSuggestions(query: string, signal?: AbortSignal): Promise<SearchSuggestion[]>;
  
  // Cancel all pending requests
  cancelPendingRequests(): void;
}
```

**API Endpoints** (requested through `/browser-proxy/`, so they need the user to be logged in; when logged out the proxy returns 401 and no suggestions are shown):
- Subreddit search: `https://oauth.reddit.com/api/subreddit_autocomplete_v2?query={query}&include_over_18=true&include_profiles=false&limit=10&raw_json=1`
- User search: `https://oauth.reddit.com/search?q={query}&type=user&limit=10&raw_json=1`

**Request Cancellation**:
- Uses AbortController to cancel pending requests
- Each new request cancels the previous one
- Prevents race conditions from out-of-order responses

### 9. Sort Interface

**Responsibility**: Provides controls for sort order and timespan selection

**Interface**:
```typescript
interface SortInterface {
  // Render the sort controls
  render(currentSort: SortOrder, currentTimespan: Timespan): HTMLElement;
  
  // Get selected sort order
  getSortOrder(): SortOrder;
  
  // Get selected timespan
  getTimespan(): Timespan;
  
  // Show/hide timespan controls based on sort order
  updateTimespanVisibility(sortOrder: SortOrder): void;
}
```

### 10. Column Selector

**Responsibility**: Provides dropdown for column count selection

**Interface**:
```typescript
interface ColumnSelector {
  // Render the column selector
  render(currentCount: number): HTMLElement;
  
  // Get selected column count
  getColumnCount(): number;
}
```

### 11. Metadata Display

**Responsibility**: Renders post metadata with clickable links

**Interface**:
```typescript
interface MetadataDisplay {
  // Render metadata for a media item
  render(metadata: PostMetadata): HTMLElement;
}

interface PostMetadata {
  title: string;
  author: string;
  postURL: string;
  subreddit?: string;
  createdDate?: number;   // created_utc (seconds)
  score?: number;         // net score (Reddit no longer exposes separate up/down counts)
  upvoteRatio?: number;   // 0..1
}
```

**Layout**: title link on the first line; the second line shows `r/subreddit • u/author` on the left and `▲ 12.3k 94% · 5h ago` on the right. The score is abbreviated (k/m); hovering shows the exact points, and hovering the age shows dd/mm/yyyy. Subreddit and author links navigate in-app on a plain click, but Ctrl/Cmd/Shift-click and middle-click are left to the browser so they open a new tab/window.

### 12. Infinite Scroll Manager

**Responsibility**: Detects scroll position and triggers loading more content

**Interface**:
```typescript
interface InfiniteScrollManager {
  // Initialize scroll listener
  initialize(onLoadMore: () => Promise<void>): void;
  
  // Check if user has scrolled near bottom
  checkScrollPosition(): boolean;
  
  // Enable/disable scroll detection
  setEnabled(enabled: boolean): void;
  
  // Clean up scroll listeners
  destroy(): void;
}
```

**Scroll Detection**:
- Threshold: 500 pixels from bottom
- Uses `window.scrollY`, `document.documentElement.scrollHeight`, and `window.innerHeight`
- Debounces scroll events to prevent excessive checks

### 13. Loading Indicator

**Responsibility**: Displays loading state at bottom of gallery

**Interface**:
```typescript
interface LoadingIndicator {
  // Show loading indicator
  show(): void;
  
  // Hide loading indicator
  hide(): void;
  
  // Show "no more content" message
  showEndMessage(): void;
  
  // Show error with retry button
  showError(message: string, onRetry: () => void): void;
}
```

### 14. Authentication (server-side OAuth)

**Responsibility**: Logs in to Reddit and supplies access tokens for API requests

**Server (`reddit-auth.js`, routes in `server.js`)**:
- `POST /auth/login` starts the login (single-flight) and returns immediately; `GET /auth/status` returns `{ configured, authenticated, loginInProgress, lastError }`; `POST /auth/logout` revokes the refresh token and deletes the token file
- Login opens Chrome (or Playwright's bundled Chromium) with a persistent profile in `.reddit-browser-profile/` at `https://www.reddit.com/api/v1/authorize` with `response_type=code`, `duration=permanent`
- When the user clicks Allow, Reddit's authorize POST responds with a redirect to the configured redirect URI (RedReader's `redreader://rr_oauth_redir`, which a browser can't hand back). The server intercepts that POST with `context.route`, fetches it with `maxRedirects: 0`, reads the `Location` header, checks `state`, and exchanges the code at `/api/v1/access_token` (Basic auth `clientId:` with an empty secret)
- The refresh token is stored in `.reddit-oauth.json`; access tokens are refreshed 5 minutes before expiry; an `invalid_grant` on refresh clears the stored login
- `/browser-proxy/` adds `Authorization: Bearer <token>` only for `https://oauth.reddit.com` URLs and returns 401 when not logged in

**Client (`auth.ts`, `OAuthManager`)**:
- Fetches `/auth/status` before the first content load, so the first request uses the right API
- Starts login and polls status every 1.5 s until it finishes; re-checks status when the proxy returns 401
- `AuthUI` (in `app.ts`) shows Login / "Log in using the Chrome window…" / Logged in + Logout / Login failed

**Configuration (`config.ts`)**: `clientId`, optional `clientSecret`, `redirectUri`, `userAgent`, `scope` (`read history`). Imported by both the browser code and the server.

**Constraints**: Google sign-in is blocked in the automated window, so users sign in with Reddit username/email. The server binds to `127.0.0.1`, refuses dotfiles and paths outside the app folder, checks the `Host` header on API routes, and sends no wildcard CORS header.

### 15. Full-Size Image Viewer

**Responsibility**: Shows a full-size image in a new tab

Reddit redirects top-level navigation to `i.redd.it`/`preview.redd.it` to its own media page, so clicks on Reddit-hosted images open `viewer.html#<encoded image URL>`, which loads the image as an `<img>` (image requests aren't redirected). The viewer only accepts `https:` URLs on Reddit or Imgur hosts and assigns them via `img.src`. Clicking the image toggles between fit-to-screen and natural size. Images on other hosts open directly.

## Data Models

### MediaPost

Represents a single media item (image, video, or gallery) from Reddit:

```typescript
type MediaPost = ImagePost | VideoPost | GalleryPost;

interface ImagePost {
  type: 'image';
  url: string;
  metadata: PostMetadata;
}

interface VideoPost {
  type: 'video';
  videoData: VideoData;
  metadata: PostMetadata;
}

interface GalleryPost {
  type: 'gallery';
  galleryData: GalleryData;
  metadata: PostMetadata;
}

interface PostMetadata {
  title: string;
  author: string;
  postURL: string;
}

interface VideoData {
  url: string;
  fallbackURL?: string;
}

interface GalleryData {
  images: string[];
}
```

### ContentSource

Represents the source of content being viewed:

```typescript
type ContentSource = 
  | { type: 'subreddit', name: string }
  | { type: 'user', username: string };
```

### ApplicationState

Represents the complete application state:

```typescript
interface ApplicationState {
  // Content source
  contentSource: ContentSource | null;
  
  // Sort configuration
  sortOrder: SortOrder;
  timespan: Timespan;
  
  // Display configuration
  columnCount: number;
  showVideos: boolean;
  expandGalleries: boolean;
  
  // Loaded content
  mediaPosts: MediaPost[];
  
  // Pagination state
  paginationToken: string | null;
  hasMoreContent: boolean;
  
  // UI state
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

type SortOrder = 'hot' | 'new' | 'top' | 'best' | 'rising' | 'controversial';
type Timespan = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
```

### RedditAPIResponse

Represents the structure of Reddit's JSON API response:

```typescript
interface RedditAPIResponse {
  kind: 'Listing';
  data: {
    children: RedditPostWrapper[];
    after: string | null;
    before: string | null;
  };
}

interface RedditPostWrapper {
  kind: 't3';
  data: RedditPostData;
}

interface RedditPostData {
  title: string;
  author: string;
  permalink: string;
  url: string;
  post_hint?: string;
  is_video?: boolean;
  media?: {
    reddit_video?: {
      fallback_url: string;
      hls_url: string;
    };
  };
  gallery_data?: {
    items: Array<{
      media_id: string;
    }>;
  };
  media_metadata?: {
    [key: string]: {
      s?: {
        u?: string;
      };
    };
  };
}
```

### SessionStorage (preferences)

Despite the interface name, preferences are stored in `localStorage` (key `reddit-image-viewer-preferences`) so they carry across tabs and restarts:

```typescript
interface SessionStorage {
  columnCount: number;
  showVideos: boolean;
  expandGalleries: boolean;
  darkMode: boolean;
  masonryLayout: boolean;
  sortOrder?: SortOrder;
  timespan?: Timespan;
}
```

### SearchSuggestion

Represents a single search suggestion in the typeahead dropdown:

```typescript
interface SearchSuggestion {
  name: string;
  type: 'subreddit' | 'user';
  subscribers?: number; // For subreddits
  iconUrl?: string; // Optional icon for visual enhancement
}
```

### TypeaheadState

Represents the state of the typeahead dropdown:

```typescript
interface TypeaheadState {
  isVisible: boolean;
  suggestions: SearchSuggestion[];
  activeSuggestionIndex: number; // -1 if no suggestion is active
  isLoading: boolean;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Subreddit name validation accepts valid characters

*For any* string containing only alphanumeric characters and underscores, the subreddit name validation should accept it as valid.

**Validates: Requirements 1.3**

### Property 2: Username validation accepts valid characters

*For any* string containing only alphanumeric characters, underscores, and hyphens, the username validation should accept it as valid.

**Validates: Requirements 1.4**

### Property 3: Subreddit API requests use correct endpoint format

*For any* valid subreddit name, sort order, and optional timespan, the API client should construct a request URL matching the pattern `https://www.reddit.com/r/{subreddit}/{sort}.json` with the timespan parameter when applicable.

**Validates: Requirements 2.1, 9.1**

### Property 4: User profile API requests use correct endpoint format

*For any* valid username, sort order, and optional timespan, the API client should construct a request URL matching the pattern `https://www.reddit.com/user/{username}/submitted/{sort}.json` with the timespan parameter when applicable.

**Validates: Requirements 2.2, 9.1**

### Property 5: Response parser extracts all media post types

*For any* valid Reddit API response containing image posts, video posts, and gallery posts, the response parser should extract all three types of media posts correctly.

**Validates: Requirements 2.3**

### Property 6: Media filtering includes only posts with valid media

*For any* collection of Reddit posts, the media filter should include only those posts that contain valid image URLs, video data, or gallery data.

**Validates: Requirements 2.4**

### Property 7: Image format recognition supports common formats

*For any* image URL ending with .jpg, .jpeg, .png, .gif, or .webp extensions (case-insensitive), the system should recognize it as a valid image format.

**Validates: Requirements 2.5**

### Property 8: Video post identification detects Reddit video data

*For any* Reddit post data structure, the system should identify it as a video post if and only if it contains video data in the expected structure (is_video flag or media.reddit_video object).

**Validates: Requirements 2.6**

### Property 9: Gallery post identification detects gallery data

*For any* Reddit post data structure, the system should identify it as a gallery post if and only if it contains gallery_data with multiple images.

**Validates: Requirements 2.7**

### Property 10: Media gallery renders all media items with titles

*For any* collection of media posts (images, videos, galleries), the media gallery should render each item with its associated title displayed.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 15.2**

### Property 11: API error responses produce user-friendly messages

*For any* error response from the Reddit API, the system should display a user-friendly error message rather than exposing technical error details.

**Validates: Requirements 4.1**

### Property 12: Sort order selection updates API request parameters

*For any* sort order selection (hot, new, top, best, rising, controversial), the system should include the selected sort order in the API request.

**Validates: Requirements 7.2, 7.4**

### Property 13: Sort interface provides consistent options across content types

*For any* content source type (subreddit or user profile), the sort interface should provide the same set of sort order options.

**Validates: Requirements 7.5**

### Property 14: Timespan visibility depends on sort order

*For any* sort order, the timespan options should be visible if and only if the sort order is "top" or "controversial".

**Validates: Requirements 8.1, 8.5**

### Property 15: Timespan selection updates API request parameters

*For any* timespan selection (hour, day, week, month, year, all) when sort order is top or controversial, the system should include the selected timespan in the API request.

**Validates: Requirements 8.3**

### Property 16: Timespan options consistent across content types

*For any* content source type (subreddit or user profile) with top or controversial sorting, the timespan interface should provide the same set of timespan options.

**Validates: Requirements 8.6**

### Property 17: API requests include required headers

*For any* API request to Reddit, the request should include a User-Agent header.

**Validates: Requirements 9.2**

### Property 18: Video posts render with playable video elements

*For any* video post, the video player should render an HTML video element with the video URL.

**Validates: Requirements 10.1, 10.4**

### Property 19: Navigation pauses playing videos

*For any* video that is currently playing, navigating to a different content source should pause the video.

**Validates: Requirements 10.5**

### Property 20: Video toggle filters displayed content

*For any* collection of media posts, when the video toggle is set to hide videos, the media gallery should display only image posts and gallery posts, excluding video posts.

**Validates: Requirements 11.2**

### Property 21: Video toggle shows all content when enabled

*For any* collection of media posts, when the video toggle is set to show videos, the media gallery should display all post types including video posts.

**Validates: Requirements 11.3**

### Property 22: Video toggle state updates gallery immediately

*For any* video toggle state change, the media gallery should re-render with the updated filtering applied.

**Validates: Requirements 11.5**

### Property 23: Video toggle preference persists in session

*For any* video toggle state, the state should be stored in session storage and retrieved when the page is reloaded during the same session.

**Validates: Requirements 11.6**

### Property 24: Gallery carousel displays first image by default

*For any* gallery post, the gallery carousel should initially display the first image (index 0) from the gallery.

**Validates: Requirements 12.1, 14.1**

### Property 25: Carousel next navigation advances image index

*For any* gallery carousel not displaying the last image, calling the next() method should increment the current image index by 1.

**Validates: Requirements 12.3**

### Property 26: Carousel previous navigation decrements image index

*For any* gallery carousel not displaying the first image, calling the previous() method should decrement the current image index by 1.

**Validates: Requirements 12.4**

### Property 27: Gallery expand toggle controls display mode

*For any* collection of gallery posts, when the gallery expand toggle is set to carousel mode, galleries should be rendered as carousels; when set to expanded mode, all gallery images should be rendered individually in the grid.

**Validates: Requirements 13.3, 13.4**

### Property 28: Gallery expand toggle state updates gallery immediately

*For any* gallery expand toggle state change, the media gallery should re-render all gallery posts with the updated display mode.

**Validates: Requirements 13.5**

### Property 29: Gallery expand toggle preference persists in session

*For any* gallery expand toggle state, the state should be stored in session storage and retrieved when the page is reloaded during the same session.

**Validates: Requirements 13.6**

### Property 30: Expanded gallery images styled consistently with regular images

*For any* gallery image displayed in expanded mode, it should have the same CSS styling as a regular image post.

**Validates: Requirements 13.7**

### Property 31: Grid layout produces equal-width columns

*For any* column count setting (1-6), the grid layout should arrange media items in columns where each column has equal width.

**Validates: Requirements 15.1**

### Property 32: Column count increases reduce item width

*For any* two column count values where count2 > count1, the width of each media item with count2 columns should be less than the width with count1 columns.

**Validates: Requirements 15.5**

### Property 33: Column selector updates grid configuration

*For any* column count selection (1-6), the grid layout should update to display the selected number of columns.

**Validates: Requirements 16.2**

### Property 34: Column selector displays current column count

*For any* column count value, the column selector should display that value as the currently selected option.

**Validates: Requirements 16.3**

### Property 35: Column count changes trigger immediate re-render

*For any* column count change, the media gallery should re-render all media items with the new column configuration.

**Validates: Requirements 16.4**

### Property 36: Column count preference persists in session

*For any* column count value, the value should be stored in session storage and retrieved when the page is reloaded during the same session.

**Validates: Requirements 16.5**

### Property 37: Metadata display renders for all media items

*For any* media item with post metadata, the metadata display should render the title and author information below the media content.

**Validates: Requirements 17.1**

### Property 38: Post title rendered as clickable link

*For any* post metadata, the metadata display should render the post title as a clickable link with href pointing to the original Reddit post URL and target="_blank".

**Validates: Requirements 17.2, 17.3**

### Property 39: Author username rendered as formatted link

*For any* post metadata, the metadata display should render the author username prefixed with "u/" as a clickable link.

**Validates: Requirements 17.4**

### Property 40: Author link navigation loads user profile

*For any* author username link click, the system should navigate to the user profile view for that username and switch to user profile mode.

**Validates: Requirements 17.5, 17.6**

### Property 41: Images clickable to open in new tab

*For any* image post or gallery image, clicking the image should open it in a new browser tab: Reddit-hosted images (`*.redd.it`) via `viewer.html#<encoded URL>`, other hosts via the direct image URL.

**Validates: Requirements 18.1, 18.2, 18.3, 18.4**

### Property 42: Videos not clickable to open in new tab

*For any* video post, clicking the video should not open a new tab and should allow normal video controls to function.

**Validates: Requirements 18.6**

### Property 43: Subreddit URL pattern generation

*For any* subreddit name, the URL router should generate a URL matching the pattern `/r/{subreddit}`.

**Validates: Requirements 19.1**

### Property 44: User profile URL pattern generation

*For any* username, the URL router should generate a URL matching the pattern `/u/{username}`.

**Validates: Requirements 19.2**

### Property 45: Subreddit URL parsing extracts content source

*For any* URL matching the pattern `/r/{subreddit}`, the URL router should parse it and extract a content source of type "subreddit" with the subreddit name.

**Validates: Requirements 19.3**

### Property 46: User profile URL parsing extracts content source

*For any* URL matching the pattern `/u/{username}`, the URL router should parse it and extract a content source of type "user" with the username.

**Validates: Requirements 19.4**

### Property 47: Content source changes update browser history

*For any* content source change, the URL router should update the browser history with the new URL.

**Validates: Requirements 19.5**

### Property 48: History navigation loads corresponding content source

*For any* browser history navigation event, the system should load the content source corresponding to the URL in the history entry.

**Validates: Requirements 19.6**

### Property 49: URL encoding preserves subreddit and username

*For any* subreddit name or username, encoding it into a URL and then parsing the URL should produce the exact same subreddit name or username.

**Validates: Requirements 19.9**

### Property 50: Scroll threshold triggers content loading

*For any* scroll position within 500 pixels of the bottom of the page, the infinite scroll manager should trigger loading more content if more content is available.

**Validates: Requirements 20.1**

### Property 51: Pagination token included in subsequent requests

*For any* API request for additional content, if a pagination token exists from the previous response, the API client should include it as the "after" parameter.

**Validates: Requirements 20.2**

### Property 52: New content appended without replacing existing

*For any* collection of existing media posts and newly fetched media posts, the media gallery should contain all posts from both collections after appending.

**Validates: Requirements 20.3**

### Property 53: Loading indicator visibility during fetch

*For any* time period while fetching more content, the loading indicator should be visible, and should be hidden once the fetch completes.

**Validates: Requirements 20.4, 20.5**

### Property 54: Null pagination token prevents further requests

*For any* state where the pagination token is null, the infinite scroll manager should not attempt to fetch more content.

**Validates: Requirements 20.6**

### Property 55: Fetch request prevents concurrent requests

*For any* time period while a fetch request is in progress, attempting to trigger another fetch should be prevented.

**Validates: Requirements 20.8**

### Property 56: Content source change resets pagination

*For any* content source change, the pagination token should be reset to null and existing content should be cleared.

**Validates: Requirements 20.9**

### Property 57: Sort configuration change resets pagination

*For any* sort order or timespan change, the pagination token should be reset to null and existing content should be cleared.

**Validates: Requirements 20.10, 20.11**

### Property 58: Scroll position maintained after append

*For any* scroll position before appending new content, the scroll position should remain stable after the new content is added.

**Validates: Requirements 20.12**

### Property 59: Infinite scroll respects display settings

*For any* video toggle or gallery expand setting, newly appended content should respect the current settings.

**Validates: Requirements 20.13**

### Property 60: Typeahead dropdown displays on user input

*For any* non-empty input with 2 or more characters in the search field, typing should trigger the display of the typeahead dropdown after the debounce period.

**Validates: Requirements 1.1.1**

### Property 61: Typeahead suggestions match API response

*For any* search query and API response, the typeahead dropdown should display exactly the suggestions returned by the API (up to the maximum limit).

**Validates: Requirements 1.1.2, 1.1.5**

### Property 52: Debounced API request timing

*For any* sequence of typing events, the API request should only be sent 300 milliseconds after the last keystroke, and the request should use the current source selector mode.

**Validates: Requirements 1.1.3, 1.1.4**

### Property 53: Suggestion selection populates input and loads content

*For any* search suggestion, clicking on it should populate the search input with the suggestion's name, hide the dropdown, and immediately trigger loading of that content source.

**Validates: Requirements 1.1.6, 1.1.9**

### Property 54: Dropdown hides on outside click

*For any* click event outside the typeahead dropdown and search input, the dropdown should become hidden.

**Validates: Requirements 1.1.7**

### Property 55: Dropdown hides on Escape key

*For any* Escape key press when the typeahead dropdown is visible, the dropdown should become hidden.

**Validates: Requirements 1.1.8**

### Property 56: Dropdown hidden when input is empty

*For any* state where the search input becomes empty, the typeahead dropdown should be hidden.

**Validates: Requirements 1.1.10**

### Property 57: Minimum character threshold prevents API requests

*For any* input with fewer than 2 characters, no API request should be sent to the suggestion API.

**Validates: Requirements 1.1.11**

### Property 58: API failures hide dropdown without error display

*For any* suggestion API request that fails, the typeahead dropdown should be hidden and no error message should be displayed to the user.

**Validates: Requirements 1.1.12**

### Property 59: New requests cancel pending requests

*For any* sequence of rapid typing that triggers multiple API requests, only the most recent request should complete, and all previous pending requests should be cancelled.

**Validates: Requirements 1.1.13**

### Property 60: Source mode change clears dropdown and input

*For any* source selector mode change (subreddit to user or vice versa), the typeahead dropdown should be cleared and hidden, and the search input should be reset to empty.

**Validates: Requirements 1.1.15**

## Infinite Scroll Implementation Details

### Component Architecture

The infinite scroll feature integrates with the existing StateManager and MediaGallery components and adds two new components:

1. **InfiniteScrollManager**: Detects scroll position and triggers loading
2. **LoadingIndicator**: Displays loading state at bottom of gallery

### Integration with StateManager

The StateManager will be extended to include pagination state:

```typescript
class StateManager {
  // Existing properties...
  private paginationToken: string | null = null;
  private hasMoreContent: boolean = true;
  private isLoadingMore: boolean = false;
  
  async loadContent(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    this.paginationToken = null;
    this.hasMoreContent = true;
    this.mediaPosts = [];
    
    try {
      const result = await this.fetchContent();
      this.mediaPosts = result.posts;
      this.paginationToken = result.after;
      this.hasMoreContent = result.after !== null;
    } catch (error) {
      this.error = this.handleError(error);
    } finally {
      this.isLoading = false;
    }
    
    this.render();
  }
  
  async loadMoreContent(): Promise<void> {
    // Prevent concurrent requests
    if (this.isLoadingMore || !this.hasMoreContent || this.isLoading) {
      return;
    }
    
    this.isLoadingMore = true;
    this.loadingIndicator.show();
    
    try {
      const result = await this.fetchContent(this.paginationToken);
      
      // Append new posts to existing
      this.mediaPosts = [...this.mediaPosts, ...result.posts];
      this.paginationToken = result.after;
      this.hasMoreContent = result.after !== null;
      
      // Show end message if no more content
      if (!this.hasMoreContent) {
        this.loadingIndicator.showEndMessage();
      }
    } catch (error) {
      const errorMessage = this.handleError(error);
      this.loadingIndicator.showError(errorMessage, () => this.loadMoreContent());
    } finally {
      this.isLoadingMore = false;
      if (this.hasMoreContent) {
        this.loadingIndicator.hide();
      }
    }
    
    this.render();
  }
  
  private async fetchContent(after?: string | null): Promise<RedditAPIResult> {
    if (!this.contentSource) {
      throw new Error('No content source');
    }
    
    if (this.contentSource.type === 'subreddit') {
      return await this.apiClient.fetchSubreddit(
        this.contentSource.name,
        this.sortOrder,
        this.timespan,
        after || undefined
      );
    } else {
      return await this.apiClient.fetchUserPosts(
        this.contentSource.username,
        this.sortOrder,
        this.timespan,
        after || undefined
      );
    }
  }
  
  setSortOrder(order: SortOrder): void {
    this.sortOrder = order;
    this.loadContent(); // Reset pagination
  }
  
  setTimespan(timespan: Timespan): void {
    this.timespan = timespan;
    this.loadContent(); // Reset pagination
  }
  
  setContentSource(source: ContentSource): void {
    this.contentSource = source;
    this.loadContent(); // Reset pagination
  }
}
```

### Scroll Detection Strategy

The InfiniteScrollManager uses a scroll event listener with throttling:

```typescript
class InfiniteScrollManager {
  private enabled: boolean = false;
  private onLoadMore: (() => Promise<void>) | null = null;
  private scrollThreshold: number = 500; // pixels from bottom
  private isThrottled: boolean = false;
  private throttleDelay: number = 200; // milliseconds
  
  initialize(onLoadMore: () => Promise<void>): void {
    this.onLoadMore = onLoadMore;
    this.enabled = true;
    window.addEventListener('scroll', this.handleScroll);
    window.addEventListener('resize', this.handleScroll);
  }
  
  private handleScroll = (): void => {
    if (!this.enabled || this.isThrottled) {
      return;
    }
    
    // Throttle scroll events
    this.isThrottled = true;
    setTimeout(() => {
      this.isThrottled = false;
    }, this.throttleDelay);
    
    if (this.checkScrollPosition() && this.onLoadMore) {
      this.onLoadMore();
    }
  };
  
  checkScrollPosition(): boolean {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
    
    return distanceFromBottom <= this.scrollThreshold;
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  destroy(): void {
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleScroll);
    this.enabled = false;
    this.onLoadMore = null;
  }
}
```

**Key behaviors**:
- Checks if user is within 500px of bottom
- Throttles scroll events to 200ms intervals for performance
- Can be enabled/disabled to prevent loading during state changes
- Listens to resize events to handle window size changes

### Scroll Position Preservation

When appending new content, the browser naturally maintains scroll position because new content is added at the bottom. No special handling is required.

### Loading Indicator Component

The LoadingIndicator displays different states at the bottom of the gallery:

```typescript
class LoadingIndicator {
  private container: HTMLElement;
  private spinner: HTMLElement;
  private endMessage: HTMLElement;
  private errorContainer: HTMLElement;
  
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'loading-indicator';
    
    // Spinner element
    this.spinner = document.createElement('div');
    this.spinner.className = 'loading-spinner';
    this.spinner.textContent = 'Loading more...';
    
    // End message
    this.endMessage = document.createElement('div');
    this.endMessage.className = 'end-message';
    this.endMessage.textContent = 'No more content available';
    
    // Error container
    this.errorContainer = document.createElement('div');
    this.errorContainer.className = 'error-message';
    
    this.container.appendChild(this.spinner);
    this.container.appendChild(this.endMessage);
    this.container.appendChild(this.errorContainer);
    
    this.hide();
  }
  
  show(): void {
    this.spinner.style.display = 'block';
    this.endMessage.style.display = 'none';
    this.errorContainer.style.display = 'none';
    this.container.style.display = 'block';
  }
  
  hide(): void {
    this.container.style.display = 'none';
  }
  
  showEndMessage(): void {
    this.spinner.style.display = 'none';
    this.endMessage.style.display = 'block';
    this.errorContainer.style.display = 'none';
    this.container.style.display = 'block';
  }
  
  showError(message: string, onRetry: () => void): void {
    this.spinner.style.display = 'none';
    this.endMessage.style.display = 'none';
    
    this.errorContainer.innerHTML = '';
    const errorText = document.createElement('p');
    errorText.textContent = message;
    
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry';
    retryButton.onclick = onRetry;
    
    this.errorContainer.appendChild(errorText);
    this.errorContainer.appendChild(retryButton);
    this.errorContainer.style.display = 'block';
    this.container.style.display = 'block';
  }
  
  getElement(): HTMLElement {
    return this.container;
  }
}
```

### CSS Styling for Loading Indicator

```css
.loading-indicator {
  padding: 40px 20px;
  text-align: center;
  width: 100%;
}

.loading-spinner {
  font-size: 1rem;
  color: #666;
}

.loading-spinner::before {
  content: '';
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #333;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 10px;
  vertical-align: middle;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.end-message {
  font-size: 0.875rem;
  color: #999;
  font-style: italic;
}

.error-message {
  color: #d32f2f;
}

.error-message button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error-message button:hover {
  background-color: #1565c0;
}
```

### API Client Updates

The API client methods are updated to accept an optional `after` parameter:

```typescript
async fetchSubreddit(
  subreddit: string,
  sortOrder: SortOrder,
  timespan?: Timespan,
  after?: string
): Promise<RedditAPIResult> {
  const params = new URLSearchParams();
  
  if (timespan && (sortOrder === 'top' || sortOrder === 'controversial')) {
    params.append('t', timespan);
  }
  
  if (after) {
    params.append('after', after);
  }
  
  const url = `https://www.reddit.com/r/${subreddit}/${sortOrder}.json?${params}`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'RedditImageViewer/1.0' }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data: RedditAPIResponse = await response.json();
  const parsedResult = this.responseParser.parseResponse(data);
  
  return {
    posts: parsedResult.mediaPosts,
    after: parsedResult.after
  };
}
```

### Response Parser Updates

The response parser extracts the `after` token from the API response:

```typescript
parseResponse(response: RedditAPIResponse): ParsedResult {
  const mediaPosts: MediaPost[] = [];
  
  for (const child of response.data.children) {
    const post = child.data;
    
    // Extract media (existing logic)
    const imageURL = this.extractImageURL(post);
    const videoData = this.extractVideoData(post);
    const galleryData = this.extractGalleryData(post);
    
    const metadata: PostMetadata = {
      title: post.title,
      author: post.author,
      postURL: `https://www.reddit.com${post.permalink}`
    };
    
    if (imageURL) {
      mediaPosts.push({ type: 'image', url: imageURL, metadata });
    } else if (videoData) {
      mediaPosts.push({ type: 'video', videoData, metadata });
    } else if (galleryData) {
      mediaPosts.push({ type: 'gallery', galleryData, metadata });
    }
  }
  
  return {
    mediaPosts,
    after: response.data.after
  };
}
```

### Performance Considerations

**Optimization strategies**:
1. **Throttling**: Scroll events throttled to 200ms intervals
2. **Request Prevention**: Concurrent request prevention via `isLoadingMore` flag
3. **Conditional Rendering**: Only render new items, not entire gallery
4. **Memory Management**: Consider implementing virtual scrolling for very long lists (future enhancement)

**Expected performance**:
- Scroll detection latency: ~200ms (throttle delay)
- API response time: ~200-500ms (Reddit API dependent)
- Render time for 25 new items: ~50-100ms
- Total time from scroll trigger to new content: ~450-800ms

### State Transitions

**Pagination state machine**:
1. **Initial Load**: `paginationToken = null`, `hasMoreContent = true`
2. **After First Load**: `paginationToken = "t3_abc123"`, `hasMoreContent = true`
3. **Loading More**: `isLoadingMore = true`, loading indicator visible
4. **More Content Loaded**: New posts appended, `paginationToken` updated
5. **No More Content**: `paginationToken = null`, `hasMoreContent = false`, end message shown
6. **Error State**: Error message with retry button shown
7. **Reset on Config Change**: Return to Initial Load state

### Error Handling

**Infinite scroll specific errors**:
- **Network Error During Load More**: Show error at bottom with retry button, keep existing content visible
- **API Rate Limit During Load More**: Show rate limit message with retry button
- **Empty Response**: Treat as end of content, show end message

**Error recovery**:
- Retry button calls `loadMoreContent()` again with same pagination token
- Existing content remains visible during retry
- User can continue scrolling through existing content

## Typeahead Implementation Details

### Component Architecture

The typeahead feature integrates with the existing SearchInterface component and adds three new sub-components:

1. **TypeaheadDropdown**: UI component for displaying suggestions
2. **DebounceManager**: Utility for delaying API requests
3. **SuggestionAPIClient**: Service for fetching search suggestions

### Integration with SearchInterface

The SearchInterface component will be extended to include:

```typescript
class SearchInterface {
  private typeaheadDropdown: TypeaheadDropdown;
  private debounceManager: DebounceManager;
  private suggestionAPIClient: SuggestionAPIClient;
  private currentAbortController: AbortController | null;
  
  // Existing properties...
  private inputElement: HTMLInputElement;
  private subredditRadio: HTMLInputElement;
  private userRadio: HTMLInputElement;
  
  constructor(stateManager: StateManager) {
    // Initialize existing components...
    
    // Initialize typeahead components
    this.typeaheadDropdown = new TypeaheadDropdown();
    this.debounceManager = new DebounceManager();
    this.suggestionAPIClient = new SuggestionAPIClient();
    this.currentAbortController = null;
    
    // Attach event listeners
    this.setupTypeaheadListeners();
  }
  
  private setupTypeaheadListeners(): void {
    // Input event for typing
    this.inputElement.addEventListener('input', () => this.handleInput());
    
    // Keyboard navigation
    this.inputElement.addEventListener('keydown', (e) => this.handleKeyDown(e));
    
    // Source selector change
    this.subredditRadio.addEventListener('change', () => this.handleSourceChange());
    this.userRadio.addEventListener('change', () => this.handleSourceChange());
    
    // Outside click detection
    document.addEventListener('click', (e) => this.handleOutsideClick(e));
  }
}
```

### Debouncing Strategy

The debounce implementation uses a timer-based approach:

```typescript
class DebounceManager {
  private timeoutId: number | null = null;
  
  debounce(fn: () => void, delay: number): void {
    // Cancel previous timer
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    
    // Set new timer
    this.timeoutId = window.setTimeout(() => {
      fn();
      this.timeoutId = null;
    }, delay);
  }
  
  cancel(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
```

**Key behaviors**:
- Each keystroke cancels the previous timer
- API request only fires 300ms after the last keystroke
- Prevents excessive API calls during rapid typing

### Request Cancellation

Uses AbortController to cancel in-flight requests:

```typescript
private async handleInput(): Promise<void> {
  const query = this.inputElement.value.trim();
  
  // Hide dropdown if input is empty or too short
  if (query.length === 0) {
    this.typeaheadDropdown.hide();
    this.debounceManager.cancel();
    return;
  }
  
  if (query.length < 2) {
    this.typeaheadDropdown.hide();
    return;
  }
  
  // Cancel previous request
  if (this.currentAbortController) {
    this.currentAbortController.abort();
  }
  
  // Debounce the API request
  this.debounceManager.debounce(async () => {
    // Create new abort controller
    this.currentAbortController = new AbortController();
    
    try {
      const sourceType = this.getSourceType();
      const suggestions = sourceType === 'subreddit'
        ? await this.suggestionAPIClient.fetchSubredditSuggestions(
            query, 
            this.currentAbortController.signal
          )
        : await this.suggestionAPIClient.fetchUsernameSuggestions(
            query, 
            this.currentAbortController.signal
          );
      
      // Display suggestions (limit to 10)
      this.typeaheadDropdown.show(suggestions.slice(0, 10));
    } catch (error) {
      // If request was aborted, ignore
      if (error.name === 'AbortError') {
        return;
      }
      
      // For other errors, hide dropdown silently
      this.typeaheadDropdown.hide();
    }
  }, 300);
}
```

### Keyboard Navigation

The typeahead supports keyboard navigation:

```typescript
private handleKeyDown(event: KeyboardEvent): void {
  if (!this.typeaheadDropdown.isVisible()) {
    return;
  }
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      this.typeaheadDropdown.handleKeyboardNavigation('ArrowDown');
      break;
      
    case 'ArrowUp':
      event.preventDefault();
      this.typeaheadDropdown.handleKeyboardNavigation('ArrowUp');
      break;
      
    case 'Enter':
      event.preventDefault();
      const activeSuggestion = this.typeaheadDropdown.getActiveSuggestion();
      if (activeSuggestion) {
        this.selectSuggestion(activeSuggestion);
      }
      break;
      
    case 'Escape':
      event.preventDefault();
      this.typeaheadDropdown.hide();
      break;
  }
}
```

**Keyboard shortcuts**:
- **Arrow Down**: Move to next suggestion
- **Arrow Up**: Move to previous suggestion
- **Enter**: Select the active suggestion
- **Escape**: Close the dropdown

### Suggestion Selection

When a user selects a suggestion:

```typescript
private async selectSuggestion(suggestion: SearchSuggestion): Promise<void> {
  // Populate input with suggestion
  this.inputElement.value = suggestion.name;
  
  // Hide dropdown
  this.typeaheadDropdown.hide();
  
  // Cancel any pending requests
  this.debounceManager.cancel();
  if (this.currentAbortController) {
    this.currentAbortController.abort();
  }
  
  // Create content source and load immediately
  const contentSource: ContentSource = suggestion.type === 'subreddit'
    ? { type: 'subreddit', name: suggestion.name }
    : { type: 'user', username: suggestion.name };
  
  await this.stateManager.setContentSource(contentSource);
}
```

### CSS Styling Approach

The typeahead dropdown uses absolute positioning:

```css
.typeahead-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ccc;
  border-top: none;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  display: none;
}

.typeahead-dropdown.visible {
  display: block;
}

.typeahead-suggestion {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.15s ease;
}

.typeahead-suggestion:hover,
.typeahead-suggestion.active {
  background-color: #f5f5f5;
}

.typeahead-suggestion:last-child {
  border-bottom: none;
}

.typeahead-suggestion-name {
  font-weight: 500;
  color: #333;
}

.typeahead-suggestion-meta {
  font-size: 0.875rem;
  color: #666;
  margin-top: 4px;
}
```

**Styling features**:
- Positioned directly below search input
- Matches input width
- Hover and keyboard navigation highlighting
- Smooth transitions
- Scrollable for many results
- High z-index to appear above other content

### State Management

The typeahead maintains its own internal state:

```typescript
interface TypeaheadState {
  isVisible: boolean;
  suggestions: SearchSuggestion[];
  activeSuggestionIndex: number; // -1 if none active
  isLoading: boolean;
}
```

**State transitions**:
- **Hidden → Visible**: When API returns suggestions
- **Visible → Hidden**: On selection, outside click, Escape, empty input, or API error
- **Active suggestion changes**: On arrow key navigation or mouse hover

### Error Handling

The typeahead handles errors gracefully:

1. **API Failures**: Hide dropdown silently, allow user to continue typing
2. **Network Errors**: Same as API failures, no error message displayed
3. **Aborted Requests**: Ignored (normal behavior during rapid typing)
4. **Empty Results**: Show "No results found" message in dropdown

### Performance Considerations

**Optimization strategies**:
1. **Debouncing**: Reduces API calls by 90%+ during typing
2. **Request Cancellation**: Prevents race conditions and wasted bandwidth
3. **Result Limiting**: Maximum 10 suggestions reduces DOM size
4. **Minimum Character Threshold**: Prevents overly broad searches

**Expected performance**:
- Debounce delay: 300ms (good balance between responsiveness and API load)
- API response time: ~200-500ms (Reddit API dependent)
- Total time from keystroke to suggestions: ~500-800ms
- Memory footprint: Minimal (small suggestion objects)

## Error Handling

### Input Validation Errors

**Empty Input**:
- When a user submits an empty subreddit name or username, display error message: "Please enter a subreddit name or username"
- Prevent API request from being made
- Keep the search interface focused for user to retry

**Invalid Characters**:
- When a user enters invalid characters for subreddit (anything other than alphanumeric and underscore), display error message: "Subreddit names can only contain letters, numbers, and underscores"
- When a user enters invalid characters for username (anything other than alphanumeric, underscore, and hyphen), display error message: "Usernames can only contain letters, numbers, underscores, and hyphens"

### API Errors

**Subreddit Not Found (404)**:
- Display error message: "Subreddit '{name}' not found. Please check the spelling and try again."
- Provide option to return to search

**User Profile Not Found (404)**:
- Display error message: "User 'u/{username}' not found. Please check the spelling and try again."
- Provide option to return to search

**Rate Limit Exceeded (429)**:
- Display error message: "Too many requests. Please wait a moment and try again."
- Suggest waiting 60 seconds before retrying

**Service Unavailable (503)**:
- Display error message: "Reddit is temporarily unavailable. Please try again later."
- Provide retry button

**Network Error**:
- Display error message: "Unable to connect to Reddit. Please check your internet connection."
- Provide retry button

**Generic API Error**:
- Display error message: "Something went wrong while loading content. Please try again."
- Log error details to console for debugging
- Provide retry button

### Content Errors

**No Media Found**:
- When a subreddit or user profile has posts but no media content, display message: "No images or videos found in this {subreddit/profile}"
- Distinguish from completely empty subreddits

**No Posts Found**:
- When a subreddit or user profile has no posts at all, display message: "This {subreddit/profile} has no posts yet"

**Image Load Failure**:
- Display placeholder image with error icon
- Show alt text: "Image failed to load"
- Allow user to click to attempt opening in new tab

**Video Load Failure**:
- Display placeholder with error icon
- Show message: "Video failed to load"
- Provide link to attempt opening on Reddit

**Gallery Image Load Failure**:
- Display placeholder for failed image within carousel
- Allow navigation to continue to other images
- Show error indicator with image position (e.g., "Image 2 of 5 failed to load")

### Error Recovery

**Retry Mechanism**:
- All API errors should provide a retry button
- Retry should use the same parameters as the failed request
- Implement exponential backoff for repeated failures

**Graceful Degradation**:
- If video playback fails, show thumbnail with link to Reddit
- If gallery carousel fails, attempt to show first image as static image
- If metadata is missing, show media without metadata rather than hiding entire post

**Error Logging**:
- Log all errors to browser console with context (URL, parameters, response)
- Include timestamp and user action that triggered the error
- Do not expose sensitive information in error messages

## Testing Strategy

### Dual Testing Approach

This feature will be tested using both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and error conditions
- Test specific UI component rendering (search interface, sort controls, toggles)
- Test edge cases (empty input, boundary conditions in carousels, missing metadata)
- Test error handling scenarios (404, 429, 503, network errors)
- Test default state initialization (default sort order, column count, toggle states)

**Property-Based Tests**: Verify universal properties across all inputs
- Test input validation rules across randomly generated strings
- Test API URL construction across randomly generated subreddit names and usernames
- Test response parsing across randomly generated API responses
- Test filtering and rendering logic across randomly generated post collections
- Test URL routing round-trips across randomly generated content sources
- Test session storage persistence across randomly generated preference values

### Property-Based Testing Configuration

**Library**: Use `fast-check` for JavaScript/TypeScript property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test
- Each test must reference its design document property using a comment tag
- Tag format: `// Feature: reddit-image-viewer, Property {number}: {property_text}`

**Example Property Test Structure**:
```typescript
// Feature: reddit-image-viewer, Property 1: Subreddit name validation accepts valid characters
test('subreddit name validation accepts valid characters', () => {
  fc.assert(
    fc.property(
      fc.stringOf(fc.oneof(fc.char(), fc.constantFrom('_')), { minLength: 1 }),
      (subredditName) => {
        const result = validateSubredditName(subredditName);
        expect(result.valid).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Coverage Requirements

**Unit Test Coverage**:
- All UI components must have tests verifying required elements are present
- All error handling paths must have tests with specific error scenarios
- All edge cases identified in requirements must have dedicated tests
- All default state values must be verified
- Typeahead dropdown rendering and visibility states
- Debounce timing behavior with specific delays
- Keyboard navigation through suggestions
- Suggestion selection and input population

**Property Test Coverage**:
- Each correctness property must be implemented by exactly one property-based test
- All validation logic must be tested with randomly generated inputs
- All parsing and transformation logic must be tested with randomly generated data
- All URL routing must be tested with round-trip properties
- Typeahead API request cancellation with random typing sequences
- Suggestion filtering and limiting across random API responses

### Integration Testing

**Browser Testing**:
- Test in Chrome, Firefox, and Safari
- Verify responsive layout at different viewport sizes
- Test browser history navigation (back/forward buttons)
- Test bookmark functionality

**API Integration Testing**:
- Test with real Reddit API endpoints (use rate limiting carefully)
- Test with mock API responses for error scenarios
- Verify correct handling of various Reddit post formats
- Test with subreddits containing different media types

### Manual Testing Checklist

- [ ] Search for various subreddits and verify images load
- [ ] Search for user profiles and verify posts load
- [ ] Test all sort orders (hot, new, top, best, rising, controversial)
- [ ] Test all timespan filters with top and controversial sorting
- [ ] Toggle video visibility on and off
- [ ] Toggle gallery expand mode on and off
- [ ] Change column count from 1 to 6 and verify layout
- [ ] Click on images to open in new tab (Reddit images open in the local viewer, not Reddit's media page)
- [ ] Ctrl+click / middle-click a subreddit or user link and verify it opens in a new tab with the same sort order
- [ ] Verify each post shows score, upvote percentage and age
- [ ] Log in with Reddit (Chrome window, Allow) and verify content loads; restart the server and verify still logged in
- [ ] Log out and verify the token file is removed
- [ ] Click on post titles to open Reddit posts
- [ ] Click on author usernames to navigate to user profiles
- [ ] Navigate using browser back and forward buttons
- [ ] Bookmark a subreddit and verify it loads correctly
- [ ] Test with subreddit that doesn't exist
- [ ] Test with username that doesn't exist
- [ ] Test with subreddit that has no media
- [ ] Test gallery carousel navigation
- [ ] Verify preference persistence (reload page / open new tab and check settings, including sort order)
- [ ] Type in search input and verify typeahead dropdown appears
- [ ] Verify typeahead shows suggestions after 300ms delay
- [ ] Type rapidly and verify only latest request completes
- [ ] Click on a typeahead suggestion and verify it loads content
- [ ] Use arrow keys to navigate through suggestions
- [ ] Press Enter on highlighted suggestion to select it
- [ ] Press Escape to close typeahead dropdown
- [ ] Click outside dropdown to close it
- [ ] Verify dropdown hides when input is cleared
- [ ] Verify no API requests with fewer than 2 characters
- [ ] Switch between subreddit and user mode with typeahead open
- [ ] Test typeahead with network errors (no error message shown)
- [ ] Scroll down to bottom and verify more content loads automatically
- [ ] Verify loading indicator appears while fetching more content
- [ ] Scroll through multiple pages of content
- [ ] Verify scroll position maintained when new content appends
- [ ] Scroll to end of content and verify "no more content" message appears
- [ ] Test infinite scroll with video toggle off (only images load)
- [ ] Test infinite scroll with gallery expand mode on
- [ ] Change sort order while scrolled down and verify content resets
- [ ] Change timespan while scrolled down and verify content resets
- [ ] Switch to different subreddit while scrolled down and verify pagination resets
- [ ] Simulate network error during infinite scroll and verify error message with retry button
- [ ] Click retry button after error and verify content loads
- [ ] Verify no duplicate content appears when scrolling
- [ ] Test infinite scroll on subreddit with limited content (less than 2 pages)


