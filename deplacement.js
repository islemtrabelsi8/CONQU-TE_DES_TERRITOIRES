// ================================================
// PHASE 3 : DÉPLACEMENT & COMBAT
// ================================================

// --- Règles des unités ---
const REGLES_UNITES = {
    soldat: { force: 2, deplacement: 1, eau: false, montagne: false },
    cavalier: { force: 1, deplacement: 2, eau: false, montagne: true },
    tank: { force: 3, deplacement: 1, eau: false, montagne: false }
};

// État étendu pour la phase de jeu
Object.assign(etat, {
    uniteSelectionnee: null,   // { ligne, col, type, joueur, el }
    casesAccessibles: [],
    scoreJ1: 0,
    scoreJ2: 0,
    unitesJ1: 5,
    unitesJ2: 5,
    deplacementsRestants: 1    // chaque joueur déplace 1 unité par tour
});

// ------------------------------------------------
// DÉMARRAGE de la phase de jeu (appelé depuis terminerPlacement)
// ------------------------------------------------
function demarrerPhaseCombat() {
    etat.phase = 'jeu';
    etat.tourActuel = etat.tourActuel; // conserve le joueur qui avait commencé

    afficherScores();
    mettreAJourBarreJeu();
    afficherBoutonFinTour();

    document.getElementById('affichage-phase').textContent = 'Phase : Combat';
    document.getElementById('statut-message').textContent =
        `Joueur ${etat.tourActuel} — sélectionnez une unité à déplacer`;
    document.getElementById('instructions').textContent =
        `Joueur ${etat.tourActuel} : cliquez sur l'une de vos unités (🪖 🐴 🛡️) pour la sélectionner.`;

    // Rebrancher TOUTES les cases (y compris neutres sans data-attributs)
    const toutesLesLignes = document.querySelectorAll('.ligne-grille');
    toutesLesLignes.forEach((ligneEl, li) => {
        const cases = ligneEl.querySelectorAll('.case');
        cases.forEach((caseEl, ci) => {
            // Assigner data-attributs si absents (cases neutres)
            if (!caseEl.dataset.ligne) caseEl.dataset.ligne = li;
            if (!caseEl.dataset.col) caseEl.dataset.col = ci;
            caseEl.onclick = () => gererClicCaseJeu(li, ci);
        });
    });

    ajouterHistorique(`=== Phase de combat — Joueur ${etat.tourActuel} commence ===`);
}

// ------------------------------------------------
// GESTION DU CLIC SUR UNE CASE (phase jeu)
// ------------------------------------------------
function gererClicCaseJeu(ligne, col) {
    if (etat.phase !== 'jeu') return;

    const caseEl = document.querySelector(`.case[data-ligne="${ligne}"][data-col="${col}"]`);
    if (!caseEl) return;

    const jeton = caseEl.querySelector('.jeton');

    // --- Cas 1 : aucune unité sélectionnée → tenter de sélectionner ---
    if (!etat.uniteSelectionnee) {
        if (!jeton) return; // case vide, rien à faire

        const joueurJeton = jeton.classList.contains('jeton-j1') ? 1 : 2;
        if (joueurJeton !== etat.tourActuel) {
            flash('instructions', `Ce n'est pas votre unité ! C'est le tour du Joueur ${etat.tourActuel}.`);
            return;
        }

        selectionnerUnite(ligne, col);
        return;
    }

    // --- Cas 2 : une unité est déjà sélectionnée ---
    const sel = etat.uniteSelectionnee;

    // Re-clic sur la même case → désélection
    if (sel.ligne === ligne && sel.col === col) {
        deselectionnerUnite();
        return;
    }

    // Re-clic sur une autre de ses propres unités → changer la sélection
    if (jeton && jeton.classList.contains(`jeton-j${etat.tourActuel}`)) {
        deselectionnerUnite();
        selectionnerUnite(ligne, col);
        return;
    }

    // Vérifier si la case est accessible
    const accessible = etat.casesAccessibles.find(c => c.ligne === ligne && c.col === col);
    if (!accessible) {
        flash('instructions', 'Case inaccessible ! Choisissez une case surlignée.');
        return;
    }

    // --- Mouvement ou attaque ---
    if (jeton && jeton.classList.contains(`jeton-j${etat.tourActuel === 1 ? 2 : 1}`)) {
        // Case occupée par l'ennemi → COMBAT
        resoudreCombat(sel, ligne, col);
    } else {
        // Case libre → DÉPLACEMENT
        deplacerUnite(sel, ligne, col);
    }
}

