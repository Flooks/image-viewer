// Quick validation test for session storage utilities
import { savePreferences, loadPreferences, StateManager, APIClient, ResponseParser, URLRouter } from './app.js';

console.log('Testing Session Storage Utilities\n');

// Test 1: Save and load preferences
console.log('Test 1: Save and load preferences');
const testPreferences = {
  columnCount: 3,
  showVideos: false,
  expandGalleries: true
};

savePreferences(testPreferences);
console.log('Saved preferences:', testPreferences);

const loadedPreferences = loadPreferences();
console.log('Loaded preferences:', loadedPreferences);

if (loadedPreferences) {
  const match = 
    loadedPreferences.columnCount === testPreferences.columnCount &&
    loadedPreferences.showVideos === testPreferences.showVideos &&
    loadedPreferences.expandGalleries === testPreferences.expandGalleries;
  console.log('Preferences match:', match ? '✓ PASS' : '✗ FAIL');
} else {
  console.log('✗ FAIL: Could not load preferences');
}

// Test 2: StateManager integration
console.log('\nTest 2: StateManager integration');

// Create dependencies
const apiClient = new APIClient();
const responseParser = new ResponseParser();
const urlRouter = new URLRouter();

// Create StateManager (should load preferences from session storage)
const stateManager = new StateManager(apiClient, responseParser, urlRouter);
const initialState = stateManager.getState();

console.log('Initial state from StateManager:');
console.log('  columnCount:', initialState.columnCount);
console.log('  showVideos:', initialState.showVideos);
console.log('  expandGalleries:', initialState.expandGalleries);

const stateMatch = 
  initialState.columnCount === testPreferences.columnCount &&
  initialState.showVideos === testPreferences.showVideos &&
  initialState.expandGalleries === testPreferences.expandGalleries;
console.log('State matches saved preferences:', stateMatch ? '✓ PASS' : '✗ FAIL');

// Test 3: Preferences persist when changed
console.log('\nTest 3: Preferences persist when changed');

stateManager.setColumnCount(6);
stateManager.setShowVideos(true);
stateManager.setExpandGalleries(false);

const updatedPreferences = loadPreferences();
console.log('Updated preferences after state changes:', updatedPreferences);

if (updatedPreferences) {
  const updateMatch = 
    updatedPreferences.columnCount === 6 &&
    updatedPreferences.showVideos === true &&
    updatedPreferences.expandGalleries === false;
  console.log('Updated preferences match:', updateMatch ? '✓ PASS' : '✗ FAIL');
} else {
  console.log('✗ FAIL: Could not load updated preferences');
}

// Test 4: New StateManager instance loads persisted preferences
console.log('\nTest 4: New StateManager instance loads persisted preferences');

const newStateManager = new StateManager(apiClient, responseParser, urlRouter);
const newState = newStateManager.getState();

console.log('New StateManager state:');
console.log('  columnCount:', newState.columnCount);
console.log('  showVideos:', newState.showVideos);
console.log('  expandGalleries:', newState.expandGalleries);

const persistMatch = 
  newState.columnCount === 6 &&
  newState.showVideos === true &&
  newState.expandGalleries === false;
console.log('New instance loaded persisted preferences:', persistMatch ? '✓ PASS' : '✗ FAIL');

console.log('\n✓ All session storage tests completed');
