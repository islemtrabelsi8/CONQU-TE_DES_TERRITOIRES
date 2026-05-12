const diceJ1 = document.querySelector('#dice-j1');
const diceJ2 = document.querySelector('#dice-j2');
const diceCombatAtt = document.querySelector('#dice-combat-att');
const diceCombatDef = document.querySelector('#dice-combat-def');

let valeurJ1 = null;
let valeurJ2 = null;

function lancerDe(joueur) {
    document.getElementById(`btn-j${joueur}`).disabled = true;
    const random = Math.floor(Math.random() * 6) + 1;
    const dice = joueur === 1 ? diceJ1 : diceJ2;
    rollDice(dice, random);
    setTimeout(() => {
        if (joueur === 1) { valeurJ1 = random; document.getElementById('chiffre-j1').textContent = random; }
        else              { valeurJ2 = random; document.getElementById('chiffre-j2').textContent = random; }
        verifierGagnant();
    }, 1500);
}

function rollDice(dice, random) {
    dice.style.animation = 'rolling 1.5s';
    setTimeout(() => {
        switch (random) {
            case 1: dice.style.transform = 'rotateX(0deg) rotateY(0deg)';   break;
            case 2: dice.style.transform = 'rotateX(-90deg) rotateY(0deg)'; break;
            case 3: dice.style.transform = 'rotateX(0deg) rotateY(90deg)';  break;
            case 4: dice.style.transform = 'rotateX(0deg) rotateY(-90deg)'; break;
            case 5: dice.style.transform = 'rotateX(90deg) rotateY(0deg)';  break;
            case 6: dice.style.transform = 'rotateX(180deg) rotateY(0deg)'; break;
        }
        dice.style.animation = 'none';
    }, 1500);
}

function verifierGagnant() {
    if (valeurJ1 === null || valeurJ2 === null) return;
    const resultat = document.getElementById('modal-resultat');
    if (valeurJ1 > valeurJ2) {
        resultat.textContent = '👑 Joueur 1 commence !';
        setTimeout(() => { document.getElementById('modal-de').style.display = 'none'; demarrerPlacement(1); }, 1800);
    } else if (valeurJ2 > valeurJ1) {
        resultat.textContent = '👑 Joueur 2 commence !';
        setTimeout(() => { document.getElementById('modal-de').style.display = 'none'; demarrerPlacement(2); }, 1800);
    } else {
        resultat.textContent = 'Egalité ! Relancez !';
        valeurJ1 = null;
        valeurJ2 = null;
        setTimeout(() => {
            document.getElementById('btn-j1').disabled = false;
            document.getElementById('btn-j2').disabled = false;
            document.getElementById('chiffre-j1').textContent = '?';
            document.getElementById('chiffre-j2').textContent = '?';
        }, 1500);
    }
}

function lancerCombat() {
    if (!combatInfo) return;
    document.getElementById('btn-combat-lancer').disabled = true;

    const { posAtt, posDef, uniteAtt, uniteDef } = combatInfo;
    const attaquant = joueurActif;

    const deAtt = Math.floor(Math.random() * 6) + 1;
    const deDef = Math.floor(Math.random() * 6) + 1;
    const forceAtt = forceReelle(uniteAtt) + deAtt;
    const forceDef = forceReelle(uniteDef) + deDef;

    rollDice(diceCombatAtt, deAtt);
    rollDice(diceCombatDef, deDef);

    setTimeout(() => {
        document.getElementById('chiffre-combat-att').textContent = deAtt;
        document.getElementById('chiffre-combat-def').textContent = deDef;

        const resultatEl = document.getElementById('combat-resultat');
        const ennemi = joueurActif === 1 ? 2 : 1;

        if (forceAtt > forceDef) {
            resultatEl.textContent = `⚔ Joueur ${joueurActif} gagne ! (${forceAtt} > ${forceDef})`;
            setTimeout(() => {
                document.getElementById('modal-combat').style.display = 'none';
                appliquerVictoireCombat(posAtt, posDef, uniteAtt, uniteDef);
                combatInfo = null;
            }, 1500);

        } else if (forceDef > forceAtt) {
            resultatEl.textContent = `🛡 Joueur ${ennemi} repousse ! (${forceDef} > ${forceAtt})`;
            setTimeout(() => {
                document.getElementById('modal-combat').style.display = 'none';
                effacerSurbrillances();
                combatInfo = null;
                finDeTourJoueur();
            }, 1500);

        } else {
            resultatEl.textContent = `Égalité ! Les deux unités sont détruites !`;
            setTimeout(() => {
                document.getElementById('modal-combat').style.display = 'none';
                retirerJeton(posAtt.ligne, posAtt.col);
                grille[posAtt.ligne][posAtt.col].unite = null;
                retirerJeton(posDef.ligne, posDef.col);
                grille[posDef.ligne][posDef.col].unite = null;
                effacerSurbrillances();
                combatInfo = null;
                finDeTourJoueur();
            }, 1500);
        }

    }, 1500);
}