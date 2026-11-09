@echo off
setlocal
for %%I in ("%~dp0..") do set "MOBILE_REPO=%%~fI"
set "ANDROID_HOME=%MOBILE_REPO%\.tools\android-sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "GRADLE_USER_HOME=%MOBILE_REPO%\.tools\gradle"
set "MOBILE_FLUTTER=%MOBILE_REPO%\.tools\flutter\bin\flutter.bat"
set "PATH=%MOBILE_REPO%\.tools\flutter\bin;%ANDROID_HOME%\platform-tools;%PATH%"
if not exist "%ANDROID_HOME%\platform-tools\adb.exe" (
  echo Android SDK is incomplete. See documentation/api/ANDROID_SETUP_2026_11_05.md.
  exit /b 1
)
if not exist "%MOBILE_FLUTTER%" (
  echo Workspace Flutter SDK is missing. Install Flutter or use your own Flutter command.
  exit /b 1
)
if "%~1"=="doctor" goto doctor
if "%~1"=="devices" goto devices
if "%~1"=="build" goto build
if "%~1"=="run" goto run
echo Usage: scripts\android-mobile.cmd doctor ^| devices ^| build ^| run
echo Optional second argument for build/run: reachable API URL ending in /api/v1.
exit /b 1
:doctor
call "%MOBILE_FLUTTER%" --suppress-analytics doctor -v
exit /b %ERRORLEVEL%
:devices
call "%MOBILE_FLUTTER%" --suppress-analytics devices
exit /b %ERRORLEVEL%
:build
set "MOBILE_API=http://10.0.2.2:8000/api/v1"
if not "%~2"=="" set "MOBILE_API=%~2"
cd /d "%MOBILE_REPO%\apps\mobile"
call "%MOBILE_FLUTTER%" --suppress-analytics build apk --debug "--dart-define=API_BASE_URL=%MOBILE_API%"
exit /b %ERRORLEVEL%
:run
set "MOBILE_API=http://10.0.2.2:8000/api/v1"
if not "%~2"=="" set "MOBILE_API=%~2"
cd /d "%MOBILE_REPO%\apps\mobile"
call "%MOBILE_FLUTTER%" --suppress-analytics run "--dart-define=API_BASE_URL=%MOBILE_API%"
exit /b %ERRORLEVEL%
