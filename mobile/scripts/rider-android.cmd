@echo off
setlocal
for %%I in ("%~dp0../..") do set "RIDER_ROOT=%%~fI"
set "APPDATA=%RIDER_ROOT%\.tools\qr-pod-appdata"
set "ANDROID_USER_HOME=%RIDER_ROOT%\.tools\android-user\android"
set "ANDROID_HOME=%RIDER_ROOT%\.tools\android-sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "GRADLE_USER_HOME=%RIDER_ROOT%\.tools\gradle"
set "JAVA_OPTS=-Duser.home=%RIDER_ROOT%/.tools/android-user"
set "GIT_CONFIG_COUNT=1"
set "GIT_CONFIG_KEY_0=safe.directory"
set "GIT_CONFIG_VALUE_0=%RIDER_ROOT%\.tools\flutter"
if exist "%RIDER_ROOT%\.tools\rider-pub-cache\hosted" set "PUB_CACHE=%RIDER_ROOT%\.tools\rider-pub-cache"
set "RIDER_FLUTTER=%RIDER_ROOT%\.tools\flutter\bin\flutter.bat"
cd /d "%RIDER_ROOT%\mobile"
if "%~1"=="test" goto test
if "%~1"=="analyze" goto analyze
if "%~1"=="devices" goto devices
if "%~1"=="build" goto build
echo Usage: scripts\rider-android.cmd build [debug or release] [HTTPS API URL] ^| test ^| analyze ^| devices
exit /b 1
:build
set "RIDER_MODE=release"
if "%~2"=="debug" set "RIDER_MODE=debug"
set "RIDER_API=https://lubosmart.app/api/v1"
if not "%~3"=="" set "RIDER_API=%~3"
call "%RIDER_FLUTTER%" --suppress-analytics pub get --offline
if errorlevel 1 exit /b %ERRORLEVEL%
call "%RIDER_FLUTTER%" --suppress-analytics build apk --%RIDER_MODE% --no-pub --target lib/rider_main.dart "--dart-define=API_BASE_URL=%RIDER_API%"
exit /b %ERRORLEVEL%
:test
call "%RIDER_FLUTTER%" --suppress-analytics test
exit /b %ERRORLEVEL%
:analyze
call "%RIDER_FLUTTER%" --suppress-analytics analyze
exit /b %ERRORLEVEL%
:devices
"%ANDROID_HOME%\platform-tools\adb.exe" devices
exit /b %ERRORLEVEL%