// ------------------------------------------------
// SÉLECTION D'UNE UNITÉ
// ------------------------------------------------
function selectionnerUnite(ligne, col) {
    const caseEl = document.querySelector(`.case[data-ligne="${ligne}"][data-col="${col}"]`);
    const jeton = caseEl.querySelector('.jeton');
    if (!jeton) return;

    const type = obtenirTypeJeton(jeton);

    etat.uniteSelectionnee = { ligne, col, type, joueur: etat.tourActuel, el: jeton };

    // Surligner la case sélectionnée
    caseEl.classList.add('case-selectionnee');
    jeton.classList.add('jeton-selectionne');

    // Calculer et afficher les cases accessibles
    etat.casesAccessibles = calculerCasesAccessibles(ligne, col, type, etat.tourActuel);
    etat.casesAccessibles.forEach(({ ligne: l, col: c, type: typeMvt }) => {
        const el = document.querySelector(`.case[data-ligne="${l}"][data-col="${c}"]`);
        if (el) {
            el.classList.add(typeMvt === 'attaque' ? 'case-attaque' : 'case-accessible');
        }
    });

    // Barre du bas
    document.getElementById('sel-icone').textContent = ICONES[type];
    document.getElementById('sel-nom').textContent = NOMS[type];
    document.getElementById('sel-joueur').textContent = `Joueur ${etat.tourActuel}`;
    document.getElementById('sel-statut').textContent = `Sélectionnée en (${ligne},${col})`;

    const nbMvt = etat.casesAccessibles.filter(c => c.type === 'mouvement').length;
    const nbAtk = etat.casesAccessibles.filter(c => c.type === 'attaque').length;
    document.getElementById('instructions').textContent =
        `${ICONES[type]} sélectionné — ${nbMvt} case(s) de mouvement, ${nbAtk} attaque(s) possible(s). Cliquez sur une case surlignée.`;

    ajouterHistorique(`J${etat.tourActuel} sélectionne ${NOMS[type]} en (${ligne},${col})`);
}

// ------------------------------------------------
// DÉSÉLECTION
// ------------------------------------------------
function deselectionnerUnite() {
    if (!etat.uniteSelectionnee) return;
    const { ligne, col } = etat.uniteSelectionnee;

    const caseEl = document.querySelector(`.case[data-ligne="${ligne}"][data-col="${col}"]`);
    if (caseEl) {
        caseEl.classList.remove('case-selectionnee');
        const jeton = caseEl.querySelector('.jeton');
        if (jeton) jeton.classList.remove('jeton-selectionne');
    }

    effacerSurlignage();
    etat.uniteSelectionnee = null;
    etat.casesAccessibles = [];

    document.getElementById('sel-icone').textContent = '❓';
    document.getElementById('sel-nom').textContent = 'Aucune';
    document.getElementById('sel-joueur').textContent = `Joueur ${etat.tourActuel}`;
    document.getElementById('sel-statut').textContent = 'Sélectionnez une unité';
    document.getElementById('instructions').textContent =
        `Joueur ${etat.tourActuel} : cliquez sur l'une de vos unités pour la sélectionner.`;
}

function effacerSurlignage() {
    document.querySelectorAll('.case-accessible, .case-attaque').forEach(el => {
        el.classList.remove('case-accessible', 'case-attaque');
    });
}

// ------------------------------------------------
// OBTENIR L'ÉLÉMENT D'UNE CASE PAR POSITION (grille 8x8)
// Fonctionne que la case ait data-ligne/data-col ou non
// ------------------------------------------------
function getCaseEl(ligne, col) {
    // Après demarrerPhaseCombat, toutes les cases ont data-ligne/data-col
    return document.querySelector(`.case[data-ligne="${ligne}"][data-col="${col}"]`) || null;
}

