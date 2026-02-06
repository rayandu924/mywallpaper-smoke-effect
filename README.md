# Smoke Effect Add-on for MyWallpaper

Animated smoke effect with customizable colors and fluid dynamics. Pure WebGL2 shader with Fractal Brownian Motion.

![MyWallpaper Add-on](https://img.shields.io/badge/MyWallpaper-Add--on-purple?style=for-the-badge)
![SDK Version](https://img.shields.io/badge/SDK-2.17.1-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Settings

### Colors
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Primary Color | color | `#FF6B35` | Main smoke color |
| Secondary Color | color | `#FF0000` | Blends with primary |
| Randomize Colors | button | - | Generate harmonious random colors |

### Motion
| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| Speed | 0 - 1 | 0.2 | How fast the smoke moves |
| Origin | 0 - 360 | 0 | Where smoke comes from (0=bottom, 90=left, 180=top, 270=right) |
| Direction | 0 - 360 | 0 | Where smoke travels toward (0=up, 90=right, 180=down, 270=left) |

### Appearance
| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| Scale | 0.2 - 5 | 1.0 | Pattern size (bigger = larger patterns) |
| Opacity | 0 - 1 | 1.0 | Overall transparency |
| Detail | 0 - 3 | 0.75 | Noise complexity (0=blobs, 3=fine details) |
| Turbulence | 0 - 2 | 0.9 | Chaos and distortion |
| Fade | 0.1 - 2 | 1.0 | Gradient sharpness (low = hard edge, high = soft fade) |
| Height | 0.3 - 3 | 1.0 | How far the smoke extends |

## Installation

1. Download or clone this repository
2. In MyWallpaper, go to **Add-ons** > **Install from folder**
3. Select the `mywallpaper-smoke-effect` folder

## Development

```bash
npx serve . -p 3000
# In MyWallpaper: Settings > Developer > Enter http://localhost:3000 > Test
```

## Technical Details

- **WebGL2 only** (`#version 300 es`) - no WebGL1 fallback
- **Fractal Brownian Motion** with variable octaves (2-14 based on detail)
- **Domain warping** for organic smoke movement
- `performance.now()` for sub-millisecond timing precision
- Shader cleanup (`detachShader` + `deleteShader`) after linkage
- Proper lifecycle management (pause/resume/dispose)

## License

MIT License
