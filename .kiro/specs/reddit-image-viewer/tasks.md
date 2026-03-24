# Implementation Plan: Reddit Image Viewer

## Overview

This implementation plan breaks down the Reddit Image Viewer feature into discrete coding tasks. The application is a client-side TypeScript/JavaScript web application that uses Reddit's public JSON API to display images and videos from subreddits and user profiles. The implementation follows a single-page application architecture with client-side routing.

## Tasks

- [x] 1. Set up project structure and core types
  - Create HTML file with basic structure and container elements
  - Create TypeScript/JavaScript file for application code
  - Define core TypeScript interfaces: ContentSource, MediaPost, ApplicationState, PostMetadata, VideoData, GalleryData
  - Set up basic CSS for layout and styling
  - _Requirements: 5.1, 5.2_

- [x] 2. Implement URL Router
  - [x] 2.1 Create URLRouter class with parseURL and updateURL methods
    - Implement URL pattern parsing for `/r/{subreddit}` and `/u/{username}`
    - Implement URL generation from ContentSource objects
    - Handle root URL case (no content source)
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.8, 19.9_
  
  - [ ]* 2.2 Write property test for URL routing round-trip
    - **Property 43: Subreddit URL pattern generation**
    - **Property 44: User profile URL pattern generation**
    - **Property 45: Subreddit URL parsing extracts content source**
    - **Property 46: User profile URL parsing extracts content source**
    - **Property 49: URL encoding preserves subreddit and username**
    - **Validates: Requirements 19.1, 19.2, 19.3, 19.4, 19.9**
  
  - [x] 2.3 Implement browser history integration
    - Add history.pushState calls when content source changes
    - Set up popstate event listener for back/forward navigation
    - Initialize router on page load
    - _Requirements: 19.5, 19.6, 19.7_
  
  - [ ]* 2.4 Write unit tests for URL router edge cases
    - Test malformed URLs
    - Test special characters in subreddit/username
    - Test empty path segments
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

- [x] 3. Implement input validation
  - [x] 3.1 Create validation functions for subreddit names and usernames
    - Implement validateSubredditName (alphanumeric and underscore)
    - Implement validateUsername (alphanumeric, underscore, and hyphen)
    - Implement empty input validation
    - Return ValidationResult with valid flag and error message
    - _Requirements: 1.3, 1.4, 1.5, 1.6_
  
  - [ ]* 3.2 Write property tests for input validation
    - **Property 1: Subreddit name validation accepts valid characters**
    - **Property 2: Username validation accepts valid characters**
    - **Validates: Requirements 1.3, 1.4**
  
  - [ ]* 3.3 Write unit tests for validation error cases
    - Test empty input returns error
    - Test invalid characters for subreddit
    - Test invalid characters for username
    - _Requirements: 1.5, 1.6_

- [x] 4. Implement API Client
  - [x] 4.1 Create APIClient class with fetch methods
    - Implement fetchSubreddit method with sort order and timespan parameters
    - Implement fetchUserPosts method with sort order and timespan parameters
    - Construct correct Reddit API URLs for both endpoints
    - Add User-Agent header to all requests
    - Handle fetch errors and HTTP error status codes
    - _Requirements: 2.1, 2.2, 9.1, 9.2, 9.3, 9.5_
  
  - [ ]* 4.2 Write property tests for API URL construction
    - **Property 3: Subreddit API requests use correct endpoint format**
    - **Property 4: User profile API requests use correct endpoint format**
    - **Property 17: API requests include required headers**
    - **Validates: Requirements 2.1, 2.2, 9.1, 9.2**
  
  - [ ]* 4.3 Write unit tests for API error handling
    - Test 404 response handling
    - Test 429 rate limit response
    - Test 503 service unavailable
    - Test network errors
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Implement Response Parser
  - [x] 5.1 Create ResponseParser class to extract media from Reddit API responses
    - Implement parseResponse to iterate through Reddit post children
    - Implement extractImageURL to identify image posts
    - Implement extractVideoData to identify video posts with Reddit video data
    - Implement extractGalleryData to identify gallery posts with multiple images
    - Filter posts to include only those with valid media
    - Support JPEG, PNG, GIF, and WEBP image formats
    - Extract PostMetadata (title, author, postURL) for each media post
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 9.3, 9.4_
  
  - [ ]* 5.2 Write property tests for response parsing
    - **Property 5: Response parser extracts all media post types**
    - **Property 6: Media filtering includes only posts with valid media**
    - **Property 7: Image format recognition supports common formats**
    - **Property 8: Video post identification detects Reddit video data**
    - **Property 9: Gallery post identification detects gallery data**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7**
  
  - [ ]* 5.3 Write unit tests for parsing edge cases
    - Test posts with missing metadata
    - Test posts with malformed URLs
    - Test empty response
    - Test response with no media posts
    - _Requirements: 2.3, 2.4, 6.1, 6.2_

