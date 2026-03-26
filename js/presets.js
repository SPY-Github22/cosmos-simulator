/* ═══════════════════════════════════════════════════════════════
   COSMOS — Simulation Presets
   Pre-built particle configurations
   ═══════════════════════════════════════════════════════════════ */
window.COSMOS = window.COSMOS || {};

(function (COSMOS) {
    'use strict';

    function disk(cx, cy, count, radius, centralMass, G) {
        const particles = [];
        particles.push({ x: cx, y: cy, vx: 0, vy: 0, mass: centralMass });
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = radius * (0.1 + 0.9 * Math.pow(Math.random(), 0.5));
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            const speed = Math.sqrt(G * centralMass / Math.max(r, 10));
            const vx = -speed * Math.sin(angle) + (Math.random() - 0.5) * 0.3;
            const vy = speed * Math.cos(angle) + (Math.random() - 0.5) * 0.3;
            const mass = 0.5 + Math.random() * 2;
            particles.push({ x, y, vx, vy, mass });
        }
        return particles;
    }

    const Presets = {
        galaxy(G) {
            const g1 = disk(-250, -80, 350, 180, 400, G);
            const g2 = disk(250, 80, 350, 180, 400, G);
            g1.forEach(p => { p.vx += 0.4; p.vy += 0.25; });
            g2.forEach(p => { p.vx -= 0.4; p.vy -= 0.25; });
            return [...g1, ...g2];
        },

        solar(G) {
            const particles = [{ x: 0, y: 0, vx: 0, vy: 0, mass: 800 }];
            const planets = [
                { dist: 80, mass: 5 }, { dist: 120, mass: 12 },
                { dist: 170, mass: 10 }, { dist: 220, mass: 3 },
                { dist: 300, mass: 80 }, { dist: 400, mass: 60 },
                { dist: 500, mass: 30 }, { dist: 620, mass: 25 }
            ];
            for (const pl of planets) {
                const a = Math.random() * Math.PI * 2;
                const sp = Math.sqrt(G * 800 / pl.dist);
                particles.push({
                    x: pl.dist * Math.cos(a), y: pl.dist * Math.sin(a),
                    vx: -sp * Math.sin(a), vy: sp * Math.cos(a), mass: pl.mass
                });
            }
            // Asteroid belt
            for (let i = 0; i < 120; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = 240 + Math.random() * 40;
                const sp = Math.sqrt(G * 800 / r);
                particles.push({
                    x: r * Math.cos(a), y: r * Math.sin(a),
                    vx: -sp * Math.sin(a) + (Math.random() - 0.5) * 0.2,
                    vy: sp * Math.cos(a) + (Math.random() - 0.5) * 0.2,
                    mass: 0.1 + Math.random() * 0.5
                });
            }
            return particles;
        },

        nebula() {
            const particles = [];
            for (let i = 0; i < 700; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = Math.random() * 500;
                particles.push({
                    x: r * Math.cos(a), y: r * Math.sin(a),
                    vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
                    mass: 1 + Math.random() * 5
                });
            }
            return particles;
        },

        bigbang() {
            const particles = [];
            for (let i = 0; i < 600; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = Math.random() * 5;
                const sp = 1 + Math.random() * 4;
                particles.push({
                    x: r * Math.cos(a), y: r * Math.sin(a),
                    vx: sp * Math.cos(a) + (Math.random() - 0.5) * 0.8,
                    vy: sp * Math.sin(a) + (Math.random() - 0.5) * 0.8,
                    mass: 1 + Math.random() * 4
                });
            }
            return particles;
        },

        binary(G) {
            const sep = 100, starMass = 300;
            const orbSpeed = Math.sqrt(G * starMass / (sep * 2));
            const particles = [
                { x: -sep, y: 0, vx: 0, vy: orbSpeed, mass: starMass },
                { x: sep, y: 0, vx: 0, vy: -orbSpeed, mass: starMass }
            ];
            for (let i = 0; i < 400; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = 200 + Math.random() * 600;
                const sp = Math.sqrt(G * starMass * 2 / r) * (0.7 + Math.random() * 0.6);
                particles.push({
                    x: r * Math.cos(a), y: r * Math.sin(a),
                    vx: -sp * Math.sin(a), vy: sp * Math.cos(a),
                    mass: 0.3 + Math.random() * 2
                });
            }
            return particles;
        },

        proto(G) {
            const particles = [{ x: 0, y: 0, vx: 0, vy: 0, mass: 600 }];
            for (let i = 0; i < 500; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = 60 + Math.pow(Math.random(), 0.6) * 500;
                const sp = Math.sqrt(G * 600 / r);
                const wobble = (Math.random() - 0.5) * 0.3;
                particles.push({
                    x: r * Math.cos(a), y: r * Math.sin(a),
                    vx: -sp * Math.sin(a) + wobble, vy: sp * Math.cos(a) + wobble,
                    mass: 0.3 + Math.random() * 3
                });
            }
            // A few larger protoplanets
            for (let i = 0; i < 6; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = 100 + Math.random() * 400;
                const sp = Math.sqrt(G * 600 / r);
                particles.push({
                    x: r * Math.cos(a), y: r * Math.sin(a),
                    vx: -sp * Math.sin(a), vy: sp * Math.cos(a),
                    mass: 10 + Math.random() * 20
                });
            }
            return particles;
        },

        custom() { return []; }
    };

    COSMOS.Presets = Presets;
})(window.COSMOS);
