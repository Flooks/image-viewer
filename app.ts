// Core Type Definitions for Reddit Image Viewer

// Content Source Types
export type ContentSource = 
  | { type: 'subreddit', name: string }
  | { type: 'user', username: string };

// Sort Configuration Types
export type SortOrder = 'hot' | 'new' | 'top' | 'best' | 'rising' | 'controversial';
export type Timespan = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

// Media Post Types
export interface PostMetadata {
  title: string;
  author: string;
  postURL: string;
  subreddit?: string;
}

export interface VideoData {
  url: string;
  fallbackURL?: string;
}

export interface GalleryData {
  images: string[];
}

export interface ImagePost {
  type: 'image';
  url: string;
  thumbnailUrl?: string;
  metadata: PostMetadata;
}


export interface VideoPost {
  type: 'video';
  videoData: VideoData;
  metadata: PostMetadata;
}

export interface GalleryPost {
  type: 'gallery';
  galleryData: GalleryData;
  metadata: PostMetadata;
}

export type MediaPost = ImagePost | VideoPost | GalleryPost;

// Parsed Response Result
export interface ParsedResult {
  mediaPosts: MediaPost[];
  after: string | null;
}

// Application State
export interface ApplicationState {
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
  
  // UI state
  isLoading: boolean;
  error: string | null;
}

// Reddit API Response Types
export interface RedditAPIResponse {
  kind: 'Listing';
  data: {
    children: RedditPostWrapper[];
    after: string | null;
    before: string | null;
  };
}

export interface RedditAPIResult {
  posts: RedditPostData[];
  after: string | null;
}

export interface RedditPostWrapper {
  kind: 't3';
  data: RedditPostData;
}

export interface RedditPostData {
  title: string;
  author: string;
  permalink: string;
  url: string;
  subreddit?: string;
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
  preview?: {
    images?: Array<{
      source?: {
        url?: string;
        width?: number;
        height?: number;
      };
      resolutions?: Array<{
        url?: string;
        width?: number;
        height?: number;
      }>;
    }>;
  };
}

// Session Storage Types
export interface SessionStorage {
  columnCount: number;
  showVideos: boolean;
  expandGalleries: boolean;
}

// Validation Types
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Gallery Configuration
export interface GalleryConfig {
  columnCount: number;
  showVideos: boolean;
  expandGalleries: boolean;
}

// Typeahead/Autocomplete Types
export interface SearchSuggestion {
  name: string;
  type: 'subreddit' | 'user';
  subscribers?: number;
  iconUrl?: string;
}

export interface TypeaheadState {
  isVisible: boolean;
  suggestions: SearchSuggestion[];
  activeSuggestionIndex: number;
  isLoading: boolean;
}

// Application initialization
console.log('Reddit Image Viewer - Core types loaded');

// URL Router Implementation

export class URLRouter {
  /**
   * Parse the current browser URL hash and extract the content source
   * @returns ContentSource object if hash matches a pattern, null for empty hash
   */
  parseURL(): ContentSource | null {
    const hash = window.location.hash;
    
    // Handle empty hash or just '#'
    if (!hash || hash === '#' || hash === '#/') {
      return null;
    }
    
    // Remove the leading '#' to get the path
    const path = hash.substring(1);
    
    // Match subreddit pattern: #/r/{subreddit}
    const subredditMatch = path.match(/^\/r\/([^\/]+)\/?$/);
    if (subredditMatch) {
      return {
        type: 'subreddit',
        name: subredditMatch[1]
      };
    }
    
    // Match user profile pattern: #/u/{username}
    const userMatch = path.match(/^\/u\/([^\/]+)\/?$/);
    if (userMatch) {
      return {
        type: 'user',
        username: userMatch[1]
      };
    }
    
    // Hash doesn't match any known pattern
    return null;
  }
  
  /**
   * Update the browser URL hash based on the content source
   * @param source ContentSource object to encode in the URL hash
   */
  updateURL(source: ContentSource): void {
    let path: string;
    let title: string;
    
    if (source.type === 'subreddit') {
      path = `#/r/${source.name}`;
      title = `r/${source.name} - Reddit Image Viewer`;
    } else {
      // source.type === 'user'
      path = `#/u/${source.username}`;
      title = `u/${source.username} - Reddit Image Viewer`;
    }
    
    // Update the hash without triggering a page reload
    window.location.hash = path;
    
    // Update the page title
    document.title = title;
  }
  
  /**
   * Initialize the router and set up hash change listeners
   */
  initialize(): void {
    // Set up hashchange listener for browser back/forward navigation and hash changes
    window.addEventListener('hashchange', () => {
      const source = this.parseURL();
      // Trigger content loading based on the new hash
      // This will be connected to the state manager in a later task
      console.log('Navigation detected:', source);
    });
  }
  
  /**
   * Navigate to a content source by updating the URL and triggering content load
   * @param source ContentSource to navigate to
   */
  navigateTo(source: ContentSource): void {
    this.updateURL(source);
    // Content loading will be handled by state manager in later tasks
    console.log('Navigating to:', source);
  }
}

// Initialize URL Router on page load
const urlRouter = new URLRouter();
urlRouter.initialize();
console.log('URL Router initialized');

// Input Validation Functions

/**
 * Validate a subreddit name
 * Subreddit names can only contain alphanumeric characters and underscores
 * @param name The subreddit name to validate
 * @returns ValidationResult with valid flag and optional error message
 */
export function validateSubredditName(name: string): ValidationResult {
  // Check for empty input
  if (!name || name.trim() === '') {
    return {
      valid: false,
      error: 'Please enter a subreddit name or username'
    };
  }
  
  // Check for valid characters (alphanumeric and underscore only)
  const validPattern = /^[a-zA-Z0-9_]+$/;
  if (!validPattern.test(name)) {
    return {
      valid: false,
      error: 'Subreddit names can only contain letters, numbers, and underscores'
    };
  }
  
  return {
    valid: true
  };
}

/**
 * Validate a Reddit username
 * Usernames can contain alphanumeric characters, underscores, and hyphens
 * @param username The username to validate
 * @returns ValidationResult with valid flag and optional error message
 */
export function validateUsername(username: string): ValidationResult {
  // Check for empty input
  if (!username || username.trim() === '') {
    return {
      valid: false,
      error: 'Please enter a subreddit name or username'
    };
  }
  
  // Check for valid characters (alphanumeric, underscore, and hyphen)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(username)) {
    return {
      valid: false,
      error: 'Usernames can only contain letters, numbers, underscores, and hyphens'
    };
  }
  
  return {
    valid: true
  };
}

console.log('Input validation functions loaded');

// API Client Implementation

export class APIClient {
  // Use a CORS proxy to bypass Reddit's CORS restrictions
  // Note: For production use, you should run your own proxy server
  private readonly corsProxy = 'https://corsproxy.io/?';
  
  /**
   * Fetch posts from a subreddit
   * @param subreddit The subreddit name
   * @param sortOrder The sort order (hot, new, top, best, rising, controversial)
   * @param timespan Optional timespan for top/controversial sorting
   * @param after Optional pagination token for fetching next page
   * @returns Promise resolving to RedditAPIResult with posts and pagination token
   */
  async fetchSubreddit(
    subreddit: string,
    sortOrder: SortOrder,
    timespan?: Timespan,
    after?: string
  ): Promise<RedditAPIResult> {
    // Construct the API URL
    let redditUrl = `https://www.reddit.com/r/${subreddit}/${sortOrder}.json`;
    
    // Build query parameters
    const params = new URLSearchParams();
    
    // Add timespan parameter if provided (for top/controversial sorting)
    if (timespan) {
      params.append('t', timespan);
    }
    
    // Add after parameter if provided (for pagination)
    if (after) {
      params.append('after', after);
    }
    
    // Append query string if we have parameters
    const queryString = params.toString();
    if (queryString) {
      redditUrl += `?${queryString}`;
    }
    
    // Use CORS proxy
    const url = this.corsProxy + encodeURIComponent(redditUrl);
    
    try {
      const response = await fetch(url, {
        method: 'GET'
      });
      
      // Handle HTTP error status codes
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: RedditAPIResponse = await response.json();
      
      // Extract post data and pagination token from the response
      return {
        posts: data.data.children.map(child => child.data),
        after: data.data.after
      };
    } catch (error) {
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to fetch subreddit: ${error.message}`);
      }
      throw error;
    }
  }
  
  /**
   * Fetch posts from a user profile
   * @param username The Reddit username
   * @param sortOrder The sort order (hot, new, top, best, rising, controversial)
   * @param timespan Optional timespan for top/controversial sorting
   * @param after Optional pagination token for fetching next page
   * @returns Promise resolving to RedditAPIResult with posts and pagination token
   */
  async fetchUserPosts(
    username: string,
    sortOrder: SortOrder,
    timespan?: Timespan,
    after?: string
  ): Promise<RedditAPIResult> {
    // Construct the API URL for user submitted posts
    // Note: Reddit user API uses query parameter for sort, not URL path
    let redditUrl = `https://www.reddit.com/user/${username}/submitted.json`;
    
    // Build query parameters
    const params = new URLSearchParams();
    
    // Add sort parameter
    params.append('sort', sortOrder);
    
    // Add timespan parameter if provided (for top/controversial sorting)
    if (timespan) {
      params.append('t', timespan);
    }
    
    // Add after parameter if provided (for pagination)
    if (after) {
      params.append('after', after);
    }
    
    // Append query string
    redditUrl += `?${params.toString()}`;
    
    // Use CORS proxy
    const url = this.corsProxy + encodeURIComponent(redditUrl);
    
    try {
      const response = await fetch(url, {
        method: 'GET'
      });
      
      // Handle HTTP error status codes
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: RedditAPIResponse = await response.json();
      
      // Extract post data and pagination token from the response
      return {
        posts: data.data.children.map(child => child.data),
        after: data.data.after
      };
    } catch (error) {
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to fetch user posts: ${error.message}`);
      }
      throw error;
    }
  }
}

console.log('API Client loaded');

// Response Parser Implementation

export class ResponseParser {
  /**
   * Parse Reddit API response and extract media posts
   * @param response The Reddit API response containing post data
   * @returns ParsedResult with media posts and pagination token
   */
  parseResponse(response: RedditAPIResponse): ParsedResult {
    const mediaPosts: MediaPost[] = [];
    
    // Iterate through all post children in the response
    for (const child of response.data.children) {
      const postData = child.data;
      
      // Extract metadata that's common to all media types
      const metadata: PostMetadata = {
        title: postData.title,
        author: postData.author,
        postURL: `https://www.reddit.com${postData.permalink}`,
        subreddit: postData.subreddit
      };
      
      // Try to extract gallery data first (galleries have priority)
      const galleryData = this.extractGalleryData(postData);
      if (galleryData) {
        mediaPosts.push({
          type: 'gallery',
          galleryData,
          metadata
        });
        continue;
      }
      
      // Try to extract video data
      const videoData = this.extractVideoData(postData);
      if (videoData) {
        mediaPosts.push({
          type: 'video',
          videoData,
          metadata
        });
        continue;
      }
      
      // Try to extract image URL
      const imageData = this.extractImageURL(postData);
      if (imageData) {
        mediaPosts.push({
          type: 'image',
          url: imageData.url,
          thumbnailUrl: imageData.thumbnailUrl,
          metadata
        });
      }
    }
    
    // Extract the "after" token for pagination
    // This will be null when there are no more posts to load
    const after = response.data.after;
    
    return {
      mediaPosts,
      after
    };
  }
  
