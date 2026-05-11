// ============================================================
// config.js — Constantes fixes et création de la grille
// Ne dépend d'aucun autre fichier.
// ============================================================

const ICONES = {
  soldat: 'assets/soldat.png',
  cavalier: 'assets/cheval.png',
  tank: 'assets/militaire.png',
  vide: 'assets/question.png'
};
const NOMS   = { soldat: 'Soldat (S)', cavalier: 'Cavalier (C)', tank: 'Tank (T)' };
const FORCE  = { soldat: 2, cavalier: 1, tank: 3 };
const DEPLACEMENT_MAX = { soldat: 1, cavalier: 2, tank: 1 };

// Les cases bloquées = cases sur lesquelles aucune unité ne peut marcher
// Eau n'est PAS bloquée : une unité peut s'y déplacer mais perd -1 force
const CASES_BLOQUEES = [];

// ── Création de la grille ──────────────────────────────────

function creerGrille() {
  const g = [];
  for (let l = 0; l < 8; l++) {
    g.push([]);
    for (let c = 0; c < 8; c++) {
      g[l].push({ type: 'neutre', proprietaire: 0, unite: null });
    }
  }

  // Zones de départ
  for (let c = 0; c < 8; c++) {
    g[0][c] = { type: 'zone-j1', proprietaire: 1, unite: null };
    g[1][c] = { type: 'zone-j1', proprietaire: 1, unite: null };
    g[6][c] = { type: 'zone-j2', proprietaire: 2, unite: null };
    g[7][c] = { type: 'zone-j2', proprietaire: 2, unite: null };
  }

  // Cases spéciales
  g[5][5].type = 'eau';
  g[2][5].type = 'bonus-attaque';
  g[5][1].type = 'bonus-defense';
  g[4][3].type = 'piege';

  return g;
}