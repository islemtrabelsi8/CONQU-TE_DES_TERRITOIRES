// ============================================================
// DONNÉES FIXES DES UNITÉS
// ============================================================

const ICONES = { soldat: '🪖', cavalier: '🐴', tank: '🛡️' };
const NOMS   = { soldat: 'Soldat (S)', cavalier: 'Cavalier (C)', tank: 'Tank (T)' };
const FORCE  = { soldat: 2, cavalier: 1, tank: 3 };
const DEPLACEMENT_MAX = { soldat: 1, cavalier: 2, tank: 1 };

const CASES_BLOQUEES = ['eau'];


// ============================================================
// LA GRILLE EN MÉMOIRE (8x8)
// Chaque case : { type, proprietaire (0=neutre/1/2), unite (null ou objet) }
// ============================================================

const grille = [];
for (let l = 0; l < 8; l++) {
  grille.push([]);
  for (let c = 0; c < 8; c++) {
    grille[l].push({ type: 'neutre', proprietaire: 0, unite: null });
  }
}

// Zones de départ : J1 = lignes 0-1, J2 = lignes 6-7
for (let c = 0; c < 8; c++) {
  grille[0][c] = { type: 'zone-j1', proprietaire: 1, unite: null };
  grille[1][c] = { type: 'zone-j1', proprietaire: 1, unite: null };
  grille[6][c] = { type: 'zone-j2', proprietaire: 2, unite: null };
  grille[7][c] = { type: 'zone-j2', proprietaire: 2, unite: null };
}

// Cases spéciales
grille[5][5].type = 'eau';
grille[2][5].type = 'bonus-attaque';
grille[5][1].type = 'bonus-defense';
grille[4][3].type = 'piege';


// ============================================================
// ÉTAT DU JEU
// ============================================================

let phase       = 'des';   // 'des' -> 'placement' -> 'jeu' -> 'termine'
let joueurActif = 1;       // 1 ou 2
let numeroTour  = 1;       // s'incrémente quand les deux joueurs ont joué
let etape       = null;    // 'deplacement' ou 'action'
let action      = null;    // 'attaquer', 'capturer' (null si pas choisi)

let caseSelectionnee = null;  // { ligne, col } de l'unité choisie
let combatInfo       = null;  // données du combat en cours

// Placement
const unitesPlacees  = { 1: 0, 2: 0 };
const unitesVivantes = { 1: 0, 2: 0 }; // diminue quand une unité meurt
const uniteChoisie  = { 1: null, 2: null };

// Compteurs
const compteurs = {
  1: { soldat: 0, cavalier: 0, tank: 0 },
  2: { soldat: 0, cavalier: 0, tank: 0 }
};
const casesControlees = { 1: 16, 2: 16 };


// ============================================================
// AFFICHAGE DU DÉ
// ============================================================

const POINTS_DE = {
  1: [['h2','c2']],
  2: [['h1','c3'],['h3','c1']],
  3: [['h1','c3'],['h2','c2'],['h3','c1']],
  4: [['h1','c1'],['h1','c3'],['h3','c1'],['h3','c3']],
  5: [['h1','c1'],['h1','c3'],['h2','c2'],['h3','c1'],['h3','c3']],
  6: [['h1','c1'],['h1','c3'],['h2','c1'],['h2','c3'],['h3','c1'],['h3','c3']]
};

function dessinerDe(idFace, valeur) {
  const face = document.getElementById(idFace);
  face.innerHTML = '';
  POINTS_DE[valeur].forEach(([h, c]) => {
    const pt = document.createElement('div');
    pt.className = (h === 'h2' && c === 'c2')
      ? 'de-point point-h2 point-c2 centre'
      : `de-point point-${h} point-${c}`;
    face.appendChild(pt);
  });
}

function animerDe(idFace, idChiffre, callback) {
  const valeurFinale = Math.floor(Math.random() * 6) + 1;
  let nb = 0;
  const timer = setInterval(() => {
    dessinerDe(idFace, Math.floor(Math.random() * 6) + 1);
    nb++;
    if (nb >= 8) {
      clearInterval(timer);
      dessinerDe(idFace, valeurFinale);
      if (idChiffre) document.getElementById(idChiffre).textContent = valeurFinale;
      callback(valeurFinale);
    }
  }, 80);
}