  /**
   * Extract image URL from post data
   * Supports JPEG, PNG, GIF, and WEBP formats
   * @param post The Reddit post data
   * @returns Object with full-size URL and thumbnail URL, or null if no valid image
   */
  extractImageURL(post: RedditPostData): { url: string; thumbnailUrl?: string } | null {
    // Skip video posts - they should be handled by extractVideoData
    if (post.is_video) {
      return null;
    }
    
    // Try to get the highest quality image from preview first
    if (post.preview?.images?.[0]?.source?.url) {
      // Decode HTML entities in the URL (Reddit encodes & as &amp;)
      const fullSizeURL = post.preview.images[0].source.url.replace(/&amp;/g, '&');
      
      // Try to get the largest thumbnail from resolutions array
      let thumbnailURL: string | undefined;
      const resolutions = post.preview.images[0].resolutions;
      if (resolutions && resolutions.length > 0) {
        // Get the largest resolution (last in array) as thumbnail
        const largestResolution = resolutions[resolutions.length - 1];
        if (largestResolution?.url) {
          thumbnailURL = largestResolution.url.replace(/&amp;/g, '&');
        }
      }
      
      return {
        url: fullSizeURL,
        thumbnailUrl: thumbnailURL
      };
    }
    
    // Fallback to post.url if preview is not available
    // Check if post_hint indicates this is an image
    if (post.post_hint === 'image') {
      // Validate the URL has a supported image extension
      if (this.isValidImageFormat(post.url)) {
        return { url: post.url };
      }
    }
    
    // Also check the URL directly for image extensions
    // This handles cases where post_hint might be missing
    if (this.isValidImageFormat(post.url)) {
      return { url: post.url };
    }
    
    return null;
  }
  
  /**
   * Extract video data from post data
   * Identifies Reddit-hosted video posts
   * @param post The Reddit post data
   * @returns VideoData if post contains Reddit video, null otherwise
   */
  extractVideoData(post: RedditPostData): VideoData | null {
    // Check if this is marked as a video post
    if (post.is_video && post.media?.reddit_video) {
      const redditVideo = post.media.reddit_video;
      
      return {
        url: redditVideo.fallback_url || redditVideo.hls_url,
        fallbackURL: redditVideo.fallback_url
      };
    }
    
    return null;
  }
  
  /**
   * Extract gallery data from post data
   * Identifies gallery posts with multiple images
   * @param post The Reddit post data
   * @returns GalleryData if post contains a gallery, null otherwise
   */
  extractGalleryData(post: RedditPostData): GalleryData | null {
    // Check if post has gallery_data and media_metadata
    if (!post.gallery_data || !post.media_metadata) {
      return null;
    }
    
    const images: string[] = [];
    
    // Iterate through gallery items and extract image URLs
    for (const item of post.gallery_data.items) {
      const mediaId = item.media_id;
      const mediaInfo = post.media_metadata[mediaId];
      
      // Extract the image URL from the media metadata
      if (mediaInfo?.s?.u) {
        // Decode HTML entities in the URL (Reddit encodes & as &amp;)
        const imageURL = mediaInfo.s.u.replace(/&amp;/g, '&');
        images.push(imageURL);
      }
    }
    
    // Only return gallery data if we found at least one image
    if (images.length > 0) {
      return { images };
    }
    
    return null;
  }
  
  /**
   * Check if a URL has a valid image format extension
   * Supports JPEG, PNG, GIF, and WEBP formats
   * @param url The URL to check
   * @returns true if URL ends with a supported image extension
   */
  private isValidImageFormat(url: string): boolean {
    const lowerURL = url.toLowerCase();
    return (
      lowerURL.endsWith('.jpg') ||
      lowerURL.endsWith('.jpeg') ||
      lowerURL.endsWith('.png') ||
      lowerURL.endsWith('.gif') ||
      lowerURL.endsWith('.webp')
    );
  }
}

console.log('Response Parser loaded');

// Infinite Scroll Manager Implementation

export class InfiniteScrollManager {
  private enabled: boolean = false;
  private onLoadMore: (() => Promise<void>) | null = null;
  private scrollThreshold: number = 1500; // pixels from bottom
  private isThrottled: boolean = false;
  private throttleDelay: number = 200; // milliseconds
  
  /**
   * Initialize scroll listener with callback
   * @param onLoadMore Callback to trigger when user scrolls near bottom
   */
  initialize(onLoadMore: () => Promise<void>): void {
    this.onLoadMore = onLoadMore;
    this.enabled = true;
    window.addEventListener('scroll', this.handleScroll);
    window.addEventListener('resize', this.handleScroll);
    console.log('InfiniteScrollManager initialized');
  }
  
  /**
   * Handle scroll events with throttling
   */
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
  
  /**
   * Check if user has scrolled near bottom of page
   * @returns True if within threshold distance from bottom
   */
  checkScrollPosition(): boolean {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
    
    return distanceFromBottom <= this.scrollThreshold;
  }
  
  /**
   * Enable or disable scroll detection
   * @param enabled Whether scroll detection should be active
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Clean up event listeners
   */
  destroy(): void {
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleScroll);
    this.enabled = false;
    this.onLoadMore = null;
    console.log('InfiniteScrollManager destroyed');
  }
}

console.log('InfiniteScrollManager loaded');

// Loading Indicator Component

export class LoadingIndicator {
  private container: HTMLElement;
  private spinner: HTMLElement;
  private endMessage: HTMLElement;
  private errorContainer: HTMLElement;
  
  constructor() {
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'loading-indicator';
    
    // Create spinner element
    this.spinner = document.createElement('div');
    this.spinner.className = 'loading-spinner';
    this.spinner.textContent = 'Loading more...';
    
    // Create end message
    this.endMessage = document.createElement('div');
    this.endMessage.className = 'end-message';
    this.endMessage.textContent = 'No more content available';
    
    // Create error container
    this.errorContainer = document.createElement('div');
    this.errorContainer.className = 'error-message';
    
    // Add all elements to container
    this.container.appendChild(this.spinner);
    this.container.appendChild(this.endMessage);
    this.container.appendChild(this.errorContainer);
    
    // Hide by default
    this.hide();
    
    console.log('LoadingIndicator created');
  }
  
  /**
   * Show loading spinner
   */
  show(): void {
    this.spinner.style.display = 'block';
    this.endMessage.style.display = 'none';
    this.errorContainer.style.display = 'none';
    this.container.style.display = 'block';
  }
  
  /**
   * Hide the indicator
   */
  hide(): void {
    this.container.style.display = 'none';
  }
  
  /**
   * Show "no more content" message
   */
  showEndMessage(): void {
    this.spinner.style.display = 'none';
    this.endMessage.style.display = 'block';
    this.errorContainer.style.display = 'none';
    this.container.style.display = 'block';
  }
  
  /**
   * Show error with retry button
   * @param message Error message to display
   * @param onRetry Callback for retry button click
   */
  showError(message: string, onRetry: () => void): void {
    this.spinner.style.display = 'none';
    this.endMessage.style.display = 'none';
    
    // Clear and rebuild error container
    this.errorContainer.innerHTML = '';
    
    const errorText = document.createElement('p');
    errorText.textContent = message;
    
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry';
    retryButton.className = 'retry-button';
    retryButton.onclick = onRetry;
    
    this.errorContainer.appendChild(errorText);
    this.errorContainer.appendChild(retryButton);
    this.errorContainer.style.display = 'block';
    this.container.style.display = 'block';
  }
  
  /**
   * Get the container element
   * @returns The loading indicator container element
   */
  getElement(): HTMLElement {
    return this.container;
  }
}

console.log('LoadingIndicator loaded');

// State Manager Implementation

export class StateManager {
  // Application state
  private state: ApplicationState;
  
  // Pagination state
  private paginationToken: string | null = null;
  private hasMoreContent: boolean = true;
  private isLoadingMore: boolean = false;
  
  // Dependencies
  private apiClient: APIClient;
  private responseParser: ResponseParser;
  private urlRouter: URLRouter;
  private mediaGallery?: MediaGallery;
  private errorDisplay?: ErrorDisplay;
  private loadingIndicator?: LoadingIndicator;
  
  // Callback for UI updates
  private onStateChange?: () => void;
  
  /**
   * Create a new StateManager with default values
   * @param apiClient The API client for fetching data
   * @param responseParser The response parser for extracting media
   * @param urlRouter The URL router for navigation
   */
  constructor(
    apiClient: APIClient,
    responseParser: ResponseParser,
    urlRouter: URLRouter
  ) {
    this.apiClient = apiClient;
    this.responseParser = responseParser;
    this.urlRouter = urlRouter;
    
    // Initialize state with default values
    this.state = {
      contentSource: null,
      sortOrder: 'hot',
      timespan: 'day',
      columnCount: 5,
      showVideos: true,
      expandGalleries: false, // Default to carousel mode
      mediaPosts: [],
      isLoading: false,
      error: null
    };
    
    // Load preferences from session storage if available
    this.loadPreferencesFromSession();
  }
  
  /**
   * Load preferences from session storage and apply to state
   */
  private loadPreferencesFromSession(): void {
    const preferences = loadPreferences();
    
    if (preferences) {
      this.state.columnCount = preferences.columnCount;
      this.state.showVideos = preferences.showVideos;
      this.state.expandGalleries = preferences.expandGalleries;
      console.log('Loaded preferences from session storage:', preferences);
    }
  }
  
  /**
   * Save current preferences to session storage
   */
  private savePreferencesToSession(): void {
    const preferences: SessionStorage = {
      columnCount: this.state.columnCount,
      showVideos: this.state.showVideos,
      expandGalleries: this.state.expandGalleries
    };
    
    savePreferences(preferences);
  }
  
  /**
   * Get the current application state
   * @returns The current ApplicationState
   */
  getState(): ApplicationState {
    return { ...this.state };
  }
  
  /**
   * Set a callback to be called when state changes
   * @param callback Function to call when state updates
   */
  setOnStateChange(callback: () => void): void {
    this.onStateChange = callback;
  }
  
  /**
   * Set the media gallery reference for video pause functionality
   * @param gallery The MediaGallery instance
   */
  setMediaGallery(gallery: MediaGallery): void {
    this.mediaGallery = gallery;
  }
  
  /**
   * Set the error display reference for showing errors
   * @param errorDisplay The ErrorDisplay instance
   */
  setErrorDisplay(errorDisplay: ErrorDisplay): void {
    this.errorDisplay = errorDisplay;
  }
  
  /**
   * Set the loading indicator reference for infinite scroll
   * @param loadingIndicator The LoadingIndicator instance
   */
  setLoadingIndicator(loadingIndicator: LoadingIndicator): void {
    this.loadingIndicator = loadingIndicator;
  }
  
