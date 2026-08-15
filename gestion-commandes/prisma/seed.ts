import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ounshijabi.com" },
    update: {},
    create: {
      name: "Administrateur",
      email: "admin@ounshijabi.com",
      password,
      role: "ADMIN",
    },
  });

  console.log("Utilisateur admin créé :", admin.email);
  console.log("Mot de passe initial : admin1234 (à changer après la première connexion)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
