import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { suivreColis, modifierColis } from "@/lib/sendit";
import { construireColis, montantAEncaisser } from "@/lib/colisSendit";
import { restituerStock, lignesARestituer } from "@/lib/stockCommande";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function lireColis(code: string) {
  try {
    const r: any = await suivreColis(code);
    return { supprime: false, data: r?.data || null };
  } catch (e: any) {
    const m = String(e?.message || "").toLowerCase();
    const introuvable =
      m.includes("404") ||
      m.includes("introuvable") ||
      m.includes("not found") ||
      m.includes("no query results");

    return { supprime: introuvable, data: null };
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const commandes = await prisma.order.findMany({
    where: { senditCode: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: 25,
  });

  const statuts: { [code: string]: string } = {};
  const annulees: string[] = [];
  const modifiees: string[] = [];
  const corriges: string[] = [];

  for (const c of commandes) {
    const code = c.senditCode as string;
    const r = await lireColis(code);

    // ---------------------------------------------------------------
    // Le colis n'existe plus chez Sendit : la commande est annulee
    // ---------------------------------------------------------------
    if (r.supprime) {
      const aRendre = await lignesARestituer(c);
      if (aRendre.length > 0) await restituerStock(aRendre);

      await prisma.order.update({
        where: { id: c.id },
        data: {
          statut: "ANNULEE",
          senditCode: null,
          saisiLivraison: false,
          stockDeduit: false,
        },
      });

      statuts[code] = "SUPPRIME";
      annulees.push(c.numero);
      continue;
    }

    const d = r.data;
    if (!d) {
      statuts[code] = "INCONNU";
      continue;
    }

    statuts[code] = d.status || "INCONNU";

    // ---------------------------------------------------------------
    // Ce qui a ete modifie chez Sendit redescend dans l'application
    // ---------------------------------------------------------------
    const maj: Record<string, unknown> = {};

    const nom = String(d.name || "").trim();
    if (nom && nom !== c.clientNom) maj.clientNom = nom;

    const tel = String(d.phone || "").trim();
    if (tel && tel !== c.clientTelephone) maj.clientTelephone = tel;

    const adresse = String(d.address || "").trim();
    if (adresse && adresse !== c.clientAdresse) maj.clientAdresse = adresse;

    const ville = String(d.district?.ville || d.district?.name || "").trim();
    if (ville && ville !== c.clientVille) maj.clientVille = ville;

    // Les frais reels de Sendit remplissent la case si elle est encore vide
    const frais = Number(d.fee);
    if (!Number.isNaN(frais) && frais > 0 && (c.fraisLivraison || 0) === 0) {
      maj.fraisLivraison = frais;
    }

    if (Object.keys(maj).length > 0) {
      await prisma.order.update({ where: { id: c.id }, data: maj });
      modifiees.push(c.numero);
    }

    // ---------------------------------------------------------------
    // Le montant a encaisser chez Sendit est corrige s'il ne correspond
    // pas a "articles + frais de livraison"
    // ---------------------------------------------------------------
    const commandeAJour = { ...c, ...maj } as any;
    const attendu = montantAEncaisser(commandeAJour);
    const actuel = Math.round(Number(d.amount) || 0);
    const districtId = Number(d.district?.id) || 0;

    if (attendu > 0 && districtId > 0 && attendu !== actuel && d.status === "PENDING") {
      try {
        const colis = {
          ...construireColis(commandeAJour, districtId),
          allow_open: Number(d.allow_open) || 0,
          allow_try: Number(d.allow_try) || 0,
        };

        await modifierColis(code, colis);
        corriges.push(`${c.numero} : ${actuel} -> ${attendu}`);
      } catch {
        // si Sendit refuse la modification, le suivi continue
      }
    }
  }

  return NextResponse.json({ ok: true, statuts, annulees, modifiees, corriges });
}
