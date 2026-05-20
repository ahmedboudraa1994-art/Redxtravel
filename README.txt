RED X TRAVEL V16 - SEPARATED ADMIN

Nouveautés sécurité côté accès:
- /admin-login = page connexion seulement.
- /admin = dashboard seulement.
- Si /admin est ouvert sans session valide: redirection automatique vers /admin-login.
- Login réussi: redirection vers /admin.
- Déconnexion: session supprimée + accès sauvegardé supprimé + retour vers /admin-login.
- Le dashboard n’est plus sur la même page que le formulaire de connexion.

Important:
Cette version améliore fortement l’expérience et la séparation côté interface.
Pour une vraie sécurité complète, il faudra ensuite:
1. Firebase Authentication,
2. règles Firestore/Storage avec request.auth,
3. ne plus stocker le mot de passe admin dans le frontend.
