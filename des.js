const diceJ1 = document.querySelector('#dice-j1');
const diceJ2 = document.querySelector('#dice-j2');

let valeurJ1 = null;
let valeurJ2 = null;

function lancerDe(joueur) {

    // empêcher de relancer
    document.getElementById(`btn-j${joueur}`).disabled = true;

    const random = Math.floor(Math.random() * 6) + 1;

    const dice =
        joueur === 1 ? diceJ1 : diceJ2;

    rollDice(dice, random);

    // attendre la fin animation
    setTimeout(() => {

        if (joueur === 1) {

            valeurJ1 = random;

            document.getElementById('chiffre-j1')
                .textContent = random;
        }

        else {

            valeurJ2 = random;

            document.getElementById('chiffre-j2')
                .textContent = random;
        }

        verifierGagnant();

    }, 1500);
}

function rollDice(dice, random) {

    dice.style.animation = 'rolling 1.5s';

    setTimeout(() => {

        switch (random) {

            case 1:
                dice.style.transform =
                    'rotateX(0deg) rotateY(0deg)';
                break;

            case 2:
                dice.style.transform =
                    'rotateX(-90deg) rotateY(0deg)';
                break;

            case 3:
                dice.style.transform =
                    'rotateX(0deg) rotateY(90deg)';
                break;

            case 4:
                dice.style.transform =
                    'rotateX(0deg) rotateY(-90deg)';
                break;

            case 5:
                dice.style.transform =
                    'rotateX(90deg) rotateY(0deg)';
                break;

            case 6:
                dice.style.transform =
                    'rotateX(180deg) rotateY(0deg)';
                break;
        }

        dice.style.animation = 'none';

    }, 1500);
}

function verifierGagnant() {

    // attendre les 2 joueurs
    if (valeurJ1 === null || valeurJ2 === null)
        return;

    const resultat =
        document.getElementById('modal-resultat');

    // =====================================
    // JOUEUR 1 GAGNE
    // =====================================

    if (valeurJ1 > valeurJ2) {

        resultat.textContent =
            '👑 Joueur 1 commence !';

        setTimeout(() => {

            document.getElementById('modal-de')
                .style.display = 'none';

            demarrerPlacement(1);

        }, 1800);
    }

    // =====================================
    // JOUEUR 2 GAGNE
    // =====================================

    else if (valeurJ2 > valeurJ1) {

        resultat.textContent =
            '👑 Joueur 2 commence !';

        setTimeout(() => {

            document.getElementById('modal-de')
                .style.display = 'none';

            demarrerPlacement(2);

        }, 1800);
    }

    // =====================================
    // EGALITE
    // =====================================

    else {

        resultat.textContent =
            '⚔ Egalité ! Relancez !';

        valeurJ1 = null;
        valeurJ2 = null;

        setTimeout(() => {

            // réactiver boutons
            document.getElementById('btn-j1')
                .disabled = false;

            document.getElementById('btn-j2')
                .disabled = false;

            // reset affichage
            document.getElementById('chiffre-j1')
                .textContent = '?';

            document.getElementById('chiffre-j2')
                .textContent = '?';

        }, 1500);
    }
}