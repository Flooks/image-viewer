import { URLRouter } from './router.js';
import { APIClient, ResponseParser } from './api.js';
import { InfiniteScrollManager } from './scroll.js';
import { StateManager, LoadingIndicator } from './state.js';
import { SearchInterface } from './search.js';
import { SortInterface, ColumnSelector, VideoToggle, GalleryExpandToggle, DarkModeToggle, LayoutToggle } from './controls.js';
import { MediaGallery, ErrorDisplay } from './media.js';
import { OAuthManager } from './auth.js';
/**
 * Auth UI component for login/logout button
 */
class AuthUI {
    constructor(oauthManager, onAuthChange) {
        this.oauthManager = oauthManager;
        this.onAuthChange = onAuthChange;
        this.element = document.createElement('div');
        this.element.className = 'auth-ui';
        this.render();
        // Listen for auth changes
        this.oauthManager.setOnAuthChange(() => {
            this.render();
            if (this.onAuthChange)
                this.onAuthChange();
        });
    }
    render() {
        this.element.replaceChildren();
        if (!this.oauthManager.isConfigured()) {
            this.element.appendChild(this.createStatus('⚠️ Setup Required', 'auth-not-configured', 'OAuth not configured - edit config.ts'));
            return;
        }
        if (this.oauthManager.isLoginInProgress()) {
            this.element.appendChild(this.createStatus('Log in using the Chrome window…', 'auth-pending'));
            return;
        }
        if (this.oauthManager.isAuthenticated()) {
            this.element.appendChild(this.createStatus('✓ Logged in', 'auth-logged-in'));
            this.element.appendChild(this.createButton('Logout', 'auth-logout', () => this.oauthManager.logout()));
            return;
        }
        const error = this.oauthManager.getLastError();
        if (error)
            this.element.appendChild(this.createStatus('Login failed', 'auth-not-configured', error));
        this.element.appendChild(this.createButton('Login with Reddit', 'auth-login', () => this.oauthManager.initiateLogin()));
    }
    createStatus(text, modifier, title) {
        const status = document.createElement('span');
        status.className = `auth-status ${modifier}`;
        status.textContent = text;
        if (title)
            status.title = title;
        return status;
    }
    createButton(text, modifier, onClick) {
        const button = document.createElement('button');
        button.className = `auth-button ${modifier}`;
        button.textContent = text;
        button.addEventListener('click', onClick);
        return button;
    }
    getElement() {
        return this.element;
    }
}
async function initializeApplication() {
    // Login state comes from the local server; wait for it so the first request uses the right API
    const oauthManager = new OAuthManager();
    await oauthManager.init();
    const apiClient = new APIClient();
    apiClient.setOAuthManager(oauthManager);
    const responseParser = new ResponseParser();
    const router = new URLRouter();
    const stateManager = new StateManager(apiClient, responseParser, router);
    // Auth UI
    let wasAuthenticated = oauthManager.isAuthenticated();
    const authUI = new AuthUI(oauthManager, () => {
        // Reload content after logging in
        const isAuthenticated = oauthManager.isAuthenticated();
        const loggedIn = isAuthenticated && !wasAuthenticated;
        wasAuthenticated = isAuthenticated;
        const initialSource = router.parseURL();
        if (initialSource && loggedIn) {
            stateManager.setContentSource(initialSource);
        }
    });
    const authContainer = document.getElementById('auth-container');
    if (authContainer)
        authContainer.appendChild(authUI.getElement());
    // Error display
    const errorDisplay = new ErrorDisplay(stateManager);
    stateManager.setErrorDisplay(errorDisplay);
    const errorContainer = document.getElementById('error-container');
    if (errorContainer)
        errorContainer.appendChild(errorDisplay.getElement());
    // Media gallery
    const mediaGallery = new MediaGallery(stateManager);
    stateManager.setMediaGallery(mediaGallery);
    const galleryContainer = document.getElementById('gallery-container');
    if (galleryContainer)
        galleryContainer.appendChild(mediaGallery.getElement());
    // Search
    const searchInterface = new SearchInterface(stateManager);
    const searchContainer = document.getElementById('search-container');
    if (searchContainer)
        searchContainer.appendChild(searchInterface.render());
    // Sort
    const sortInterface = new SortInterface(stateManager);
    const sortContainer = document.getElementById('sort-container');
    if (sortContainer)
        sortContainer.appendChild(sortInterface.render());
    // Column selector
    const columnSelector = new ColumnSelector(stateManager);
    const columnSelectorContainer = document.getElementById('column-selector-container');
    if (columnSelectorContainer)
        columnSelectorContainer.appendChild(columnSelector.render());
    // Toggles
    const videoToggle = new VideoToggle(stateManager);
    const videoToggleContainer = document.getElementById('video-toggle-container');
    if (videoToggleContainer)
        videoToggleContainer.appendChild(videoToggle.render());
    const galleryExpandToggle = new GalleryExpandToggle(stateManager);
    const galleryToggleContainer = document.getElementById('gallery-toggle-container');
    if (galleryToggleContainer)
        galleryToggleContainer.appendChild(galleryExpandToggle.render());
    // Dark mode toggle
    const darkModeToggle = new DarkModeToggle(stateManager);
    const darkModeContainer = document.getElementById('dark-mode-toggle-container');
    if (darkModeContainer)
        darkModeContainer.appendChild(darkModeToggle.render());
    if (stateManager.getState().darkMode)
        document.body.classList.add('dark-mode');
    // Layout toggle
    const layoutToggle = new LayoutToggle(stateManager);
    const layoutToggleContainer = document.getElementById('layout-toggle-container');
    if (layoutToggleContainer)
        layoutToggleContainer.appendChild(layoutToggle.render());
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
        videoToggle.updateFromState();
        galleryExpandToggle.updateFromState();
        const config = {
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
            }
            else {
                loadingContainer.style.display = 'none';
                if (state.mediaPosts.length > 0) {
                    infiniteScrollManager.setEnabled(true);
                    // If rendered content doesn't fill the viewport (e.g. videos hidden),
                    // trigger loading more immediately
                    requestAnimationFrame(() => infiniteScrollManager.checkAndLoadIfNeeded());
                }
            }
        }
    });
    // URL routing
    router.initialize();
    window.addEventListener('popstate', () => {
        const source = router.parseURL();
        if (source)
            stateManager.setContentSource(source);
    });
    const initialSource = router.parseURL();
    if (initialSource) {
        document.title = initialSource.type === 'subreddit' ? `r/${initialSource.name}` : `u/${initialSource.username}`;
        stateManager.setContentSource(initialSource);
    }
    else {
        document.title = 'Reddit Image Viewer';
    }
    // Sticky header
    let lastScrollY = window.scrollY;
    let ticking = false;
    const header = document.querySelector('header');
    const updateHeaderVisibility = () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY < lastScrollY || currentScrollY < 10)
            header?.classList.remove('header-hidden');
        else if (currentScrollY > 100)
            header?.classList.add('header-hidden');
        lastScrollY = currentScrollY;
        ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) {
        window.requestAnimationFrame(updateHeaderVisibility);
        ticking = true;
    } });
    // Keyboard navigation for gallery carousels
    document.addEventListener('keydown', (event) => {
        const target = event.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
            return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            const carousels = document.querySelectorAll('.gallery-carousel');
            if (carousels.length === 0)
                return;
            const viewportMiddle = window.innerHeight / 2;
            let closestCarousel = null;
            let closestDistance = Infinity;
            carousels.forEach(carousel => {
                const rect = carousel.getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < window.innerHeight) {
                    const distance = Math.abs(rect.top + rect.height / 2 - viewportMiddle);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestCarousel = carousel;
                    }
                }
            });
            if (closestCarousel) {
                const button = event.key === 'ArrowLeft'
                    ? closestCarousel.querySelector('.carousel-prev')
                    : closestCarousel.querySelector('.carousel-next');
                if (button && !button.disabled) {
                    button.click();
                    event.preventDefault();
                }
            }
        }
    });
}
// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initializeApplication());
    }
    else {
        initializeApplication();
    }
}
