// 🌫️ SMOKE SHADER ADDON - WebGL Smoke Effect
class SmokeShaderAddon {
    constructor() {
        this.canvas = document.getElementById('smokeCanvas');
        this.gl = null;
        this.program = null;
        this.startTime = Date.now();
        this.isFirstRender = true;
        this.animationId = null;

        // ✅ Read pre-injected config from MyWallpaper SDK 2.13.0
        // Uses double underscores: __MYWALLPAPER_LAYER_ID__ and __MYWALLPAPER_INITIAL_CONFIG__
        this.layerId = window.__MYWALLPAPER_LAYER_ID__ || '';
        const config = window.__MYWALLPAPER_INITIAL_CONFIG__ || {};

        // Default settings merged with pre-injected config
        this.settings = {
            color1: config.color1 ?? '#6e0061',
            color2: config.color2 ?? '#ad00a1',
            color3: config.color3 ?? '#a401d6',
            color4: config.color4 ?? '#4a0080',
            intensity: config.intensity ?? 0.9,
            speed: config.speed ?? 0.2,
            density: config.density ?? 7.0,
            turbulence: config.turbulence ?? 0.9,
            fadeEdge: config.fadeEdge ?? 'bottom',
            direction: config.direction ?? 'up'
        };

        this.init();
        console.log('🌫️ Smoke Shader initialized with config:', this.settings);
    }

    init() {
        console.log('🌫️ Smoke Shader Addon initializing...');
        this.setupWebGL();
        this.setupEventListeners();
        this.createShaderProgram();
        this.render();
    }

    setupEventListeners() {
        // Listen for settings updates from MyWallpaper via postMessage
        window.addEventListener('message', (event) => {
            const data = event.data;
            if (!data) return;

            // Handle settings updates (SDK 2.13.0 format)
            if (data.type === 'SETTINGS_UPDATE' && data.settings) {
                this.updateSettings(data.settings);
            }
            // Also handle SETTINGS_PREVIEW for live updates
            if (data.type === 'SETTINGS_PREVIEW' && data.settings) {
                this.updateSettings(data.settings);
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.resize();
        });
    }

    updateSettings(newSettings) {
        console.log('🔧 Updating smoke shader settings:', newSettings);
        Object.assign(this.settings, newSettings);
    }

    setupWebGL() {
        this.gl = this.canvas.getContext('webgl2', {
            alpha: true,
            premultipliedAlpha: false,
            antialias: true
        });

        if (!this.gl) {
            // Fallback to WebGL1
            this.gl = this.canvas.getContext('webgl', {
                alpha: true,
                premultipliedAlpha: false,
                antialias: true
            });
        }

        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);

        this.resize();
    }