// ============================================================
// PHASE 1 : DÉS INITIAUX
// ============================================================

let deInitialJ1 = null;
let deInitialJ2 = null;

function lancerDe(joueur) {
  document.getElementById(`btn-j${joueur}`).disabled = true;
  animerDe(`de-j${joueur}`, `chiffre-j${joueur}`, (valeur) => {
    if (joueur === 1) deInitialJ1 = valeur;
    else              deInitialJ2 = valeur;
    if (deInitialJ1 !== null && deInitialJ2 !== null) verifierDesInitiaux();
  });
}

function verifierDesInitiaux() {
  const res = document.getElementById('modal-resultat');

  if (deInitialJ1 === deInitialJ2) {
    res.textContent = `Égalité (${deInitialJ1} = ${deInitialJ2}) ! Relancez les dés.`;
    res.style.color = '#c9a227';
    deInitialJ1 = null;
    deInitialJ2 = null;
    setTimeout(() => {
      document.getElementById('btn-j1').disabled = false;
      document.getElementById('btn-j2').disabled = false;
      document.getElementById('chiffre-j1').textContent = '?';
      document.getElementById('chiffre-j2').textContent = '?';
    }, 1200);
    return;
  }

  const premier = deInitialJ1 > deInitialJ2 ? 1 : 2;
  res.textContent = `Joueur ${premier} commence ! (J1: ${deInitialJ1} vs J2: ${deInitialJ2})`;
  res.style.color = premier === 1 ? '#8fce60' : '#e07070';
  historique(`Dés initiaux : J1=${deInitialJ1}, J2=${deInitialJ2} → Joueur ${premier} commence`);

  setTimeout(() => {
    document.getElementById('modal-de').style.display = 'none';
    demarrerPlacement(premier);
  }, 1800);
}


// ============================================================
// PHASE 2 : PLACEMENT
// ============================================================

function demarrerPlacement(premier) {
  phase = 'placement';
  joueurActif = premier;
  majInterfacePlacement();
}

function choisirUnite(joueur, type) {
  if (phase !== 'placement') return;
  if (joueurActif !== joueur) return;
  if (unitesPlacees[joueur] >= 5) return;

  uniteChoisie[joueur] = type;

  ['soldat', 'cavalier', 'tank'].forEach(t =>
    document.getElementById(`choix-j${joueur}-${t}`)
      .classList.toggle('choix-selectionne', t === type)
  );

  majBarreInfo(ICONES[type], NOMS[type], `Force: ${FORCE[type]} · Joueur ${joueur}`, 'Cliquez sur votre zone');
  document.getElementById(`msg-choix-j${joueur}`).textContent = `${ICONES[type]} sélectionné — cliquez sur votre zone !`;
  msg(`Joueur ${joueur} : cliquez sur une case de votre zone pour placer le ${NOMS[type]}`);
}

function clicCase(ligne, col) {
  if (phase === 'placement') placerUnite(ligne, col);
  else if (phase === 'jeu')  clicCaseJeu(ligne, col);
}