- [x] 6. Checkpoint - Ensure core data layer works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement State Manager
  - [x] 7.1 Create StateManager class to manage application state
    - Initialize state with default values (hot sort, day timespan, 5 columns, show videos, carousel mode)
    - Implement setter methods for all state properties
    - Implement loadContent method to orchestrate API fetch and parsing
    - Handle loading and error states
    - Trigger UI updates when state changes
    - _Requirements: 7.3, 8.4, 11.4, 13.2, 15.3_
  
  - [ ]* 7.2 Write unit tests for state management
    - Test default state initialization
    - Test state updates trigger appropriate actions
    - Test error state handling
    - Test loading state transitions
    - _Requirements: 7.3, 8.4, 11.4, 13.2, 15.3_

- [x] 8. Implement Session Storage
  - [x] 8.1 Create session storage utilities
    - Implement savePreferences to store columnCount, showVideos, expandGalleries
    - Implement loadPreferences to retrieve stored preferences
    - Integrate with StateManager to persist and restore preferences
    - _Requirements: 11.6, 13.6, 16.5_
  
  - [ ]* 8.2 Write property tests for session storage persistence
    - **Property 23: Video toggle preference persists in session**
    - **Property 29: Gallery expand toggle preference persists in session**
    - **Property 36: Column count preference persists in session**
    - **Validates: Requirements 11.6, 13.6, 16.5**

- [x] 9. Implement Search Interface
  - [x] 9.1 Create SearchInterface component
    - Render text input field for subreddit/username entry
    - Render source selector (radio buttons or toggle) for subreddit vs user mode
    - Implement getValue and getSourceType methods
    - Integrate validation and display error messages
    - Handle form submission to trigger content loading
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  
  - [ ]* 9.2 Write unit tests for search interface
    - Test input field renders correctly
    - Test source selector switches modes
    - Test validation error display
    - Test form submission with valid input
    - Test form submission with invalid input
    - _Requirements: 1.1, 1.2, 1.5, 1.6_

- [x] 9a. Implement Typeahead Dropdown Component
  - [x] 9a.1 Create TypeaheadDropdown class with suggestion display
    - Implement show(suggestions) method to display up to 10 suggestions
    - Implement hide() method to hide the dropdown
    - Implement isVisible() method to check visibility state
    - Implement clear() method to remove all suggestions
    - Render suggestions with name and optional metadata (subscriber count for subreddits)
    - Position dropdown absolutely below the search input
    - Add CSS styling for dropdown container, suggestions, hover states, and active states
    - _Requirements: 1.1.1, 1.1.2, 1.1.5, 1.1.14_
  
  - [x] 9a.2 Implement keyboard navigation support
    - Implement setActiveSuggestion(index) method to highlight a suggestion
    - Implement getActiveSuggestion() method to return the currently highlighted suggestion
    - Implement handleKeyboardNavigation(key) method for ArrowUp, ArrowDown, Enter, Escape
    - Update active suggestion styling on keyboard navigation
    - _Requirements: 1.1.8_
  
  - [ ]* 9a.3 Write unit tests for TypeaheadDropdown
    - Test show() displays suggestions correctly
    - Test hide() removes dropdown from view
    - Test keyboard navigation updates active suggestion
    - Test suggestion rendering with metadata
    - _Requirements: 1.1.1, 1.1.2, 1.1.5, 1.1.14_

