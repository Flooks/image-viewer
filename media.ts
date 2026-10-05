import {
  ContentSource, PostMetadata, VideoData, GalleryData, GalleryConfig,
  MediaPost, ImagePost, GalleryPost
} from './types.js';
import { StateManager, IErrorDisplay } from './state.js';
import { VirtualScrollManager } from './scroll.js';
import { RedgifsClient } from './api.js';

// Reddit redirects direct browser navigation to i.redd.it/preview.redd.it to its
// own media page, so we show full-size images via a local viewer page.
function openFullImage(imageURL: string): void {
  let host = '';
  try { host = new URL(imageURL).hostname; } catch { /* leave empty */ }
  const target = /(^|\.)redd\.it$/i.test(host) ? `viewer.html#${encodeURIComponent(imageURL)}` : imageURL;
  window.open(target, '_blank', 'noopener,noreferrer');
}

// 847 -> "847", 12345 -> "12.3k", 1234567 -> "1.2m"
function formatScore(score: number): string {
  const abs = Math.abs(score);
  const sign = score < 0 ? '-' : '';
  if (abs >= 999_950) return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(score);
}

// Let the browser handle Ctrl/Cmd/Shift-click so links can open in a new tab or window.
function isNewTabClick(e: MouseEvent): boolean {
  return e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0;
}

export class MetadataDisplay {
  private stateManager: StateManager;
  
  constructor(stateManager: StateManager) { this.stateManager = stateManager; }
  
  render(metadata: PostMetadata): HTMLElement {
    const container = document.createElement('div');
    container.className = 'metadata-display';
    
    if (metadata.title) {
      const titleLink = document.createElement('a');
      titleLink.className = 'post-title-link';
      titleLink.href = metadata.postURL || '#';
      titleLink.target = '_blank';
      titleLink.rel = 'noopener noreferrer';
      titleLink.textContent = metadata.title;
      const titleContainer = document.createElement('div');
      titleContainer.className = 'post-title';
      titleContainer.appendChild(titleLink);
      container.appendChild(titleContainer);
    } else {
      const titleContainer = document.createElement('div');
      titleContainer.className = 'post-title';
      titleContainer.textContent = '[No title]';
      container.appendChild(titleContainer);
    }
    
    const authorContainer = document.createElement('div');
    authorContainer.className = 'post-author';
    
    const authorLeft = document.createElement('span');
    
    if (metadata.subreddit) {
      const subredditLink = document.createElement('a');
      subredditLink.className = 'subreddit-link';
      subredditLink.href = `#/r/${metadata.subreddit}`;
      subredditLink.textContent = `r/${metadata.subreddit}`;
      subredditLink.addEventListener('click', (e) => {
        if (isNewTabClick(e)) return;
        e.preventDefault();
        this.stateManager.setContentSource({ type: 'subreddit', name: metadata.subreddit! });
      });
      authorLeft.appendChild(subredditLink);
    }
    
    if (metadata.author) {
      if (metadata.subreddit) authorLeft.appendChild(document.createTextNode(' • '));
      const authorLink = document.createElement('a');
      authorLink.className = 'author-username-link';
      authorLink.href = `#/u/${metadata.author}`;
      authorLink.textContent = `u/${metadata.author}`;
      authorLink.addEventListener('click', (e) => {
        if (isNewTabClick(e)) return;
        e.preventDefault();
        this.stateManager.setContentSource({ type: 'user', username: metadata.author });
      });
      authorLeft.appendChild(authorLink);
    } else {
      if (metadata.subreddit) authorLeft.appendChild(document.createTextNode(' • '));
      authorLeft.appendChild(document.createTextNode('u/[deleted]'));
    }
    
    authorContainer.appendChild(authorLeft);

    const authorRight = document.createElement('span');
    authorRight.className = 'post-meta-right';

    if (metadata.score !== undefined) {
      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'post-score';
      const ratio = metadata.upvoteRatio !== undefined ? ` ${Math.round(metadata.upvoteRatio * 100)}%` : '';
      scoreSpan.textContent = `▲ ${formatScore(metadata.score)}${ratio}`;
      const points = `${metadata.score.toLocaleString()} ${Math.abs(metadata.score) === 1 ? 'point' : 'points'}`;
      scoreSpan.title = ratio ? `${points} ·${ratio} upvoted` : points;
      authorRight.appendChild(scoreSpan);
    }

    if (metadata.createdDate) {
      const date = new Date(metadata.createdDate * 1000);
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      const now = Date.now();
      const diffMs = now - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      let relative: string;
      if (diffMins < 1) relative = 'just now';
      else if (diffMins < 60) relative = `${diffMins}m ago`;
      else if (diffHours < 24) relative = `${diffHours}h ago`;
      else if (diffDays === 1) relative = '1 day ago';
      else if (diffDays < 30) relative = `${diffDays} days ago`;
      else if (diffDays < 365) relative = `${Math.floor(diffDays / 30)}mo ago`;
      else relative = `${Math.floor(diffDays / 365)}y ago`;
      const dateSpan = document.createElement('span');
      dateSpan.className = 'post-date';
      dateSpan.textContent = relative;
      dateSpan.title = `${dd}/${mm}/${yyyy}`;
      if (authorRight.hasChildNodes()) authorRight.appendChild(document.createTextNode(' · '));
      authorRight.appendChild(dateSpan);
    }

    if (authorRight.hasChildNodes()) authorContainer.appendChild(authorRight);
    
    container.appendChild(authorContainer);
    return container;
  }
}

