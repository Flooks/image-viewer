// Quick validation test to verify the implementation
import { validateSubredditName, validateUsername } from './app';
console.log('Testing validateSubredditName:');
// Test valid subreddit names
console.log('Valid: "pics"', validateSubredditName('pics'));
console.log('Valid: "funny_memes"', validateSubredditName('funny_memes'));
console.log('Valid: "test123"', validateSubredditName('test123'));
// Test invalid subreddit names
console.log('Invalid: ""', validateSubredditName(''));
console.log('Invalid: "   "', validateSubredditName('   '));
console.log('Invalid: "test-name"', validateSubredditName('test-name'));
console.log('Invalid: "test name"', validateSubredditName('test name'));
console.log('Invalid: "test@name"', validateSubredditName('test@name'));
console.log('\nTesting validateUsername:');
// Test valid usernames
console.log('Valid: "john_doe"', validateUsername('john_doe'));
console.log('Valid: "user-123"', validateUsername('user-123'));
console.log('Valid: "test_user-name"', validateUsername('test_user-name'));
// Test invalid usernames
console.log('Invalid: ""', validateUsername(''));
console.log('Invalid: "   "', validateUsername('   '));
console.log('Invalid: "user name"', validateUsername('user name'));
console.log('Invalid: "user@name"', validateUsername('user@name'));
