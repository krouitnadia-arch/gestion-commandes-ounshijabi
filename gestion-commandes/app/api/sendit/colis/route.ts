import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { pageColis, colisDeLaPage } from "@/lib/sendit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const JOURS_PAR_DEFAUT = 45;
const PAGES_MAX = 45;

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

// Sendit renvoie "2026-10-05 19:41:38"
function dateSendit(valeur: any) {
  if (!valeur) return null;
  const d = new Date(String(valeur).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

// La reference peut contenir plusieurs numeros : "12763 + 12758"
function referencesDuColis(valeur: any) {
  return String(valeur || "")
    .split("+")
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const jours = Math.max(1, Number(req.nextUrl.searchParams.get("jours")) || JOURS_PAR_DEFAUT);
  const limite = Date.now() - jours * 24 * 60 * 60 * 1000;

  try {
    const recents: any[] = [];
    let page = 1;
    let dernierePage = 1;
    let tropVieux = false;

    do {
      const reponse: any = await pageColis(page);
      const liste = colisDeLaPage(reponse);

      dernierePage = Number(reponse?.last_page ?? reponse?.data?.last_page) || 1;

      for (const c of liste) {
        const d = dateSendit(c?.created_at);
        if (d && d.getTime() < limite) {
          tropVieux = true;
          continue;
        }
        recents.push(c);
      }

      page++;
    } while (!tropVieux && page <= dernierePage && page <= PAGES_MAX);

    // Les colis deja rattaches a une commande de l'app
    const liees = await prisma.order.findMany({
      where: { senditCode: { not: null } },
      select: { senditCode: true },
    });
    const dejaLies = new Set(liees.map((o) => String(o.senditCode)));

    const aLaMain = recents.filter((c: any) => c?.code && !dejaLies.has(String(c.code)));

    // On cherche les commandes qui portent les numeros indiques en reference
    const toutesRefs = Array.from(
      new Set(aLaMain.flatMap((c: any) => referencesDuColis(c?.reference)))
    );

    const commandes =
      toutesRefs.length > 0
        ? await prisma.order.findMany({
            where: { numero: { in: toutesRefs } },
            select: { id: true, numero: true, statut: true, senditCode: true },
          })
        : [];

    const parNumero = new Map(commandes.map((o) => [String(o.numero), o]));

    const colis = aLaMain.map((c: any) => {
      const refs = referencesDuColis(c?.reference);
      const trouvee = refs.map((r) => parNumero.get(r)).find((o) => o) || null;

      return {
        code: String(c.code),
        statut: String(c?.status || ""),
        nom: c?.name ?? "",
        telephone: c?.phone ?? "",
        ville: c?.district?.name ?? c?.district?.ville ?? "",
        districtId: c?.district?.id ?? null,
        produits: typeof c?.products === "string" ? c.products : "",
        commentaire: c?.comment ?? "",
        reference: c?.reference ?? "",
        montant: nombre(c?.amount),
        frais: nombre(c?.fee),
        echange: Number(c?.option_exchange) === 1,
        date: c?.created_at ?? null,
        commandeId: trouvee ? trouvee.id : null,
        commandeNumero: trouvee ? trouvee.numero : null,
      };
    });

    return NextResponse.json({
      colis,
      jours,
      lus: recents.length,
      pages: page - 1,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur Sendit" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const code = String(body.code || "").trim();
  const action = String(body.action || "creer");

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
  const districtId = body.districtId ? Number(body.districtId) : null;

  // ----- Rattacher le colis a une commande qui existe deja -----
  if (action === "rattacher") {
    const orderId = String(body.orderId || "");
    if (!orderId) return NextResponse.json({ error: "Commande manquante" }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

    const maj = await prisma.order.update({
      where: { id: orderId },
      data: {
        senditCode: code,
        senditDistrictId: districtId ?? order.senditDistrictId,
        fraisLivraison: frais || order.fraisLivraison,
        statut: statutCommande(String(body.statut || "")) as any,
      },
    });

    return NextResponse.json({ ok: true, order: maj, action: "rattachee" });
  }

  // ----- Creer une nouvelle commande a partir du colis -----
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

  const notes = [
    body.echange ? "ECHANGE" : "",
    String(body.commentaire || "").trim(),
  ]
    .filter((x) => x && x !== "'-" && x !== ";")
    .join(" - ");

  const order = await prisma.order.create({
    data: {
      wooId,
      numero: `SD-${code}`,
      clientNom: String(body.nom || "").trim() || "Client Sendit",
      clientTelephone: String(body.telephone || "").trim(),
      clientAdresse: "",
      clientVille: String(body.ville || ""),
      produits: produits as any,
      total,
      fraisLivraison: frais,
      dateCommande: dateSendit(body.date) ?? new Date(),
      statut: statutCommande(String(body.statut || "")) as any,
      senditCode: code,
      senditDistrictId: districtId,
      notes: notes || null,
      stockDeduit: false,
    },
  });

  return NextResponse.json({ ok: true, order, action: "creee" });
}
