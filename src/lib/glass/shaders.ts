/** Adapted from Liquid Glass Studio by Charles Yin (MIT, 2024).
 * Source: supplied src/shaders/{fragment-main,vertex}.glsl and lib/{sdf,math}.glsl.
 * License: /licenses/liquid-glass-studio.txt. This one-pass material samples a
 * local optical environment, never a screenshot or texture of private DOM data. */
export const STUDIO_VERTEX = `#version 300 es
layout(location = 0) in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

export const STUDIO_FRAGMENT = `#version 300 es
precision highp float;
#define PI 3.14159265359
in vec2 v_uv;
uniform sampler2D u_environment;
uniform vec2 u_size;
uniform vec2 u_pointer;
uniform float u_radius;
uniform float u_panel;
out vec4 fragColor;

// Upstream safeAsin and rounded-rectangle/superellipse distance functions.
float safeAsin(float x) { return asin(clamp(x, -1.0, 1.0)); }
float superellipseCornerSDF(vec2 p, float r, float n) {
  p = abs(p);
  return pow(pow(p.x, n) + pow(p.y, n), 1.0 / n) - r;
}
float roundedRectSDF(vec2 p, vec2 center, float width, float height, float cornerRadius, float n) {
  p -= center;
  float cr = cornerRadius;
  vec2 d = abs(p) - vec2(width, height) * 0.5;
  if (d.x > -cr && d.y > -cr) {
    vec2 cornerCenter = sign(p) * (vec2(width, height) * 0.5 - vec2(cr));
    return superellipseCornerSDF(p - cornerCenter, cr, n);
  }
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float shapeDistance(vec2 p) {
  return roundedRectSDF(p, vec2(0.0), u_size.x - 1.5, u_size.y - 1.5,
    min(max(u_radius - 0.75, 0.1), min(u_size.x, u_size.y) * 0.5 - 0.8), 2.6);
}
vec2 getNormal(vec2 p) {
  vec2 e = vec2(0.6, 0.0);
  vec2 gradient = vec2(shapeDistance(p + e.xy) - shapeDistance(p - e.xy),
    shapeDistance(p + e.yx) - shapeDistance(p - e.yx));
  return length(gradient) > 0.0001 ? normalize(gradient) : vec2(0.0, 1.0);
}
float vec2ToAngle(vec2 v) {
  float angle = atan(v.y, v.x);
  return angle < 0.0 ? angle + 2.0 * PI : angle;
}
// Upstream per-channel N_R/N_G/N_B refraction offsets, using one pre-softened
// local texture instead of the playground's background and two blur passes.
vec3 getTextureDispersion(vec2 offset, float factor) {
  const float N_R = 0.98;
  const float N_G = 1.0;
  const float N_B = 1.02;
  return vec3(
    texture(u_environment, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r,
    texture(u_environment, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g,
    texture(u_environment, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b);
}
void main() {
  vec2 p = (v_uv - 0.5) * u_size;
  float distance = shapeDistance(p);
  float coverage = 1.0 - smoothstep(-0.6, 0.6, distance);
  if (coverage <= 0.0) { fragColor = vec4(0.0); return; }
  float depth = max(-distance, 0.0);
  float thickness = mix(10.0, 13.0, u_panel);
  // Snell-law edge bending from upstream fragment-main.glsl STEP 8/9.
  float x_R_ratio = clamp(1.0 - depth / thickness, 0.0, 1.0);
  float thetaI = safeAsin(pow(x_R_ratio, 2.0));
  float thetaT = safeAsin(1.0 / 1.45 * sin(thetaI));
  float edgeFactor = depth >= thickness ? 0.0 : max(0.0, -tan(thetaT - thetaI));
  vec2 normal = getNormal(p);
  vec2 offset = -normal * edgeFactor * mix(11.0, 14.0, u_panel) / max(u_size, vec2(1.0));
  vec3 color = getTextureDispersion(offset, 9.0);
  // Upstream distance-based fifth-power Fresnel and directional glare models.
  float fresnelFactor = clamp(pow(max(0.0, 1.0 - depth / 17.0 + 0.03), 5.0), 0.0, 1.0);
  float glareGeoFactor = clamp(pow(max(0.0, 1.0 - depth / 24.0 + 0.02), 5.0), 0.0, 1.0);
  float lightAngle = (u_pointer.x - 0.5) * 0.8 + (u_pointer.y - 0.5) * 0.45;
  float glareAngle = (vec2ToAngle(normal) - PI / 4.0 + lightAngle) * 2.0;
  bool farSide = (glareAngle > PI * 1.5 && glareAngle < PI * 3.5) || glareAngle < PI * -0.5;
  float glareAngleFactor = clamp(pow(max(0.0, (0.5 + sin(glareAngle) * 0.5)
    * (farSide ? 0.6 : 1.05)), 1.6), 0.0, 1.0);
  float glare = glareAngleFactor * glareGeoFactor;
  color = mix(color, vec3(1.0), fresnelFactor * 0.7);
  color = mix(color, vec3(1.0), glare * 0.7);
  // Bound the overlay; central content never becomes an opaque GPU surface.
  float alpha = min(0.4, 0.018 + fresnelFactor * 0.20 + glare * 0.16) * coverage;
  fragColor = vec4(color * alpha, alpha);
}`;