function placerUnite(ligne, col) {
  const j = joueurActif;
  if (!uniteChoisie[j]) { msg(`Joueur ${j} : choisissez d'abord un type d'unité !`); return; }
  if ((j === 1 && ligne > 1) || (j === 2 && ligne < 6)) {
    msg(`Joueur ${j} : placez dans votre zone (lignes ${j === 1 ? '0-1' : '6-7'}) !`); return;
  }
  if (grille[ligne][col].unite) { msg('Cette case est déjà occupée !'); return; }

  const type = uniteChoisie[j];
  grille[ligne][col].unite = { joueur: j, type, enDefense: false };
  getCase(ligne, col).appendChild(creerJeton(j, type));

  compteurs[j][type]++;
  unitesPlacees[j]++;
  unitesVivantes[j]++;
  document.getElementById(`cpt-j${j}-${type}`).textContent  = compteurs[j][type];
  document.getElementById(`stat-placees-j${j}`).textContent = `${unitesVivantes[j]}`;

  historique(`J${j} place ${NOMS[type]} en (${ligne},${col})`);

  uniteChoisie[j] = null;
  ['soldat', 'cavalier', 'tank'].forEach(t =>
    document.getElementById(`choix-j${j}-${t}`).classList.remove('choix-selectionne')
  );
  document.getElementById(`msg-choix-j${j}`).textContent = 'En attente...';

  if (unitesPlacees[1] >= 5 && unitesPlacees[2] >= 5) { demarrerJeu(); return; }
  joueurActif = j === 1 ? 2 : 1;
  majInterfacePlacement();
}

function majInterfacePlacement() {
  const j = joueurActif;
  const autre = j === 1 ? 2 : 1;
  document.getElementById('section-choix-j1').classList.toggle('section-inactive', j !== 1);
  document.getElementById('section-choix-j2').classList.toggle('section-inactive', j !== 2);
  document.getElementById(`msg-choix-j${j}`).textContent     = "Choisissez un type d'unité ↑";
  document.getElementById(`msg-choix-j${autre}`).textContent = 'En attente...';
  document.getElementById('affichage-tour').textContent  = `Placement ${unitesPlacees[1] + unitesPlacees[2] + 1}/10`;
  document.getElementById('affichage-phase').textContent = 'Phase : Placement';
  document.getElementById('statut-message').textContent  = `Joueur ${j} place son unité (${unitesPlacees[j]}/5)`;
  msg(`Joueur ${j} : choisissez un type d'unité, puis cliquez sur votre zone !`);
  majBarreInfo('❓', 'Aucune', `Joueur ${j} — à vous`, 'Choisissez un type');
}


// ============================================================
// PHASE 3 : JEU
// ============================================================

function demarrerJeu() {
  phase = 'jeu';
  historique('=== Placement terminé — Le combat commence ! ===');
  document.getElementById('section-choix-j1').classList.add('section-inactive');
  document.getElementById('section-choix-j2').classList.add('section-inactive');
  // Afficher les boutons d'action (visibles mais bloqués dès le début, débloqués ici)
  document.getElementById('zone-boutons-action').style.display = 'flex';
  demarrerTourJoueur();
}

function demarrerTourJoueur() {
  etape = 'deplacement';
  action = null;
  caseSelectionnee = null;
  effacerSurbrillances();

  const j = joueurActif;
  document.getElementById('affichage-tour').textContent  = `Tour ${numeroTour}`;
  document.getElementById('affichage-phase').textContent = 'Phase : Déplacement';
  document.getElementById('statut-message').textContent  = `Joueur ${j} — déplacez une unité (optionnel)`;
  msg(`Joueur ${j} : déplacez une unité (optionnel) puis choisissez une action obligatoire`);
  majBoutons();
  majBarreInfo('❓', 'Aucune', '—', 'Choisissez une unité');
}

// ── CLIC SUR LA GRILLE ─────────────────────────────────────

function clicCaseJeu(ligne, col) {
  if (etape === 'deplacement') gererDeplacement(ligne, col);
  else if (etape === 'action') gererAction(ligne, col);
}

// ── DÉPLACEMENT ────────────────────────────────────────────

