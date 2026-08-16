export type ProduitMessage = {
  nom: string;
  quantite: number;
  couleur?: string;
  taille?: string;
};

export type CommandeMessage = {
  clientNom: string;
  produits: ProduitMessage[];
};

// Retire la taille et la couleur deja presentes dans le nom de l'article
// (exemple : "Robe NYSMA - M, Blanc" devient "Robe NYSMA").
function nomPropre(nom: string) {
  return (nom || "").split(" - ")[0].trim();
}

export function messageConfirmation(commande: CommandeMessage) {
  const lignes = (commande.produits || []).map((p) => {
    const parties = [nomPropre(p.nom)];
    if (p.couleur) parties.push(p.couleur);
    if (p.taille) parties.push(`taille ${p.taille}`);
    const quantite = p.quantite > 1 ? ` × ${p.quantite}` : "";
    return parties.join("/") + quantite;
  });

  return [
    `السلام عليكم ${commande.clientNom}`,
    "",
    "معكم فريق أُنس حجابي نتواصل معكم لتأكيد طلبيتكم التي قمتم بإجراءها عبر موقعنا الالكتروني :",
    "",
    ...lignes,
    "",
    "هل تريدون تأكيد طلبيتكم؟",
  ].join("\n");
}
