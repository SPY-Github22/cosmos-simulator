/* ═══════════════════════════════════════════════════════════════
   COSMOS — Renderer
   Canvas 2D rendering with glow, trails, starfield, and effects
   ═══════════════════════════════════════════════════════════════ */
window.COSMOS = window.COSMOS || {};

(function (COSMOS) {
    'use strict';

    class Camera {
        constructor() {
            this.x = 0; this.y = 0;
            this.zoom = 1; this.targetZoom = 1;
            this.zoomSpeed = 0.08;
        }
        update() { this.zoom += (this.targetZoom - this.zoom) * this.zoomSpeed; }
        zoomAt(factor, mx, my, cv) {
            const oldZoom = this.zoom;
            const worldBefore = this.s2w(mx, my, cv);
            this.targetZoom = Math.max(0.05, Math.min(20, this.targetZoom * factor));
            // Immediately snap zoom so pan correction is accurate
            this.zoom = this.targetZoom;
            const worldAfter = this.s2w(mx, my, cv);
            this.x -= worldAfter.x - worldBefore.x;
            this.y -= worldAfter.y - worldBefore.y;
            // Restore zoom so it lerps smoothly from old to target
            this.zoom = oldZoom;
        }
        w2s(wx, wy, cv) {
            return { x: (wx - this.x) * this.zoom + cv.width / 2, y: (wy - this.y) * this.zoom + cv.height / 2 };
        }
        s2w(sx, sy, cv) {
            return { x: (sx - cv.width / 2) / this.zoom + this.x, y: (sy - cv.height / 2) / this.zoom + this.y };
        }
    }

    class Renderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.w = 0; this.h = 0;
            this.camera = new Camera();
            this.trailCanvas = document.createElement('canvas');
            this.trailCtx = this.trailCanvas.getContext('2d');
            this.stars = []; this.nebulae = []; this.effects = [];
            this.gravWaves = [];
            this.showGrid = false; this.trailAlpha = 0.06; this.showTrails = true;
            this.showMinimap = true; this.showVectors = false;
            this.spawnPreview = null;
            this.selectedParticle = null;
            this.orbitPrediction = [];
            this.shake = { x: 0, y: 0, intensity: 0 };
            this.resize();
        }

        resize() {
            this.w = window.innerWidth; this.h = window.innerHeight;
            this.canvas.width = this.w; this.canvas.height = this.h;
            this.trailCanvas.width = this.w; this.trailCanvas.height = this.h;
            this._genStars(); this._genNebulae();
        }

        _genStars() {
            this.stars = [];
            const layers = [
                { n: 300, s0: 0.3, s1: 0.8, a0: 0.15, a1: 0.35, p: 0.02 },
                { n: 150, s0: 0.6, s1: 1.2, a0: 0.3, a1: 0.6, p: 0.05 },
                { n: 60, s0: 1.0, s1: 2.0, a0: 0.5, a1: 0.9, p: 0.1 }
            ];
            for (const l of layers) for (let i = 0; i < l.n; i++) {
                const hue = Math.random() < 0.15 ? 200 + Math.random() * 60 : (Math.random() < 0.1 ? 30 + Math.random() * 30 : 0);
                this.stars.push({
                    x: Math.random() * this.w, y: Math.random() * this.h,
                    sz: l.s0 + Math.random() * (l.s1 - l.s0), al: l.a0 + Math.random() * (l.a1 - l.a0),
                    px: l.p, tw: 0.5 + Math.random() * 2, to: Math.random() * 6.28,
                    hue, sat: hue ? 30 + Math.random() * 40 : 0
                });
            }
        }

        _genNebulae() {
            this.nebulae = [];
            const cs = [[60, 10, 120], [10, 40, 100], [80, 5, 60], [5, 50, 80], [100, 20, 30]];
            for (let i = 0; i < 4; i++) {
                const c = cs[Math.floor(Math.random() * cs.length)];
                this.nebulae.push({ x: Math.random() * this.w, y: Math.random() * this.h, r: 200 + Math.random() * 400, c, a: 0.03 + Math.random() * 0.04 });
            }
        }

        addEffect(x, y, mass) {
            const c = COSMOS.Particle.colorFromMass(mass);
            this.effects.push({ x, y, mr: Math.pow(mass, 0.3) * 20, r: c.r, g: c.g, b: c.b, age: 0, life: 40 });
        }

        setSpawnPreview(sx, sy, ex, ey, mass) { this.spawnPreview = { sx, sy, ex, ey, mass }; }
        clearSpawnPreview() { this.spawnPreview = null; }

        render(particles, time) {
            const ctx = this.ctx, w = this.w, h = this.h, cam = this.camera;
            cam.update();

            ctx.fillStyle = '#060611';
            ctx.fillRect(0, 0, w, h);

            // Screen shake
            let shaking = false;
            if (this.shake.intensity > 0.5) {
                this.shake.x = (Math.random() - 0.5) * this.shake.intensity;
                this.shake.y = (Math.random() - 0.5) * this.shake.intensity;
                this.shake.intensity *= 0.88;
                ctx.save(); ctx.translate(this.shake.x, this.shake.y);
                shaking = true;
            } else { this.shake.intensity = 0; }

            // Nebulae
            for (const n of this.nebulae) {
                const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
                g.addColorStop(0, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},${n.a})`);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
            }

            // Starfield
            for (const s of this.stars) {
                const tw = 0.5 + 0.5 * Math.sin(time * s.tw + s.to);
                const a = s.al * (0.6 + 0.4 * tw);
                const px = ((s.x - cam.x * s.px) % w + w) % w;
                const py = ((s.y - cam.y * s.px) % h + h) % h;
                ctx.fillStyle = s.sat ? `hsla(${s.hue},${s.sat}%,80%,${a})` : `rgba(255,255,255,${a})`;
                ctx.beginPath(); ctx.arc(px, py, s.sz, 0, 6.28); ctx.fill();
            }

            // Trails
            if (this.showTrails) {
                const tc = this.trailCtx;
                tc.fillStyle = `rgba(6,6,17,${this.trailAlpha})`;
                tc.fillRect(0, 0, w, h);
                for (const p of particles) {
                    if (!p.alive) continue;
                    const sp = cam.w2s(p.x, p.y, this.canvas);
                    if (sp.x < -50 || sp.x > w + 50 || sp.y < -50 || sp.y > h + 50) continue;
                    tc.fillStyle = `rgba(${p.r},${p.g},${p.b},0.6)`;
                    tc.beginPath(); tc.arc(sp.x, sp.y, Math.max(p.radius * cam.zoom * 0.5, 0.5), 0, 6.28); tc.fill();
                }
                ctx.globalAlpha = 0.8;
                ctx.drawImage(this.trailCanvas, 0, 0);
                ctx.globalAlpha = 1;
            }

            // Grid
            if (this.showGrid) this._drawGrid(ctx, w, h, cam);

            // Particles with glow (black holes rendered differently)
            ctx.globalCompositeOperation = 'lighter';
            for (const p of particles) {
                if (!p.alive) continue;
                const sp = cam.w2s(p.x, p.y, this.canvas);
                const sr = Math.max(p.radius * cam.zoom, 0.8);
                if (sp.x < -100 || sp.x > w + 100 || sp.y < -100 || sp.y > h + 100) continue;

                if (p.mass > 200 && this._drawBlackHole) {
                    ctx.globalCompositeOperation = 'source-over';
                    this._drawBlackHole(ctx, sp, p, cam.zoom);
                    ctx.globalCompositeOperation = 'lighter';
                    continue;
                }

                const gr = sr * 4;
                const glow = ctx.createRadialGradient(sp.x, sp.y, sr * 0.5, sp.x, sp.y, gr);
                glow.addColorStop(0, `rgba(${p.r},${p.g},${p.b},0.3)`);
                glow.addColorStop(0.5, `rgba(${p.r},${p.g},${p.b},0.06)`);
                glow.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
                ctx.fillStyle = glow;
                ctx.beginPath(); ctx.arc(sp.x, sp.y, gr, 0, 6.28); ctx.fill();

                const core = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sr);
                core.addColorStop(0, 'rgba(255,255,255,0.9)');
                core.addColorStop(0.4, `rgba(${p.r},${p.g},${p.b},0.8)`);
                core.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0.2)`);
                ctx.fillStyle = core;
                ctx.beginPath(); ctx.arc(sp.x, sp.y, sr, 0, 6.28); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';

            // Effects
            this._drawFx(ctx, cam, w, h);

            // V2 Effects (from effects.js)
            if (this._drawGravWaves) this._drawGravWaves(ctx, cam, w, h);
            if (this.showVectors && this._drawVelocityVectors) this._drawVelocityVectors(ctx, particles, cam, w, h);
            if (this._drawOrbitPrediction) this._drawOrbitPrediction(ctx, cam);
            if (this.selectedParticle && this._drawSelectedHighlight) this._drawSelectedHighlight(ctx, cam, this.selectedParticle);

            // Spawn preview
            if (this.spawnPreview) this._drawPreview(ctx);

            // Minimap (always on top)
            if (this.showMinimap && this._drawMinimap) this._drawMinimap(ctx, particles, w, h);

            // Restore shake
            if (shaking) ctx.restore();
        }

        _drawGrid(ctx, w, h, cam) {
            ctx.strokeStyle = 'rgba(100,130,255,0.06)'; ctx.lineWidth = 1;
            let sp = 100;
            if (cam.zoom < 0.3) sp = 500; else if (cam.zoom < 0.8) sp = 200; else if (cam.zoom > 3) sp = 50;
            const s0 = cam.s2w(0, 0, this.canvas), s1 = cam.s2w(w, h, this.canvas);
            ctx.beginPath();
            for (let wx = Math.floor(s0.x / sp) * sp; wx < s1.x; wx += sp) { const p = cam.w2s(wx, 0, this.canvas); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, h); }
            for (let wy = Math.floor(s0.y / sp) * sp; wy < s1.y; wy += sp) { const p = cam.w2s(0, wy, this.canvas); ctx.moveTo(0, p.y); ctx.lineTo(w, p.y); }
            ctx.stroke();
        }

        _drawFx(ctx, cam, w, h) {
            ctx.globalCompositeOperation = 'lighter';
            for (let i = this.effects.length - 1; i >= 0; i--) {
                const e = this.effects[i]; e.age++;
                const t = e.age / e.life;
                if (e.age >= e.life) { this.effects.splice(i, 1); continue; }
                const sp = cam.w2s(e.x, e.y, this.canvas);
                const sr = e.mr * Math.pow(t, 0.4) * cam.zoom;
                if (sp.x < -200 || sp.x > w + 200 || sp.y < -200 || sp.y > h + 200) continue;
                const op = (1 - t) * (1 - t);
                const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sr);
                g.addColorStop(0, `rgba(255,255,255,${op * 0.8})`);
                g.addColorStop(0.2, `rgba(${e.r},${e.g},${e.b},${op * 0.5})`);
                g.addColorStop(1, `rgba(${e.r},${e.g},${e.b},0)`);
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sp.x, sp.y, sr, 0, 6.28); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        _drawPreview(ctx) {
            const p = this.spawnPreview;
            const dx = p.ex - p.sx, dy = p.ey - p.sy, dist = Math.sqrt(dx * dx + dy * dy);
            ctx.strokeStyle = 'rgba(0,212,255,0.5)'; ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(p.ex, p.ey); ctx.stroke();
            ctx.setLineDash([]);
            if (dist > 15) {
                const a = Math.atan2(dy, dx);
                ctx.beginPath();
                ctx.moveTo(p.ex, p.ey); ctx.lineTo(p.ex - 10 * Math.cos(a - 0.4), p.ey - 10 * Math.sin(a - 0.4));
                ctx.moveTo(p.ex, p.ey); ctx.lineTo(p.ex - 10 * Math.cos(a + 0.4), p.ey - 10 * Math.sin(a + 0.4));
                ctx.stroke();
            }
            const r = Math.pow(p.mass, 0.35) * 1.5 * this.camera.zoom;
            const col = COSMOS.Particle.colorFromMass(p.mass);
            const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 3);
            g.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0.6)`);
            g.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`);
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 3, 0, 6.28); ctx.fill();
            ctx.fillStyle = 'rgba(0,212,255,0.7)'; ctx.font = '11px Inter,sans-serif';
            ctx.fillText(`v=${(dist / 50).toFixed(1)}`, p.ex + 10, p.ey - 10);
        }
    }

    COSMOS.Camera = Camera;
    COSMOS.Renderer = Renderer;
})(window.COSMOS);