function gererDeplacement(ligne, col) {
  const caseGrille = grille[ligne][col];

  // Aucune unité sélectionnée → sélectionner
  if (!caseSelectionnee) {
    if (caseGrille.unite && caseGrille.unite.joueur === joueurActif) {
      caseSelectionnee = { ligne, col };
      surbrillance(ligne, col, 'selectionnee');
      afficherDeplacementsPossibles(ligne, col, caseGrille.unite.type);
      majBarreInfo(ICONES[caseGrille.unite.type], NOMS[caseGrille.unite.type],
        `⚡ Force réelle : ${forceReelle(caseGrille.unite)} · Pos: (${ligne},${col})`, `Joueur ${joueurActif}`);
      msg('Cases vertes = destinations. Cliquez pour déplacer.');
    }
    return;
  }

  const sel = caseSelectionnee;

  // Re-clic sur la même unité → désélectionner
  if (ligne === sel.ligne && col === sel.col) {
    caseSelectionnee = null;
    effacerSurbrillances();
    return;
  }

  // Clic sur une case verte → déplacer
  if (getCase(ligne, col).classList.contains('case-possible')) {
    deplacerUnite(sel.ligne, sel.col, ligne, col);
    return;
  }

  // Clic sur une autre unité alliée → changer de sélection
  if (caseGrille.unite && caseGrille.unite.joueur === joueurActif) {
    effacerSurbrillances();
    caseSelectionnee = { ligne, col };
    surbrillance(ligne, col, 'selectionnee');
    afficherDeplacementsPossibles(ligne, col, caseGrille.unite.type);
    majBarreInfo(ICONES[caseGrille.unite.type], NOMS[caseGrille.unite.type],
      `⚡ Force réelle : ${forceReelle(caseGrille.unite)} · Pos: (${ligne},${col})`, `Joueur ${joueurActif}`);
  }
}

function afficherDeplacementsPossibles(ligne, col, type) {
  const maxPas = DEPLACEMENT_MAX[type];
  [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dl, dc]) => {
    for (let pas = 1; pas <= maxPas; pas++) {
      const nl = ligne + dl * pas;
      const nc = col   + dc * pas;
      if (nl < 0 || nl > 7 || nc < 0 || nc > 7) break;
      if (CASES_BLOQUEES.includes(grille[nl][nc].type)) break;
      if (grille[nl][nc].unite) break; // bloqué par une unité
      surbrillance(nl, nc, 'possible');
    }
  });
}

function deplacerUnite(deL, deC, versL, versC) {
  const unite = grille[deL][deC].unite;

  retirerJeton(deL, deC);
  grille[deL][deC].unite = null;
  grille[versL][versC].unite = unite;
  getCase(versL, versC).appendChild(creerJeton(unite.joueur, unite.type));

  caseSelectionnee = { ligne: versL, col: versC };
  effacerSurbrillances();
  surbrillance(versL, versC, 'selectionnee');

  // Appliquer l'effet de la case d'arrivée
  appliquerEffetCase(grille[versL][versC].type, unite);

  majBarreInfo(ICONES[unite.type], NOMS[unite.type],
    `⚡ Force réelle : ${forceReelle(unite)} · Pos: (${versL},${versC})`, `Joueur ${unite.joueur}`);
  historique(`J${unite.joueur} déplace ${NOMS[unite.type]} : (${deL},${deC}) → (${versL},${versC})`);

  etape = 'action';
  document.getElementById('affichage-phase').textContent = 'Phase : Action';
  document.getElementById('statut-message').textContent  = `Joueur ${joueurActif} — choisissez une action`;
  msg(`Joueur ${joueurActif} : choisissez une action (Attaquer / Défendre / Capturer)`);
  majBoutons();
}

// ── ACTIONS ────────────────────────────────────────────────

function activerAttaque() {
  if (etape !== 'action') return;
  if (!caseSelectionnee) { msg('Sélectionnez d\'abord une unité !'); return; }

  const ennemisVoisins = getVoisinsEnnemis(caseSelectionnee.ligne, caseSelectionnee.col);
  if (ennemisVoisins.length === 0) {
    msg('Aucun ennemi à portée ! Choisissez une autre action.'); return;
  }

  action = 'attaquer';
  majBoutons();
  effacerSurbrillances();
  surbrillance(caseSelectionnee.ligne, caseSelectionnee.col, 'selectionnee');
  ennemisVoisins.forEach(([l, c]) => surbrillance(l, c, 'attaquable'));
  msg('Cliquez sur un ennemi (rouge) pour attaquer !');
}

