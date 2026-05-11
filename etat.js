// ============================================================
// etat.js — État mutable de la partie
// Dépend de : config.js (creerGrille)
// ============================================================

// Grille principale (8×8)
const grille = creerGrille();

// ── Phase et tour ──────────────────────────────────────────
// 'des' → 'placement' → 'jeu' → 'termine'
let phase       = 'des';
let joueurActif = 1;
let numeroTour  = 1;
let etape       = null;   // 'deplacement' ou 'action'
let action      = null;   // 'attaquer' | 'capturer' | null

// ── Sélection en cours ────────────────────────────────────
let caseSelectionnee = null;   // { ligne, col }
let combatInfo       = null;   // données du combat en cours

// ── Placement ─────────────────────────────────────────────
const unitesPlacees  = { 1: 0, 2: 0 };
const unitesVivantes = { 1: 0, 2: 0 };
const uniteChoisie   = { 1: null, 2: null };

// ── Compteurs d'unités par type ───────────────────────────
const compteurs = {
  1: { soldat: 0, cavalier: 0, tank: 0 },
  2: { soldat: 0, cavalier: 0, tank: 0 }
};

// ── Cases contrôlées par joueur ───────────────────────────
const casesControlees = { 1: 16, 2: 16 };

// ── Dés initiaux (phase 'des') ────────────────────────────
let deInitialJ1 = null;
let deInitialJ2 = null;