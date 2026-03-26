/* ═══════════════════════════════════════════════════════════════
   COSMOS — Audio Engine
   Procedural ambient space music via Web Audio API
   ═══════════════════════════════════════════════════════════════ */
window.COSMOS = window.COSMOS || {};

(function (COSMOS) {
    'use strict';

    class AudioEngine {
        constructor() {
            this.ctx = null;
            this.master = null;
            this.reverb = null;
            this.drones = [];
            this.muted = false;
            this.started = false;
            this.volume = 0.25;
        }

        init() {
            if (this.ctx) return;
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            // Master gain
            this.master = this.ctx.createGain();
            this.master.gain.value = this.volume;
            this.master.connect(this.ctx.destination);

            // Reverb
            this.reverb = this._createReverb();
            this.reverb.connect(this.master);

            // Drone bus
            this.droneBus = this.ctx.createGain();
            this.droneBus.gain.value = 0.4;
            this.droneBus.connect(this.reverb);
            this.droneBus.connect(this.master);

            // Create drone layers
            this._createDrones();
            this.started = true;
        }

        _createReverb() {
            const sr = this.ctx.sampleRate;
            const len = sr * 4;
            const buf = this.ctx.createBuffer(2, len, sr);
            for (let ch = 0; ch < 2; ch++) {
                const d = buf.getChannelData(ch);
                for (let i = 0; i < len; i++) {
                    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
                }
            }
            const conv = this.ctx.createConvolver();
            conv.buffer = buf;
            return conv;
        }

        _createDrones() {
            const notes = [55, 82.5, 110, 146.83, 220]; // A1, E2, A2, D3, A3
            const types = ['sine', 'sine', 'sine', 'triangle', 'sine'];
            const gains = [0.15, 0.1, 0.08, 0.04, 0.03];

            for (let i = 0; i < notes.length; i++) {
                const osc = this.ctx.createOscillator();
                osc.type = types[i];
                osc.frequency.value = notes[i];

                // LFO for frequency modulation
                const lfo = this.ctx.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = 0.03 + Math.random() * 0.05;
                const lfoGain = this.ctx.createGain();
                lfoGain.gain.value = notes[i] * 0.003;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfo.start();

                // LFO for amplitude
                const ampLfo = this.ctx.createOscillator();
                ampLfo.type = 'sine';
                ampLfo.frequency.value = 0.02 + Math.random() * 0.04;
                const ampLfoGain = this.ctx.createGain();
                ampLfoGain.gain.value = gains[i] * 0.4;
                ampLfo.connect(ampLfoGain);

                const oscGain = this.ctx.createGain();
                oscGain.gain.value = gains[i];
                ampLfoGain.connect(oscGain.gain);
                osc.connect(oscGain);
                oscGain.connect(this.droneBus);
                osc.start();
                ampLfo.start();

                this.drones.push({ osc, lfo, ampLfo, gain: oscGain });
            }
        }

        onMerge(mass) {
            if (!this.started || this.muted) return;
            const t = this.ctx.currentTime;

            if (mass > 150) {
                // Deep dramatic rumble for massive merges
                const bass = this.ctx.createOscillator();
                bass.type = 'sine'; bass.frequency.value = 40 + Math.random() * 20;
                const bass2 = this.ctx.createOscillator();
                bass2.type = 'sine'; bass2.frequency.value = 55 + Math.random() * 15;
                const env = this.ctx.createGain();
                env.gain.setValueAtTime(0.18, t);
                env.gain.exponentialRampToValueAtTime(0.001, t + 3);
                bass.connect(env); bass2.connect(env);
                env.connect(this.reverb);
                bass.start(t); bass2.start(t);
                bass.stop(t + 3); bass2.stop(t + 3);
            }

            // Bell tone (pitch varies with mass)
            const freq = mass > 100 ? 80 + Math.random() * 60 : 200 + Math.min(mass, 200) * 2;
            const osc = this.ctx.createOscillator();
            osc.type = 'sine'; osc.frequency.value = freq;
            const osc2 = this.ctx.createOscillator();
            osc2.type = 'sine'; osc2.frequency.value = freq * 2.01;
            const env2 = this.ctx.createGain();
            const vol = Math.min(mass / 200, 1) * 0.12;
            env2.gain.setValueAtTime(vol, t);
            env2.gain.exponentialRampToValueAtTime(0.001, t + 2);
            osc.connect(env2); osc2.connect(env2);
            env2.connect(this.reverb);
            osc.start(t); osc2.start(t);
            osc.stop(t + 2); osc2.stop(t + 2);
        }

        toggleMute() {
            this.muted = !this.muted;
            if (this.master) {
                this.master.gain.linearRampToValueAtTime(
                    this.muted ? 0 : this.volume,
                    this.ctx.currentTime + 0.3
                );
            }
            return this.muted;
        }

        resume() {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }
    }

    COSMOS.AudioEngine = AudioEngine;
})(window.COSMOS);