function activerDefense() {
  if (etape !== 'action') return;
  if (!caseSelectionnee) { msg('Sélectionnez d\'abord une unité !'); return; }

  const { ligne, col } = caseSelectionnee;
  const unite = grille[ligne][col].unite;
  unite.enDefense = true;

  const jeton = getCase(ligne, col).querySelector('.jeton');
  if (jeton) jeton.classList.add('jeton-defend');

  historique(`J${joueurActif} — ${NOMS[unite.type]} en (${ligne},${col}) se défend (+1 force)`);
  msg('Unité en défense ! (+1 force pour résister)');
  setTimeout(finDeTourJoueur, 700);
}

function activerCapture() {
  if (etape !== 'action') return;
  if (!caseSelectionnee) { msg('Sélectionnez d\'abord une unité !'); return; }

  const { ligne, col } = caseSelectionnee;
  if (grille[ligne][col].proprietaire === joueurActif) {
    msg('Cette case vous appartient déjà !'); return;
  }

  action = 'capturer';
  majBoutons();
  effacerSurbrillances();
  surbrillance(ligne, col, 'selectionnee');
  surbrillance(ligne, col, 'possible');
  msg('Cliquez sur la case verte pour la capturer !');
}

function gererAction(ligne, col) {
  if (action === 'attaquer' && getCase(ligne, col).classList.contains('case-attaquable')) {
    demarrerCombat(caseSelectionnee, { ligne, col });
    return;
  }
  if (action === 'capturer' && getCase(ligne, col).classList.contains('case-possible')) {
    capturerCase(ligne, col);
    return;
  }
  // Sinon : changer la sélection si on clique sur une autre unité alliée
  if (grille[ligne][col].unite && grille[ligne][col].unite.joueur === joueurActif) {
    action = null;
    effacerSurbrillances();
    caseSelectionnee = { ligne, col };
    surbrillance(ligne, col, 'selectionnee');
    majBarreInfo(ICONES[grille[ligne][col].unite.type], NOMS[grille[ligne][col].unite.type],
      `⚡ Force réelle : ${forceReelle(grille[ligne][col].unite)} · Pos: (${ligne},${col})`, `Joueur ${joueurActif}`);
    majBoutons();
  }
}

// ── CAPTURER ───────────────────────────────────────────────

function capturerCase(ligne, col) {
  const ancienProp = grille[ligne][col].proprietaire;
  grille[ligne][col].proprietaire = joueurActif;

  const caseEl = getCase(ligne, col);
  caseEl.classList.remove('neutre', 'zone-j1', 'zone-j2');
  caseEl.classList.add(`zone-j${joueurActif}`);

  if (ancienProp !== 0) {
    casesControlees[ancienProp]--;
    document.getElementById(`stat-cases-j${ancienProp}`).textContent = casesControlees[ancienProp];
  }
  casesControlees[joueurActif]++;
  document.getElementById(`stat-cases-j${joueurActif}`).textContent = casesControlees[joueurActif];

  historique(`J${joueurActif} capture la case (${ligne},${col})`);
  effacerSurbrillances();
  verifierVictoire();
  setTimeout(finDeTourJoueur, 600);
}

// Applique l'effet de la case sur l'unité qui se déplace dessus
function appliquerEffetCase(typeCase, unite) {
  if (typeCase === 'bonus-attaque') {
    unite.bonusForce = (unite.bonusForce || 0) + 1;
    msg(`⚔ Bonus Attaque ! +1 force → total: ${FORCE[unite.type] + unite.bonusForce}`);
    historique(`J${joueurActif} — ${NOMS[unite.type]} gagne +1 force (Bonus Attaque)`);
  } else if (typeCase === 'bonus-defense') {
    unite.bonusForce = (unite.bonusForce || 0) + 1;
    msg(`🛡 Bonus Défense ! +1 force → total: ${FORCE[unite.type] + unite.bonusForce}`);
    historique(`J${joueurActif} — ${NOMS[unite.type]} gagne +1 force (Bonus Défense)`);
  } else if (typeCase === 'piege') {
    unite.bonusForce = (unite.bonusForce || 0) - 1;
    msg(`⚙ Piège ! -1 force → total: ${FORCE[unite.type] + unite.bonusForce}`);
    historique(`J${joueurActif} — ${NOMS[unite.type]} perd -1 force (Piège)`);
  } else if (typeCase === 'eau') {
    unite.bonusForce = (unite.bonusForce || 0) - 1;
    msg(`≋ Eau ! -1 force → total: ${FORCE[unite.type] + unite.bonusForce}`);
    historique(`J${joueurActif} — ${NOMS[unite.type]} perd -1 force (Eau)`);
  }
}

