import { jsx as V } from "react/jsx-runtime";
import { useSettings as W, useViewport as O, useSettingsActions as $ } from "@mywallpaper/sdk-react";
import { useRef as x, useMemo as Y, useCallback as j, useEffect as I } from "react";
const K = {
  color1: "#FF6B35",
  color2: "#FF0000",
  speed: 0.28,
  origin: 0,
  direction: 0,
  scale: 6,
  brightness: 1,
  opacity: 1,
  detail: 1.25,
  turbulence: 2,
  density: 0.5,
  height: 0.6,
  quality: 1
}, J = `#version 300 es
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
`, Q = `#version 300 es
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
function P(s) {
  const c = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(s);
  return c ? [
    parseInt(c[1], 16) / 255,
    parseInt(c[2], 16) / 255,
    parseInt(c[3], 16) / 255
  ] : [1, 1, 1];
}
function k(s, c, f) {
  c /= 100, f /= 100;
  const n = c * Math.min(f, 1 - f), m = (_) => {
    const t = (_ + s / 30) % 12, i = f - n * Math.max(Math.min(t - 3, 9 - t, 1), -1);
    return Math.round(255 * i).toString(16).padStart(2, "0");
  };
  return `#${m(0)}${m(8)}${m(4)}`;
}
function Z() {
  const f = new Uint8Array(65536), n = new Float32Array(256 * 2);
  for (let t = 0; t < 256; t++) {
    const i = Math.random() * Math.PI * 2;
    n[t * 2] = Math.cos(i), n[t * 2 + 1] = Math.sin(i);
  }
  const m = (t) => t * t * t * (t * (t * 6 - 15) + 10), _ = (t, i, d, h) => {
    const l = ((i % 16 + 16) % 16 * 16 + (t % 16 + 16) % 16) * 2;
    return n[l] * d + n[l + 1] * h;
  };
  for (let t = 0; t < 256; t++)
    for (let i = 0; i < 256; i++) {
      const d = i / 256 * 16, h = t / 256 * 16, l = Math.floor(d), g = Math.floor(h), v = d - l, T = h - g, b = m(v), U = m(T), E = _(l, g, v, T), e = _(l + 1, g, v - 1, T), R = _(l, g + 1, v, T - 1), S = _(l + 1, g + 1, v - 1, T - 1), y = E + b * (e - E), o = R + b * (S - R), A = y + U * (o - y);
      f[t * 256 + i] = Math.max(0, Math.min(255, (A / 1.414 + 0.5) * 255 | 0));
    }
  return f;
}
function w(s, c, f) {
  const n = s.createShader(f);
  return n ? (s.shaderSource(n, c), s.compileShader(n), s.getShaderParameter(n, s.COMPILE_STATUS) ? n : (console.error("Shader compile error:", s.getShaderInfoLog(n)), s.deleteShader(n), null)) : null;
}
function re() {
  const s = W(), c = { ...K, ...s }, { width: f, height: n } = O(), { setValue: m, onButtonClick: _ } = $(), t = x(null), i = x(null), d = x(null), h = x(null), l = x({}), g = x(0), v = x(performance.now()), T = x(c);
  T.current = c;
  const b = Y(() => Z(), []), U = j(() => {
    const E = Math.random() * 360, e = k(E, 70 + Math.random() * 30, 20 + Math.random() * 20), R = k((E + 30 + Math.random() * 60) % 360, 60 + Math.random() * 40, 35 + Math.random() * 25);
    m("color1", e), m("color2", R);
  }, [m]);
  return I(() => {
    _("randomizeColorsBtn", U);
  }, [_, U]), I(() => {
    const E = t.current;
    if (!E) return;
    const e = E.getContext("webgl2", {
      alpha: !0,
      premultipliedAlpha: !1,
      antialias: !1
    });
    if (!e) {
      console.error("WebGL2 not supported");
      return;
    }
    i.current = e, e.enable(e.BLEND), e.blendFunc(e.SRC_ALPHA, e.ONE_MINUS_SRC_ALPHA), e.clearColor(0, 0, 0, 0);
    const R = e.createTexture();
    h.current = R, e.bindTexture(e.TEXTURE_2D, R), e.texImage2D(e.TEXTURE_2D, 0, e.R8, 256, 256, 0, e.RED, e.UNSIGNED_BYTE, b), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.REPEAT), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.REPEAT), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.LINEAR);
    const S = w(e, J, e.VERTEX_SHADER), y = w(e, Q, e.FRAGMENT_SHADER);
    if (!S || !y) return;
    const o = e.createProgram();
    if (e.attachShader(o, S), e.attachShader(o, y), e.linkProgram(o), !e.getProgramParameter(o, e.LINK_STATUS)) {
      console.error("Program link failed:", e.getProgramInfoLog(o));
      return;
    }
    e.detachShader(o, S), e.deleteShader(S), e.detachShader(o, y), e.deleteShader(y), d.current = o, e.useProgram(o), l.current = {
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
    }, e.uniform1i(l.current.u_noiseTexture, 0), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, R), v.current = performance.now();
    const A = () => {
      const r = i.current, F = d.current;
      if (!r || !F) return;
      const u = T.current, p = t.current;
      if (!p) return;
      const D = u.quality ?? 1, M = (window.devicePixelRatio || 1) * D, L = p.clientWidth * M, C = p.clientHeight * M;
      (p.width !== L || p.height !== C) && (p.width = L, p.height = C, r.viewport(0, 0, L, C)), r.clear(r.COLOR_BUFFER_BIT);
      const a = l.current, N = (performance.now() - v.current) / 1e3;
      r.uniform1f(a.u_time, N), r.uniform2f(a.u_resolution, p.width, p.height);
      const [X, q, z] = P(u.color1), [B, G, H] = P(u.color2);
      r.uniform3f(a.u_color1, X, q, z), r.uniform3f(a.u_color2, B, G, H), r.uniform1f(a.u_speed, u.speed), r.uniform1f(a.u_origin, u.origin), r.uniform1f(a.u_direction, u.direction), r.uniform1f(a.u_scale, u.scale), r.uniform1f(a.u_brightness, u.brightness), r.uniform1f(a.u_opacity, u.opacity), r.uniform1f(a.u_detail, u.detail), r.uniform1f(a.u_turbulence, u.turbulence), r.uniform1f(a.u_density, u.density), r.uniform1f(a.u_height, u.height), r.uniform1f(a.u_quality, D), r.drawArrays(r.TRIANGLES, 0, 6), g.current = requestAnimationFrame(A);
    };
    return g.current = requestAnimationFrame(A), () => {
      cancelAnimationFrame(g.current), d.current && (e.deleteProgram(d.current), d.current = null), h.current && (e.deleteTexture(h.current), h.current = null);
      const r = e.getExtension("WEBGL_lose_context");
      r && r.loseContext(), i.current = null;
    };
  }, [b]), /* @__PURE__ */ V(
    "canvas",
    {
      ref: t,
      style: {
        display: "block",
        width: "100%",
        height: "100%"
      }
    }
  );
}
export {
  re as default
};
