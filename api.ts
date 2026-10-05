import {
  SortOrder, Timespan, RedditAPIResponse, RedditAPIResult, RedditPostData,
  PostMetadata, MediaPost, VideoData, GalleryData, ParsedResult
} from './types.js';
import { OAuthManager } from './auth.js';

export class APIClient {
  private readonly corsProxy = '/browser-proxy/';
  private oauthManager: OAuthManager | null = null;

  /**
   * Set the OAuth manager for authenticated requests
   */
  setOAuthManager(oauthManager: OAuthManager): void {
    this.oauthManager = oauthManager;
  }

  // All requests go to oauth.reddit.com via the local proxy, which adds the login token.
  // (Reddit blocked the unauthenticated www.reddit.com .json endpoints in May 2026.)
  private buildUrl(endpoint: string): string {
    return this.corsProxy + encodeURIComponent(`https://oauth.reddit.com${endpoint}`);
  }

  async fetchSubreddit(
    subreddit: string, sortOrder: SortOrder, timespan?: Timespan, after?: string
  ): Promise<RedditAPIResult> {
    let endpoint = `/r/${subreddit}/${sortOrder}`;

    const params = new URLSearchParams();
    if (timespan) params.append('t', timespan);
    if (after) params.append('after', after);
    params.append('raw_json', '1'); // Prevent HTML entity encoding
    endpoint += `?${params.toString()}`;
    
    const url = this.buildUrl(endpoint);
    
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.status === 401) this.oauthManager?.refreshStatus();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data: RedditAPIResponse = await response.json();
      return { posts: data.data.children.map(child => child.data), after: data.data.after };
    } catch (error) {
      if (error instanceof Error) throw new Error(`Failed to fetch subreddit: ${error.message}`);
      throw error;
    }
  }

  async fetchUserPosts(
    username: string, sortOrder: SortOrder, timespan?: Timespan, after?: string
  ): Promise<RedditAPIResult> {
    let endpoint = `/user/${username}/submitted`;

    const params = new URLSearchParams();
    params.append('sort', sortOrder);
    if (timespan) params.append('t', timespan);
    if (after) params.append('after', after);
    params.append('raw_json', '1');

    endpoint += `?${params.toString()}`;
    
    const url = this.buildUrl(endpoint);
    
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.status === 401) this.oauthManager?.refreshStatus();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data: RedditAPIResponse = await response.json();
      return { posts: data.data.children.map(child => child.data), after: data.data.after };
    } catch (error) {
      if (error instanceof Error) throw new Error(`Failed to fetch user posts: ${error.message}`);
      throw error;
    }
  }
}

export class ResponseParser {
  parseResponse(response: RedditAPIResponse): ParsedResult {
    const mediaPosts: MediaPost[] = [];
    
    for (const child of response.data.children) {
      const postData = child.data;
      const metadata: PostMetadata = {
        title: postData.title,
        author: postData.author,
        postURL: `https://www.reddit.com${postData.permalink}`,
        subreddit: postData.subreddit,
        createdDate: postData.created_utc,
        score: postData.score,
        upvoteRatio: postData.upvote_ratio
      };
      
      const galleryData = this.extractGalleryData(postData);
      if (galleryData) { mediaPosts.push({ type: 'gallery', galleryData, metadata }); continue; }
      
      const videoData = this.extractVideoData(postData);
      if (videoData) {
        const previewUrl = postData.preview?.images?.[0]?.resolutions;
        if (previewUrl && previewUrl.length > 0) {
          videoData.posterUrl = previewUrl[previewUrl.length - 1].url?.replace(/&amp;/g, '&');
        } else if (postData.preview?.images?.[0]?.source?.url) {
          videoData.posterUrl = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
        }
        mediaPosts.push({ type: 'video', videoData, metadata }); continue;
      }
      
      const embedUrl = this.extractExternalEmbed(postData);
      if (embedUrl) {
        const imageData = this.extractImageURL(postData);
        mediaPosts.push({ type: 'external-embed', embedUrl, externalUrl: postData.url, previewUrl: imageData?.url, metadata }); continue;
      }
      
      const imageData = this.extractImageURL(postData);
      if (imageData) {
        const isExternalVideo = postData.post_hint === 'rich:video' || 
          postData.domain?.includes('gfycat') || postData.domain?.includes('redgifs') || postData.domain?.includes('imgur');
        mediaPosts.push({
          type: 'image', url: imageData.url, thumbnailUrl: imageData.thumbnailUrl,
          gifVideoUrl: imageData.gifVideoUrl, width: imageData.width, height: imageData.height,
          externalUrl: postData.url, isExternalVideo, metadata
        });
      }
    }
    
    return { mediaPosts, after: response.data.after };
  }

