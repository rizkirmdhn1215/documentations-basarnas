import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const monthKey = "2026-02";

  const workCategory = await prisma.category.create({
    data: {
      monthKey,
      name: "Work Notes",
      entries: {
        create: [
          {
            monthKey,
            contentType: "meeting-note",
            title: "Kickoff meeting",
            description: "Met product team and captured key requirements.",
            entryDate: new Date("2026-02-03"),
            tags: ["meeting", "project"],
          },
          {
            monthKey,
            contentType: "engineering-log",
            title: "RDS and S3 integration",
            description: "Validated signed upload and download flow.",
            entryDate: new Date("2026-02-04"),
            tags: ["aws", "backend"],
          },
        ],
      },
    },
  });

  await prisma.category.create({
    data: {
      monthKey,
      name: "Personal",
      entries: {
        create: {
          monthKey,
          contentType: "personal-note",
          title: "Weekend plan",
          description: "Family trip planning notes.",
          entryDate: new Date("2026-02-01"),
          tags: ["family"],
        },
      },
    },
  });

  console.log("Seed complete. Example category:", workCategory.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
