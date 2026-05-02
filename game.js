// ================================================
// ÉTAT DU JEU
// ================================================

const ICONES = { soldat: '🪖', cavalier: '🐴', tank: '🛡️' };
const NOMS   = { soldat: 'Soldat (S)', cavalier: 'Cavalier (C)', tank: 'Tank (T)' };

const etat = {
  phase: 'des',          // 'des' | 'placement' | 'jeu'
  deJ1: null,
  deJ2: null,
  tourActuel: 1,         // 1 ou 2
  uniteChoisie: { 1: null, 2: null },
  unitesPlacees: { 1: 0, 2: 0 },
  compteurs: {
    1: { soldat: 0, cavalier: 0, tank: 0 },
    2: { soldat: 0, cavalier: 0, tank: 0 }
  }
};


// ================================================
// PHASE 1 : LANCER DE DÉS
// ================================================

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
    pt.className = `de-point point-${h} point-${c}`;
    if (h === 'h2' && c === 'c2') pt.className = 'de-point point-h2 point-c2 centre';
    face.appendChild(pt);
  });
}

function lancerDe(joueur) {
  const valeur    = Math.floor(Math.random() * 6) + 1;
  const idFace    = `de-j${joueur}`;
  const idChiffre = `chiffre-j${joueur}`;
  const idBtn     = `btn-j${joueur}`;

  // Animation rapide
  let compteur = 0;
  const anim = setInterval(() => {
    dessinerDe(idFace, Math.floor(Math.random() * 6) + 1);
    compteur++;
    if (compteur >= 8) {
      clearInterval(anim);
      dessinerDe(idFace, valeur);
      document.getElementById(idChiffre).textContent = valeur;
      document.getElementById(idBtn).disabled = true;
      if (joueur === 1) etat.deJ1 = valeur;
      else              etat.deJ2 = valeur;
      verifierDesInitiaux();
    }
  }, 80);
}

function verifierDesInitiaux() {
  if (etat.deJ1 === null || etat.deJ2 === null) return;

  const res = document.getElementById('modal-resultat');

  if (etat.deJ1 === etat.deJ2) {
    // Égalité : recommencer
    res.textContent = `Égalité (${etat.deJ1} = ${etat.deJ2}) ! Relancez les dés.`;
    res.style.color = '#c9a227';
    etat.deJ1 = null;
    etat.deJ2 = null;
    setTimeout(() => {
      document.getElementById('btn-j1').disabled = false;
      document.getElementById('btn-j2').disabled = false;
      document.getElementById('chiffre-j1').textContent = '?';
      document.getElementById('chiffre-j2').textContent = '?';
    }, 1200);
    return;
  }

  const gagnant = etat.deJ1 > etat.deJ2 ? 1 : 2;
  res.textContent = `Joueur ${gagnant} commence ! (${etat.deJ1} vs ${etat.deJ2})`;
  res.style.color = gagnant === 1 ? '#8fce60' : '#e07070';
  ajouterHistorique(`Dés : J1=${etat.deJ1} J2=${etat.deJ2} — Joueur ${gagnant} commence`);

  setTimeout(() => {
    document.getElementById('modal-de').style.display = 'none';
    demarrerPlacement(gagnant);
  }, 1800);
}


// ================================================
// PHASE 2 : PLACEMENT
// ================================================

function demarrerPlacement(premierJoueur) {
  etat.phase = 'placement';
  etat.tourActuel = premierJoueur;
  mettreAJourInterface();
}

function choisirUnite(joueur, type) {
  // Ignorer si ce n'est pas le tour de ce joueur ou si pas en phase placement
  if (etat.phase !== 'placement') return;
  if (etat.tourActuel !== joueur) return;
  // Ignorer si déjà 5 unités placées
  if (etat.unitesPlacees[joueur] >= 5) return;

  etat.uniteChoisie[joueur] = type;

  // Mettre en évidence le bouton sélectionné
  ['soldat', 'cavalier', 'tank'].forEach(t => {
    const btn = document.getElementById(`choix-j${joueur}-${t}`);
    btn.classList.toggle('choix-selectionne', t === type);
  });

  // Mettre à jour la barre du bas
  document.getElementById('sel-icone').textContent  = ICONES[type];
  document.getElementById('sel-nom').textContent    = NOMS[type];
  document.getElementById('sel-joueur').textContent = `Joueur ${joueur}`;
  document.getElementById('sel-statut').textContent = 'Choisissez une case pour placer cette unité';

  document.getElementById(`msg-choix-j${joueur}`).textContent =
    `${ICONES[type]} ${NOMS[type]} sélectionné — cliquez sur une case !`;

  document.getElementById('instructions').textContent =
    `Joueur ${joueur} : cliquez sur une case de votre zone pour placer votre ${NOMS[type]}`;
}

