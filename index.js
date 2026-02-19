import { jsx as q } from "react/jsx-runtime";
import { useSettings as z, useViewport as B, useSettingsActions as G } from "@mywallpaper/sdk-react";
import { useRef as E, useMemo as H, useCallback as V, useEffect as I } from "react";
const W = {
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
  height: 0.7,
  quality: 1
}, O = `#version 300 es
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
`, $ = `#version 300 es
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
function Y(a) {
  const c = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(a);
  return c ? [
    parseInt(c[1], 16) / 255,
    parseInt(c[2], 16) / 255,
    parseInt(c[3], 16) / 255
  ] : [1, 1, 1];
}
function j(a, c, f) {
  c /= 100, f /= 100;
  const n = c * Math.min(f, 1 - f), d = (_) => {
    const o = (_ + a / 30) % 12, i = f - n * Math.max(Math.min(o - 3, 9 - o, 1), -1);
    return Math.round(255 * i).toString(16).padStart(2, "0");
  };
  return `#${d(0)}${d(8)}${d(4)}`;
}
function K() {
  const f = new Uint8Array(65536), n = new Float32Array(256 * 2);
  for (let o = 0; o < 256; o++) {
    const i = Math.random() * Math.PI * 2;
    n[o * 2] = Math.cos(i), n[o * 2 + 1] = Math.sin(i);
  }
  const d = (o) => o * o * o * (o * (o * 6 - 15) + 10), _ = (o, i, m, h) => {
    const u = ((i % 16 + 16) % 16 * 16 + (o % 16 + 16) % 16) * 2;
    return n[u] * m + n[u + 1] * h;
  };
  for (let o = 0; o < 256; o++)
    for (let i = 0; i < 256; i++) {
      const m = i / 256 * 16, h = o / 256 * 16, u = Math.floor(m), g = Math.floor(h), v = m - u, T = h - g, A = d(v), U = d(T), R = _(u, g, v, T), e = _(u + 1, g, v - 1, T), y = _(u, g + 1, v, T - 1), S = _(u + 1, g + 1, v - 1, T - 1), x = R + A * (e - R), t = y + A * (S - y), b = x + U * (t - x);
      f[o * 256 + i] = Math.max(0, Math.min(255, (b / 1.414 + 0.5) * 255 | 0));
    }
  return f;
}
function k(a, c, f) {
  const n = a.createShader(f);
  return n ? (a.shaderSource(n, c), a.compileShader(n), a.getShaderParameter(n, a.COMPILE_STATUS) ? n : (console.error("Shader compile error:", a.getShaderInfoLog(n)), a.deleteShader(n), null)) : null;
}
function ee() {
  const a = z(), c = { ...W, ...a }, { width: f, height: n } = B(), { setValue: d, onButtonClick: _ } = G(), o = E(null), i = E(null), m = E(null), h = E(null), u = E({}), g = E(0), v = E(performance.now()), T = E(c);
  T.current = c;
  const A = H(() => K(), []), U = V(() => {
    const R = Math.random() * 360;
    d("color", j(R, 70 + Math.random() * 30, 40 + Math.random() * 30));
  }, [d]);
  return I(() => {
    _("randomizeColorBtn", U);
  }, [_, U]), I(() => {
    const R = o.current;
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
    i.current = e, e.enable(e.BLEND), e.blendFunc(e.SRC_ALPHA, e.ONE_MINUS_SRC_ALPHA), e.clearColor(0, 0, 0, 0);
    const y = e.createTexture();
    h.current = y, e.bindTexture(e.TEXTURE_2D, y), e.texImage2D(e.TEXTURE_2D, 0, e.R8, 256, 256, 0, e.RED, e.UNSIGNED_BYTE, A), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.REPEAT), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.REPEAT), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.LINEAR);
    const S = k(e, O, e.VERTEX_SHADER), x = k(e, $, e.FRAGMENT_SHADER);
    if (!S || !x) return;
    const t = e.createProgram();
    if (e.attachShader(t, S), e.attachShader(t, x), e.linkProgram(t), !e.getProgramParameter(t, e.LINK_STATUS)) {
      console.error("Program link failed:", e.getProgramInfoLog(t));
      return;
    }
    e.detachShader(t, S), e.deleteShader(S), e.detachShader(t, x), e.deleteShader(x), m.current = t, e.useProgram(t), u.current = {
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
    }, e.uniform1i(u.current.u_noiseTexture, 0), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, y), v.current = performance.now();
    const b = () => {
      const r = i.current, M = m.current;
      if (!r || !M) return;
      const l = T.current, p = o.current;
      if (!p) return;
      const P = l.quality ?? 1, C = (window.devicePixelRatio || 1) * P, L = p.clientWidth * C, D = p.clientHeight * C;
      (p.width !== L || p.height !== D) && (p.width = L, p.height = D, r.viewport(0, 0, L, D)), r.clear(r.COLOR_BUFFER_BIT);
      const s = u.current, w = (performance.now() - v.current) / 1e3;
      r.uniform1f(s.u_time, w), r.uniform2f(s.u_resolution, p.width, p.height);
      const [F, N, X] = Y(l.color);
      r.uniform3f(s.u_color, F, N, X), r.uniform1f(s.u_speed, l.speed), r.uniform1f(s.u_origin, l.origin), r.uniform1f(s.u_direction, l.direction), r.uniform1f(s.u_scale, l.scale), r.uniform1f(s.u_brightness, l.brightness), r.uniform1f(s.u_opacity, l.opacity), r.uniform1f(s.u_detail, l.detail), r.uniform1f(s.u_turbulence, l.turbulence), r.uniform1f(s.u_density, l.density), r.uniform1f(s.u_height, l.height), r.uniform1f(s.u_quality, P), r.drawArrays(r.TRIANGLES, 0, 6), g.current = requestAnimationFrame(b);
    };
    return g.current = requestAnimationFrame(b), () => {
      cancelAnimationFrame(g.current), m.current && (e.deleteProgram(m.current), m.current = null), h.current && (e.deleteTexture(h.current), h.current = null);
      const r = e.getExtension("WEBGL_lose_context");
      r && r.loseContext(), i.current = null;
    };
  }, [A]), /* @__PURE__ */ q(
    "canvas",
    {
      ref: o,
      style: {
        display: "block",
        width: "100%",
        height: "100%"
      }
    }
  );
}
export {
  ee as default
};
