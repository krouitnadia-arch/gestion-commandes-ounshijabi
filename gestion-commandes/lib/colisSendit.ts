function normaliserTelephone(brut: string) {
  let chiffres = (brut || "").replace(/\D/g, "");
  if (chiffres.startsWith("00212")) chiffres = chiffres.slice(5);
  else if (chiffres.startsWith("212")) chiffres = chiffres.slice(3);
  if (!chiffres.startsWith("0")) chiffres = "0" + chiffres;
  return chiffres.slice(0, 10);
}

// L'adresse envoyee a Sendit. La ville n'est ajoutee que si elle ne figure
// pas deja dans l'adresse, pour eviter les doublons apres synchronisation.
function adresseComplete(order: any) {
  const adresse = (order.clientAdresse || "").trim();
  const ville = (order.clientVille || "").trim();

  if (!adresse) return ville || "-";
  if (!ville) return adresse;
  if (adresse.toLowerCase().includes(ville.toLowerCase())) return adresse;
  return `${adresse}, ${ville}`;
}

export function resumeArticles(order: any) {
  const produits = Array.isArray(order.produits) ? (order.produits as any[]) : [];

  return produits
    .map((p) => {
      const details = [p?.couleur, p?.taille].filter(Boolean).join(" ");
      const quantite = Number(p?.quantite) || 1;
      return `${p?.nom || "Article"}${details ? ` (${details})` : ""} x${quantite}`;
    })
    .join(", ");
}

// Le montant que le livreur encaisse : prix des articles + frais de livraison
export function montantAEncaisser(order: any) {
  return Math.max(0, Math.round((order.total || 0) + (order.fraisLivraison || 0)));
}

export function construireColis(order: any, districtId: number) {
  const articles = resumeArticles(order).slice(0, 250);
  const note = (order.notes || "").trim().slice(0, 250);

  return {
    pickup_district_id: Number(process.env.SENDIT_PICKUP_DISTRICT_ID),
    district_id: districtId,
    name: (order.clientNom || "Client").trim(),
    amount: montantAEncaisser(order),
    address: adresseComplete(order),
    phone: normaliserTelephone(order.clientTelephone),
    // La liste des articles va dans son propre champ, la note reste la note
    products: articles || "-",
    comment: note || "-",
    reference: order.numero,
    allow_open: 0,
    allow_try: 0,
    products_from_stock: 0,
    option_exchange: 0,
  };
}
