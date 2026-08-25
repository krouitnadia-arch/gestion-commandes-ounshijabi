import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { suivreColis, modifierColis } from "@/lib/sendit";
import { construireColis, etatSendit, etatCommande, nettoyer } from "@/lib/colisSendit";
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
  const descendues: string[] = [];
  const montees: string[] = [];
  const conflits: string[] = [];

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
          senditEtat: null,
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

    const cote = etatSendit(d);
    statuts[code] = cote.status || "INCONNU";

    const districtId = cote.districtId || Number(c.senditDistrictId) || 0;
    const maj: Record<string, unknown> = {};

    // ---------------------------------------------------------------
    // Toujours pilote par Sendit : les frais et la zone de livraison
    // ---------------------------------------------------------------
    let frais = Math.round(c.fraisLivraison || 0);
    if (cote.fee > 0 && cote.fee !== frais) {
      frais = cote.fee;
      maj.fraisLivraison = frais;
    }

    if (cote.ville && cote.ville !== nettoyer(c.clientVille)) maj.clientVille = cote.ville;
    if (districtId > 0 && districtId !== c.senditDistrictId) maj.senditDistrictId = districtId;

    // ---------------------------------------------------------------
    // Champs a double sens : on compare avec l'etat memorise
    // ---------------------------------------------------------------
    const app = etatCommande({ ...c, fraisLivraison: frais }, districtId);
    const memoire: any = c.senditEtat || app; // premier passage : on part de l'application

    let pousser = false;
    let conflit = false;

    function arbitrer(champ: "name" | "phone" | "address" | "comment", cible: string) {
      const ancien = nettoyer((memoire as any)[champ]);
      const chezSendit = (cote as any)[champ] as string;
      const chezApp = (app as any)[champ] as string;

      if (chezSendit !== ancien) {
        if (chezSendit !== chezApp) maj[cible] = chezSendit;
        if (chezApp !== ancien) conflit = true;
      } else if (chezApp !== ancien) {
        pousser = true;
      }
    }

    arbitrer("name", "clientNom");
    arbitrer("phone", "clientTelephone");
    arbitrer("address", "clientAdresse");
    arbitrer("comment", "notes");

    // Le montant : chez Sendit c'est "a encaisser", chez nous c'est
    // "articles + frais". On repercute donc sur le total des articles.
    const montantMemoire = Math.round(Number(memoire?.amount) || 0);

    if (cote.amount !== montantMemoire) {
      const nouveauTotal = Math.max(0, cote.amount - frais);
      if (nouveauTotal !== Math.round(c.total || 0)) maj.total = nouveauTotal;
      if (app.amount !== montantMemoire) conflit = true;
    } else if (app.amount !== montantMemoire) {
      pousser = true;
    }

    // ---------------------------------------------------------------
    // On envoie chez Sendit ce qui a change de notre cote
    // ---------------------------------------------------------------
    const commandeAJour: any = {
      ...c,
      ...maj,
      fraisLivraison: frais,
    };

    if (pousser && districtId > 0 && cote.status === "PENDING") {
      try {
        const colis = {
          ...construireColis(commandeAJour, districtId),
          allow_open: Number(d.allow_open) || 0,
          allow_try: Number(d.allow_try) || 0,
        };

        await modifierColis(code, colis);
        montees.push(c.numero);
        maj.senditEtat = etatCommande(commandeAJour, districtId) as any;
      } catch {
        // si Sendit refuse, on garde l'etat precedent et on reessaiera
      }
    }

    if (!maj.senditEtat) {
      maj.senditEtat = { ...cote, fee: frais } as any;
    }

    const champsDescendus = Object.keys(maj).filter(
      (k) => k !== "senditEtat" && k !== "senditDistrictId"
    );
    if (champsDescendus.length > 0) descendues.push(c.numero);
    if (conflit) conflits.push(c.numero);

    await prisma.order.update({ where: { id: c.id }, data: maj });
  }

  return NextResponse.json({ ok: true, statuts, annulees, descendues, montees, conflits });
}
