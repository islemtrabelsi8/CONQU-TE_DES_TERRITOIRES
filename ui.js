
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

// ── Barre d'info de l'unité sélectionnée ──────────────────

function majBarreInfo(icone, nom, info, statut) {
document.getElementById('sel-icone').innerHTML = `<img src="${icone}" class="unite-img">`;
  document.getElementById('sel-nom').textContent    = nom;
  document.getElementById('sel-info').textContent   = info;
  document.getElementById('sel-statut').textContent = statut;
}

// ── Boutons d'action ───────────────────────────────────────

function majBoutons() {
  document.getElementById('btn-deplacer').disabled   = etape !== 'deplacement';
  document.getElementById('btn-attaquer').disabled   = etape !== 'action';
  document.getElementById('btn-defendre').disabled   = etape !== 'action';
  document.getElementById('btn-capturer').disabled   = etape !== 'action';
  document.getElementById('btn-passer-dep').disabled = etape !== 'deplacement';

  ['btn-deplacer', 'btn-attaquer', 'btn-defendre', 'btn-capturer'].forEach(id =>
    document.getElementById(id).classList.remove('btn-actif')
  );
  if (action === 'attaquer') document.getElementById('btn-attaquer').classList.add('btn-actif');
  if (action === 'capturer') document.getElementById('btn-capturer').classList.add('btn-actif');
}

// ── Interface de placement ─────────────────────────────────

function majInterfacePlacement() {
  const j     = joueurActif;
  const autre = j === 1 ? 2 : 1;

  document.getElementById('section-choix-j1').classList.toggle('section-inactive', j !== 1);
  document.getElementById('section-choix-j2').classList.toggle('section-inactive', j !== 2);
  document.getElementById(`msg-choix-j${j}`).textContent     = "Choisissez un type d'unité ↑";
  document.getElementById(`msg-choix-j${autre}`).textContent = 'En attente...';
  document.getElementById('affichage-tour').textContent  = `Placement ${unitesPlacees[1] + unitesPlacees[2] + 1}/10`;
  document.getElementById('affichage-phase').textContent = 'Phase : Placement';
  document.getElementById('statut-message').textContent  = `Joueur ${j} place son unité (${unitesPlacees[j]}/5)`;
  msg(`Joueur ${j} : choisissez un type d'unité, puis cliquez sur votre zone !`);
majBarreInfo(
  ICONES.vide,
  'Aucune unité',
  '—',
  'Sélectionnez une unité'
);
}

// ── Surbrillances sur la grille ────────────────────────────

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

// ── Jetons (pions sur la grille) ───────────────────────────

function creerJeton(joueur, type) {
  const jeton = document.createElement('div');
  jeton.className = `jeton jeton-j${joueur}`;

  const img = document.createElement('img');
  img.src = ICONES[type];
  img.className = 'unite-img';

  jeton.appendChild(img);

  return jeton;
}

function retirerJeton(ligne, col) {
  const jeton = getCase(ligne, col).querySelector('.jeton');
  if (jeton) jeton.remove();
}

// ── Accès aux cases DOM ────────────────────────────────────

function getCase(ligne, col) {
  return document.querySelector(`.case[data-ligne="${ligne}"][data-col="${col}"]`);
}

// ── Utilitaire : force réelle d'une unité ──────────────────

function forceReelle(unite) {
  return FORCE[unite.type] + (unite.bonusForce || 0);
}