  /**
   * Trigger UI update callback
   */
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }
  
  /**
   * Set the content source and load content
   * @param source The content source to load
   */
  async setContentSource(source: ContentSource): Promise<void> {
    // Pause all playing videos before navigating to new content
    // Requirements: 10.5
    if (this.mediaGallery) {
      this.mediaGallery.pauseAllVideos();
    }
    
    this.state.contentSource = source;
    this.urlRouter.updateURL(source);
    await this.loadContent();
  }
  
  /**
   * Set the sort order and reload content if a source is loaded
   * @param order The sort order to apply
   */
  async setSortOrder(order: SortOrder): Promise<void> {
    this.state.sortOrder = order;
    
    // Reload content if we have a content source
    if (this.state.contentSource) {
      await this.loadContent();
    } else {
      this.notifyStateChange();
    }
  }
  
  /**
   * Set the timespan and reload content if a source is loaded
   * @param timespan The timespan to apply
   */
  async setTimespan(timespan: Timespan): Promise<void> {
    this.state.timespan = timespan;
    
    // Reload content if we have a content source
    if (this.state.contentSource) {
      await this.loadContent();
    } else {
      this.notifyStateChange();
    }
  }
  
  /**
   * Set the column count for the grid layout
   * @param count The number of columns (1-6)
   */
  setColumnCount(count: number): void {
    // Validate column count is in valid range
    if (count < 1 || count > 6) {
      console.warn(`Invalid column count: ${count}. Must be between 1 and 6.`);
      return;
    }
    
    this.state.columnCount = count;
    this.savePreferencesToSession();
    this.notifyStateChange();
  }
  
  /**
   * Set whether to show videos in the gallery
   * @param show true to show videos, false to hide them
   */
  setShowVideos(show: boolean): void {
    this.state.showVideos = show;
    this.savePreferencesToSession();
    this.notifyStateChange();
  }
  
  /**
   * Set whether to expand galleries or use carousel mode
   * @param expand true for expanded mode, false for carousel mode
   */
  setExpandGalleries(expand: boolean): void {
    this.state.expandGalleries = expand;
    this.savePreferencesToSession();
    this.notifyStateChange();
  }
  
  /**
   * Load content from the current content source
   * Orchestrates API fetch and response parsing
   */
  async loadContent(): Promise<void> {
    // Can't load content without a content source
    if (!this.state.contentSource) {
      return;
    }
    
    // Reset pagination state
    this.paginationToken = null;
    this.hasMoreContent = true;
    this.isLoadingMore = false;
    
    // Set loading state
    this.state.isLoading = true;
    this.state.error = null;
    this.state.mediaPosts = []; // Clear existing posts
    this.notifyStateChange();
    
    try {
      const source = this.state.contentSource;
      let result: RedditAPIResult;
      
      // Determine if we need to include timespan parameter
      const needsTimespan = 
        this.state.sortOrder === 'top' || 
        this.state.sortOrder === 'controversial';
      const timespan = needsTimespan ? this.state.timespan : undefined;
      
      // Fetch posts based on content source type
      if (source.type === 'subreddit') {
        result = await this.apiClient.fetchSubreddit(
          source.name,
          this.state.sortOrder,
          timespan
        );
      } else {
        // source.type === 'user'
        result = await this.apiClient.fetchUserPosts(
          source.username,
          this.state.sortOrder,
          timespan
        );
      }
      
      // Parse the response to extract media posts
      const response: RedditAPIResponse = {
        kind: 'Listing',
        data: {
          children: result.posts.map(post => ({
            kind: 't3' as const,
            data: post
          })),
          after: result.after,
          before: null
        }
      };
      
      const parsedResult = this.responseParser.parseResponse(response);
      this.state.mediaPosts = parsedResult.mediaPosts;
      
      // Store pagination token and update hasMoreContent
      this.paginationToken = parsedResult.after;
      this.hasMoreContent = parsedResult.after !== null;
      
      // Check if we have no media posts
      // Requirements: 6.1, 6.2
      if (this.state.mediaPosts.length === 0) {
        // Distinguish between no posts at all vs posts with no media
        if (result.posts.length === 0) {
          // No posts found at all
          const sourceType = this.state.contentSource.type === 'subreddit' ? 'subreddit' : 'profile';
          this.state.error = `This ${sourceType} has no posts yet`;
          
          if (this.errorDisplay) {
            this.errorDisplay.show(this.state.error, false);
          }
        } else {
          // Posts exist but no media content
          const sourceType = this.state.contentSource.type === 'subreddit' ? 'subreddit' : 'profile';
          this.state.error = `No images or videos found in this ${sourceType}`;
          
          if (this.errorDisplay) {
            this.errorDisplay.show(this.state.error, false);
          }
        }
      }
      
      // Clear loading state
      this.state.isLoading = false;
      
      // Hide error display if we have media posts
      if (this.state.mediaPosts.length > 0 && this.errorDisplay) {
        this.errorDisplay.hide();
        this.state.error = null;
      }
      
    } catch (error) {
      // Handle errors
      this.state.isLoading = false;
      
      if (error instanceof Error) {
        // Parse error message to provide user-friendly feedback
        const errorMessage = error.message;
        
        if (errorMessage.includes('HTTP 404')) {
          // Content source not found
          if (this.state.contentSource.type === 'subreddit') {
            this.state.error = `Subreddit 'r/${this.state.contentSource.name}' not found. Please check the spelling and try again.`;
          } else {
            this.state.error = `User 'u/${this.state.contentSource.username}' not found. Please check the spelling and try again.`;
          }
        } else if (errorMessage.includes('HTTP 429')) {
          // Rate limit exceeded
          this.state.error = 'Too many requests. Please wait a moment and try again.';
        } else if (errorMessage.includes('HTTP 503')) {
          // Service unavailable
          this.state.error = 'Reddit is temporarily unavailable. Please try again later.';
        } else if (errorMessage.includes('Failed to fetch')) {
          // Network error
          this.state.error = 'Unable to connect to Reddit. Please check your internet connection.';
        } else {
          // Generic error
          this.state.error = 'Something went wrong while loading content. Please try again.';
        }
        
        // Log detailed error for debugging
        console.error('Error loading content:', error);
      } else {
        this.state.error = 'Something went wrong while loading content. Please try again.';
        console.error('Unknown error loading content:', error);
      }
      
      // Clear media posts on error
      this.state.mediaPosts = [];
      
      // Show error display if it exists
      if (this.errorDisplay && this.state.error) {
        this.errorDisplay.show(this.state.error, true);
      }
    }
    
    // Notify UI of state change
    this.notifyStateChange();
  }
  
  /**
   * Load more content for infinite scroll
   * Appends new posts to existing content
   */
  async loadMoreContent(): Promise<void> {
    // Prevent concurrent requests or loading when no more content
    if (this.isLoadingMore || !this.hasMoreContent || this.state.isLoading) {
      return;
    }
    
    // Can't load more without a content source
    if (!this.state.contentSource) {
      return;
    }
    
    // Set loading more state
    this.isLoadingMore = true;
    
    // Show loading indicator
    if (this.loadingIndicator) {
      this.loadingIndicator.show();
    }
    
    try {
      const source = this.state.contentSource;
      let result: RedditAPIResult;
      
      // Determine if we need to include timespan parameter
      const needsTimespan = 
        this.state.sortOrder === 'top' || 
        this.state.sortOrder === 'controversial';
      const timespan = needsTimespan ? this.state.timespan : undefined;
      
      // Fetch posts based on content source type with pagination token
      if (source.type === 'subreddit') {
        result = await this.apiClient.fetchSubreddit(
          source.name,
          this.state.sortOrder,
          timespan,
          this.paginationToken || undefined
        );
      } else {
        // source.type === 'user'
        result = await this.apiClient.fetchUserPosts(
          source.username,
          this.state.sortOrder,
          timespan,
          this.paginationToken || undefined
        );
      }
      
      // Parse the response to extract media posts
      const response: RedditAPIResponse = {
        kind: 'Listing',
        data: {
          children: result.posts.map(post => ({
            kind: 't3' as const,
            data: post
          })),
          after: result.after,
          before: null
        }
      };
      
      const parsedResult = this.responseParser.parseResponse(response);
      
      // Append new posts to existing
      this.state.mediaPosts = [...this.state.mediaPosts, ...parsedResult.mediaPosts];
      
      // Update pagination token and hasMoreContent
      this.paginationToken = parsedResult.after;
      this.hasMoreContent = parsedResult.after !== null;
      
      // Show end message if no more content
      if (!this.hasMoreContent && this.loadingIndicator) {
        this.loadingIndicator.showEndMessage();
      } else if (this.loadingIndicator) {
        this.loadingIndicator.hide();
      }
      
    } catch (error) {
      // Handle errors
      let errorMessage = 'Failed to load more content. Please try again.';
      
      if (error instanceof Error) {
        const msg = error.message;
        
        if (msg.includes('HTTP 429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (msg.includes('HTTP 503')) {
          errorMessage = 'Reddit is temporarily unavailable. Please try again later.';
        } else if (msg.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to Reddit. Please check your internet connection.';
        }
        
        console.error('Error loading more content:', error);
      }
      
      // Show error with retry button
      if (this.loadingIndicator) {
        this.loadingIndicator.showError(errorMessage, () => this.loadMoreContent());
      }
    } finally {
      this.isLoadingMore = false;
    }
    
    // Notify UI of state change
    this.notifyStateChange();
  }
}

console.log('State Manager loaded');

// Session Storage Utilities

const SESSION_STORAGE_KEY = 'reddit-image-viewer-preferences';

/**
 * Save user preferences to session storage
 * @param preferences The preferences to save (columnCount, showVideos, expandGalleries)
 */
export function savePreferences(preferences: SessionStorage): void {
  try {
    const json = JSON.stringify(preferences);
    sessionStorage.setItem(SESSION_STORAGE_KEY, json);
  } catch (error) {
    console.error('Failed to save preferences to session storage:', error);
  }
}

/**
 * Load user preferences from session storage
 * @returns SessionStorage object if preferences exist, null otherwise
 */
export function loadPreferences(): SessionStorage | null {
  try {
    const json = sessionStorage.getItem(SESSION_STORAGE_KEY);
    
    if (!json) {
      return null;
    }
    
    const preferences = JSON.parse(json) as SessionStorage;
    
    // Validate the loaded preferences have the expected structure
    if (
      typeof preferences.columnCount === 'number' &&
      typeof preferences.showVideos === 'boolean' &&
      typeof preferences.expandGalleries === 'boolean'
    ) {
      return preferences;
    }
    
    // Invalid structure, return null
    console.warn('Invalid preferences structure in session storage');
    return null;
    
  } catch (error) {
    console.error('Failed to load preferences from session storage:', error);
    return null;
  }
}

console.log('Session Storage utilities loaded');

// Debounce Manager Implementation

export class DebounceManager {
  private timeoutId: number | null = null;
  
  /**
   * Schedule a function to run after the debounce delay
   * Cancels any previously scheduled function
   * @param fn The function to execute after the delay
   * @param delay The delay in milliseconds (default 300ms)
   */
  debounce(fn: () => void, delay: number = 300): void {
    // Cancel previous timer if it exists
    this.cancel();
    
    // Set new timer
    this.timeoutId = window.setTimeout(() => {
      fn();
      this.timeoutId = null;
    }, delay);
  }
  
