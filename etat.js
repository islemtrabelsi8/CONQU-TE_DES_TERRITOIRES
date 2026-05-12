// Grille
const grille = creerGrille();
// Rendu HTML de la grille 
(function rendreGrille() {
  const conteneur = document.getElementById('grille-rendu');
  for (let l = 0; l < 8; l++) {
    const ligne = document.createElement('div');
    ligne.className = 'ligne-grille';
    const etiquette = document.createElement('div');
    etiquette.className = 'etiquette-ligne';
    etiquette.textContent = l;
    ligne.appendChild(etiquette);
    for (let c = 0; c < 8; c++) {
      const caseEl = document.createElement('div');
      caseEl.className  = `case ${grille[l][c].type}`;
      caseEl.dataset.ligne = l;
      caseEl.dataset.col   = c;
      caseEl.onclick = () => clicCase(l, c);
      const special = CASES_SPECIALES[`${l}-${c}`];
      if (special) {
        const img = document.createElement('img');
            img.src = ICONES_CASES[special];
            img.className = 'unite-img';
caseEl.appendChild(img);
      }
      ligne.appendChild(caseEl);
    }
    conteneur.appendChild(ligne);
  }
})();

// Phase et tour 
// 'des' → 'placement' → 'jeu' → 'termine'
let phase       = 'des';
let joueurActif = 1;
let numeroTour  = 1;
let etape       = null;   // 'deplacement' ou 'action'
let action      = null;   // 'attaquer' | 'capturer' | null

// ── Sélection en cours 
let caseSelectionnee = null;   // { ligne, col }
let combatInfo       = null;   // données du combat en cours

// ── Placement 
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