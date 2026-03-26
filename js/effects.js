/* ═══════════════════════════════════════════════════════════════
   COSMOS — Visual Effects Module
   Black holes, gravitational waves, minimap, velocity vectors,
   orbit prediction, screen shake, selection highlight
   ═══════════════════════════════════════════════════════════════ */
window.COSMOS = window.COSMOS || {};

(function (COSMOS) {
    'use strict';
    const R = COSMOS.Renderer.prototype;

    // ── Gravitational Waves ──────────────────────────────────────
    R.addGravWave = function (x, y, mass) {
        this.gravWaves.push({ x, y, maxR: Math.pow(mass, 0.5) * 30, age: 0, life: 80 });
    };

    R.triggerShake = function (intensity) {
        this.shake.intensity = Math.max(this.shake.intensity, intensity);
    };

    // ── Black Hole Rendering ─────────────────────────────────────
    R._drawBlackHole = function (ctx, sp, p, zoom) {
        const eh = Math.pow(p.mass, 0.4) * zoom * 1.2;

        // Accretion disk glow
        const ag = ctx.createRadialGradient(sp.x, sp.y, eh, sp.x, sp.y, eh * 4);
        ag.addColorStop(0, 'rgba(255,140,20,0.35)');
        ag.addColorStop(0.4, 'rgba(200,60,255,0.12)');
        ag.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ag;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, eh * 4, 0, 6.28); ctx.fill();

        // Photon ring
        ctx.strokeStyle = 'rgba(255,200,100,0.5)';
        ctx.lineWidth = Math.max(1.5, eh * 0.15);
        ctx.beginPath(); ctx.arc(sp.x, sp.y, eh * 1.6, 0, 6.28); ctx.stroke();

        // Distortion rings
        for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = `rgba(120,160,255,${0.12 - i * 0.03})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.arc(sp.x, sp.y, eh * (2.2 + i * 0.7), 0, 6.28); ctx.stroke();
        }

        // Event horizon (dark core)
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(sp.x, sp.y, eh, 0, 6.28); ctx.fill();

        // Thin bright edge
        ctx.strokeStyle = 'rgba(180,220,255,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, eh, 0, 6.28); ctx.stroke();
    };

    // ── Gravitational Wave Ripples ───────────────────────────────
    R._drawGravWaves = function (ctx, cam, w, h) {
        for (let i = this.gravWaves.length - 1; i >= 0; i--) {
            const gw = this.gravWaves[i];
            gw.age++;
            if (gw.age >= gw.life) { this.gravWaves.splice(i, 1); continue; }
            const t = gw.age / gw.life;
            const sp = cam.w2s(gw.x, gw.y, this.canvas);
            const sr = gw.maxR * t * cam.zoom;
            if (sp.x < -sr || sp.x > w + sr || sp.y < -sr || sp.y > h + sr) continue;
            const op = 0.35 * (1 - t) * (1 - t);
            const lw = Math.max(1, 6 * (1 - t));
            ctx.strokeStyle = `rgba(140,170,255,${op})`;
            ctx.lineWidth = lw;
            ctx.beginPath(); ctx.arc(sp.x, sp.y, sr, 0, 6.28); ctx.stroke();
            if (sr > 10) {
                ctx.strokeStyle = `rgba(140,170,255,${op * 0.5})`;
                ctx.lineWidth = lw * 0.5;
                ctx.beginPath(); ctx.arc(sp.x, sp.y, sr * 0.7, 0, 6.28); ctx.stroke();
            }
        }
    };

    // ── Minimap ──────────────────────────────────────────────────
    R._drawMinimap = function (ctx, particles, w, h) {
        const sz = 140, mg = 15;
        const mx = w - sz - mg, my = h - sz - mg;
        ctx.fillStyle = 'rgba(8,8,25,0.75)';
        ctx.strokeStyle = 'rgba(100,130,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(mx, my, sz, sz, 8);
        else ctx.rect(mx, my, sz, sz);
        ctx.fill(); ctx.stroke();
        if (particles.length === 0) return;

        let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
        for (const p of particles) {
            if (p.x < bx0) bx0 = p.x; if (p.x > bx1) bx1 = p.x;
            if (p.y < by0) by0 = p.y; if (p.y > by1) by1 = p.y;
        }
        const range = Math.max(bx1 - bx0, by1 - by0, 200) * 1.2;
        const ccx = (bx0 + bx1) / 2, ccy = (by0 + by1) / 2;
        const s = (sz - 12) / range;

        for (const p of particles) {
            const px = mx + sz / 2 + (p.x - ccx) * s;
            const py = my + sz / 2 + (p.y - ccy) * s;
            if (px < mx + 2 || px > mx + sz - 2 || py < my + 2 || py > my + sz - 2) continue;
            const r = Math.max(0.8, Math.min(3, p.radius * s));
            ctx.fillStyle = p.mass > 200 ? 'rgba(180,100,255,0.9)' : `rgba(${p.r},${p.g},${p.b},0.7)`;
            ctx.beginPath(); ctx.arc(px, py, r, 0, 6.28); ctx.fill();
        }

        const tl = this.camera.s2w(0, 0, this.canvas);
        const br = this.camera.s2w(w, h, this.canvas);
        const vx = mx + sz / 2 + (tl.x - ccx) * s;
        const vy = my + sz / 2 + (tl.y - ccy) * s;
        const vw = (br.x - tl.x) * s, vh = (br.y - tl.y) * s;
        ctx.strokeStyle = 'rgba(0,212,255,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.max(mx, vx), Math.max(my, vy), Math.min(vw, sz), Math.min(vh, sz));
    };

    // ── Velocity Vectors ─────────────────────────────────────────
    R._drawVelocityVectors = function (ctx, particles, cam, w, h) {
        for (const p of particles) {
            if (!p.alive) continue;
            const sp = cam.w2s(p.x, p.y, this.canvas);
            if (sp.x < -50 || sp.x > w + 50 || sp.y < -50 || sp.y > h + 50) continue;
            const vs = 12 * cam.zoom;
            const ex = sp.x + p.vx * vs, ey = sp.y + p.vy * vs;
            const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const alpha = Math.min(0.6, 0.1 + spd * 0.1);
            ctx.strokeStyle = `rgba(0,230,118,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(ex, ey); ctx.stroke();
        }
    };

    // ── Orbit Prediction ─────────────────────────────────────────
    R._drawOrbitPrediction = function (ctx, cam) {
        const pts = this.orbitPrediction;
        if (!pts || pts.length < 2) return;
        ctx.strokeStyle = 'rgba(0,212,255,0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        const f = cam.w2s(pts[0].x, pts[0].y, this.canvas);
        ctx.moveTo(f.x, f.y);
        for (let i = 1; i < pts.length; i++) {
            const sp = cam.w2s(pts[i].x, pts[i].y, this.canvas);
            ctx.lineTo(sp.x, sp.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    };

    // ── Selected Particle Highlight ──────────────────────────────
    R._drawSelectedHighlight = function (ctx, cam, particle) {
        if (!particle || !particle.alive) return;
        const sp = cam.w2s(particle.x, particle.y, this.canvas);
        const r = Math.max(particle.radius * cam.zoom, 4) + 8;
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);

        ctx.strokeStyle = `rgba(0,212,255,${0.4 * pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, 6.28); ctx.stroke();
        ctx.setLineDash([]);

        // Crosshair
        const ch = r + 6;
        ctx.strokeStyle = `rgba(0,212,255,${0.2 * pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sp.x - ch, sp.y); ctx.lineTo(sp.x - r - 2, sp.y);
        ctx.moveTo(sp.x + r + 2, sp.y); ctx.lineTo(sp.x + ch, sp.y);
        ctx.moveTo(sp.x, sp.y - ch); ctx.lineTo(sp.x, sp.y - r - 2);
        ctx.moveTo(sp.x, sp.y + r + 2); ctx.lineTo(sp.x, sp.y + ch);
        ctx.stroke();
    };

})(window.COSMOS);
