# Landmarks reference and visual acceptance

The reference for this revision is the supplied **Landmarks: Building an app with Liquid Glass** SwiftUI sample, rather than the earlier Liquid Glass Studio editor. Review date: October 22, 2026. Native SwiftUI rendering cannot be transplanted directly into a website; the result is a web adaptation of the sample's composition and material behavior.

## Reference observations

The supplied `LandmarksSplitView.swift`, `LandmarksView.swift`, `LandmarkFeaturedItemView.swift`, `LandmarkDetailView.swift` and constants were reviewed alongside Apple's official desktop, tablet, toolbar and phone illustrations. Reference-only copies are kept in ignored `.tools/landmarks-reference/`, with their official URLs in `sources.json`.

The sample uses a navigation rail above the scene, logical groups of small floating toolbar controls, a distinct search surface, and a plain reading area. Background imagery continues beneath the rail without duplicating the headline or buttons there. Its typographic hierarchy uses ordinary system title styles and semantic weights. These observations informed the split navigation, lighter type, grouped search/filter surface and restrained reading cards. The three primary routes remain Opportunities, My Search and Insights. The compact web layout uses a floating dock to keep those routes available.

The scene is the site's own vector artwork, `public/art/workspace-contours.svg`; no accompanying Apple photograph is included in the product. See Apple's [Landmarks sample description](https://developer.apple.com/documentation/swiftui/landmarks-building-an-app-with-liquid-glass) and [WWDC25 app-design session](https://developer.apple.com/videos/play/wwdc2025/323/) for the native reference.

## Material and typography

The compositor now refracts its **actual live DOM backdrop** through an SVG displacement filter. JavaScript generates a bounded geometry field from the rounded shape and Snell edge model; `feDisplacementMap` consumes the browser's `SourceGraphic`. The generated PNG contains displacement vectors and a readability mask, not a screenshot of text, jobs or private records. The outer optical rim remains sharp while the center blends toward a softened backdrop to reduce competing background text. Scrolling or changing content does not regenerate that geometry image. The existing WebGL canvas supplies a decorative rim separately.

The supported Chromium path is positively exercised. Other unverified engines retain ordinary blur. Reduced transparency, increased contrast and forced colors remove refraction and select protective surfaces. Text and controls remain HTML, with their existing keyboard behavior and accessible labels.

Google Sans Flex is served from local WOFF2 files, with source and license records under `public/licenses/`. The font test inspects Chromium's actual rendered platform font, rather than accepting a declared CSS family or an unrelated system fallback. Font requests must remain on the site's own origin.

## Acceptance checks

The three new browser regressions cover:

- A vertical navigation rail at 1024/1440 pixels and compact header/dock at 320/390/768/900, with exactly three primary route links, keyboard navigation, visible selection, 44 px targets and actual viewport bounds. The latter catches fixed elements that can overflow without increasing `document.scrollWidth`.
- Actual background-feature displacement on the production component. A controlled CSS stripe backdrop is compared with the **same** component at displacement scale 64 and zero; text and the decorative GPU rim are hidden for this optical measurement. Within the active outer 22 px field, mean channel difference must exceed 8/255, at least 10% of sampled pixels must change by more than 12/255, and the edge difference must exceed twice the center difference. Shifting the real CSS backdrop by 5 px must change the output while the field's PNG and revision remain identical. This is stronger evidence than merely detecting varied shader pixels.
- Displacement fields bounded to 131,072 pixels and a 512 px longest side, preference transitions that remove the filter, and usable real demo form controls under the deliberate unverified-engine fallback policy. That controlled policy test runs in Chromium and does not claim a Firefox run.

The existing 20 browser tests remain part of the suite: eight application workflows, six responsive/accessibility checks and six native WebGL/lifecycle checks. The phone role-family check now opens the real Filters dialog, selects a role family and applies it, reflecting the compact layout while retaining its label-fit assertion.

Early review found a mobile dock shifted beyond the screen by an inherited transform. The transform was reset, and the bounding-box regression is retained. A later screenshot found “preferences” splitting mid-word in the narrow step controls; a word-range regression now verifies wrapping between whole words. Functional, font, focus, target-size and contrast assertions were retained.

## Observed results and limits

The first isolated optical test plus the six native Studio tests passed **7/7 in 22.5 seconds**. After the dock correction, the complete local suite passed **23/23 in 1.7 minutes**, including actual rendered Google Sans Flex, the live-backdrop optical comparison and all prior workflows. Scoped ESLint and the diff whitespace check passed.

The initial local audit completed at **18:26:38 UTC** in `.tools/ui-audit-landmarks-final-local/observations.json`: **57 states**, no JavaScript errors, no document overflow, and no reported undersized text, low contrast, undersized targets or clipped titles. Visual inspection additionally found the mid-word step label and background text competing with phone chrome; those findings prompted refinements despite the geometry pass.

After the final readability mask, protective brand fill, whole-word step layout and compact phone information control, all **nine targeted Landmarks/responsive tests passed in 1.2 minutes**. The final fresh audit completed at **18:34:10 UTC** in `.tools/ui-audit-landmarks-release-local/observations.json`: **57 states**, with the same six reported problem counts all zero. Final viewport retakes of the 390 px Opportunities screen and scrolled card, plus the 320 px preference form, were inspected. The first role title is visible above the dock, the dock stays fully within the viewport, and “preferences” stays a whole word. The scene visibly continues beneath the desktop rail while cards keep a clear reading surface. These screenshot observations supplement the mechanical optical gate; test counts alone are not a claim of exact native visual fidelity.

Local browser results establish Chromium implementation behavior and controlled layout checks. They do not establish native SwiftUI fidelity, physical-device GPU performance, Safari/Firefox output, OS screen-reader acceptance, Google account switching or human usefulness. Demo tests are fictional and browser-local; this review does not change providers, billing, production records, feed schedules or access permissions.

Representative final fictional-demo captures: [desktop](screenshots/landmarks-desktop.png), [phone](screenshots/landmarks-phone.png), and [320px Preferences](screenshots/landmarks-preferences-phone.png). These are actual browser captures, not design mockups or Apple sample imagery.
