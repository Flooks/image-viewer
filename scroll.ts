export class InfiniteScrollManager {
  private enabled: boolean = false;
  private onLoadMore: (() => Promise<void>) | null = null;
  private scrollThreshold: number = 1500;
  private isThrottled: boolean = false;
  private throttleDelay: number = 200;
  
  initialize(onLoadMore: () => Promise<void>): void {
    this.onLoadMore = onLoadMore;
    this.enabled = true;
    window.addEventListener('scroll', this.handleScroll);
    window.addEventListener('resize', this.handleScroll);
  }

  checkAndLoadIfNeeded(): void {
    if (!this.enabled || !this.onLoadMore) return;
    if (this.checkScrollPosition()) this.onLoadMore();
  }
  
  private handleScroll = (): void => {
    if (!this.enabled || this.isThrottled) return;
    this.isThrottled = true;
    setTimeout(() => { this.isThrottled = false; }, this.throttleDelay);
    if (this.checkScrollPosition() && this.onLoadMore) this.onLoadMore();
  };
  
  checkScrollPosition(): boolean {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    return (documentHeight - (scrollTop + windowHeight)) <= this.scrollThreshold;
  }
  
  setEnabled(enabled: boolean): void { this.enabled = enabled; }
  
  destroy(): void {
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleScroll);
    this.enabled = false;
    this.onLoadMore = null;
  }
}

export class VirtualScrollManager {
  private observer: IntersectionObserver;
  private unloadedItems: Map<HTMLElement, { height: number; children: Node[] }> = new Map();
  private enabled: boolean = false;

  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      { rootMargin: '2000px 0px' }
    );
  }

  enable(): void { this.enabled = true; }

  disable(): void {
    this.enabled = false;
    this.restoreAll();
  }

  observe(item: HTMLElement): void { this.observer.observe(item); }

  clear(): void {
    this.observer.disconnect();
    this.unloadedItems.clear();
  }

  private restoreAll(): void {
    this.unloadedItems.forEach((data, item) => {
      data.children.forEach(child => item.appendChild(child));
      item.style.minHeight = '';
      item.classList.remove('vs-placeholder');
    });
    this.unloadedItems.clear();
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    if (!this.enabled) return;

    for (const entry of entries) {
      const item = entry.target as HTMLElement;

      if (entry.isIntersecting) {
        const saved = this.unloadedItems.get(item);
        if (saved) {
          saved.children.forEach(child => item.appendChild(child));
          item.style.minHeight = '';
          item.classList.remove('vs-placeholder');
          this.unloadedItems.delete(item);
        }
      } else {
        if (!this.unloadedItems.has(item) && item.children.length > 0) {
          const height = item.offsetHeight;
          if (height > 0) {
            const videos = item.querySelectorAll('video');
            videos.forEach(v => v.pause());
            const children: Node[] = [];
            while (item.firstChild) { children.push(item.removeChild(item.firstChild)); }
            this.unloadedItems.set(item, { height, children });
            item.style.minHeight = `${height}px`;
            item.classList.add('vs-placeholder');
          }
        }
      }
    }
  }
}
