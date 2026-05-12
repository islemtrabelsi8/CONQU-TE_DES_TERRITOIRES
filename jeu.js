
function clicCase(ligne, col) {
  if (phase === 'placement') placerUnite(ligne, col);
  else if (phase === 'jeu')  clicCaseJeu(ligne, col);
}

// PHASE 2 : PLACEMENT

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
  document.getElementById(`msg-choix-j${joueur}`).textContent =
  `${NOMS[type]} sélectionné — cliquez sur votre zone !`;
  msg(`Joueur ${joueur} : cliquez sur une case de votre zone pour placer le ${NOMS[type]}`);
}

function placerUnite(ligne, col) {
  const j = joueurActif;
  if (!uniteChoisie[j]) {
    msg(`Joueur ${j} : choisissez d'abord un type d'unité !`); return;
  }
  if ((j === 1 && ligne > 1) || (j === 2 && ligne < 6)) {
    msg(`Joueur ${j} : placez dans votre zone (lignes ${j === 1 ? '0-1' : '6-7'}) !`); return;
  }
  if (grille[ligne][col].unite) { msg('Cette case est déjà occupée !'); return; }

  const type = uniteChoisie[j];
  grille[ligne][col].unite = { joueur: j, type, bonusForce: 0 }; // bonusForce = 0 au départ
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


// PHASE 3 : JEU

function demarrerJeu() {
  phase = 'jeu';
  historique('=== Placement terminé — Le combat commence ! ===');
  document.getElementById('section-choix-j1').classList.add('section-inactive');
  document.getElementById('section-choix-j2').classList.add('section-inactive');
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
  majBarreInfo(ICONES.vide, 'Aucune unité', '—', 'Choisissez une unité');
}

// ── Clic sur la grille en phase jeu ───────────────────────

function clicCaseJeu(ligne, col) {
  if (etape === 'deplacement') gererDeplacement(ligne, col);
  else if (etape === 'action') gererAction(ligne, col);
}

// ── Déplacement ────────────────────────────────────────────

function gererDeplacement(ligne, col) {
  const caseGrille = grille[ligne][col];

  if (!caseSelectionnee) {
    if (caseGrille.unite && caseGrille.unite.joueur === joueurActif) {
      caseSelectionnee = { ligne, col };
      surbrillance(ligne, col, 'selectionnee');
      afficherDeplacementsPossibles(ligne, col, caseGrille.unite.type);
      majBarreInfo(
        ICONES[caseGrille.unite.type], NOMS[caseGrille.unite.type],
        `⚡ Force réelle : ${forceReelle(caseGrille.unite)} · Pos: (${ligne},${col})`,
        `Joueur ${joueurActif}`
      );
      msg('Cases vertes = destinations. Cliquez pour déplacer.');
    }
    return;
  }

  const sel = caseSelectionnee;

  // Re-clic sur la même case → désélectionner
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
    majBarreInfo(
      ICONES[caseGrille.unite.type], NOMS[caseGrille.unite.type],
      `⚡ Force réelle : ${forceReelle(caseGrille.unite)} · Pos: (${ligne},${col})`,
      `Joueur ${joueurActif}`
    );
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
      if (grille[nl][nc].unite) break;
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

  appliquerEffetCase(grille[versL][versC].type, unite);

  majBarreInfo(
    ICONES[unite.type], NOMS[unite.type],
    `⚡ Force réelle : ${forceReelle(unite)} · Pos: (${versL},${versC})`,
    `Joueur ${unite.joueur}`
  );
  historique(`J${unite.joueur} déplace ${NOMS[unite.type]} : (${deL},${deC}) → (${versL},${versC})`);

  etape = 'action';
  document.getElementById('affichage-phase').textContent = 'Phase : Action';
  document.getElementById('statut-message').textContent  = `Joueur ${joueurActif} — choisissez une action`;
  msg(`Joueur ${joueurActif} : choisissez une action (Attaquer / Défendre / Capturer)`);
  majBoutons();
}

// ── Effet des cases spéciales ──────────────────────────────

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

// ── Actions ────────────────────────────────────────────────

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
  unite.bonusForce = (unite.bonusForce || 0) + 1; // +1 force permanent comme les cases bonus

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
  // Changer de sélection si clic sur une autre unité alliée
  if (grille[ligne][col].unite && grille[ligne][col].unite.joueur === joueurActif) {
    action = null;
    effacerSurbrillances();
    caseSelectionnee = { ligne, col };
    surbrillance(ligne, col, 'selectionnee');
    majBarreInfo(
      ICONES[grille[ligne][col].unite.type], NOMS[grille[ligne][col].unite.type],
      `⚡ Force réelle : ${forceReelle(grille[ligne][col].unite)} · Pos: (${ligne},${col})`,
      `Joueur ${joueurActif}`
    );
    majBoutons();
  }
}

// ── Capturer une case ──────────────────────────────────────

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

// ── Combat ─────────────────────────────────────────────────