// ------------------------------------------------
// CALCUL DES CASES ACCESSIBLES
// ------------------------------------------------
function calculerCasesAccessibles(ligne, col, type, joueur) {
    const regles = REGLES_UNITES[type];
    const distance = regles.deplacement;
    const cases = [];

    // BFS / expansion selon la distance
    const visites = new Set();
    const file = [{ l: ligne, c: col, dist: 0 }];
    visites.add(`${ligne},${col}`);

    while (file.length) {
        const { l, c, dist } = file.shift();

        const voisins = [
            { l: l - 1, c },
            { l: l + 1, c },
            { l, c: c - 1 },
            { l, c: c + 1 }
        ];

        for (const { l: nl, c: nc } of voisins) {
            if (nl < 0 || nl > 7 || nc < 0 || nc > 7) continue;
            const cle = `${nl},${nc}`;
            if (visites.has(cle)) continue;

            const caseEl = getCaseEl(nl, nc);
            const typeCase = obtenirTypeCaseEl(caseEl);

            // Terrain bloquant
            if (typeCase === 'eau') continue;
            if (typeCase === 'montagne' && !regles.montagne) continue;

            const jeton = caseEl ? caseEl.querySelector('.jeton') : null;

            if (jeton) {
                // Unité amie → bloque le passage
                if (jeton.classList.contains(`jeton-j${joueur}`)) {
                    visites.add(cle);
                    continue;
                }
                // Unité ennemie → attaquable (on ne passe pas au-delà)
                cases.push({ ligne: nl, col: nc, type: 'attaque' });
                visites.add(cle);
                continue;
            }

            // Case libre accessible
            if (dist + 1 <= distance) {
                cases.push({ ligne: nl, col: nc, type: 'mouvement' });
                if (dist + 1 < distance) {
                    file.push({ l: nl, c: nc, dist: dist + 1 });
                }
                visites.add(cle);
            }
        }
    }

    return cases;
}

// ------------------------------------------------
// DÉPLACER UNE UNITÉ
// ------------------------------------------------
function deplacerUnite(sel, nouvLigne, nouvCol) {
    const ancCaseEl = getCaseEl(sel.ligne, sel.col);
    const nouvCaseEl = getCaseEl(nouvLigne, nouvCol);

    if (!ancCaseEl || !nouvCaseEl) return;

    const jeton = ancCaseEl.querySelector('.jeton');
    if (!jeton) return;

    // Vérifier effet piège
    const typeCase = obtenirTypeCaseEl(nouvCaseEl);
    if (typeCase === 'piege') {
        // L'unité perd un tour (retirer le jeton)
        ancCaseEl.removeChild(jeton);
        ancCaseEl.classList.remove('case-occupee', 'case-selectionnee');
        nouvCaseEl.classList.add('case-occupee');

        // Animer la destruction
        jeton.classList.add('jeton-detruit');
        nouvCaseEl.appendChild(jeton);
        setTimeout(() => {
            nouvCaseEl.removeChild(jeton);
            nouvCaseEl.classList.remove('case-occupee');
        }, 600);

        ajouterHistorique(`⚙ PIÈGE ! ${NOMS[sel.type]} du J${sel.joueur} en (${sel.ligne},${sel.col}) est détruit !`);
        mettreAJourCompteurUnite(sel.joueur, -1);
        verifierFinDePartie();

    } else {
        // Déplacement normal
        ancCaseEl.removeChild(jeton);
        ancCaseEl.classList.remove('case-occupee', 'case-selectionnee');
        jeton.classList.remove('jeton-selectionne');

        nouvCaseEl.appendChild(jeton);
        nouvCaseEl.classList.add('case-occupee');

        ajouterHistorique(`J${sel.joueur} déplace ${NOMS[sel.type]} : (${sel.ligne},${sel.col}) → (${nouvLigne},${nouvCol})${typeCase === 'bonus-attaque' ? ' ⚔+1' : typeCase === 'bonus-defense' ? ' 🛡+1' : ''}`);
    }

    deselectionnerUnite();
    effacerSurlignage();
    etat.uniteSelectionnee = null;
    etat.casesAccessibles = [];

    passerAuTourSuivant();
}