  extractExternalEmbed(post: RedditPostData): string | null {
    if (post.domain?.includes('redgifs.com') && post.url) {
      const match = post.url.match(/redgifs\.com\/watch\/([a-zA-Z0-9]+)/i);
      if (match && match[1]) return `https://redgifs.com/ifr/${match[1]}`;
    }
    return null;
  }

  extractImageURL(post: RedditPostData): { url: string; thumbnailUrl?: string; gifVideoUrl?: string; width?: number; height?: number } | null {
    if (post.is_video) return null;
    
    if (post.preview?.images?.[0]?.source?.url) {
      const fullSizeURL = post.preview.images[0].source.url.replace(/&amp;/g, '&');
      const sourceWidth = post.preview.images[0].source.width;
      const sourceHeight = post.preview.images[0].source.height;
      
      let thumbnailURL: string | undefined;
      const resolutions = post.preview.images[0].resolutions;
      if (resolutions && resolutions.length > 0) {
        const largestResolution = resolutions[resolutions.length - 1];
        if (largestResolution?.url) thumbnailURL = largestResolution.url.replace(/&amp;/g, '&');
      }
      
      let gifVideoURL: string | undefined;
      const variants = post.preview.images[0].variants;
      if (variants?.mp4?.source?.url) gifVideoURL = variants.mp4.source.url.replace(/&amp;/g, '&');
      
      return { url: fullSizeURL, thumbnailUrl: thumbnailURL, gifVideoUrl: gifVideoURL, width: sourceWidth, height: sourceHeight };
    }
    
    if (post.post_hint === 'image' && this.isValidImageFormat(post.url)) return { url: post.url };
    if (this.isValidImageFormat(post.url)) return { url: post.url };
    return null;
  }
  
  extractVideoData(post: RedditPostData): VideoData | null {
    if (post.is_video && post.media?.reddit_video) {
      const redditVideo = post.media.reddit_video;
      const source = post.preview?.images?.[0]?.source;
      return { url: redditVideo.fallback_url || redditVideo.hls_url, fallbackURL: redditVideo.fallback_url, width: source?.width, height: source?.height };
    }
    return null;
  }
  
  extractGalleryData(post: RedditPostData): GalleryData | null {
    if (!post.gallery_data || !post.media_metadata) return null;
    
    const images: string[] = [];
    const thumbnails: string[] = [];
    const dimensions: { width: number; height: number }[] = [];
    
    for (const item of post.gallery_data.items) {
      const mediaId = item.media_id;
      const mediaInfo = post.media_metadata[mediaId];
      if (mediaInfo?.s?.u) {
        const imageURL = mediaInfo.s.u.replace(/&amp;/g, '&');
        images.push(imageURL);
        dimensions.push({ width: mediaInfo.s.x || 0, height: mediaInfo.s.y || 0 });
        let thumbnailURL = imageURL;
        if (mediaInfo.p && mediaInfo.p.length > 0) {
          const largest = mediaInfo.p[mediaInfo.p.length - 1];
          if (largest.u) thumbnailURL = largest.u.replace(/&amp;/g, '&');
        }
        thumbnails.push(thumbnailURL);
      }
    }
    
    if (images.length > 0) return { images, thumbnails, dimensions };
    return null;
  }
  
  private isValidImageFormat(url: string): boolean {
    const lowerURL = url.toLowerCase();
    return lowerURL.endsWith('.jpg') || lowerURL.endsWith('.jpeg') || lowerURL.endsWith('.png') || lowerURL.endsWith('.gif') || lowerURL.endsWith('.webp');
  }
}

export interface RedgifsVideoInfo {
  hdUrl: string;
  sdUrl: string;
  posterUrl: string;
  width: number;
  height: number;
  hasAudio: boolean;
  duration: number;
}

export class RedgifsClient {
  async getVideoInfo(videoId: string): Promise<RedgifsVideoInfo> {
    const response = await fetch(`/api/redgifs/${videoId}`);
    if (!response.ok) throw new Error(`Redgifs API failed: ${response.status}`);
    return await response.json();
  }
}
