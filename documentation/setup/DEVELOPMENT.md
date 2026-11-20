# Separate Web and Mobile development

Open actual folders directly. Workspace shortcut files have been removed.

From the repository root:

```powershell
code --new-window web
code --new-window mobile
```

## Website and shared API

In a terminal inside `web/`, run these in separate terminals:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
npm run dev
```

Open http://127.0.0.1:8000. Run `php artisan queue:work --tries=1` when queued notifications are needed. Use `npm run build` for production assets. On Windows, separate terminals avoid the Unix-only Pail dependency in Composer's combined dev command.

For a new installation, follow [web setup](WEB.md); preserve existing environment files, keys, databases and uploads.

## Mobile

Open `mobile/`. Flutter source, assets, Android/iOS projects and tests are all here. VS Code tasks and debug settings are stored inside this folder. The local SDK remains in the shared ignored `.tools/` folder; use your own installed Flutter SDK on another machine.

From a terminal inside `mobile/`:

```powershell
.\scripts\rider-android.cmd analyze
.\scripts\rider-android.cmd test
.\scripts\android-mobile.cmd run http://10.0.2.2:8000/api/v1
```

The URL above is for an Android emulator. Physical devices require USB forwarding or a reachable test API. Mobile needs the Laravel API running; Vite is only needed for the website. The Rider build helper retains its existing live API default; pass an explicit test URL for testing.

## Repository and deployment

Laravel `web/storage/` holds application uploads, private files and runtime data.
Development snapshots and browser-check output belong in the ignored root
`.tools/development-artifacts/` directory. Browser harnesses default to that
directory so their output does not accumulate beside application uploads.

Both folders share one Git repository and branch. Changes to shared backend rules or the database can affect both clients.

Docker files live in `web/`; build with `web/` as the context. Compose commands also run inside `web/`, preserving the deployment's existing Compose project name and storage volume names when migrating an existing installation. Deployment requires separate authorization.

Historical reports retain their original commands. For current work, run Laravel/npm commands inside `web/`, Flutter commands inside `mobile/`, backend utility scripts from `web/scripts/`, and Android helpers from `mobile/scripts/`.
