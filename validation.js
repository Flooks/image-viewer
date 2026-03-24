export function validateSubredditName(name) {
    if (!name || name.trim() === '') {
        return { valid: false, error: 'Please enter a subreddit name or username' };
    }
    const validPattern = /^[a-zA-Z0-9_]+(\+[a-zA-Z0-9_]+)*$/;
    if (!validPattern.test(name)) {
        return { valid: false, error: 'Subreddit names can only contain letters, numbers, and underscores. Use + to combine multiple (e.g. pics+art)' };
    }
    return { valid: true };
}
export function validateUsername(username) {
    if (!username || username.trim() === '') {
        return { valid: false, error: 'Please enter a subreddit name or username' };
    }
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(username)) {
        return { valid: false, error: 'Usernames can only contain letters, numbers, underscores, and hyphens' };
    }
    return { valid: true };
}
