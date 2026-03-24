import {
  ContentSource, SortOrder, Timespan, ApplicationState, RedditAPIResponse,
  RedditAPIResult, SessionStorage, MediaPost
} from './types.js';
import { APIClient, ResponseParser } from './api.js';
import { URLRouter } from './router.js';

// Interfaces to avoid circular imports with media.ts
export interface IMediaGallery {
  pauseAllVideos(): void;
}

export interface IErrorDisplay {
  show(errorMessage: string, showRetry?: boolean): void;
  hide(): void;
}

export class LoadingIndicator {
  private container: HTMLElement;
  private spinner: HTMLElement;
  private endMessage: HTMLElement;
  private errorContainer: HTMLElement;
  
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'loading-indicator';
    this.spinner = document.createElement('div');
    this.spinner.className = 'loading-spinner';
    this.spinner.textContent = 'Loading more...';
    this.endMessage = document.createElement('div');
    this.endMessage.className = 'end-message';
    this.endMessage.textContent = 'No more content available';
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

  hide(): void { this.container.style.display = 'none'; }
  
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
    retryButton.className = 'retry-button';
    retryButton.onclick = onRetry;
    this.errorContainer.appendChild(errorText);
    this.errorContainer.appendChild(retryButton);
    this.errorContainer.style.display = 'block';
    this.container.style.display = 'block';
  }
  
  getElement(): HTMLElement { return this.container; }
}

const SESSION_STORAGE_KEY = 'reddit-image-viewer-preferences';

export function savePreferences(preferences: SessionStorage): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save preferences to session storage:', error);
  }
}

export function loadPreferences(): SessionStorage | null {
  try {
    const json = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!json) return null;
    const preferences = JSON.parse(json) as SessionStorage;
    if (typeof preferences.columnCount === 'number' && typeof preferences.showVideos === 'boolean' && typeof preferences.expandGalleries === 'boolean') {
      return preferences;
    }
    return null;
  } catch (error) {
    console.error('Failed to load preferences from session storage:', error);
    return null;
  }
}

export class StateManager {
  private state: ApplicationState;
  private paginationToken: string | null = null;
  private hasMoreContent: boolean = true;
  private isLoadingMore: boolean = false;
  private apiClient: APIClient;
  private responseParser: ResponseParser;
  private urlRouter: URLRouter;
  private mediaGallery?: IMediaGallery;
  private errorDisplay?: IErrorDisplay;
  private loadingIndicator?: LoadingIndicator;
  private onStateChange?: () => void;
  
  constructor(apiClient: APIClient, responseParser: ResponseParser, urlRouter: URLRouter) {
    this.apiClient = apiClient;
    this.responseParser = responseParser;
    this.urlRouter = urlRouter;
    this.state = {
      contentSource: null, sortOrder: 'hot', timespan: 'day', columnCount: 5,
      showVideos: true, expandGalleries: false, darkMode: false, masonryLayout: false,
      mediaPosts: [], isLoading: false, error: null
    };
    this.loadPreferencesFromSession();
  }
  
  private loadPreferencesFromSession(): void {
    const preferences = loadPreferences();
    if (preferences) {
      this.state.columnCount = preferences.columnCount;
      this.state.showVideos = preferences.showVideos;
      this.state.expandGalleries = preferences.expandGalleries;
      if (preferences.darkMode !== undefined) this.state.darkMode = preferences.darkMode;
      if (preferences.masonryLayout !== undefined) this.state.masonryLayout = preferences.masonryLayout;
    }
  }
  
  private savePreferencesToSession(): void {
    savePreferences({
      columnCount: this.state.columnCount, showVideos: this.state.showVideos,
      expandGalleries: this.state.expandGalleries, darkMode: this.state.darkMode,
      masonryLayout: this.state.masonryLayout
    });
  }
  
