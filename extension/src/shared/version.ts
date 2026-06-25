/**
 * Hookline Version
 *
 * Single source of truth for the extension version.
 * Update this with each phase before building.
 *
 * Must stay in sync with:
 *   - public/manifest.json  → "version"
 *   - package.json          → "version"
 *
 * Version convention:
 *   0.1.0  — Phase 1: Extension Foundation
 *   0.2.0  — Phase 2: Sidebar UI (all 5 tabs)
 *   0.3.0  — Phase 3: Gmail Detection (live email parsing)
 *   0.4.0  — Phase 4: URL Detection Engine
 *   0.5.0  — Phase 5: Typosquatting Detection
 *   0.6.0  — Phase 6: Homoglyph Detection
 *   0.7.0  — Phase 7: WHOIS Intelligence
 *   0.8.0  — Phase 8: DNS Intelligence
 *   0.9.0  — Phase 9: Risk Evaluation Engine
 *   1.0.0  — Phase 10–12: FastAPI backend + Testing + Deployment
 */

export const HOOKLINE_VERSION = "1.0.0";

export const PHASE_LABEL = "Phase 12 — Production Release";