- [x] 9b. Implement Debounce Manager Utility
  - [x] 9b.1 Create DebounceManager class with timer-based debouncing
    - Implement debounce(fn, delay) method that schedules function execution
    - Cancel previous timer when debounce is called again
    - Implement cancel() method to clear pending timers
    - Use 300ms as the debounce delay
    - _Requirements: 1.1.3_
  
  - [ ]* 9b.2 Write property test for debounce timing
    - **Property 52: Debounced API request timing**
    - **Validates: Requirements 1.1.3, 1.1.4**
  
  - [ ]* 9b.3 Write unit tests for debounce edge cases
    - Test rapid successive calls cancel previous timers
    - Test cancel() prevents scheduled function from executing
    - Test function executes exactly once after delay
    - _Requirements: 1.1.3_

- [x] 9c. Implement Suggestion API Client
  - [x] 9c.1 Create SuggestionAPIClient class with Reddit API integration
    - Implement fetchSubredditSuggestions(query, signal?) method using Reddit search API
    - Implement fetchUsernameSuggestions(query, signal?) method using Reddit search API
    - Use AbortSignal parameter to support request cancellation
    - Parse API responses to extract SearchSuggestion objects (name, type, subscribers, iconUrl)
    - Handle API errors by returning empty array (fail silently)
    - Limit results to 10 suggestions maximum
    - API endpoint for subreddits: `https://www.reddit.com/search.json?q={query}&type=sr&limit=10`
    - API endpoint for users: `https://www.reddit.com/search.json?q={query}&type=user&limit=10`
    - _Requirements: 1.1.2, 1.1.4, 1.1.5, 1.1.12, 1.1.13_
  
  - [ ]* 9c.2 Write property tests for suggestion API client
    - **Property 51: Typeahead suggestions match API response**
    - **Property 58: API failures hide dropdown without error display**
    - **Property 59: New requests cancel pending requests**
    - **Validates: Requirements 1.1.2, 1.1.5, 1.1.12, 1.1.13**
  
  - [ ]* 9c.3 Write unit tests for API client error handling
    - Test AbortSignal cancels in-flight requests
    - Test network errors return empty array
    - Test malformed API responses return empty array
    - _Requirements: 1.1.12, 1.1.13_

- [x] 9d. Integrate Typeahead with SearchInterface
  - [x] 9d.1 Extend SearchInterface to include typeahead functionality
    - Add TypeaheadDropdown, DebounceManager, and SuggestionAPIClient as private properties
    - Add currentAbortController property to track active requests
    - Implement handleInput() method to process typing events with debouncing
    - Implement handleKeyDown() method to handle keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
    - Implement selectSuggestion() method to populate input and load content
    - Implement handleOutsideClick() method to hide dropdown when clicking outside
    - Implement handleSourceChange() method to clear dropdown and input when mode changes
    - Hide dropdown when input is empty or has fewer than 2 characters
    - Cancel pending requests when new input is received
    - Attach event listeners for input, keydown, source selector change, and document click
    - _Requirements: 1.1.1, 1.1.3, 1.1.4, 1.1.6, 1.1.7, 1.1.8, 1.1.9, 1.1.10, 1.1.11, 1.1.13, 1.1.15_
  
  - [ ]* 9d.2 Write property tests for typeahead integration
    - **Property 50: Typeahead dropdown displays on user input**
    - **Property 53: Suggestion selection populates input and loads content**
    - **Property 54: Dropdown hides on outside click**
    - **Property 55: Dropdown hides on Escape key**
    - **Property 56: Dropdown hidden when input is empty**
    - **Property 57: Minimum character threshold prevents API requests**
    - **Property 60: Source mode change clears dropdown and input**
    - **Validates: Requirements 1.1.1, 1.1.6, 1.1.7, 1.1.8, 1.1.9, 1.1.10, 1.1.11, 1.1.15**
  
  - [ ]* 9d.3 Write integration tests for complete typeahead workflow
    - Test typing → debounce → API request → display suggestions flow
    - Test rapid typing cancels previous requests
    - Test keyboard navigation → Enter selects suggestion → loads content
    - Test clicking suggestion → populates input → loads content
    - Test source mode change clears typeahead state
    - _Requirements: 1.1.1, 1.1.3, 1.1.4, 1.1.6, 1.1.9, 1.1.13, 1.1.15_