  /**
   * Cancel any pending debounced function
   */
  cancel(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

console.log('DebounceManager loaded');

// Suggestion API Client Implementation

export class SuggestionAPIClient {
  private readonly corsProxy = 'https://corsproxy.io/?';
  private currentAbortController: AbortController | null = null;
  
  /**
   * Fetch subreddit suggestions from Reddit API
   * @param query The search query
   * @param signal Optional AbortSignal for request cancellation
   * @returns Promise resolving to array of search suggestions
   */
  async fetchSubredditSuggestions(query: string, signal?: AbortSignal): Promise<SearchSuggestion[]> {
    try {
      // Construct Reddit search API URL for subreddits
      const redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&type=sr&limit=10`;
      const url = this.corsProxy + encodeURIComponent(redditUrl);
      
      const response = await fetch(url, {
        method: 'GET',
        signal
      });
      
      if (!response.ok) {
        // Fail silently - return empty array
        return [];
      }
      
      const data = await response.json();
      
      // Parse response and extract suggestions
      const suggestions: SearchSuggestion[] = [];
      
      if (data.data && data.data.children) {
        for (const child of data.data.children) {
          const subreddit = child.data;
          suggestions.push({
            name: subreddit.display_name || subreddit.title,
            type: 'subreddit',
            subscribers: subreddit.subscribers,
            iconUrl: subreddit.icon_img || subreddit.community_icon
          });
        }
      }
      
      return suggestions.slice(0, 10);
    } catch (error) {
      // Fail silently - return empty array
      // This includes AbortError when request is cancelled
      return [];
    }
  }
  
  /**
   * Fetch username suggestions from Reddit API
   * @param query The search query
   * @param signal Optional AbortSignal for request cancellation
   * @returns Promise resolving to array of search suggestions
   */
  async fetchUsernameSuggestions(query: string, signal?: AbortSignal): Promise<SearchSuggestion[]> {
    try {
      // Construct Reddit search API URL for users
      const redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&type=user&limit=10`;
      const url = this.corsProxy + encodeURIComponent(redditUrl);
      
      const response = await fetch(url, {
        method: 'GET',
        signal
      });
      
      if (!response.ok) {
        // Fail silently - return empty array
        return [];
      }
      
      const data = await response.json();
      
      // Parse response and extract suggestions
      const suggestions: SearchSuggestion[] = [];
      
      if (data.data && data.data.children) {
        for (const child of data.data.children) {
          const user = child.data;
          suggestions.push({
            name: user.name || user.title,
            type: 'user',
            iconUrl: user.icon_img
          });
        }
      }
      
      return suggestions.slice(0, 10);
    } catch (error) {
      // Fail silently - return empty array
      // This includes AbortError when request is cancelled
      return [];
    }
  }
  
  /**
   * Cancel all pending requests
   */
  cancelPendingRequests(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }
}

console.log('SuggestionAPIClient loaded');

// Typeahead Dropdown Implementation

export class TypeaheadDropdown {
  private container: HTMLElement;
  private state: TypeaheadState;
  private onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  
  /**
   * Create a new TypeaheadDropdown component
   */
  constructor() {
    this.state = {
      isVisible: false,
      suggestions: [],
      activeSuggestionIndex: -1,
      isLoading: false
    };
    
    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'typeahead-dropdown';
    this.container.style.display = 'none';
  }
  
  /**
   * Get the container element to append to the DOM
   * @returns The dropdown container element
   */
  getElement(): HTMLElement {
    return this.container;
  }
  
  /**
   * Show the dropdown with suggestions
   * @param suggestions Array of search suggestions (max 10)
   */
  show(suggestions: SearchSuggestion[]): void {
    // Limit to 10 suggestions
    this.state.suggestions = suggestions.slice(0, 10);
    this.state.isVisible = true;
    this.state.activeSuggestionIndex = -1;
    
    // Render suggestions
    this.render();
    
    // Show container
    this.container.style.display = 'block';
    this.container.classList.add('visible');
  }
  
  /**
   * Hide the dropdown
   */
  hide(): void {
    this.state.isVisible = false;
    this.container.style.display = 'none';
    this.container.classList.remove('visible');
  }
  
  /**
   * Check if dropdown is currently visible
   * @returns true if visible, false otherwise
   */
  isVisible(): boolean {
    return this.state.isVisible;
  }
  
  /**
   * Clear all suggestions
   */
  clear(): void {
    this.state.suggestions = [];
    this.state.activeSuggestionIndex = -1;
    this.container.innerHTML = '';
  }
  
  /**
   * Get the currently active (highlighted) suggestion
   * @returns The active suggestion or null if none
   */
  getActiveSuggestion(): SearchSuggestion | null {
    if (this.state.activeSuggestionIndex >= 0 && 
        this.state.activeSuggestionIndex < this.state.suggestions.length) {
      return this.state.suggestions[this.state.activeSuggestionIndex];
    }
    return null;
  }
  
  /**
   * Set the active suggestion by index
   * @param index The index of the suggestion to activate
   */
  setActiveSuggestion(index: number): void {
    if (index < -1 || index >= this.state.suggestions.length) {
      return;
    }
    
    this.state.activeSuggestionIndex = index;
    this.updateActiveSuggestionStyling();
  }
  
  /**
   * Handle keyboard navigation
   * @param key The key pressed (ArrowUp, ArrowDown, Enter, Escape)
   */
  handleKeyboardNavigation(key: 'ArrowUp' | 'ArrowDown' | 'Enter' | 'Escape'): void {
    switch (key) {
      case 'ArrowDown':
        // Move to next suggestion
        if (this.state.activeSuggestionIndex < this.state.suggestions.length - 1) {
          this.setActiveSuggestion(this.state.activeSuggestionIndex + 1);
        }
        break;
        
      case 'ArrowUp':
        // Move to previous suggestion
        if (this.state.activeSuggestionIndex > 0) {
          this.setActiveSuggestion(this.state.activeSuggestionIndex - 1);
        } else if (this.state.activeSuggestionIndex === 0) {
          // Deactivate if at first suggestion
          this.setActiveSuggestion(-1);
        }
        break;
        
      case 'Enter':
        // Selection is handled by the parent component
        break;
        
      case 'Escape':
        this.hide();
        break;
    }
  }
  
  /**
   * Set the callback for when a suggestion is clicked
   * @param callback Function to call with the clicked suggestion
   */
  setOnSuggestionClick(callback: (suggestion: SearchSuggestion) => void): void {
    this.onSuggestionClick = callback;
  }
  
  /**
   * Render the suggestions in the dropdown
   */
  private render(): void {
    // Clear existing content
    this.container.innerHTML = '';
    
    if (this.state.suggestions.length === 0) {
      // Show "No results found" message
      const noResults = document.createElement('div');
      noResults.className = 'typeahead-no-results';
      noResults.textContent = 'No results found';
      this.container.appendChild(noResults);
      return;
    }
    
    // Render each suggestion
    this.state.suggestions.forEach((suggestion, index) => {
      const suggestionElement = this.createSuggestionElement(suggestion, index);
      this.container.appendChild(suggestionElement);
    });
  }
  
  /**
   * Create a suggestion element
   * @param suggestion The suggestion data
   * @param index The index of the suggestion
   * @returns The suggestion HTML element
   */
  private createSuggestionElement(suggestion: SearchSuggestion, index: number): HTMLElement {
    const element = document.createElement('div');
    element.className = 'typeahead-suggestion';
    element.dataset.index = index.toString();
    
    // Add active class if this is the active suggestion
    if (index === this.state.activeSuggestionIndex) {
      element.classList.add('active');
    }
    
    // Create name element
    const nameElement = document.createElement('div');
    nameElement.className = 'typeahead-suggestion-name';
    const prefix = suggestion.type === 'subreddit' ? 'r/' : 'u/';
    nameElement.textContent = prefix + suggestion.name;
    element.appendChild(nameElement);
    
    // Create metadata element if subscribers count is available
    if (suggestion.subscribers !== undefined) {
      const metaElement = document.createElement('div');
      metaElement.className = 'typeahead-suggestion-meta';
      metaElement.textContent = this.formatSubscriberCount(suggestion.subscribers);
      element.appendChild(metaElement);
    }
    
    // Add click handler
    element.addEventListener('click', () => {
      if (this.onSuggestionClick) {
        this.onSuggestionClick(suggestion);
      }
    });
    
    // Add hover handler to update active suggestion
    element.addEventListener('mouseenter', () => {
      this.setActiveSuggestion(index);
    });
    
    return element;
  }
  
  /**
   * Update the active suggestion styling
   */
  private updateActiveSuggestionStyling(): void {
    // Remove active class from all suggestions
    const suggestions = this.container.querySelectorAll('.typeahead-suggestion');
    suggestions.forEach(el => el.classList.remove('active'));
    
    // Add active class to the current active suggestion
    if (this.state.activeSuggestionIndex >= 0) {
      const activeElement = this.container.querySelector(
        `.typeahead-suggestion[data-index="${this.state.activeSuggestionIndex}"]`
      );
      if (activeElement) {
        activeElement.classList.add('active');
        // Scroll into view if needed
        activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }
  
  /**
   * Format subscriber count for display
   * @param count The subscriber count
   * @returns Formatted string (e.g., "1.2M subscribers")
   */
  private formatSubscriberCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M subscribers`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K subscribers`;
    } else {
      return `${count} subscribers`;
    }
  }
}

console.log('TypeaheadDropdown loaded');

// Search Interface Implementation

export class SearchInterface {
  private container: HTMLElement;
  private inputElement: HTMLInputElement;
  private subredditRadio: HTMLInputElement;
  private userRadio: HTMLInputElement;
  private errorElement: HTMLElement;
  private stateManager: StateManager;
  
  // Typeahead components
  private typeaheadDropdown: TypeaheadDropdown;
  private debounceManager: DebounceManager;
  private suggestionAPIClient: SuggestionAPIClient;
  private currentAbortController: AbortController | null = null;
  
  /**
   * Create a new SearchInterface component
   * @param stateManager The state manager for triggering content loading
   */
  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    
    // Initialize typeahead components
    this.typeaheadDropdown = new TypeaheadDropdown();
    this.debounceManager = new DebounceManager();
    this.suggestionAPIClient = new SuggestionAPIClient();
    
    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'search-interface';
    this.container.style.position = 'relative'; // For absolute positioning of dropdown
    
    // Create form element
    const form = document.createElement('form');
    form.className = 'search-form';
    
    // Create source selector (radio buttons)
    const sourceSelector = document.createElement('div');
    sourceSelector.className = 'source-selector';
    
    const sourceLabel = document.createElement('label');
    sourceLabel.textContent = 'Search for:';
    sourceSelector.appendChild(sourceLabel);
    
    // Subreddit radio button
    const subredditLabel = document.createElement('label');
    subredditLabel.className = 'radio-label';
    this.subredditRadio = document.createElement('input');
    this.subredditRadio.type = 'radio';
    this.subredditRadio.name = 'source-type';
    this.subredditRadio.value = 'subreddit';
    this.subredditRadio.checked = true; // Default to subreddit
    subredditLabel.appendChild(this.subredditRadio);
    subredditLabel.appendChild(document.createTextNode(' Subreddit'));
    sourceSelector.appendChild(subredditLabel);
    
    // User radio button
    const userLabel = document.createElement('label');
    userLabel.className = 'radio-label';
    this.userRadio = document.createElement('input');
    this.userRadio.type = 'radio';
    this.userRadio.name = 'source-type';
    this.userRadio.value = 'user';
    userLabel.appendChild(this.userRadio);
    userLabel.appendChild(document.createTextNode(' User'));
    sourceSelector.appendChild(userLabel);
    
    form.appendChild(sourceSelector);
    
    // Create input field with typeahead wrapper
    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';
    inputGroup.style.position = 'relative'; // For dropdown positioning
    
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.className = 'search-input';
    this.inputElement.placeholder = 'Enter subreddit name or username';
    inputGroup.appendChild(this.inputElement);
    
    // Append typeahead dropdown to input group
    inputGroup.appendChild(this.typeaheadDropdown.getElement());
    
    form.appendChild(inputGroup);
    
    // Create error message element
    this.errorElement = document.createElement('div');
    this.errorElement.className = 'error-message';
    this.errorElement.style.display = 'none';
    form.appendChild(this.errorElement);
    
    // Handle form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
    
    this.container.appendChild(form);
    
    // Set up typeahead event listeners
    this.setupTypeaheadListeners();
  }
  
  /**
   * Get the rendered HTML element
   * @returns The container element for the search interface
   */
  render(): HTMLElement {
    return this.container;
  }
  
  /**
   * Get the current input value
   * @returns The trimmed input value
   */
  getValue(): string {
    return this.inputElement.value.trim();
  }
  
  /**
   * Get the current source type selection
   * @returns 'subreddit' or 'user' based on radio button selection
   */
  getSourceType(): 'subreddit' | 'user' {
    return this.subredditRadio.checked ? 'subreddit' : 'user';
  }
  
  /**
   * Validate the current input based on the selected source type
   * @returns ValidationResult with valid flag and optional error message
   */
  validate(): ValidationResult {
    const value = this.getValue();
    const sourceType = this.getSourceType();
    
    if (sourceType === 'subreddit') {
      return validateSubredditName(value);
    } else {
      return validateUsername(value);
    }
  }
  
  /**
   * Display an error message
   * @param message The error message to display
   */
  private showError(message: string): void {
    this.errorElement.textContent = message;
    this.errorElement.style.display = 'block';
  }
  
  /**
   * Hide the error message
   */
  private hideError(): void {
    this.errorElement.style.display = 'none';
    this.errorElement.textContent = '';
  }
  
  /**
   * Handle form submission
   * Validates input and triggers content loading if valid
   */
  private async handleSubmit(): Promise<void> {
    // Hide any previous error
    this.hideError();
    
    // Validate input
    const validationResult = this.validate();
    
    if (!validationResult.valid) {
      // Display validation error
      this.showError(validationResult.error || 'Invalid input');
      return;
    }
    
    // Create content source from input
    const value = this.getValue();
    const sourceType = this.getSourceType();
    
    const contentSource: ContentSource = sourceType === 'subreddit'
      ? { type: 'subreddit', name: value }
      : { type: 'user', username: value };
    
    // Trigger content loading through state manager
    try {
      await this.stateManager.setContentSource(contentSource);
      // API errors will be displayed by the ErrorDisplay component
      // No need to show them here
    } catch (error) {
      // Handle unexpected errors
      this.showError('An unexpected error occurred. Please try again.');
      console.error('Error in search submission:', error);
    }
  }
  
  /**
   * Set up all event listeners for typeahead functionality
   * Requirements: 1.1.1, 1.1.3, 1.1.4, 1.1.6, 1.1.7, 1.1.8, 1.1.9, 1.1.10, 1.1.11, 1.1.13, 1.1.15
   */
  private setupTypeaheadListeners(): void {
    // Input event listener for typing
    this.inputElement.addEventListener('input', () => this.handleInput());
    
    // Keydown event listener for keyboard navigation
    this.inputElement.addEventListener('keydown', (e) => this.handleKeyDown(e));
    
    // Source selector change listeners
    this.subredditRadio.addEventListener('change', () => this.handleSourceChange());
    this.userRadio.addEventListener('change', () => this.handleSourceChange());
    
    // Document click listener for outside clicks
    document.addEventListener('click', (e) => this.handleOutsideClick(e));
    
    // Typeahead dropdown click callback for suggestion selection
    this.typeaheadDropdown.setOnSuggestionClick((suggestion) => this.selectSuggestion(suggestion));
  }
  
  /**
   * Process typing events with debouncing
   * Requirements: 1.1.1, 1.1.3, 1.1.4, 1.1.11
   */
  private handleInput(): void {
    const value = this.inputElement.value.trim();
    
    // Hide dropdown if input is empty or < 2 characters
    if (value.length < 2) {
      this.typeaheadDropdown.hide();
      return;
    }
    
    // Cancel any pending abort controller
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    
    // Use debounceManager to debounce the API call (300ms)
    this.debounceManager.debounce(async () => {
      // Create new AbortController for the request
      this.currentAbortController = new AbortController();
      
      try {
        // Call suggestionAPIClient with appropriate method based on source type
        const sourceType = this.getSourceType();
        const suggestions = sourceType === 'subreddit'
          ? await this.suggestionAPIClient.fetchSubredditSuggestions(value, this.currentAbortController.signal)
          : await this.suggestionAPIClient.fetchUsernameSuggestions(value, this.currentAbortController.signal);
        
        // Show dropdown with suggestions if results are returned
        if (suggestions.length > 0) {
          this.typeaheadDropdown.show(suggestions);
        } else {
          this.typeaheadDropdown.hide();
        }
      } catch (error) {
        // If request was aborted, ignore the error
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        // For other errors, hide dropdown silently (fail gracefully)
        this.typeaheadDropdown.hide();
      }
    }, 300);
  }
  
  /**
   * Handle keyboard navigation
   * Requirements: 1.1.8, 1.1.9
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // If dropdown is not visible, return early
    if (!this.typeaheadDropdown.isVisible()) {
      return;
    }
    
    // Handle ArrowUp, ArrowDown, Enter, Escape keys
    if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
      // Delegate to typeaheadDropdown.handleKeyboardNavigation()
      this.typeaheadDropdown.handleKeyboardNavigation(event.key as 'ArrowUp' | 'ArrowDown' | 'Enter' | 'Escape');
      
      // On Enter: call selectSuggestion() with active suggestion
      if (event.key === 'Enter') {
        const activeSuggestion = this.typeaheadDropdown.getActiveSuggestion();
        if (activeSuggestion) {
          this.selectSuggestion(activeSuggestion);
        }
      }
      
      // Prevent default behavior for handled keys
      event.preventDefault();
    }
  }
  
  /**
   * Populate input and load content
   * Requirements: 1.1.6, 1.1.9
   */
  private selectSuggestion(suggestion: SearchSuggestion): void {
    // Set inputElement.value to suggestion.name
    this.inputElement.value = suggestion.name;
    
    // Hide the dropdown
    this.typeaheadDropdown.hide();
    
    // Call handleSubmit() to load the content
    this.handleSubmit();
  }
  
  /**
   * Hide dropdown on outside clicks
   * Requirements: 1.1.7
   */
  private handleOutsideClick(event: Event): void {
    const target = event.target as Node;
    
    // Check if click target is outside the container
    if (!this.container.contains(target)) {
      // If outside, hide the dropdown
      this.typeaheadDropdown.hide();
    }
  }
  
  /**
   * Clear dropdown and input when mode changes
   * Requirements: 1.1.15
   */
  private handleSourceChange(): void {
    // Clear the input field
    this.inputElement.value = '';
    
    // Hide the dropdown
    this.typeaheadDropdown.hide();
    
    // Cancel any pending requests
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }
}

console.log('Search Interface loaded');

/**
 * Main Application Initialization
 * Task 21.1: Wire all components together
 * Requirements: 5.1, 5.2, 5.3
 */

// Sort Interface Implementation

export class SortInterface {
  private container: HTMLElement;
  private sortOrderSelect: HTMLSelectElement;
  private timespanSelect: HTMLSelectElement;
  private timespanContainer: HTMLElement;
  private stateManager: StateManager;
  
