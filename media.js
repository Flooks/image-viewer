import { VirtualScrollManager } from './scroll.js';
export class MetadataDisplay {
    constructor(stateManager) { this.stateManager = stateManager; }
    render(metadata) {
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
        }
        else {
            const titleContainer = document.createElement('div');
            titleContainer.className = 'post-title';
            titleContainer.textContent = '[No title]';
            container.appendChild(titleContainer);
        }
        const authorContainer = document.createElement('div');
        authorContainer.className = 'post-author';
        if (metadata.subreddit) {
            const subredditLink = document.createElement('a');
            subredditLink.className = 'subreddit-link';
            subredditLink.href = `#/r/${metadata.subreddit}`;
            subredditLink.textContent = `r/${metadata.subreddit}`;
            subredditLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.stateManager.setContentSource({ type: 'subreddit', name: metadata.subreddit });
            });
            authorContainer.appendChild(subredditLink);
        }
        if (metadata.author) {
            if (metadata.subreddit)
                authorContainer.appendChild(document.createTextNode(' • '));
            const authorLink = document.createElement('a');
            authorLink.className = 'author-username-link';
            authorLink.href = `#/u/${metadata.author}`;
            authorLink.textContent = `u/${metadata.author}`;
            authorLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.stateManager.setContentSource({ type: 'user', username: metadata.author });
            });
            authorContainer.appendChild(authorLink);
        }
        else {
            if (metadata.subreddit)
                authorContainer.appendChild(document.createTextNode(' • '));
            authorContainer.appendChild(document.createTextNode('u/[deleted]'));
        }
        container.appendChild(authorContainer);
        return container;
    }
}
export class GalleryCarousel {
    constructor(galleryData, metadata) {
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
    render() { return this.container; }
    next() {
        if (this.currentIndex < this.galleryData.images.length - 1) {
            this.currentIndex++;
            this.updateDisplay();
            this.preloadNextImage();
        }
    }
    previous() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateDisplay();
            this.preloadNextImage();
        }
    }
    getCurrentIndex() { return this.currentIndex; }
    updateDisplay() {
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
    showLoadingSpinner() { this.loadingSpinner.style.display = 'flex'; }
    hideLoadingSpinner() { this.loadingSpinner.style.display = 'none'; }
    preloadNextImage() {
        if (this.currentIndex < this.galleryData.images.length - 1) {
            const preloadImage = new Image();
            preloadImage.src = this.galleryData.thumbnails[this.currentIndex + 1];
        }
    }
    handleImageLoadError() {
        this.hideLoadingSpinner();
        this.currentImage.style.display = 'none';
        let errorPlaceholder = this.imageContainer.querySelector('.image-error-placeholder');
        if (!errorPlaceholder) {
            errorPlaceholder = document.createElement('div');
            errorPlaceholder.className = 'image-error-placeholder';
            this.imageContainer.appendChild(errorPlaceholder);
        }
        errorPlaceholder.textContent = `Image ${this.currentIndex + 1} of ${this.galleryData.images.length} failed to load`;
        errorPlaceholder.style.display = 'flex';
    }
    openCurrentImageInNewTab() {
        window.open(this.galleryData.images[this.currentIndex], '_blank', 'noopener,noreferrer');
    }
}
export class VideoPlayer {
    constructor(videoData, metadata) {
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
        if (videoData.posterUrl)
            this.videoElement.poster = videoData.posterUrl;
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
    render() { return this.container; }
    pause() { if (!this.videoElement.paused)
        this.videoElement.pause(); }
    handleVideoLoadError() {
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
export class ExternalEmbedPlayer {
    constructor(embedUrl, externalUrl, previewUrl, metadata) {
        this.embedUrl = embedUrl;
        this.externalUrl = externalUrl;
        this.previewUrl = previewUrl;
        this.metadata = metadata;
        this.container = document.createElement('div');
        this.container.className = 'external-embed-player';
        this.renderPreview();
    }
    renderPreview() {
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
            window.open(this.externalUrl, '_blank', 'noopener,noreferrer');
        });
        this.container.appendChild(previewContainer);
    }
    renderIframe() {
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
    render() { return this.container; }
}
export class MediaGallery {
    constructor(stateManager) {
        this.videoPlayers = [];
        this.previousPostCount = 0;
        this.stateManager = stateManager;
        this.metadataDisplay = new MetadataDisplay(stateManager);
        this.virtualScroll = new VirtualScrollManager();
        this.container = document.createElement('div');
        this.container.className = 'media-gallery';
    }
    setLoadingIndicator(loadingIndicator) { this.loadingIndicatorElement = loadingIndicator; }
    render(posts, config) {
        const isAppending = posts.length > this.previousPostCount && this.previousPostCount > 0;
        if (isAppending) {
            const newPosts = posts.slice(this.previousPostCount);
            const filteredNewPosts = config.showVideos ? newPosts : newPosts.filter(post => {
                if (post.type === 'video' || post.type === 'external-embed')
                    return false;
                if (post.type === 'image' && (post.gifVideoUrl || post.url.toLowerCase().includes('.gif')))
                    return false;
                return true;
            });
            filteredNewPosts.forEach(post => {
                const mediaItem = this.createMediaItem(post, config);
                if (this.loadingIndicatorElement && this.container.contains(this.loadingIndicatorElement)) {
                    this.container.insertBefore(mediaItem, this.loadingIndicatorElement);
                }
                else {
                    this.container.appendChild(mediaItem);
                }
                this.virtualScroll.observe(mediaItem);
            });
            if (config.masonryLayout)
                this.applyMasonryLayout(config.columnCount);
            const totalItems = this.container.querySelectorAll('.media-item').length;
            if (totalItems > 20)
                this.virtualScroll.enable();
        }
        else {
            let anchorIndex = -1;
            let anchorOffsetFromTop = 0;
            const items = this.container.querySelectorAll('.media-item');
            const viewportTop = window.scrollY;
            const viewportMiddle = viewportTop + (window.innerHeight / 2);
            let closestDistance = Infinity;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const rect = item.getBoundingClientRect();
                const itemTop = rect.top + window.scrollY;
                const itemMiddle = itemTop + (rect.height / 2);
                const distance = Math.abs(itemMiddle - viewportMiddle);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    anchorIndex = i;
                    anchorOffsetFromTop = viewportTop - itemTop;
                }
            }
            this.clear();
            this.container.className = config.masonryLayout
                ? `media-gallery masonry-layout columns-${config.columnCount}`
                : `media-gallery columns-${config.columnCount}`;
            if (!config.masonryLayout) {
                this.container.style.position = '';
                this.container.style.height = '';
            }
            const filteredPosts = config.showVideos ? posts : posts.filter(post => {
                if (post.type === 'video' || post.type === 'external-embed')
                    return false;
                if (post.type === 'image' && (post.gifVideoUrl || post.url.toLowerCase().includes('.gif')))
                    return false;
                return true;
            });
            filteredPosts.forEach(post => {
                const mediaItem = this.createMediaItem(post, config);
                this.container.appendChild(mediaItem);
                this.virtualScroll.observe(mediaItem);
            });
            if (this.loadingIndicatorElement)
                this.container.appendChild(this.loadingIndicatorElement);
            if (config.masonryLayout)
                this.applyMasonryLayout(config.columnCount);
            if (anchorIndex >= 0) {
                requestAnimationFrame(() => {
                    const newItems = this.container.querySelectorAll('.media-item');
                    if (newItems[anchorIndex]) {
                        const anchorElement = newItems[anchorIndex];
                        const rect = anchorElement.getBoundingClientRect();
                        const absoluteTop = rect.top + window.scrollY;
                        const cappedOffset = Math.min(anchorOffsetFromTop, rect.height * 0.3);
                        window.scrollTo(0, absoluteTop + cappedOffset);
                    }
                });
            }
            if (filteredPosts.length > 20)
                this.virtualScroll.enable();
        }
        this.previousPostCount = posts.length;
    }
    applyMasonryLayout(columnCount) {
        const items = this.container.querySelectorAll('.media-item');
        if (items.length === 0)
            return;
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
        const reflow = () => { pending--; if (pending <= 0)
            requestAnimationFrame(() => this.reflowMasonry(columnCount)); };
        images.forEach(img => {
            if (!img.complete) {
                pending++;
                img.addEventListener('load', reflow, { once: true });
                img.addEventListener('error', reflow, { once: true });
            }
        });
    }
    reflowMasonry(columnCount) {
        const items = this.container.querySelectorAll('.media-item');
        if (items.length === 0)
            return;
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
    createMediaItem(post, config) {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'media-item';
        let mediaElement;
        if (post.type === 'image') {
            mediaElement = this.createImageElement(post);
        }
        else if (post.type === 'video') {
            const videoPlayer = new VideoPlayer(post.videoData, post.metadata);
            this.videoPlayers.push(videoPlayer);
            mediaElement = videoPlayer.render();
        }
        else if (post.type === 'external-embed') {
            const embedPlayer = new ExternalEmbedPlayer(post.embedUrl, post.externalUrl, post.previewUrl, post.metadata);
            mediaElement = embedPlayer.render();
        }
        else if (post.type === 'gallery') {
            if (config.expandGalleries) {
                mediaElement = this.createExpandedGallery(post);
            }
            else {
                const carousel = new GalleryCarousel(post.galleryData, post.metadata);
                mediaElement = carousel.render();
            }
        }
        else {
            mediaElement = document.createElement('div');
            mediaElement.textContent = 'Unknown media type';
        }
        itemContainer.appendChild(mediaElement);
        itemContainer.appendChild(this.metadataDisplay.render(post.metadata));
        return itemContainer;
    }
    createImageElement(post) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        if (post.width && post.height)
            imageContainer.style.aspectRatio = `${post.width} / ${post.height}`;
        const isGif = post.url.toLowerCase().includes('.gif');
        if (post.isExternalVideo) {
            const badge = document.createElement('div');
            badge.className = 'gif-badge';
            badge.textContent = 'LINK';
            badge.style.backgroundColor = 'rgba(0, 100, 200, 0.75)';
            imageContainer.appendChild(badge);
            const image = document.createElement('img');
            image.className = 'media-image';
            image.alt = post.metadata.title || 'External video';
            image.style.cursor = 'pointer';
            image.loading = 'lazy';
            image.addEventListener('click', () => window.open(post.externalUrl, '_blank', 'noopener,noreferrer'));
            image.addEventListener('error', () => this.handleImageLoadError(imageContainer, image));
            image.src = post.thumbnailUrl || post.url;
            imageContainer.appendChild(image);
        }
        else if (isGif && post.gifVideoUrl) {
            const video = document.createElement('video');
            video.className = 'media-image';
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.preload = 'none';
            video.poster = post.thumbnailUrl || post.url;
            video.style.cursor = 'pointer';
            video.src = post.gifVideoUrl;
            const gifBadge = document.createElement('div');
            gifBadge.className = 'gif-badge';
            gifBadge.textContent = 'GIF';
            imageContainer.appendChild(gifBadge);
            const playOverlay = document.createElement('div');
            playOverlay.className = 'gif-play-overlay';
            playOverlay.innerHTML = '▶';
            imageContainer.appendChild(playOverlay);
            let isPlaying = false;
            const togglePlay = () => {
                if (isPlaying) {
                    video.pause();
                    playOverlay.style.display = '';
                    gifBadge.style.display = '';
                    isPlaying = false;
                }
                else {
                    video.play().then(() => { playOverlay.style.display = 'none'; gifBadge.style.display = 'none'; isPlaying = true; }).catch(() => window.open(post.metadata.postURL, '_blank', 'noopener,noreferrer'));
                }
            };
            video.addEventListener('click', togglePlay);
            playOverlay.style.cursor = 'pointer';
            playOverlay.style.pointerEvents = 'auto';
            playOverlay.addEventListener('click', togglePlay);
            video.addEventListener('error', () => {
                const fallbackImg = document.createElement('img');
                fallbackImg.className = 'media-image';
                fallbackImg.alt = post.metadata.title || 'Reddit GIF';
                fallbackImg.style.cursor = 'pointer';
                fallbackImg.src = post.thumbnailUrl || post.url;
                fallbackImg.addEventListener('click', () => window.open(post.metadata.postURL, '_blank', 'noopener,noreferrer'));
                video.replaceWith(fallbackImg);
                playOverlay.style.display = 'none';
            });
            imageContainer.appendChild(video);
        }
        else if (isGif) {
            const image = document.createElement('img');
            image.className = 'media-image';
            image.alt = post.metadata.title || 'Reddit GIF';
            image.style.cursor = 'pointer';
            image.loading = 'lazy';
            const gifBadge = document.createElement('div');
            gifBadge.className = 'gif-badge';
            gifBadge.textContent = 'GIF';
            imageContainer.appendChild(gifBadge);
            image.addEventListener('click', () => window.open(post.metadata.postURL, '_blank', 'noopener,noreferrer'));
            image.addEventListener('error', () => this.handleImageLoadError(imageContainer, image));
            image.src = post.thumbnailUrl || post.url;
            imageContainer.appendChild(image);
        }
        else {
            const image = document.createElement('img');
            image.className = 'media-image';
            image.alt = post.metadata.title || 'Reddit image';
            image.style.cursor = 'pointer';
            image.loading = 'lazy';
            image.addEventListener('click', () => window.open(post.url, '_blank', 'noopener,noreferrer'));
            image.addEventListener('error', () => this.handleImageLoadError(imageContainer, image));
            image.src = post.thumbnailUrl || post.url;
            imageContainer.appendChild(image);
        }
        return imageContainer;
    }
    createExpandedGallery(post) {
        const galleryContainer = document.createElement('div');
        galleryContainer.className = 'expanded-gallery';
        post.galleryData.images.forEach((imageURL, index) => {
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'expanded-gallery-image-wrapper';
            const image = document.createElement('img');
            image.className = 'media-image expanded-gallery-image';
            image.alt = `${post.metadata.title || 'Gallery image'} - Image ${index + 1}`;
            image.style.cursor = 'pointer';
            image.loading = 'lazy';
            image.addEventListener('click', () => window.open(imageURL, '_blank', 'noopener,noreferrer'));
            image.addEventListener('error', () => this.handleImageLoadError(imageWrapper, image));
            image.src = imageURL;
            imageWrapper.appendChild(image);
            galleryContainer.appendChild(imageWrapper);
        });
        return galleryContainer;
    }
    handleImageLoadError(container, image) {
        image.style.display = 'none';
        const errorPlaceholder = document.createElement('div');
        errorPlaceholder.className = 'image-error-placeholder';
        const errorIcon = document.createElement('div');
        errorIcon.className = 'error-icon';
        errorIcon.textContent = '⚠️';
        errorPlaceholder.appendChild(errorIcon);
        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'Image failed to load';
        errorPlaceholder.appendChild(errorMessage);
        container.appendChild(errorPlaceholder);
    }
    pauseAllVideos() { this.videoPlayers.forEach(player => player.pause()); }
    clear() {
        this.pauseAllVideos();
        this.videoPlayers = [];
        this.virtualScroll.clear();
        this.virtualScroll.disable();
        this.container.innerHTML = '';
        this.previousPostCount = 0;
    }
    getElement() { return this.container; }
}
export class ErrorDisplay {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.container = document.createElement('div');
        this.container.className = 'error-display';
        this.container.style.display = 'none';
    }
    show(errorMessage, showRetry = true) {
        this.container.innerHTML = '';
        const errorIcon = document.createElement('div');
        errorIcon.className = 'error-icon-large';
        errorIcon.textContent = '⚠️';
        this.container.appendChild(errorIcon);
        const messageElement = document.createElement('p');
        messageElement.className = 'error-message-text';
        messageElement.textContent = errorMessage;
        this.container.appendChild(messageElement);
        if (showRetry) {
            const retryButton = document.createElement('button');
            retryButton.className = 'retry-button';
            retryButton.textContent = 'Retry';
            retryButton.addEventListener('click', () => this.handleRetry());
            this.container.appendChild(retryButton);
        }
        this.container.style.display = 'block';
    }
    hide() { this.container.style.display = 'none'; this.container.innerHTML = ''; }
    async handleRetry() { this.hide(); await this.stateManager.loadContent(); }
    getElement() { return this.container; }
}
