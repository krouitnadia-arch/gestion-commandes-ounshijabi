import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { suivreColis, modifierColis, estIntrouvable } from "@/lib/sendit";
import { construireColis, etatSendit, etatCommande, nettoyer } from "@/lib/colisSendit";
import { restituerStock, lignesARestituer } from "@/lib/stockCommande";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function lireColis(code: string) {
  try {
    const r: any = await suivreColis(code);
    return { supprime: false, data: r?.data || null };
  } catch (e: any) {
    return { supprime: estIntrouvable(e), data: null };
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const statuts: { [code: string]: string } = {};
  const supprimees: string[] = [];
  const descendues: string[] = [];
  const montees: string[] = [];
  const conflits: string[] = [];
  const erreurs: string[] = [];

  try {
    const commandes = await prisma.order.findMany({
      where: { senditCode: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 25,
    });

    for (const c of commandes) {
      const code = c.senditCode as string;

      // Une commande en erreur n'interrompt plus les autres
      try {
        const r = await lireColis(code);

        // -----------------------------------------------------------
        // Colis disparu chez Sendit : statut "Supprimee sur Sendit"
        // et retour des pieces au stock
        // -----------------------------------------------------------
        if (r.supprime) {
          const aRendre = await lignesARestituer(c);
          let rendues = 0;

          if (aRendre.length > 0) {
            const res = await restituerStock(aRendre);
            rendues = res.rendues;
          }

          await prisma.order.update({
            where: { id: c.id },
            data: {
              statut: "SUPPRIMEE_SENDIT",
              senditCode: null,
              senditEtat: Prisma.DbNull,
              saisiLivraison: false,
              stockDeduit: false,
            },
          });

          statuts[code] = "SUPPRIME";
          supprimees.push(`${c.numero} (${rendues} piece(s) rendue(s))`);
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

        // Toujours pilote par Sendit : les frais et la zone de livraison
        let frais = Math.round(c.fraisLivraison || 0);
        if (cote.fee > 0 && cote.fee !== frais) {
          frais = cote.fee;
          maj.fraisLivraison = frais;
        }

        if (cote.ville && cote.ville !== nettoyer(c.clientVille)) maj.clientVille = cote.ville;
        if (districtId > 0 && districtId !== c.senditDistrictId) {
          maj.senditDistrictId = districtId;
        }

        // Champs a double sens : comparaison avec l'etat memorise
        const app = etatCommande({ ...c, fraisLivraison: frais }, districtId);
        const memoire: any = c.senditEtat || app;

        let pousser = false;
        let conflit = false;

        const champs: { cle: "name" | "phone" | "address" | "comment"; cible: string }[] = [
          { cle: "name", cible: "clientNom" },
          { cle: "phone", cible: "clientTelephone" },
          { cle: "address", cible: "clientAdresse" },
          { cle: "comment", cible: "notes" },
        ];

        for (const champ of champs) {
          const ancien = nettoyer(memoire ? memoire[champ.cle] : "");
          const chezSendit = String((cote as any)[champ.cle] || "");
          const chezApp = String((app as any)[champ.cle] || "");

          if (chezSendit !== ancien) {
            if (chezSendit !== chezApp) maj[champ.cible] = chezSendit;
            if (chezApp !== ancien) conflit = true;
          } else if (chezApp !== ancien) {
            pousser = true;
          }
        }

        const montantMemoire = Math.round(Number(memoire?.amount) || 0);

        if (cote.amount !== montantMemoire) {
          const nouveauTotal = Math.max(0, cote.amount - frais);
          if (nouveauTotal !== Math.round(c.total || 0)) maj.total = nouveauTotal;
          if (app.amount !== montantMemoire) conflit = true;
        } else if (app.amount !== montantMemoire) {
          pousser = true;
        }

        const commandeAJour: any = { ...c, ...maj, fraisLivraison: frais };

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
          } catch (e: any) {
            erreurs.push(`${c.numero} : envoi refuse par Sendit (${e?.message})`);
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
      } catch (e: any) {
        erreurs.push(`${c.numero} : ${e?.message || String(e)}`);
      }
    }

    return NextResponse.json({
      ok: true,
      statuts,
      supprimees,
      descendues,
      montees,
      conflits,
      erreurs,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        erreur: e?.message || String(e),
        detail: String(e?.stack || "").split("\n").slice(0, 6).join(" | "),
        statuts,
        erreurs,
      },
      { status: 200 }
    );
  }
}
