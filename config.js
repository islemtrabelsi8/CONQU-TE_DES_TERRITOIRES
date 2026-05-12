
// config.js — Constantes fixes et création de la grille

const ICONES = {
  soldat: 'assets/soldat.png',
  cavalier: 'assets/cheval.png',
  tank: 'assets/militaire.png',
  vide: 'assets/question.png'
};
const NOMS   = { soldat: 'Soldat (S)', 
                  cavalier: 'Cavalier (C)',
                  tank: 'Tank (T)' };
const FORCE  = { soldat: 2, 
                cavalier: 1,
                 tank: 3 };
const DEPLACEMENT_MAX = { soldat: 1,
                           cavalier: 2,
                            tank: 1 };

// ── Création de la grille ──────────────────────────────────

const CASES_SPECIALES = {
  '2-5': 'bonus-attaque',
  '4-3': 'piege',
  '5-1': 'bonus-defense',
  '5-5': 'eau'
};

const ICONES_CASES = {
  'bonus-attaque': 'assets/attack.png',
  'piege':         'assets/trap.png',
  'bonus-defense': 'assets/security-shield.png',
  'eau':          'assets/sea.png'
};
const CASES_BLOQUEES = ['eau']; 


function creerGrille() {
  const g = [];
  for (let l = 0; l < 8; l++) {
    g.push([]);
    for (let c = 0; c < 8; c++) {
      let type = 'neutre';
      let proprietaire = 0;
      if (l <= 1) {
         type = 'zone-j1'; 
         proprietaire = 1; }
      else if (l >= 6) { 
        type = 'zone-j2';
         proprietaire = 2; }
      else if (CASES_SPECIALES[`${l}-${c}`]) {
         type = CASES_SPECIALES[`${l}-${c}`]; }
      g[l].push({ type, proprietaire, unite: null });
    }
  }
  return g;
}