  getState(): ApplicationState { return { ...this.state }; }
  setOnStateChange(callback: () => void): void { this.onStateChange = callback; }
  setMediaGallery(gallery: IMediaGallery): void { this.mediaGallery = gallery; }
  setErrorDisplay(errorDisplay: IErrorDisplay): void { this.errorDisplay = errorDisplay; }
  setLoadingIndicator(loadingIndicator: LoadingIndicator): void { this.loadingIndicator = loadingIndicator; }
  private notifyStateChange(): void { if (this.onStateChange) this.onStateChange(); }

  async setContentSource(source: ContentSource): Promise<void> {
    if (this.mediaGallery) this.mediaGallery.pauseAllVideos();
    this.state.contentSource = source;
    this.urlRouter.updateURL(source);
    await this.loadContent();
  }
  
  async setSortOrder(order: SortOrder): Promise<void> {
    this.state.sortOrder = order;
    if (this.state.contentSource) await this.loadContent();
    else this.notifyStateChange();
  }
  
  async setTimespan(timespan: Timespan): Promise<void> {
    this.state.timespan = timespan;
    if (this.state.contentSource) await this.loadContent();
    else this.notifyStateChange();
  }
  
  setColumnCount(count: number): void {
    if (count < 1 || count > 6) return;
    this.state.columnCount = count;
    this.savePreferencesToSession();
    this.notifyStateChange();
  }
  
  setShowVideos(show: boolean): void {
    this.state.showVideos = show;
    this.savePreferencesToSession();
    this.notifyStateChange();
  }
  
  setExpandGalleries(expand: boolean): void {
    this.state.expandGalleries = expand;
    this.savePreferencesToSession();
    this.notifyStateChange();
  }
  
  setDarkMode(dark: boolean): void {
    this.state.darkMode = dark;
    document.body.classList.toggle('dark-mode', dark);
    this.savePreferencesToSession();
  }
  
  setMasonryLayout(masonry: boolean): void {
    this.state.masonryLayout = masonry;
    this.savePreferencesToSession();
    this.notifyStateChange();
  }

  async loadContent(): Promise<void> {
    if (!this.state.contentSource) return;
    this.paginationToken = null;
    this.hasMoreContent = true;
    this.isLoadingMore = false;
    this.state.isLoading = true;
    this.state.error = null;
    this.state.mediaPosts = [];
    this.notifyStateChange();
    
    try {
      const source = this.state.contentSource;
      let result: RedditAPIResult;
      const needsTimespan = this.state.sortOrder === 'top' || this.state.sortOrder === 'controversial';
      const timespan = needsTimespan ? this.state.timespan : undefined;
      
      if (source.type === 'subreddit') {
        result = await this.apiClient.fetchSubreddit(source.name, this.state.sortOrder, timespan);
      } else {
        result = await this.apiClient.fetchUserPosts(source.username, this.state.sortOrder, timespan);
      }
      
      const response: RedditAPIResponse = {
        kind: 'Listing',
        data: { children: result.posts.map(post => ({ kind: 't3' as const, data: post })), after: result.after, before: null }
      };
      
      const parsedResult = this.responseParser.parseResponse(response);
      this.state.mediaPosts = parsedResult.mediaPosts;
      this.paginationToken = parsedResult.after;
      this.hasMoreContent = parsedResult.after !== null;
      
      if (this.state.mediaPosts.length === 0) {
        const isSubreddit = this.state.contentSource.type === 'subreddit';
        const sourceName = isSubreddit 
          ? `r/${(this.state.contentSource as { type: 'subreddit'; name: string }).name}` 
          : `u/${(this.state.contentSource as { type: 'user'; username: string }).username}`;
        
        if (result.posts.length === 0) {
          this.state.error = isSubreddit
            ? `No posts found in '${sourceName}'. The subreddit may be banned, empty, or doesn't exist.`
            : `No posts found for '${sourceName}'. The user may have been deleted, suspended, or has no submissions.`;
        } else {
          this.state.error = `No images or videos found in '${sourceName}'. The ${isSubreddit ? 'subreddit' : 'user'} may only have text posts.`;
        }
        if (this.errorDisplay) this.errorDisplay.show(this.state.error, false);
      }
      
      this.state.isLoading = false;
      if (this.state.mediaPosts.length > 0 && this.errorDisplay) {
        this.errorDisplay.hide();
        this.state.error = null;
      }
    } catch (error) {
      this.state.isLoading = false;
      if (error instanceof Error) {
        const msg = error.message;
        if (msg.includes('HTTP 404')) {
          this.state.error = this.state.contentSource.type === 'subreddit'
            ? `Subreddit 'r/${this.state.contentSource.name}' not found. It may have been banned or never existed.`
            : `User 'u/${(this.state.contentSource as {type:'user';username:string}).username}' not found. The account may have been deleted or suspended.`;
        } else if (msg.includes('HTTP 403')) {
          this.state.error = this.state.contentSource.type === 'subreddit'
            ? `Subreddit 'r/${this.state.contentSource.name}' is private or quarantined.`
            : `User 'u/${(this.state.contentSource as {type:'user';username:string}).username}' has a private profile.`;
        } else if (msg.includes('HTTP 429')) { this.state.error = 'Too many requests. Please wait a moment and try again.';
        } else if (msg.includes('HTTP 503')) { this.state.error = 'Reddit is temporarily unavailable. Please try again later.';
        } else if (msg.includes('Failed to fetch')) { this.state.error = 'Unable to connect to Reddit. Please check your internet connection.';
        } else { this.state.error = 'Something went wrong while loading content. Please try again.'; }
      } else { this.state.error = 'Something went wrong while loading content. Please try again.'; }
      this.state.mediaPosts = [];
      if (this.errorDisplay && this.state.error) this.errorDisplay.show(this.state.error, true);
    }
    this.notifyStateChange();
  }

