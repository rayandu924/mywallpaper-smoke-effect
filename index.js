import { jsx as F } from "react/jsx-runtime";
import { useSettings as N, useViewport as M } from "@mywallpaper/sdk-react";
import { useRef as v, useMemo as X, useEffect as q } from "react";
const z = {
  color: "#FFFFFF",
  speed: 0.28,
  origin: 0,
  direction: 0,
  scale: 6,
  brightness: 1,
  opacity: 1,
  detail: 1.25,
  turbulence: 2,
  density: 0.5,
  height: 1,
  quality: 1
}, B = `#version 300 es
precision mediump float;
const vec2 positions[6] = vec2[6](
  vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
  vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0)
);
out vec2 uv;
void main() {
  uv = positions[gl_VertexID];
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}
`, G = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_color;
uniform float u_speed;
uniform float u_origin;
uniform float u_direction;
uniform float u_scale;
uniform float u_brightness;
uniform float u_opacity;
uniform float u_detail;
uniform float u_turbulence;
uniform float u_density;
uniform float u_height;
uniform float u_quality;
uniform sampler2D u_noiseTexture;

in vec2 uv;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  return texture(u_noiseTexture, p / 16.0).r;
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.4;
  vec2 freq = p;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);

  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * noise(freq);
    freq = rot * freq * 2.0;
    amplitude *= 0.4;
  }
  return value;
}

