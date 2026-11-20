<div align="center">

# Local performance and homepage motion review

**Recorded local performance findings and motion validation limits.**

[Home](../../README.md) · [Documentation](../README.md) · [Website](https://lubosmart.app)

</div>

---

## Overview

This review records local loading and homepage animation findings from November 20, 2026. It is for developers investigating the observed behavior and understanding the limits of the recorded checks.

<a id="how-it-works"></a>

## How it works

Reviewed 2026-11-20 after reports of slow loading and animations that appear stuck.

<a id="changes"></a>

## Changes

- Homepage entrance effects now animate `transform` while the floating hero artwork retains its CSS `translate` animation. Previously both effects animated `translate`, so the entrance effect temporarily replaced the floating motion.
- Vite binds to `127.0.0.1`. The previous hot URL used IPv6; direct IPv4 requests failed. This makes the local asset address consistent with the app's observed `127.0.0.1:8000` URL.
- Reduced-motion behavior remains enabled. A device/browser requesting reduced motion intentionally suppresses decorative animations.
- Follow-up: Vite's watcher now excludes `.tools` and `mobile`. Together the local SDK/tool installation, Flutter build output, and Dart cache contained 162,311 files. Installed Vite defaults excluded Git and Node dependency directories but did not exclude these mobile directories. Flutter builds and SDK updates do not need to trigger website file watching.

<a id="findings-and-limitations"></a>

<a id="troubleshooting"></a>

## Troubleshooting

- Laravel logs recorded MySQL connection refusal on November 20 and a 60-second timeout on November 18. At review time the database connected successfully and every migration was applied. No database credentials or application data were changed.
- Initial local HTTP samples were about 2.9–3.3 seconds for homepage HTML and 5.3 seconds for the first Vite application-module response. A CLI request profile recorded 9 database queries totaling about 44 ms within a 2310 ms request. These samples do not establish a production performance baseline or Core Web Vitals.
- Older browser logs contained failed dynamic imports and Inertia.js errors. These were not reproduced during this review; rebuilding assets does not establish that all historical errors are resolved.
- The existing Vite process later accepted connections but stopped responding to HTTP requests, including `/@vite/client`. Restart the local development server before browser verification. A warmup configuration was tried and removed because no reliable improvement was established.
- After the mobile watcher exclusions were applied, the existing Vite server responded successfully to `/@vite/client` in a 2.72-second sample; before the change the request timed out after 10 seconds. This is a local observation, not an isolated performance benchmark. A separate watcher smoke check observed zero watched directories under the excluded mobile/tool paths. That standalone check omitted Laravel's entry configuration and produced unrelated dependency-scan errors, so it is not an application startup test.
- The production build reports runtime image-reference warnings for public assets. The referenced files exist locally.
- Visual animation playback, system reduced-motion preference, frame rate, light/dark rendering, keyboard paths, mobile reflow, and zoom were not verified in a browser. Automated checks do not establish WCAG compliance.

<a id="validation"></a>

<a id="testing"></a>

## Testing

- Targeted ESLint and project TypeScript checks passed.
- Changed-file Prettier checks passed.
- Homepage and marketplace catalog tests: 20 passed, 324 assertions.
- Production asset build passed.

No commit, push, or deployment was performed.

---

<div align="center">

**LubosMart** · Local performance and homepage motion review · [Documentation](../README.md)

</div>
