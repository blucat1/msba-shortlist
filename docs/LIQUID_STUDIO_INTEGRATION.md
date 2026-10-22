# Liquid Glass Studio integration

## Status and scope

The owner supplied `liquid-glass-studio-main` and requested that its files inform the site's glass interface. This document records the inspected source and implemented adaptation. Source review and local browser checks have completed as recorded below. Protected release and hosted acceptance are recorded in the associated pull request after execution.

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

## Rendering boundary

The reference application is a canvas scene with four render passes: background, vertical blur, horizontal blur and the final glass composite. Its WebGL renderer requires WebGL2 and `EXT_color_buffer_float`; offscreen passes allocate floating-point color textures and depth attachments. The demo also contains a separate WebGPU backend and an interactive editor.

The application integration is smaller: a demand-rendered WebGL2 decorative material on the header, mobile dock and modal headings. Job cards and long content remain normal HTML. [StudioGlass.tsx](../src/components/glass/StudioGlass.tsx) owns the decorative canvas lifecycle, [renderer.ts](../src/lib/glass/renderer.ts) owns typed GPU resources and the generated environment, and [shaders.ts](../src/lib/glass/shaders.ts) contains the adapted material. [studio.css](../src/styles/studio.css) places HTML controls above the canvas and retains a visible non-GPU presentation.

Direct source comparison confirms the rounded superellipse SDF, clamped `safeAsin`, Snell-law edge refraction, separate RGB channel offsets, fifth-power Fresnel response and directional glare. Surface normals are normalized and the optical parameters are tuned for bounded interface surfaces; smooth shape merging, LCH tint conversion and the studio editor controls are not ported. The implementation uses one pass with a local 128 × 64 RGBA8 environment texture, without float render targets, depth attachments or the upstream blur passes. It therefore does not require the original `EXT_color_buffer_float` extension. This is an adaptation of selected shader behavior, not the complete studio scene.

The shader generates its environment locally. The reference shader samples a supplied texture or generated background; it does **not** sample arbitrary live HTML. Native CSS `backdrop-filter` provides blur of page content behind the DOM surface where supported. Shader refraction and CSS backdrop blur are distinct layers. No DOM screenshots, private-page capture, user-note textures, pixel uploads or external media requests are needed.

The canvas is `aria-hidden` and CSS makes it ignore pointer events. Real HTML above it provides labels and hit targets, including when no GPU renderer is available. Targeted keyboard and material-contrast browser checks passed; these are not a complete accessibility audit. The integration adds no MUI, Emotion, Leva, React Spring, WebGPU dependency or studio asset bundle.

## Resource and fallback contract

- The renderer caps effective device pixel ratio at **1.5** and allocated pixels at **512,000 per surface**, also respecting GPU viewport limits. There is no viewport-sized scene or renderer per listing.
- Frames are requested on initial display, resize, pointer changes, preference changes and visibility/context restoration. The callback does not schedule itself continuously. Pointer updates are coalesced to one scheduled frame.
- Hidden documents and nonintersecting/zero-sized surfaces release their renderer resources. Reduced motion uses a fixed light position. Reduced transparency, `prefers-contrast: more` and forced colors disable GPU material creation; matching CSS hides the canvas and gives the material surfaces opaque backgrounds without backdrop filtering.
- WebGL creation, shader compilation/linking and allocation failures select the underlying CSS presentation. Context-loss events stop scheduled drawing and release resources; restoration requests reinitialization. Native Chromium tests exercise unavailable WebGL, shader compilation failure, preference changes and context loss/restoration.
- Cleanup cancels frames, disconnects observers, removes listeners and deletes shader/program/buffer/vertex-array/texture resources. A WeakMap retains each existing canvas context for deferred cleanup, including previously suspended panels. A microtask checks whether the canvas is detached and then optionally releases its context through `WEBGL_lose_context`, without allocating a context for cleanup. Connected canvases retain their context through React StrictMode cleanup/reinitialization.
- The active material budget is header + dock + one modal heading, at most three surfaces with the current call sites. A registry selects the last connected modal panel in document order; other modal headings release their renderer and use the underlying CSS surface. Opening or closing a nested panel requests an update for the other panels. This explicitly handles nesting rather than relying on intersection observation to detect an overlay. Native Chromium tests verify covered-panel suspension and restoration with nested dialogs.
- Keep shader inputs local and visual. Do not log account data or expose notes, credentials, GPU fingerprints or image contents through telemetry.

## Verification record

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

Observed test and release outcomes belong in [TEST_REPORT.md](TEST_REPORT.md). Update the pending entries only with results actually observed; preserve the distinction between local/demo behavior and production acceptance.
