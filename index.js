import { jsx as H } from "react/jsx-runtime";
import { useSettings as V, useViewport as W, useSettingsActions as O } from "@mywallpaper/sdk-react";
import { useRef as E, useMemo as $, useCallback as Y, useEffect as D } from "react";
const j = `#version 300 es
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
`, K = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_color1;
uniform vec3 u_color2;
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

  vec3 smokeColor = mix(u_color2, u_color1, smokeIntensity) * u_brightness;

  float smokeAlpha = smoothstep(0.0, 0.8, (smokeIntensity - gradient + 0.3) * u_height);

  smokeAlpha = pow(smokeAlpha, 1.0 / max(u_density, 0.01));

  float dither = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) / 255.0;
  smokeColor += dither;
  smokeAlpha += dither;

  fragColor = vec4(smokeColor, smokeAlpha * u_opacity);
}
`;
function I(a) {
  const l = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(a);
  return l ? [
    parseInt(l[1], 16) / 255,
    parseInt(l[2], 16) / 255,
    parseInt(l[3], 16) / 255
  ] : [1, 1, 1];
}
function P(a, l, f) {
  l /= 100, f /= 100;
  const n = l * Math.min(f, 1 - f), d = (m) => {
    const r = (m + a / 30) % 12, i = f - n * Math.max(Math.min(r - 3, 9 - r, 1), -1);
    return Math.round(255 * i).toString(16).padStart(2, "0");
  };
  return `#${d(0)}${d(8)}${d(4)}`;
}
function J() {
  const f = new Uint8Array(65536), n = new Float32Array(256 * 2);
  for (let r = 0; r < 256; r++) {
    const i = Math.random() * Math.PI * 2;
    n[r * 2] = Math.cos(i), n[r * 2 + 1] = Math.sin(i);
  }
  const d = (r) => r * r * r * (r * (r * 6 - 15) + 10), m = (r, i, _, g) => {
    const u = ((i % 16 + 16) % 16 * 16 + (r % 16 + 16) % 16) * 2;
    return n[u] * _ + n[u + 1] * g;
  };
  for (let r = 0; r < 256; r++)
    for (let i = 0; i < 256; i++) {
      const _ = i / 256 * 16, g = r / 256 * 16, u = Math.floor(_), p = Math.floor(g), v = _ - u, T = g - p, U = d(v), R = d(T), e = m(u, p, v, T), x = m(u + 1, p, v - 1, T), y = m(u, p + 1, v, T - 1), S = m(u + 1, p + 1, v - 1, T - 1), o = e + U * (x - e), b = y + U * (S - y), t = o + R * (b - o);
      f[r * 256 + i] = Math.max(0, Math.min(255, (t / 1.414 + 0.5) * 255 | 0));
    }
  return f;
}
function k(a, l, f) {
  const n = a.createShader(f);
  return n ? (a.shaderSource(n, l), a.compileShader(n), a.getShaderParameter(n, a.COMPILE_STATUS) ? n : (console.error("Shader compile error:", a.getShaderInfoLog(n)), a.deleteShader(n), null)) : null;
}
function oe() {
  const a = V(), { width: l, height: f } = W(), { setValue: n, onButtonClick: d } = O(), m = E(null), r = E(null), i = E(null), _ = E(null), g = E({}), u = E(0), p = E(performance.now()), v = E(a);
  v.current = a;
  const T = $(() => J(), []), U = Y(() => {
    const R = Math.random() * 360, e = P(R, 70 + Math.random() * 30, 20 + Math.random() * 20), x = P((R + 30 + Math.random() * 60) % 360, 60 + Math.random() * 40, 35 + Math.random() * 25);
    n("color1", e), n("color2", x);
  }, [n]);
  return D(() => {
    d("randomizeColorsBtn", U);
  }, [d, U]), D(() => {
    const R = m.current;
    if (!R) return;
    const e = R.getContext("webgl2", {
      alpha: !0,
      premultipliedAlpha: !1,
      antialias: !1
    });
    if (!e) {
      console.error("WebGL2 not supported");
      return;
    }
    r.current = e, e.enable(e.BLEND), e.blendFunc(e.SRC_ALPHA, e.ONE_MINUS_SRC_ALPHA), e.clearColor(0, 0, 0, 0);
    const x = e.createTexture();
    _.current = x, e.bindTexture(e.TEXTURE_2D, x), e.texImage2D(e.TEXTURE_2D, 0, e.R8, 256, 256, 0, e.RED, e.UNSIGNED_BYTE, T), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.REPEAT), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.REPEAT), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.LINEAR);
    const y = k(e, j, e.VERTEX_SHADER), S = k(e, K, e.FRAGMENT_SHADER);
    if (!y || !S) return;
    const o = e.createProgram();
    if (e.attachShader(o, y), e.attachShader(o, S), e.linkProgram(o), !e.getProgramParameter(o, e.LINK_STATUS)) {
      console.error("Program link failed:", e.getProgramInfoLog(o));
      return;
    }
    e.detachShader(o, y), e.deleteShader(y), e.detachShader(o, S), e.deleteShader(S), i.current = o, e.useProgram(o), g.current = {
      u_time: e.getUniformLocation(o, "u_time"),
      u_resolution: e.getUniformLocation(o, "u_resolution"),
      u_color1: e.getUniformLocation(o, "u_color1"),
      u_color2: e.getUniformLocation(o, "u_color2"),
      u_speed: e.getUniformLocation(o, "u_speed"),
      u_origin: e.getUniformLocation(o, "u_origin"),
      u_direction: e.getUniformLocation(o, "u_direction"),
      u_scale: e.getUniformLocation(o, "u_scale"),
      u_brightness: e.getUniformLocation(o, "u_brightness"),
      u_opacity: e.getUniformLocation(o, "u_opacity"),
      u_detail: e.getUniformLocation(o, "u_detail"),
      u_turbulence: e.getUniformLocation(o, "u_turbulence"),
      u_density: e.getUniformLocation(o, "u_density"),
      u_height: e.getUniformLocation(o, "u_height"),
      u_quality: e.getUniformLocation(o, "u_quality"),
      u_noiseTexture: e.getUniformLocation(o, "u_noiseTexture")
    }, e.uniform1i(g.current.u_noiseTexture, 0), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, x), p.current = performance.now();
    const b = () => {
      const t = r.current, w = i.current;
      if (!t || !w) return;
      const c = v.current, h = m.current;
      if (!h) return;
      const C = c.quality ?? 1, M = (window.devicePixelRatio || 1) * C, A = h.clientWidth * M, L = h.clientHeight * M;
      (h.width !== A || h.height !== L) && (h.width = A, h.height = L, t.viewport(0, 0, A, L)), t.clear(t.COLOR_BUFFER_BIT);
      const s = g.current, N = (performance.now() - p.current) / 1e3;
      t.uniform1f(s.u_time, N), t.uniform2f(s.u_resolution, h.width, h.height);
      const [X, q, z] = I(c.color1), [F, B, G] = I(c.color2);
      t.uniform3f(s.u_color1, X, q, z), t.uniform3f(s.u_color2, F, B, G), t.uniform1f(s.u_speed, c.speed), t.uniform1f(s.u_origin, c.origin), t.uniform1f(s.u_direction, c.direction), t.uniform1f(s.u_scale, c.scale), t.uniform1f(s.u_brightness, c.brightness), t.uniform1f(s.u_opacity, c.opacity), t.uniform1f(s.u_detail, c.detail), t.uniform1f(s.u_turbulence, c.turbulence), t.uniform1f(s.u_density, c.density), t.uniform1f(s.u_height, c.height), t.uniform1f(s.u_quality, C), t.drawArrays(t.TRIANGLES, 0, 6), u.current = requestAnimationFrame(b);
    };
    return u.current = requestAnimationFrame(b), () => {
      cancelAnimationFrame(u.current), i.current && (e.deleteProgram(i.current), i.current = null), _.current && (e.deleteTexture(_.current), _.current = null);
      const t = e.getExtension("WEBGL_lose_context");
      t && t.loseContext(), r.current = null;
    };
  }, [T]), /* @__PURE__ */ H(
    "canvas",
    {
      ref: m,
      style: {
        display: "block",
        width: "100%",
        height: "100%"
      }
    }
  );
}
export {
  oe as default
};
