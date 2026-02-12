import { useSettings, useViewport, useSettingsActions } from '@mywallpaper/sdk-react'
import { useRef, useEffect, useMemo, useCallback } from 'react'

interface Settings {
  color1: string
  color2: string
  speed: number
  origin: number
  direction: number
  scale: number
  brightness: number
  opacity: number
  detail: number
  turbulence: number
  density: number
  height: number
  quality: number
}

const VERTEX_SHADER = `#version 300 es
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
`

const FRAGMENT_SHADER = `#version 300 es
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
`

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex)
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ]
  }
  return [1, 1, 1]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function generateNoiseData(): Uint8Array {
  const size = 256
  const cells = 16
  const data = new Uint8Array(size * size)

  const gradients = new Float32Array(cells * cells * 2)
  for (let i = 0; i < cells * cells; i++) {
    const angle = Math.random() * Math.PI * 2
    gradients[i * 2] = Math.cos(angle)
    gradients[i * 2 + 1] = Math.sin(angle)
  }

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

  const dotGrad = (gx: number, gy: number, dx: number, dy: number) => {
    const idx = (((gy % cells + cells) % cells) * cells + ((gx % cells + cells) % cells)) * 2
    return gradients[idx] * dx + gradients[idx + 1] * dy
  }

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px / size) * cells
      const y = (py / size) * cells
      const x0 = Math.floor(x)
      const y0 = Math.floor(y)
      const dx = x - x0
      const dy = y - y0
      const u = fade(dx)
      const v = fade(dy)

      const n00 = dotGrad(x0, y0, dx, dy)
      const n10 = dotGrad(x0 + 1, y0, dx - 1, dy)
      const n01 = dotGrad(x0, y0 + 1, dx, dy - 1)
      const n11 = dotGrad(x0 + 1, y0 + 1, dx - 1, dy - 1)

      const nx0 = n00 + u * (n10 - n00)
      const nx1 = n01 + u * (n11 - n01)
      const value = nx0 + v * (nx1 - nx0)

      data[py * size + px] = Math.max(0, Math.min(255, ((value / 1.414 + 0.5) * 255) | 0))
    }
  }

  return data
}

function compileShader(gl: WebGL2RenderingContext, source: string, type: number): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

export default function SmokeEffect() {
  const settings = useSettings<Settings>()
  const { width, height } = useViewport()
  const { setValue, onButtonClick } = useSettingsActions()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGL2RenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const noiseTextureRef = useRef<WebGLTexture | null>(null)
  const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({})
  const animationIdRef = useRef<number>(0)
  const startTimeRef = useRef(performance.now())
  const settingsRef = useRef(settings)

  settingsRef.current = settings

  const noiseData = useMemo(() => generateNoiseData(), [])

  const randomizeColors = useCallback(() => {
    const baseHue = Math.random() * 360
    const newColor1 = hslToHex(baseHue, 70 + Math.random() * 30, 20 + Math.random() * 20)
    const newColor2 = hslToHex((baseHue + 30 + Math.random() * 60) % 360, 60 + Math.random() * 40, 35 + Math.random() * 25)
    setValue('color1', newColor1)
    setValue('color2', newColor2)
  }, [setValue])

  useEffect(() => {
    onButtonClick('randomizeColorsBtn', randomizeColors)
  }, [onButtonClick, randomizeColors])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    })

    if (!gl) {
      console.error('WebGL2 not supported')
      return
    }

    glRef.current = gl

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0.0, 0.0, 0.0, 0.0)

    // Create noise texture
    const noiseTexture = gl.createTexture()
    noiseTextureRef.current = noiseTexture
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 256, 256, 0, gl.RED, gl.UNSIGNED_BYTE, noiseData)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    // Compile shaders
    const vertexShader = compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER)
    const fragmentShader = compileShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER)

    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link failed:', gl.getProgramInfoLog(program))
      return
    }

    gl.detachShader(program, vertexShader)
    gl.deleteShader(vertexShader)
    gl.detachShader(program, fragmentShader)
    gl.deleteShader(fragmentShader)

    programRef.current = program
    gl.useProgram(program)

    uniformsRef.current = {
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_color1: gl.getUniformLocation(program, 'u_color1'),
      u_color2: gl.getUniformLocation(program, 'u_color2'),
      u_speed: gl.getUniformLocation(program, 'u_speed'),
      u_origin: gl.getUniformLocation(program, 'u_origin'),
      u_direction: gl.getUniformLocation(program, 'u_direction'),
      u_scale: gl.getUniformLocation(program, 'u_scale'),
      u_brightness: gl.getUniformLocation(program, 'u_brightness'),
      u_opacity: gl.getUniformLocation(program, 'u_opacity'),
      u_detail: gl.getUniformLocation(program, 'u_detail'),
      u_turbulence: gl.getUniformLocation(program, 'u_turbulence'),
      u_density: gl.getUniformLocation(program, 'u_density'),
      u_height: gl.getUniformLocation(program, 'u_height'),
      u_quality: gl.getUniformLocation(program, 'u_quality'),
      u_noiseTexture: gl.getUniformLocation(program, 'u_noiseTexture'),
    }

    // Bind noise texture to unit 0
    gl.uniform1i(uniformsRef.current.u_noiseTexture, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture)

    startTimeRef.current = performance.now()

    const render = () => {
      const currentGl = glRef.current
      const currentProgram = programRef.current
      if (!currentGl || !currentProgram) return

      const s = settingsRef.current
      const canvas = canvasRef.current
      if (!canvas) return

      const quality = s.quality ?? 1.0
      const dpr = (window.devicePixelRatio || 1) * quality
      const w = canvas.clientWidth * dpr
      const h = canvas.clientHeight * dpr

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        currentGl.viewport(0, 0, w, h)
      }

      currentGl.clear(currentGl.COLOR_BUFFER_BIT)

      const u = uniformsRef.current
      const time = (performance.now() - startTimeRef.current) / 1000

      currentGl.uniform1f(u.u_time, time)
      currentGl.uniform2f(u.u_resolution, canvas.width, canvas.height)

      const [r1, g1, b1] = hexToRgb(s.color1)
      const [r2, g2, b2] = hexToRgb(s.color2)
      currentGl.uniform3f(u.u_color1, r1, g1, b1)
      currentGl.uniform3f(u.u_color2, r2, g2, b2)
      currentGl.uniform1f(u.u_speed, s.speed)
      currentGl.uniform1f(u.u_origin, s.origin)
      currentGl.uniform1f(u.u_direction, s.direction)
      currentGl.uniform1f(u.u_scale, s.scale)
      currentGl.uniform1f(u.u_brightness, s.brightness)
      currentGl.uniform1f(u.u_opacity, s.opacity)
      currentGl.uniform1f(u.u_detail, s.detail)
      currentGl.uniform1f(u.u_turbulence, s.turbulence)
      currentGl.uniform1f(u.u_density, s.density)
      currentGl.uniform1f(u.u_height, s.height)
      currentGl.uniform1f(u.u_quality, quality)

      currentGl.drawArrays(currentGl.TRIANGLES, 0, 6)

      animationIdRef.current = requestAnimationFrame(render)
    }

    animationIdRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationIdRef.current)

      if (programRef.current) {
        gl.deleteProgram(programRef.current)
        programRef.current = null
      }
      if (noiseTextureRef.current) {
        gl.deleteTexture(noiseTextureRef.current)
        noiseTextureRef.current = null
      }

      const ext = gl.getExtension('WEBGL_lose_context')
      if (ext) ext.loseContext()

      glRef.current = null
    }
  }, [noiseData])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  )
}
