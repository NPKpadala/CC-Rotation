import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 12);
  const empHash = await bcrypt.hash("employee123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: { name: "Admin User", email: "admin@demo.com", passwordHash: adminHash, role: "ADMIN", phone: "9999999999" },
  });
  const emp = await prisma.user.upsert({
    where: { email: "employee@demo.com" },
    update: {},
    create: { name: "Employee One", email: "employee@demo.com", passwordHash: empHash, role: "EMPLOYEE", phone: "8888888888" },
  });

  const bank = await prisma.bankAccount.create({
    data: { name: "HDFC Primary", accountNumber: "1234567890", ifsc: "HDFC0001234", isPrimary: true, createdById: admin.id },
  });

  const profile = await prisma.profile.create({
    data: {
      userId: emp.id,
      fullName: "Rahul Kumar",
      mobile: "9812345678",
      pan: "ABCDE1234F",
      cardDetails: [{ cardName: "Rahul HDFC", cardType: "VISA", cardNumber: "4111111111111234", expiry: "12/27" }],
      bankDetails: { bankName: "HDFC", accountNumber: "9876543210", ifsc: "HDFC0001234" },
      isActive: true,
    },
  });

  await prisma.transaction.create({
    data: {
      profileId: profile.id, dueAmount: 10000, paidAmount: 6000, swipeAmount: 10000, splitPayments: [],
      swipePercentage: 2, charges: 200, clearedAmount: 6000, pendingAmount: 4000, extraSwipedAmount: 0,
      balanceToCustomer: -3800, cardName: "Rahul HDFC", cardType: "VISA", cardNumber: "**** **** **** 1234",
      paymentSite: "Site A", swipeSite: "Site B", swipeDate: new Date(), status: "PARTIAL",
      bankAccountId: bank.id, createdById: emp.id,
    },
  });

  console.log("Seeded:", { admin: admin.email, emp: emp.email, profileId: profile.id });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