function placerUnite(ligne, col) {
  if (etat.phase !== 'placement') return;

  const joueur = etat.tourActuel;

  // Vérifier que le joueur a choisi un type
  if (!etat.uniteChoisie[joueur]) {
    document.getElementById('instructions').textContent =
      `Joueur ${joueur} : choisissez d'abord un type d'unité !`;
    return;
  }

  // Vérifier que la case appartient à la bonne zone
  const zoneValide = (joueur === 1 && ligne <= 1) || (joueur === 2 && ligne >= 6);
  if (!zoneValide) {
    document.getElementById('instructions').textContent =
      `Joueur ${joueur} : vous devez placer dans votre propre zone !`;
    return;
  }

  // Trouver l'élément de la case
  const caseEl = document.querySelector(`.case[data-ligne="${ligne}"][data-col="${col}"]`);
  if (!caseEl) return;

  // Vérifier si la case est déjà occupée
  if (caseEl.querySelector('.jeton')) {
    document.getElementById('instructions').textContent = 'Cette case est déjà occupée !';
    return;
  }

  // Placer le jeton
  const type  = etat.uniteChoisie[joueur];
  const jeton = document.createElement('div');
  jeton.className   = `jeton jeton-j${joueur}`;
  jeton.textContent = ICONES[type];
  caseEl.appendChild(jeton);
  caseEl.classList.add('case-occupee');

  // Mettre à jour les compteurs
  etat.compteurs[joueur][type]++;
  etat.unitesPlacees[joueur]++;
  document.getElementById(`cpt-j${joueur}-${type}`).textContent    = etat.compteurs[joueur][type];
  document.getElementById(`stat-placees-j${joueur}`).textContent   = etat.unitesPlacees[joueur];
  document.getElementById(`stat-restantes-j${joueur}`).textContent = 5 - etat.unitesPlacees[joueur];

  ajouterHistorique(`J${joueur} place ${NOMS[type]} en (${ligne},${col})`);

  // Réinitialiser le choix
  etat.uniteChoisie[joueur] = null;
  ['soldat', 'cavalier', 'tank'].forEach(t => {
    document.getElementById(`choix-j${joueur}-${t}`).classList.remove('choix-selectionne');
  });
  document.getElementById(`msg-choix-j${joueur}`).textContent = 'En attente...';

  // Vérifier si le placement est terminé
  if (etat.unitesPlacees[1] >= 5 && etat.unitesPlacees[2] >= 5) {
    terminerPlacement();
    return;
  }

  // Passer au joueur suivant
  etat.tourActuel = joueur === 1 ? 2 : 1;
  mettreAJourInterface();
}

function mettreAJourInterface() {
  const joueur = etat.tourActuel;
  const autre  = joueur === 1 ? 2 : 1;

  // Activer / désactiver les sections de choix
  document.getElementById('section-choix-j1').classList.toggle('section-inactive', joueur !== 1);
  document.getElementById('section-choix-j2').classList.toggle('section-inactive', joueur !== 2);

  // Messages
  document.getElementById(`msg-choix-j${joueur}`).textContent = "Choisissez un type d'unité ↑";
  document.getElementById(`msg-choix-j${autre}`).textContent  = 'En attente...';

  document.getElementById('affichage-tour').textContent  = `Tour ${etat.unitesPlacees[1] + etat.unitesPlacees[2] + 1}`;
  document.getElementById('affichage-phase').textContent = 'Phase : Placement';

  document.getElementById('statut-message').textContent =
    `C'est au tour du Joueur ${joueur} de placer une unité (${etat.unitesPlacees[joueur]}/5)`;

  document.getElementById('instructions').textContent =
    `Joueur ${joueur} : choisissez un type d'unité dans votre panneau, puis cliquez sur votre zone !`;

  document.getElementById('sel-icone').textContent  = '❓';
  document.getElementById('sel-nom').textContent    = 'Aucune';
  document.getElementById('sel-joueur').textContent = `Joueur ${joueur} — à vous de choisir`;
  document.getElementById('sel-statut').textContent = 'Sélectionnez un type ci-dessus';
}

function terminerPlacement() {
  etat.phase = 'jeu';
  document.getElementById('affichage-phase').textContent = 'Phase : Combat';
  document.getElementById('statut-message').textContent  = 'Placement terminé — que le combat commence !';
  document.getElementById('instructions').textContent    = 'Placement terminé ! La phase de combat peut commencer.';
  ajouterHistorique('=== Placement terminé — Phase de combat ===');

  // Désactiver les sections de choix
  document.getElementById('section-choix-j1').classList.add('section-inactive');
  document.getElementById('section-choix-j2').classList.add('section-inactive');
}

function ajouterHistorique(texte) {
  const liste  = document.getElementById('historique');
  const entree = document.createElement('div');
  entree.className   = 'historique-entree';
  entree.textContent = texte;
  liste.appendChild(entree);
  liste.scrollTop = liste.scrollHeight;
}