function demarrerCombat(posAtt, posDef) {
  const uniteAtt = grille[posAtt.ligne][posAtt.col].unite;
  const uniteDef = grille[posDef.ligne][posDef.col].unite;
  const ennemi   = joueurActif === 1 ? 2 : 1;

  combatInfo = { posAtt, posDef, uniteAtt, uniteDef };

  document.getElementById('combat-att-num').textContent = joueurActif;
  document.getElementById('combat-def-num').textContent = ennemi;
document.getElementById('detail-att').textContent =
  `${NOMS[uniteAtt.type]} · Force : ${FORCE[uniteAtt.type] + (uniteAtt.bonusForce || 0)}`;
document.getElementById('detail-def').textContent =
  `${NOMS[uniteDef.type]} · Force : ${FORCE[uniteDef.type] + (uniteDef.bonusForce || 0)}`;
  document.getElementById('chiffre-combat-att').textContent = '?';
  document.getElementById('chiffre-combat-def').textContent = '?';
  document.getElementById('combat-resultat').textContent    = '';
  document.getElementById('btn-combat-lancer').disabled     = false;
  document.getElementById('modal-combat').style.display = 'flex';
}

function appliquerVictoireCombat(posAtt, posDef, uniteAtt, uniteDef) {
  const ennemi = joueurActif === 1 ? 2 : 1;

  retirerJeton(posDef.ligne, posDef.col);
  grille[posDef.ligne][posDef.col].unite = null;
  compteurs[ennemi][uniteDef.type]--;
  unitesVivantes[ennemi]--;
  document.getElementById(`cpt-j${ennemi}-${uniteDef.type}`).textContent = compteurs[ennemi][uniteDef.type];
  document.getElementById(`stat-placees-j${ennemi}`).textContent = `${unitesVivantes[ennemi]}`;

  retirerJeton(posAtt.ligne, posAtt.col);
  grille[posAtt.ligne][posAtt.col].unite = null;
  grille[posDef.ligne][posDef.col].unite = uniteAtt;
  getCase(posDef.ligne, posDef.col).appendChild(creerJeton(uniteAtt.joueur, uniteAtt.type));

  const ancienProp = grille[posDef.ligne][posDef.col].proprietaire;
  grille[posDef.ligne][posDef.col].proprietaire = joueurActif;
  const caseEl = getCase(posDef.ligne, posDef.col);
  caseEl.classList.remove('neutre', 'zone-j1', 'zone-j2');
  caseEl.classList.add(`zone-j${joueurActif}`);

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

// ── Passer le déplacement (optionnel) ─────────────────────

function passerDeplacement() {
  if (phase !== 'jeu' || etape !== 'deplacement') return;
  caseSelectionnee = null;
  effacerSurbrillances();
  etape = 'action';
  document.getElementById('affichage-phase').textContent = 'Phase : Action';
  document.getElementById('statut-message').textContent  = `Joueur ${joueurActif} — choisissez une action (obligatoire)`;
  msg(`Joueur ${joueurActif} : choisissez Attaquer, Défendre ou Capturer (obligatoire !)`);
  majBoutons();
  majBarreInfo(ICONES.vide, 'Aucune unité', '—', 'Choisissez une action');
}

// ── Fin de tour ────────────────────────────────────────────

function finDeTourJoueur() {
  // Retirer le bonus défense du joueur actif
  // Retirer l'effet visuel défense (le bonusForce lui reste acquis)
  for (let l = 0; l < 8; l++) {
    for (let c = 0; c < 8; c++) {
      const jeton = getCase(l, c).querySelector('.jeton');
      if (jeton) jeton.classList.remove('jeton-defend');
    }
  }

  effacerSurbrillances();
  caseSelectionnee = null;
  action = null;

  const joueurSuivant = joueurActif === 1 ? 2 : 1;
  if (joueurSuivant === 1) numeroTour++;
  joueurActif = joueurSuivant;

  demarrerTourJoueur();
}

// ── Victoire ───────────────────────────────────────────────

function verifierVictoire() {
  for (const j of [1, 2]) {
    if (casesControlees[j] >= 32) {
      annoncerVictoire(j, `contrôle de ${casesControlees[j]} cases`); return;
    }
  }
  for (const j of [1, 2]) {
    const total = compteurs[j].soldat + compteurs[j].cavalier + compteurs[j].tank;
    if (total <= 0) {
      annoncerVictoire(j === 1 ? 2 : 1, 'élimination de toutes les unités ennemies'); return;
    }
  }
}

function annoncerVictoire(joueur, raison) {
  phase = 'termine';

  const couleur  = joueur === 1 ? '#3a7060' : '#a04060';
  const emoji    = joueur === 1 ? '🧙' : '🧝';

  document.getElementById('victoire-titre').textContent   = `🏆 JOUEUR ${joueur} A GAGNÉ !`;
  document.getElementById('victoire-titre').style.color   = couleur;
  document.getElementById('victoire-raison').textContent  = raison;
  document.getElementById('victoire-emoji').textContent   = emoji;
  document.getElementById('victoire-message').textContent =
    `Joueur ${joueur} remporte la conquête des territoires !`;

  document.getElementById('modal-victoire').style.display = 'flex';
  historique(`=== 🏆 VICTOIRE DU JOUEUR ${joueur} (${raison}) ===`);
  document.getElementById('zone-boutons-action').style.display = 'none';
}

// ── Utilitaire : voisins ennemis ───────────────────────────

function getVoisinsEnnemis(ligne, col) {
  return [[ligne-1,col],[ligne+1,col],[ligne,col-1],[ligne,col+1]]
    .filter(([l, c]) =>
      l >= 0 && l <= 7 && c >= 0 && c <= 7 &&
      grille[l][c].unite &&
      grille[l][c].unite.joueur !== joueurActif
    );
}