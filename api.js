export class APIClient {
    constructor() {
        this.corsProxy = 'https://corsproxy.io/?';
    }
    async fetchSubreddit(subreddit, sortOrder, timespan, after) {
        let redditUrl = `https://www.reddit.com/r/${subreddit}/${sortOrder}.json`;
        const params = new URLSearchParams();
        if (timespan)
            params.append('t', timespan);
        if (after)
            params.append('after', after);
        const queryString = params.toString();
        if (queryString)
            redditUrl += `?${queryString}`;
        const url = this.corsProxy + encodeURIComponent(redditUrl);
        try {
            const response = await fetch(url, { method: 'GET' });
            if (!response.ok)
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            const data = await response.json();
            return { posts: data.data.children.map(child => child.data), after: data.data.after };
        }
        catch (error) {
            if (error instanceof Error)
                throw new Error(`Failed to fetch subreddit: ${error.message}`);
            throw error;
        }
    }
    async fetchUserPosts(username, sortOrder, timespan, after) {
        let redditUrl = `https://www.reddit.com/user/${username}/submitted.json`;
        const params = new URLSearchParams();
        params.append('sort', sortOrder);
        if (timespan)
            params.append('t', timespan);
        if (after)
            params.append('after', after);
        redditUrl += `?${params.toString()}`;
        const url = this.corsProxy + encodeURIComponent(redditUrl);
        try {
            const response = await fetch(url, { method: 'GET' });
            if (!response.ok)
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            const data = await response.json();
            return { posts: data.data.children.map(child => child.data), after: data.data.after };
        }
        catch (error) {
            if (error instanceof Error)
                throw new Error(`Failed to fetch user posts: ${error.message}`);
            throw error;
        }
    }
}
export class ResponseParser {
    parseResponse(response) {
        const mediaPosts = [];
        for (const child of response.data.children) {
            const postData = child.data;
            const metadata = {
                title: postData.title,
                author: postData.author,
                postURL: `https://www.reddit.com${postData.permalink}`,
                subreddit: postData.subreddit,
                createdDate: postData.created_utc
            };
            const galleryData = this.extractGalleryData(postData);
            if (galleryData) {
                mediaPosts.push({ type: 'gallery', galleryData, metadata });
                continue;
            }
            const videoData = this.extractVideoData(postData);
            if (videoData) {
                const previewUrl = postData.preview?.images?.[0]?.resolutions;
                if (previewUrl && previewUrl.length > 0) {
                    videoData.posterUrl = previewUrl[previewUrl.length - 1].url?.replace(/&amp;/g, '&');
                }
                else if (postData.preview?.images?.[0]?.source?.url) {
                    videoData.posterUrl = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
                }
                mediaPosts.push({ type: 'video', videoData, metadata });
                continue;
            }
            const embedUrl = this.extractExternalEmbed(postData);
            if (embedUrl) {
                const imageData = this.extractImageURL(postData);
                mediaPosts.push({ type: 'external-embed', embedUrl, externalUrl: postData.url, previewUrl: imageData?.url, metadata });
                continue;
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
    extractExternalEmbed(post) {
        if (post.domain?.includes('redgifs.com') && post.url) {
            const match = post.url.match(/redgifs\.com\/watch\/([a-zA-Z0-9]+)/i);
            if (match && match[1])
                return `https://redgifs.com/ifr/${match[1]}`;
        }
        return null;
    }
    extractImageURL(post) {
        if (post.is_video)
            return null;
        if (post.preview?.images?.[0]?.source?.url) {
            const fullSizeURL = post.preview.images[0].source.url.replace(/&amp;/g, '&');
            const sourceWidth = post.preview.images[0].source.width;
            const sourceHeight = post.preview.images[0].source.height;
            let thumbnailURL;
            const resolutions = post.preview.images[0].resolutions;
            if (resolutions && resolutions.length > 0) {
                const largestResolution = resolutions[resolutions.length - 1];
                if (largestResolution?.url)
                    thumbnailURL = largestResolution.url.replace(/&amp;/g, '&');
            }
            let gifVideoURL;
            const variants = post.preview.images[0].variants;
            if (variants?.mp4?.source?.url)
                gifVideoURL = variants.mp4.source.url.replace(/&amp;/g, '&');
            return { url: fullSizeURL, thumbnailUrl: thumbnailURL, gifVideoUrl: gifVideoURL, width: sourceWidth, height: sourceHeight };
        }
        if (post.post_hint === 'image' && this.isValidImageFormat(post.url))
            return { url: post.url };
        if (this.isValidImageFormat(post.url))
            return { url: post.url };
        return null;
    }
    extractVideoData(post) {
        if (post.is_video && post.media?.reddit_video) {
            const redditVideo = post.media.reddit_video;
            const source = post.preview?.images?.[0]?.source;
            return { url: redditVideo.fallback_url || redditVideo.hls_url, fallbackURL: redditVideo.fallback_url, width: source?.width, height: source?.height };
        }
        return null;
    }
    extractGalleryData(post) {
        if (!post.gallery_data || !post.media_metadata)
            return null;
        const images = [];
        const thumbnails = [];
        const dimensions = [];
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
                    if (largest.u)
                        thumbnailURL = largest.u.replace(/&amp;/g, '&');
                }
                thumbnails.push(thumbnailURL);
            }
        }
        if (images.length > 0)
            return { images, thumbnails, dimensions };
        return null;
    }
    isValidImageFormat(url) {
        const lowerURL = url.toLowerCase();
        return lowerURL.endsWith('.jpg') || lowerURL.endsWith('.jpeg') || lowerURL.endsWith('.png') || lowerURL.endsWith('.gif') || lowerURL.endsWith('.webp');
    }
}
export class RedgifsClient {
    async getVideoInfo(videoId) {
        const response = await fetch(`/api/redgifs/${videoId}`);
        if (!response.ok)
            throw new Error(`Redgifs API failed: ${response.status}`);
        return await response.json();
    }
}
