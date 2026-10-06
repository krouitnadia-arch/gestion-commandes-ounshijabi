import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { listerColis, premierePageColis } from "@/lib/sendit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Statut Sendit -> statut de commande dans l'app
function statutCommande(sendit: string) {
  const s = String(sendit || "").toUpperCase();
  if (s === "DELIVERED") return "LIVREE";
  if (s === "RETURNED") return "RETOURNEE";
  if (s === "CANCELED") return "ANNULEE";
  return "EXPEDIEE";
}

function nombre(valeur: any) {
  const n = Number(valeur);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  // ?brut=1 : reponse brute de Sendit, pour inspecter les champs
  if (req.nextUrl.searchParams.get("brut")) {
    try {
      const brut = await premierePageColis();
      return NextResponse.json(brut);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Erreur Sendit" }, { status: 500 });
    }
  }

  try {
    const colis = await listerColis(5);

    const connues = await prisma.order.findMany({
      where: { senditCode: { not: null } },
      select: { senditCode: true },
    });

    const deja = new Set(connues.map((c) => String(c.senditCode)));

    const manquants = colis
      .filter((c: any) => {
        const code = c?.code ?? c?.tracking_number ?? c?.reference;
        return code && !deja.has(String(code));
      })
      .map((c: any) => ({
        code: String(c?.code ?? c?.tracking_number ?? c?.reference),
        nom: c?.name ?? c?.client_name ?? "",
        telephone: c?.phone ?? c?.client_phone ?? "",
        adresse: c?.address ?? "",
        ville: c?.district?.name ?? c?.district?.ville ?? c?.city ?? "",
        districtId: c?.district?.id ?? c?.district_id ?? null,
        produits: typeof c?.products === "string" ? c.products : "",
        commentaire: c?.comment ?? "",
        montant: nombre(c?.amount),
        frais: nombre(c?.fee),
        statut: c?.status ?? "",
        date: c?.created_at ?? null,
      }));

    return NextResponse.json({ colis: manquants, total: colis.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur Sendit" }, { status: 500 });
  }
}

// Import d'un colis cree a la main : il devient une commande dans l'app.
// Le stock n'est pas touche : Sendit ne nous dit pas quel article exactement.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const code = String(body.code || "").trim();

  if (!code) return NextResponse.json({ error: "Code du colis manquant" }, { status: 400 });

  const existante = await prisma.order.findFirst({ where: { senditCode: code } });
  if (existante) {
    return NextResponse.json(
      { error: `Le colis ${code} est deja rattache a la commande ${existante.numero}` },
      { status: 400 }
    );
  }

  const frais = nombre(body.frais);
  const montant = nombre(body.montant);
  const total = Math.max(0, montant - frais);

  const description = String(body.produits || "").trim() || "Colis Sendit";

  const produits = [
    {
      nom: description,
      quantite: 1,
      total: String(total),
    },
  ];

  const min = await prisma.order.aggregate({ _min: { wooId: true } });
  const wooId = Math.min(-1, (min._min.wooId ?? 0) - 1);

  const order = await prisma.order.create({
    data: {
      wooId,
      numero: `SD-${code}`,
      clientNom: String(body.nom || "").trim() || "Client Sendit",
      clientTelephone: String(body.telephone || "").trim(),
      clientAdresse: String(body.adresse || ""),
      clientVille: String(body.ville || ""),
      produits: produits as any,
      total,
      fraisLivraison: frais,
      dateCommande: body.date ? new Date(body.date) : new Date(),
      statut: statutCommande(String(body.statut || "")) as any,
      senditCode: code,
      senditDistrictId: body.districtId ? Number(body.districtId) : null,
      notes: String(body.commentaire || "") || null,
      stockDeduit: false,
    },
  });

  return NextResponse.json({ ok: true, order });
}