export class GalleryCarousel {
  private container: HTMLElement;
  private imageContainer: HTMLElement;
  private currentImage: HTMLImageElement;
  private prevButton: HTMLButtonElement;
  private nextButton: HTMLButtonElement;
  private positionIndicator: HTMLElement;
  private loadingSpinner: HTMLElement;
  private galleryData: GalleryData;
  private metadata: PostMetadata;
  private currentIndex: number;
  
  constructor(galleryData: GalleryData, metadata: PostMetadata) {
    this.galleryData = galleryData;
    this.metadata = metadata;
    this.currentIndex = 0;
    
    this.container = document.createElement('div');
    this.container.className = 'gallery-carousel';
    
    this.imageContainer = document.createElement('div');
    this.imageContainer.className = 'carousel-image-container';
    const firstDim = galleryData.dimensions[0];
    if (firstDim && firstDim.width && firstDim.height) {
      this.imageContainer.style.aspectRatio = `${firstDim.width} / ${firstDim.height}`;
    }
    
    this.currentImage = document.createElement('img');
    this.currentImage.className = 'carousel-image';
    this.currentImage.alt = metadata.title || 'Gallery image';
    this.currentImage.style.cursor = 'pointer';
    this.currentImage.addEventListener('click', () => this.openCurrentImageInNewTab());
    this.currentImage.addEventListener('error', () => this.handleImageLoadError());
    this.currentImage.addEventListener('load', () => this.hideLoadingSpinner());
    this.imageContainer.appendChild(this.currentImage);
    
    this.loadingSpinner = document.createElement('div');
    this.loadingSpinner.className = 'carousel-loading';
    this.loadingSpinner.style.display = 'none';
    this.imageContainer.appendChild(this.loadingSpinner);
    this.container.appendChild(this.imageContainer);
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'carousel-controls';
    this.prevButton = document.createElement('button');
    this.prevButton.className = 'carousel-button carousel-prev';
    this.prevButton.innerHTML = '‹';
    this.prevButton.setAttribute('aria-label', 'Previous image');
    this.prevButton.addEventListener('click', () => this.previous());
    controlsContainer.appendChild(this.prevButton);
    this.nextButton = document.createElement('button');
    this.nextButton.className = 'carousel-button carousel-next';
    this.nextButton.innerHTML = '›';
    this.nextButton.setAttribute('aria-label', 'Next image');
    this.nextButton.addEventListener('click', () => this.next());
    controlsContainer.appendChild(this.nextButton);
    this.container.appendChild(controlsContainer);
    
    this.positionIndicator = document.createElement('div');
    this.positionIndicator.className = 'carousel-indicator';
    this.container.appendChild(this.positionIndicator);
    this.updateDisplay();
  }
  
  render(): HTMLElement { return this.container; }
  
  next(): void {
    if (this.currentIndex < this.galleryData.images.length - 1) { this.currentIndex++; this.updateDisplay(); this.preloadNextImage(); }
  }
  
  previous(): void {
    if (this.currentIndex > 0) { this.currentIndex--; this.updateDisplay(); this.preloadNextImage(); }
  }
  
  getCurrentIndex(): number { return this.currentIndex; }

