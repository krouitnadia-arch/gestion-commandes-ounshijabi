export function nettoyer(valeur: any) {
  const texte = String(valeur ?? "").trim();
  return texte === "-" ? "" : texte;
}

export function normaliserTelephone(brut: string) {
  let chiffres = (brut || "").replace(/\D/g, "");
  if (chiffres.startsWith("00212")) chiffres = chiffres.slice(5);
  else if (chiffres.startsWith("212")) chiffres = chiffres.slice(3);
  if (!chiffres.startsWith("0")) chiffres = "0" + chiffres;
  return chiffres.slice(0, 10);
}

// L'adresse envoyee a Sendit est celle de la commande, sans y recoller la
// ville : la ville est deja portee par la zone de livraison. Les deux cotes
// gardent ainsi exactement la meme valeur, ce qui rend la comparaison fiable.
export function adressePourSendit(order: any) {
  const adresse = nettoyer(order?.clientAdresse);
  const ville = nettoyer(order?.clientVille);
  return adresse || ville || "-";
}

export function resumeArticles(order: any) {
  const produits = Array.isArray(order?.produits) ? (order.produits as any[]) : [];

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
  return Math.max(0, Math.round((order?.total || 0) + (order?.fraisLivraison || 0)));
}

export function construireColis(order: any, districtId: number) {
  const articles = resumeArticles(order).slice(0, 250);
  const note = nettoyer(order?.notes).slice(0, 250);

  return {
    pickup_district_id: Number(process.env.SENDIT_PICKUP_DISTRICT_ID),
    district_id: districtId,
    name: nettoyer(order?.clientNom) || "Client",
    amount: montantAEncaisser(order),
    address: adressePourSendit(order),
    phone: normaliserTelephone(order?.clientTelephone),
    // La liste des articles a son propre champ, la note reste la note
    products: articles || "-",
    comment: note || "-",
    reference: order?.numero,
    allow_open: 0,
    allow_try: 0,
    products_from_stock: 0,
    option_exchange: 0,
  };
}

// L'etat du colis tel que Sendit le voit
export function etatSendit(d: any) {
  return {
    name: nettoyer(d?.name),
    phone: normaliserTelephone(nettoyer(d?.phone)),
    address: nettoyer(d?.address),
    ville: nettoyer(d?.district?.ville || d?.district?.name),
    districtId: Number(d?.district?.id) || 0,
    comment: nettoyer(d?.comment),
    amount: Math.round(Number(d?.amount) || 0),
    fee: Math.round(Number(d?.fee) || 0),
    status: nettoyer(d?.status),
  };
}

// L'etat du colis tel que l'application le voit
export function etatCommande(order: any, districtId: number) {
  return {
    name: nettoyer(order?.clientNom),
    phone: normaliserTelephone(order?.clientTelephone),
    address: nettoyer(adressePourSendit(order)),
    ville: nettoyer(order?.clientVille),
    districtId: Number(districtId) || 0,
    comment: nettoyer(order?.notes),
    amount: montantAEncaisser(order),
    fee: Math.round(order?.fraisLivraison || 0),
    status: "",
  };
}
