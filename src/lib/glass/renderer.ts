import { STUDIO_FRAGMENT, STUDIO_VERTEX } from './shaders';

export const STUDIO_MAX_PIXELS = 512_000;
export const STUDIO_MAX_DPR = 1.5;
export type StudioTone = 'chrome' | 'panel';
export interface StudioFrame { width: number; height: number; radius: number; pointer: readonly [number, number]; tone: StudioTone; dpr: number; }
export interface StudioRenderer { draw(frame: StudioFrame): boolean; dispose(): void; }
const contexts = new WeakMap<HTMLCanvasElement, WebGL2RenderingContext>();

/** Release detached dialog contexts after React's cleanup/reinit opportunity.
 * Never allocate a context here; connected StrictMode canvases keep theirs. */
export function releaseDetachedStudioContext(canvas: HTMLCanvasElement): void {
  queueMicrotask(() => {
    if (canvas.isConnected) return;
    const context = contexts.get(canvas);
    contexts.delete(canvas);
    if (!context || context.isContextLost()) return;
    try { context.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* Optional driver cleanup; CSS fallback remains available. */ }
  });
}

/** Only an optical lighting environment. No images, network, DOM reads or uploads. */
function environmentPixels(width: number, height: number): Uint8Array {
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / width, v = y / height;
    const blue = Math.exp(-((u - 0.22 - v * 0.38) ** 2) / 0.016);
    const pearl = Math.exp(-((u - 0.72 + v * 0.17) ** 2) / 0.035);
    const shade = 0.025 * Math.sin((u * 1.4 + v * 0.8) * Math.PI * 2);
    const index = (y * width + x) * 4;
    pixels[index] = Math.round(Math.min(1, 0.91 - blue * 0.26 + pearl * 0.07 + shade) * 255);
    pixels[index + 1] = Math.round(Math.min(1, 0.94 - blue * 0.12 + pearl * 0.04 + shade) * 255);
    pixels[index + 2] = Math.round(Math.min(1, 0.98 + pearl * 0.02 + shade) * 255);
    pixels[index + 3] = 255;
  }
  return pixels;
}

/** Resource handling adapted from supplied GLUtils.ts; typed, single pass, RGBA8.
 * Every partial initialization and ordinary/StrictMode cleanup deletes its objects.
 * It deliberately does not eagerly lose the reusable canvas context. */
export function createStudioRenderer(canvas: HTMLCanvasElement): StudioRenderer | null {
  let gl: WebGL2RenderingContext | null;
  try { gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' }); }
  catch { return null; }
  if (!gl || gl.isContextLost()) return null;
  const context = gl;
  contexts.set(canvas, context);
  let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null;
  let array: WebGLVertexArrayObject | null = null, texture: WebGLTexture | null = null;
  let vertex: WebGLShader | null = null, fragment: WebGLShader | null = null;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    context.bindVertexArray(null); context.bindBuffer(context.ARRAY_BUFFER, null);
    context.bindTexture(context.TEXTURE_2D, null); context.useProgram(null);
    if (vertex) context.deleteShader(vertex);
    if (fragment) context.deleteShader(fragment);
    if (texture) context.deleteTexture(texture);
    if (array) context.deleteVertexArray(array);
    if (buffer) context.deleteBuffer(buffer);
    if (program) context.deleteProgram(program);
  };
  const compile = (type: number, source: string) => {
    const shader = context.createShader(type);
    if (!shader) throw new Error('Shader allocation unavailable');
    context.shaderSource(shader, source); context.compileShader(shader);
    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) { context.deleteShader(shader); throw new Error('Shader compilation unavailable'); }
    return shader;
  };
  try {
    vertex = compile(context.VERTEX_SHADER, STUDIO_VERTEX);
    fragment = compile(context.FRAGMENT_SHADER, STUDIO_FRAGMENT);
    program = context.createProgram();
    if (!program) throw new Error('Program allocation unavailable');
    context.attachShader(program, vertex); context.attachShader(program, fragment); context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) throw new Error('Program linking unavailable');
    context.detachShader(program, vertex); context.detachShader(program, fragment);
    context.deleteShader(vertex); context.deleteShader(fragment); vertex = null; fragment = null;
    buffer = context.createBuffer(); array = context.createVertexArray(); texture = context.createTexture();
    if (!buffer || !array || !texture) throw new Error('Material allocation unavailable');
    context.bindVertexArray(array); context.bindBuffer(context.ARRAY_BUFFER, buffer);
    context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), context.STATIC_DRAW);
    context.enableVertexAttribArray(0); context.vertexAttribPointer(0, 2, context.FLOAT, false, 0, 0);
    context.activeTexture(context.TEXTURE0); context.bindTexture(context.TEXTURE_2D, texture);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
    context.texImage2D(context.TEXTURE_2D, 0, context.RGBA8, 128, 64, 0, context.RGBA, context.UNSIGNED_BYTE, environmentPixels(128, 64));
    const uniform = (name: string) => { const location = context.getUniformLocation(program!, name); if (location === null) throw new Error('Material uniform unavailable'); return location; };
    const locations = { size: uniform('u_size'), radius: uniform('u_radius'), pointer: uniform('u_pointer'), panel: uniform('u_panel'), environment: uniform('u_environment') };
    const viewport = context.getParameter(context.MAX_VIEWPORT_DIMS) as Int32Array;
    const maxWidth = viewport[0], maxHeight = viewport[1];
    context.disable(context.DEPTH_TEST); context.disable(context.BLEND); context.clearColor(0, 0, 0, 0);
    return {
      draw(frame) {
        if (disposed || context.isContextLost() || !Number.isFinite(frame.width) || !Number.isFinite(frame.height) || frame.width <= 1 || frame.height <= 1) return false;
        const scale = Math.min(Number.isFinite(frame.dpr) && frame.dpr > 0 ? frame.dpr : 1, STUDIO_MAX_DPR,
          Math.sqrt(STUDIO_MAX_PIXELS / (frame.width * frame.height)), maxWidth / frame.width, maxHeight / frame.height);
        const width = Math.max(1, Math.floor(frame.width * scale)), height = Math.max(1, Math.floor(frame.height * scale));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        context.viewport(0, 0, width, height); context.clear(context.COLOR_BUFFER_BIT);
        context.useProgram(program); context.bindVertexArray(array);
        context.activeTexture(context.TEXTURE0); context.bindTexture(context.TEXTURE_2D, texture);
        context.uniform1i(locations.environment, 0); context.uniform2f(locations.size, frame.width, frame.height);
        context.uniform1f(locations.radius, Math.max(1, Math.min(frame.radius, Math.min(frame.width, frame.height) / 2)));
        context.uniform2f(locations.pointer, frame.pointer[0], frame.pointer[1]); context.uniform1f(locations.panel, frame.tone === 'panel' ? 1 : 0);
        context.drawArrays(context.TRIANGLE_STRIP, 0, 4);
        return true;
      },
      dispose,
    };
  } catch { dispose(); return null; }
}