// ── COMBAT ─────────────────────────────────────────────────

function demarrerCombat(posAtt, posDef) {
  const uniteAtt = grille[posAtt.ligne][posAtt.col].unite;
  const uniteDef = grille[posDef.ligne][posDef.col].unite;
  const ennemi   = joueurActif === 1 ? 2 : 1;

  combatInfo = { posAtt, posDef, uniteAtt, uniteDef };

  document.getElementById('combat-att-num').textContent = joueurActif;
  document.getElementById('combat-def-num').textContent = ennemi;
  document.getElementById('detail-att').textContent     =
    `${ICONES[uniteAtt.type]} ${NOMS[uniteAtt.type]} · Force : ${FORCE[uniteAtt.type] + (uniteAtt.bonusForce || 0)}`;
  document.getElementById('detail-def').textContent     =
    `${ICONES[uniteDef.type]} ${NOMS[uniteDef.type]} · Force : ${FORCE[uniteDef.type] + (uniteDef.bonusForce || 0)}${uniteDef.enDefense ? ' +1 (défense)' : ''}`;
  document.getElementById('chiffre-combat-att').textContent = '?';
  document.getElementById('chiffre-combat-def').textContent = '?';
  document.getElementById('combat-resultat').textContent    = '';
  document.getElementById('btn-combat-lancer').disabled     = false;
  dessinerDe('de-combat-att', 1);
  dessinerDe('de-combat-def', 1);
  document.getElementById('modal-combat').style.display = 'flex';
}

function lancerCombat() {
  document.getElementById('btn-combat-lancer').disabled = true;
  const { posAtt, posDef, uniteAtt, uniteDef } = combatInfo;

  // Lancer dé attaquant, puis dé défenseur
  animerDe('de-combat-att', 'chiffre-combat-att', (deAtt) => {
    animerDe('de-combat-def', 'chiffre-combat-def', (deDef) => {

      const scoreAtt = deAtt + FORCE[uniteAtt.type] + (uniteAtt.bonusForce || 0);
      const scoreDef = deDef + FORCE[uniteDef.type] + (uniteDef.bonusForce || 0) + (uniteDef.enDefense ? 1 : 0);
      const res      = document.getElementById('combat-resultat');
      const ennemi   = joueurActif === 1 ? 2 : 1;

      if (scoreAtt > scoreDef) {
        // L'attaquant gagne
        res.textContent = `J${joueurActif} gagne ! (${scoreAtt} > ${scoreDef}) — Ennemi éliminé !`;
        res.style.color = joueurActif === 1 ? '#8fce60' : '#e07070';
        historique(`Combat: J${joueurActif}(dé ${deAtt}+force ${FORCE[uniteAtt.type]}=${scoreAtt}) bat J${ennemi}(dé ${deDef}+force ${FORCE[uniteDef.type]}=${scoreDef})`);
        setTimeout(() => {
          document.getElementById('modal-combat').style.display = 'none';
          appliquerVictoireCombat(posAtt, posDef, uniteAtt, uniteDef);
        }, 1800);
      } else {
        // Le défenseur résiste (score égal ou supérieur)
        res.textContent = `J${ennemi} résiste ! (${scoreDef} ≥ ${scoreAtt}) — Attaque repoussée !`;
        res.style.color = ennemi === 1 ? '#8fce60' : '#e07070';
        historique(`Combat: J${joueurActif}(${scoreAtt}) ≤ J${ennemi}(${scoreDef}) → attaque repoussée`);
        setTimeout(() => {
          document.getElementById('modal-combat').style.display = 'none';
          finDeTourJoueur();
        }, 1800);
      }
    });
  });
}

