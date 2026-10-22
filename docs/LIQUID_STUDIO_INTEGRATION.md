# Liquid Glass Studio integration

## Status and scope

The owner supplied `liquid-glass-studio-main`, then supplied Apple's `LandmarksBuildingAnAppWithLiquidGlass` sample and rejected the first visual result. The current material combines a true browser-backdrop displacement layer with a decorative GPU rim. The Landmarks composition and current visual acceptance are documented in [UI_LANDMARKS_REVIEW.md](UI_LANDMARKS_REVIEW.md). Protected release and hosted acceptance are recorded in the associated pull request after execution.

The adaptation is decorative. Opportunities, My Search and Insights remain the three primary routes. Accessible HTML retains navigation, text, buttons, dialogs and forms. Provider accounts, ownership, billing, authentication, database authorization and feed behavior are outside this change.

## Source and license

The supplied root `LICENSE` is the MIT License, copyright © 2024 Charles Yin. Its copyright and permission notice must accompany copies or substantial portions. The preserved notice is in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md), with a distributable copy in [public/licenses/liquid-glass-studio.txt](../public/licenses/liquid-glass-studio.txt), served at [/licenses/liquid-glass-studio.txt](/licenses/liquid-glass-studio.txt).

Inspected upstream files and their roles:

| Supplied file | Relevant material |
| --- | --- |
| `src/shaders/fragment-main.glsl` | Surface normals, refraction offset, RGB dispersion, Fresnel edge lighting and directional glare. |
| `src/shaders/lib/sdf.glsl` | Signed distance functions, rounded superellipse corners and smooth merging. |
| `src/shaders/lib/math.glsl` | Domain-clamped `safeAsin` used in refraction calculations. |
| `src/shaders/fragment-bg.glsl` and the two background blur shaders | Explicit background sampling and separate vertical/horizontal blur passes. |
| `src/App.tsx`, `src/utils/GLUtils.ts`, `src/utils/GPUUtils.ts` | Reference scene orchestration, renderer lifecycle and resource requirements; not an application component to transplant wholesale. |
| `README.md` | Feature description and credits, including Inigo Quilez for SDF and smooth-merge functions. |

The adaptation should retain the Quilez provenance recorded by the supplied README. The original attachment remains a local reference and is not itself part of the distributed application. Its OpenSpec documents are not instructions for this repository.

The root MIT license is not treated as evidence that every bundled sample image or video has identical reuse terms. The README separately credits Unsplash, Pexels, Apple and Tim Cook. No bundled sample media, Apple artwork, editor screenshots or external background URLs are included. No Apple branding or endorsement is implied.

## Current rendering boundary

[refraction.ts](../src/lib/glass/refraction.ts) adapts the supplied superellipse distance and guarded Snell edge model into a small geometry image. Its red/green channels encode displacement; blue encodes the depth mask. The image contains no captured page pixels. An SVG filter on the same DOM host consumes the browser's actual `SourceGraphic`, refracts the outer 22px, and blends a 10px-blurred center behind readable controls. The blue depth mask transitions over the following 14px. Additive composition preserves constant opacity through that transition.

The supported Chromium path is positively tested against real CSS stripes: changing displacement scale from 64 to zero changes the rim while leaving the deep center unchanged. Moving the CSS backdrop changes the same lens without regenerating its geometry. Other unverified engines receive conventional native blur. This is a web adaptation of the supplied native sample, not Apple's SwiftUI renderer running in a browser.

Google Sans Flex is self-hosted with its complete OFL notice and provenance. The site's original vector scene extends behind the split navigation, while content cards remain readable light surfaces. No Apple sample photograph is distributed; the supplied sample's license expressly excludes those photographs. No native framework, sample app icon or Apple endorsement is included.

The WebGL material now has a transparent center and supplies only the decorative optical rim. Its texture is still a local lighting environment. Live DOM refraction is supplied by the browser's SVG backdrop filter, rather than by that GPU texture. No DOM screenshot, pixel upload or private-note texture is created.

## Inspected upstream renderer and original adaptation

The reference application is a canvas scene with four render passes: background, vertical blur, horizontal blur and the final glass composite. Its WebGL renderer requires WebGL2 and `EXT_color_buffer_float`; offscreen passes allocate floating-point color textures and depth attachments. The demo also contains a separate WebGPU backend and an interactive editor.

The application integration is smaller: a demand-rendered WebGL2 decorative material on the header, mobile dock and modal headings. Job cards and long content remain normal HTML. [StudioGlass.tsx](../src/components/glass/StudioGlass.tsx) owns the decorative canvas lifecycle, [renderer.ts](../src/lib/glass/renderer.ts) owns typed GPU resources and the generated environment, and [shaders.ts](../src/lib/glass/shaders.ts) contains the adapted material. [studio.css](../src/styles/studio.css) places HTML controls above the canvas and retains a visible non-GPU presentation.

