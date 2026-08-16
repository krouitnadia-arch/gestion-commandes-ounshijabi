import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cle = req.nextUrl.searchParams.get("cle");
  if (!cle || cle !== process.env.SESSION_SECRET) {
    return NextResponse.json({ erreur: "Cle invalide." }, { status: 401 });
  }

  const avant = req.nextUrl.searchParams.get("avant") || "2026-08-01";
  const limite = new Date(`${avant}T00:00:00Z`);

  if (isNaN(limite.getTime())) {
    return NextResponse.json({ erreur: "Date invalide" }, { status: 400 });
  }

  const aSupprimer = await prisma.order.count({
    where: { dateCommande: { lt: limite } },
  });
  const conservees = await prisma.order.count({
    where: { dateCommande: { gte: limite } },
  });

  if (req.nextUrl.searchParams.get("confirmer") !== "oui") {
    return NextResponse.json({
      apercu: true,
      dateLimite: avant,
      commandesASupprimer: aSupprimer,
      commandesConservees: conservees,
      pourLancer: "Ajoutez &confirmer=oui a la fin de l'adresse.",
    });
  }

  const resultat = await prisma.order.deleteMany({
    where: { dateCommande: { lt: limite } },
  });

  return NextResponse.json({
    succes: true,
    supprimees: resultat.count,
    commandesRestantes: conservees,
  });
}
