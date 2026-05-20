RED X TRAVEL V17 - LOGOUT FIXED

Correction:
- Déconnexion admin corrigée avec handler global robuste.
- Clic/tap iPhone capté même si d'autres scripts bloquent.
- Supprime session admin + accès sauvegardé.
- Redirection forcée vers /admin-login.

Tester:
1. Ouvrir /admin
2. Cliquer Déconnexion
3. Doit retourner directement vers /admin-login
4. Réouvrir /admin doit renvoyer vers /admin-login si non connecté
