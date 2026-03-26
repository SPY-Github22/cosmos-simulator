# COSMOS — Interactive Particle Universe Simulator

🌌 **COSMOS** is a high-performance, browser-based gravitational N-body simulation featuring procedural audio, stunning visual effects, and interactive exploration of cosmic phenomena.

Built entirely with vanilla HTML, CSS, and JavaScript (~2,500 lines). No external libraries or game engines.

## 🚀 Features

### Realistic Physics Engine
- **Barnes-Hut Algorithm**: O(n log n) gravity calculation via quadtree, handling 1,000+ particles at 60fps.
- **Velocity Verlet Integration**: Ensures stable orbits and energy conservation over time.
- **Momentum-Conserving Collisions**: Particles merge on impact, forming more massive bodies.

### Stunning Visuals
- **Dynamic Render Pipeline**: Canvas 2D with custom bloom and glow effects based on particle mass and temperature.
- **Black Holes**: Particles exceeding a critical mass collapse into black holes, complete with event horizons, photon rings, and accretion disks.
- **Gravitational Waves**: Massive collisions emit expanding ripples through the fabric of spacetime.
- **Cinematic Effects**: Screen shake, motion trails, deep parallax starfields, and procedural nebulae.

### Interactive Exploration
- **Spawn & Slingshot**: Click to spawn particles or drag to launch them with initial velocity.
- **Mouse Attractor**: Middle-click to create a temporary gravity well to pull nearby bodies.
- **Particle Selection**: Shift-click a particle to view its stats, track its orbit prediction, or lock the camera to follow it.
- **Minimap & Vectors**: Toggle a minimap for a macro-view or display velocity vectors for analytical insight.
- **Cinematic Mode**: Auto-director camera that smoothly tracks the center of mass and adjusts zoom to frame the action.

### Procedural Audio
- **Ambient Music Engine**: Layered drones with LFO modulation and programmatic convolution reverb generated via Web Audio API. 
- **Dynamic Collision Sounds**: Tones vary dynamically based on mass—from high-pitched bells to deep, dramatic bass rumbles.

### Pre-built Scenarios (Presets)
- **Galaxy Collision**
- **Solar System**
- **Protoplanetary Disk**
- **Nebula**
- **Big Bang**
- **Binary Stars**

## 🎮 Controls

| Input / Key | Action |
|-------------|--------|
| `Left Click` | Spawn particle |
| `Drag` | Launch with velocity |
| `Scroll` | Zoom (centered at cursor) |
| `Right Drag` | Pan camera |
| `Middle Click (hold)`| Gravity attractor |
| `Shift + Click` | Select particle |
| `Escape` | Deselect |
| `Space` | Pause / Resume |
| `C` | Toggle Cinematic mode |
| `V` | Toggle Velocity vectors |
| `N` | Toggle Minimap |
| `M` | Mute Audio |
| `G` | Toggle Grid |
| `T` | Toggle Trails |
| `1-7` | Load Presets |
| `Delete` / `Backspace`| Clear all particles |

## 🛠️ Usage / Installation

Since this project uses no build steps or external dependencies, you can simply clone the repository and open `index.html` in your browser.

```bash
git clone https://github.com/yourusername/cosmos-simulator.git
cd cosmos-simulator
```

**Note:** For the procedural audio and best performance, it is highly recommended to run this over a local HTTP server rather than opening the file directly (due to browser CORS/autoplay policies).

```bash
python -m http.server 8888
# Then open http://localhost:8888 in your browser
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
