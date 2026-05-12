/**
 * SimulationEngine.js - Chapter 14: Clinical Simulation
 * 
 * Architecture:
 *  - Triple Canvas: bgCanvas (original image) / fgCanvas (extracted tooth) / uiCanvas (interaction handles)
 *  - Game Loop: requestAnimationFrame で毎フレーム uiCanvas を再描画
 *  - All events go to uiCanvas, hit-testing done in JS
 *  - Pixel extraction uses Bounding Box approach → low memory footprint for Safari/iOS
 */
window.SimulationEngine = {

    // ------------------------------------------------------------------ STATE
    /** @type {HTMLElement} */
    container: null,
    /** @type {HTMLCanvasElement} */
    bgCanvas: null, fgCanvas: null, uiCanvas: null,
    bgCtx: null, fgCtx: null, uiCtx: null,

    /** @type {HTMLImageElement|null} */
    image: null,
    /** image-space to canvas-space scale + offset */
    imgScale: 1, imgOffX: 0, imgOffY: 0,

    // Polygon plotting state
    /** @type {{x:number, y:number}[]} polygon points in image-space */
    polyPoints: [],
    polygonClosed: false,

    // Extraction data
    /** @type {{ id: number, canvas: HTMLCanvasElement, bbox: DOMRect, pos: {x:number,y:number}, scaleX: number, scaleY: number, rotation: number }[]} */
    simPieces: [],
    activePieceIdx: -1,
    _nextPieceId: 1,

    globalSimOpacity: 1.0,

    // Interaction
    /** 'upload' | 'extract' | 'ai_extract' | 'simulate' */
    mode: 'upload',
    isWarpMode: false,
    _isAIInitialized: false,
    isDragging: false,
    dragStart: null,       // { scx, scy, px, py } screen + simPos snapshot
    rotateHandle: null,    // screen coords of rotate knob
    isRotating: false,
    rotateStart: null,     // { angle, simRotation }
    isScaling: false,
    scaleHandlePos: 'br',  // which corner
    scaleStart: null,
    isWarping: false,
    warpGridIdx: -1,

    // Animation loop
    _rafId: null,
    _dirty: true,           // flag: uiCanvas needs redraw
    _isInitialized: false,

    // Debugging / Hinting AI
    _debugPt: null,         // Legacy single click debug
    aiHintPoints: [],       // Array of {x, y} in image space
    isAIRunning: false,

    // ---------------------------------------------------------------- INIT
    init() {
        if (this._isInitialized) return;
        this.container = document.getElementById('chapter-simulation');
        if (!this.container) return;

        this.bgCanvas = document.getElementById('sim-bg-canvas');
        this.fgCanvas = document.getElementById('sim-fg-canvas');
        this.uiCanvas = document.getElementById('sim-ui-canvas');
        if (!this.bgCanvas || !this.fgCanvas || !this.uiCanvas) return;

        this.bgCtx = this.bgCanvas.getContext('2d');
        this.fgCtx = this.fgCanvas.getContext('2d');
        this.uiCtx = this.uiCanvas.getContext('2d');

        this._onResize = this._onResize.bind(this);
        this._tick = this._tick.bind(this);

        this._setupFileHandling();
        this._setupEventListeners();
        this._startLoop();
        this._updateBanner();
        this._updateToolbarState();

        this._isInitialized = true;
        console.log('[SimulationEngine] Initialized.');
    },

    _setupFileHandling() {
        const fileInput = document.getElementById('sim-file-input');
        const area = this.container.querySelector('.sim-canvas-area');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this._loadImage(file);
                }
                // Small delay before reset to prevent synchronous clearing issues
                setTimeout(() => { e.target.value = ''; }, 100);
            });
        }
        if (area) {
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('drag-over');
            });
            area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
                if (e.dataTransfer.files[0]) this._loadImage(e.dataTransfer.files[0]);
            });
        }
    },

    _loadImage(file) {
        console.log('[SimulationEngine] Attempting to load file:', file.name, file.type, file.size);
        if (!file || !file.type.startsWith('image/')) {
            console.error('[SimulationEngine] Invalid file type:', file);
            alert('画像ファイルを選択してください。');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('[SimulationEngine] FileReader loaded.');
            const img = new Image();
            img.onload = () => {
                console.log('[SimulationEngine] Image object created:', img.width, 'x', img.height);
                this.image = img;
                this.reset(true); // reset state but KEEP the new image
                this._resizeCanvases();
                this._drawBackground();
                const area = this.container.querySelector('.sim-canvas-area');
                if (area) area.classList.add('has-image');
                this.mode = 'ai_extract';
                this._updateBanner();
                this._updateToolbarState();
                this._dirty = true;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    // --------------------------------------------------------------- MODE CONTROL
    _switchMode(mode) {
        if (mode === 'extract' && !this.image) return;
        if (mode === 'simulate' && this.simPieces.length === 0) {
            alert('先にポリゴンを確定してください。「抽出確定」ボタンを使用するか、最初の点の近くをクリックして閉じてください。');
            return;
        }
        this.mode = mode;
        if (mode !== 'simulate') this.isWarpMode = false;

        // Update Confirm button text based on mode
        const confirmText = document.getElementById('sim-confirm-text');
        const confirmIcon = document.getElementById('sim-confirm-icon');
        if (confirmText && confirmIcon) {
            if (mode === 'ai_extract') {
                confirmText.textContent = "解析実行";
                confirmIcon.setAttribute('data-lucide', 'play');
            } else {
                confirmText.textContent = "抽出確定";
                confirmIcon.setAttribute('data-lucide', 'check-circle');
            }
            if (window.lucide) window.lucide.createIcons();
        }

        this._updateBanner();
        this._updateToolbarState();

        const area = this.container.querySelector('.sim-canvas-area');
        if (area) {
            area.classList.remove('mode-upload', 'mode-extract', 'mode-simulate');
            area.classList.add(`mode-${mode}`);
        }
        this._dirty = true;
    },

    _confirmPolygon() {
        if (this.polyPoints.length < 3) {
            alert('最低3点をプロットしてから確定してください。');
            return;
        }
        this.polygonClosed = true;
        const ok = this._extractPolygon();
        if (ok) {
            this._switchMode('simulate');
        }
    },

    // --------------------------------------------------------------- RESET
    reset(keepImage = false) {
        this.polyPoints = [];
        this.polygonClosed = false;
        this.simPieces = [];
        this.activePieceIdx = -1;
        this.globalSimOpacity = 1.0;
        this.isDragging = false;
        this.isRotating = false;
        this.isScaling = false;

        // Reset opacity slider UI
        const slider = document.getElementById('sim-opacity-slider');
        const label = document.getElementById('sim-opacity-label');
        if (slider) slider.value = 100;
        if (label) label.textContent = '100%';

        if (!keepImage) {
            this.image = null;
            const area = this.container.querySelector('.sim-canvas-area');
            if (area) area.classList.remove('has-image');
            [this.bgCtx, this.fgCtx, this.uiCtx].forEach((ctx, i) => {
                const c = [this.bgCanvas, this.fgCanvas, this.uiCanvas][i];
                if (ctx && c) {
                    ctx.clearRect(0, 0, c.width, c.height);
                }
            });
        } else {
            // Do NOT draw background here; let _resizeCanvases handle it
            // because canvas dimensions might not be set yet.
            const fgCtx = this.fgCtx;
            if (fgCtx && this.fgCanvas) {
                fgCtx.clearRect(0, 0, this.fgCanvas.width, this.fgCanvas.height);
            }
        }

        this.mode = this.image ? 'ai_extract' : 'upload';
        this._updateBanner();
        this._updateToolbarState();
        this._dirty = true;
    },

    // --------------------------------------------------------------- UI UPDATE
    _updateBanner() {
        const banner = document.getElementById('sim-phase-banner');
        if (!banner) return;

        let icon = 'info';
        let text = '';
        let cls = 'sim-phase-banner';

        if (this.mode === 'upload') {
            text = '⬆️ まず口腔内写真をアップロードしてください。';
        } else if (this.mode === 'extract') {
            icon = 'pen-tool';
            if (this.polygonClosed) {
                text = '調整モード：点をドラッグして形を整えてください。完了したら「抽出確定」を押してください。';
            } else {
                text = '抽出モード：歯の形に沿ってプロットし、最初をクリックして閉じてください。';
            }
            cls += ' phase-extract';
        } else if (this.mode === 'ai_extract') {
            if (this.isAIRunning) {
                banner.innerHTML = `<div class="banner-content"><i data-lucide="loader-2" class="animate-spin"></i> AI分析中... しばらくお待ちください。</div>`;
            } else {
                const count = this.aiHintPoints.length;
                let html = `<div class="banner-content"><i data-lucide="sparkles"></i> <b>AI抽出モード</b>：歯の周りを囲むようにタップしてください。 (${count}点指定中)</div>`;
                html += `<div class="banner-actions">`;
                if (count > 0) {
                    html += `<button class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.85rem; height: auto;" onclick="SimulationEngine.undoAIPoint()">↩ 戻る</button>`;
                    html += `<button class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.85rem; height: auto; color: #ef4444;" onclick="SimulationEngine.resetAIPoints()">✕ クリア</button>`;
                }
                html += `</div>`;
                banner.innerHTML = html;
            }
            cls += ' phase-ai';
        } else if (this.mode === 'simulate') {
            icon = 'move';
            text = 'シミュレーションモード：歯を移動・変形できます。';
            cls += ' phase-simulate';
        }

        banner.className = cls;
        if (this.mode !== 'ai_extract' && !this.isAIRunning) {
            if (this.isWarpMode) {
                text = '変形モード：ポイントをドラッグして歯の形態を微調整してください。';
                icon = 'grid';
                cls += ' phase-warp';
            }
            banner.innerHTML = `<i data-lucide="${icon}"></i> ${text}`;
        }
        if (window.lucide) window.lucide.createIcons();
    },

    // Global entry points for banner buttons
    startAI() { window.SimulationEngine._runAISegmentation(); },
    undoAIPoint() {
        window.SimulationEngine.aiHintPoints.pop();
        window.SimulationEngine._updateBanner();
        window.SimulationEngine._dirty = true;
    },
    resetAIPoints() {
        window.SimulationEngine.aiHintPoints = [];
        window.SimulationEngine._updateBanner();
        window.SimulationEngine._dirty = true;
    },
    _updateToolbarState() {
        const hasImg = !!this.image;
        const btnAIHeader = document.getElementById('sim-btn-ai');
        const btnExtract = document.getElementById('sim-btn-extract');
        const btnAIAssist = document.getElementById('sim-btn-ai-assist');
        const btnSimulate = document.getElementById('sim-btn-simulate');
        const btnWarp = document.getElementById('sim-btn-warp');
        const btnConfirm = document.getElementById('sim-btn-confirm');
        const btnDelete = document.getElementById('sim-btn-delete');
        
        // --- Tooth Selection Constraint ---
        const toothValEl = document.getElementById('sim-tooth-value');
        const val = toothValEl ? toothValEl.value : "";
        const isToothSelected = (val !== "");

        if (btnAIHeader) {
            btnAIHeader.disabled = !hasImg || !isToothSelected;
            btnAIHeader.classList.toggle('active', this.mode === 'ai_extract');
        }
        if (btnExtract) {
            btnExtract.disabled = !hasImg || !isToothSelected;
            btnExtract.classList.toggle('active', this.mode === 'extract');
        }
        if (btnAIAssist) {
            btnAIAssist.disabled = !hasImg || !isToothSelected;
            btnAIAssist.classList.toggle('active', this.mode === 'ai_extract');
        }
        if (btnSimulate) {
            btnSimulate.disabled = !hasImg || this.simPieces.length === 0;
            btnSimulate.classList.toggle('active', this.mode === 'simulate' && !this.isWarpMode);
        }
        if (btnWarp) btnWarp.classList.toggle('active', this.isWarpMode);
        
        if (btnConfirm) {
            if (this.mode === 'extract') {
                btnConfirm.disabled = (this.polyPoints.length < 3);
            } else if (this.mode === 'ai_extract') {
                btnConfirm.disabled = (this.aiHintPoints.length < 3);
            } else {
                btnConfirm.disabled = true;
            }
        }
        if (btnWarp) btnWarp.disabled = (this.mode !== 'simulate' || this.simPieces.length === 0);
        if (btnDelete) btnDelete.disabled = (this.mode !== 'simulate' || this.activePieceIdx === -1);
        
        const btnFlip = document.getElementById('sim-btn-flip');
        if (btnFlip) btnFlip.disabled = (this.mode !== 'simulate' || this.activePieceIdx === -1);
    },

    deleteActivePiece() {
        if (this.mode !== 'simulate' || this.activePieceIdx === -1) return;
        this.simPieces.splice(this.activePieceIdx, 1);
        this.activePieceIdx = -1;
        this._updateToolbarState();
        this._dirty = true;
    },

    toggleWarpMode() {
        if (this.mode !== 'simulate') return;
        this.isWarpMode = !this.isWarpMode;
        this._updateBanner();
        this._updateToolbarState();
        this._dirty = true;
    },

    flipActivePiece() {
        if (this.mode !== 'simulate' || this.activePieceIdx === -1) return;
        const piece = this.simPieces[this.activePieceIdx];
        piece.flippedX = !piece.flippedX;
        this._updateToolbarState();
        this._dirty = true;
    },

    // --------------------------------------------------------------- EXPORT
    /**
     * Merges bg + fg into a single canvas and returns a data URL.
     * Called by ReportEngine for PDF output.
     */
    getSimulationSnapshot() {
        if (!this.image) return null;
        const out = document.createElement('canvas');
        out.width  = this.bgCanvas.width;
        out.height = this.bgCanvas.height;
        const ctx = out.getContext('2d');
        ctx.drawImage(this.bgCanvas, 0, 0);
        ctx.drawImage(this.fgCanvas, 0, 0);
        return out.toDataURL('image/png');
    },

    /**
     * Download the snapshot as PNG
     */
    exportSnapshot() {
        const dataURL = this.getSimulationSnapshot();
        if (!dataURL) return;
        const a = document.createElement('a');
        a.download = 'simulation_result.png';
        a.href = dataURL;
        a.click();
    },

    _getSelectedToothLabel() {
        return document.getElementById('sim-tooth-value')?.value || "";
    }
};

// Auto-init removed. app.js handles init().
if (false) {
    window.addEventListener('load', () => {
        if (document.getElementById('chapter-simulation')) {
            window.SimulationEngine.init();
        }
    });
}
