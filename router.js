export class URLRouter {
    parseURL() {
        const hash = window.location.hash;
        if (!hash || hash === '#' || hash === '#/') {
            return null;
        }
        const path = hash.substring(1);
        const subredditMatch = path.match(/^\/r\/([^\/]+)\/?$/);
        if (subredditMatch) {
            return { type: 'subreddit', name: subredditMatch[1] };
        }
        const userMatch = path.match(/^\/u\/([^\/]+)\/?$/);
        if (userMatch) {
            return { type: 'user', username: userMatch[1] };
        }
        return null;
    }
    updateURL(source) {
        let path;
        let title;
        if (source.type === 'subreddit') {
            path = `#/r/${source.name}`;
            title = `r/${source.name}`;
        }
        else {
            path = `#/u/${source.username}`;
            title = `u/${source.username}`;
        }
        window.location.hash = path;
        document.title = title;
    }
    initialize() {
        window.addEventListener('hashchange', () => {
            const source = this.parseURL();
            console.log('Navigation detected:', source);
        });
    }
    navigateTo(source) {
        this.updateURL(source);
        console.log('Navigating to:', source);
    }
}
