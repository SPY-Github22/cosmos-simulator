/* ═══════════════════════════════════════════════════════════════
   COSMOS — UI Manager
   Panel management, control binding, stats display
   ═══════════════════════════════════════════════════════════════ */
window.COSMOS = window.COSMOS || {};

(function (COSMOS) {
    'use strict';

    class UIManager {
        constructor() {
            this.elements = {};
            this.onPreset = null;
            this.onPause = null;
            this.onClear = null;
            this.onGridToggle = null;
            this.onMuteToggle = null;
            this.onCinemaToggle = null;
            this.onVectorsToggle = null;
            this.onFollow = null;
            this.onDeleteSelected = null;
            this.paused = false;
            this.gridOn = false;
            this.muted = false;
            this.cinemaOn = false;
            this.vectorsOn = false;
            this.following = false;
        }

        init() {
            const $ = id => document.getElementById(id);

            this.elements = {
                controlPanel: $('control-panel'),
                statsPanel: $('stats-panel'),
                helpPanel: $('help-panel'),
                reopenBtn: $('reopen-controls'),
                toggleBtn: $('toggle-controls'),
                massSlider: $('mass-slider'),
                massValue: $('mass-value'),
                gravitySlider: $('gravity-slider'),
                gravityValue: $('gravity-value'),
                timeSlider: $('time-slider'),
                timeValue: $('time-value'),
                trailSlider: $('trail-slider'),
                trailValue: $('trail-value'),
                btnPause: $('btn-pause'),
                btnClear: $('btn-clear'),
                btnGrid: $('btn-grid'),
                btnMute: $('btn-mute'),
                statParticles: $('stat-particles'),
                statMass: $('stat-mass'),
                statEnergy: $('stat-energy'),
                statFps: $('stat-fps'),
                statTime: $('stat-time'),
                loadingScreen: $('loading-screen'),
                // V2 elements
                btnCinema: $('btn-cinema'),
                btnVectors: $('btn-vectors'),
                infoPanel: $('info-panel'),
                infoType: $('info-type'),
                infoMass: $('info-mass'),
                infoVel: $('info-vel'),
                infoPos: $('info-pos'),
                infoEnergy: $('info-energy'),
                infoAge: $('info-age'),
                infoFollow: $('info-follow'),
                infoDelete: $('info-delete'),
                closeInfo: $('close-info'),
            };

            this._bindPresets();
            this._bindSliders();
            this._bindButtons();
            this._bindPanelToggle();
        }

        _bindPresets() {
            const btns = document.querySelectorAll('.preset-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', () => {
                    btns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if (this.onPreset) this.onPreset(btn.dataset.preset);
                });
            });
        }

        _bindSliders() {
            const e = this.elements;
            e.massSlider.addEventListener('input', () => {
                e.massValue.textContent = e.massSlider.value;
            });
            e.gravitySlider.addEventListener('input', () => {
                e.gravityValue.textContent = (e.gravitySlider.value / 100).toFixed(2);
            });
            e.timeSlider.addEventListener('input', () => {
                e.timeValue.textContent = (e.timeSlider.value / 10).toFixed(1) + 'x';
            });
            e.trailSlider.addEventListener('input', () => {
                e.trailValue.textContent = e.trailSlider.value + '%';
            });
        }

        _bindButtons() {
            const e = this.elements;
            e.btnPause.addEventListener('click', () => this.togglePause());
            e.btnClear.addEventListener('click', () => { if (this.onClear) this.onClear(); });
            e.btnGrid.addEventListener('click', () => this.toggleGrid());
            e.btnMute.addEventListener('click', () => this.toggleMute());
            if (e.btnCinema) e.btnCinema.addEventListener('click', () => this.toggleCinema());
            if (e.btnVectors) e.btnVectors.addEventListener('click', () => this.toggleVectors());
            if (e.closeInfo) e.closeInfo.addEventListener('click', () => this.hideInfo());
            if (e.infoFollow) e.infoFollow.addEventListener('click', () => {
                this.following = !this.following;
                e.infoFollow.classList.toggle('active', this.following);
                if (this.onFollow) this.onFollow(this.following);
            });
            if (e.infoDelete) e.infoDelete.addEventListener('click', () => {
                if (this.onDeleteSelected) this.onDeleteSelected();
                this.hideInfo();
            });
        }

        _bindPanelToggle() {
            const e = this.elements;
            e.toggleBtn.addEventListener('click', () => {
                e.controlPanel.style.display = 'none';
                e.reopenBtn.style.display = 'block';
            });
            e.reopenBtn.addEventListener('click', () => {
                e.controlPanel.style.display = '';
                e.reopenBtn.style.display = 'none';
            });
        }

        togglePause() {
            this.paused = !this.paused;
            this.elements.btnPause.textContent = this.paused ? '▶ Play' : '⏸ Pause';
            this.elements.btnPause.classList.toggle('active', this.paused);
            if (this.onPause) this.onPause(this.paused);
        }

        toggleGrid() {
            this.gridOn = !this.gridOn;
            this.elements.btnGrid.classList.toggle('active', this.gridOn);
            if (this.onGridToggle) this.onGridToggle(this.gridOn);
        }

        toggleMute() {
            this.muted = !this.muted;
            this.elements.btnMute.textContent = this.muted ? '🔇 Muted' : '🔊 Sound';
            this.elements.btnMute.classList.toggle('active', this.muted);
            if (this.onMuteToggle) this.onMuteToggle();
        }

        getMass() { return parseInt(this.elements.massSlider.value, 10); }
        getGravity() { return parseInt(this.elements.gravitySlider.value, 10) / 100; }
        getTimeScale() { return parseInt(this.elements.timeSlider.value, 10) / 10; }
        getTrailAlpha() {
            const v = parseInt(this.elements.trailSlider.value, 10);
            return 0.01 + (1 - v / 100) * 0.15; // 0 trail slider → high fade, 100 → low fade
        }

        updateStats(count, mass, energy, fps, simTime) {
            this.elements.statParticles.textContent = count;
            this.elements.statMass.textContent = mass.toLocaleString();
            this.elements.statEnergy.textContent = energy.toLocaleString();
            this.elements.statFps.textContent = fps;
            const m = Math.floor(simTime / 60);
            const s = Math.floor(simTime % 60);
            this.elements.statTime.textContent = m + ':' + (s < 10 ? '0' : '') + s;
        }

        hideLoading() {
            this.elements.loadingScreen.classList.add('hidden');
        }

        // V2: Cinema & Vectors toggles
        toggleCinema() {
            this.cinemaOn = !this.cinemaOn;
            if (this.elements.btnCinema) this.elements.btnCinema.classList.toggle('active', this.cinemaOn);
            document.body.classList.toggle('cinema-active', this.cinemaOn);
            if (this.onCinemaToggle) this.onCinemaToggle(this.cinemaOn);
        }

        toggleVectors() {
            this.vectorsOn = !this.vectorsOn;
            if (this.elements.btnVectors) this.elements.btnVectors.classList.toggle('active', this.vectorsOn);
            if (this.onVectorsToggle) this.onVectorsToggle(this.vectorsOn);
        }

        // V2: Info panel
        showInfo(particle) {
            if (!this.elements.infoPanel) return;
            this.elements.infoPanel.style.display = '';
            this.updateInfo(particle);
        }

        hideInfo() {
            if (this.elements.infoPanel) this.elements.infoPanel.style.display = 'none';
            this.following = false;
            if (this.elements.infoFollow) this.elements.infoFollow.classList.remove('active');
        }

        updateInfo(p) {
            if (!p || !p.alive || !this.elements.infoPanel || this.elements.infoPanel.style.display === 'none') return;
            const e = this.elements;
            e.infoType.textContent = UIManager.bodyType(p.mass);
            e.infoMass.textContent = p.mass.toFixed(1);
            e.infoVel.textContent = Math.sqrt(p.vx * p.vx + p.vy * p.vy).toFixed(2);
            e.infoPos.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
            e.infoEnergy.textContent = Math.round(p.kineticEnergy);
            e.infoAge.textContent = p.age.toFixed(1) + 's';
        }

        static bodyType(mass) {
            if (mass > 500) return '⚫ Black Hole';
            if (mass > 200) return '🔵 Giant Star';
            if (mass > 80) return '⭐ Star';
            if (mass > 25) return '🪐 Gas Giant';
            if (mass > 5) return '🌍 Planet';
            return '☄️ Debris';
        }
    }

    COSMOS.UIManager = UIManager;
})(window.COSMOS);
