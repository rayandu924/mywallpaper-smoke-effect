# 🌫️ Smoke Effect Add-on for MyWallpaper

A mesmerizing, premium-quality animated smoke effect with customizable colors and fluid dynamics. Built with pure WebGL for maximum performance.

![Smoke Effect Preview](https://img.shields.io/badge/MyWallpaper-Add--on-purple?style=for-the-badge)
![SDK Version](https://img.shields.io/badge/SDK-2.7.0+-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## ✨ Features

- **Pure WebGL** - No external libraries, maximum performance
- **6-Octave Fractal Brownian Motion** - Ultra-detailed smoke simulation
- **4 Customizable Colors** - Create any color scheme you want
- **Multiple Flow Directions** - Up, Down, Left, Right, or Spiral
- **Edge Fade Options** - Bottom, Top, Both, Radial Vignette, or None
- **Hot-Reload Support** - See changes instantly
- **Responsive** - Adapts to any screen size

## 🎨 Settings

### Colors
| Setting | Description | Default |
|---------|-------------|---------|
| Primary Color | Main smoke color | `#6e0061` |
| Secondary Color | Blends with primary | `#ad00a1` |
| Accent Color | Highlights and wisps | `#a401d6` |
| Glow Color | Ethereal glow effect | `#4a0080` |

### Animation
| Setting | Range | Default |
|---------|-------|---------|
| Flow Speed | 0.1 - 3.0 | 0.8 |
| Turbulence | 1 - 10 | 4 |
| Smoke Density | 1 - 15 | 8 |

### Effects
| Setting | Options | Default |
|---------|---------|---------|
| Color Intensity | 0.1 - 2.0 | 1.0 |
| Edge Fade | None, Bottom, Top, Both, Radial | Bottom |
| Flow Direction | Up, Down, Left, Right, Spiral | Up |
| Detail Level | 3 - 8 octaves | 6 |

## 🚀 Installation

1. Download or clone this repository
2. In MyWallpaper, go to **Add-ons** → **Install from folder**
3. Select the `mywallpaper-smoke-effect` folder
4. The add-on will appear in your add-ons list

## 🛠️ Development

To test locally:

```bash
# Start a local server
npx serve . -p 3000

# In MyWallpaper:
# Settings → Developer → Enter http://localhost:3000 → Test
```

## 📜 Technical Details

### Shader Techniques Used

- **Quintic Interpolation** - Smoother gradients than standard smoothstep
- **Domain Warping** - Multiple layers of noise warping for organic movement
- **Ridged Noise** - Creates wispy smoke trails
- **Turbulent Noise** - Adds chaotic swirl patterns
- **Film Grain** - Subtle organic texture overlay

### Performance Optimizations

- Cached uniform locations
- High-performance WebGL context
- Proper animation frame management
- Lifecycle pause/resume support

## 🎭 Preset Ideas

### Fire & Ember
- Primary: `#ff4400`
- Secondary: `#ff8800`
- Accent: `#ffcc00`
- Glow: `#ff2200`

### Ocean Mist
- Primary: `#004466`
- Secondary: `#0088aa`
- Accent: `#00ccff`
- Glow: `#002244`

### Aurora Borealis
- Primary: `#00ff88`
- Secondary: `#00aaff`
- Accent: `#ff00ff`
- Glow: `#004444`

### Mystical Purple (Default)
- Primary: `#6e0061`
- Secondary: `#ad00a1`
- Accent: `#a401d6`
- Glow: `#4a0080`

## 📄 License

MIT License - Feel free to use, modify, and distribute.

---

Made with 💜 for the MyWallpaper community
