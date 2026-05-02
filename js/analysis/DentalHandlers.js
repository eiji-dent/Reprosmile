window.DentalHandlers = {
    // --- Drawing Methods ---
    drawIntraoral(card, mapC) {
        const tool = card.activeTool;
        const pts = card.lines;
        const temp = card.tempPoints;
        const state = card.drawState;

        // Draw established lines
        if (pts.wlRatio) this.drawWlRatio(card, pts.wlRatio, mapC, false);
        if (pts.redProp) this.drawRedProp(card, pts.redProp, mapC, false);
        if (pts.pinkEsth) this.drawPinkEsth(card, pts.pinkEsth, mapC, false);
        if (pts.axialIncl) this.drawAxial(card, pts.axialIncl, mapC, false);
        if (pts.papilla) this.drawPapilla(card, pts.papilla, mapC, false);
        if (pts['align-p3']) this.drawAlignmentGuide(card, pts['align-p3'], mapC, false);

        // Draw preview for active tool
        if (state === 'multi-point' && temp.length > 0) {
            if (tool === 'wl-ratio') this.drawWlRatio(card, temp, mapC, true, card.tempEnd);
            else if (tool === 'red-prop') this.drawRedProp(card, temp, mapC, true);
            else if (tool === 'pink-esth') this.drawPinkEsth(card, temp, mapC, true);
            else if (tool === 'axial-incl') this.drawAxial(card, temp, mapC, true);
            else if (tool === 'papilla') this.drawPapilla(card, temp, mapC, true);
            else if (tool === 'align-p3') this.drawAlignmentGuide(card, temp, mapC, true, card.tempEnd);
        }
    },

    drawAlignmentGuide(card, pts, mapC, isPre, tempEnd) {
        const ctx = card.ctx;
        ctx.lineWidth = 1; ctx.strokeStyle = '#db2777'; // Pinkish for midline
        ctx.setLineDash(isPre ? [5, 5] : []);

        if (pts.length > 0) {
            const p0 = mapC(pts[0].x, pts[0].y);
            const p1 = pts.length > 1 ? mapC(pts[1].x, pts[1].y) : (tempEnd ? mapC(tempEnd.realX, tempEnd.realY) : null);

            if (p1) {
                const dx = p1.x - p0.x;
                const dy = p1.y - p0.y;
                const len = Math.hypot(dx, dy);
                if (len > 0) {
                    const nx = dx / len;
                    const ny = dy / len;
                    const m = 10000; // Large multiplier for "infinite" line
                    ctx.beginPath();
                    ctx.moveTo(p0.x - nx * m, p0.y - ny * m);
                    ctx.lineTo(p0.x + nx * m, p0.y + ny * m);
                    ctx.stroke();
                }
            }

            // Draw points
            pts.forEach(pt => {
                const m = mapC(pt.x, pt.y);
                ctx.fillStyle = ctx.strokeStyle;
                ctx.beginPath(); ctx.arc(m.x, m.y, 4, 0, 7); ctx.fill();
            });
        }
    },

    drawWlRatio(card, pts, mapC, isPre, tempEnd) {
        const ctx = card.ctx;
        const p1 = pts.slice(0, 4);
        ctx.setLineDash(isPre && p1.length < 4 ? [5,5] : []); ctx.lineWidth = 1; ctx.strokeStyle = '#8b5cf6';
        if(p1.length >= 2) {
            const top = mapC(p1[0].x, p1[0].y); const bot = mapC(p1[1].x, p1[1].y);
            ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();
        }
        if(p1.length >= 3) {
            const lft = mapC(p1[2].x, p1[2].y); const rht = p1.length===4 ? mapC(p1[3].x, p1[3].y) : mapC(tempEnd.realX, tempEnd.realY);
            ctx.beginPath(); ctx.moveTo(lft.x, lft.y); ctx.lineTo(rht.x, rht.y); ctx.stroke();
            if(p1.length === 4) {
                const top = mapC(p1[0].x, p1[0].y); const bot = mapC(p1[1].x, p1[1].y);
                ctx.setLineDash([2,4]); ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
                ctx.strokeRect(lft.x, top.y, rht.x - lft.x, bot.y - top.y);
            }
        }
        p1.forEach((pt)=>{ const m=mapC(pt.x,pt.y); ctx.fillStyle='#8b5cf6'; ctx.beginPath(); ctx.arc(m.x,m.y,4,0,7); ctx.fill(); });

        if (pts.length >= 4) {
            const p2 = pts.slice(4, 8);
            ctx.setLineDash(isPre && p2.length < 4 ? [5,5] : []); ctx.strokeStyle = '#10b981';
            if(p2.length >= 2) {
                const top = mapC(p2[0].x, p2[0].y); const bot = mapC(p2[1].x, p2[1].y);
                ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();
            }
            if(p2.length >= 3) {
                const lft = mapC(p2[2].x, p2[2].y); const rht = p2.length===4 ? mapC(p2[3].x, p2[3].y) : mapC(tempEnd.realX, tempEnd.realY);
                ctx.beginPath(); ctx.moveTo(lft.x, lft.y); ctx.lineTo(rht.x, rht.y); ctx.stroke();
                if(p2.length === 4) {
                    const top = mapC(p2[0].x, p2[0].y); const bot = mapC(p2[1].x, p2[1].y);
                    ctx.setLineDash([2,4]); ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
                    ctx.strokeRect(lft.x, top.y, rht.x - lft.x, bot.y - top.y);
                }
            }
            p2.forEach((pt)=>{ const m=mapC(pt.x,pt.y); ctx.fillStyle='#10b981'; ctx.beginPath(); ctx.arc(m.x,m.y,4,0,7); ctx.fill(); });
        }
    },

    drawRedProp(card, pts, mapC, isPre) {
        const ctx = card.ctx;
        ctx.setLineDash(isPre?[5,5]:[]); ctx.lineWidth = 1; ctx.strokeStyle = '#3b82f6';
        if(pts.length > 0) {
            let sumY = 0; pts.forEach(pt => sumY += pt.y); const avgY = sumY / pts.length;
            pts.forEach((pt, i)=>{ 
               const m=mapC(pt.x,pt.y);
               ctx.beginPath(); ctx.moveTo(m.x, mapC(pt.x, avgY).y - 40); ctx.lineTo(m.x, mapC(pt.x, avgY).y + 40); ctx.stroke();
               ctx.fillStyle='#3b82f6'; ctx.beginPath(); ctx.arc(m.x,m.y,4,0,7); ctx.fill();
            });
            const f = mapC(pts[0].x, avgY);
            const l = mapC(pts[pts.length-1].x, avgY);
            ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(l.x, f.y); ctx.stroke();
        }
    },

    drawPinkEsth(card, pts, mapC, isPre) {
        const ctx = card.ctx;
        ctx.setLineDash(isPre?[5,5]:[]); ctx.lineWidth = 1; ctx.strokeStyle = '#ec4899';
        pts.forEach((pt)=>{ const m=mapC(pt.x,pt.y); ctx.fillStyle='#ec4899'; ctx.beginPath(); ctx.arc(m.x,m.y,4,0,7); ctx.fill(); });
        if(pts.length >= 2) {
            ctx.beginPath();
            pts.forEach((pt, i) => {
                const m = mapC(pt.x, pt.y);
                if(i===0) ctx.moveTo(m.x, m.y); else ctx.lineTo(m.x, m.y);
            });
            ctx.stroke();
        }
    },

    drawAxial(card, pts, mapC, isPre) {
        const ctx = card.ctx;
        ctx.lineWidth = 1;
        pts.forEach((pt)=>{ const m=mapC(pt.x,pt.y); ctx.fillStyle='var(--warning)'; ctx.beginPath(); ctx.arc(m.x,m.y,4,0,7); ctx.fill(); });
        
        if(pts.length >= 2) {
           const p1 = mapC(pts[0].x, pts[0].y); const p2 = mapC(pts[1].x, pts[1].y);
           ctx.setLineDash([5,5]); ctx.strokeStyle = '#06b6d4';
           const dx = p2.x - p1.x; const dy = p2.y - p1.y;
           const len = Math.hypot(dx, dy);
           if (len > 0) {
               const nx = dx/len; const ny = dy/len;
               const maxL = 5000;
               ctx.beginPath(); ctx.moveTo(p1.x - nx*maxL, p1.y - ny*maxL); ctx.lineTo(p1.x + nx*maxL, p1.y + ny*maxL); ctx.stroke();
           } else {
               ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
           }
        }
        ctx.setLineDash(isPre?[5,5]:[]);
        for(let i=2; i<pts.length; i+=2) {
            if(pts[i+1]) {
                const t = mapC(pts[i].x, pts[i].y); const b = mapC(pts[i+1].x, pts[i+1].y);
                ctx.strokeStyle = (i < 8) ? '#10b981' : '#f43f5e'; 
                const dx = b.x - t.x; const dy = b.y - t.y;
                const len = Math.hypot(dx, dy);
                if (len > 0) {
                    const nx = dx/len; const ny = dy/len;
                    const maxL = 5000;
                    ctx.beginPath(); ctx.moveTo(t.x - nx*maxL, t.y - ny*maxL); ctx.lineTo(t.x + nx*maxL, t.y + ny*maxL); ctx.stroke();
                } else {
                    ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                }
            }
        }
    },
    
    drawPapilla(card, pts, mapC, isPre) {
        const ctx = card.ctx;
        ctx.lineWidth = 1;
        
        // 2点ずつのペアで描画 (接点-乳頭頂)
        for(let i=0; i<pts.length; i+=2) {
            const cp = mapC(pts[i].x, pts[i].y);
            // 接点プロット
            ctx.fillStyle = '#3b82f6'; // Blue
            ctx.beginPath(); ctx.arc(cp.x, cp.y, 4, 0, 7); ctx.fill();
            
            if(pts[i+1]) {
                const pt = mapC(pts[i+1].x, pts[i+1].y);
                // 乳頭頂プロット
                ctx.fillStyle = '#8b5cf6'; // Purple
                ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, 7); ctx.fill();
                
                // 距離を示すガイドライン
                ctx.setLineDash(isPre ? [2, 2] : []);
                ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
                ctx.beginPath(); ctx.moveTo(cp.x, cp.y); ctx.lineTo(cp.x, pt.y); ctx.stroke();
                
                // 垂直補助線 (水平)
                ctx.setLineDash([]);
                ctx.beginPath(); ctx.moveTo(cp.x-10, cp.y); ctx.lineTo(cp.x+10, cp.y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cp.x-10, pt.y); ctx.lineTo(cp.x+10, pt.y); ctx.stroke();
            }
        }
    },

    // --- Statistics and Update Logic ---
    _setStat(el, val, color, card, placeholder = '--') {
        if (!el) return;
        if (card.isDataSent && val !== null && val !== undefined) {
            el.textContent = val;
            el.style.color = color || '';
        } else {
            el.textContent = placeholder;
            el.style.color = '';
        }
    },

    updateIntraoralStats(card) {
        const mm = card.pxToMm || 0.075;

        // WL Ratio
        const elWlR = card.card.querySelector('.wl-r-val');
        const elWlL = card.card.querySelector('.wl-l-val');
        const elWlRProf = card.card.querySelector('.wl-r-profile');
        const elWlLProf = card.card.querySelector('.wl-l-profile');

        if (card.lines.wlRatio) {
            const p = card.lines.wlRatio;
            const getProfile = (ratio) => {
                if (ratio > 85) return 'Short (幅広・男性的)';
                if (ratio < 75) return 'Long (細長・女性的)';
                return 'Ideal (理想的)';
            };

            let wlR = null, wlRCol = '', wlRProf = null;
            let wlL = null, wlLCol = '', wlLProf = null;

            if (p.length >= 4) {
                const h = Math.abs(p[1].y - p[0].y); const w = Math.abs(p[3].x - p[2].x);
                if (h > 0) {
                    const ratio = (w / h) * 100;
                    wlR = ratio.toFixed(1) + ' %';
                    wlRCol = (ratio >= 75 && ratio <= 85) ? 'var(--success)' : 'var(--danger)';
                    wlRProf = getProfile(ratio);
                }
            }
            if (p.length === 8) {
                const h = Math.abs(p[5].y - p[4].y); const w = Math.abs(p[7].x - p[6].x);
                if (h > 0) {
                    const ratio = (w / h) * 100;
                    wlL = ratio.toFixed(1) + ' %';
                    wlLCol = (ratio >= 75 && ratio <= 85) ? 'var(--success)' : 'var(--danger)';
                    wlLProf = getProfile(ratio);
                }
            }
            this._setStat(elWlR, wlR, wlRCol, card, '-- %');
            this._setStat(elWlL, wlL, wlLCol, card, '-- %');
            this._setStat(elWlRProf, wlRProf, '', card, '--');
            this._setStat(elWlLProf, wlLProf, '', card, '--');
        }

        let redR = null, redL = null;
        let gpR = null, gpL = null;
        let slvR = null, slvL = null;
        let diff1 = null, d1Col = '';
        let diff2 = null, d2Col = '';

        if (card.lines.redProp && card.lines.redProp.length === 7) {
            const pts = card.lines.redProp;
            const ws = [
                Math.abs(pts[1].x - pts[0].x), Math.abs(pts[2].x - pts[1].x), Math.abs(pts[3].x - pts[2].x),
                Math.abs(pts[4].x - pts[3].x), Math.abs(pts[5].x - pts[4].x), Math.abs(pts[6].x - pts[5].x)
            ];
            redR = (ws[0] / ws[1] * 100).toFixed(1) + ' %';
            redL = (ws[5] / ws[4] * 100).toFixed(1) + ' %';

            const totalR = ws[0] + ws[1] + ws[2];
            const totalL = ws[3] + ws[4] + ws[5];
            if (totalR > 0 && totalL > 0) {
                gpR = `${(ws[2]/totalR*50).toFixed(0)}:${(ws[1]/totalR*50).toFixed(0)}:${(ws[0]/totalR*50).toFixed(0)}`;
                gpL = `${(ws[3]/totalL*50).toFixed(0)}:${(ws[4]/totalL*50).toFixed(0)}:${(ws[5]/totalL*50).toFixed(0)}`;
                slvR = `${(ws[2]/ws[1]).toFixed(2)} : 1.00 : ${(ws[0]/ws[1]).toFixed(2)}`;
                slvL = `${(ws[3]/ws[4]).toFixed(2)} : 1.00 : ${(ws[5]/ws[4]).toFixed(2)}`;
            }
            const d1Val = Math.abs(ws[2] - ws[3]) * mm;
            const d2Val = Math.abs(ws[1] - ws[4]) * mm;
            diff1 = d1Val.toFixed(1) + ' mm';
            d1Col = d1Val <= 0.5 ? 'var(--success)' : (d1Val <= 1.0 ? 'var(--warning)' : 'var(--danger)');
            diff2 = d2Val.toFixed(1) + ' mm';
            d2Col = d2Val <= 1.0 ? 'var(--success)' : 'var(--danger)';
        }

        this._setStat(card.card.querySelector('.red-r-val'), redR, '', card, '-- %');
        this._setStat(card.card.querySelector('.red-l-val'), redL, '', card, '-- %');
        this._setStat(card.card.querySelector('.gp-r-val'), gpR, '', card, '--');
        this._setStat(card.card.querySelector('.gp-l-val'), gpL, '', card, '--');
        this._setStat(card.card.querySelector('.silver-r-val'), slvR, '', card, '--');
        this._setStat(card.card.querySelector('.silver-l-val'), slvL, '', card, '--');
        this._setStat(card.card.querySelector('.red-diff1-val'), diff1, d1Col, card, '-- mm');
        this._setStat(card.card.querySelector('.red-diff2-val'), diff2, d2Col, card, '-- mm');

        let asym = null, asymCol = '';
        let canine = null, canineCol = '';
        let levelR = null, levelRCol = '';
        let levelL = null, levelLCol = '';

        if (card.lines.pinkEsth && card.lines.pinkEsth.length === 6) {
            const pts = card.lines.pinkEsth;
            const dC = Math.abs(pts[2].y - pts[3].y) * mm;
            const dK = Math.abs(pts[0].y - pts[5].y) * mm;
            asym = dC.toFixed(1) + ' mm';
            asymCol = dC <= 1.0 ? 'var(--success)' : 'var(--danger)';
            canine = dK.toFixed(1) + ' mm';
            canineCol = dK <= 2.0 ? 'var(--success)' : 'var(--danger)';

            const lR = (pts[1].y - (pts[0].y + pts[2].y) / 2) * mm;
            const lL = (pts[4].y - (pts[3].y + pts[5].y) / 2) * mm;
            levelR = lR.toFixed(1) + ' mm';
            levelRCol = (lR >= 0.5 && lR <= 1.5) ? 'var(--success)' : 'var(--warning)';
            levelL = lL.toFixed(1) + ' mm';
            levelLCol = (lL >= 0.5 && lL <= 1.5) ? 'var(--success)' : 'var(--warning)';
        }

        this._setStat(card.card.querySelector('.pz-asym-val'), asym, asymCol, card, '-- mm');
        this._setStat(card.card.querySelector('.pz-canine-val'), canine, canineCol, card, '-- mm');
        this._setStat(card.card.querySelector('.pz-level-r-val'), levelR, levelRCol, card, '-- mm');
        this._setStat(card.card.querySelector('.pz-level-l-val'), levelL, levelLCol, card, '-- mm');

        if (card.lines.axialIncl && card.lines.axialIncl.length === 14) {
            const p = card.lines.axialIncl;
            const gMid = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
            const getAngle = (t, b, isRight) => {
                const ang = Math.atan2(b.y - t.y, b.x - t.x);
                let diff = (ang - gMid) * 180 / Math.PI;
                if (diff > 90) diff -= 180; if (diff < -90) diff += 180;
                return (isRight ? -diff : diff).toFixed(1);
            };
            const selectors = ['.ax1-r-val','.ax1-l-val','.ax2-r-val','.ax2-l-val','.ax3-r-val','.ax3-l-val'];
            const pairs = [[2,3],[8,9],[4,5],[10,11],[6,7],[12,13]];
            const angles = pairs.map((pair, i) => parseFloat(getAngle(p[pair[0]], p[pair[1]], i % 2 === 0)));
            
            const results = angles.map((val, i) => {
                const isR = i % 2 === 0;
                let ideal = [3.0, 3.0, 5.0, 5.0, 8.0, 8.0][i];
                let col = 'var(--success)';
                // Direction checks
                if (val < 0) col = 'var(--danger)';
                // Order checks (Central < Lateral < Canine)
                if (i >= 2 && val <= angles[i-2]) col = 'var(--danger)';

                if (col !== 'var(--danger)') {
                    if (Math.abs(val - ideal) >= 2.0) col = 'var(--warning)';
                }
                return { val: val.toFixed(1) + ' °', col };
            });

            selectors.forEach((sel, i) => {
                this._setStat(card.card.querySelector(sel), results[i].val, results[i].col, card, '-- °');
            });
        } else {
            ['.ax1-r-val','.ax1-l-val','.ax2-r-val','.ax2-l-val','.ax3-r-val','.ax3-l-val'].forEach(sel => {
                this._setStat(card.card.querySelector(sel), null, '', card, '-- °');
            });
        }

        const btSelectors = ['.bt-val-1', '.bt-val-2', '.bt-val-3', '.bt-val-4', '.bt-val-5'];
        const btValues = [];
        if (card.lines.papilla && card.lines.papilla.length >= 2) {
            const pts = card.lines.papilla;
            for(let i=0; i<5; i++) {
                if(pts[i*2] && pts[i*2+1]) {
                    const dist = Math.abs(pts[i*2+1].y - pts[i*2].y) * mm;
                    btValues[i] = { text: dist.toFixed(1) + ' mm', raw: dist };
                }
            }
        }
        btSelectors.forEach((sel, i) => {
            const res = btValues[i];
            let col = '';
            if (res) col = res.raw >= 3.0 ? 'var(--danger)' : (res.raw >= 2.0 ? 'var(--warning)' : 'var(--success)');
            this._setStat(card.card.querySelector(sel), res ? res.text : null, col, card, '-- mm');
        });

        const updateDiff = (idx1, idx2, selector) => {
            let val = null, col = '';
            if (btValues[idx1] && btValues[idx2]) {
                const diff = Math.abs(btValues[idx1].raw - btValues[idx2].raw);
                val = diff.toFixed(1) + ' mm';
                col = diff >= 2.0 ? 'var(--warning)' : 'var(--success)';
            }
            this._setStat(card.card.querySelector(selector), val, col, card, '-- mm');
        };
        updateDiff(1, 3, '.bt-diff-cl');
        updateDiff(0, 4, '.bt-diff-lc');
    },

    updateStats(card) {
        if (card.phase === 'intraoral') this.updateIntraoralStats(card);
    }
};
