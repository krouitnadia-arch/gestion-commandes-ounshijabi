import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { construireColis } from "@/lib/colisSendit";
import {
  listerDistricts,
  listerVillesRamassage,
  creerColis,
  modifierColis,
  suivreColis,
} from "@/lib/sendit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Verifie si un colis existe encore chez Sendit
async function colisExiste(code: string) {
  try {
    const r: any = await suivreColis(code);
    return Boolean(r?.data?.code);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");

  try {
    const liste =
      type === "ramassage" ? await listerVillesRamassage() : await listerDistricts();
    return NextResponse.json({ ok: true, nombre: liste.length, liste });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const districtId = Number(body.districtId);

  if (!body.orderId || !districtId) {
    return NextResponse.json({ error: "Commande ou ville manquante" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: body.orderId } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  if (order.senditCode) {
    if (!body.forcer) {
      return NextResponse.json(
        { error: `Colis deja cree (${order.senditCode}). Utilisez "Mettre a jour".` },
        { status: 400 }
      );
    }

    // Securite : on ne recree un colis que si l'ancien a bien disparu,
    // sinon on se retrouverait avec deux colis pour la meme commande.
    const encoreLa = await colisExiste(order.senditCode);

    if (encoreLa) {
      return NextResponse.json(
        {
          error: `Le colis ${order.senditCode} existe toujours chez Sendit. Cliquez sur "Mettre a jour" pour le modifier, ou supprimez-le d'abord sur le site Sendit.`,
        },
        { status: 400 }
      );
    }
  }

  const colis = construireColis(order, districtId);

  if (String(colis.phone).length !== 10) {
    return NextResponse.json(
      { error: `Telephone invalide : ${order.clientTelephone}` },
      { status: 400 }
    );
  }

  try {
    const reponse = await creerColis(colis);
    const code = reponse?.data?.code || null;

    await prisma.order.update({
      where: { id: order.id },
      data: { senditCode: code, saisiLivraison: true, statut: "EXPEDIEE" },
    });

    return NextResponse.json({ ok: true, code, montant: colis.amount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const districtId = Number(body.districtId);

  if (!body.orderId || !districtId) {
    return NextResponse.json({ error: "Commande ou ville manquante" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: body.orderId } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (!order.senditCode) {
    return NextResponse.json({ error: "Aucun colis a modifier" }, { status: 400 });
  }

  const colis = construireColis(order, districtId);

  try {
    await modifierColis(order.senditCode, colis);
    return NextResponse.json({ ok: true, code: order.senditCode, montant: colis.amount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Detache le colis : la commande redevient prete a etre envoyee
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("orderId");
  if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

  await prisma.order.update({
    where: { id },
    data: { senditCode: null, saisiLivraison: false, statut: "CONFIRMEE" },
  });

  return NextResponse.json({ ok: true });
}