  /**
   * Create a new SortInterface component
   * @param stateManager The state manager for updating sort configuration
   */
  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    
    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'sort-interface';
    
    // Create sort order section
    const sortOrderGroup = document.createElement('div');
    sortOrderGroup.className = 'sort-order-group';
    
    const sortOrderLabel = document.createElement('label');
    sortOrderLabel.textContent = 'Sort by:';
    sortOrderLabel.htmlFor = 'sort-order-select';
    sortOrderGroup.appendChild(sortOrderLabel);
    
    // Create sort order dropdown
    this.sortOrderSelect = document.createElement('select');
    this.sortOrderSelect.id = 'sort-order-select';
    this.sortOrderSelect.className = 'sort-order-select';
    
    // Add sort order options
    const sortOrders: Array<{ value: SortOrder; label: string }> = [
      { value: 'hot', label: 'Hot' },
      { value: 'new', label: 'New' },
      { value: 'top', label: 'Top' },
      { value: 'best', label: 'Best' },
      { value: 'rising', label: 'Rising' },
      { value: 'controversial', label: 'Controversial' }
    ];
    
    for (const sortOrder of sortOrders) {
      const option = document.createElement('option');
      option.value = sortOrder.value;
      option.textContent = sortOrder.label;
      this.sortOrderSelect.appendChild(option);
    }
    
    // Set default value to match state manager default (hot)
    this.sortOrderSelect.value = this.stateManager.getState().sortOrder;
    
    sortOrderGroup.appendChild(this.sortOrderSelect);
    this.container.appendChild(sortOrderGroup);
    
    // Create timespan section
    this.timespanContainer = document.createElement('div');
    this.timespanContainer.className = 'timespan-group';
    
    const timespanLabel = document.createElement('label');
    timespanLabel.textContent = 'Time:';
    timespanLabel.htmlFor = 'timespan-select';
    this.timespanContainer.appendChild(timespanLabel);
    
    // Create timespan dropdown
    this.timespanSelect = document.createElement('select');
    this.timespanSelect.id = 'timespan-select';
    this.timespanSelect.className = 'timespan-select';
    
    // Add timespan options
    const timespans: Array<{ value: Timespan; label: string }> = [
      { value: 'hour', label: 'Past Hour' },
      { value: 'day', label: 'Past Day' },
      { value: 'week', label: 'Past Week' },
      { value: 'month', label: 'Past Month' },
      { value: 'year', label: 'Past Year' },
      { value: 'all', label: 'All Time' }
    ];
    
    for (const timespan of timespans) {
      const option = document.createElement('option');
      option.value = timespan.value;
      option.textContent = timespan.label;
      this.timespanSelect.appendChild(option);
    }
    
    // Set default value to match state manager default (day)
    this.timespanSelect.value = this.stateManager.getState().timespan;
    
    this.timespanContainer.appendChild(this.timespanSelect);
    this.container.appendChild(this.timespanContainer);
    
    // Set initial timespan visibility based on current sort order
    this.updateTimespanVisibility(this.stateManager.getState().sortOrder);
    
    // Add event listeners
    this.sortOrderSelect.addEventListener('change', () => {
      this.handleSortOrderChange();
    });
    
    this.timespanSelect.addEventListener('change', () => {
      this.handleTimespanChange();
    });
  }
  
  /**
   * Get the rendered HTML element
   * @returns The container element for the sort interface
   */
  render(): HTMLElement {
    return this.container;
  }
  
  /**
   * Get the currently selected sort order
   * @returns The selected SortOrder value
   */
  getSortOrder(): SortOrder {
    return this.sortOrderSelect.value as SortOrder;
  }
  
  /**
   * Get the currently selected timespan
   * @returns The selected Timespan value
   */
  getTimespan(): Timespan {
    return this.timespanSelect.value as Timespan;
  }
  
  /**
   * Show or hide the timespan controls based on the sort order
   * Timespan is only applicable for 'top' and 'controversial' sort orders
   * @param sortOrder The current sort order
   */
  updateTimespanVisibility(sortOrder: SortOrder): void {
    // Show timespan only for 'top' and 'controversial' sort orders
    if (sortOrder === 'top' || sortOrder === 'controversial') {
      this.timespanContainer.style.display = 'flex';
    } else {
      this.timespanContainer.style.display = 'none';
    }
  }
  
  /**
   * Handle sort order change event
   * Updates timespan visibility and triggers state manager update
   */
  private async handleSortOrderChange(): Promise<void> {
    const sortOrder = this.getSortOrder();
    
    // Update timespan visibility based on new sort order
    this.updateTimespanVisibility(sortOrder);
    
    // Update state manager with new sort order
    await this.stateManager.setSortOrder(sortOrder);
  }
  
  /**
   * Handle timespan change event
   * Triggers state manager update
   */
  private async handleTimespanChange(): Promise<void> {
    const timespan = this.getTimespan();
    
    // Update state manager with new timespan
    await this.stateManager.setTimespan(timespan);
  }
  
  /**
   * Update the UI to reflect the current state
   * Called when state changes externally
   */
  updateFromState(): void {
    const state = this.stateManager.getState();
    
    // Update select values
    this.sortOrderSelect.value = state.sortOrder;
    this.timespanSelect.value = state.timespan;
    
    // Update timespan visibility
    this.updateTimespanVisibility(state.sortOrder);
  }
}

console.log('Sort Interface loaded');

// Column Selector Implementation

export class ColumnSelector {
  private container: HTMLElement;
  private columnSelect: HTMLSelectElement;
  private stateManager: StateManager;
  
  /**
   * Create a new ColumnSelector component
   * @param stateManager The state manager for updating column configuration
   */
  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    
    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'column-selector';
    
    // Create column selector group
    const columnGroup = document.createElement('div');
    columnGroup.className = 'column-group';
    
    const columnLabel = document.createElement('label');
    columnLabel.textContent = 'Columns:';
    columnLabel.htmlFor = 'column-select';
    columnGroup.appendChild(columnLabel);
    
    // Create column count dropdown
    this.columnSelect = document.createElement('select');
    this.columnSelect.id = 'column-select';
    this.columnSelect.className = 'column-select';
    
    // Add column count options (1-6)
    for (let i = 1; i <= 6; i++) {
      const option = document.createElement('option');
      option.value = i.toString();
      option.textContent = i.toString();
      this.columnSelect.appendChild(option);
    }
    
    // Set default value to match state manager default (5)
    this.columnSelect.value = this.stateManager.getState().columnCount.toString();
    
    columnGroup.appendChild(this.columnSelect);
    this.container.appendChild(columnGroup);
    
    // Add event listener for column count changes
    this.columnSelect.addEventListener('change', () => {
      this.handleColumnCountChange();
    });
  }
  
  /**
   * Get the rendered HTML element
   * @returns The container element for the column selector
   */
  render(): HTMLElement {
    return this.container;
  }
  
  /**
   * Get the currently selected column count
   * @returns The selected column count (1-6)
   */
  getColumnCount(): number {
    return parseInt(this.columnSelect.value, 10);
  }
  
  /**
   * Handle column count change event
   * Triggers state manager update
   */
  private handleColumnCountChange(): void {
    const columnCount = this.getColumnCount();
    
    // Update state manager with new column count
    this.stateManager.setColumnCount(columnCount);
  }
  
  /**
   * Update the UI to reflect the current state
   * Called when state changes externally
   */
  updateFromState(): void {
    const state = this.stateManager.getState();
    
    // Update select value to display current column count
    this.columnSelect.value = state.columnCount.toString();
  }
}

console.log('Column Selector loaded');

// Video Toggle Implementation

export class VideoToggle {
  private container: HTMLElement;
  private toggleCheckbox: HTMLInputElement;
  private stateManager: StateManager;
  
  /**
   * Create a new VideoToggle component
   * @param stateManager The state manager for updating video visibility
   */
  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    
    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'video-toggle';
    
    // Create toggle group
    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'toggle-group';
    
    // Create label with checkbox
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle-label';
    