// ------------------------------------------------
// RÉSOUDRE UN COMBAT
// ------------------------------------------------
function resoudreCombat(attaquant, defLigne, defCol) {
    const defCaseEl = getCaseEl(defLigne, defCol);
    const jetonDef = defCaseEl ? defCaseEl.querySelector('.jeton') : null;
    if (!jetonDef) return;

    const typeAtt = attaquant.type;
    const typeDef = obtenirTypeJeton(jetonDef);
    const joueurDef = attaquant.joueur === 1 ? 2 : 1;

    const attCaseEl = getCaseEl(attaquant.ligne, attaquant.col);
    const typeCase = obtenirTypeCaseEl(defCaseEl);
    const caseCaseAtt = obtenirTypeCaseEl(attCaseEl);
    let forceAtt = REGLES_UNITES[typeAtt].force;
    let forceDef = REGLES_UNITES[typeDef].force;

    if (caseCaseAtt === 'bonus-attaque') forceAtt += 1;
    if (typeCase === 'bonus-defense') forceDef += 1;
    if (typeCase === 'montagne') forceDef += 1;

    const deAtt = Math.floor(Math.random() * 6) + 1;
    const deDef = Math.floor(Math.random() * 6) + 1;
    const totalAtt = forceAtt + deAtt;
    const totalDef = forceDef + deDef;

    const jetonAtt = attCaseEl ? attCaseEl.querySelector('.jeton') : null;

    let resultat;

    if (totalAtt > totalDef) {
        // Attaquant gagne
        resultat = `J${attaquant.joueur} GAGNE (${totalAtt} vs ${totalDef})`;
        detruireJeton(defCaseEl, jetonDef);
        mettreAJourCompteurUnite(joueurDef, -1);

        // L'attaquant avance sur la case
        if (attCaseEl && jetonAtt) {
            attCaseEl.removeChild(jetonAtt);
            attCaseEl.classList.remove('case-occupee', 'case-selectionnee');
            jetonAtt.classList.remove('jeton-selectionne');
            defCaseEl.appendChild(jetonAtt);
            defCaseEl.classList.add('case-occupee');
        }

    } else if (totalDef > totalAtt) {
        // Défenseur gagne
        resultat = `J${joueurDef} DÉFEND (${totalDef} vs ${totalAtt})`;
        detruireJeton(attCaseEl, jetonAtt);
        mettreAJourCompteurUnite(attaquant.joueur, -1);

    } else {
        // Égalité → les deux meurent
        resultat = `ÉGALITÉ — les deux unités sont détruites (${totalAtt} = ${totalDef})`;
        detruireJeton(attCaseEl, jetonAtt);
        detruireJeton(defCaseEl, jetonDef);
        mettreAJourCompteurUnite(attaquant.joueur, -1);
        mettreAJourCompteurUnite(joueurDef, -1);
    }

    ajouterHistorique(
        `⚔ COMBAT : J${attaquant.joueur} ${NOMS[typeAtt]}(${forceAtt}+🎲${deAtt}) vs J${joueurDef} ${NOMS[typeDef]}(${forceDef}+🎲${deDef}) — ${resultat}`
    );

    afficherNotifCombat(resultat, attaquant.joueur);
    deselectionnerUnite();
    effacerSurlignage();
    etat.uniteSelectionnee = null;
    etat.casesAccessibles = [];

    if (!verifierFinDePartie()) {
        passerAuTourSuivant();
    }
}

// ------------------------------------------------
// DESTRUCTION D'UN JETON (animation)
// ------------------------------------------------
function detruireJeton(caseEl, jeton) {
    if (!caseEl || !jeton) return;
    jeton.classList.add('jeton-detruit');
    setTimeout(() => {
        if (jeton.parentNode === caseEl) caseEl.removeChild(jeton);
        caseEl.classList.remove('case-occupee');
    }, 500);
}

// ------------------------------------------------
// PASSER AU TOUR SUIVANT
// ------------------------------------------------
function passerAuTourSuivant() {
    etat.tourActuel = etat.tourActuel === 1 ? 2 : 1;
    const joueur = etat.tourActuel;

    document.getElementById('affichage-tour').textContent =
        `Tour ${++etat.numeroTour || (etat.numeroTour = 2)}`;
    document.getElementById('statut-message').textContent =
        `Joueur ${joueur} — sélectionnez une unité à déplacer`;
    document.getElementById('instructions').textContent =
        `Joueur ${joueur} : cliquez sur l'une de vos unités pour la sélectionner.`;

    document.getElementById('sel-icone').textContent = '❓';
    document.getElementById('sel-nom').textContent = 'Aucune';
    document.getElementById('sel-joueur').textContent = `Joueur ${joueur}`;
    document.getElementById('sel-statut').textContent = 'À vous de jouer';

    mettreAJourBarreJeu();
    ajouterHistorique(`--- Tour du Joueur ${joueur} ---`);
}

// ------------------------------------------------
// VÉRIFIER LA FIN DE PARTIE
// ------------------------------------------------
function verifierFinDePartie() {
    // Compter les unités restantes
    const unitesJ1 = document.querySelectorAll('.jeton-j1').length;
    const unitesJ2 = document.querySelectorAll('.jeton-j2').length;

    etat.unitesJ1 = unitesJ1;
    etat.unitesJ2 = unitesJ2;
    afficherScores();

    if (unitesJ1 === 0 || unitesJ2 === 0) {
        const gagnant = unitesJ1 === 0 ? 2 : 1;
        setTimeout(() => afficherFinDePartie(gagnant), 600);
        return true;
    }
    return false;
}