    resize() {
        if (!this.canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const displayWidth = this.canvas.clientWidth * dpr;
        const displayHeight = this.canvas.clientHeight * dpr;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;

            if (this.gl) {
                this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }

    createShaderProgram() {
        const gl = this.gl;
        if (!gl) return;

        const vertexShaderSource = `#version 300 es
            precision mediump float;
            const vec2 positions[6] = vec2[6](
                vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
                vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0)
            );
            out vec2 uv;
            void main() {
                uv = positions[gl_VertexID];
                gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
            }`;

        const fragmentShaderSource = `#version 300 es
            precision highp float;

            uniform float time;
            uniform vec2 resolution;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform vec3 color3;
            uniform vec3 color4;
            uniform float intensity;
            uniform float speed;
            uniform float scale;
            uniform float turbulence;
            uniform int fadeEdge;
            uniform int direction;

            in vec2 uv;
            out vec4 fragColor;

            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }

            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);

                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));

                vec2 u = f * f * (3.0 - 2.0 * f);

                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }

            #define OCTAVES 5
            float fbm(vec2 st) {
                float value = 0.0;
                float amplitude = 0.4;
                vec2 freq = st;

                for (int i = 0; i < OCTAVES; i++) {
                    value += amplitude * noise(freq);
                    freq *= 2.0;
                    amplitude *= 0.4;
                }
                return value;
            }

            float getFade(vec2 st) {
                float y = (st.y + 1.0) * 0.5;
                if (fadeEdge == 0) return 1.0;
                if (fadeEdge == 1) return smoothstep(0.0, 0.5, y);
                if (fadeEdge == 2) return smoothstep(1.0, 0.5, y);
                if (fadeEdge == 3) return smoothstep(0.0, 0.3, y) * smoothstep(1.0, 0.7, y);
                float dist = length(st);
                return 1.0 - smoothstep(0.3, 1.0, dist);
            }

            void main() {
                vec2 st = uv;

                float aspectRatio = resolution.x / resolution.y;
                st.x *= aspectRatio;

                vec2 movement = vec2(0.0);
                if (direction == 0) movement = vec2(0.0, time * speed);
                else if (direction == 1) movement = vec2(0.0, -time * speed);
                else if (direction == 2) movement = vec2(time * speed, 0.0);
                else if (direction == 3) movement = vec2(-time * speed, 0.0);
                else movement = vec2(sin(time * 0.5) * speed, cos(time * 0.5) * speed) * time * 0.3;

                vec2 smokeCoords = vec2(st.x, st.y - movement.y) * scale + movement;

                float gradient = mix(st.y * 0.3, st.y * 0.7, fbm(smokeCoords));

                float noise1 = fbm(smokeCoords);
                float noise2 = turbulence * fbm(smokeCoords + noise1 + time) - 0.5;

                float finalNoise = turbulence * fbm(vec2(noise1, noise2));
                float smokeIntensity = fbm(vec2(noise2, noise1));

                vec3 baseColor = mix(color1, color2, smokeIntensity);
                vec3 accentColor = mix(color3, color4, finalNoise);
                vec3 finalColor = mix(baseColor, accentColor, noise1 * 0.5 + 0.25);

                finalColor *= intensity;

                float smokeAlpha = smoothstep(0.0, 1.0, (smokeIntensity - gradient + 0.3));
                smokeAlpha *= getFade(uv);

                fragColor = vec4(finalColor, smokeAlpha);
            }`;

        const vertexShader = this.compileShader(vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

        if (!vertexShader || !fragmentShader) return;

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link failed:', gl.getProgramInfoLog(this.program));
            return;
        }

        gl.useProgram(this.program);

        this.uniforms = {
            time: gl.getUniformLocation(this.program, 'time'),
            resolution: gl.getUniformLocation(this.program, 'resolution'),
            color1: gl.getUniformLocation(this.program, 'color1'),
            color2: gl.getUniformLocation(this.program, 'color2'),
            color3: gl.getUniformLocation(this.program, 'color3'),
            color4: gl.getUniformLocation(this.program, 'color4'),
            intensity: gl.getUniformLocation(this.program, 'intensity'),
            speed: gl.getUniformLocation(this.program, 'speed'),
            scale: gl.getUniformLocation(this.program, 'scale'),
            turbulence: gl.getUniformLocation(this.program, 'turbulence'),
            fadeEdge: gl.getUniformLocation(this.program, 'fadeEdge'),
            direction: gl.getUniformLocation(this.program, 'direction')
        };

        console.log('🌫️ Shader program created successfully');
    }

    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [1, 1, 1];
    }

    fadeEdgeToInt(value) {
        const map = { none: 0, bottom: 1, top: 2, both: 3, radial: 4 };
        return value in map ? map[value] : 1;
    }

    directionToInt(value) {
        const map = { up: 0, down: 1, left: 2, right: 3, spiral: 4 };
        return value in map ? map[value] : 0;
    }

    render = () => {
        if (!this.gl || !this.program) {
            this.animationId = requestAnimationFrame(this.render);
            return;
        }

        const gl = this.gl;
        const currentTime = (Date.now() - this.startTime) / 1000;

        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform1f(this.uniforms.time, currentTime);
        gl.uniform2fv(this.uniforms.resolution, [this.canvas.width, this.canvas.height]);

        const c1 = this.hexToRgb(this.settings.color1);
        const c2 = this.hexToRgb(this.settings.color2);
        const c3 = this.hexToRgb(this.settings.color3);
        const c4 = this.hexToRgb(this.settings.color4);

        gl.uniform3fv(this.uniforms.color1, c1);
        gl.uniform3fv(this.uniforms.color2, c2);
        gl.uniform3fv(this.uniforms.color3, c3);
        gl.uniform3fv(this.uniforms.color4, c4);

        gl.uniform1f(this.uniforms.intensity, this.settings.intensity);
        gl.uniform1f(this.uniforms.speed, this.settings.speed);
        gl.uniform1f(this.uniforms.scale, this.settings.density);
        gl.uniform1f(this.uniforms.turbulence, this.settings.turbulence);
        gl.uniform1i(this.uniforms.fadeEdge, this.fadeEdgeToInt(this.settings.fadeEdge));
        gl.uniform1i(this.uniforms.direction, this.directionToInt(this.settings.direction));

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Signal ready after first frame
        if (this.isFirstRender) {
            this.isFirstRender = false;

            // Signal via postMessage for older API
            if (this.layerId) {
                window.parent.postMessage({
                    type: 'ADDON_READY',
                    layerId: this.layerId
                }, '*');
            }

            // Signal via MyWallpaper SDK API if available
            if (window.MyWallpaper) {
                window.MyWallpaper.ready({ supportsHotReload: true });
                console.log('✅ Smoke shader ready (SDK API)');
            } else {
                console.log('✅ Smoke shader ready (postMessage)');
            }
        }

        this.animationId = requestAnimationFrame(this.render);
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.program && this.gl) {
            this.gl.deleteProgram(this.program);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.smokeShader = new SmokeShaderAddon();
});
