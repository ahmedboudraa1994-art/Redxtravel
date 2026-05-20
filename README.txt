RED X TRAVEL ADMIN V5

Nouveautés:
- Dashboard /admin amélioré.
- Voir les demandes clients.
- Modifier statut: Nouveau, Contacté, Confirmé, Annulé.
- Supprimer les demandes traitées.
- Ajouter une offre avec photo via Firebase Storage.
- Supprimer une offre et son image Storage.
- Offres dynamiques depuis Firestore collection: offers.
- Demandes depuis Firestore collection: requests.

Important pour tester upload photo:
Storage > Règles doit autoriser temporairement:
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
Plus tard on sécurise avec Auth.