    // Create checkbox input
    this.toggleCheckbox = document.createElement('input');
    this.toggleCheckbox.type = 'checkbox';
    this.toggleCheckbox.id = 'video-toggle-checkbox';
    this.toggleCheckbox.className = 'video-toggle-checkbox';
    
    // Set default value to match state manager default (true - show videos)
    this.toggleCheckbox.checked = this.stateManager.getState().showVideos;
    
    toggleLabel.appendChild(this.toggleCheckbox);
    toggleLabel.appendChild(document.createTextNode(' Show Videos'));
    
    toggleGroup.appendChild(toggleLabel);
    this.container.appendChild(toggleGroup);
    
    // Add event listener for toggle changes
    this.toggleCheckbox.addEventListener('change', () => {
      this.handleToggleChange();
    });
  }
  
  /**
   * Get the rendered HTML element
   * @returns The container element for the video toggle
   */
  render(): HTMLElement {
    return this.container;
  }
  
  /**
   * Get the current toggle state
   * @returns true if videos should be shown, false otherwise
   */
  getShowVideos(): boolean {
    return this.toggleCheckbox.checked;
  }
  
  /**
   * Handle toggle change event
   * Triggers state manager update
   */
  private handleToggleChange(): void {
    const showVideos = this.getShowVideos();
    
    // Update state manager with new video visibility setting
    this.stateManager.setShowVideos(showVideos);
  }
  
  /**
   * Update the UI to reflect the current state
   * Called when state changes externally
   */
  updateFromState(): void {
    const state = this.stateManager.getState();
    
    // Update checkbox to display current video visibility setting
    this.toggleCheckbox.checked = state.showVideos;
  }
}

console.log('Video Toggle loaded');

/**
 * GalleryExpandToggle Component
 * Provides a toggle control for switching between carousel mode and expanded mode for galleries
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */
export class GalleryExpandToggle {
  private container: HTMLElement;
  private toggleCheckbox: HTMLInputElement;
  private stateManager: StateManager;
  
  /**
   * Create a new GalleryExpandToggle component
   * @param stateManager The state manager for updating gallery expand mode
   */
  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    
    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'gallery-expand-toggle';
    
    // Create toggle group
    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'toggle-group';
    
    // Create label with checkbox
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle-label';
    
    // Create checkbox input
    this.toggleCheckbox = document.createElement('input');
    this.toggleCheckbox.type = 'checkbox';
    this.toggleCheckbox.id = 'gallery-expand-toggle-checkbox';
    this.toggleCheckbox.className = 'gallery-expand-toggle-checkbox';
    
    // Set default value to match state manager default (false - carousel mode)
    this.toggleCheckbox.checked = this.stateManager.getState().expandGalleries;
    
    toggleLabel.appendChild(this.toggleCheckbox);
    toggleLabel.appendChild(document.createTextNode(' Expand Galleries'));
    
    toggleGroup.appendChild(toggleLabel);
    this.container.appendChild(toggleGroup);
    
    // Add event listener for toggle changes
    this.toggleCheckbox.addEventListener('change', () => {
      this.handleToggleChange();
    });
  }
  
  /**
   * Get the rendered HTML element
   * @returns The container element for the gallery expand toggle
   */
  render(): HTMLElement {
    return this.container;
  }
  
  /**
   * Get the current toggle state
   * @returns true if galleries should be expanded, false for carousel mode
   */
  getExpandGalleries(): boolean {
    return this.toggleCheckbox.checked;
  }
  
  /**
   * Handle toggle change event
   * Triggers state manager update
   */
  private handleToggleChange(): void {
    const expandGalleries = this.getExpandGalleries();
    
    // Update state manager with new gallery expand setting
    this.stateManager.setExpandGalleries(expandGalleries);
  }
  
  /**
   * Update the UI to reflect the current state
   * Called when state changes externally
   */
  updateFromState(): void {
    const state = this.stateManager.getState();
    
    // Update checkbox to display current gallery expand setting
    this.toggleCheckbox.checked = state.expandGalleries;
  }
}

console.log('Gallery Expand Toggle loaded');

// Metadata Display Implementation

/**
 * MetadataDisplay Component
 * Renders post metadata (title and author) with clickable links
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8
 */
export class MetadataDisplay {
  private stateManager: StateManager;
  
  /**
   * Create a new MetadataDisplay component
   * @param stateManager The state manager for handling author link navigation
   */
  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }
  
  /**
   * Render metadata for a media item
   * @param metadata The post metadata to render
   * @returns HTMLElement containing the rendered metadata
   */
  render(metadata: PostMetadata): HTMLElement {
    // Create container element
    const container = document.createElement('div');
    container.className = 'metadata-display';
    
    // Render post title as clickable link
    if (metadata.title) {
      const titleLink = document.createElement('a');
      titleLink.className = 'post-title-link';
      titleLink.href = metadata.postURL || '#';
      titleLink.target = '_blank';
      titleLink.rel = 'noopener noreferrer'; // Security best practice for target="_blank"
      titleLink.textContent = metadata.title;
      
      const titleContainer = document.createElement('div');
      titleContainer.className = 'post-title';
      titleContainer.appendChild(titleLink);
      container.appendChild(titleContainer);
    } else {
      // Handle missing title gracefully
      const titleContainer = document.createElement('div');
      titleContainer.className = 'post-title';
      titleContainer.textContent = '[No title]';
      container.appendChild(titleContainer);
    }
    
    // Render author username as clickable link
    // Render subreddit and author
    const authorContainer = document.createElement('div');
    authorContainer.className = 'post-author';
    
    // Add subreddit first if available
    if (metadata.subreddit) {
      const subredditLink = document.createElement('a');
      subredditLink.className = 'subreddit-link';
      subredditLink.href = `#/r/${metadata.subreddit}`;
      subredditLink.textContent = `r/${metadata.subreddit}`;
      
      // Handle subreddit link clicks to navigate within the app
      subredditLink.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default link behavior
        
        // Navigate to subreddit within the app
        const subredditSource: ContentSource = {
          type: 'subreddit',
          name: metadata.subreddit!
        };
        
        this.stateManager.setContentSource(subredditSource);
      });
      
      authorContainer.appendChild(subredditLink);
    }
    
    // Add author after subreddit
    if (metadata.author) {
      // Add separator if subreddit was added
      if (metadata.subreddit) {
        const separator = document.createTextNode(' • ');
        authorContainer.appendChild(separator);
      }
      
      const authorLink = document.createElement('a');
      authorLink.className = 'author-username-link';
      authorLink.href = `#/u/${metadata.author}`;
      authorLink.textContent = `u/${metadata.author}`;
      
      // Handle author link clicks to navigate within the app
      authorLink.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default link behavior
        
        // Navigate to user profile within the app
        const userSource: ContentSource = {
          type: 'user',
          username: metadata.author
        };
        
        this.stateManager.setContentSource(userSource);
      });
      
      authorContainer.appendChild(authorLink);
    } else {
      // Handle missing author gracefully
      // Add separator if subreddit was added
      if (metadata.subreddit) {
        const separator = document.createTextNode(' • ');
        authorContainer.appendChild(separator);
      }
      authorContainer.appendChild(document.createTextNode('u/[deleted]'));
    }
    
    container.appendChild(authorContainer);
    
    return container;
  }
}

console.log('Metadata Display loaded');

// Gallery Carousel Implementation

/**
 * GalleryCarousel Component
 * Displays gallery posts with navigation controls for browsing multiple images
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 14.1, 14.2, 14.4, 14.5, 18.3
 */
export class GalleryCarousel {
  private container: HTMLElement;
  private imageContainer: HTMLElement;
  private currentImage: HTMLImageElement;
  private prevButton: HTMLButtonElement;
  private nextButton: HTMLButtonElement;
  private positionIndicator: HTMLElement;
  private galleryData: GalleryData;
  private metadata: PostMetadata;
  private currentIndex: number;
  
  /**
   * Create a new GalleryCarousel component
   * @param galleryData The gallery data containing image URLs
   * @param metadata The post metadata for the gallery
   */
  constructor(galleryData: GalleryData, metadata: PostMetadata) {
    this.galleryData = galleryData;
    this.metadata = metadata;
    this.currentIndex = 0; // Start with first image
    
    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'gallery-carousel';
    
    // Create image container
    this.imageContainer = document.createElement('div');
    this.imageContainer.className = 'carousel-image-container';
    
    // Create image element
    this.currentImage = document.createElement('img');
    this.currentImage.className = 'carousel-image';
    this.currentImage.alt = metadata.title || 'Gallery image';
    
    // Make image clickable to open in new tab
    this.currentImage.style.cursor = 'pointer';
    this.currentImage.addEventListener('click', () => {
      this.openCurrentImageInNewTab();
    });
    
    // Handle image load failures
    this.currentImage.addEventListener('error', () => {
      this.handleImageLoadError();
    });
    
    this.imageContainer.appendChild(this.currentImage);
    this.container.appendChild(this.imageContainer);
    
    // Create navigation controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'carousel-controls';
    
    // Create previous button
    this.prevButton = document.createElement('button');
    this.prevButton.className = 'carousel-button carousel-prev';
    this.prevButton.innerHTML = '‹';
    this.prevButton.setAttribute('aria-label', 'Previous image');
    this.prevButton.addEventListener('click', () => {
      this.previous();
    });
    controlsContainer.appendChild(this.prevButton);
    
    // Create next button
    this.nextButton = document.createElement('button');
    this.nextButton.className = 'carousel-button carousel-next';
    this.nextButton.innerHTML = '›';
    this.nextButton.setAttribute('aria-label', 'Next image');
    this.nextButton.addEventListener('click', () => {
      this.next();
    });
    controlsContainer.appendChild(this.nextButton);
    
    this.container.appendChild(controlsContainer);
    
    // Create position indicator (separate from controls)
    this.positionIndicator = document.createElement('div');
    this.positionIndicator.className = 'carousel-indicator';
    this.container.appendChild(this.positionIndicator);
    
    // Load the first image and update UI
    this.updateDisplay();
  }
  
  /**
   * Get the rendered HTML element
   * @returns The container element for the gallery carousel
   */
  render(): HTMLElement {
    return this.container;
  }
  
  /**
   * Navigate to the next image in the gallery
   * Requirements: 12.3
   */
  next(): void {
    // Only advance if not at the last image
    if (this.currentIndex < this.galleryData.images.length - 1) {
      this.currentIndex++;
      this.updateDisplay();
      this.preloadNextImage();
    }
  }
  
  /**
   * Navigate to the previous image in the gallery
   * Requirements: 12.4
   */
  previous(): void {
    // Only go back if not at the first image
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateDisplay();
      this.preloadNextImage();
    }
  }
  
  /**
   * Get the current image index
   * @returns The current image index (0-based)
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }
  
  /**
   * Update the display to show the current image and update controls
   * Requirements: 12.1, 12.5, 12.6, 12.7, 14.1
   */
  private updateDisplay(): void {
    // Update image source
    const imageURL = this.galleryData.images[this.currentIndex];
    this.currentImage.src = imageURL;
    
    // Reset error state
    this.currentImage.style.display = 'block';
    
    // Update position indicator (e.g., "2 of 5")
    // Requirements: 12.7
    this.positionIndicator.textContent = 
      `${this.currentIndex + 1} of ${this.galleryData.images.length}`;
    
    // Update button states
    // Disable/hide previous button on first image (Requirements: 12.5)
    if (this.currentIndex === 0) {
      this.prevButton.disabled = true;
      this.prevButton.style.visibility = 'hidden';
    } else {
      this.prevButton.disabled = false;
      this.prevButton.style.visibility = 'visible';
    }
    
    // Disable/hide next button on last image (Requirements: 12.6)
    if (this.currentIndex === this.galleryData.images.length - 1) {
      this.nextButton.disabled = true;
      this.nextButton.style.visibility = 'hidden';
    } else {
      this.nextButton.disabled = false;
      this.nextButton.style.visibility = 'visible';
    }
  }
  
  /**
   * Preload the next image for smooth navigation
   * Requirements: 14.2
   */
  private preloadNextImage(): void {
    // Only preload if there is a next image
    if (this.currentIndex < this.galleryData.images.length - 1) {
      const nextImageURL = this.galleryData.images[this.currentIndex + 1];
      
      // Create a new Image object to preload
      const preloadImage = new Image();
      preloadImage.src = nextImageURL;
      
      // No need to do anything with the loaded image - browser will cache it
    }
  }
  
  /**
   * Handle image load failures with placeholder
   * Requirements: 14.4, 14.5
   */
  private handleImageLoadError(): void {
    // Hide the broken image
    this.currentImage.style.display = 'none';
    
    // Create or update error placeholder
    let errorPlaceholder = this.imageContainer.querySelector('.image-error-placeholder') as HTMLElement;
    
    if (!errorPlaceholder) {
      errorPlaceholder = document.createElement('div');
      errorPlaceholder.className = 'image-error-placeholder';
      this.imageContainer.appendChild(errorPlaceholder);
    }
    
    // Display error message with position
    errorPlaceholder.textContent = 
      `Image ${this.currentIndex + 1} of ${this.galleryData.images.length} failed to load`;
    errorPlaceholder.style.display = 'flex';
    
    // Allow navigation to continue even if image fails to load
    // (buttons remain functional)
  }
  
  /**
   * Open the currently displayed image in a new browser tab
   * Requirements: 18.3
   */
  private openCurrentImageInNewTab(): void {
    const imageURL = this.galleryData.images[this.currentIndex];
    window.open(imageURL, '_blank', 'noopener,noreferrer');
  }
}

