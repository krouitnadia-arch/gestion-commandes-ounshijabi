# Gestion des commandes — Ounshijabi

Application web bilingue (français / arabe classique) pour gérer les commandes reçues sur **ounshijabi.com** (WooCommerce) : confirmation par WhatsApp, suivi des statuts, expédition (Sendit), et gestion du stock.

## Fonctionnalités

- Récupération automatique des commandes depuis le site WooCommerce (bouton "Synchroniser").
- Fiche complète du client pour chaque commande (nom, téléphone, adresse, produits, total).
- Clic sur le téléphone → ouverture directe de WhatsApp (wa.me), le statut passe automatiquement à **"Appelé"**.
- Changement manuel du statut : Nouvelle, Appelé, **Confirmée**, Annulée, Reportée, À récupérer au magasin — chaque statut a sa couleur.
- Onglet **Expédition** : affiche uniquement les commandes confirmées, avec une case "Saisie sur Sendit" (oui/non).
- Onglet **Stock** : ajout/modification/suppression de produits, quantités, alerte de stock faible.
- Onglet **Utilisateurs** (admin uniquement) : créer des comptes pour votre équipe avec un rôle (confirmation, expédition, stock, admin).
- Interface bilingue FR / عربي, avec bascule RTL automatique pour l'arabe.

## 1. Prérequis

- Un compte gratuit [Vercel](https://vercel.com) (hébergement de l'application).
- Une base de données PostgreSQL gratuite, par exemple [Neon](https://neon.tech) ou [Supabase](https://supabase.com).
- Les clés API WooCommerce de ounshijabi.com (voir ci-dessous).
- Node.js installé si vous voulez tester en local (facultatif).

## 2. Obtenir les clés API WooCommerce

Ces clés permettent à l'application de lire les commandes de votre site, sans jamais toucher à votre mot de passe WordPress.

1. Connectez-vous à l'administration de votre site : `https://ounshijabi.com/wp-admin`
2. Allez dans **WooCommerce → Réglages → Avancé → REST API** (ou **API** selon la version).
3. Cliquez sur **Ajouter une clé** / **Add key**.
4. Description : `Application gestion commandes`. Permissions : **Lecture/Écriture (Read/Write)**.
5. Cliquez sur **Générer la clé API**.
6. Copiez immédiatement la **Consumer Key** (commence par `ck_...`) et la **Consumer Secret** (commence par `cs_...`) — le secret ne s'affiche qu'une seule fois.
7. Avant de générer la clé, vérifiez que les permaliens sont activés : **Réglages → Permaliens**, choisissez une option autre que "Simple".

Gardez ces deux valeurs de côté, vous les collerez dans les variables d'environnement (étape 4).

## 3. Livraison (Sendit)

Le statut de livraison Sendit est géré manuellement dans l'onglet **Expédition** : un simple bouton "Saisie / Non saisie" à cocher une fois que la commande a été créée sur `app.sendit.ma` (ou via votre extension WooCommerce Sendit existante). Aucune clé Sendit n'est nécessaire pour cette application.

## 4. Variables d'environnement

Copiez `.env.example` en `.env` et remplissez :

```
DATABASE_URL="postgresql://..."          # fournie par Neon/Supabase
SESSION_SECRET="une-longue-chaine-aleatoire"
WOOCOMMERCE_URL="https://ounshijabi.com"
WOOCOMMERCE_CONSUMER_KEY="ck_..."
WOOCOMMERCE_CONSUMER_SECRET="cs_..."
```

Générez une valeur aléatoire pour `SESSION_SECRET` (par exemple sur https://generate-secret.vercel.app/32).

## 5. Installation locale (facultatif, pour tester avant de mettre en ligne)

```bash
npm install
npm run db:push       # crée les tables dans la base de données
npm run db:seed       # crée un compte administrateur de départ
npm run dev            # lance l'application sur http://localhost:3000
```

Compte admin créé par défaut :
- E-mail : `admin@ounshijabi.com`
- Mot de passe : `admin1234`

**Changez ce mot de passe dès la première connexion**, ou créez votre propre compte admin dans l'onglet Utilisateurs puis supprimez/désactivez celui-ci.

Pour le numéro WhatsApp, l'indicatif pays par défaut est **+212 (Maroc)** dans `lib/whatsapp.ts`. Modifiez `defaultCountryCode` si besoin.

## 6. Mise en ligne sur Vercel

1. Créez un dépôt GitHub avec ce projet (ou importez le dossier directement dans Vercel).
2. Sur [vercel.com](https://vercel.com), cliquez sur **Add New → Project**, sélectionnez votre dépôt.
3. Dans **Environment Variables**, ajoutez les 5 variables listées à l'étape 4.
4. Cliquez sur **Deploy**.
5. Une fois déployé, exécutez la création des tables et le compte admin une seule fois, depuis votre machine, en pointant vers la base de données de production :

```bash
DATABASE_URL="votre-url-de-production" npm run db:push
DATABASE_URL="votre-url-de-production" npm run db:seed
```

Votre application est alors accessible à l'URL fournie par Vercel (vous pouvez ensuite y relier un nom de domaine personnalisé dans les réglages Vercel).

## 7. Utilisation quotidienne

1. L'équipe de confirmation se connecte, va dans **Commandes**, clique sur **Synchroniser** pour récupérer les nouvelles commandes du site.
2. Elle clique sur le téléphone d'un client → WhatsApp s'ouvre, le statut passe à "Appelé".
3. Après l'appel, elle choisit le statut final : Confirmée / Annulée / Reportée / À récupérer au magasin.
4. Les commandes **Confirmée** apparaissent automatiquement dans l'onglet **Expédition** pour l'équipe logistique, qui coche "Saisie sur Sendit" une fois fait.
5. L'onglet **Stock** est mis à jour librement par l'équipe concernée.

## Structure du projet

```
app/            pages et routes API (Next.js App Router)
components/     composants d'interface (React)
lib/            logique métier (base de données, WooCommerce, sessions, traductions)
prisma/         schéma de base de données et script de création du compte admin
```

## Remarque sur la vérification

Ce code a été construit et relu avec soin, mais n'a pas pu être compilé dans cet environnement (accès au registre npm bloqué ici). Lancez `npm install && npm run build` en local ou laissez Vercel le faire automatiquement au déploiement — je reste disponible pour corriger toute erreur qui apparaîtrait à cette étape.