- [ ] 9e. Checkpoint - Ensure typeahead feature works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Sort Interface
  - [x] 10.1 Create SortInterface component
    - Render dropdown or radio buttons for sort order selection (hot, new, top, best, rising, controversial)
    - Render timespan dropdown (hour, day, week, month, year, all)
    - Implement updateTimespanVisibility to show/hide timespan based on sort order
    - Integrate with StateManager to update sort configuration
    - _Requirements: 7.1, 7.2, 7.4, 8.1, 8.2, 8.3, 8.5_
  
  - [ ]* 10.2 Write property tests for sort interface behavior
    - **Property 12: Sort order selection updates API request parameters**
    - **Property 13: Sort interface provides consistent options across content types**
    - **Property 14: Timespan visibility depends on sort order**
    - **Property 15: Timespan selection updates API request parameters**
    - **Property 16: Timespan options consistent across content types**
    - **Validates: Requirements 7.2, 7.4, 7.5, 8.1, 8.3, 8.5, 8.6**
  
  - [ ]* 10.3 Write unit tests for sort interface
    - Test all sort options render
    - Test timespan shows only for top/controversial
    - Test default sort order is hot
    - Test default timespan is day
    - _Requirements: 7.1, 7.3, 8.1, 8.2, 8.4_

- [x] 11. Implement Column Selector
  - [x] 11.1 Create ColumnSelector component
    - Render dropdown with options 1-6
    - Display current column count
    - Integrate with StateManager to update column configuration
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  
  - [ ]* 11.2 Write property tests for column selector
    - **Property 33: Column selector updates grid configuration**
    - **Property 34: Column selector displays current column count**
    - **Property 35: Column count changes trigger immediate re-render**
    - **Validates: Requirements 16.2, 16.3, 16.4**

- [x] 12. Implement Video Toggle Control
  - [x] 12.1 Create VideoToggle component
    - Render checkbox or toggle switch for show/hide videos
    - Integrate with StateManager to update showVideos state
    - Default to showing videos
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ]* 12.2 Write property tests for video toggle
    - **Property 20: Video toggle filters displayed content**
    - **Property 21: Video toggle shows all content when enabled**
    - **Property 22: Video toggle state updates gallery immediately**
    - **Validates: Requirements 11.2, 11.3, 11.5**

- [x] 13. Implement Gallery Expand Toggle
  - [x] 13.1 Create GalleryExpandToggle component
    - Render checkbox or toggle switch for carousel vs expanded mode
    - Integrate with StateManager to update expandGalleries state
    - Default to carousel mode
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ]* 13.2 Write property tests for gallery expand toggle
    - **Property 27: Gallery expand toggle controls display mode**
    - **Property 28: Gallery expand toggle state updates gallery immediately**
    - **Validates: Requirements 13.3, 13.4, 13.5**

- [x] 14. Checkpoint - Ensure all UI controls work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement Metadata Display
  - [x] 15.1 Create MetadataDisplay component
    - Render post title as clickable link with target="_blank"
    - Render author username prefixed with "u/" as clickable link
    - Handle author link clicks to navigate to user profile within app
    - Style links to be visually distinguishable
    - Handle missing metadata gracefully
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_
  
  - [ ]* 15.2 Write property tests for metadata display
    - **Property 37: Metadata display renders for all media items**
    - **Property 38: Post title rendered as clickable link**
    - **Property 39: Author username rendered as formatted link**
    - **Property 40: Author link navigation loads user profile**
    - **Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6**
  
  - [ ]* 15.3 Write unit tests for metadata edge cases
    - Test missing title
    - Test missing author
    - Test missing post URL
    - _Requirements: 17.8_

- [x] 16. Implement Gallery Carousel
  - [x] 16.1 Create GalleryCarousel component
    - Render first image by default
    - Render previous and next navigation buttons
    - Implement next() and previous() methods to change current image index
    - Disable/hide previous button on first image
    - Disable/hide next button on last image
    - Display image position indicator (e.g., "2 of 5")
    - Preload next image for smooth navigation
    - Handle image load failures with placeholder
    - Make images clickable to open in new tab
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 14.1, 14.2, 14.4, 14.5, 18.3_
  
  - [ ]* 16.2 Write property tests for carousel navigation
    - **Property 24: Gallery carousel displays first image by default**
    - **Property 25: Carousel next navigation advances image index**
    - **Property 26: Carousel previous navigation decrements image index**
    - **Validates: Requirements 12.1, 12.3, 12.4, 14.1**
  
  - [ ]* 16.3 Write unit tests for carousel edge cases
    - Test single-image gallery
    - Test navigation button states at boundaries
    - Test image load failure handling
    - _Requirements: 12.5, 12.6, 14.4, 14.5_

