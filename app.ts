// Reddit Image Viewer - Main Entry Point
import { GalleryConfig } from './types.js';
import { URLRouter } from './router.js';
import { APIClient, ResponseParser } from './api.js';
import { InfiniteScrollManager } from './scroll.js';
import { StateManager, LoadingIndicator } from './state.js';
import { SearchInterface } from './search.js';
import { SortInterface, ColumnSelector, VideoToggle, GalleryExpandToggle, DarkModeToggle, LayoutToggle } from './controls.js';
import { MediaGallery, ErrorDisplay } from './media.js';

function initializeApplication(): void {
  const apiClient = new APIClient();
  const responseParser = new ResponseParser();
  const router = new URLRouter();
  const stateManager = new StateManager(apiClient, responseParser, router);

  // Error display
  const errorDisplay = new ErrorDisplay(stateManager);
  stateManager.setErrorDisplay(errorDisplay);
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) errorContainer.appendChild(errorDisplay.getElement());

  // Media gallery
  const mediaGallery = new MediaGallery(stateManager);
  stateManager.setMediaGallery(mediaGallery);
  const galleryContainer = document.getElementById('gallery-container');
  if (galleryContainer) galleryContainer.appendChild(mediaGallery.getElement());

  // Search
  const searchInterface = new SearchInterface(stateManager);
  const searchContainer = document.getElementById('search-container');
  if (searchContainer) searchContainer.appendChild(searchInterface.render());

  // Sort
  const sortInterface = new SortInterface(stateManager);
  const sortContainer = document.getElementById('sort-container');
  if (sortContainer) sortContainer.appendChild(sortInterface.render());

  // Column selector
  const columnSelector = new ColumnSelector(stateManager);
  const columnSelectorContainer = document.getElementById('column-selector-container');
  if (columnSelectorContainer) columnSelectorContainer.appendChild(columnSelector.render());

  // Toggles
  const videoToggle = new VideoToggle(stateManager);
  const videoToggleContainer = document.getElementById('video-toggle-container');
  if (videoToggleContainer) videoToggleContainer.appendChild(videoToggle.render());

  const galleryExpandToggle = new GalleryExpandToggle(stateManager);
  const galleryToggleContainer = document.getElementById('gallery-toggle-container');
  if (galleryToggleContainer) galleryToggleContainer.appendChild(galleryExpandToggle.render());

  const darkModeToggle = new DarkModeToggle(stateManager);
  const darkModeContainer = document.getElementById('dark-mode-toggle-container');
  if (darkModeContainer) darkModeContainer.appendChild(darkModeToggle.render());
  if (stateManager.getState().darkMode) document.body.classList.add('dark-mode');

  const layoutToggle = new LayoutToggle(stateManager);
  const layoutToggleContainer = document.getElementById('layout-toggle-container');
  if (layoutToggleContainer) layoutToggleContainer.appendChild(layoutToggle.render());

  // Infinite scroll
  const loadingIndicator = new LoadingIndicator();
  stateManager.setLoadingIndicator(loadingIndicator);
  mediaGallery.setLoadingIndicator(loadingIndicator.getElement());
  const infiniteScrollManager = new InfiniteScrollManager();
  infiniteScrollManager.initialize(() => stateManager.loadMoreContent());
  infiniteScrollManager.setEnabled(false);

  // State change listener
  stateManager.setOnStateChange(() => {
    const state = stateManager.getState();
    sortInterface.updateFromState();
    columnSelector.updateFromState();
    videoToggle.updateFromState();
    galleryExpandToggle.updateFromState();
    darkModeToggle.updateFromState();
    layoutToggle.updateFromState();

    const config: GalleryConfig = {
      columnCount: state.columnCount, showVideos: state.showVideos,
      expandGalleries: state.expandGalleries, masonryLayout: state.masonryLayout
    };
    mediaGallery.render(state.mediaPosts, config);

    const loadingContainer = document.getElementById('loading-container');
    if (loadingContainer) {
      if (state.isLoading) {
        loadingContainer.textContent = 'Loading...';
        loadingContainer.style.display = 'block';
        infiniteScrollManager.setEnabled(false);
      } else {
        loadingContainer.style.display = 'none';
        if (state.mediaPosts.length > 0) infiniteScrollManager.setEnabled(true);
      }
    }
  });

  // URL routing
  router.initialize();
  window.addEventListener('popstate', () => {
    const source = router.parseURL();
    if (source) stateManager.setContentSource(source);
  });

  const initialSource = router.parseURL();
  if (initialSource) {
    document.title = initialSource.type === 'subreddit' ? `r/${initialSource.name}` : `u/${initialSource.username}`;
    stateManager.setContentSource(initialSource);
  } else {
    document.title = 'Reddit Image Viewer';
  }

  // Sticky header
  let lastScrollY = window.scrollY;
  let ticking = false;
  const header = document.querySelector('header');
  const updateHeaderVisibility = () => {
    const currentScrollY = window.scrollY;
    if (currentScrollY < lastScrollY || currentScrollY < 10) header?.classList.remove('header-hidden');
    else if (currentScrollY > 100) header?.classList.add('header-hidden');
    lastScrollY = currentScrollY;
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { window.requestAnimationFrame(updateHeaderVisibility); ticking = true; } });

  // Keyboard navigation for gallery carousels
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const carousels = document.querySelectorAll('.gallery-carousel');
      if (carousels.length === 0) return;
      const viewportMiddle = window.innerHeight / 2;
      let closestCarousel: Element | null = null;
      let closestDistance = Infinity;
      carousels.forEach(carousel => {
        const rect = carousel.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          const distance = Math.abs(rect.top + rect.height / 2 - viewportMiddle);
          if (distance < closestDistance) { closestDistance = distance; closestCarousel = carousel; }
        }
      });
      if (closestCarousel) {
        const button = event.key === 'ArrowLeft'
          ? (closestCarousel as HTMLElement).querySelector('.carousel-prev') as HTMLButtonElement
          : (closestCarousel as HTMLElement).querySelector('.carousel-next') as HTMLButtonElement;
        if (button && !button.disabled) { button.click(); event.preventDefault(); }
      }
    }
  });
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeApplication());
  } else {
    initializeApplication();
  }
}
