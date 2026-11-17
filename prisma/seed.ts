import { PrismaClient } from "@prisma/client";
import { AIRPORTS } from "./airports-data";

const prisma = new PrismaClient();

async function main() {
  for (const a of AIRPORTS) {
    await prisma.airport.upsert({
      where: { iata: a.iata },
      update: { name: a.name, city: a.city, country: a.country, timezone: a.timezone },
      create: a,
    });
  }
  console.log(`Seeded ${AIRPORTS.length} airports (reference data only — no lounge data).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
