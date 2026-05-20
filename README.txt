RED X TRAVEL ADMIN V7 - OFFER ORDER

Nouveautés:
- Ajouter une offre avec photo.
- Choisir la position d’affichage: 1 = première, 2 = deuxième, etc.
- Les offres sont triées automatiquement par position.
- Supprimer les anciennes offres uploadées.
- Quand aucune offre dynamique n’existe, les offres de démonstration restent affichées.
- Dès qu’au moins une offre est ajoutée dans admin, le site utilise les offres dynamiques.

Important Storage rules pour test:
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}

Plus tard on sécurise avec Auth.
