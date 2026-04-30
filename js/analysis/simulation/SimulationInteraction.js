/**
 * SimulationInteraction.js
 * Mixin for SimulationEngine
 */
Object.assign(window.SimulationEngine, {

    // --------------------------------------------------------------- HIT TESTING
    /**
     * Returns 'rotate' | 'corner-tl' | 'corner-tr' | 'corner-br' | 'corner-bl' | 'move' | null
     */
    _hitTest(scx, scy) {
        if (this.mode !== 'simulate' || this.simPieces.length === 0) return null;

        const { imgScale: s, imgOffX: ox, imgOffY: oy } = this;

        // 1. Check handles of active piece first (if any)
        if (this.activePieceIdx >= 0 && this.activePieceIdx < this.simPieces.length) {
            const activePiece = this.simPieces[this.activePieceIdx];
            
            // Warp Mode: Check Grid Points
            if (this.isWarpMode && activePiece.grid) {
                const bw = activePiece.bbox.width * s * activePiece.scaleX;
                const bh = activePiece.bbox.height * s * activePiece.scaleY;
                const cx = ox + activePiece.pos.x * s;
                const cy = oy + activePiece.pos.y * s;
                const cos = Math.cos(-activePiece.rotation);
                const sin = Math.sin(-activePiece.rotation);
                const dx = scx - cx;
                const dy = scy - cy;
                let lx = dx * cos - dy * sin;
                const ly = dx * sin + dy * cos;
                if (activePiece.flippedX) lx = -lx;

                for (let i = 0; i < activePiece.grid.points.length; i++) {
                    const p = activePiece.grid.points[i];
                    const px = (p.x - 0.5) * bw;
                    const py = (p.y - 0.5) * bh;
                    if (Math.hypot(lx - px, ly - py) <= 15) {
                        return { action: 'warp', idx: this.activePieceIdx, gridIdx: i };
                    }
                }
            }

            // Standard Mode handles
            if (!this.isWarpMode) {
                // Rotate handle
                if (this.rotateHandle) {
                    const d = Math.hypot(scx - this.rotateHandle.x, scy - this.rotateHandle.y);
                    if (d <= 14) return { action: 'rotate', idx: this.activePieceIdx };
                }

                const bw = activePiece.bbox.width * s * activePiece.scaleX;
                const bh = activePiece.bbox.height * s * activePiece.scaleY;
                const cx = ox + activePiece.pos.x * s;
                const cy = oy + activePiece.pos.y * s;

                // Transform screen coords to active piece-local coords
                const cos = Math.cos(-activePiece.rotation);
                const sin = Math.sin(-activePiece.rotation);
                const dx = scx - cx;
                const dy = scy - cy;
                let lx = dx * cos - dy * sin;
                const ly = dx * sin + dy * cos;
                if (activePiece.flippedX) lx = -lx;

                const hw = bw / 2, hh = bh / 2;

                // Corner handles
                const corners = [
                    { name: 'corner-tl', x: -hw, y: -hh },
                    { name: 'corner-tr', x:  hw, y: -hh },
                    { name: 'corner-br', x:  hw, y:  hh },
                    { name: 'corner-bl', x: -hw, y:  hh },
                ];
                for (const corn of corners) {
                    if (Math.hypot(lx - corn.x, ly - corn.y) <= 14) {
                        return { action: corn.name, idx: this.activePieceIdx };
                    }
                }

                // Side handles (T, B, L, R)
                const sides = [
                    { name: 'side-t', x: 0, y: -hh },
                    { name: 'side-b', x: 0, y:  hh },
                    { name: 'side-l', x: -hw, y: 0 },
                    { name: 'side-r', x:  hw, y: 0 },
                ];
                for (const side of sides) {
                    if (Math.hypot(lx - side.x, ly - side.y) <= 22) {
                        return { action: side.name, idx: this.activePieceIdx };
                    }
                }
            }
        }

        // 2. Check piece bounding boxes (from top to bottom)
        for (let i = this.simPieces.length - 1; i >= 0; i--) {
            const piece = this.simPieces[i];
            const bw = piece.bbox.width * s * piece.scaleX;
            const bh = piece.bbox.height * s * piece.scaleY;
            const cx = ox + piece.pos.x * s;
            const cy = oy + piece.pos.y * s;

            const cos = Math.cos(-piece.rotation);
            const sin = Math.sin(-piece.rotation);
            const dx = scx - cx;
            const dy = scy - cy;
            let lx = dx * cos - dy * sin;
            const ly = dx * sin + dy * cos;
            if (piece.flippedX) lx = -lx;

            const hw = bw / 2, hh = bh / 2;
            if (lx >= -hw && lx <= hw && ly >= -hh && ly <= hh) {
                return { action: 'move', idx: i };
            }
        }

        return null;
    },


    // --------------------------------------------------------------- EVENT LISTENERS
    _setupEventListeners() {
        const uiCanvas = this.uiCanvas;
        if (!uiCanvas) return;

        // Mouse
        uiCanvas.addEventListener('mousedown',  (e) => this._onPointerDown(e));
        uiCanvas.addEventListener('mousemove',  (e) => this._onPointerMove(e));
        window.addEventListener('mouseup',      (e) => this._onPointerUp(e));

        // Touch (iPad)
        uiCanvas.addEventListener('touchstart', (e) => this._onPointerDown(e), { passive: false });
        uiCanvas.addEventListener('touchmove',  (e) => this._onPointerMove(e), { passive: false });
        window.addEventListener('touchend',     (e) => this._onPointerUp(e));

        // Toolbar buttons
        const btnAIAssist = document.getElementById('sim-btn-ai-assist');
        const btnExtract = document.getElementById('sim-btn-extract');
        const btnSimulate = document.getElementById('sim-btn-simulate');
        const btnConfirm = document.getElementById('sim-btn-confirm');
        const btnReset = document.getElementById('sim-btn-reset');
        const btnWarp = document.getElementById('sim-btn-warp');
        const btnSnapshot = document.getElementById('sim-btn-snapshot');
        const btnDelete = document.getElementById('sim-btn-delete');
        const opacitySlider = document.getElementById('sim-opacity-slider');
        const opacityLabel = document.getElementById('sim-opacity-label');

        if (btnAIAssist) btnAIAssist.addEventListener('click', () => this._switchMode('ai_extract'));

        if (btnExtract)  btnExtract.addEventListener('click',  () => this._switchMode('extract'));
        if (btnSimulate) btnSimulate.addEventListener('click', () => {
            this.isWarpMode = false;
            this._switchMode('simulate');
        });
        if (btnWarp)     btnWarp.addEventListener('click',     () => this.toggleWarpMode());
        if (btnConfirm)  btnConfirm.addEventListener('click',  () => {
            const engine = window.SimulationEngine;
            if (engine.mode === 'ai_extract') {
                // If in AI mode, Confirm acts as "Analyze Execute"
                if (typeof engine._runAISegmentation === 'function') {
                    engine._runAISegmentation();
                }
            } else {
                engine._confirmPolygon();
            }
        });
        if (btnReset)    btnReset.addEventListener('click',    () => this.reset(true));
        if (btnSnapshot) btnSnapshot.addEventListener('click', () => this.exportSnapshot());
        if (btnDelete)   btnDelete.addEventListener('click',   () => this.deleteActivePiece());
        
        const btnFlip = document.getElementById('sim-btn-flip');
        if (btnFlip)     btnFlip.addEventListener('click',     () => this.flipActivePiece());

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (this.mode === 'simulate' && (e.key === 'Backspace' || e.key === 'Delete')) {
                this.deleteActivePiece();
            }
        });

        const btnAIHeader = document.getElementById('sim-btn-ai');
        if (btnAIHeader) btnAIHeader.addEventListener('click', () => this._switchMode('ai_extract'));

        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => {
                this.simOpacity = parseInt(e.target.value) / 100;
                if (opacityLabel) opacityLabel.textContent = e.target.value + '%';
                this._dirty = true;
            });
        }

        const toothBtn = document.getElementById('sim-tooth-btn');
        const toothPopover = document.getElementById('sim-tooth-popover');
        const toothValue = document.getElementById('sim-tooth-value');
        const toothBtnText = document.getElementById('sim-tooth-btn-text');
        const toothItems = document.querySelectorAll('.sim-tooth-item');

        if (toothBtn) {
            toothBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = toothPopover.style.display === 'block';
                toothPopover.style.display = isVisible ? 'none' : 'block';
            });
        }

        toothItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const val = item.getAttribute('data-value');
                if (toothValue) toothValue.value = val;
                if (toothBtnText) toothBtnText.textContent = val;
                
                // Highlight active
                toothItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                if (toothPopover) toothPopover.style.display = 'none';
                
                // Automatically switch to AI Assist mode once tooth is selected
                if (window.SimulationEngine.image) {
                    window.SimulationEngine._switchMode('ai_extract');
                } else {
                    window.SimulationEngine._updateToolbarState();
                }
            });
        });

        window.addEventListener('click', () => {
            if (toothPopover) toothPopover.style.display = 'none';
        });

        // Resize
        window.addEventListener('resize', this._onResize);
    },

    // ------- Pointer helpers
    _getCanvasCoords(e) {
        const rect = this.uiCanvas.getBoundingClientRect();
        let cx, cy;
        if (e.touches) {
            const t = e.touches[0] || e.changedTouches[0];
            cx = t.clientX - rect.left;
            cy = t.clientY - rect.top;
        } else {
            cx = e.clientX - rect.left;
            cy = e.clientY - rect.top;
        }
        return { scx: cx, scy: cy };
    },

    /** Screen → image coords */
    _screenToImage(scx, scy) {
        return {
            x: (scx - this.imgOffX) / this.imgScale,
            y: (scy - this.imgOffY) / this.imgScale,
        };
    },

    _onPointerDown(e) {
        if (e.cancelable) e.preventDefault();
        const { scx, scy } = this._getCanvasCoords(e);

        if (this.mode === 'extract') {
            const imgPt = this._screenToImage(scx, scy);

            // If polygon is already closed (fine-tuning mode), check for dragging existing points
            if (this.polygonClosed) {
                const ox = this.imgOffX, oy = this.imgOffY, s = this.imgScale;
                for (let i = 0; i < this.polyPoints.length; i++) {
                    const p = this.polyPoints[i];
                    const sx = ox + p.x * s;
                    const sy = oy + p.y * s;
                    if (Math.hypot(scx - sx, scy - sy) < 15) {
                        this.dragPolyIdx = i;
                        this._dirty = true;
                        return;
                    }
                }
            } else {
                // Initial plotting mode: Close polygon if clicking near first point
                if (this.polyPoints.length >= 3) {
                    const first = this.polyPoints[0];
                    const firstScreen = {
                        x: this.imgOffX + first.x * this.imgScale,
                        y: this.imgOffY + first.y * this.imgScale,
                    };
                    if (Math.hypot(scx - firstScreen.x, scy - firstScreen.y) < 18) {
                        this._confirmPolygon();
                        return;
                    }
                }
                // Add new point
                this.polyPoints.push(imgPt);
                this._updateToolbarState();
                this._dirty = true;
                return;
            }
        }

        if (this.mode === 'ai_extract') {
            const imgPt = this._screenToImage(scx, scy);
            this.aiHintPoints.push(imgPt);
            this._updateBanner();
            this._updateToolbarState();
            this._dirty = true;
            return;
        }

        if (this.mode === 'simulate') {
            const hit = this._hitTest(scx, scy);
            
            // Clicking outside deselects
            if (!hit) {
                this.activePieceIdx = -1;
                this._updateToolbarState();
                this._dirty = true;
                return;
            }

            // Bring to front logic could be added here
            this.activePieceIdx = hit.idx;
            this._updateToolbarState();
            const piece = this.simPieces[hit.idx];
            this._dirty = true;

            // Sync tooth selector
            const valInput = document.getElementById('sim-tooth-value');
            const btnText = document.getElementById('sim-tooth-btn-text');
            const items = document.querySelectorAll('.sim-tooth-item');

            if (piece.toothLabel) {
                if (btnText) btnText.textContent = piece.toothLabel;
                
                items.forEach(item => {
                    if (item.getAttribute('data-value') === piece.toothLabel) {
                        item.classList.add('active');
                        if (valInput) valInput.value = piece.toothLabel;
                    } else {
                        item.classList.remove('active');
                    }
                });
            }

            if (hit.action === 'warp') {
                this.isWarping = true;
                this.warpGridIdx = hit.gridIdx;
            } else if (hit.action === 'rotate') {
                this.isRotating = true;
                const cx = this.imgOffX + piece.pos.x * this.imgScale;
                const cy = this.imgOffY + piece.pos.y * this.imgScale;
                this.rotateStart = {
                    angle: Math.atan2(scy - cy, scx - cx),
                    rotation: piece.rotation,
                };
            } else if (hit.action.startsWith('corner') || hit.action.startsWith('side')) {
                this.isScaling = true;
                this.scaleHandlePos = hit.action;
                this.scaleStart = {
                    scx, scy,
                    sx: piece.scaleX,
                    sy: piece.scaleY,
                };
            } else if (hit.action === 'move') {
                this.isDragging = true;
                this.dragStart = {
                    scx, scy,
                    px: piece.pos.x,
                    py: piece.pos.y,
                };
            }
        }
    },

    _onPointerMove(e) {
        if (e.cancelable) e.preventDefault();
        const { scx, scy } = this._getCanvasCoords(e);

        if (this.mode === 'extract' && this.dragPolyIdx !== -1) {
            this.polyPoints[this.dragPolyIdx] = this._screenToImage(scx, scy);
            this._dirty = true;
            return;
        }

        if (this.mode === 'simulate' && this.activePieceIdx >= 0) {
            const piece = this.simPieces[this.activePieceIdx];
            if (this.isWarping) {
                const s = this.imgScale, ox = this.imgOffX, oy = this.imgOffY;
                const bw = piece.bbox.width * s * piece.scaleX;
                const bh = piece.bbox.height * s * piece.scaleY;
                const cx = ox + piece.pos.x * s;
                const cy = oy + piece.pos.y * s;
                const cos = Math.cos(-piece.rotation);
                const sin = Math.sin(-piece.rotation);

                const dx = scx - cx;
                const dy = scy - cy;
                let lx = dx * cos - dy * sin;
                const ly = dx * sin + dy * cos;
                if (piece.flippedX) lx = -lx;

                piece.grid.points[this.warpGridIdx].x = lx / bw + 0.5;
                piece.grid.points[this.warpGridIdx].y = ly / bh + 0.5;
                this._dirty = true;
            } else if (this.isDragging) {
                const dx = (scx - this.dragStart.scx) / this.imgScale;
                const dy = (scy - this.dragStart.scy) / this.imgScale;
                piece.pos.x = this.dragStart.px + dx;
                piece.pos.y = this.dragStart.py + dy;
                this._dirty = true;
            } else if (this.isRotating) {
                const cx = this.imgOffX + piece.pos.x * this.imgScale;
                const cy = this.imgOffY + piece.pos.y * this.imgScale;
                const angle = Math.atan2(scy - cy, scx - cx);
                piece.rotation = this.rotateStart.rotation + (angle - this.rotateStart.angle);
                this._dirty = true;
            } else if (this.isScaling) {
                const action = this.scaleHandlePos;
                const s = this.imgScale, ox = this.imgOffX, oy = this.imgOffY;

                // local relative coordinates of the pointer
                const cx = ox + piece.pos.x * s;
                const cy = oy + piece.pos.y * s;
                const cos = Math.cos(-piece.rotation);
                const sin = Math.sin(-piece.rotation);
                let ldx = (scx - cx) * cos - (scy - cy) * sin;
                const ldy = (scx - cx) * sin + (scy - cy) * cos;
                if (piece.flippedX) ldx = -ldx;
                
                if (action.startsWith('side-')) {
                    // Non-uniform scaling (Aspect Ratio change)
                    if (action === 'side-r' || action === 'side-l') {
                        const newScaleX = Math.abs(ldx) / (piece.bbox.width * s / 2);
                        piece.scaleX = Math.max(0.1, Math.min(5, newScaleX));
                    } else {
                        const newScaleY = Math.abs(ldy) / (piece.bbox.height * s / 2);
                        piece.scaleY = Math.max(0.1, Math.min(5, newScaleY));
                    }
                } else {
                    // Uniform scaling (Maintain aspect ratio from corner)
                    const dist = Math.hypot(ldx, ldy);
                    const origHalfDist = Math.hypot(piece.bbox.width * s / 2, piece.bbox.height * s / 2);
                    const factor = dist / origHalfDist;
                    piece.scaleX = Math.max(0.1, Math.min(5, this.scaleStart.sx * factor));
                    piece.scaleY = Math.max(0.1, Math.min(5, this.scaleStart.sy * factor));
                }
                this._dirty = true;
            }

            // Cursor feedback
            const hit = this._hitTest(scx, scy);
            const cursorMap = {
                warp: 'crosshair',
                rotate: 'grab',
                'corner-tl': 'nwse-resize',
                'corner-tr': 'nesw-resize',
                'corner-br': 'nwse-resize',
                'corner-bl': 'nesw-resize',
                'side-t': 'ns-resize',
                'side-b': 'ns-resize',
                'side-l': 'ew-resize',
                'side-r': 'ew-resize',
                move: 'move',
            };
            this.uiCanvas.style.cursor = (hit && hit.idx === this.activePieceIdx) ? (cursorMap[hit.action] || 'default') : 'default';
            if (hit && hit.action === 'move' && hit.idx !== this.activePieceIdx) {
                 this.uiCanvas.style.cursor = 'pointer';
            }
        }
    },

    _onPointerUp(e) {
        this.isDragging = false;
        this.isRotating = false;
        this.isScaling = false;
        this.isWarping = false;
        this.dragPolyIdx = -1;
        this.warpGridIdx = -1;
        this.dragStart = null;
        this.rotateStart = null;
        this.scaleStart = null;
    },



});
