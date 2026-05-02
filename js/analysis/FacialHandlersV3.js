window.FacialHandlers = {
    // --- Drawing Methods ---
    drawProportionLines(card, pts, mapC) {
        const ctx = card.ctx;
        ctx.setLineDash([]); ctx.lineWidth = 1;
        const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1'];
        pts.forEach((pt, i) => {
            const mapped = mapC(pt.x, pt.y);
            ctx.strokeStyle = colors[i]; ctx.fillStyle = colors[i];
            ctx.beginPath(); ctx.moveTo(mapped.x - 80, mapped.y); ctx.lineTo(mapped.x + 80, mapped.y); ctx.stroke();
            ctx.beginPath(); ctx.arc(mapped.x, mapped.y, 4, 0, Math.PI * 2); ctx.fill();
        });
    },

    drawELine(card, pts, mapC, isPre) {
        const ctx = card.ctx;
        if(pts.length >= 2) {
            const p1 = mapC(pts[0].x, pts[0].y); const p2 = mapC(pts[1].x, pts[1].y);
            const dx=p2.x-p1.x; const dy=p2.y-p1.y; const len=Math.sqrt(dx*dx+dy*dy); const ux=dx/len; const uy=dy/len;
            ctx.beginPath(); ctx.moveTo(p1.x-ux*50,p1.y-uy*50); ctx.lineTo(p2.x+ux*50,p2.y+uy*50);
            ctx.strokeStyle = 'var(--warning)'; ctx.lineWidth = 1; ctx.setLineDash(isPre?[5,5]:[]); ctx.stroke();
        }
        pts.forEach((pt,i)=>{
            const mp=mapC(pt.x,pt.y); ctx.fillStyle = i<2?'var(--warning)':'#ec4899';
            ctx.beginPath(); ctx.arc(mp.x, mp.y, 5, 0, Math.PI*2); ctx.fill();
        });
    },
    
    drawNla(card, pts, mapC, isPre, tempEnd) {
        const ctx = card.ctx;
        ctx.setLineDash(isPre ? [5,5] : []); ctx.lineWidth = 1; ctx.strokeStyle = '#10b981';
        if(pts.length>=2){ const p0=mapC(pts[0].x,pts[0].y); const p1=mapC(pts[1].x,pts[1].y);
            ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.stroke(); }
        if(pts.length===3 || (pts.length===2 && tempEnd)){
            const p1=mapC(pts[1].x,pts[1].y); const p2=pts.length===3?mapC(pts[2].x,pts[2].y):mapC(tempEnd.realX,tempEnd.realY);
            ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
            
            const p0=mapC(pts[0].x,pts[0].y);
            const a1 = Math.atan2(p0.y - p1.y, p0.x - p1.x);
            const a2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, 30, a1, a2, false);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, 30, a1, a2, false);
            ctx.stroke();
        }
        pts.forEach((pt,i)=>{ const m=mapC(pt.x,pt.y); ctx.fillStyle=i===1?'#059669':'#34d399'; ctx.beginPath(); ctx.arc(m.x,m.y,5,0,Math.PI*2); ctx.fill(); });
    },

    drawConvexity(card, pts, mapC, isPre, tempEnd) {
        const ctx = card.ctx;
        ctx.setLineDash(isPre ? [5,5] : []); ctx.lineWidth = 1; ctx.strokeStyle = '#3b82f6';
        if(pts.length>=2){ const p0=mapC(pts[0].x,pts[0].y); const p1=mapC(pts[1].x,pts[1].y);
            ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.stroke(); }
        if(pts.length===3 || (pts.length===2 && tempEnd)){
            const p1=mapC(pts[1].x,pts[1].y); const p2=pts.length===3?mapC(pts[2].x,pts[2].y):mapC(tempEnd.realX,tempEnd.realY);
            ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
        }
        pts.forEach((pt)=>{ const m=mapC(pt.x,pt.y); ctx.fillStyle='#2563eb'; ctx.beginPath(); ctx.arc(m.x,m.y,5,0,Math.PI*2); ctx.fill(); });
    },

    drawSmileArc(card, pts, mapC, isPre) {
        const ctx = card.ctx;
        ctx.setLineDash(isPre?[5,5]:[]); ctx.lineWidth = 1;
        
        const calcParabola = (p1, p2, p3) => {
            const det = (p1.x - p2.x) * (p1.x - p3.x) * (p2.x - p3.x);
            if(Math.abs(det) < 0.1) return { a:0, b:0, c:0 };
            const a = (p3.x * (p2.y - p1.y) + p2.x * (p1.y - p3.y) + p1.x * (p3.y - p2.y)) / det;
            const b = (p3.x*p3.x * (p1.y - p2.y) + p2.x*p2.x * (p3.y - p1.y) + p1.x*p1.x * (p2.y - p3.y)) / det;
            const c = (p2.x * p3.x * (p2.x - p3.x) * p1.y + p3.x * p1.x * (p3.x - p1.x) * p2.y + p1.x * p2.x * (p1.x - p2.x) * p3.y) / det;
            return { a, b, c };
        };

        const upperPts = pts.slice(0,3);
        if (upperPts.length === 3) {
            const pb = calcParabola(upperPts[0], upperPts[1], upperPts[2]);
            ctx.strokeStyle = '#3b82f6'; ctx.beginPath();
            for(let x = upperPts[0].x; x <= upperPts[2].x; x+=2) {
                const m = mapC(x, (pb.a*x*x + pb.b*x + pb.c));
                if (x === upperPts[0].x) ctx.moveTo(m.x, m.y); else ctx.lineTo(m.x, m.y);
            }
            ctx.stroke();
        }
        
        const lowerPts = pts.slice(3,6);
        if (lowerPts.length === 3) {
            const pb = calcParabola(lowerPts[0], lowerPts[1], lowerPts[2]);
            ctx.strokeStyle = '#10b981'; ctx.beginPath();
            for(let x = lowerPts[0].x; x <= lowerPts[2].x; x+=2) {
                const m = mapC(x, (pb.a*x*x + pb.b*x + pb.c));
                if (x === lowerPts[0].x) ctx.moveTo(m.x, m.y); else ctx.lineTo(m.x, m.y);
            }
            ctx.stroke();
        }

        pts.forEach((pt, i)=>{ 
            const m=mapC(pt.x,pt.y); ctx.fillStyle= i<3 ? '#2563eb':'#059669'; 
            ctx.beginPath(); ctx.arc(m.x,m.y,5,0,7); ctx.fill(); 
            ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke();
        });
    },

    drawCorridor(card, pts, mapC, isPre) {
        const ctx = card.ctx;
        ctx.setLineDash(isPre?[5,5]:[]); ctx.lineWidth = 1;
        if (pts.length >= 2) {
            const leftP = mapC(pts[0].x, pts[0].y); const rightP = mapC(pts[pts.length-1].x, pts[pts.length-1].y);
            ctx.strokeStyle = 'var(--warning)';
            ctx.beginPath(); ctx.moveTo(leftP.x, leftP.y); ctx.lineTo(rightP.x, rightP.y); ctx.stroke();
        }
        if (pts.length === 4) {
            const c1 = mapC(pts[0].x, pts[0].y); const t1 = mapC(pts[1].x, pts[1].y);
            const t2 = mapC(pts[2].x, pts[2].y); const c2 = mapC(pts[3].x, pts[3].y);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
            ctx.fillRect(c1.x, c1.y-15, t1.x - c1.x, 30);
            ctx.fillRect(t2.x, t2.y-15, c2.x - t2.x, 30);
        }
        pts.forEach((pt, i)=>{ 
            const m=mapC(pt.x,pt.y); ctx.fillStyle='var(--warning)';
            ctx.beginPath(); ctx.moveTo(m.x, m.y-25); ctx.lineTo(m.x, m.y+25); ctx.stroke();
            ctx.beginPath(); ctx.arc(m.x,m.y,5,0,7); ctx.fill(); 
        });
    },

    drawGingival(card, pts, mapC, isPre) {
        const ctx = card.ctx;
        ctx.setLineDash(isPre?[5,5]:[]); ctx.lineWidth = 1; ctx.strokeStyle = '#ec4899';
        pts.forEach((pt, i)=>{ 
            const m=mapC(pt.x,pt.y); ctx.fillStyle='#ec4899'; 
            ctx.beginPath(); ctx.moveTo(m.x-60, m.y); ctx.lineTo(m.x+60, m.y); ctx.stroke();
            ctx.beginPath(); ctx.arc(m.x,m.y,5,0,7); ctx.fill(); 
        });
        if(pts.length >= 2) {
            const t = mapC(pts[0].x, pts[0].y); const b = mapC(pts[pts.length-1].x, pts[pts.length-1].y);
            ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x, b.y); 
            ctx.setLineDash([5,5]); ctx.stroke();
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

    updateFrontalStats(card) {
        const elCant = card.card.querySelector('.cant-value');
        const elDev = card.card.querySelector('.dev-value');
        const elThirds = card.card.querySelector('.prop-thirds-value');
        const elWillis = card.card.querySelector('.prop-willis-value');
        const elLower = card.card.querySelector('.prop-lower-value');
        let angInt = null;
        if (card.lines.interpupillary) {
            const dx = card.lines.interpupillary.endX - card.lines.interpupillary.startX;
            const dy = card.lines.interpupillary.endY - card.lines.interpupillary.startY;
            angInt = Math.atan2(dy, dx) * (180 / Math.PI);
            if(angInt > 90) angInt -= 180; if(angInt < -90) angInt += 180;
        }

        let cantVal = null, cantCol = '';
        let devVal = null, devCol = '';
        let thirdsVal = null;
        let willisVal = null, willisCol = '';
        let lowerValStr = null;

        if (card.lines.midline && angInt !== null) {
            const dxM = card.lines.midline.endX - card.lines.midline.startX;
            const dyM = card.lines.midline.endY - card.lines.midline.startY;
            let angMid = Math.atan2(dyM, dxM) * (180 / Math.PI);
            let diff = Math.abs(angMid - angInt);
            if (diff > 90) diff = 180 - diff;
            let d = Math.abs(90 - diff);
            cantVal = d.toFixed(1) + '° ズレ';
            cantCol = d <= 2.0 ? 'var(--success)' : 'var(--danger)'; 
        }

        if (card.lines.commissural && angInt !== null) {
            const dxC = card.lines.commissural.endX - card.lines.commissural.startX;
            const dyC = card.lines.commissural.endY - card.lines.commissural.startY;
            let angCom = Math.atan2(dyC, dxC) * (180 / Math.PI);
            if(angCom > 90) angCom -= 180; if(angCom < -90) angCom += 180;
            let diff = Math.abs(angCom - angInt);
            if (diff > 90) diff = 180 - diff;
            devVal = diff.toFixed(1) + '° ズレ';
            devCol = diff <= 2.0 ? 'var(--success)' : 'var(--danger)';
        }

        if (card.lines.verticalProportions && card.lines.verticalProportions.length === 6) {
           const pts = card.lines.verticalProportions;
           const upper = Math.abs(pts[1].y - pts[0].y);
           const middle = Math.abs(pts[3].y - pts[1].y);
           const lowerVal = Math.abs(pts[5].y - pts[3].y);
           if (middle > 0) thirdsVal = `${(upper / middle).toFixed(1)} : 1.0 : ${(lowerVal / middle).toFixed(1)}`;
           
           const distLowerFace = Math.abs(pts[5].y - pts[3].y);
           const distEyeToLip = Math.abs(pts[4].y - pts[2].y);
           if (distEyeToLip > 0) {
               const r = distLowerFace / distEyeToLip;
               const diff = Math.abs(r - 1.0);
               willisVal = `1 : ${r.toFixed(1)}`;
               if (diff < 0.101) willisCol = 'var(--success)';
               else if (diff < 0.201) willisCol = 'var(--warning)';
               else willisCol = 'var(--danger)';
           }
           const lU = Math.abs(pts[4].y - pts[3].y);
           const lL = Math.abs(pts[5].y - pts[4].y);
           if (lU > 0) lowerValStr = `1 : ${(lL / lU).toFixed(1)}`;
        }

        this._setStat(elCant, cantVal, cantCol, card, '--°');
        this._setStat(elDev, devVal, devCol, card, '--°');
        this._setStat(elThirds, thirdsVal, '', card, '-- : -- : --');
        this._setStat(elWillis, willisVal, willisCol, card, '--');
        this._setStat(elLower, lowerValStr, '', card, '1 : --');
    },

    updateLateralStats(card) {
        const elUlip = card.card.querySelector('.ulip-val');
        const elLlip = card.card.querySelector('.llip-val');
        const elNla = card.card.querySelector('.nla-val');
        let uMmVal = null, uCol = '';
        let lMmVal = null, lCol = '';
        let nlaVal = null, nlaCol = '';

        if (card.lines.eLine && card.lines.eLine.length === 4) {
          const [nose, pog, ulip, llip] = card.lines.eLine;
          if (nose && pog && ulip && llip) {
            const isLF = nose.x < (card.currentImage.width/2);
            const cDist = (pt) => {
               const A = nose.y - pog.y; const B = pog.x - nose.x; const C = (nose.x * pog.y) - (pog.x * nose.y);
               const distAbs = Math.abs(A * pt.x + B * pt.y + C) / Math.sqrt(A*A + B*B);
               const crs = (pog.x - nose.x) * (pt.y - nose.y) - (pog.y - nose.y) * (pt.x - nose.x);
               return (isLF ? crs > 0 : crs < 0) ? distAbs : -distAbs;
            };
            const uMm = (cDist(ulip)*card.pxToMm);
            const lMm = (cDist(llip)*card.pxToMm);
            uMmVal = (uMm>0?'+':'')+uMm.toFixed(2)+' mm';
            uCol = (uMm>=-5.5&&uMm<=-3.5)?'var(--success)':'var(--primary)';
            lMmVal = (lMm>0?'+':'')+lMm.toFixed(2)+' mm';
            lCol = (lMm>=-2.0&&lMm<=0)?'var(--success)':'var(--primary)';
          }
        }
        
        if (card.lines.nla && card.lines.nla.length === 3) {
          const [col, sub, u_lip] = card.lines.nla;
          const vA = { x: col.x - sub.x, y: col.y - sub.y };
          const vB = { x: u_lip.x - sub.x, y: u_lip.y - sub.y };
          const d = (vA.x*vB.x)+(vA.y*vB.y);
          const mA = Math.sqrt(vA.x*vA.x+vA.y*vA.y);
          const mB = Math.sqrt(vB.x*vB.x+vB.y*vB.y);
          const aDeg = Math.acos(d / (mA * mB)) * (180/Math.PI);
          nlaVal = aDeg.toFixed(1) + ' °';
          nlaCol = 'var(--danger)';
          if (aDeg >= 90 && aDeg <= 110) nlaCol = 'var(--success)';
          else if (aDeg >= 80 && aDeg <= 100) nlaCol = 'var(--warning)';
        }

        const elConvexity = card.card.querySelector('.convexity-val');
        let convVal = null, convCol = 'var(--primary)';
        if (card.lines.convexity && card.lines.convexity.length === 3) {
          const [g, sn, pg] = card.lines.convexity;
          const vA = { x: g.x - sn.x, y: g.y - sn.y };
          const vB = { x: pg.x - sn.x, y: pg.y - sn.y };
          const d = (vA.x*vB.x)+(vA.y*vB.y);
          const mA = Math.sqrt(vA.x*vA.x+vA.y*vA.y);
          const mB = Math.sqrt(vB.x*vB.x+vB.y*vB.y);
          let aDeg = Math.acos(d / (mA * mB)) * (180/Math.PI);
          
          const vecG_Pg = { x: pg.x - g.x, y: pg.y - g.y };
          const vecG_Sn = { x: sn.x - g.x, y: sn.y - g.y };
          const crossG = vecG_Pg.x * vecG_Sn.y - vecG_Pg.y * vecG_Sn.x;
          const isFacLeft = g.x < (card.currentImage.width/2);
          
          let isConcave = false;
          if (isFacLeft) { if (crossG < 0) isConcave = true; } 
          else { if (crossG > 0) isConcave = true; }
          let displayAngle = isConcave ? (360 - aDeg) : aDeg;

          let cat = ''; 
          if (displayAngle < 165) { cat = 'Convex (凸)'; convCol = 'var(--warning)'; }
          else if (displayAngle >= 165 && displayAngle <= 175) { cat = 'Straight (直)'; convCol = 'var(--success)'; }
          else { cat = 'Concave (凹)'; convCol = 'var(--danger)'; }
          convVal = `${displayAngle.toFixed(1)}° <br><span style="font-size:0.85em">${cat}</span>`;
        }

        this._setStat(elUlip, uMmVal, uCol, card, '-- mm');
        this._setStat(elLlip, lMmVal, lCol, card, '-- mm');
        this._setStat(elNla, nlaVal, nlaCol, card, '-- °');
        if (elConvexity) {
            if (card.isDataSent && convVal) {
                elConvexity.innerHTML = convVal; elConvexity.style.color = convCol;
            } else {
                elConvexity.textContent = '--'; elConvexity.style.color = '';
            }
        }
    },

    updateESoundStats(card) {
        const elArc = card.card.querySelector('.arc-val');
        const elCorridor = card.card.querySelector('.corridor-val');
        const elGingival = card.card.querySelector('.gingival-val');
        const elIncisalEb = card.card.querySelector('.incisal-eb-val');

        let arc = null, arcCol = '';
        let corridor = null, corrCol = '';
        let gingival = null, gingCol = '';
        let incisal = null;

        if (card.lines.smileArc && card.lines.smileArc.length === 6) {
            const p = card.lines.smileArc;
            const teethSag = p[1].y - (p[0].y + p[2].y) / 2;
            const lipSag = p[4].y - (p[3].y + p[5].y) / 2;
            arc = 'Consonant (調和)'; arcCol = 'var(--success)';
            if (teethSag < -2) { arc = 'Reverse (逆カーブ)'; arcCol = 'var(--danger)'; } 
            else if (teethSag < 12 || (lipSag > 10 && teethSag < lipSag * 0.7)) { arc = 'Flat (平坦)'; arcCol = 'var(--warning)'; }
        }
        if (card.lines.corridor && card.lines.corridor.length === 4) {
            const pts = card.lines.corridor;
            const totalW = Math.abs(pts[3].x - pts[0].x);
            const dentW = Math.abs(pts[2].x - pts[1].x);
            if (totalW > 0) {
                const ratio = ((totalW - dentW) / totalW) * 100;
                corridor = ratio.toFixed(1) + ' %';
                corrCol = (ratio >= 2 && ratio <= 15) ? 'var(--success)' : 'var(--danger)';
            }
        }
        if (card.lines.gingival && card.lines.gingival.length === 4) {
            const pts = card.lines.gingival;
            const gMm = (pts[0].y - pts[1].y) * card.pxToMm;
            gingival = (gMm > 0 ? '+' : '') + gMm.toFixed(1) + ' mm';
            gingCol = (gMm >= -2.0 && gMm <= 0.5) ? 'var(--success)' : 'var(--danger)';
            const iPx = pts[2].y - pts[1].y; const bPx = pts[3].y - pts[2].y;
            if (iPx + bPx !== 0) incisal = ((iPx / (iPx + bPx)) * 100).toFixed(0) + ' %';
        }

        this._setStat(elArc, arc, arcCol, card, '-- (未判定)');
        this._setStat(elCorridor, corridor, corrCol, card, '-- %');
        this._setStat(elGingival, gingival, gingCol, card, '-- mm');
        this._setStat(elIncisalEb, incisal, '', card, '-- %');
    },

    drawFrontal(card, mapC) {
        // Draw standard lines first
        const excludeTools = ['verticalProportions', 'eLine', 'nla', 'convexity', 'wlRatio', 'redProp', 'pinkEsth', 'smileArc', 'corridor', 'gingival', 'axialIncl', 'papilla'];
        for (const toolName in card.lines) {
            if (!excludeTools.includes(toolName)) {
               const lineData = card.lines[toolName];
               if (lineData) card.drawLineSpec(lineData, toolName, mapC);
            }
        }
        if (card.lines.verticalProportions) this.drawProportionLines(card, card.lines.verticalProportions, mapC);
        if (card.activeTool === 'vertical-proportions' && card.tempPoints.length < 6 && card.tempPoints.length > 0) this.drawProportionLines(card, card.tempPoints, mapC, true);
    },

    drawLateral(card, mapC) {
        if (card.lines.eLine) this.drawELine(card, card.lines.eLine, mapC, false);
        if (card.activeTool === 'eline' && card.tempPoints.length < 4 && card.tempPoints.length > 0) this.drawELine(card, card.tempPoints, mapC, true);

        if (card.lines.nla) this.drawNla(card, card.lines.nla, mapC, false);
        if (card.activeTool === 'nla' && card.tempPoints.length < 3 && card.tempPoints.length > 0) this.drawNla(card, card.tempPoints, mapC, true);

        if (card.lines.convexity) this.drawConvexity(card, card.lines.convexity, mapC, false);
        if (card.activeTool === 'convexity' && card.tempPoints.length < 3 && card.tempPoints.length > 0) this.drawConvexity(card, card.tempPoints, mapC, true);
    },

    drawPhase(card, mapC) {
        const ph = card.phase;
        if (['frontal', 'm-sound', 's-sound', 'fv-sound'].includes(ph)) {
            this.drawFrontal(card, mapC);
        } else if (ph === 'lateral') {
            this.drawLateral(card, mapC);
        } else if (ph === 'e-midline') {
            if (card.lines['f-midline']) card.drawLineSpec(card.lines['f-midline'], 'f-midline', mapC);
            if (card.lines['d-midline']) card.drawLineSpec(card.lines['d-midline'], 'd-midline', mapC);
            if (card.lines['interpupillary-e']) card.drawLineSpec(card.lines['interpupillary-e'], 'interpupillary-e', mapC);
            if (card.lines['incisal-edge']) card.drawLineSpec(card.lines['incisal-edge'], 'incisal-edge', mapC);
        } else if (ph === 'e-sound') {
            if (card.lines.smileArc) this.drawSmileArc(card, card.lines.smileArc, mapC, false);
            if (card.activeTool === 'smile-arc' && card.tempPoints.length < 6 && card.tempPoints.length > 0) {
               const tmps = [...card.tempPoints]; if(card.tempEnd) tmps.push({x:card.tempEnd.realX, y:card.tempEnd.realY});
               this.drawSmileArc(card, tmps, mapC, true);
            }
            if (card.lines.corridor) this.drawCorridor(card, card.lines.corridor, mapC, false);
            if (card.activeTool === 'corridor' && card.tempPoints.length < 4 && card.tempPoints.length > 0) {
               const tmps = [...card.tempPoints]; if(card.tempEnd) tmps.push({x:card.tempEnd.realX, y:card.tempEnd.realY});
               this.drawSmileArc(card, tmps, mapC, true);
            }
            if (card.lines.gingival) this.drawGingival(card, card.lines.gingival, mapC, false);
            if (card.activeTool === 'gingival' && card.tempPoints.length < 4 && card.tempPoints.length > 0) {
               const tmps = [...card.tempPoints]; if(card.tempEnd) tmps.push({x:card.tempEnd.realX, y:card.tempEnd.realY});
               this.drawGingival(card, tmps, mapC, true);
            }
        }
    },

    updateStats(card) {
        const ph = card.phase || '';
        if (ph === 'frontal') this.updateFrontalStats(card);
        else if (ph === 'lateral') this.updateLateralStats(card);
        else if (ph === 'e-midline') this.updateEMidlineStats(card);
        else if (ph === 'e-sound') this.updateESoundStats(card);
        else if (ph === 'm-sound') this.updateMSoundStats(card);
        else if (ph === 's-sound') this.updateSSoundStats(card);
        else if (ph === 'fv-sound') this.updateFVSoundStats(card);
        else if (ph.includes('horizontal-bar')) this.updateHBarStats(card);
    },

    updateHBarStats(card) {
        const elCant = card.card.querySelector('.hbar-cant-val');
        let val = null, col = '';
        if (card.lines['hbar-bar'] && card.lines['hbar-ref']) {
            const b = card.lines['hbar-bar']; const r = card.lines['hbar-ref'];
            const bAng = Math.atan2(b.endY - b.startY, b.endX - b.startX) * 180 / Math.PI;
            const rAng = Math.atan2(r.endY - r.startY, r.endX - r.startX) * 180 / Math.PI;
            let diff = Math.abs(bAng - rAng); if (diff > 90) diff = Math.abs(180 - diff);
            val = diff.toFixed(1) + ' °';
            col = diff <= 1.0 ? 'var(--success)' : 'var(--danger)';
        }
        this._setStat(elCant, val, col, card, '-- °');
    },

    updateEMidlineStats(card) {
        const elDevMm = card.card.querySelector('#emid-dev-mm');
        const elDevDeg = card.card.querySelector('#emid-dev-deg');
        const elCantEdge = card.card.querySelector('#emid-cant-edge');

        let devMm = null, devDeg = null, devDegCol = '';
        let cantEdge = null, cantEdgeCol = '';

        if (card.lines['f-midline'] && card.lines['d-midline']) {
            const f = card.lines['f-midline'];
            const d = card.lines['d-midline'];
            devMm = (Math.abs(d.startX - f.startX) * card.pxToMm).toFixed(1) + ' mm';
            const fAng = Math.atan2(f.endY - f.startY, f.endX - f.startX) * 180 / Math.PI;
            const dAng = Math.atan2(d.endY - d.startY, d.endX - d.startX) * 180 / Math.PI;
            let diff = Math.abs(fAng - dAng); if (diff > 90) diff = Math.abs(180 - diff);
            devDeg = diff.toFixed(1) + '° ズレ';
            devDegCol = diff <= 2.0 ? 'var(--success)' : 'var(--danger)';
        }

        if (card.lines['interpupillary-e'] && card.lines['incisal-edge']) {
            const i = card.lines['interpupillary-e'];
            const e = card.lines['incisal-edge'];
            const iAng = Math.atan2(i.endY - i.startY, i.endX - i.startX) * 180 / Math.PI;
            const eAng = Math.atan2(e.endY - e.startY, e.endX - e.startX) * 180 / Math.PI;
            let diff = Math.abs(iAng - eAng); if (diff > 90) diff = Math.abs(180 - diff);
            cantEdge = diff.toFixed(1) + '° ズレ';
            cantEdgeCol = diff <= 1.0 ? 'var(--success)' : 'var(--danger)';
        }

        this._setStat(elDevMm, devMm, '', card, '-- mm');
        this._setStat(elDevDeg, devDeg, devDegCol, card, '--° ズレ');
        this._setStat(elCantEdge, cantEdge, cantEdgeCol, card, '--° ズレ');
    },

    updateMSoundStats(card) {
        const el = card.card.querySelector('.mmeasure-val');
        let val = null, col = '';
        if (card.lines.mmeasure) {
            const mm = card.getLineLengthMm('mmeasure');
            val = mm + ' mm';
            col = (mm >= 1.0 && mm <= 3.0) ? 'var(--success)' : 'var(--danger)';
        }
        this._setStat(el, val, col, card, '-- mm');
    },

    updateSSoundStats(card) {
        const el = card.card.querySelector('.smeasure-val');
        let val = null, col = '';
        if (card.lines.smeasure) {
            const mm = card.getLineLengthMm('smeasure');
            val = mm + ' mm';
            col = (mm >= 1.0 && mm <= 1.5) ? 'var(--success)' : 'var(--danger)';
        }
        this._setStat(el, val, col, card, '-- mm');
    },

    updateFVSoundStats(card) {
        const el = card.card.querySelector('.fvmeasure-val');
        let val = null, col = '';
        if (card.lines.fvmeasure) {
            const mm = card.getLineLengthMm('fvmeasure');
            val = mm + ' mm';
            col = (mm <= 1.5) ? 'var(--success)' : 'var(--danger)';
        }
        this._setStat(el, val, col, card, '-- mm');
    }
};
