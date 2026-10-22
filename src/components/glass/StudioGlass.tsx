import { useEffect, useRef } from 'react';
import { createStudioRenderer, releaseDetachedStudioContext, type StudioRenderer, type StudioTone } from '../../lib/glass/renderer';

type StudioState = 'ready' | 'fallback' | 'reduced' | 'lost' | 'hidden';

// Dialog portals can nest. Only the last attached panel needs an optical layer.
const panels = new Map<HTMLCanvasElement, () => void>();
function topPanel(): HTMLCanvasElement | undefined {
  let last: HTMLCanvasElement | undefined;
  for (const panel of panels.keys()) {
    if (panel.isConnected && (!last || last.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING)) last = panel;
  }
  return last;
}
function refreshPanels() { for (const request of panels.values()) request(); }

/** Decorative only: real DOM text, controls and native backdrop blur stay intact. */
export function StudioGlass({ tone }: { tone: StudioTone }) {
  const reference = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = reference.current, host = canvas?.parentElement;
    if (!canvas || !host) return;
    if (typeof window.matchMedia !== 'function') { canvas.dataset.studioState = 'fallback'; return; }
    const transparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const forced = window.matchMedia('(forced-colors: active)');
    const contrast = window.matchMedia('(prefers-contrast: more)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let renderer: StudioRenderer | null = null, animation: number | null = null;
    let frames = 0, lost = false, failed = false, stopped = false, visible = true;
    let pointer: readonly [number, number] = [0.5, 0.5];
    const state = (value: StudioState) => { canvas.dataset.studioState = value; };
    const release = () => { renderer?.dispose(); renderer = null; };
    const cancel = () => { if (animation !== null) cancelAnimationFrame(animation); animation = null; };
    const draw = () => {
      animation = null;
      if (stopped) return;
      if (transparency.matches || forced.matches || contrast.matches) { release(); state('reduced'); return; }
      if (lost) { state('lost'); return; }
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (document.hidden || !visible || width <= 1 || height <= 1 || (tone === 'panel' && topPanel() !== canvas)) { release(); state('hidden'); return; }
      if (failed) { state('fallback'); return; }
      try {
        renderer ??= createStudioRenderer(canvas);
        if (!renderer) { failed = true; state('fallback'); return; }
        const style = getComputedStyle(host), rawRadius = parseFloat(style.borderTopLeftRadius) || 0;
        const radius = style.borderTopLeftRadius.includes('%') ? rawRadius * Math.min(width, height) / 100 : rawRadius;
        if (!renderer.draw({ width, height, radius, pointer: motion.matches ? [0.5, 0.5] : pointer, tone, dpr: devicePixelRatio })) {
          release(); failed = true; state('fallback'); return;
        }
        frames += 1; canvas.dataset.studioFrames = String(frames); state('ready');
      } catch { release(); failed = true; state('fallback'); }
    };
    const request = () => { if (!stopped && animation === null) animation = requestAnimationFrame(draw); };
    const onPointer = (event: PointerEvent) => {
      if (motion.matches || transparency.matches || forced.matches || contrast.matches || event.pointerType === 'touch') return;
      const bounds = host.getBoundingClientRect();
      if (bounds.width <= 1 || bounds.height <= 1) return;
      pointer = [Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), Math.max(0, Math.min(1, 1 - (event.clientY - bounds.top) / bounds.height))];
      request();
    };
    const onLeave = () => { if (!motion.matches) { pointer = [0.5, 0.5]; request(); } };
    const onLost = (event: Event) => { event.preventDefault(); cancel(); lost = true; release(); state('lost'); };
    const onRestored = () => { lost = false; failed = false; request(); };
    const onPreference = () => { pointer = [0.5, 0.5]; request(); };
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(request);
    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      const current = entries.find(entry => entry.target === host);
      if (current && current.isIntersecting !== visible) { visible = current.isIntersecting; request(); }
    });
    resize?.observe(host); intersection?.observe(host);
    canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRestored);
    host.addEventListener('pointermove', onPointer, { passive: true }); host.addEventListener('pointerleave', onLeave, { passive: true });
    document.addEventListener('visibilitychange', request); window.addEventListener('resize', request);
    for (const preference of [transparency, forced, contrast, motion]) preference.addEventListener('change', onPreference);
    if (tone === 'panel') { panels.set(canvas, request); refreshPanels(); }
    request();
    return () => {
      stopped = true; cancel(); resize?.disconnect(); intersection?.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored);
      host.removeEventListener('pointermove', onPointer); host.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', request); window.removeEventListener('resize', request);
      for (const preference of [transparency, forced, contrast, motion]) preference.removeEventListener('change', onPreference);
      if (tone === 'panel') { panels.delete(canvas); refreshPanels(); }
      release(); state('hidden'); releaseDetachedStudioContext(canvas);
    };
  }, [tone]);
  return <canvas ref={reference} className="studio-glass-canvas" data-studio-state="hidden" data-studio-frames="0" width={1} height={1} aria-hidden="true" />;
}
