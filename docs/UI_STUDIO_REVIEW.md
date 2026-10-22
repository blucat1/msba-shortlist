# Supplied Liquid Glass Studio review

Observed locally on October 22, 2026, using Google Chrome through Playwright and the Vite development server. Demo content was fictional and browser-local. This review did not read authenticated production records or poll job feeds.

## Integration and visual result

The selected MIT-licensed shader and WebGL utilities are adapted into `src/lib/glass/`, with React lifecycle management in `src/components/glass/StudioGlass.tsx`. The original supplied playground remains a local reference. Its complete application, media controls, continuous animation loop and multipass floating-point render targets are not loaded by the site. Attribution is available through the Credits link and `public/licenses/liquid-glass-studio.txt`.

The header, mobile dock and topmost dialog heading now have an actual WebGL2 optical layer. It samples a generated pearl/blue environment texture. Native CSS backdrop filtering continues to blur the page beneath the surface; the shader does not capture, upload or refract a texture of the user's DOM. Text, links, inputs and buttons remain ordinary HTML above the decorative canvas.

Reviewed viewport screenshots included Opportunities at 1440 and 390 pixels, the first phone job card, Insights at 1440, and Preferences and a next-step form at 320. The restrained blue rim and pearl illumination are visible without placing a noisy texture behind text. The phone dock remains distinct from the scrolling cards, and the narrow forms retain their visible close control, readable fields and reachable actions. The effect is deliberately subtle; it does not reproduce the supplied playground's movable lens over arbitrary photographs or video.

## Browser evidence

The initial complete browser run passed **20/20 tests in 47.5 seconds**: the eight existing workflows, six responsive/accessibility checks and six new Studio tests. After the final detached-context cleanup refinement, the strengthened **six Studio tests passed in 15.4 seconds**. Scoped ESLint and strict TypeScript also passed after that refinement. Existing font, contrast, touch-target and viewport assertions were preserved.

The new tests observe native browser WebGL calls rather than replace the successful renderer with a fake. They establish:

- Real vertex/fragment compilation, program linking and drawing with nontransparent, varied output pixels. The test reads the first default-framebuffer draw synchronously before `preserveDrawingBuffer: false` can clear it, and retains only aggregate color counts. Compilation/linking and sampled GL-error checks passed.
- No additional draw during a settled 500 ms idle interval; pointer movement produces a new frame. Simulated document hiding releases resources and stops pointer draws; becoming visible recreates a frame.
- At simulated device pixel ratio 3 and viewport widths **320, 390, 768, 1024 and 1440**, backing dimensions remain capped at **1.5× CSS size and 512,000 pixels per surface**. There are at most three ready surfaces, including nested dialogs.
- **Twenty consecutive dialog open/close cycles** return tracked shader/program/buffer/texture/VAO allocations to baseline. Detached native contexts supporting `WEBGL_lose_context` become lost, while the persistent header stays ready. A covered nested dialog releases its objects and resumes after the top dialog closes.
- Returning null from the managed canvas's context API preserves a usable CSS fallback and a real demo save. Feeding invalid GLSL into the native compiler exercises partial-initialization cleanup while keeping the manual-role form usable.
- Reduced transparency initially allocates no GPU context. Reduced motion draws a static frame and ignores pointer motion. Switching transparency, forced colors or increased contrast to their protective modes releases GPU objects. The reduced-transparency header is opaque and has no backdrop filter.
- Native `WEBGL_lose_context` loss keeps navigation usable. Restoring the retained extension recreates shaders and a working, varied frame.

The parent audit artifact `.tools/ui-audit-studio-final-local/observations.json` covers **57 demo states**: all three routes at five widths, narrow and desktop dialogs, first-card/tracker views, grouped and task views, local table scrolling and 200% reflow/text checks. It reports no JavaScript errors, document overflow, low-contrast findings, undersized targets or clipped titles. Its first pass identified 12 px tracker-tab count labels; these were raised to 14 px and the parent verified a fresh phone state. The original first-pass artifact is retained rather than relabeled as a complete repeat audit.

## Limits

These are local Chromium implementation and layout checks. The native browser driver may use software rendering; no physical-GPU frame-rate, battery, thermal or VRAM benchmark was performed. The visibility test dispatches a controlled visibility change rather than demonstrating every operating system's background-tab policy. Allocation observations cover the WebGL objects created through the renderer's observed APIs, not a measurement of driver memory.

Safari, Firefox, physical iOS/Android devices, OS screen readers, Google account switching and the deferred human pilot remain unexecuted by this review. CI and hosted acceptance must be recorded separately against the released commit. The tests intentionally fail when native WebGL2 or the context-loss extension required by the positive gate is unavailable; they do not silently skip that gate.

The context lifecycle checks follow the distinction between deleting GPU objects and losing a detached context described in the [WebGL best-practices guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices), and the asynchronous recreation requirement in [Khronos context-loss guidance](https://wikis.khronos.org/webgl/HandlingContextLost).
