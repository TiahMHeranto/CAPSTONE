-- Un seul compte au départ : l'administrateur predicare.
-- Les autres comptes se créent dans l'écran Utilisateurs.

DELETE FROM app.utilisateurs
WHERE identifiant IN ('prestataire', 'assure', 'gestionnaire', 'administrateur');

INSERT INTO app.utilisateurs (
    identifiant, mot_de_passe_hash, role, assure_id, prestataire_id, actif, email, is_deleted
)
VALUES (
    'predicare',
    'pbkdf2$200000$c81f21c7218b203fc4d8fd2bf76c94d5$f303ce7c6fd19c8a4064d0e966b0f914826cc9f69eff240a0383f662d9d7d082',
    'administrateur',
    NULL,
    NULL,
    true,
    'predicare@prediccare.mg',
    false
)
ON CONFLICT (identifiant) DO UPDATE SET
    mot_de_passe_hash = EXCLUDED.mot_de_passe_hash,
    role = EXCLUDED.role,
    assure_id = NULL,
    prestataire_id = NULL,
    actif = true,
    email = EXCLUDED.email,
    is_deleted = false;
