RED X TRAVEL ADMIN V8 - OFFRES 100% DYNAMIQUES

Changement important:
- Les anciennes offres statiques ne s’affichent plus sur le site.
- Le slider public affiche uniquement les offres ajoutées depuis /admin.
- L’admin peut ajouter, classer et supprimer toutes les offres visibles.
- Si aucune offre n’est publiée, le site affiche un message propre “Offres en préparation”.

Dans /admin:
- Ajouter une offre avec photo.
- Choisir la position: 1 = première, 2 = deuxième, etc.
- Supprimer n’importe quelle offre publiée depuis admin.

Important pour tester upload photo:
Storage > Règles temporairement:
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}

Plus tard on sécurise avec Auth.
