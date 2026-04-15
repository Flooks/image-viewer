@echo off
REM Copies the built web app files into the Android assets folder.
REM Run from the project root: android\copy-web-assets.bat

echo Compiling TypeScript...
call npm run build

set ASSETS_DIR=%~dp0app\src\main\assets\web

echo Copying web assets to %ASSETS_DIR%...
if exist "%ASSETS_DIR%" rmdir /s /q "%ASSETS_DIR%"
mkdir "%ASSETS_DIR%"

copy api.js "%ASSETS_DIR%\"
copy app.js "%ASSETS_DIR%\"
copy controls.js "%ASSETS_DIR%\"
copy media.js "%ASSETS_DIR%\"
copy router.js "%ASSETS_DIR%\"
copy scroll.js "%ASSETS_DIR%\"
copy search.js "%ASSETS_DIR%\"
copy state.js "%ASSETS_DIR%\"
copy types.js "%ASSETS_DIR%\"
copy validation.js "%ASSETS_DIR%\"
copy styles.css "%ASSETS_DIR%\"

REM Copy index.html with cache-busting params stripped
REM (file:// URLs in WebView don't handle ?v=123 well)
powershell -Command "(Get-Content index.html) -replace '\.css\?v=\d+', '.css' -replace '\.js\?v=\d+', '.js' | Set-Content '%ASSETS_DIR%\index.html'"

echo Done! Web assets copied to android\app\src\main\assets\web\