console.log('Gallery Carousel loaded');

/**
 * VideoPlayer component for rendering embedded Reddit videos
 * Requirements: 10.1, 10.2, 10.3, 10.4, 18.6
 */
export class VideoPlayer {
  private container: HTMLElement;
  private videoElement: HTMLVideoElement;
  private videoData: VideoData;
  private metadata: PostMetadata;
  
  /**
   * Create a new VideoPlayer component
   * @param videoData The video data containing video URL
   * @param metadata The post metadata for the video
   */
  constructor(videoData: VideoData, metadata: PostMetadata) {
    this.videoData = videoData;
    this.metadata = metadata;
    
    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'video-player';
    
    // Create video container
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    
    // Create video element
    // Requirements: 10.1 - Render HTML video element with video URL
    this.videoElement = document.createElement('video');
    this.videoElement.className = 'video-element';
    this.videoElement.src = videoData.url;
    
    // Add standard video controls (play, pause, volume)
    // Requirements: 10.2 - Provide standard video controls
    this.videoElement.controls = true;
    
    // Set additional video attributes
    this.videoElement.preload = 'metadata';
    
    // Prevent click from opening new tab
    // Requirements: 18.6 - Videos should not open in new tab
    this.videoElement.style.cursor = 'default';
    
    // Prevent click event from bubbling up
    this.videoElement.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Handle video load failures with placeholder
    // Requirements: 10.4 - Handle video load failures
    this.videoElement.addEventListener('error', () => {
      this.handleVideoLoadError();
    });
    
    videoContainer.appendChild(this.videoElement);
    this.container.appendChild(videoContainer);
  }
  
  /**
   * Get the rendered HTML element
   * @returns The container element for the video player
   */
  render(): HTMLElement {
    return this.container;
  }
  
  /**
   * Pause video playback
   * Requirements: 10.3 - Implement pause() method
   */
  pause(): void {
    if (!this.videoElement.paused) {
      this.videoElement.pause();
    }
  }
  
  /**
   * Handle video load failures with placeholder
   * Requirements: 10.4 - Handle video load failures
   */
  private handleVideoLoadError(): void {
    // Hide the broken video element
    this.videoElement.style.display = 'none';
    
    // Create error placeholder
    const errorPlaceholder = document.createElement('div');
    errorPlaceholder.className = 'video-error-placeholder';
    
    // Display error message
    const errorMessage = document.createElement('p');
    errorMessage.textContent = 'Video failed to load';
    errorPlaceholder.appendChild(errorMessage);
    
    // Provide link to attempt opening on Reddit
    const redditLink = document.createElement('a');
    redditLink.href = this.metadata.postURL;
    redditLink.target = '_blank';
    redditLink.rel = 'noopener noreferrer';
    redditLink.textContent = 'View on Reddit';
    redditLink.className = 'video-error-link';
    errorPlaceholder.appendChild(redditLink);
    
    this.container.appendChild(errorPlaceholder);
  }
}

console.log('Video Player loaded');

/**
 * MediaGallery component for rendering media content in a grid layout
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 11.2, 11.3, 13.3, 13.4, 13.7, 14.3, 15.1, 15.2, 15.5, 15.6, 18.1, 18.2, 18.4, 18.5
 */
export class MediaGallery {
  private container: HTMLElement;
  private stateManager: StateManager;
  private metadataDisplay: MetadataDisplay;
  private videoPlayers: VideoPlayer[] = []; // Track all video players
  private previousPostCount: number = 0; // Track previous post count for append detection
  private loadingIndicatorElement?: HTMLElement; // Reference to loading indicator

  /**
   * Create a new MediaGallery component
   * @param stateManager The state manager for accessing configuration
   */
  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.metadataDisplay = new MetadataDisplay(stateManager);

    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'media-gallery';
  }

  /**
   * Set the loading indicator element to be added at the bottom of the gallery
   * @param loadingIndicator The loading indicator element
   */
  setLoadingIndicator(loadingIndicator: HTMLElement): void {
    this.loadingIndicatorElement = loadingIndicator;
  }

  /**
   * Render the gallery with current media posts
   * Requirements: 3.1, 3.2, 3.3, 3.4, 11.2, 11.3, 13.3, 13.4, 20.3, 20.13
   * @param posts The media posts to render
   * @param config The gallery configuration
   */
  render(posts: MediaPost[], config: GalleryConfig): void {
    // Determine if we're appending (more posts than before) or replacing
    const isAppending = posts.length > this.previousPostCount && this.previousPostCount > 0;

    if (isAppending) {
      // Append mode: only render new items
      // Requirements: 20.3
      const newPosts = posts.slice(this.previousPostCount);

      // Filter video posts based on showVideos toggle
      // Requirements: 11.2, 11.3, 20.13
      const filteredNewPosts = config.showVideos
        ? newPosts
        : newPosts.filter(post => post.type !== 'video');

      // Render each new media item and append to container
      filteredNewPosts.forEach(post => {
        const mediaItem = this.createMediaItem(post, config);
        // Insert before loading indicator if it exists, otherwise append to end
        if (this.loadingIndicatorElement && this.container.contains(this.loadingIndicatorElement)) {
          this.container.insertBefore(mediaItem, this.loadingIndicatorElement);
        } else {
          this.container.appendChild(mediaItem);
        }
      });
    } else {
      // Replace mode: clear and render all items
      // Find the item closest to the middle of the viewport to use as scroll anchor
      let anchorIndex = -1;
      let anchorOffsetFromTop = 0;
      const items = this.container.querySelectorAll('.media-item');
      const viewportTop = window.scrollY;
      const viewportMiddle = viewportTop + (window.innerHeight / 2);
      
      let closestDistance = Infinity;
      for (let i = 0; i < items.length; i++) {
        const item = items[i] as HTMLElement;
        const rect = item.getBoundingClientRect();
        const itemTop = rect.top + window.scrollY;
        const itemMiddle = itemTop + (rect.height / 2);
        
        const distance = Math.abs(itemMiddle - viewportMiddle);
        if (distance < closestDistance) {
          closestDistance = distance;
          anchorIndex = i;
          // Store how far down we were in this item
          anchorOffsetFromTop = viewportTop - itemTop;
        }
      }
      
      this.clear();

      // Apply column count class to container
      // Requirements: 15.1, 15.5
      this.container.className = `media-gallery columns-${config.columnCount}`;

      // Filter video posts based on showVideos toggle
      // Requirements: 11.2, 11.3
      const filteredPosts = config.showVideos
        ? posts
        : posts.filter(post => post.type !== 'video');

      // Render each media item
      filteredPosts.forEach(post => {
        const mediaItem = this.createMediaItem(post, config);
        this.container.appendChild(mediaItem);
      });

      // Add loading indicator at the bottom if it exists
      if (this.loadingIndicatorElement) {
        this.container.appendChild(this.loadingIndicatorElement);
      }
      
      // Scroll to anchor item after rendering
      if (anchorIndex >= 0) {
        requestAnimationFrame(() => {
          const newItems = this.container.querySelectorAll('.media-item');
          if (newItems[anchorIndex]) {
            const anchorElement = newItems[anchorIndex] as HTMLElement;
            const rect = anchorElement.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;
            // Try to maintain relative position within the item
            // But cap the offset to prevent scrolling too far down
            const cappedOffset = Math.min(anchorOffsetFromTop, rect.height * 0.3);
            window.scrollTo(0, absoluteTop + cappedOffset);
          }
        });
      }
    }

    // Update previous post count
    this.previousPostCount = posts.length;
  }

  /**
   * Create a media item element for a post
   * @param post The media post to render
   * @param config The gallery configuration
   * @returns HTMLElement containing the media item
   */
  private createMediaItem(post: MediaPost, config: GalleryConfig): HTMLElement {
    const itemContainer = document.createElement('div');
    itemContainer.className = 'media-item';

    // Render media content based on post type
    let mediaElement: HTMLElement;

    if (post.type === 'image') {
      // Render image posts with clickable images
      // Requirements: 3.2, 18.1, 18.2, 18.5
      mediaElement = this.createImageElement(post);
    } else if (post.type === 'video') {
      // Render video posts using VideoPlayer component
      // Requirements: 3.3
      const videoPlayer = new VideoPlayer(post.videoData, post.metadata);
      this.videoPlayers.push(videoPlayer); // Track video player
      mediaElement = videoPlayer.render();
    } else if (post.type === 'gallery') {
      // Render gallery posts based on expand toggle
      // Requirements: 3.4, 13.3, 13.4
      if (config.expandGalleries) {
        // Expanded mode: show all images in grid
        mediaElement = this.createExpandedGallery(post);
      } else {
        // Carousel mode: use GalleryCarousel component
        const carousel = new GalleryCarousel(post.galleryData, post.metadata);
        mediaElement = carousel.render();
      }
    } else {
      // Fallback for unknown post types
      mediaElement = document.createElement('div');
      mediaElement.textContent = 'Unknown media type';
    }

    itemContainer.appendChild(mediaElement);

    // Render MetadataDisplay below each media item
    // Requirements: 15.1, 15.2
    const metadataElement = this.metadataDisplay.render(post.metadata);
    itemContainer.appendChild(metadataElement);

    return itemContainer;
  }

  /**
   * Create an image element for an image post
   * Requirements: 3.2, 3.5, 3.6, 18.1, 18.2, 18.5
   * @param post The image post
   * @returns HTMLElement containing the image
   */
  private createImageElement(post: ImagePost): HTMLElement {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';

    const image = document.createElement('img');
    image.className = 'media-image';
    image.alt = post.metadata.title || 'Reddit image';
    image.style.cursor = 'pointer';
    image.loading = 'lazy';
    
    // Check if this is a GIF (static preview)
    const isGif = post.url.toLowerCase().includes('.gif');
    
    if (isGif) {
      // Add gif-preview class for styling
      image.classList.add('gif-preview');
      
      // Add GIF badge overlay
      const gifBadge = document.createElement('div');
      gifBadge.className = 'gif-badge';
      gifBadge.textContent = 'GIF';
      imageContainer.appendChild(gifBadge);
      
      // For GIFs, just open the Reddit post URL which will show the animated version
      // Reddit's post page handles GIF playback properly
      image.addEventListener('click', () => {
        window.open(post.metadata.postURL, '_blank', 'noopener,noreferrer');
      });
    } else {
      // Regular image - click to open in new tab
      image.addEventListener('click', () => {
        window.open(post.url, '_blank', 'noopener,noreferrer');
      });
    }

    // Display placeholders for failed image loads
    // Requirements: 3.6
    image.addEventListener('error', () => {
      this.handleImageLoadError(imageContainer, image);
    });

    // Use thumbnail for display if available, otherwise use full-size URL
    image.src = post.thumbnailUrl || post.url;

    imageContainer.appendChild(image);

    return imageContainer;
  }

  /**
   * Create an expanded gallery view with all images
   * Requirements: 13.4, 13.7, 14.3, 18.4
   * @param post The gallery post
   * @returns HTMLElement containing all gallery images
   */
  private createExpandedGallery(post: GalleryPost): HTMLElement {
    const galleryContainer = document.createElement('div');
    galleryContainer.className = 'expanded-gallery';

    // Render each gallery image
    post.galleryData.images.forEach((imageURL, index) => {
      const imageWrapper = document.createElement('div');
      imageWrapper.className = 'expanded-gallery-image-wrapper';

      const image = document.createElement('img');
      image.className = 'media-image expanded-gallery-image';
      image.alt = `${post.metadata.title || 'Gallery image'} - Image ${index + 1}`;

      // Style images consistently with regular images
      // Requirements: 13.7
      image.style.cursor = 'pointer';

      // Make gallery images clickable to open in new tab
      // Requirements: 18.4
      image.addEventListener('click', () => {
        window.open(imageURL, '_blank', 'noopener,noreferrer');
      });

      // Handle progressive image loading
      // Requirements: 14.3
      image.loading = 'lazy';

      // Display placeholders for failed image loads
      image.addEventListener('error', () => {
        this.handleImageLoadError(imageWrapper, image);
      });

      image.src = imageURL;

      imageWrapper.appendChild(image);
      galleryContainer.appendChild(imageWrapper);
    });

    return galleryContainer;
  }

  /**
   * Handle image load failures with placeholder
   * Requirements: 3.6
   * @param container The container element
   * @param image The failed image element
   */
  private handleImageLoadError(container: HTMLElement, image: HTMLImageElement): void {
    // Hide the broken image
    image.style.display = 'none';

    // Create error placeholder
    const errorPlaceholder = document.createElement('div');
    errorPlaceholder.className = 'image-error-placeholder';

    // Display error message
    const errorIcon = document.createElement('div');
    errorIcon.className = 'error-icon';
    errorIcon.textContent = '⚠️';
    errorPlaceholder.appendChild(errorIcon);

    const errorMessage = document.createElement('p');
    errorMessage.textContent = 'Image failed to load';
    errorPlaceholder.appendChild(errorMessage);

    container.appendChild(errorPlaceholder);
  }

  /**
   * Pause all currently playing videos
   * Requirements: 10.5
   */
  pauseAllVideos(): void {
    this.videoPlayers.forEach(player => {
      player.pause();
    });
  }

  /**
   * Clear the gallery
   */
  clear(): void {
    // Pause all videos before clearing
    this.pauseAllVideos();

    // Clear video player references
    this.videoPlayers = [];

    // Clear DOM content
    this.container.innerHTML = '';

    // Reset previous post count
    this.previousPostCount = 0;
  }

  /**
   * Get the rendered HTML element
   * @returns The container element for the media gallery
   */
  getElement(): HTMLElement {
    return this.container;
  }
}



