import { validateSubredditName, validateUsername } from './validation.js';
export class DebounceManager {
    constructor() {
        this.timeoutId = null;
    }
    debounce(fn, delay = 300) {
        this.cancel();
        this.timeoutId = window.setTimeout(() => { fn(); this.timeoutId = null; }, delay);
    }
    cancel() {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
}
export class SuggestionAPIClient {
    constructor() {
        this.currentAbortController = null;
        this.isAndroid = window.location.hostname === 'appassets.androidplatform.net';
        this.corsProxy = this.isAndroid ? '' : 'https://corsproxy.io/?';
    }
    buildUrl(redditUrl) {
        if (this.isAndroid) {
            const parsed = new URL(redditUrl);
            return `https://appassets.androidplatform.net/reddit-api${parsed.pathname}${parsed.search}`;
        }
        return this.corsProxy + encodeURIComponent(redditUrl);
    }
    async fetchSubredditSuggestions(query, signal) {
        try {
            const redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&type=sr&limit=10`;
            const url = this.buildUrl(redditUrl);
            const response = await fetch(url, { method: 'GET', signal });
            if (!response.ok)
                return [];
            const data = await response.json();
            const suggestions = [];
            if (data.data && data.data.children) {
                for (const child of data.data.children) {
                    const subreddit = child.data;
                    suggestions.push({ name: subreddit.display_name || subreddit.title, type: 'subreddit', subscribers: subreddit.subscribers, iconUrl: subreddit.icon_img || subreddit.community_icon });
                }
            }
            return suggestions.slice(0, 10);
        }
        catch {
            return [];
        }
    }
    async fetchUsernameSuggestions(query, signal) {
        try {
            const redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&type=user&limit=10`;
            const url = this.buildUrl(redditUrl);
            const response = await fetch(url, { method: 'GET', signal });
            if (!response.ok)
                return [];
            const data = await response.json();
            const suggestions = [];
            if (data.data && data.data.children) {
                for (const child of data.data.children) {
                    const user = child.data;
                    suggestions.push({ name: user.name || user.title, type: 'user', iconUrl: user.icon_img });
                }
            }
            return suggestions.slice(0, 10);
        }
        catch {
            return [];
        }
    }
    cancelPendingRequests() {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
    }
}
export class TypeaheadDropdown {
    constructor() {
        this.state = { isVisible: false, suggestions: [], activeSuggestionIndex: -1, isLoading: false };
        this.container = document.createElement('div');
        this.container.className = 'typeahead-dropdown';
        this.container.style.display = 'none';
    }
    getElement() { return this.container; }
    show(suggestions) {
        this.state.suggestions = suggestions.slice(0, 10);
        this.state.isVisible = true;
        this.state.activeSuggestionIndex = -1;
        this.render();
        this.container.style.display = 'block';
        this.container.classList.add('visible');
    }
    hide() {
        this.state.isVisible = false;
        this.container.style.display = 'none';
        this.container.classList.remove('visible');
    }
    isVisible() { return this.state.isVisible; }
    clear() {
        this.state.suggestions = [];
        this.state.activeSuggestionIndex = -1;
        this.container.innerHTML = '';
    }
    getActiveSuggestion() {
        if (this.state.activeSuggestionIndex >= 0 && this.state.activeSuggestionIndex < this.state.suggestions.length) {
            return this.state.suggestions[this.state.activeSuggestionIndex];
        }
        return null;
    }
    setActiveSuggestion(index) {
        if (index < -1 || index >= this.state.suggestions.length)
            return;
        this.state.activeSuggestionIndex = index;
        this.updateActiveSuggestionStyling();
    }
    handleKeyboardNavigation(key) {
        switch (key) {
            case 'ArrowDown':
                if (this.state.activeSuggestionIndex < this.state.suggestions.length - 1)
                    this.setActiveSuggestion(this.state.activeSuggestionIndex + 1);
                break;
            case 'ArrowUp':
                if (this.state.activeSuggestionIndex > 0)
                    this.setActiveSuggestion(this.state.activeSuggestionIndex - 1);
                else if (this.state.activeSuggestionIndex === 0)
                    this.setActiveSuggestion(-1);
                break;
            case 'Escape':
                this.hide();
                break;
        }
    }
    setOnSuggestionClick(callback) { this.onSuggestionClick = callback; }
    render() {
        this.container.innerHTML = '';
        if (this.state.suggestions.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'typeahead-no-results';
            noResults.textContent = 'No results found';
            this.container.appendChild(noResults);
            return;
        }
        this.state.suggestions.forEach((suggestion, index) => {
            this.container.appendChild(this.createSuggestionElement(suggestion, index));
        });
    }
    createSuggestionElement(suggestion, index) {
        const element = document.createElement('div');
        element.className = 'typeahead-suggestion';
        element.dataset.index = index.toString();
        if (index === this.state.activeSuggestionIndex)
            element.classList.add('active');
        const nameElement = document.createElement('div');
        nameElement.className = 'typeahead-suggestion-name';
        nameElement.textContent = (suggestion.type === 'subreddit' ? 'r/' : 'u/') + suggestion.name;
        element.appendChild(nameElement);
        if (suggestion.subscribers !== undefined) {
            const metaElement = document.createElement('div');
            metaElement.className = 'typeahead-suggestion-meta';
            metaElement.textContent = this.formatSubscriberCount(suggestion.subscribers);
            element.appendChild(metaElement);
        }
        element.addEventListener('click', () => { if (this.onSuggestionClick)
            this.onSuggestionClick(suggestion); });
        element.addEventListener('mouseenter', () => { this.setActiveSuggestion(index); });
        return element;
    }
    updateActiveSuggestionStyling() {
        const suggestions = this.container.querySelectorAll('.typeahead-suggestion');
        suggestions.forEach(el => el.classList.remove('active'));
        if (this.state.activeSuggestionIndex >= 0) {
            const activeElement = this.container.querySelector(`.typeahead-suggestion[data-index="${this.state.activeSuggestionIndex}"]`);
            if (activeElement) {
                activeElement.classList.add('active');
                activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }
    formatSubscriberCount(count) {
        if (count >= 1000000)
            return `${(count / 1000000).toFixed(1)}M subscribers`;
        if (count >= 1000)
            return `${(count / 1000).toFixed(1)}K subscribers`;
        return `${count} subscribers`;
    }
}
export class SearchInterface {
    constructor(stateManager) {
        this.currentAbortController = null;
        this.stateManager = stateManager;
        this.typeaheadDropdown = new TypeaheadDropdown();
        this.debounceManager = new DebounceManager();
        this.suggestionAPIClient = new SuggestionAPIClient();
        this.container = document.createElement('div');
        this.container.className = 'search-interface';
        this.container.style.position = 'relative';
        const form = document.createElement('form');
        form.className = 'search-form';
        const sourceSelector = document.createElement('div');
        sourceSelector.className = 'source-selector';
        const sourceLabel = document.createElement('label');
        sourceLabel.textContent = 'Search for:';
        sourceSelector.appendChild(sourceLabel);
        const subredditLabel = document.createElement('label');
        subredditLabel.className = 'radio-label';
        this.subredditRadio = document.createElement('input');
        this.subredditRadio.type = 'radio';
        this.subredditRadio.name = 'source-type';
        this.subredditRadio.value = 'subreddit';
        this.subredditRadio.checked = true;
        subredditLabel.appendChild(this.subredditRadio);
        subredditLabel.appendChild(document.createTextNode(' Subreddit'));
        sourceSelector.appendChild(subredditLabel);
        const userLabel = document.createElement('label');
        userLabel.className = 'radio-label';
        this.userRadio = document.createElement('input');
        this.userRadio.type = 'radio';
        this.userRadio.name = 'source-type';
        this.userRadio.value = 'user';
        userLabel.appendChild(this.userRadio);
        userLabel.appendChild(document.createTextNode(' User'));
        sourceSelector.appendChild(userLabel);
        form.appendChild(sourceSelector);
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group';
        inputGroup.style.position = 'relative';
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.className = 'search-input';
        this.inputElement.placeholder = 'e.g. pics or pics+art+earthporn';
        inputGroup.appendChild(this.inputElement);
        inputGroup.appendChild(this.typeaheadDropdown.getElement());
        form.appendChild(inputGroup);
        this.errorElement = document.createElement('div');
        this.errorElement.className = 'error-message';
        this.errorElement.style.display = 'none';
        form.appendChild(this.errorElement);
        form.addEventListener('submit', (e) => { e.preventDefault(); this.handleSubmit(); });
        this.container.appendChild(form);
        this.setupTypeaheadListeners();
    }
    render() { return this.container; }
    getValue() { return this.inputElement.value.trim(); }
    getSourceType() { return this.subredditRadio.checked ? 'subreddit' : 'user'; }
    validate() {
        const value = this.getValue();
        return this.getSourceType() === 'subreddit' ? validateSubredditName(value) : validateUsername(value);
    }
    showError(message) { this.errorElement.textContent = message; this.errorElement.style.display = 'block'; }
    hideError() { this.errorElement.style.display = 'none'; this.errorElement.textContent = ''; }
    async handleSubmit() {
        this.hideError();
        const validationResult = this.validate();
        if (!validationResult.valid) {
            this.showError(validationResult.error || 'Invalid input');
            return;
        }
        const value = this.getValue();
        const sourceType = this.getSourceType();
        const contentSource = sourceType === 'subreddit' ? { type: 'subreddit', name: value } : { type: 'user', username: value };
        try {
            await this.stateManager.setContentSource(contentSource);
        }
        catch (error) {
            this.showError('An unexpected error occurred. Please try again.');
        }
    }
    setupTypeaheadListeners() {
        this.inputElement.addEventListener('input', () => this.handleInput());
        this.inputElement.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.subredditRadio.addEventListener('change', () => this.handleSourceChange());
        this.userRadio.addEventListener('change', () => this.handleSourceChange());
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        this.typeaheadDropdown.setOnSuggestionClick((suggestion) => this.selectSuggestion(suggestion));
    }
    handleInput() {
        const value = this.inputElement.value.trim();
        if (value.length < 2) {
            this.typeaheadDropdown.hide();
            return;
        }
        if (this.currentAbortController)
            this.currentAbortController.abort();
        this.debounceManager.debounce(async () => {
            this.currentAbortController = new AbortController();
            try {
                const sourceType = this.getSourceType();
                const suggestions = sourceType === 'subreddit'
                    ? await this.suggestionAPIClient.fetchSubredditSuggestions(value, this.currentAbortController.signal)
                    : await this.suggestionAPIClient.fetchUsernameSuggestions(value, this.currentAbortController.signal);
                if (suggestions.length > 0)
                    this.typeaheadDropdown.show(suggestions);
                else
                    this.typeaheadDropdown.hide();
            }
            catch (error) {
                if (error instanceof Error && error.name === 'AbortError')
                    return;
                this.typeaheadDropdown.hide();
            }
        }, 300);
    }
    handleKeyDown(event) {
        if (!this.typeaheadDropdown.isVisible())
            return;
        if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
            this.typeaheadDropdown.handleKeyboardNavigation(event.key);
            if (event.key === 'Enter') {
                const activeSuggestion = this.typeaheadDropdown.getActiveSuggestion();
                if (activeSuggestion)
                    this.selectSuggestion(activeSuggestion);
            }
            event.preventDefault();
        }
    }
    selectSuggestion(suggestion) {
        this.inputElement.value = suggestion.name;
        this.typeaheadDropdown.hide();
        this.handleSubmit();
    }
    handleOutsideClick(event) {
        if (!this.container.contains(event.target))
            this.typeaheadDropdown.hide();
    }
    handleSourceChange() {
        this.inputElement.value = '';
        this.typeaheadDropdown.hide();
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
    }
}
