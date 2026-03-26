/* ═══════════════════════════════════════════════════════════════
   COSMOS — Physics Engine
   Barnes-Hut N-body gravitational simulation
   ═══════════════════════════════════════════════════════════════ */

window.COSMOS = window.COSMOS || {};

(function (COSMOS) {
  'use strict';

  // ── Particle ────────────────────────────────────────────────
  class Particle {
    constructor(x, y, vx, vy, mass) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.ax = 0;
      this.ay = 0;
      this.mass = mass;
      this.radius = Math.pow(mass, 0.35) * 1.5;
      this.alive = true;
      this.age = 0;

      // Precompute color
      const col = Particle.colorFromMass(mass);
      this.r = col.r;
      this.g = col.g;
      this.b = col.b;
    }

    get speed() {
      return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    get kineticEnergy() {
      return 0.5 * this.mass * (this.vx * this.vx + this.vy * this.vy);
    }

    /** Stellar color: small mass → red/orange, large mass → blue/white */
    static colorFromMass(mass) {
      const t = Math.min(Math.log2(mass + 1) / 9, 1); // log2(512)=9
      let r, g, b;
      if (t < 0.15) {
        // Red dwarfs
        r = 255; g = 80 + t / 0.15 * 100; b = 40;
      } else if (t < 0.35) {
        // Orange / yellow
        const u = (t - 0.15) / 0.2;
        r = 255; g = 180 + u * 75; b = 40 + u * 140;
      } else if (t < 0.55) {
        // Yellow-white
        const u = (t - 0.35) / 0.2;
        r = 255 - u * 30; g = 255; b = 180 + u * 75;
      } else if (t < 0.78) {
        // White to blue-white
        const u = (t - 0.55) / 0.23;
        r = 225 - u * 65; g = 255 - u * 40; b = 255;
      } else {
        // Blue giants
        const u = (t - 0.78) / 0.22;
        r = 160 - u * 60; g = 215 - u * 65; b = 255;
      }
      return {
        r: Math.round(Math.min(255, Math.max(0, r))),
        g: Math.round(Math.min(255, Math.max(0, g))),
        b: Math.round(Math.min(255, Math.max(0, b)))
      };
    }
  }

  // ── QuadTree Node ───────────────────────────────────────────
  class QuadNode {
    constructor(x, y, w, h) {
      this.x = x;     // top-left x
      this.y = y;     // top-left y
      this.w = w;     // width
      this.h = h;     // height
      this.mass = 0;
      this.cmx = 0;   // center of mass x
      this.cmy = 0;   // center of mass y
      this.body = null;
      this.children = null;
    }

    isLeaf() {
      return this.children === null;
    }

    insert(p) {
      if (this.mass === 0 && this.body === null) {
        // Empty node — place particle here
        this.body = p;
        this.mass = p.mass;
        this.cmx = p.x;
        this.cmy = p.y;
        return;
      }

      // If leaf with existing body, subdivide
      if (this.isLeaf() && this.body !== null) {
        this._subdivide();
        const old = this.body;
        this.body = null;
        this._insertChild(old);
      }

      // Insert new particle into appropriate child
      this._insertChild(p);

      // Update center of mass
      const totalMass = this.mass + p.mass;
      this.cmx = (this.cmx * this.mass + p.x * p.mass) / totalMass;
      this.cmy = (this.cmy * this.mass + p.y * p.mass) / totalMass;
      this.mass = totalMass;
    }

    _subdivide() {
      const hw = this.w / 2;
      const hh = this.h / 2;
      this.children = [
        new QuadNode(this.x, this.y, hw, hh),             // NW
        new QuadNode(this.x + hw, this.y, hw, hh),        // NE
        new QuadNode(this.x, this.y + hh, hw, hh),        // SW
        new QuadNode(this.x + hw, this.y + hh, hw, hh)    // SE
      ];
    }

    _insertChild(p) {
      const midX = this.x + this.w / 2;
      const midY = this.y + this.h / 2;
      const i = (p.x < midX ? 0 : 1) + (p.y < midY ? 0 : 2);
      this.children[i].insert(p);
    }

    /** Compute gravitational force on particle p using Barnes-Hut */
    computeForce(p, G, theta, softening) {
      if (this.mass === 0) return { fx: 0, fy: 0 };

      const dx = this.cmx - p.x;
      const dy = this.cmy - p.y;
      const distSq = dx * dx + dy * dy + softening * softening;

      // If this is a leaf with a single body (and not self)
      if (this.isLeaf() && this.body !== null) {
        if (this.body === p) return { fx: 0, fy: 0 };
        const dist = Math.sqrt(distSq);
        const force = G * this.mass * p.mass / distSq;
        return { fx: force * dx / dist, fy: force * dy / dist };
      }

      // Barnes-Hut criterion: s/d < theta
      const s = Math.max(this.w, this.h);
      const d = Math.sqrt(distSq);
      if (s / d < theta) {
        const force = G * this.mass * p.mass / distSq;
        return { fx: force * dx / d, fy: force * dy / d };
      }

      // Recurse into children
      let fx = 0, fy = 0;
      if (this.children) {
        for (let c = 0; c < 4; c++) {
          const f = this.children[c].computeForce(p, G, theta, softening);
          fx += f.fx;
          fy += f.fy;
        }
      }
      return { fx, fy };
    }
  }

  // ── Physics Engine ──────────────────────────────────────────
  class PhysicsEngine {
    constructor() {
      this.particles = [];
      this.G = 0.5;
      this.theta = 0.6;
      this.softening = 8;
      this.damping = 0.9999;
      this.mergeOnCollision = true;
      this.boundarySize = 5000;
      this.mergeEvents = [];  // filled each step, consumed by renderer/audio
      this.attractor = null;   // {x, y, mass} — temporary gravity source from mouse
    }

    addParticle(x, y, vx, vy, mass) {
      const p = new Particle(x, y, vx || 0, vy || 0, mass || 10);
      this.particles.push(p);
      return p;
    }

    clear() {
      this.particles = [];
      this.mergeEvents = [];
    }

    /** Build Barnes-Hut tree */
    _buildTree() {
      const s = this.boundarySize;
      const root = new QuadNode(-s, -s, s * 2, s * 2);
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.x > -s && p.x < s && p.y > -s && p.y < s) {
          root.insert(p);
        }
      }
      return root;
    }

    /** One simulation step using Velocity Verlet */
    step(dt) {
      const particles = this.particles;
      const n = particles.length;
      if (n === 0) return;

      this.mergeEvents = [];

      // Half-step velocity
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        p.vx += 0.5 * p.ax * dt;
        p.vy += 0.5 * p.ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // Build quadtree & compute new accelerations
      const tree = this._buildTree();
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        const f = tree.computeForce(p, this.G, this.theta, this.softening);
        p.ax = f.fx / p.mass;
        p.ay = f.fy / p.mass;

        // Attractor force (mouse gravity)
        if (this.attractor) {
          const adx = this.attractor.x - p.x;
          const ady = this.attractor.y - p.y;
          const adSq = adx * adx + ady * ady + 100;
          const adist = Math.sqrt(adSq);
          const af = this.G * this.attractor.mass / adSq;
          p.ax += af * adx / adist;
          p.ay += af * ady / adist;
        }
      }

      // Complete velocity step + damping
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        p.vx = (p.vx + 0.5 * p.ax * dt) * this.damping;
        p.vy = (p.vy + 0.5 * p.ay * dt) * this.damping;
        p.age += dt;
      }

      // Handle collisions / merges
      if (this.mergeOnCollision) {
        this._handleCollisions();
      }

      // Remove dead particles and out-of-bounds
      const bound = this.boundarySize * 1.5;
      this.particles = particles.filter(p =>
        p.alive &&
        Math.abs(p.x) < bound &&
        Math.abs(p.y) < bound
      );
    }

    _handleCollisions() {
      const particles = this.particles;
      const n = particles.length;

      // Simple O(n²) but only for close particles; ok for <2000 particles
      for (let i = 0; i < n; i++) {
        const a = particles[i];
        if (!a.alive) continue;
        for (let j = i + 1; j < n; j++) {
          const b = particles[j];
          if (!b.alive) continue;

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          const minDist = a.radius + b.radius;

          if (distSq < minDist * minDist) {
            // Merge: absorb smaller into larger
            const [big, small] = a.mass >= b.mass ? [a, b] : [b, a];
            const totalMass = big.mass + small.mass;

            // Record event for visual/audio effects
            this.mergeEvents.push({
              x: (big.x * big.mass + small.x * small.mass) / totalMass,
              y: (big.y * big.mass + small.y * small.mass) / totalMass,
              mass: totalMass
            });

            // Conserve momentum — compute before changing mass
            const newVx = (big.vx * big.mass + small.vx * small.mass) / totalMass;
            const newVy = (big.vy * big.mass + small.vy * small.mass) / totalMass;
            const newX = (big.x * big.mass + small.x * small.mass) / totalMass;
            const newY = (big.y * big.mass + small.y * small.mass) / totalMass;

            big.vx = newVx;
            big.vy = newVy;
            big.x = newX;
            big.y = newY;
            big.mass = totalMass;
            big.radius = Math.pow(big.mass, 0.35) * 1.5;

            // Recompute color
            const col = Particle.colorFromMass(big.mass);
            big.r = col.r;
            big.g = col.g;
            big.b = col.b;

            small.alive = false;
          }
        }
      }
    }

    getStats() {
      let totalMass = 0, totalEnergy = 0;
      for (const p of this.particles) {
        totalMass += p.mass;
        totalEnergy += p.kineticEnergy;
      }
      return {
        count: this.particles.length,
        totalMass: Math.round(totalMass),
        energy: Math.round(totalEnergy),
      };
    }
  }

  COSMOS.Particle = Particle;
  COSMOS.PhysicsEngine = PhysicsEngine;

})(window.COSMOS);
