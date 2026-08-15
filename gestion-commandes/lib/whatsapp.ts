// Formatte un numéro de téléphone pour un lien wa.me (retire espaces/tirets,
// ajoute l'indicatif pays par défaut si le numéro commence par 0).
// Ajustez `defaultCountryCode` selon votre pays (212 = Maroc, 213 = Algérie, 216 = Tunisie...).
export function toWhatsAppNumber(phone: string, defaultCountryCode = "212") {
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = defaultCountryCode + digits.slice(1);
  if (!digits.startsWith(defaultCountryCode) && digits.length <= 10) {
    digits = defaultCountryCode + digits;
  }
  return digits;
}
