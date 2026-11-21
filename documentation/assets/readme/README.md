# README visuals

These images support the [project README](../../../README.md).

| File              | Source                                                                                                                   | Viewport    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `banner.svg`      | Existing official mark from `web/public/images/brand/logo.svg`, with a lavender background and delivery-route decoration | 1200 × 300  |
| `homepage.png`    | Public `https://lubosmart.app/`                                                                                          | 1440 × 1000 |
| `marketplace.png` | Public `https://lubosmart.app/shop`                                                                                      | 1440 × 1000 |

Screenshots captured on November 21, 2026 (Asia/Manila), in a fresh headless Chrome profile with light appearance and reduced motion. They show the actual public website without signing in, entering credentials, placing orders or modifying account data. Catalog names, prices and availability are the public content visible at capture time.

The two retained screenshots have a rounded lavender border rendered around the original capture. The captured website remains 1440 × 1000 pixels; each framed PNG is 1468 × 1028 pixels. The border is part of the image, so it remains visible in GitHub Markdown without custom CSS.

The SVG banner gently moves the existing logo and delivery-route dashes for four seconds on load, then settles. It uses CSS animation inside the SVG with no JavaScript or external resources. Reduced-motion preferences disable both animations.

To refresh the gallery, capture the same public routes in an empty browser profile, wait for visible images and fonts, and inspect each image for private information before replacing it. Keep temporary browser profiles, diagnostics and preview renders in the ignored `.tools/development-artifacts/` directory. These selected screenshots are intentional documentation assets.
