/**
 * SimulationAI.js
 * Mixin for SimulationEngine
 */
Object.assign(window.SimulationEngine, {

    // --------------------------------------------------------------- EXTRACTION
    /**
     * Execute polygon extraction.
     * Uses Bounding Box approach: only extracts the rect around the polygon,
     * then applies a clipping mask. Keeps memory minimal for Safari.
     */
    _extractPolygon() {
        if (this.polyPoints.length < 3) return false;

        // 1. Compute bounding box in image space
        const xs = this.polyPoints.map(p => p.x);
        const ys = this.polyPoints.map(p => p.y);
        const minX = Math.max(0, Math.floor(Math.min(...xs)));
        const minY = Math.max(0, Math.floor(Math.min(...ys)));
        const maxX = Math.min(this.image.width,  Math.ceil(Math.max(...xs)));
        const maxY = Math.min(this.image.height, Math.ceil(Math.max(...ys)));
        const bw = maxX - minX;
        const bh = maxY - minY;

        this.extractBBox = { x: minX, y: minY, width: bw, height: bh };

        // 2. Offscreen canvas (bounding-box size only)
        const off = document.createElement('canvas');
        off.width = bw; off.height = bh;
        const octx = off.getContext('2d');

        // 2a. Draw the source image fragment
        octx.drawImage(this.image, minX, minY, bw, bh, 0, 0, bw, bh);

        // 2b. Build clipping mask: polygon coords shifted to bbox-local space
        octx.globalCompositeOperation = 'destination-in';
        octx.beginPath();
        const pts = this.polyPoints.map(pt => ({ x: pt.x - minX, y: pt.y - minY }));

        if (pts.length < 3) {
            octx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) octx.lineTo(pts[i].x, pts[i].y);
        } else {
            // Smooth Closed Path for clipping
            let startX = (pts[pts.length - 1].x + pts[0].x) / 2;
            let startY = (pts[pts.length - 1].y + pts[0].y) / 2;
            octx.moveTo(startX, startY);

            for (let i = 0; i < pts.length; i++) {
                let nextP = pts[(i + 1) % pts.length];
                let xc = (pts[i].x + nextP.x) / 2;
                let yc = (pts[i].y + nextP.y) / 2;
                octx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
            }
        }
        octx.closePath();
        octx.fillStyle = 'rgba(0,0,0,1)';
        octx.fill();
        octx.globalCompositeOperation = 'source-over';

        // 3. Create piece object and add to array
        // Initialize 4x4 Grid for Mesh Deformation
        const gridPoints = [];
        const rows = 4, cols = 4;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                gridPoints.push({
                    baseX: c / (cols - 1),
                    baseY: r / (rows - 1),
                    x: c / (cols - 1), // 0.0 to 1.0
                    y: r / (rows - 1)  // 0.0 to 1.0
                });
            }
        }

        const newPiece = {
            id: this._nextPieceId++,
            canvas: off,
            bbox: this.extractBBox,
            pos: { x: minX + bw / 2, y: minY + bh / 2 },
            scaleX: 1.0,
            scaleY: 1.0,
            rotation: 0,
            flippedX: false,
            grid: {
                rows, cols,
                points: gridPoints
            },
            toothLabel: this._getSelectedToothLabel()
        };
        this.simPieces.push(newPiece);
        this.activePieceIdx = this.simPieces.length - 1;

        // Reset polygon for next extraction
        this.polyPoints = [];
        this.polygonClosed = false;

        // Reset tooth selector UI
        const valInput = document.getElementById('sim-tooth-value');
        if (valInput) valInput.value = "";
        const btnText = document.getElementById('sim-tooth-btn-text');
        if (btnText) btnText.textContent = "歯番選択";
        const items = document.querySelectorAll('.sim-tooth-item');
        items.forEach(i => i.classList.remove('active'));

        this._updateToolbarState();

        return true;
    },


    // --------------------------------------------------------------- AI SEGMENTATION
    async _runAISegmentation() {
        if (!window.initInteractiveSegmenter || this.aiHintPoints.length < 3) return;
        
        this.isAIRunning = true;
        this._updateBanner();

        try {
            const segmenter = await window.initInteractiveSegmenter();
            
            // 1. Calculate Crop Area (Image space)
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            let sumX = 0, sumY = 0;
            this.aiHintPoints.forEach(pt => {
                minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y);
                maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y);
                sumX += pt.x; sumY += pt.y;
            });
            const avgX = sumX / this.aiHintPoints.length;
            const avgY = sumY / this.aiHintPoints.length;

            const w = maxX - minX, h = maxY - minY;
            const margin = Math.max(w, h) * 0.4;
            
            const naturalW = this.image.naturalWidth || this.image.width;
            const naturalH = this.image.naturalHeight || this.image.height;

            const finalCropX = Math.max(0, Math.floor(minX - margin));
            const finalCropY = Math.max(0, Math.floor(minY - margin));
            const finalCropW = Math.min(naturalW, Math.ceil(maxX + margin)) - finalCropX;
            const finalCropH = Math.min(naturalH, Math.ceil(maxY + margin)) - finalCropY;

            // 2. Prepare AI Canvas (Downscaled)
            const maxSide = 1024;
            const scale = Math.min(1.0, maxSide / Math.max(finalCropW, finalCropH));
            const outW = Math.round(finalCropW * scale);
            const outH = Math.round(finalCropH * scale);
            
            const aiCanvas = document.createElement('canvas');
            aiCanvas.width = outW; aiCanvas.height = outH;
            const aiCtx = aiCanvas.getContext('2d');
            aiCtx.drawImage(this.image, finalCropX, finalCropY, finalCropW, finalCropH, 0, 0, outW, outH);

            // 3. Prepare User Constraint Mask (Polygon enclosure)
            const roiCanvas = document.createElement('canvas');
            roiCanvas.width = outW; roiCanvas.height = outH;
            const roiCtx = roiCanvas.getContext('2d');
            roiCtx.fillStyle = '#000';
            roiCtx.fillRect(0, 0, outW, outH);
            roiCtx.fillStyle = '#fff';
            roiCtx.beginPath();
            this.aiHintPoints.forEach((pt, i) => {
                const lx = (pt.x - finalCropX) * scale;
                const ly = (pt.y - finalCropY) * scale;
                if (i === 0) roiCtx.moveTo(lx, ly); else roiCtx.lineTo(lx, ly);
            });
            roiCtx.closePath();
            roiCtx.fill();
            const roiData = roiCtx.getImageData(0, 0, outW, outH).data;

            // 4. Run AI with Inset Scribble
            const scribble = this.aiHintPoints.map(pt => {
                const dx = pt.x - avgX, dy = pt.y - avgY;
                const insetX = avgX + dx * 0.7, insetY = avgY + dy * 0.7;
                return { x: (insetX - finalCropX) / finalCropW, y: (insetY - finalCropY) / finalCropH };
            });
            
            const result = await segmenter.segment(aiCanvas, { scribble }, performance.now());

            const maskObj = result.categoryMask;
            if (maskObj) {
                const rawMask = maskObj.getAsUint8Array ? maskObj.getAsUint8Array() : maskObj.getAsFloat32Array();
                const isRGBA = (rawMask.length === outW * outH * 4);
                
                // --- INVERSION CHECK ---
                // Check if the AI thought our hint points are "Background" (0).
                // If so, it means the mask is inverted for this model/environment.
                let hitSum = 0;
                scribble.forEach(p => {
                    const ix = Math.floor(p.x * outW), iy = Math.floor(p.y * outH);
                    const idx = iy * outW + ix;
                    const val = isRGBA ? rawMask[idx * 4] : rawMask[idx];
                    if (val > 0) hitSum++;
                });
                
                const hitRate = hitSum / scribble.length;
                const shouldInvert = (hitRate < 0.3); // If less than 30% hits, it's likely inverted
                console.log(`[AI Debug] Mask Inversion Check: hitRate=${hitRate.toFixed(2)}, shouldInvert=${shouldInvert}`);

                // Final Mask = Intersect ( (AI Result XOR Invert) , User Boundary)
                const intersectionMask = new Uint8Array(outW * outH);
                let fgCount = 0;
                for (let i = 0; i < outW * outH; i++) {
                    let aiVal = isRGBA ? rawMask[i * 4] : rawMask[i];
                    if (shouldInvert) aiVal = (aiVal > 0) ? 0 : 255; // Reverse logic
                    
                    const userVal = roiData[i * 4];
                    if (aiVal > 0 && userVal > 128) {
                        intersectionMask[i] = 255;
                        fgCount++;
                    }
                }
                console.log(`[AI Debug] Final FG Pixels: ${fgCount}`);

                // 5. Trace Contour
                const points = window.SimulationEngine._maskToPolygon({ 
                    width: outW, height: outH, mask: intersectionMask 
                }, finalCropX, finalCropY, finalCropW, finalCropH);

                if (points && points.length > 5) {
                    this.polyPoints = points;
                    this.aiHintPoints = [];
                    this.polygonClosed = true;
                    // Switch to manual edit mode instead of direct simulation
                    this._switchMode('extract');
                } else {
                    alert('歯の形状を特定できませんでした。もう少しだけ歯の内側も含めて囲んでみてください。');
                }
            }
        } catch (err) {
            console.error('[AI Error]', err);
            alert('AI解析に失敗しました。');
        } finally {
            this.isAIRunning = false;
            this._updateBanner();
            this._dirty = true;
        }
    },

    /** Robust Mapper & Tracer */
    _maskToPolygon(data, cropX, cropY, cropW, cropH) {
        const { width, height, mask } = data;
        const isFGD = (x, y) => {
            if (x <= 1 || x >= width - 2 || y <= 1 || y >= height - 2) return false;
            return mask[y * width + x] > 0;
        };

        let startX = -1, startY = -1;
        search: for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (isFGD(x, y)) { startX = x; startY = y; break search; }
            }
        }
        if (startX === -1) return null;

        const points = [];
        let currX = startX, currY = startY;
        let prevX = startX - 1, prevY = startY;
        const directions = [[0,-1], [1,-1], [1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1]];
        
        for (let safety = 0; safety < 5000; safety++) {
            points.push({ 
                x: (currX / width) * cropW + cropX, 
                y: (currY / height) * cropH + cropY 
            });

            let startDir = 0;
            for (let i = 0; i < 8; i++) {
                if (currX + directions[i][0] === prevX && currY + directions[i][1] === prevY) {
                    startDir = i; break;
                }
            }
            let found = false;
            for (let i = 1; i <= 8; i++) {
                const d = (startDir + i) % 8;
                const nx = currX + directions[d][0], ny = currY + directions[d][1];
                if (isFGD(nx, ny)) {
                    prevX = currX; prevY = currY;
                    currX = nx; currY = ny;
                    found = true; break;
                }
            }
            if (!found || (currX === startX && currY === startY)) break;
        }

        const samples = [];
        const step = Math.max(1, Math.floor(points.length / 24));
        for (let i = 0; i < points.length; i += step) samples.push(points[i]);
        return samples;
    },



});