- [x] 17. Implement Video Player
  - [x] 17.1 Create VideoPlayer component
    - Render HTML video element with video URL
    - Add standard video controls (play, pause, volume)
    - Implement pause() method
    - Handle video load failures with placeholder
    - Prevent click from opening new tab
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 18.6_
  
  - [ ]* 17.2 Write property tests for video player
    - **Property 18: Video posts render with playable video elements**
    - **Property 42: Videos not clickable to open in new tab**
    - **Validates: Requirements 10.1, 10.4, 18.6**
  
  - [ ]* 17.3 Write unit tests for video player
    - Test video element renders with correct URL
    - Test video controls are present
    - Test video load failure handling
    - _Requirements: 10.1, 10.2_

- [x] 18. Implement Media Gallery
  - [x] 18.1 Create MediaGallery component with grid layout
    - Render CSS Grid layout with configurable column count
    - Render image posts with clickable images
    - Render video posts using VideoPlayer component
    - Render gallery posts using GalleryCarousel or expanded mode based on toggle
    - Render MetadataDisplay below each media item
    - Filter video posts based on showVideos toggle
    - Handle progressive image loading
    - Display placeholders for failed image loads
    - Style images to indicate they are clickable
    - Implement click handler to open images in new tab
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 11.2, 11.3, 13.3, 13.4, 13.7, 14.3, 15.1, 15.2, 15.5, 15.6, 18.1, 18.2, 18.4, 18.5_
  
  - [ ]* 18.2 Write property tests for media gallery rendering
    - **Property 10: Media gallery renders all media items with titles**
    - **Property 30: Expanded gallery images styled consistently with regular images**
    - **Property 31: Grid layout produces equal-width columns**
    - **Property 32: Column count increases reduce item width**
    - **Property 41: Images clickable to open in new tab**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 15.1, 15.2, 13.7, 15.1, 15.5, 18.1, 18.2, 18.4**
  
  - [ ]* 18.3 Write unit tests for media gallery edge cases
    - Test empty media list
    - Test single column layout
    - Test six column layout
    - Test image load failure display
    - Test video load failure display
    - _Requirements: 3.6, 3.7, 15.4, 15.5_

- [x] 19. Implement video pause on navigation
  - [x] 19.1 Add navigation listener to pause playing videos
    - Track currently playing videos
    - Pause all playing videos when content source changes
    - _Requirements: 10.5_
  
  - [ ]* 19.2 Write property test for video pause behavior
    - **Property 19: Navigation pauses playing videos**
    - **Validates: Requirements 10.5**

- [x] 20. Implement error handling and display
  - [x] 20.1 Create error display component
    - Display user-friendly error messages for different error types
    - Implement specific messages for 404, 429, 503, network errors
    - Distinguish between subreddit not found and user not found
    - Display "no media found" vs "no posts found" messages
    - Add retry buttons for recoverable errors
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2_
  
  - [ ]* 20.2 Write property test for error message generation
    - **Property 11: API error responses produce user-friendly messages**
    - **Validates: Requirements 4.1**
  
  - [ ]* 20.3 Write unit tests for all error scenarios
    - Test 404 subreddit error message
    - Test 404 user error message
    - Test 429 rate limit message
    - Test 503 service unavailable message
    - Test network error message
    - Test no media found message
    - Test no posts found message
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2_

- [x] 21. Wire all components together
  - [x] 21.1 Create main application initialization
    - Initialize StateManager with default values
    - Initialize URLRouter and set up history listeners
    - Load session preferences
    - Render all UI components (search, sort, toggles, column selector, gallery)
    - Connect UI components to StateManager
    - Parse initial URL and load content if present
    - Set up event listeners for all user interactions
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 21.2 Write integration tests for complete workflows
    - Test search subreddit → load content → display images flow
    - Test search user → load content → display posts flow
    - Test sort order change → reload content flow
    - Test author link click → navigate to user profile flow
    - Test browser back/forward navigation flow
    - _Requirements: 1.1, 2.1, 2.2, 3.1, 7.4, 17.5, 17.6, 19.5, 19.6_

