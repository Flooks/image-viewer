#!/bin/bash
# Copies the built web app files into the Android assets folder.
# Run from the project root: bash android/copy-web-assets.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ASSETS_DIR="$SCRIPT_DIR/app/src/main/assets/web"

echo "Compiling TypeScript..."
cd "$PROJECT_ROOT"
npm run build

echo "Copying web assets to $ASSETS_DIR..."
rm -rf "$ASSETS_DIR"
mkdir -p "$ASSETS_DIR"

# Copy compiled JS files
cp "$PROJECT_ROOT"/api.js "$ASSETS_DIR/"
cp "$PROJECT_ROOT"/app.js "$ASSETS_DIR/"
cp "$PROJECT_ROOT"/controls.js "$ASSETS_DIR/"
cp "$PROJECT_ROOT"/media.js "$ASSETS_DIR/"
cp "$PROJECT_ROOT"/router.js "$ASSETS_DIR/"
cp "$PROJECT_ROOT"/scroll.js "$ASSETS_DIR/"
cp "$PROJECT_ROOT"/search.js "$ASSETS_DIR/"
cp "$PROJECT_ROOT"/state.js "$ASSETS_DIR/"
cp "$PROJECT_ROOT"/types.js "$ASSETS_DIR/"
cp "$PROJECT_ROOT"/validation.js "$ASSETS_DIR/"

# Copy HTML and CSS
cp "$PROJECT_ROOT"/styles.css "$ASSETS_DIR/"

# Copy index.html with cache-busting query params stripped
# (file:// URLs in WebView don't handle ?v=123 well)
sed 's/\.css?v=[0-9]*/.css/g; s/\.js?v=[0-9]*/.js/g' "$PROJECT_ROOT/index.html" > "$ASSETS_DIR/index.html"

echo "Done! Web assets copied to android/app/src/main/assets/web/"
