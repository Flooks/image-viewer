// Core Type Definitions for Reddit Image Viewer

// OAuth Configuration
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  userAgent: string;
  scope: string;
}

// OAuth Token
export interface OAuthToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number;  // Unix timestamp (ms)
  scope: string;
}

// Auth State
export interface AuthState {
  isAuthenticated: boolean;
  token: OAuthToken | null;
  error: string | null;
}

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
  createdDate?: number;
}

export interface VideoData {
  url: string;
  fallbackURL?: string;
  posterUrl?: string;
  width?: number;
  height?: number;
}

export interface GalleryData {
  images: string[];
  thumbnails: string[];
  dimensions: { width: number; height: number }[];
}

export interface ImagePost {
  type: 'image';
  url: string;
  thumbnailUrl?: string;
  gifVideoUrl?: string;
  width?: number;
  height?: number;
  metadata: PostMetadata;
  externalUrl?: string;
  isExternalVideo?: boolean;
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

export interface ExternalEmbedPost {
  type: 'external-embed';
  embedUrl: string;
  externalUrl: string;
  previewUrl?: string;
  metadata: PostMetadata;
}

export type MediaPost = ImagePost | VideoPost | GalleryPost | ExternalEmbedPost;

// Parsed Response Result
export interface ParsedResult {
  mediaPosts: MediaPost[];
  after: string | null;
}

// Application State
export interface ApplicationState {
  contentSource: ContentSource | null;
  sortOrder: SortOrder;
  timespan: Timespan;
  columnCount: number;
  showVideos: boolean;
  expandGalleries: boolean;
  darkMode: boolean;
  masonryLayout: boolean;
  mediaPosts: MediaPost[];
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
  domain?: string;
  created_utc?: number;
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
        x?: number;
        y?: number;
      };
      p?: Array<{
        u?: string;
        x?: number;
        y?: number;
      }>;
    };
  };
  secure_media?: any;
  secure_media_embed?: any;
  media_embed?: any;
  url_overridden_by_dest?: string;
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
      variants?: {
        gif?: {
          source?: { url?: string; width?: number; height?: number };
          resolutions?: Array<{ url?: string; width?: number; height?: number }>;
        };
        mp4?: {
          source?: { url?: string; width?: number; height?: number };
          resolutions?: Array<{ url?: string; width?: number; height?: number }>;
        };
      };
    }>;
  };
}

// Session Storage Types
export interface SessionStorage {
  columnCount: number;
  showVideos: boolean;
  expandGalleries: boolean;
  darkMode: boolean;
  masonryLayout: boolean;
  sortOrder?: SortOrder;
  timespan?: Timespan;
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
  masonryLayout: boolean;
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
