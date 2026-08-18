import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { STATUS_LIST } from "@/lib/statusConfig";
import { supprimerColis } from "@/lib/sendit";
import { restituerStock } from "@/lib/stockCommande";

export const maxDuration = 60;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const existante = await prisma.order.findUnique({ where: { id: params.id } });
  if (!existante) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  const avertissements: string[] = [];

  if (body.statut) {
    if (!STATUS_LIST.includes(body.statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    data.statut = body.statut;

    if (body.statut === "ANNULEE") {
      // Le colis est supprime chez Sendit
      if (existante.senditCode) {
        try {
          await supprimerColis(existante.senditCode);
          data.senditCode = null;
          data.saisiLivraison = false;
        } catch (e: any) {
          avertissements.push(`Colis non supprime chez Sendit : ${e.message}`);
        }
      }

      // Les pieces reviennent au stock
      if (existante.stockDeduit) {
        const r = await restituerStock(existante.produits);
        data.stockDeduit = false;
        avertissements.push(...r.avertissements);
        if (r.rendues > 0) {
          avertissements.push(`${r.rendues} piece(s) remise(s) au stock`);
        }
      }
    }
  }

  if (typeof body.notes === "string") data.notes = body.notes;
  if (typeof body.saisiLivraison === "boolean") data.saisiLivraison = body.saisiLivraison;

  if (typeof body.clientNom === "string" && body.clientNom.trim()) {
    data.clientNom = body.clientNom.trim();
  }
  if (typeof body.clientTelephone === "string") data.clientTelephone = body.clientTelephone.trim();
  if (typeof body.clientAdresse === "string") data.clientAdresse = body.clientAdresse.trim();
  if (typeof body.clientVille === "string") data.clientVille = body.clientVille.trim();

  if (body.total !== undefined) {
    const total = Number(body.total);
    if (!Number.isNaN(total) && total >= 0) data.total = total;
  }

  if (body.marquerAppele) {
    data.appele = true;
    data.appeleA = new Date();
    data.appelePar = session.name;
    if (!body.statut) data.statut = "APPELE";
  }

  const order = await prisma.order.update({ where: { id: params.id }, data });

  return NextResponse.json({
    ...order,
    avertissement: avertissements.length > 0 ? avertissements.join(" | ") : null,
  });
}
