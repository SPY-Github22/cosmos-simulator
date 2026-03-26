/* ═══════════════════════════════════════════════════════════════
   COSMOS V2 — Main Application
   App loop, input handling, selection, cinematic mode, attractor
   ═══════════════════════════════════════════════════════════════ */
window.COSMOS = window.COSMOS || {};

(function (COSMOS) {
    'use strict';
    const { PhysicsEngine, Renderer, AudioEngine, Presets, UIManager } = COSMOS;

    class App {
        constructor() {
            this.physics = new PhysicsEngine();
            this.renderer = null;
            this.audio = new AudioEngine();
            this.ui = new UIManager();
            this.paused = false;
            this.timeScale = 1;
            this.simTime = 0;
            this.lastTime = 0;
            this.fpsFrames = 0;
            this.fpsTime = 0;
            this.fps = 0;
            this.mouse = { x: 0, y: 0, down: false, button: 0, sx: 0, sy: 0 };
            this.isPanning = false;
            this.isSpawning = false;
            this.audioInitialized = false;
            // V2
            this.selectedParticle = null;
            this.cinematicMode = false;
            this.followMode = false;
            this.isAttracting = false;
            this.orbitTick = 0;
        }

        init() {
            const canvas = document.getElementById('cosmos-canvas');
            this.renderer = new Renderer(canvas);
            this.ui.init();
            this.ui.onPreset = p => this.loadPreset(p);
            this.ui.onPause = p => { this.paused = p; };
            this.ui.onClear = () => this._clearAll();
            this.ui.onGridToggle = on => { this.renderer.showGrid = on; };
            this.ui.onMuteToggle = () => { this.audio.toggleMute(); };
            this.ui.onCinemaToggle = on => { this.cinematicMode = on; };
            this.ui.onVectorsToggle = on => { this.renderer.showVectors = on; };
            this.ui.onFollow = on => { this.followMode = on; };
            this.ui.onDeleteSelected = () => {
                if (this.selectedParticle) { this.selectedParticle.alive = false; this._deselect(); }
            };
            this._setupInput(canvas);
            setTimeout(() => { this.loadPreset('galaxy'); this.ui.hideLoading(); this.lastTime = performance.now(); requestAnimationFrame(t => this._loop(t)); }, 1800);
        }

        _clearAll() {
            this.physics.clear(); this.simTime = 0;
            this.renderer.trailCtx.clearRect(0, 0, this.renderer.w, this.renderer.h);
            this.renderer.effects = []; this.renderer.gravWaves = [];
            this._deselect();
        }

        loadPreset(name) {
            this._clearAll();
            const cam = this.renderer.camera;
            cam.x = 0; cam.y = 0; cam.zoom = 1; cam.targetZoom = 1;
            const G = this.ui.getGravity();
            let data;
            switch (name) {
                case 'galaxy': data = Presets.galaxy(G); break;
                case 'solar': data = Presets.solar(G); cam.targetZoom = 0.6; break;
                case 'nebula': data = Presets.nebula(); break;
                case 'bigbang': data = Presets.bigbang(); cam.targetZoom = 0.5; break;
                case 'binary': data = Presets.binary(G); cam.targetZoom = 0.4; break;
                case 'proto': data = Presets.proto(G); cam.targetZoom = 0.5; break;
                case 'custom': data = Presets.custom(); break;
                default: data = Presets.galaxy(G);
            }
            for (const d of data) this.physics.addParticle(d.x, d.y, d.vx, d.vy, d.mass);
        }

        _deselect() {
            this.selectedParticle = null;
            this.renderer.selectedParticle = null;
            this.renderer.orbitPrediction = [];
            this.followMode = false;
            this.ui.hideInfo();
        }

        _select(particle) {
            this.selectedParticle = particle;
            this.renderer.selectedParticle = particle;
            this.ui.showInfo(particle);
        }

        // ── Input ──────────────────────────────────────────────────
        _setupInput(canvas) {
            canvas.addEventListener('mousedown', e => this._onDown(e));
            canvas.addEventListener('mousemove', e => this._onMove(e));
            canvas.addEventListener('mouseup', e => this._onUp(e));
            canvas.addEventListener('wheel', e => { e.preventDefault(); this.renderer.camera.zoomAt(e.deltaY > 0 ? 0.9 : 1.1, e.clientX, e.clientY, this.renderer.canvas); }, { passive: false });
            canvas.addEventListener('contextmenu', e => e.preventDefault());
            // Touch
            canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; this._onDown({ clientX: t.clientX, clientY: t.clientY, button: 0 }); }, { passive: false });
            canvas.addEventListener('touchmove', e => { e.preventDefault(); const t = e.touches[0]; this._onMove({ clientX: t.clientX, clientY: t.clientY }); }, { passive: false });
            canvas.addEventListener('touchend', e => { e.preventDefault(); this._onUp({}); });
            document.addEventListener('keydown', e => this._onKey(e));
            window.addEventListener('resize', () => this.renderer.resize());
            const initAudio = () => { if (!this.audioInitialized) { this.audio.init(); this.audioInitialized = true; } this.audio.resume(); };
            canvas.addEventListener('mousedown', initAudio);
        }

        _onDown(e) {
            this.mouse.down = true;
            this.mouse.button = e.button || 0;
            this.mouse.sx = e.clientX; this.mouse.sy = e.clientY;
            this.mouse.x = e.clientX; this.mouse.y = e.clientY;

            if (e.button === 2) { this.isPanning = true; return; }
            if (e.button === 1) { // Middle click = attractor
                e.preventDefault && e.preventDefault();
                this.isAttracting = true;
                const w = this.renderer.camera.s2w(e.clientX, e.clientY, this.renderer.canvas);
                this.physics.attractor = { x: w.x, y: w.y, mass: 800 };
                return;
            }
            // Shift+click = select
            if (e.shiftKey) {
                const hit = this._findParticleAt(e.clientX, e.clientY);
                if (hit) { this._select(hit); } else { this._deselect(); }
                return;
            }
            this.isSpawning = true;
        }

        _onMove(e) {
            const mx = e.clientX, my = e.clientY;
            if (this.isPanning) {
                const dz = this.renderer.camera.zoom;
                this.renderer.camera.x -= (mx - this.mouse.x) / dz;
                this.renderer.camera.y -= (my - this.mouse.y) / dz;
            }
            if (this.isSpawning) this.renderer.setSpawnPreview(this.mouse.sx, this.mouse.sy, mx, my, this.ui.getMass());
            if (this.isAttracting) {
                const w = this.renderer.camera.s2w(mx, my, this.renderer.canvas);
                this.physics.attractor = { x: w.x, y: w.y, mass: 800 };
            }
            this.mouse.x = mx; this.mouse.y = my;
        }

        _onUp(e) {
            if (this.isSpawning) {
                const dx = this.mouse.x - this.mouse.sx, dy = this.mouse.y - this.mouse.sy;
                const w = this.renderer.camera.s2w(this.mouse.sx, this.mouse.sy, this.renderer.canvas);
                const vs = 0.02 / this.renderer.camera.zoom;
                this.physics.addParticle(w.x, w.y, dx * vs, dy * vs, this.ui.getMass());
                this.renderer.clearSpawnPreview();
            }
            if (this.isAttracting) this.physics.attractor = null;
            this.mouse.down = false;
            this.isPanning = false;
            this.isSpawning = false;
            this.isAttracting = false;
        }

        _onKey(e) {
            if (e.target.tagName === 'INPUT') return;
            switch (e.code) {
                case 'Space': e.preventDefault(); this.ui.togglePause(); break;
                case 'KeyG': this.ui.toggleGrid(); break;
                case 'KeyM': this.ui.toggleMute(); break;
                case 'KeyC': this.ui.toggleCinema(); break;
                case 'KeyV': this.ui.toggleVectors(); break;
                case 'KeyN': this.renderer.showMinimap = !this.renderer.showMinimap; break;
                case 'KeyT':
                    this.renderer.showTrails = !this.renderer.showTrails;
                    if (!this.renderer.showTrails) this.renderer.trailCtx.clearRect(0, 0, this.renderer.w, this.renderer.h);
                    break;
                case 'KeyR':
                    const active = document.querySelector('.preset-btn.active');
                    this.loadPreset(active ? active.dataset.preset : 'galaxy'); break;
                case 'Escape': this._deselect(); break;
                case 'Delete': case 'Backspace':
                    if (document.activeElement === document.body) { e.preventDefault(); this._clearAll(); } break;
                case 'Digit1': this.loadPreset('galaxy'); break;
                case 'Digit2': this.loadPreset('solar'); break;
                case 'Digit3': this.loadPreset('nebula'); break;
                case 'Digit4': this.loadPreset('bigbang'); break;
                case 'Digit5': this.loadPreset('binary'); break;
                case 'Digit6': this.loadPreset('proto'); break;
                case 'Digit7': this.loadPreset('custom'); break;
            }
        }

        // ── Selection ──────────────────────────────────────────────
        _findParticleAt(sx, sy) {
            let closest = null, best = Infinity;
            for (const p of this.physics.particles) {
                if (!p.alive) continue;
                const sp = this.renderer.camera.w2s(p.x, p.y, this.renderer.canvas);
                const d = Math.hypot(sp.x - sx, sp.y - sy);
                const hitR = Math.max(p.radius * this.renderer.camera.zoom, 12);
                if (d < hitR && d < best) { closest = p; best = d; }
            }
            return closest;
        }

        _computeOrbit() {
            if (!this.selectedParticle || !this.selectedParticle.alive) {
                this.renderer.orbitPrediction = []; return;
            }
            const sel = this.selectedParticle;
            const bodies = this.physics.particles.filter(p => p !== sel && p.mass > 5)
                .sort((a, b) => b.mass - a.mass).slice(0, 5);
            let px = sel.x, py = sel.y, vx = sel.vx, vy = sel.vy;
            const G = this.physics.G, pts = [], dt = 0.5;
            for (let s = 0; s < 200; s++) {
                let ax = 0, ay = 0;
                for (const b of bodies) {
                    const dx = b.x - px, dy = b.y - py;
                    const dSq = dx * dx + dy * dy + 64;
                    const dist = Math.sqrt(dSq);
                    ax += G * b.mass * dx / (dSq * dist);
                    ay += G * b.mass * dy / (dSq * dist);
                }
                vx += ax * dt; vy += ay * dt; px += vx * dt; py += vy * dt;
                if (s % 3 === 0) pts.push({ x: px, y: py });
            }
            this.renderer.orbitPrediction = pts;
        }

        // ── Cinematic ──────────────────────────────────────────────
        _updateCinematic() {
            if (!this.cinematicMode) return;
            const ps = this.physics.particles;
            if (ps.length === 0) return;
            let cmx = 0, cmy = 0, tm = 0;
            for (const p of ps) { cmx += p.x * p.mass; cmy += p.y * p.mass; tm += p.mass; }
            cmx /= tm; cmy /= tm;
            const cam = this.renderer.camera;
            cam.x += (cmx - cam.x) * 0.015;
            cam.y += (cmy - cam.y) * 0.015;
            let maxD = 0;
            for (const p of ps) maxD = Math.max(maxD, Math.hypot(p.x - cmx, p.y - cmy));
            const tz = Math.min(2, Math.max(0.15, Math.min(this.renderer.w, this.renderer.h) / (maxD * 3 + 100)));
            cam.targetZoom += (tz - cam.targetZoom) * 0.008;
        }

        // ── Game Loop ──────────────────────────────────────────────
        _loop(now) {
            requestAnimationFrame(t => this._loop(t));
            const rawDt = Math.min((now - this.lastTime) / 1000, 0.05);
            this.lastTime = now;
            this.fpsFrames++;
            this.fpsTime += rawDt;
            if (this.fpsTime >= 0.5) { this.fps = Math.round(this.fpsFrames / this.fpsTime); this.fpsFrames = 0; this.fpsTime = 0; }

            this.timeScale = this.ui.getTimeScale();
            this.physics.G = this.ui.getGravity();
            this.renderer.trailAlpha = this.ui.getTrailAlpha();

            if (!this.paused) {
                const dt = rawDt * this.timeScale;
                const steps = Math.ceil(this.timeScale);
                const subDt = dt / steps;
                for (let s = 0; s < steps; s++) this.physics.step(subDt);
                this.simTime += dt;

                for (const evt of this.physics.mergeEvents) {
                    this.renderer.addEffect(evt.x, evt.y, evt.mass);
                    this.audio.onMerge(evt.mass);
                    // V2: gravitational waves + screen shake for big merges
                    if (evt.mass > 50 && this.renderer.addGravWave) this.renderer.addGravWave(evt.x, evt.y, evt.mass);
                    if (evt.mass > 100 && this.renderer.triggerShake) this.renderer.triggerShake(Math.min(evt.mass / 30, 15));
                }
            }

            // V2: Cinematic auto-camera
            this._updateCinematic();

            // V2: Follow selected
            if (this.followMode && this.selectedParticle && this.selectedParticle.alive) {
                const cam = this.renderer.camera;
                cam.x += (this.selectedParticle.x - cam.x) * 0.08;
                cam.y += (this.selectedParticle.y - cam.y) * 0.08;
            }

            // V2: Check selection still alive
            if (this.selectedParticle && !this.selectedParticle.alive) this._deselect();

            // V2: Orbit prediction (every 5 frames to save perf)
            this.orbitTick++;
            if (this.orbitTick % 5 === 0) this._computeOrbit();

            // V2: Update info panel
            if (this.selectedParticle) this.ui.updateInfo(this.selectedParticle);

            this.renderer.render(this.physics.particles, now / 1000);
            const stats = this.physics.getStats();
            this.ui.updateStats(stats.count, stats.totalMass, stats.energy, this.fps, this.simTime);
        }
    }

    document.addEventListener('DOMContentLoaded', () => { const app = new App(); app.init(); window.cosmosApp = app; });
})(window.COSMOS);