  private updateDisplay(): void {
    this.showLoadingSpinner();
    const dim = this.galleryData.dimensions[this.currentIndex];
    if (dim && dim.width && dim.height) {
      this.imageContainer.style.aspectRatio = `${dim.width} / ${dim.height}`;
    }
    this.currentImage.src = this.galleryData.thumbnails[this.currentIndex];
    this.currentImage.style.display = 'block';
    this.positionIndicator.textContent = `${this.currentIndex + 1} of ${this.galleryData.images.length}`;
    
    this.prevButton.disabled = this.currentIndex === 0;
    this.prevButton.style.visibility = this.currentIndex === 0 ? 'hidden' : 'visible';
    this.nextButton.disabled = this.currentIndex === this.galleryData.images.length - 1;
    this.nextButton.style.visibility = this.currentIndex === this.galleryData.images.length - 1 ? 'hidden' : 'visible';
  }
  
  private showLoadingSpinner(): void { this.loadingSpinner.style.display = 'flex'; }
  private hideLoadingSpinner(): void { this.loadingSpinner.style.display = 'none'; }
  
  private preloadNextImage(): void {
    if (this.currentIndex < this.galleryData.images.length - 1) {
      const preloadImage = new Image();
      preloadImage.src = this.galleryData.thumbnails[this.currentIndex + 1];
    }
  }
  
  private handleImageLoadError(): void {
    this.hideLoadingSpinner();
    this.currentImage.style.display = 'none';
    let errorPlaceholder = this.imageContainer.querySelector('.image-error-placeholder') as HTMLElement;
    if (!errorPlaceholder) {
      errorPlaceholder = document.createElement('div');
      errorPlaceholder.className = 'image-error-placeholder';
      this.imageContainer.appendChild(errorPlaceholder);
    }
    errorPlaceholder.textContent = `Image ${this.currentIndex + 1} of ${this.galleryData.images.length} failed to load`;
    errorPlaceholder.style.display = 'flex';
  }
  
  private openCurrentImageInNewTab(): void {
    openFullImage(this.galleryData.images[this.currentIndex]);
  }
}

export class VideoPlayer {
  private container: HTMLElement;
  private videoElement: HTMLVideoElement;
  private videoData: VideoData;
  private metadata: PostMetadata;
  