  async loadMoreContent(): Promise<void> {
    if (this.isLoadingMore || !this.hasMoreContent || this.state.isLoading) return;
    if (!this.state.contentSource) return;
    this.isLoadingMore = true;
    if (this.loadingIndicator) this.loadingIndicator.show();
    
    try {
      const source = this.state.contentSource;
      let result: RedditAPIResult;
      const needsTimespan = this.state.sortOrder === 'top' || this.state.sortOrder === 'controversial';
      const timespan = needsTimespan ? this.state.timespan : undefined;
      
      if (source.type === 'subreddit') {
        result = await this.apiClient.fetchSubreddit(source.name, this.state.sortOrder, timespan, this.paginationToken || undefined);
      } else {
        result = await this.apiClient.fetchUserPosts(source.username, this.state.sortOrder, timespan, this.paginationToken || undefined);
      }
      
      const response: RedditAPIResponse = {
        kind: 'Listing',
        data: { children: result.posts.map(post => ({ kind: 't3' as const, data: post })), after: result.after, before: null }
      };
      
      const parsedResult = this.responseParser.parseResponse(response);
      this.state.mediaPosts = [...this.state.mediaPosts, ...parsedResult.mediaPosts];
      this.paginationToken = parsedResult.after;
      this.hasMoreContent = parsedResult.after !== null;
      
      if (!this.hasMoreContent && this.loadingIndicator) this.loadingIndicator.showEndMessage();
      else if (this.loadingIndicator) this.loadingIndicator.hide();
    } catch (error) {
      let errorMessage = 'Failed to load more content. Please try again.';
      if (error instanceof Error) {
        const msg = error.message;
        if (msg.includes('HTTP 429')) errorMessage = 'Too many requests. Please wait a moment and try again.';
        else if (msg.includes('HTTP 503')) errorMessage = 'Reddit is temporarily unavailable. Please try again later.';
        else if (msg.includes('Failed to fetch')) errorMessage = 'Unable to connect to Reddit. Please check your internet connection.';
      }
      if (this.loadingIndicator) this.loadingIndicator.showError(errorMessage, () => this.loadMoreContent());
    } finally {
      this.isLoadingMore = false;
    }
    this.notifyStateChange();
  }
}
