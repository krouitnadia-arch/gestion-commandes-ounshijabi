import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const maintenant = Date.now();
  const jour = new Date(maintenant - 24 * 60 * 60 * 1000);
  const semaine = new Date(maintenant - 7 * 24 * 60 * 60 * 1000);
  const mois = new Date(maintenant - 30 * 24 * 60 * 60 * 1000);

  const commandes = await prisma.order.findMany({
    where: { dateCommande: { gte: mois } },
    select: {
      total: true,
      fraisLivraison: true,
      statut: true,
      dateCommande: true,
      wooId: true,
    },
  });

  const parStatut: { [cle: string]: number } = {};
  let caJour = 0;
  let caSemaine = 0;
  let caMois = 0;
  let fraisMois = 0;
  let nbJour = 0;
  let nbSemaine = 0;
  let nbWeb = 0;
  let nbInstagram = 0;

  for (const c of commandes) {
    parStatut[c.statut] = (parStatut[c.statut] || 0) + 1;

    if (c.wooId > 0) nbWeb++;
    else nbInstagram++;

    const d = new Date(c.dateCommande).getTime();
    if (d >= jour.getTime()) nbJour++;
    if (d >= semaine.getTime()) nbSemaine++;

    // Le chiffre d'affaires ne compte pas les commandes annulees
    if (c.statut === "ANNULEE") continue;

    const montant = c.total || 0;
    caMois += montant;
    fraisMois += c.fraisLivraison || 0;
    if (d >= semaine.getTime()) caSemaine += montant;
    if (d >= jour.getTime()) caJour += montant;
  }

  // Les retours viennent en deduction du chiffre d'affaires
  const listeRetours = await prisma.retour.findMany({
    where: { date: { gte: mois } },
    select: { total: true, date: true },
  });

  let retoursMois = 0;
  let retoursSemaine = 0;
  let retoursJour = 0;

  for (const r of listeRetours) {
    const montant = r.total || 0;
    const d = new Date(r.date).getTime();
    retoursMois += montant;
    if (d >= semaine.getTime()) retoursSemaine += montant;
    if (d >= jour.getTime()) retoursJour += montant;
  }

  const ventes = await prisma.vente.findMany({
    where: { date: { gte: mois } },
    select: { total: true, reste: true, date: true },
  });

  let caVentesMois = 0;
  let caVentesJour = 0;
  let resteAEncaisser = 0;

  for (const v of ventes) {
    caVentesMois += v.total || 0;
    resteAEncaisser += v.reste || 0;
    if (new Date(v.date).getTime() >= jour.getTime()) caVentesJour += v.total || 0;
  }

  const produits = await prisma.product.findMany({
    select: { quantite: true, quantiteMagasin: true, prix: true, wooId: true, nom: true },
  });

  let pieces = 0;
  let valeur = 0;
  let ruptures = 0;
  let nbLocaux = 0;
  const noms = new Set<string>();

  for (const p of produits) {
    const q = (p.quantite || 0) + (p.quantiteMagasin || 0);
    pieces += q;
    valeur += q * (p.prix || 0);
    if (q === 0) ruptures++;
    if (!p.wooId) nbLocaux++;
    noms.add(p.nom);
  }

  return NextResponse.json({
    ok: true,
    commandes: {
      totalMois: commandes.length,
      jour: nbJour,
      semaine: nbSemaine,
      web: nbWeb,
      instagram: nbInstagram,
      parStatut,
    },
    chiffreAffaires: {
      jour: Math.round(caJour),
      semaine: Math.round(caSemaine),
      mois: Math.round(caMois),
      fraisMois: Math.round(fraisMois),
      netJour: Math.round(caJour - retoursJour),
      netSemaine: Math.round(caSemaine - retoursSemaine),
      netMois: Math.round(caMois - retoursMois),
    },
    retours: {
      nombre: listeRetours.length,
      mois: Math.round(retoursMois),
      semaine: Math.round(retoursSemaine),
      jour: Math.round(retoursJour),
    },
    magasin: {
      nombre: ventes.length,
      caMois: Math.round(caVentesMois),
      caJour: Math.round(caVentesJour),
      resteAEncaisser: Math.round(resteAEncaisser),
    },
    stock: {
      variantes: produits.length,
      articles: noms.size,
      pieces,
      valeur: Math.round(valeur),
      ruptures,
      locaux: nbLocaux,
    },
  });
}