void main() {
  vec2 pos = uv;

  float aspectRatio = u_resolution.x / u_resolution.y;
  pos.x *= aspectRatio;

  float originRad = radians(u_origin);
  vec2 originDir = vec2(sin(originRad), cos(originRad));
  float gradientBasis = dot(pos, originDir);

  if (gradientBasis > 3.0) {
    fragColor = vec4(0.0);
    return;
  }

  float dirRad = radians(u_direction);
  vec2 moveDir = vec2(sin(dirRad), cos(dirRad));

  float t = u_time * u_speed;

  vec2 smokeCoords = (pos - moveDir * t) * (7.0 / u_scale);

  int octaves = 2 + int(u_detail * 2.0);

  float baseNoise = fbm(smokeCoords, octaves);

  float gradient = mix(gradientBasis * 0.3, gradientBasis * 0.7, baseNoise);

  if (gradient > 1.0) {
    fragColor = vec4(0.0);
    return;
  }

  float warpY = noise(smokeCoords * 1.7 + vec2(5.2, 1.3));

  float noise2 = u_turbulence * fbm(smokeCoords + vec2(baseNoise, warpY) + t * 0.7, min(octaves, 5)) - 0.5;

  float smokeIntensity = fbm(vec2(noise2, baseNoise), max(octaves / 2, 2));

  vec3 smokeColor = u_color * u_brightness;

  float smokeAlpha = smoothstep(0.0, 0.8, (smokeIntensity - gradient + 0.3) * u_height);

  smokeAlpha = pow(smokeAlpha, 1.0 / max(u_density, 0.01));

  float dither = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) / 255.0;
  smokeColor += dither;
  smokeAlpha += dither;

  fragColor = vec4(smokeColor, smokeAlpha * u_opacity);
}
`;
function H(c) {
  const l = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(c);
  return l ? [
    parseInt(l[1], 16) / 255,
    parseInt(l[2], 16) / 255,
    parseInt(l[3], 16) / 255
  ] : [1, 1, 1];
}
function V() {
  const x = new Uint8Array(65536), s = new Float32Array(256 * 2);
  for (let r = 0; r < 256; r++) {
    const n = Math.random() * Math.PI * 2;
    s[r * 2] = Math.cos(n), s[r * 2 + 1] = Math.sin(n);
  }
  const T = (r) => r * r * r * (r * (r * 6 - 15) + 10), m = (r, n, d, _) => {
    const u = ((n % 16 + 16) % 16 * 16 + (r % 16 + 16) % 16) * 2;
    return s[u] * d + s[u + 1] * _;
  };
  for (let r = 0; r < 256; r++)
    for (let n = 0; n < 256; n++) {
      const d = n / 256 * 16, _ = r / 256 * 16, u = Math.floor(d), g = Math.floor(_), h = d - u, p = _ - g, e = T(h), y = T(p), E = m(u, g, h, p), R = m(u + 1, g, h - 1, p), t = m(u, g + 1, h, p - 1), U = m(u + 1, g + 1, h - 1, p - 1), o = E + e * (R - E), A = t + e * (U - t), i = o + y * (A - o);
      x[r * 256 + n] = Math.max(0, Math.min(255, (i / 1.414 + 0.5) * 255 | 0));
    }
  return x;
}
function P(c, l, x) {
  const s = c.createShader(x);
  return s ? (c.shaderSource(s, l), c.compileShader(s), c.getShaderParameter(s, c.COMPILE_STATUS) ? s : (console.error("Shader compile error:", c.getShaderInfoLog(s)), c.deleteShader(s), null)) : null;
}
function j() {
  const c = N(), l = { ...z, ...c }, { width: x, height: s } = M(), T = v(null), m = v(null), r = v(null), n = v(null), d = v({}), _ = v(0), u = v(performance.now()), g = v(l);
  g.current = l;
  const h = X(() => V(), []);
  return q(() => {
    const p = T.current;
    if (!p) return;
    const e = p.getContext("webgl2", {
      alpha: !0,
      premultipliedAlpha: !1,
      antialias: !1
    });
    if (!e) {
      console.error("WebGL2 not supported");
      return;
    }
    m.current = e, e.enable(e.BLEND), e.blendFunc(e.SRC_ALPHA, e.ONE_MINUS_SRC_ALPHA), e.clearColor(0, 0, 0, 0);
    const y = e.createTexture();
    n.current = y, e.bindTexture(e.TEXTURE_2D, y), e.texImage2D(e.TEXTURE_2D, 0, e.R8, 256, 256, 0, e.RED, e.UNSIGNED_BYTE, h), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.REPEAT), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.REPEAT), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.LINEAR);
    const E = P(e, B, e.VERTEX_SHADER), R = P(e, G, e.FRAGMENT_SHADER);
    if (!E || !R) return;
    const t = e.createProgram();
    if (e.attachShader(t, E), e.attachShader(t, R), e.linkProgram(t), !e.getProgramParameter(t, e.LINK_STATUS)) {
      console.error("Program link failed:", e.getProgramInfoLog(t));
      return;
    }
    e.detachShader(t, E), e.deleteShader(E), e.detachShader(t, R), e.deleteShader(R), r.current = t, e.useProgram(t), d.current = {
      u_time: e.getUniformLocation(t, "u_time"),
      u_resolution: e.getUniformLocation(t, "u_resolution"),
      u_color: e.getUniformLocation(t, "u_color"),
      u_speed: e.getUniformLocation(t, "u_speed"),
      u_origin: e.getUniformLocation(t, "u_origin"),
      u_direction: e.getUniformLocation(t, "u_direction"),
      u_scale: e.getUniformLocation(t, "u_scale"),
      u_brightness: e.getUniformLocation(t, "u_brightness"),
      u_opacity: e.getUniformLocation(t, "u_opacity"),
      u_detail: e.getUniformLocation(t, "u_detail"),
      u_turbulence: e.getUniformLocation(t, "u_turbulence"),
      u_density: e.getUniformLocation(t, "u_density"),
      u_height: e.getUniformLocation(t, "u_height"),
      u_quality: e.getUniformLocation(t, "u_quality"),
      u_noiseTexture: e.getUniformLocation(t, "u_noiseTexture")
    }, e.uniform1i(d.current.u_noiseTexture, 0), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, y), u.current = performance.now();
    const U = () => {
      const o = m.current, A = r.current;
      if (!o || !A) return;
      const i = g.current, f = T.current;
      if (!f) return;
      const L = i.quality ?? 1, D = (window.devicePixelRatio || 1) * L, S = f.clientWidth * D, b = f.clientHeight * D;
      (f.width !== S || f.height !== b) && (f.width = S, f.height = b, o.viewport(0, 0, S, b)), o.clear(o.COLOR_BUFFER_BIT);
      const a = d.current, I = (performance.now() - u.current) / 1e3;
      o.uniform1f(a.u_time, I), o.uniform2f(a.u_resolution, f.width, f.height);
      const [w, k, C] = H(i.color);
      o.uniform3f(a.u_color, w, k, C), o.uniform1f(a.u_speed, i.speed), o.uniform1f(a.u_origin, i.origin), o.uniform1f(a.u_direction, i.direction), o.uniform1f(a.u_scale, i.scale), o.uniform1f(a.u_brightness, i.brightness), o.uniform1f(a.u_opacity, i.opacity), o.uniform1f(a.u_detail, i.detail), o.uniform1f(a.u_turbulence, i.turbulence), o.uniform1f(a.u_density, i.density), o.uniform1f(a.u_height, i.height), o.uniform1f(a.u_quality, L), o.drawArrays(o.TRIANGLES, 0, 6), _.current = requestAnimationFrame(U);
    };
    return _.current = requestAnimationFrame(U), () => {
      cancelAnimationFrame(_.current), r.current && (e.deleteProgram(r.current), r.current = null), n.current && (e.deleteTexture(n.current), n.current = null);
      const o = e.getExtension("WEBGL_lose_context");
      o && o.loseContext(), m.current = null;
    };
  }, [h]), /* @__PURE__ */ F(
    "canvas",
    {
      ref: T,
      style: {
        display: "block",
        width: "100%",
        height: "100%"
      }
    }
  );
}
export {
  j as default
};
