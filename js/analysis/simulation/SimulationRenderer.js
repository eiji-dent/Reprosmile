/**
 * SimulationRenderer.js
 * Mixin for SimulationEngine
 */
Object.assign(window.SimulationEngine, {

    // --------------------------------------------------------------- RESIZE
    _resizeCanvases() {
        if (!this.image) return;
        const area = this.container.querySelector('.sim-canvas-area');
        const W = area.clientWidth;
        const maxH = Math.min(window.innerHeight * 0.70, W * (this.image.height / this.image.width));
        const H = maxH || 400; // Fallback height if maxH is 0
        area.style.height = H + 'px';

        console.log(`[SimulationEngine] _resizeCanvases: Computed W=${W}, H=${H}, img=${this.image.width}x${this.image.height}`);

        [this.bgCanvas, this.fgCanvas, this.uiCanvas].forEach(c => {
            if (c) {
                // Changing width/height clears the canvas automatically
                c.width = W;
                c.height = H;
                // Force CSS dimensions explicitly to prevent flexbox collapsing
                c.style.width = W + 'px';
                c.style.height = H + 'px';
            }
        });

        // Compute scale/offset (letter-box fit)
        const scaleX = W / this.image.width;
        const scaleY = H / this.image.height;
        this.imgScale = Math.min(scaleX, scaleY);
        this.imgOffX = (W - this.image.width * this.imgScale) / 2;
        this.imgOffY = (H - this.image.height * this.imgScale) / 2;

        this._drawBackground();
        this._dirty = true;
    },

    _onResize() {
        if (this.image) this._resizeCanvases();
    },


    // --------------------------------------------------------------- DRAW BG
    _drawBackground() {
        if (!this.image) return;
        const { bgCtx: ctx, bgCanvas: c, image: img, imgScale: s, imgOffX: ox, imgOffY: oy } = this;
        console.log(`[SimulationEngine] _drawBackground: c.width=${c.width}, c.height=${c.height}, s=${s}, ox=${ox}, oy=${oy}`);
        if (!ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(img, ox, oy, img.width * s, img.height * s);
        console.log('[SimulationEngine] _drawBackground complete.');
    },


    // --------------------------------------------------------------- GAME LOOP
    _startLoop() {
        if (this._rafId) return;
        this._tick();
    },

    _tick() {
        this._rafId = requestAnimationFrame(this._tick);
        if (!this._dirty) return;
        this._dirty = false;
        this._renderFG();
        this._renderUI();
    },

    /** Draw the transformed extracted tooth onto fgCanvas */
    _renderFG() {
        const { fgCtx: ctx, fgCanvas: c } = this;
        ctx.clearRect(0, 0, c.width, c.height);

        if (this.mode !== 'simulate') return;

        ctx.globalAlpha = this.simOpacity !== undefined ? this.simOpacity : 1.0;

        this.simPieces.forEach(piece => {
            if (piece.grid) {
                this._drawWarpedPiece(ctx, piece);
            } else {
                // Fallback for old pieces (though all new pieces should have grid)
                const s = this.imgScale;
                const ox = this.imgOffX, oy = this.imgOffY;
                const bw = piece.bbox.width * s;
                const bh = piece.bbox.height * s;
                const cx = ox + piece.pos.x * s;
                const cy = oy + piece.pos.y * s;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(piece.rotation);
                ctx.scale(piece.flippedX ? -piece.scaleX : piece.scaleX, piece.scaleY);
                ctx.drawImage(piece.canvas, -bw / 2, -bh / 2, bw, bh);
                ctx.restore();
            }
        });
        ctx.globalAlpha = 1.0;
    },

    /** Draw polygon in-progress, transform handles, etc. onto uiCanvas */
    _renderUI() {
        const { uiCtx: ctx, uiCanvas: c } = this;
        ctx.clearRect(0, 0, c.width, c.height);

        if (this.mode === 'extract') {
            this._drawPolygon(ctx);
        } else if (this.mode === 'ai_extract') {
            // Draw multi-point hint guides
            if (this.aiHintPoints.length > 0) {
                const s = this.imgScale;
                const ox = this.imgOffX, oy = this.imgOffY;
                
                // Draw polygon area
                if (this.aiHintPoints.length >= 3) {
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
                    ctx.beginPath();
                    this.aiHintPoints.forEach((pt, i) => {
                        if (i === 0) ctx.moveTo(ox + pt.x * s, oy + pt.y * s);
                        else ctx.lineTo(ox + pt.x * s, oy + pt.y * s);
                    });
                    ctx.closePath();
                    ctx.fill();
                }

                // Draw lines and dots
                ctx.strokeStyle = '#38bdf8';
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 2;
                ctx.beginPath();
                this.aiHintPoints.forEach((pt, i) => {
                    if (i === 0) ctx.moveTo(ox + pt.x * s, oy + pt.y * s);
                    else ctx.lineTo(ox + pt.x * s, oy + pt.y * s);
                });
                if (this.aiHintPoints.length >= 3) ctx.closePath();
                ctx.stroke();
                ctx.setLineDash([]);

                this.aiHintPoints.forEach(pt => {
                    ctx.fillStyle = '#38bdf8';
                    ctx.beginPath();
                    ctx.arc(ox + pt.x * s, oy + pt.y * s, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                });
            }
        } else if (this.mode === 'simulate') {
            // Draw labels for all pieces to identify them
            this.simPieces.forEach((piece, idx) => {
                this._drawToothLabel(ctx, piece, idx === this.activePieceIdx);
            });

            if (this.activePieceIdx >= 0 && this.activePieceIdx < this.simPieces.length) {
                const piece = this.simPieces[this.activePieceIdx];
                if (this.isWarpMode) {
                    this._drawWarpGrid(ctx, piece);
                } else {
                    this._drawTransformHandles(ctx, piece);
                }
            }
        }
    },

    _drawToothLabel(ctx, piece, isActive) {
        if (!piece.toothLabel) return;
        const { imgScale: s, imgOffX: ox, imgOffY: oy } = this;
        const cx = ox + piece.pos.x * s;
        const cy = oy + piece.pos.y * s;

        ctx.save();
        ctx.font = 'bold 11px Inter, sans-serif';
        const label = piece.toothLabel;
        const metrics = ctx.measureText(label);
        const paddingH = 6;
        const paddingV = 3;
        const rectW = metrics.width + paddingH * 2;
        const rectH = 16;

        // Position it above the piece
        const tx = cx - rectW / 2;
        const ty = cy - (piece.bbox.height * s * piece.scaleY) / 2 - 20;

        // Background bubble
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = isActive ? '#2563eb' : 'rgba(51, 65, 85, 0.85)';
        
        const r = 4;
        ctx.beginPath();
        ctx.moveTo(tx + r, ty);
        ctx.lineTo(tx + rectW - r, ty);
        ctx.quadraticCurveTo(tx + rectW, ty, tx + rectW, ty + r);
        ctx.lineTo(tx + rectW, ty + rectH - r);
        ctx.quadraticCurveTo(tx + rectW, ty + rectH, tx + rectW - r, ty + rectH);
        ctx.lineTo(tx + r, ty + rectH);
        ctx.quadraticCurveTo(tx, ty + rectH, tx, ty + rectH - r);
        ctx.lineTo(tx, ty + r);
        ctx.quadraticCurveTo(tx, ty, tx + r, ty);
        ctx.closePath();
        ctx.fill();

        // Text
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, tx + rectW / 2, ty + rectH / 2 + 1);
        ctx.restore();
    },

    _drawWarpGrid(ctx, piece) {
        if (!piece || !piece.grid) return;
        const { imgScale: s, imgOffX: ox, imgOffY: oy } = this;
        const { points, rows, cols } = piece.grid;

        const bw = piece.bbox.width * s * piece.scaleX;
        const bh = piece.bbox.height * s * piece.scaleY;
        const cx = ox + piece.pos.x * s;
        const cy = oy + piece.pos.y * s;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(piece.rotation);
        if (piece.flippedX) ctx.scale(-1, 1);
        
        const toLocal = (p) => ({
            x: (p.x - 0.5) * bw,
            y: (p.y - 0.5) * bh
        });

        // 1. Minimalist Grid Lines
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)'; 
        ctx.lineWidth = 0.5;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const p1 = toLocal(points[r * cols + c]);
                const p2 = toLocal(points[r * cols + (c + 1)]);
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
            }
        }
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows - 1; r++) {
                const p1 = toLocal(points[r * cols + c]);
                const p2 = toLocal(points[(r + 1) * cols + c]);
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
            }
        }
        ctx.stroke();

        // 2. Minimalist Control Points
        points.forEach(p => {
            const lp = toLocal(p);
            ctx.beginPath();
            ctx.arc(lp.x, lp.y, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        ctx.restore();
    },

    _drawWarpedPiece(ctx, piece) {
        const { imgScale: s, imgOffX: ox, imgOffY: oy } = this;
        const { points, rows, cols } = piece.grid;
        const bw = piece.bbox.width;
        const bh = piece.bbox.height;

        const cx = ox + piece.pos.x * s;
        const cy = oy + piece.pos.y * s;
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(piece.rotation);
        ctx.scale(piece.flippedX ? -piece.scaleX : piece.scaleX, piece.scaleY);
        ctx.translate(-bw * s / 2, -bh * s / 2);

        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const i00 = r * cols + c;
                const i10 = r * cols + (c + 1);
                const i01 = (r + 1) * cols + c;
                const i11 = (r + 1) * cols + (c + 1);

                this._drawTriangle(ctx, piece.canvas, points[i00], points[i10], points[i01], bw, bh, s);
                this._drawTriangle(ctx, piece.canvas, points[i10], points[i11], points[i01], bw, bh, s);
            }
        }
        ctx.restore();
    },

    _drawTriangle(ctx, image, p0, p1, p2, bw, bh, s) {
        const u0 = p0.baseX * bw, v0 = p0.baseY * bh;
        const u1 = p1.baseX * bw, v1 = p1.baseY * bh;
        const u2 = p2.baseX * bw, v2 = p2.baseY * bh;

        const x0 = p0.x * bw * s, y0 = p0.y * bh * s;
        const x1 = p1.x * bw * s, y1 = p1.y * bh * s;
        const x2 = p2.x * bw * s, y2 = p2.y * bh * s;

        ctx.save();
        
        // Seam protection: slightly expand clip area
        const pad = 0.8; 
        const midX = (x0 + x1 + x2) / 3, midY = (y0 + y1 + y2) / 3;
        const px = (x, y) => {
            const dx = x - midX, dy = y - midY;
            const len = Math.hypot(dx, dy);
            return { x: x + (dx / len) * pad, y: y + (dy / len) * pad };
        };
        const p0p = px(x0, y0), p1p = px(x1, y1), p2p = px(x2, y2);

        ctx.beginPath();
        ctx.moveTo(p0p.x, p0p.y); ctx.lineTo(p1p.x, p1p.y); ctx.lineTo(p2p.x, p2p.y);
        ctx.closePath();
        ctx.clip();

        const det = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
        if (Math.abs(det) < 0.0001) { ctx.restore(); return; }

        const a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / det;
        const b = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / det;
        const c = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / det;
        const d = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / det;
        const e = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / det;
        const f = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / det;

        ctx.transform(a, b, c, d, e, f);
        ctx.drawImage(image, 0, 0);
        ctx.restore();
    },

    _drawPolygon(ctx) {
        if (this.polyPoints.length === 0) return;
        const { imgScale: s, imgOffX: ox, imgOffY: oy } = this;

        const toScreen = (p) => ({ x: ox + p.x * s, y: oy + p.y * s });

        // Draw lines
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#2563eb';

        const pts = this.polyPoints.map(toScreen);

        if (pts.length < 3) {
            // Fallback to lines
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        } else {
            if (this.polygonClosed) {
                // Smooth Closed Path
                let startX = (pts[pts.length - 1].x + pts[0].x) / 2;
                let startY = (pts[pts.length - 1].y + pts[0].y) / 2;
                ctx.moveTo(startX, startY);

                for (let i = 0; i < pts.length; i++) {
                    let nextP = pts[(i + 1) % pts.length];
                    let xc = (pts[i].x + nextP.x) / 2;
                    let yc = (pts[i].y + nextP.y) / 2;
                    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
                }
                ctx.closePath();
            } else {
                // Smooth Open Path (Curve between midpoints, but start/end at actual points)
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length - 1; i++) {
                    const xc = (pts[i].x + pts[i + 1].x) / 2;
                    const yc = (pts[i].y + pts[i + 1].y) / 2;
                    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
                }
                // Line to actual last point
                ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            }
        }

        // If polygon closed, draw fill too
        if (this.polygonClosed) {
            ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
            ctx.fill();
        }

        ctx.stroke();
        ctx.setLineDash([]);

        // Draw vertices
        this.polyPoints.forEach((pt, i) => {
            const { x, y } = toScreen(pt);
            ctx.beginPath();
            ctx.arc(x, y, i === 0 ? 7 : 5, 0, Math.PI * 2);
            ctx.fillStyle = i === 0 ? '#10b981' : '#2563eb';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Rubber-band line to first point (closing hint) if >= 3 points
        if (this.polyPoints.length >= 3 && !this.polygonClosed) {
            const first = toScreen(this.polyPoints[0]);
            const last = toScreen(this.polyPoints[this.polyPoints.length - 1]);
            ctx.beginPath();
            ctx.setLineDash([4, 5]);
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(first.x, first.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    },

    _drawTransformHandles(ctx, piece) {
        if (!piece || !piece.canvas) return;
        const { imgScale: s, imgOffX: ox, imgOffY: oy } = this;

        const bw = piece.bbox.width * s * piece.scaleX;
        const bh = piece.bbox.height * s * piece.scaleY;
        const cx = ox + piece.pos.x * s;
        const cy = oy + piece.pos.y * s;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(piece.rotation);
        if (piece.flippedX) ctx.scale(-1, 1);

        // Dashed bounding box
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.7)';
        ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
        ctx.setLineDash([]);

        // Corner handles (scale)
        const corners = [
            { x: -bw / 2, y: -bh / 2 },
            { x:  bw / 2, y: -bh / 2 },
            { x:  bw / 2, y:  bh / 2 },
            { x: -bw / 2, y:  bh / 2 },
        ];
        corners.forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Side handles (tabs for aspect ratio change)
        const sideTabs = [
            { x: 0, y: -bh / 2, w: 22, h: 7 }, // Top
            { x: 0, y:  bh / 2, w: 22, h: 7 }, // Bottom
            { x: -bw / 2, y: 0, w: 7, h: 22 }, // Left
            { x:  bw / 2, y: 0, w: 7, h: 22 }, // Right
        ];
        sideTabs.forEach(st => {
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(st.x - st.w/2, st.y - st.h/2, st.w, st.h, 3);
            } else {
                ctx.rect(st.x - st.w/2, st.y - st.h/2, st.w, st.h);
            }
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });

        // Rotation handle — circle above center
        const rotHandleY = -bh / 2 - 30;
        // Stem
        ctx.beginPath();
        ctx.moveTo(0, -bh / 2);
        ctx.lineTo(0, rotHandleY);
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Knob
        ctx.beginPath();
        ctx.arc(0, rotHandleY, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#2563eb';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Refresh icon in rotation knob
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↻', 0, rotHandleY);

        // Cache rotation handle position in screen space for hit testing
        const cos = Math.cos(piece.rotation);
        const sin = Math.sin(piece.rotation);
        const rsx = cx + (0 * cos - rotHandleY * sin);
        const rsy = cy + (0 * sin + rotHandleY * cos);
        this.rotateHandle = { x: rsx, y: rsy };

        ctx.restore();
    },



});