- [x] 22. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 23. Implement Infinite Scroll Manager
  - [x] 23.1 Create InfiniteScrollManager class with scroll detection
    - Implement initialize method to set up scroll and resize listeners
    - Implement checkScrollPosition method to detect when user is within 500px of bottom
    - Implement throttling mechanism to limit scroll event processing to every 200ms
    - Implement setEnabled method to enable/disable scroll detection
    - Implement destroy method to clean up event listeners
    - Calculate distance from bottom using scrollY, innerHeight, and scrollHeight
    - _Requirements: 20.1_
  
  - [ ]* 23.2 Write property tests for scroll detection
    - **Property 50: Scroll threshold triggers content loading**
    - **Property 55: Fetch request prevents concurrent requests**
    - **Validates: Requirements 20.1, 20.8**
  
  - [ ]* 23.3 Write unit tests for InfiniteScrollManager
    - Test scroll position calculation at various scroll positions
    - Test throttling prevents excessive callback invocations
    - Test setEnabled prevents callbacks when disabled
    - Test destroy removes event listeners
    - _Requirements: 20.1, 20.8_

- [x] 24. Implement Loading Indicator
  - [x] 24.1 Create LoadingIndicator component
    - Implement show method to display loading spinner
    - Implement hide method to hide the indicator
    - Implement showEndMessage method to display "no more content" message
    - Implement showError method to display error with retry button
    - Create HTML structure with spinner, end message, and error containers
    - Add CSS styling for loading spinner animation, end message, and error state
    - _Requirements: 20.4, 20.5, 20.7, 20.14_
  
  - [ ]* 24.2 Write property tests for loading indicator visibility
    - **Property 53: Loading indicator visibility during fetch**
    - **Validates: Requirements 20.4, 20.5**
  
  - [ ]* 24.3 Write unit tests for LoadingIndicator
    - Test show displays spinner and hides other elements
    - Test hide hides entire container
    - Test showEndMessage displays end message
    - Test showError displays error message and retry button
    - Test retry button click triggers callback
    - _Requirements: 20.4, 20.5, 20.7, 20.14_

- [x] 25. Update API Client for pagination
  - [x] 25.1 Modify APIClient to accept and use "after" parameter
    - Add optional "after" parameter to fetchSubreddit method
    - Add optional "after" parameter to fetchUserPosts method
    - Include "after" as query parameter in API requests when provided
    - Update return type to include pagination token (RedditAPIResult)
    - _Requirements: 20.2, 9.1_
  
  - [ ]* 25.2 Write property tests for pagination parameter
    - **Property 51: Pagination token included in subsequent requests**
    - **Validates: Requirements 20.2**
  
  - [ ]* 25.3 Write unit tests for API client pagination
    - Test API URL includes "after" parameter when provided
    - Test API URL excludes "after" parameter when not provided
    - Test return value includes "after" token from response
    - _Requirements: 20.2_

- [x] 26. Update Response Parser for pagination
  - [x] 26.1 Modify ResponseParser to extract "after" token
    - Update parseResponse to return ParsedResult with mediaPosts and after token
    - Extract "after" value from response.data.after
    - Handle null "after" value when no more content available
    - _Requirements: 20.6_
  
  - [ ]* 26.2 Write property tests for pagination token extraction
    - **Property 54: Null pagination token prevents further requests**
    - **Validates: Requirements 20.6**
  
  - [ ]* 26.3 Write unit tests for response parser pagination
    - Test "after" token extracted from valid response
    - Test null "after" handled correctly
    - Test ParsedResult structure includes both posts and after
    - _Requirements: 20.6_