  constructor(videoData: VideoData, metadata: PostMetadata) {
    this.videoData = videoData;
    this.metadata = metadata;
    this.container = document.createElement('div');
    this.container.className = 'video-player';
    
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    if (videoData.width && videoData.height) {
      videoContainer.style.aspectRatio = `${videoData.width} / ${videoData.height}`;
    }
    
    this.videoElement = document.createElement('video');
    this.videoElement.className = 'video-element';
    if (videoData.posterUrl) this.videoElement.poster = videoData.posterUrl;
    this.videoElement.controls = true;
    this.videoElement.preload = 'none';
    this.videoElement.style.cursor = 'default';
    this.videoElement.addEventListener('click', (e) => e.stopPropagation());
    this.videoElement.addEventListener('error', () => this.handleVideoLoadError());
    
    videoContainer.appendChild(this.videoElement);
    this.container.appendChild(videoContainer);
    
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.videoElement.src = videoData.url;
          this.videoElement.preload = 'metadata';
          observer.disconnect();
          break;
        }
      }
    }, { rootMargin: '200px' });
    observer.observe(this.container);
  }
  
  render(): HTMLElement { return this.container; }
  
  pause(): void { if (!this.videoElement.paused) this.videoElement.pause(); }
  
  private handleVideoLoadError(): void {
    this.videoElement.style.display = 'none';
    const errorPlaceholder = document.createElement('div');
    errorPlaceholder.className = 'video-error-placeholder';
    const errorMessage = document.createElement('p');
    errorMessage.textContent = 'Video failed to load';
    errorPlaceholder.appendChild(errorMessage);
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

export // Shared Redgifs client instance (singleton, token cached)
const redgifsClient = new RedgifsClient();

class ExternalEmbedPlayer {
  private container: HTMLElement;
  private embedUrl: string;
  private externalUrl: string;
  private previewUrl: string | undefined;
  private metadata: PostMetadata;
  private videoId: string | null;
  
  constructor(embedUrl: string, externalUrl: string, previewUrl: string | undefined, metadata: PostMetadata) {
    this.embedUrl = embedUrl;
    this.externalUrl = externalUrl;
    this.previewUrl = previewUrl;
    this.metadata = metadata;
    this.videoId = this.extractVideoId(externalUrl);
    this.container = document.createElement('div');
    this.container.className = 'external-embed-player';
    this.renderPreview();
  }

  private extractVideoId(url: string): string | null {
    const match = url.match(/redgifs\.com\/watch\/([a-zA-Z0-9]+)/i);
    return match ? match[1] : null;
  }
  
  private renderPreview(): void {
    const previewContainer = document.createElement('div');
    previewContainer.className = 'embed-preview-container';
    
    if (this.previewUrl) {
      const previewImg = document.createElement('img');
      previewImg.className = 'media-image';
      previewImg.src = this.previewUrl;
      previewImg.alt = this.metadata.title || 'External video';
      previewImg.style.cursor = 'pointer';
      previewContainer.appendChild(previewImg);
    }
    
    const playButton = document.createElement('div');
    playButton.className = 'embed-play-button';
    playButton.innerHTML = '▶';
    playButton.style.cursor = 'pointer';
    previewContainer.appendChild(playButton);
    
    previewContainer.addEventListener('click', () => {
      if (this.videoId) {
        this.loadNativeVideo();
      } else {
        this.renderIframe();
      }
    });
    
    this.container.appendChild(previewContainer);
  }

  private async loadNativeVideo(): Promise<void> {
    // Show loading state
    const previewContainer = this.container.querySelector('.embed-preview-container');
    if (previewContainer) {
      const playBtn = previewContainer.querySelector('.embed-play-button') as HTMLElement;
      if (playBtn) { playBtn.classList.add('loading'); playBtn.innerHTML = ''; }
    }

    try {
      console.log('[Redgifs] Fetching video info for:', this.videoId);
      const info = await redgifsClient.getVideoInfo(this.videoId!);
      console.log('[Redgifs] Got video info:', info);
      this.container.innerHTML = '';
      const videoContainer = document.createElement('div');
      videoContainer.className = 'video-container';
      if (info.width && info.height) {
        videoContainer.style.aspectRatio = `${info.width} / ${info.height}`;
      }
      const video = document.createElement('video');
      video.className = 'media-video';
      video.controls = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.poster = info.posterUrl;
      // Prefer HD, fall back to SD
      const hdSource = document.createElement('source');
      hdSource.src = info.hdUrl;
      hdSource.type = 'video/mp4';
      video.appendChild(hdSource);
      const sdSource = document.createElement('source');
      sdSource.src = info.sdUrl;
      sdSource.type = 'video/mp4';
      video.appendChild(sdSource);
      videoContainer.appendChild(video);
      this.container.appendChild(videoContainer);
      video.play().catch(() => {});
    } catch (error) {
      console.error('[Redgifs] Failed to load native video, falling back to iframe:', error);
      // Fallback to iframe on API failure
      this.renderIframe();
    }
  }
  
  private renderIframe(): void {
    this.container.innerHTML = '';
    const embedContainer = document.createElement('div');
    embedContainer.className = 'embed-container';
    const iframe = document.createElement('iframe');
    iframe.className = 'embed-iframe';
    iframe.src = this.embedUrl;
    iframe.allow = 'autoplay; fullscreen';
    iframe.setAttribute('allowfullscreen', '');
    embedContainer.appendChild(iframe);
    this.container.appendChild(embedContainer);
  }
  
  render(): HTMLElement { return this.container; }
}

export class MediaGallery {
  private container: HTMLElement;
  private stateManager: StateManager;
  private metadataDisplay: MetadataDisplay;
  private videoPlayers: VideoPlayer[] = [];
  private previousPostCount: number = 0;
  private loadingIndicatorElement?: HTMLElement;
  private virtualScroll: VirtualScrollManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.metadataDisplay = new MetadataDisplay(stateManager);
    this.virtualScroll = new VirtualScrollManager();
    this.container = document.createElement('div');
    this.container.className = 'media-gallery';
  }

  setLoadingIndicator(loadingIndicator: HTMLElement): void { this.loadingIndicatorElement = loadingIndicator; }

  render(posts: MediaPost[], config: GalleryConfig): void {
    const isAppending = posts.length > this.previousPostCount && this.previousPostCount > 0;

    if (isAppending) {
      const newPosts = posts.slice(this.previousPostCount);
      const filteredNewPosts = config.showVideos ? newPosts : newPosts.filter(post => {
        if (post.type === 'video' || post.type === 'external-embed') return false;
        if (post.type === 'image' && (post.gifVideoUrl || post.url.toLowerCase().includes('.gif'))) return false;
        return true;
      });

      filteredNewPosts.forEach(post => {
        const mediaItem = this.createMediaItem(post, config);
        if (this.loadingIndicatorElement && this.container.contains(this.loadingIndicatorElement)) {
          this.container.insertBefore(mediaItem, this.loadingIndicatorElement);
        } else {
          this.container.appendChild(mediaItem);
        }
        this.virtualScroll.observe(mediaItem);
      });
      
      if (config.masonryLayout) this.applyMasonryLayout(config.columnCount);
      const totalItems = this.container.querySelectorAll('.media-item').length;
      if (totalItems > 20) this.virtualScroll.enable();
    } else {
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
        if (distance < closestDistance) { closestDistance = distance; anchorIndex = i; anchorOffsetFromTop = viewportTop - itemTop; }
      }
      
      this.clear();
      this.container.className = config.masonryLayout
        ? `media-gallery masonry-layout columns-${config.columnCount}`
        : `media-gallery columns-${config.columnCount}`;
      if (!config.masonryLayout) { this.container.style.position = ''; this.container.style.height = ''; }

      const filteredPosts = config.showVideos ? posts : posts.filter(post => {
        if (post.type === 'video' || post.type === 'external-embed') return false;
        if (post.type === 'image' && (post.gifVideoUrl || post.url.toLowerCase().includes('.gif'))) return false;
        return true;
      });

      filteredPosts.forEach(post => {
        const mediaItem = this.createMediaItem(post, config);
        this.container.appendChild(mediaItem);
        this.virtualScroll.observe(mediaItem);
      });

      if (this.loadingIndicatorElement) this.container.appendChild(this.loadingIndicatorElement);
      if (config.masonryLayout) this.applyMasonryLayout(config.columnCount);
      
      if (anchorIndex >= 0) {
        requestAnimationFrame(() => {
          const newItems = this.container.querySelectorAll('.media-item');
          if (newItems[anchorIndex]) {
            const anchorElement = newItems[anchorIndex] as HTMLElement;
            const rect = anchorElement.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;
            const cappedOffset = Math.min(anchorOffsetFromTop, rect.height * 0.3);
            window.scrollTo(0, absoluteTop + cappedOffset);
          }
        });
      }
      
      if (filteredPosts.length > 20) this.virtualScroll.enable();
    }
    this.previousPostCount = posts.length;
  }

  private applyMasonryLayout(columnCount: number): void {
    const items = this.container.querySelectorAll('.media-item') as NodeListOf<HTMLElement>;
    if (items.length === 0) return;
    const gap = 5;
    const containerWidth = this.container.clientWidth;
    const colWidth = (containerWidth - gap * (columnCount - 1)) / columnCount;
    const colHeights = new Array(columnCount).fill(0);
    this.container.style.position = 'relative';
    
    items.forEach(item => {
      const minHeight = Math.min(...colHeights);
      const colIndex = colHeights.indexOf(minHeight);
      item.style.position = 'absolute';
      item.style.width = `${colWidth}px`;
      item.style.left = `${colIndex * (colWidth + gap)}px`;
      item.style.top = `${colHeights[colIndex]}px`;
      colHeights[colIndex] += item.offsetHeight + gap;
    });
    this.container.style.height = `${Math.max(...colHeights)}px`;
    
    const images = this.container.querySelectorAll('img, video');
    let pending = 0;
    const reflow = () => { pending--; if (pending <= 0) requestAnimationFrame(() => this.reflowMasonry(columnCount)); };
    images.forEach(img => {
      if (!(img as HTMLImageElement).complete) { pending++; img.addEventListener('load', reflow, { once: true }); img.addEventListener('error', reflow, { once: true }); }
    });
  }
  
  private reflowMasonry(columnCount: number): void {
    const items = this.container.querySelectorAll('.media-item') as NodeListOf<HTMLElement>;
    if (items.length === 0) return;
    const gap = 5;
    const containerWidth = this.container.clientWidth;
    const colWidth = (containerWidth - gap * (columnCount - 1)) / columnCount;
    const colHeights = new Array(columnCount).fill(0);
    items.forEach(item => {
      const minHeight = Math.min(...colHeights);
      const colIndex = colHeights.indexOf(minHeight);
      item.style.left = `${colIndex * (colWidth + gap)}px`;
      item.style.top = `${colHeights[colIndex]}px`;
      colHeights[colIndex] += item.offsetHeight + gap;
    });
    this.container.style.height = `${Math.max(...colHeights)}px`;
  }

  private createMediaItem(post: MediaPost, config: GalleryConfig): HTMLElement {
    const itemContainer = document.createElement('div');
    itemContainer.className = 'media-item';
    let mediaElement: HTMLElement;

    if (post.type === 'image') {
      mediaElement = this.createImageElement(post);
    } else if (post.type === 'video') {
      const videoPlayer = new VideoPlayer(post.videoData, post.metadata);
      this.videoPlayers.push(videoPlayer);
      mediaElement = videoPlayer.render();
    } else if (post.type === 'external-embed') {
      const embedPlayer = new ExternalEmbedPlayer(post.embedUrl, post.externalUrl, post.previewUrl, post.metadata);
      mediaElement = embedPlayer.render();
    } else if (post.type === 'gallery') {
      if (config.expandGalleries) { mediaElement = this.createExpandedGallery(post); }
      else { const carousel = new GalleryCarousel(post.galleryData, post.metadata); mediaElement = carousel.render(); }
    } else {
      mediaElement = document.createElement('div');
      mediaElement.textContent = 'Unknown media type';
    }

    itemContainer.appendChild(mediaElement);
    itemContainer.appendChild(this.metadataDisplay.render(post.metadata));
    return itemContainer;
  }

  private createImageElement(post: ImagePost): HTMLElement {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';
    if (post.width && post.height) imageContainer.style.aspectRatio = `${post.width} / ${post.height}`;
    const isGif = post.url.toLowerCase().includes('.gif');
    
    if (post.isExternalVideo) {
      const badge = document.createElement('div');
      badge.className = 'gif-badge'; badge.textContent = 'LINK'; badge.style.backgroundColor = 'rgba(0, 100, 200, 0.75)';
      imageContainer.appendChild(badge);
      const image = document.createElement('img');
      image.className = 'media-image'; image.alt = post.metadata.title || 'External video'; image.style.cursor = 'pointer'; image.loading = 'lazy';
      image.addEventListener('click', () => window.open(post.externalUrl, '_blank', 'noopener,noreferrer'));
      image.addEventListener('error', () => this.handleImageLoadError(imageContainer, image));
      image.src = post.thumbnailUrl || post.url;
      imageContainer.appendChild(image);
    } else if (isGif && post.gifVideoUrl) {
      const video = document.createElement('video');
      video.className = 'media-image'; video.loop = true; video.muted = true; video.playsInline = true;
      video.preload = 'none'; video.poster = post.thumbnailUrl || post.url; video.style.cursor = 'pointer'; video.src = post.gifVideoUrl;
      const gifBadge = document.createElement('div'); gifBadge.className = 'gif-badge'; gifBadge.textContent = 'GIF';
      imageContainer.appendChild(gifBadge);
      const playOverlay = document.createElement('div'); playOverlay.className = 'gif-play-overlay'; playOverlay.innerHTML = '▶';
      imageContainer.appendChild(playOverlay);
      let isPlaying = false;
      const togglePlay = () => {
        if (isPlaying) { video.pause(); playOverlay.style.display = ''; gifBadge.style.display = ''; isPlaying = false; }
        else { video.play().then(() => { playOverlay.style.display = 'none'; gifBadge.style.display = 'none'; isPlaying = true; }).catch(() => window.open(post.metadata.postURL, '_blank', 'noopener,noreferrer')); }
      };
      video.addEventListener('click', togglePlay);
      playOverlay.style.cursor = 'pointer'; playOverlay.style.pointerEvents = 'auto';
      playOverlay.addEventListener('click', togglePlay);
      video.addEventListener('error', () => {
        const fallbackImg = document.createElement('img');
        fallbackImg.className = 'media-image'; fallbackImg.alt = post.metadata.title || 'Reddit GIF'; fallbackImg.style.cursor = 'pointer';
        fallbackImg.src = post.thumbnailUrl || post.url;
        fallbackImg.addEventListener('click', () => window.open(post.metadata.postURL, '_blank', 'noopener,noreferrer'));
        video.replaceWith(fallbackImg); playOverlay.style.display = 'none';
      });
      imageContainer.appendChild(video);
    } else if (isGif) {
      const image = document.createElement('img');
      image.className = 'media-image'; image.alt = post.metadata.title || 'Reddit GIF'; image.style.cursor = 'pointer'; image.loading = 'lazy';
      const gifBadge = document.createElement('div'); gifBadge.className = 'gif-badge'; gifBadge.textContent = 'GIF';
      imageContainer.appendChild(gifBadge);
      image.addEventListener('click', () => window.open(post.metadata.postURL, '_blank', 'noopener,noreferrer'));
      image.addEventListener('error', () => this.handleImageLoadError(imageContainer, image));
      image.src = post.thumbnailUrl || post.url;
      imageContainer.appendChild(image);
    } else {
      const image = document.createElement('img');
      image.className = 'media-image'; image.alt = post.metadata.title || 'Reddit image'; image.style.cursor = 'pointer'; image.loading = 'lazy';
      image.addEventListener('click', () => openFullImage(post.url));
      image.addEventListener('error', () => this.handleImageLoadError(imageContainer, image));
      image.src = post.thumbnailUrl || post.url;
      imageContainer.appendChild(image);
    }
    return imageContainer;
  }

  private createExpandedGallery(post: GalleryPost): HTMLElement {
    const galleryContainer = document.createElement('div');
    galleryContainer.className = 'expanded-gallery';
    post.galleryData.images.forEach((imageURL, index) => {
      const imageWrapper = document.createElement('div');
      imageWrapper.className = 'expanded-gallery-image-wrapper';
      const image = document.createElement('img');
      image.className = 'media-image expanded-gallery-image';
      image.alt = `${post.metadata.title || 'Gallery image'} - Image ${index + 1}`;
      image.style.cursor = 'pointer'; image.loading = 'lazy';
      image.addEventListener('click', () => openFullImage(imageURL));
      image.addEventListener('error', () => this.handleImageLoadError(imageWrapper, image));
      image.src = imageURL;
      imageWrapper.appendChild(image);
      galleryContainer.appendChild(imageWrapper);
    });
    return galleryContainer;
  }

  private handleImageLoadError(container: HTMLElement, image: HTMLImageElement): void {
    image.style.display = 'none';
    const errorPlaceholder = document.createElement('div');
    errorPlaceholder.className = 'image-error-placeholder';
    const errorIcon = document.createElement('div'); errorIcon.className = 'error-icon'; errorIcon.textContent = '⚠️';
    errorPlaceholder.appendChild(errorIcon);
    const errorMessage = document.createElement('p'); errorMessage.textContent = 'Image failed to load';
    errorPlaceholder.appendChild(errorMessage);
    container.appendChild(errorPlaceholder);
  }

  pauseAllVideos(): void { this.videoPlayers.forEach(player => player.pause()); }

  clear(): void {
    this.pauseAllVideos();
    this.videoPlayers = [];
    this.virtualScroll.clear();
    this.virtualScroll.disable();
    this.container.innerHTML = '';
    this.previousPostCount = 0;
  }

  getElement(): HTMLElement { return this.container; }
}

export class ErrorDisplay implements IErrorDisplay {
  private container: HTMLElement;
  private stateManager: StateManager;
  
  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.container = document.createElement('div');
    this.container.className = 'error-display';
    this.container.style.display = 'none';
  }
  
  show(errorMessage: string, showRetry: boolean = true): void {
    this.container.innerHTML = '';
    const errorIcon = document.createElement('div');
    errorIcon.className = 'error-icon-large'; errorIcon.textContent = '⚠️';
    this.container.appendChild(errorIcon);
    const messageElement = document.createElement('p');
    messageElement.className = 'error-message-text'; messageElement.textContent = errorMessage;
    this.container.appendChild(messageElement);
    if (showRetry) {
      const retryButton = document.createElement('button');
      retryButton.className = 'retry-button'; retryButton.textContent = 'Retry';
      retryButton.addEventListener('click', () => this.handleRetry());
      this.container.appendChild(retryButton);
    }
    this.container.style.display = 'block';
  }
  
  hide(): void { this.container.style.display = 'none'; this.container.innerHTML = ''; }
  
  private async handleRetry(): Promise<void> { this.hide(); await this.stateManager.loadContent(); }
  
  getElement(): HTMLElement { return this.container; }
}
