/**
 * FaceAnalysisCard (Phases 1-3: Frontal, Lateral, E-midline)
 * Extends BaseAnalysisCard with face/profile specific functionality.
 * Handles: facial landmarks, lateral profile analysis, midline alignment.
 */
class FaceAnalysisCard extends BaseAnalysisCard {
  constructor(cardElement) {
    super(cardElement);
  }

  /**
   * Apply landmarks from LateralAI.js (Phase 2: Lateral Macro-esthetics)
   */
  applyLateralLandmarks(pts) {
      if (!pts) return;
      this.lines.eLine = [pts.prn, pts.pg, pts.ls, pts.li];
      this.lines.nla = [pts.col, pts.sn, pts.ls];
      this.lines.convexity = [pts.g, pts.sn, pts.pg];
      this.updateStats();
      this.drawCanvas();
  }
}

window.FaceAnalysisCard = FaceAnalysisCard;
