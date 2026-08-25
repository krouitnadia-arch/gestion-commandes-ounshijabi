import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { suivreColis } from "@/lib/sendit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Outil de diagnostic : affiche la reponse brute de Sendit pour un colis.
// Usage (en etant connectee a l'application) :
//   /api/sendit/inspection?code=DH23A2CE77E
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Reserve a l'administrateur" }, { status: 401 });
  }

  const code = (req.nextUrl.searchParams.get("code") || "").trim();
  if (!code) {
    return NextResponse.json(
      { erreur: "Ajoutez ?code=LE_CODE_DU_COLIS a l'adresse." },
      { status: 400 }
    );
  }

  try {
    const reponse = await suivreColis(code);
    return NextResponse.json({ ok: true, code, reponse });
  } catch (e: any) {
    return NextResponse.json({ ok: false, code, erreur: e?.message }, { status: 500 });
  }
}