- [x] 27. Update State Manager for infinite scroll
  - [x] 27.1 Add pagination state to StateManager
    - Add paginationToken property (string | null)
    - Add hasMoreContent property (boolean)
    - Add isLoadingMore property (boolean)
    - Initialize pagination state in constructor
    - _Requirements: 20.6, 20.8_
  
  - [x] 27.2 Implement loadMoreContent method
    - Check if already loading or no more content, return early if true
    - Set isLoadingMore to true and show loading indicator
    - Call API client with current pagination token
    - Append new posts to existing mediaPosts array
    - Update paginationToken with new value from response
    - Update hasMoreContent based on whether after token is null
    - Show end message if no more content
    - Handle errors and display error message with retry
    - Set isLoadingMore to false when complete
    - _Requirements: 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.14_
  
  - [x] 27.3 Update loadContent to reset pagination state
    - Reset paginationToken to null
    - Reset hasMoreContent to true
    - Clear mediaPosts array
    - _Requirements: 20.9_
  
  - [x] 27.4 Update setSortOrder and setTimespan to reset pagination
    - Call loadContent to reset pagination and reload from beginning
    - _Requirements: 20.10, 20.11_
  
  - [ ]* 27.5 Write property tests for state manager pagination
    - **Property 52: New content appended without replacing existing**
    - **Property 56: Content source change resets pagination**
    - **Property 57: Sort configuration change resets pagination**
    - **Property 59: Infinite scroll respects display settings**
    - **Validates: Requirements 20.3, 20.9, 20.10, 20.11, 20.13**
  
  - [ ]* 27.6 Write unit tests for loadMoreContent
    - Test concurrent request prevention
    - Test posts appended to existing array
    - Test pagination token updated
    - Test hasMoreContent set to false when after is null
    - Test error handling displays error message
    - _Requirements: 20.3, 20.6, 20.8, 20.14_

- [x] 28. Integrate infinite scroll with Media Gallery
  - [x] 28.1 Update MediaGallery to support appending content
    - Modify render method to append new items instead of replacing when in append mode
    - Ensure new items respect current video toggle and gallery expand settings
    - Add LoadingIndicator element at bottom of gallery container
    - _Requirements: 20.3, 20.13_
  
  - [ ]* 28.2 Write property tests for gallery append behavior
    - **Property 58: Scroll position maintained after append**
    - **Validates: Requirements 20.12**
  
  - [ ]* 28.3 Write unit tests for gallery append
    - Test new items added to DOM without removing existing
    - Test video toggle respected for new items
    - Test gallery expand setting respected for new items
    - _Requirements: 20.3, 20.13_

- [x] 29. Wire infinite scroll components together
  - [x] 29.1 Initialize infinite scroll in main application
    - Create InfiniteScrollManager instance
    - Create LoadingIndicator instance and add to gallery
    - Initialize InfiniteScrollManager with StateManager.loadMoreContent callback
    - Disable infinite scroll during initial load
    - Enable infinite scroll after initial content loads
    - _Requirements: 20.1, 20.4_
  
  - [ ]* 29.2 Write integration tests for infinite scroll workflow
    - Test scroll near bottom → trigger loadMoreContent → append new items flow
    - Test pagination token passed to subsequent requests
    - Test end of content displays end message
    - Test error during load more displays error with retry
    - Test sort change resets pagination and clears content
    - Test content source change resets pagination
    - _Requirements: 20.1, 20.2, 20.3, 20.6, 20.7, 20.9, 20.10, 20.14_

- [ ] 30. Final checkpoint - Ensure infinite scroll works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 31. Image placeholder aspect ratios (Performance)
  - [x] 31.1 Add width/height to VideoData and dimensions to GalleryData interfaces
  - [x] 31.2 Extract image dimensions from Reddit API preview/media_metadata
  - [x] 31.3 Set CSS aspect-ratio on image, video, and carousel containers to prevent layout shift

- [x] 32. Virtual scrolling (Performance)
  - [x] 32.1 Create VirtualScrollManager class using IntersectionObserver with 2000px buffer
  - [x] 32.2 Detach DOM children for off-screen items, replace with sized placeholder
  - [x] 32.3 Reattach original nodes when scrolling back into view
  - [x] 32.4 Pause videos before detaching, enable when >20 items loaded

- [x] 33. Module splitting (Technical cleanup)
  - [x] 33.1 Split monolithic app.ts into 10 focused ES2020 modules
    - types.ts, router.ts, validation.ts, api.ts, scroll.ts, state.ts, search.ts, controls.ts, media.ts, app.ts
  - [x] 33.2 Resolve circular dependencies via IMediaGallery/IErrorDisplay interfaces in state.ts
  - [x] 33.3 Update index.html to use type="module" script loading

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation uses TypeScript interfaces as defined in the design document
- Property tests should use the fast-check library with minimum 100 iterations
- All property tests must include comment tags referencing the design document property number
- Session storage is used to persist user preferences (column count, video toggle, gallery expand toggle)
- The application is client-side only and requires no backend server