function appliquerVictoireCombat(posAtt, posDef, uniteAtt, uniteDef) {
  const ennemi = joueurActif === 1 ? 2 : 1;

  // Retirer l'unité ennemie
  retirerJeton(posDef.ligne, posDef.col);
  grille[posDef.ligne][posDef.col].unite = null;
  compteurs[ennemi][uniteDef.type]--;
  unitesVivantes[ennemi]--;
  document.getElementById(`cpt-j${ennemi}-${uniteDef.type}`).textContent = compteurs[ennemi][uniteDef.type];
  document.getElementById(`stat-placees-j${ennemi}`).textContent = `${unitesVivantes[ennemi]}`;

  // Déplacer l'attaquant sur la case conquise
  retirerJeton(posAtt.ligne, posAtt.col);
  grille[posAtt.ligne][posAtt.col].unite = null;
  grille[posDef.ligne][posDef.col].unite = uniteAtt;
  getCase(posDef.ligne, posDef.col).appendChild(creerJeton(uniteAtt.joueur, uniteAtt.type));

  // Changer le propriétaire de la case
  const ancienProp = grille[posDef.ligne][posDef.col].proprietaire;
  grille[posDef.ligne][posDef.col].proprietaire = joueurActif;
  const caseEl = getCase(posDef.ligne, posDef.col);
  caseEl.classList.remove('neutre', 'zone-j1', 'zone-j2');
  caseEl.classList.add(`zone-j${joueurActif}`);

  // Compteurs de cases
  if (ancienProp !== 0) {
    casesControlees[ancienProp]--;
    document.getElementById(`stat-cases-j${ancienProp}`).textContent = casesControlees[ancienProp];
  }
  casesControlees[joueurActif]++;
  document.getElementById(`stat-cases-j${joueurActif}`).textContent = casesControlees[joueurActif];

  effacerSurbrillances();
  verifierVictoire();
  setTimeout(finDeTourJoueur, 400);
}

// ── FIN DE TOUR ────────────────────────────────────────────

// Passer le deplacement (optionnel) -> aller directement a l'action
function passerDeplacement() {
  if (phase !== 'jeu' || etape !== 'deplacement') return;
  caseSelectionnee = null;
  effacerSurbrillances();
  etape = 'action';
  document.getElementById('affichage-phase').textContent = 'Phase : Action';
  document.getElementById('statut-message').textContent  = `Joueur ${joueurActif} — choisissez une action (obligatoire)`;
  msg(`Joueur ${joueurActif} : choisissez Attaquer, Défendre ou Capturer (obligatoire !)`);
  majBoutons();
  majBarreInfo('❓', 'Aucune', '—', 'Choisissez une action');
}

function finDeTourJoueur() {
  // Supprimer le bonus défense du joueur actif
  for (let l = 0; l < 8; l++) {
    for (let c = 0; c < 8; c++) {
      const u = grille[l][c].unite;
      if (u && u.joueur === joueurActif && u.enDefense) {
        u.enDefense = false;
        const jeton = getCase(l, c).querySelector('.jeton');
        if (jeton) jeton.classList.remove('jeton-defend');
      }
    }
  }

  effacerSurbrillances();
  caseSelectionnee = null;
  action = null;

  // Un tour = J1 joue + J2 joue
  // → le numéro de tour s'incrémente seulement quand on revient au joueur 1
  const joueurSuivant = joueurActif === 1 ? 2 : 1;
  if (joueurSuivant === 1) numeroTour++;
  joueurActif = joueurSuivant;

  demarrerTourJoueur();
}

// ── VICTOIRE ───────────────────────────────────────────────

function verifierVictoire() {
  // Gagner avec 33 cases
  for (const j of [1, 2]) {
    if (casesControlees[j] >= 33) {
      annoncerVictoire(j, `contrôle de ${casesControlees[j]} cases`); return;
    }
  }
  // Gagner en éliminant toutes les unités ennemies
  for (const j of [1, 2]) {
    const total = compteurs[j].soldat + compteurs[j].cavalier + compteurs[j].tank;
    if (total <= 0) {
      annoncerVictoire(j === 1 ? 2 : 1, 'élimination de toutes les unités ennemies'); return;
    }
  }
}