console.log('Media Gallery loaded');

/**
 * ErrorDisplay component
 * Displays error messages to users with retry functionality
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2
 */
export class ErrorDisplay {
  private container: HTMLElement;
  private stateManager: StateManager;
  
  /**
   * Create a new ErrorDisplay component
   * @param stateManager The state manager for retry functionality
   */
  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    
    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'error-display';
    this.container.style.display = 'none'; // Hidden by default
  }
  
  /**
   * Display an error message
   * @param errorMessage The error message to display
   * @param showRetry Whether to show a retry button
   */
  show(errorMessage: string, showRetry: boolean = true): void {
    // Clear previous content
    this.container.innerHTML = '';
    
    // Create error icon
    const errorIcon = document.createElement('div');
    errorIcon.className = 'error-icon-large';
    errorIcon.textContent = '⚠️';
    this.container.appendChild(errorIcon);
    
    // Create error message
    const messageElement = document.createElement('p');
    messageElement.className = 'error-message-text';
    messageElement.textContent = errorMessage;
    this.container.appendChild(messageElement);
    
    // Add retry button if requested
    if (showRetry) {
      const retryButton = document.createElement('button');
      retryButton.className = 'retry-button';
      retryButton.textContent = 'Retry';
      retryButton.addEventListener('click', () => this.handleRetry());
      this.container.appendChild(retryButton);
    }
    
    // Show the container
    this.container.style.display = 'block';
  }
  
  /**
   * Hide the error display
   */
  hide(): void {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
  }
  
  /**
   * Handle retry button click
   */
  private async handleRetry(): Promise<void> {
    // Hide the error display
    this.hide();
    
    // Retry loading content
    await this.stateManager.loadContent();
  }
  
  /**
   * Get the rendered HTML element
   * @returns The container element for the error display
   */
  getElement(): HTMLElement {
    return this.container;
  }
}

console.log('Error Display loaded');

/**
 * Initialize the complete Reddit Image Viewer application
 * This function creates all components, wires them together, and sets up event listeners
 */
export function initializeApplication(): void {
  console.log('Initializing Reddit Image Viewer application...');
  
  // Step 1: Create core dependencies
  const apiClient = new APIClient();
  const responseParser = new ResponseParser();
  const router = new URLRouter();
  
  // Step 2: Initialize StateManager with default values
  const stateManager = new StateManager(apiClient, responseParser, router);
  console.log('StateManager initialized with default values');
  
  // Step 3: Create ErrorDisplay component
  const errorDisplay = new ErrorDisplay(stateManager);
  stateManager.setErrorDisplay(errorDisplay);
  
  // Mount error display to the DOM
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.appendChild(errorDisplay.getElement());
    console.log('ErrorDisplay mounted to DOM');
  } else {
    console.error('Error container not found in DOM');
  }
  
  // Step 4: Create MediaGallery component
  const mediaGallery = new MediaGallery(stateManager);
  stateManager.setMediaGallery(mediaGallery);
  
  // Mount media gallery to the DOM
  const galleryContainer = document.getElementById('gallery-container');
  if (galleryContainer) {
    galleryContainer.appendChild(mediaGallery.getElement());
    console.log('MediaGallery mounted to DOM');
  } else {
    console.error('Gallery container not found in DOM');
  }
  
  // Step 5: Create SearchInterface component
  const searchInterface = new SearchInterface(stateManager);
  
  // Mount search interface to the DOM
  const searchContainer = document.getElementById('search-container');
  if (searchContainer) {
    searchContainer.appendChild(searchInterface.render());
    console.log('SearchInterface mounted to DOM');
  } else {
    console.error('Search container not found in DOM');
  }
  
  // Step 6: Create SortInterface component
  const sortInterface = new SortInterface(stateManager);
  
  // Mount sort interface to the DOM
  const sortContainer = document.getElementById('sort-container');
  if (sortContainer) {
    sortContainer.appendChild(sortInterface.render());
    console.log('SortInterface mounted to DOM');
  } else {
    console.error('Sort container not found in DOM');
  }
  
  // Step 7: Create ColumnSelector component
  const columnSelector = new ColumnSelector(stateManager);
  
  // Mount column selector to the DOM
  const columnSelectorContainer = document.getElementById('column-selector-container');
  if (columnSelectorContainer) {
    columnSelectorContainer.appendChild(columnSelector.render());
    console.log('ColumnSelector mounted to DOM');
  } else {
    console.error('Column selector container not found in DOM');
  }
  
  // Step 8: Create VideoToggle component
  const videoToggle = new VideoToggle(stateManager);
  
  // Mount video toggle to the DOM
  const videoToggleContainer = document.getElementById('video-toggle-container');
  if (videoToggleContainer) {
    videoToggleContainer.appendChild(videoToggle.render());
    console.log('VideoToggle mounted to DOM');
  } else {
    console.error('Video toggle container not found in DOM');
  }
  
  // Step 9: Create GalleryExpandToggle component
  const galleryExpandToggle = new GalleryExpandToggle(stateManager);
  
  // Mount gallery expand toggle to the DOM
  const galleryToggleContainer = document.getElementById('gallery-toggle-container');
  if (galleryToggleContainer) {
    galleryToggleContainer.appendChild(galleryExpandToggle.render());
    console.log('GalleryExpandToggle mounted to DOM');
  } else {
    console.error('Gallery toggle container not found in DOM');
  }
  
  // Step 9a: Create LoadingIndicator and InfiniteScrollManager for infinite scroll
  // Requirements: 20.1, 20.4
  const loadingIndicator = new LoadingIndicator();
  stateManager.setLoadingIndicator(loadingIndicator);
  
  // Add loading indicator to media gallery
  mediaGallery.setLoadingIndicator(loadingIndicator.getElement());
  
  // Create InfiniteScrollManager and initialize with loadMoreContent callback
  const infiniteScrollManager = new InfiniteScrollManager();
  infiniteScrollManager.initialize(() => stateManager.loadMoreContent());
  
  // Disable infinite scroll initially (will be enabled after first content load)
  infiniteScrollManager.setEnabled(false);
  
  console.log('InfiniteScrollManager and LoadingIndicator initialized');
  
  // Step 10: Set up state change listener to update UI
  stateManager.setOnStateChange(() => {
    const state = stateManager.getState();
    
    // Update all UI components to reflect current state
    sortInterface.updateFromState();
    columnSelector.updateFromState();
    videoToggle.updateFromState();
    galleryExpandToggle.updateFromState();
    
    // Update media gallery with current posts and configuration
    const config: GalleryConfig = {
      columnCount: state.columnCount,
      showVideos: state.showVideos,
      expandGalleries: state.expandGalleries
    };
    
    mediaGallery.render(state.mediaPosts, config);
    
    // Show/hide loading indicator
    const loadingContainer = document.getElementById('loading-container');
    if (loadingContainer) {
      if (state.isLoading) {
        loadingContainer.textContent = 'Loading...';
        loadingContainer.style.display = 'block';
        // Disable infinite scroll during initial load
        infiniteScrollManager.setEnabled(false);
      } else {
        loadingContainer.style.display = 'none';
        // Enable infinite scroll after initial content loads
        if (state.mediaPosts.length > 0) {
          infiniteScrollManager.setEnabled(true);
        }
      }
    }
  });
  
  console.log('State change listener configured');
  
  // Step 11: Set up URL Router history listeners
  router.initialize();
  
  // Override the router's popstate handler to integrate with state manager
  window.addEventListener('popstate', () => {
    const source = router.parseURL();
    if (source) {
      // Load content for the URL
      stateManager.setContentSource(source);
    } else {
      // Root URL - clear content
      console.log('Navigated to root URL');
    }
  });
  
  console.log('URL Router history listeners configured');
  
  // Step 12: Parse initial URL and load content if present
  const initialSource = router.parseURL();
  if (initialSource) {
    console.log('Loading initial content from URL:', initialSource);
    // Update title for initial load
    if (initialSource.type === 'subreddit') {
      document.title = `r/${initialSource.name} - Reddit Image Viewer`;
    } else {
      document.title = `u/${initialSource.username} - Reddit Image Viewer`;
    }
    stateManager.setContentSource(initialSource);
  } else {
    console.log('No initial content source in URL');
    document.title = 'Reddit Image Viewer';
  }
  
  console.log('Reddit Image Viewer application initialized successfully!');
  
  // Step 13: Set up sticky header scroll behavior
  let lastScrollY = window.scrollY;
  let ticking = false;
  
  const header = document.querySelector('header');
  
  const updateHeaderVisibility = () => {
    const currentScrollY = window.scrollY;
    
    // Show header when scrolling up or at the top
    if (currentScrollY < lastScrollY || currentScrollY < 10) {
      header?.classList.remove('header-hidden');
    } 
    // Hide header when scrolling down (but only after scrolling past 100px)
    else if (currentScrollY > 100) {
      header?.classList.add('header-hidden');
    }
    
    lastScrollY = currentScrollY;
    ticking = false;
  };
  
  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeaderVisibility);
      ticking = true;
    }
  };
  
  window.addEventListener('scroll', onScroll);
  console.log('Sticky header scroll behavior initialized');
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM ready, initializing application...');
      initializeApplication();
    });
  } else {
    // DOM already loaded
    console.log('DOM already loaded, initializing application...');
    initializeApplication();
  }
}

console.log('Application initialization code loaded');