Direct source comparison confirms the rounded superellipse SDF, clamped `safeAsin`, Snell-law edge refraction, separate RGB channel offsets, fifth-power Fresnel response and directional glare. Surface normals are normalized and the optical parameters are tuned for bounded interface surfaces; smooth shape merging, LCH tint conversion and the studio editor controls are not ported. The implementation uses one pass with a local 128 × 64 RGBA8 environment texture, without float render targets, depth attachments or the upstream blur passes. It therefore does not require the original `EXT_color_buffer_float` extension. This is an adaptation of selected shader behavior, not the complete studio scene.

The original adaptation used a locally generated pearl environment with ordinary CSS blur. Its functional tests established shader execution, but the subsequent visual review found that the composited effect was almost invisible and could not establish reference fidelity. That limitation is preserved in [UI_STUDIO_REVIEW.md](UI_STUDIO_REVIEW.md); the current SVG backdrop path above supersedes that material boundary.

The canvas is `aria-hidden` and CSS makes it ignore pointer events. Real HTML above it provides labels and hit targets, including when no GPU renderer is available. Targeted keyboard and material-contrast browser checks passed; these are not a complete accessibility audit. The integration adds no MUI, Emotion, Leva, React Spring, WebGPU dependency or studio asset bundle.

## Resource and fallback contract

- The renderer caps effective device pixel ratio at **1.5** and allocated pixels at **512,000 per surface**, also respecting GPU viewport limits. There is no viewport-sized scene or renderer per listing.
- Geometry maps are capped at **131,072 pixels** and **512px per side**, and regenerate only when the surface geometry changes. Scrolling and pointer motion do not regenerate the map. Covered nested panels remove their backdrop-filter variable and suspend their renderer.
- Frames are requested on initial display, resize, pointer changes, preference changes and visibility/context restoration. The callback does not schedule itself continuously. Pointer updates are coalesced to one scheduled frame.
- Hidden documents and nonintersecting/zero-sized surfaces release their renderer resources. Reduced motion uses a fixed light position. Reduced transparency, `prefers-contrast: more` and forced colors disable GPU material creation; matching CSS hides the canvas and gives the material surfaces opaque backgrounds without backdrop filtering.
- WebGL creation, shader compilation/linking and allocation failures select the underlying CSS presentation. Context-loss events stop scheduled drawing and release resources; restoration requests reinitialization. Native Chromium tests exercise unavailable WebGL, shader compilation failure, preference changes and context loss/restoration.
- Cleanup cancels frames, disconnects observers, removes listeners and deletes shader/program/buffer/vertex-array/texture resources. A WeakMap retains each existing canvas context for deferred cleanup, including previously suspended panels. A microtask checks whether the canvas is detached and then optionally releases its context through `WEBGL_lose_context`, without allocating a context for cleanup. Connected canvases retain their context through React StrictMode cleanup/reinitialization.
- The active material budget is header + dock + one modal heading, at most three surfaces with the current call sites. A registry selects the last connected modal panel in document order; other modal headings release their renderer and use the underlying CSS surface. Opening or closing a nested panel requests an update for the other panels. This explicitly handles nesting rather than relying on intersection observation to detect an overlay. Native Chromium tests verify covered-panel suspension and restoration with nested dialogs.
- Keep shader inputs local and visual. Do not log account data or expose notes, credentials, GPU fingerprints or image contents through telemetry.

## Original adaptation verification record

| Check | Observed result |
| --- | --- |
| Source/license inspection | Completed against the supplied files; MIT notice and separate media credits identified. |
| Shader implementation and correspondence to supplied math | Source-reviewed: selected SDF/refraction/dispersion/Fresnel/glare functions are adapted as described above; native Chromium compilation/linking and varied nonempty framebuffer pixels passed. |
| Pixel budget, bounded surface count and demand rendering | Source-reviewed DPR/pixel caps, demand scheduling and top-panel registry. Native Chromium DPR, exact pixel budget, idle frames, visibility and nested-panel checks passed. |
| Reduced preferences, unsupported GPU and context-loss fallback | Source-reviewed preference queries/CSS and failure/context lifecycle paths. Native Chromium preference, null-context, compile-failure and native context-loss/restoration checks passed. |
| Desktop, tablet and mobile appearance; text/focus contrast | Local screenshots/geometry checked at 320/390/768/1024/1440px, with keyboard and material-contrast checks; see UI_STUDIO_REVIEW.md for measured limits. |
| Existing route, dialog, save and tracking behavior | Existing 14 Chromium workflows passed; six strengthened Studio workflows subsequently passed after detached-context cleanup. Exact-head full-suite CI remains a release gate. |
| Lint, TypeScript, unit/browser tests and production build | Local lint/typecheck/build and 332 unit tests passed; browser results as above. |
| Production deployment | **PENDING**; local checks do not establish cloud acceptance. |

This table records the earlier adaptation's checkpoints. Current Landmarks revision results are in [UI_LANDMARKS_REVIEW.md](UI_LANDMARKS_REVIEW.md) and [TEST_REPORT.md](TEST_REPORT.md); final hosted/CI acceptance is recorded on its release pull request. Preserve the distinction between local/demo behavior and production acceptance.