function annoncerVictoire(joueur, raison) {
  document.getElementById('statut-message').textContent = `🏆 JOUEUR ${joueur} A GAGNÉ !`;
  document.getElementById('statut-message').style.color = joueur === 1 ? '#8fce60' : '#e07070';
  msg(`🏆 Joueur ${joueur} remporte la partie ! (${raison})`);
  historique(`=== 🏆 VICTOIRE DU JOUEUR ${joueur} (${raison}) ===`);
  phase = 'termine';
  document.getElementById('zone-boutons-action').style.display = 'none';
}


// ============================================================
// UTILITAIRES
// ============================================================

function getCase(ligne, col) {
  return document.querySelector(`.case[data-ligne="${ligne}"][data-col="${col}"]`);
}

function creerJeton(joueur, type) {
  const jeton = document.createElement('div');
  jeton.className   = `jeton jeton-j${joueur}`;
  jeton.textContent = ICONES[type];
  return jeton;
}

function retirerJeton(ligne, col) {
  const jeton = getCase(ligne, col).querySelector('.jeton');
  if (jeton) jeton.remove();
}

function surbrillance(ligne, col, type) {
  const el = getCase(ligne, col);
  if (!el) return;
  if (type === 'selectionnee') el.classList.add('case-selectionnee');
  if (type === 'possible')     el.classList.add('case-possible');
  if (type === 'attaquable')   el.classList.add('case-attaquable');
}

function effacerSurbrillances() {
  document.querySelectorAll('.case-selectionnee, .case-possible, .case-attaquable')
    .forEach(el => el.classList.remove('case-selectionnee', 'case-possible', 'case-attaquable'));
}

function getVoisinsEnnemis(ligne, col) {
  return [[ligne-1,col],[ligne+1,col],[ligne,col-1],[ligne,col+1]]
    .filter(([l, c]) =>
      l >= 0 && l <= 7 && c >= 0 && c <= 7 &&
      grille[l][c].unite &&
      grille[l][c].unite.joueur !== joueurActif
    );
}

function majBoutons() {
  // En déplacement : seul "Déplacer" est actif + bouton "Passer le déplacement"
  // En action : Attaquer/Défendre/Capturer sont actifs (PAS de fin de tour ici)
  document.getElementById('btn-deplacer').disabled   = etape !== 'deplacement';
  document.getElementById('btn-attaquer').disabled   = etape !== 'action';
  document.getElementById('btn-defendre').disabled   = etape !== 'action';
  document.getElementById('btn-capturer').disabled   = etape !== 'action';
  document.getElementById('btn-passer-dep').disabled = etape !== 'deplacement';

  ['btn-deplacer','btn-attaquer','btn-defendre','btn-capturer'].forEach(id =>
    document.getElementById(id).classList.remove('btn-actif')
  );
  if (action === 'attaquer') document.getElementById('btn-attaquer').classList.add('btn-actif');
  if (action === 'capturer') document.getElementById('btn-capturer').classList.add('btn-actif');
}

// Calcule la force réelle d'une unité (force de base + bonus/malus)
function forceReelle(unite) {
  return FORCE[unite.type] + (unite.bonusForce || 0);
}

function majBarreInfo(icone, nom, info, statut) {
  document.getElementById('sel-icone').textContent  = icone;
  document.getElementById('sel-nom').textContent    = nom;
  document.getElementById('sel-info').textContent   = info;
  document.getElementById('sel-statut').textContent = statut;
}

function msg(texte) {
  document.getElementById('instructions').textContent = texte;
}

function historique(texte) {
  const liste  = document.getElementById('historique');
  const entree = document.createElement('div');
  entree.className   = 'historique-entree';
  entree.textContent = texte;
  liste.appendChild(entree);
  liste.scrollTop = liste.scrollHeight;
}
