export class InfiniteScrollManager {
    constructor() {
        this.enabled = false;
        this.onLoadMore = null;
        this.scrollThreshold = 1500;
        this.isThrottled = false;
        this.throttleDelay = 200;
        this.handleScroll = () => {
            if (!this.enabled || this.isThrottled)
                return;
            this.isThrottled = true;
            setTimeout(() => { this.isThrottled = false; }, this.throttleDelay);
            if (this.checkScrollPosition() && this.onLoadMore)
                this.onLoadMore();
        };
    }
    initialize(onLoadMore) {
        this.onLoadMore = onLoadMore;
        this.enabled = true;
        window.addEventListener('scroll', this.handleScroll);
        window.addEventListener('resize', this.handleScroll);
    }
    checkScrollPosition() {
        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        return (documentHeight - (scrollTop + windowHeight)) <= this.scrollThreshold;
    }
    setEnabled(enabled) { this.enabled = enabled; }
    destroy() {
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleScroll);
        this.enabled = false;
        this.onLoadMore = null;
    }
}
export class VirtualScrollManager {
    constructor() {
        this.unloadedItems = new Map();
        this.enabled = false;
        this.observer = new IntersectionObserver((entries) => this.handleIntersection(entries), { rootMargin: '2000px 0px' });
    }
    enable() { this.enabled = true; }
    disable() {
        this.enabled = false;
        this.restoreAll();
    }
    observe(item) { this.observer.observe(item); }
    clear() {
        this.observer.disconnect();
        this.unloadedItems.clear();
    }
    restoreAll() {
        this.unloadedItems.forEach((data, item) => {
            data.children.forEach(child => item.appendChild(child));
            item.style.minHeight = '';
            item.classList.remove('vs-placeholder');
        });
        this.unloadedItems.clear();
    }
    handleIntersection(entries) {
        if (!this.enabled)
            return;
        for (const entry of entries) {
            const item = entry.target;
            if (entry.isIntersecting) {
                const saved = this.unloadedItems.get(item);
                if (saved) {
                    saved.children.forEach(child => item.appendChild(child));
                    item.style.minHeight = '';
                    item.classList.remove('vs-placeholder');
                    this.unloadedItems.delete(item);
                }
            }
            else {
                if (!this.unloadedItems.has(item) && item.children.length > 0) {
                    const height = item.offsetHeight;
                    if (height > 0) {
                        const videos = item.querySelectorAll('video');
                        videos.forEach(v => v.pause());
                        const children = [];
                        while (item.firstChild) {
                            children.push(item.removeChild(item.firstChild));
                        }
                        this.unloadedItems.set(item, { height, children });
                        item.style.minHeight = `${height}px`;
                        item.classList.add('vs-placeholder');
                    }
                }
            }
        }
    }
}