function afficherFinDePartie(gagnant) {
    // Créer l'overlay de fin
    let overlay = document.getElementById('overlay-fin');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'overlay-fin';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
    <div class="modal-boite fin-partie-boite">
      <div class="fin-couronne">${gagnant === 1 ? '👑' : '🏆'}</div>
      <h2 class="modal-titre fin-titre">VICTOIRE !</h2>
      <p class="fin-vainqueur">Joueur ${gagnant} remporte la conquête !</p>
      <div class="fin-stats">
        <div class="fin-stat fin-stat-j${gagnant === 1 ? 1 : 2}">
          <span>Joueur 1</span>
          <span class="fin-unites">${document.querySelectorAll('.jeton-j1').length} unité(s)</span>
        </div>
        <div class="fin-stat fin-stat-j${gagnant === 1 ? 2 : 1}">
          <span>Joueur 2</span>
          <span class="fin-unites">${document.querySelectorAll('.jeton-j2').length} unité(s)</span>
        </div>
      </div>
      <button class="bouton-lancer" onclick="location.reload()">🔄 Nouvelle partie</button>
    </div>
  `;
    overlay.style.display = 'flex';
    ajouterHistorique(`🏆 FIN DE PARTIE — Joueur ${gagnant} VAINQUEUR !`);
}

// ------------------------------------------------
// UTILITAIRES
// ------------------------------------------------

function obtenirTypeJeton(jeton) {
    const texte = jeton.textContent.trim();
    if (texte === '🪖') return 'soldat';
    if (texte === '🐴') return 'cavalier';
    if (texte === '🛡️') return 'tank';
    return 'soldat';
}

// Prend directement un élément DOM
function obtenirTypeCaseEl(caseEl) {
    if (!caseEl) return 'neutre';
    if (caseEl.classList.contains('montagne')) return 'montagne';
    if (caseEl.classList.contains('eau')) return 'eau';
    if (caseEl.classList.contains('piege')) return 'piege';
    if (caseEl.classList.contains('bonus-attaque')) return 'bonus-attaque';
    if (caseEl.classList.contains('bonus-defense')) return 'bonus-defense';
    return 'neutre';
}

// Compatibilité par coordonnées
function obtenirTypeCase(ligne, col) {
    return obtenirTypeCaseEl(getCaseEl(ligne, col));
}

function mettreAJourCompteurUnite(joueur, delta) {
    // Mise à jour visuelle des stats (recalcul depuis le DOM)
    const unites = document.querySelectorAll(`.jeton-j${joueur}`).length + delta;
    // Les compteurs seront mis à jour via verifierFinDePartie qui recompte depuis le DOM
}

function afficherScores() {
    // Afficher dans le statut
    const j1 = document.querySelectorAll('.jeton-j1').length;
    const j2 = document.querySelectorAll('.jeton-j2').length;
    document.getElementById('stat-placees-j1').textContent = j1;
    document.getElementById('stat-restantes-j1').textContent = j1;
    document.getElementById('stat-placees-j2').textContent = j2;
    document.getElementById('stat-restantes-j2').textContent = j2;
}

function mettreAJourBarreJeu() {
    const joueur = etat.tourActuel;
    document.getElementById('affichage-tour').textContent =
        document.getElementById('affichage-tour').textContent || 'Tour 1';
}

function flash(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.style.color = '#e07070';
    setTimeout(() => { el.style.color = ''; }, 1500);
}

function afficherNotifCombat(resultat, joueurAtk) {
    const notif = document.createElement('div');
    notif.className = 'notif-combat';
    notif.textContent = `⚔ ${resultat}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

function afficherBoutonFinTour() {
    // Optionnel : bouton "Passer mon tour" dans la barre du bas
    const actions = document.getElementById('instructions');
    if (!document.getElementById('btn-passer-tour')) {
        const btn = document.createElement('button');
        btn.id = 'btn-passer-tour';
        btn.className = 'bouton-passer-tour';
        btn.textContent = '⏭ Passer le tour';
        btn.onclick = () => {
            if (etat.phase !== 'jeu') return;
            deselectionnerUnite();
            ajouterHistorique(`J${etat.tourActuel} passe son tour`);
            passerAuTourSuivant();
        };
        actions.parentNode.appendChild(btn);
    }
}

// ------------------------------------------------
// PATCH : remplacer terminerPlacement pour enchaîner
// ------------------------------------------------
function terminerPlacement() {
    ajouterHistorique('=== Placement terminé — Phase de combat ===');
    document.getElementById('section-choix-j1').classList.add('section-inactive');
    document.getElementById('section-choix-j2').classList.add('section-inactive');
    demarrerPhaseCombat();
}