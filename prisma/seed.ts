import { PrismaClient, CardNetwork, CardType, KYCStatus, TransactionType, TransactionStatus, ConductType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const NETWORK_PCT: Record<CardNetwork, number> = {
  VISA: 2.5,
  RUPAY: 3.0,
  MASTERCARD: 3.0,
  HDFC_RUPAY: 3.5,
  HDFC_MASTER: 3.5,
  DINERS_CLUB: 3.5,
  AMERICAN_EXPRESS: 4.0,
  OTHER: 3.0,
};

const FIRST_NAMES = [
  "Ravi", "Suresh", "Anil", "Vijay", "Rohit", "Amit", "Sandeep", "Manoj", "Deepak", "Ramesh",
  "Priya", "Anita", "Sunita", "Kavita", "Pooja", "Neha", "Divya", "Rekha", "Geeta", "Lakshmi",
  "Karthik", "Naveen", "Srinivas", "Mahesh", "Rajesh", "Prakash", "Krishna", "Venkat", "Sai", "Arjun",
];
const LAST_NAMES = [
  "Kumar", "Reddy", "Sharma", "Singh", "Patel", "Naidu", "Rao", "Gupta", "Verma", "Yadav",
  "Iyer", "Nair", "Pillai", "Menon", "Joshi", "Mishra", "Tiwari", "Pandey", "Choudhary", "Agarwal",
];
const BANKS = ["SBI", "ICICI", "HDFC", "AXIS", "KOTAK_MAHINDRA", "IDFC", "RBL", "INDUSIND", "YES_BANK", "AU_SMALL_FINANCE"];
const NETWORKS: CardNetwork[] = ["VISA", "RUPAY", "MASTERCARD", "HDFC_RUPAY", "HDFC_MASTER", "DINERS_CLUB", "AMERICAN_EXPRESS"];
const GATEWAYS = ["PAY1", "PAY_BIJILI", "PAYMAMA", "SOFT_PAY", "ROI_NET", "INSTANT_MUDRA", "GREEN_PAY", "CHOTAPAY"];
const HELD_BY = ["Ravi", "Suresh", "Anita", "Karthik", "Pooja"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randMobile(): string {
  const first = pick([6, 7, 8, 9]);
  let rest = "";
  for (let i = 0; i < 9; i++) rest += randInt(0, 9).toString();
  return `${first}${rest}`;
}
function randCardNumber(): string {
  let n = "";
  for (let i = 0; i < 16; i++) n += randInt(0, 9).toString();
  return n;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function main() {
  console.log("🌱 Starting seed...");

  // Wipe in correct order
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.conductRecord.deleteMany();
  await prisma.fraudCustomer.deleteMany();
  await prisma.card.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleared existing data");

  // ─── Users ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin@123", 12);
  const empHash = await bcrypt.hash("emp@123", 12);

  const admin = await prisma.user.create({
    data: {
      mobile: "9999999999",
      passwordHash: adminHash,
      name: "Admin User",
      email: "admin@ccledger.local",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const employees = await Promise.all(
    [1, 2, 3].map((i) =>
      prisma.user.create({
        data: {
          mobile: `900000000${i}`,
          passwordHash: empHash,
          name: `Employee ${i}`,
          email: `emp${i}@ccledger.local`,
          role: "EMPLOYEE",
          status: "ACTIVE",
        },
      })
    )
  );
  console.log(`✅ Created 1 admin + ${employees.length} employees`);

  // ─── System Settings ────────────────────────────────────────────────────────
  await prisma.systemSetting.createMany({
    data: [
      { key: "default_pct_VISA", value: "2.5", dataType: "number", label: "Visa default %", category: "rates" },
      { key: "default_pct_RUPAY", value: "3.0", dataType: "number", label: "RuPay default %", category: "rates" },
      { key: "default_pct_MASTERCARD", value: "3.0", dataType: "number", label: "MasterCard default %", category: "rates" },
      { key: "default_pct_HDFC_RUPAY", value: "3.5", dataType: "number", label: "HDFC RuPay default %", category: "rates" },
      { key: "default_pct_HDFC_MASTER", value: "3.5", dataType: "number", label: "HDFC MasterCard default %", category: "rates" },
      { key: "default_pct_DINERS_CLUB", value: "3.5", dataType: "number", label: "Diners Club default %", category: "rates" },
      { key: "default_pct_AMERICAN_EXPRESS", value: "4.0", dataType: "number", label: "Amex default %", category: "rates" },
      { key: "company_name", value: "Sahsra CC Rotations", dataType: "string", label: "Company Name", category: "general" },
      { key: "currency", value: "INR", dataType: "string", label: "Currency", category: "general" },
      // ADDED v1.2 — WhatsApp confirmation template (admin can edit)
      {
        key: "whatsapp_message_template",
        value: `Hi {customer_name},

✅ Your payment has been received successfully!

Txn ID: {transaction_id}
📅 Date: {date}
💳 Card: {card}
💰 Amount Paid: ₹{amount}
📊 Status: FULLY CLEARED — NO DUE REMAINING

Thank you for your payment!

— {company_name}`,
        dataType: "string",
        label: "WhatsApp confirmation template",
        category: "messaging",
      },
    ],
  });

  // ─── Profiles + Cards ───────────────────────────────────────────────────────
  const profileIds: string[] = [];
  const cards: Array<{ id: string; profileId: string; network: CardNetwork; bankName: string; last4: string; pct: number }> = [];

  for (let i = 0; i < 50; i++) {
    const fname = pick(FIRST_NAMES);
    const lname = pick(LAST_NAMES);
    const creator = pick([admin, ...employees]);

    const profile = await prisma.profile.create({
      data: {
        name: `${fname} ${lname}`,
        mobile: randMobile(),
        alternativeNumber: Math.random() > 0.6 ? randMobile() : null,
        email: Math.random() > 0.5 ? `${fname.toLowerCase()}.${lname.toLowerCase()}@example.com` : null,
        isActive: true,
        internalNotes: Math.random() > 0.7 ? "Repeat customer, reliable." : null,
        createdById: creator.id,
      },
    });
    profileIds.push(profile.id);

    const numCards = randInt(1, 3);
    for (let c = 0; c < numCards; c++) {
      const network = pick(NETWORKS);
      const bank = pick(BANKS);
      const cardNumber = randCardNumber();
      const last4 = cardNumber.slice(-4);
      const cardHash = await bcrypt.hash(cardNumber, 10);
      const pct = NETWORK_PCT[network];
      const expireYear = new Date().getFullYear() + randInt(1, 5);
      const expireMonth = randInt(1, 12);

      const holderFirst = pick(FIRST_NAMES);
      const holderLast = pick(LAST_NAMES);

      const card = await prisma.card.create({
        data: {
          profileId: profile.id,
          holderName: `${holderFirst} ${holderLast}`,
          holderMobile: randMobile(),
          bankName: bank,
          cardNetwork: network,
          cardType: pick(["DOMESTIC", "BUSINESS", "INTERNATIONAL"] as CardType[]),
          cardNumberLast4: last4,
          cardNumberHash: cardHash,
          cardExpireMonth: expireMonth,
          cardExpireYear: expireYear,
          defaultPercentage: pct,
          kycStatus: pick(["VERIFIED", "VERIFIED", "VERIFIED", "PENDING"] as KYCStatus[]),
          status: "ACTIVE",
        },
      });
      cards.push({ id: card.id, profileId: profile.id, network, bankName: bank, last4, pct });
    }
  }
  console.log(`✅ Created ${profileIds.length} profiles with ${cards.length} cards`);

  // ─── Bill Payment Transactions ──────────────────────────────────────────────
  let totalPending = 0;
  for (let i = 0; i < 120; i++) {
    const card = pick(cards);
    const profileId = card.profileId;
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) continue;

    const paid = randInt(20, 200) * 1000;
    const paidAmt = paid;
    // Sometimes split payments
    const paidRaw = Math.random() > 0.6 ? `${Math.floor(paid / 2)}+${paid - Math.floor(paid / 2)}` : `${paid}`;

    const swipeAmt = Math.random() > 0.3 ? Math.max(0, paid - randInt(0, 30) * 1000) : 0;
    const swipeRaw = swipeAmt > 0 ? `${swipeAmt}` : "";

    const pct = card.pct;
    const charges = round2((paidAmt * pct) / 100);
    const pendingAmount = round2(paidAmt - swipeAmt);
    const totalPendingTx = round2(pendingAmount + charges);
    const cleared = Math.random() > 0.7 ? round2(totalPendingTx * (Math.random() * 0.5)) : 0;
    const afterClear = round2(totalPendingTx - cleared);
    const profit = charges; // no site charges in seed
    const isPending = afterClear > 0.01;
    if (isPending) totalPending += afterClear;

    const daysAgo = randInt(0, 45);
    const txDate = new Date();
    txDate.setDate(txDate.getDate() - daysAgo);

    await prisma.transaction.create({
      data: {
        type: "BILL_PAYMENT",
        profileId,
        cardId: card.id,
        transactionDate: txDate,
        customerName: profile.name,
        customerMobile: profile.mobile,
        dueAmount: paidAmt,
        paidAmountRaw: paidRaw,
        paidAmount: paidAmt,
        paymentGateway: pick(GATEWAYS),
        swipeAmountRaw: swipeRaw,
        swipeAmount: swipeAmt,
        swipeGateway: swipeAmt > 0 ? pick(GATEWAYS) : null,
        swipeDate: swipeAmt > 0 ? txDate : null,
        cardNameUsed: `${card.bankName} ${card.network} ****${card.last4}`,
        percentage: pct,
        charges,
        pendingAmount,
        totalPending: totalPendingTx,
        clearedAmount: cleared,
        afterClearPending: afterClear,
        extraSwiped: 0,
        extraSwipedPercent: 0,
        extraSwipedCharges: 0,
        balanceToCustomer: 0,
        siteCharges: 0,
        profit,
        status: isPending ? (afterClear > totalPendingTx * 0.5 ? "PENDING" : "PENDING") : "CLEARED",
        customerConduct: isPending ? "PENDING" : "GOOD",
        pendingHeldBy: isPending ? pick(HELD_BY) : null,
        chargesSentType: pick(["cash", "online", "adjusted"]),
        remarks: Math.random() > 0.7 ? "Customer confirmed via WhatsApp." : null,
        createdById: pick([admin, ...employees]).id,
      },
    });
  }
  console.log(`✅ Created 120 bill payment transactions (₹${totalPending.toFixed(2)} pending)`);

  // ─── Card Swipe Transactions ────────────────────────────────────────────────
  for (let i = 0; i < 50; i++) {
    const card = pick(cards);
    const profile = await prisma.profile.findUnique({ where: { id: card.profileId } });
    if (!profile) continue;
    const swipeAmt = randInt(10, 100) * 1000;
    const pct = card.pct;
    const charges = round2((swipeAmt * pct) / 100);
    const netToCustomer = round2(swipeAmt - charges);
    const sent = Math.random() > 0.4 ? round2(netToCustomer * (Math.random() * 0.7 + 0.3)) : 0;
    const pendingToCustomer = round2(netToCustomer - sent);

    const daysAgo = randInt(0, 30);
    const txDate = new Date();
    txDate.setDate(txDate.getDate() - daysAgo);

    await prisma.transaction.create({
      data: {
        type: "CARD_SWIPE",
        profileId: card.profileId,
        cardId: card.id,
        transactionDate: txDate,
        customerName: profile.name,
        customerMobile: profile.mobile,
        paidAmount: swipeAmt,
        swipeAmount: swipeAmt,
        cardNameUsed: `${card.bankName} ${card.network} ****${card.last4}`,
        percentage: pct,
        charges,
        pendingAmount: 0,
        totalPending: 0,
        afterClearPending: 0,
        sentToCustomer: sent,
        pendingToCustomer,
        profit: charges,
        status: pendingToCustomer < 0.01 ? "CLEARED" : "PENDING",
        customerConduct: pendingToCustomer < 0.01 ? "GOOD" : "PENDING",
        createdById: pick([admin, ...employees]).id,
      },
    });
  }
  console.log("✅ Created 50 card swipe transactions");

  // ─── Daily Reports ──────────────────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const opening = {
      cash: randInt(50, 200) * 1000,
      phonepay: randInt(20, 100) * 1000,
      pay1: randInt(10, 80) * 1000,
      paybijili: randInt(5, 50) * 1000,
      paymama: randInt(5, 50) * 1000,
      softpay: randInt(0, 30) * 1000,
      roinet: randInt(0, 30) * 1000,
      other: 0,
    };
    const closing = {
      cash: randInt(50, 200) * 1000,
      phonepay: randInt(20, 100) * 1000,
      pay1: randInt(10, 80) * 1000,
      paybijili: randInt(5, 50) * 1000,
      paymama: randInt(5, 50) * 1000,
      softpay: randInt(0, 30) * 1000,
      roinet: randInt(0, 30) * 1000,
      other: 0,
    };
    const sumO = Object.values(opening).reduce((a, b) => a + b, 0);
    const sumC = Object.values(closing).reduce((a, b) => a + b, 0);
    const pendings = randInt(10, 100) * 1000;

    const txDate = new Date();
    txDate.setDate(txDate.getDate() - i);

    const placeholderProfile = await prisma.profile.findFirst();
    if (!placeholderProfile) continue;

    await prisma.transaction.create({
      data: {
        type: "DAILY_REPORT",
        profileId: placeholderProfile.id,
        transactionDate: txDate,
        customerName: "Daily Report",
        customerMobile: "0000000000",
        percentage: 0,
        charges: 0,
        pendingAmount: 0,
        totalPending: 0,
        afterClearPending: 0,
        walletOpeningJson: JSON.stringify(opening),
        walletClosingJson: JSON.stringify(closing),
        walletPendings: pendings,
        walletTotal: sumC + pendings,
        walletDifference: sumO - sumC,
        status: "CLEARED",
        createdById: pick([admin, ...employees]).id,
      },
    });
  }
  console.log("✅ Created 10 daily wallet reports");

  // ─── Conduct Records ────────────────────────────────────────────────────────
  for (let i = 0; i < 25; i++) {
    const pid = pick(profileIds);
    const conductType: ConductType = Math.random() > 0.5 ? "GOOD" : "PENDING";
    await prisma.conductRecord.create({
      data: {
        profileId: pid,
        conductType,
        pendingAmount: conductType === "PENDING" ? randInt(5, 100) * 1000 : 0,
        clearedAmount: conductType === "GOOD" ? randInt(10, 200) * 1000 : 0,
        flaggedById: pick([admin, ...employees]).id,
        flaggedAt: new Date(),
      },
    });
  }
  console.log("✅ Created 25 conduct records");

  // ─── Fraud Customers ────────────────────────────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const submitted = i < 3;
    await prisma.fraudCustomer.create({
      data: {
        mobile: randMobile(),
        name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        cardDetails: `${pick(BANKS)} ****${randInt(1000, 9999)}`,
        cardPhotoUrls: [],
        remarks: "Reported for chargeback dispute.",
        isSubmitted: submitted,
        submittedAt: submitted ? new Date() : null,
        createdById: pick([admin, ...employees]).id,
      },
    });
  }
  console.log("✅ Created 5 fraud customers");

  // ─── Bank accounts ──────────────────────────────────────────────────────────
  await prisma.bankAccount.createMany({
    data: [
      {
        bankName: "HDFC",
        accountNumber: "50100123456789",
        ifscCode: "HDFC0001234",
        accountHolder: "Operations Account",
        isPrimary: true,
        isActive: true,
        createdById: admin.id,
      },
      {
        bankName: "ICICI",
        accountNumber: "0231012345678",
        ifscCode: "ICIC0002310",
        accountHolder: "Settlement Account",
        isPrimary: false,
        isActive: true,
        createdById: admin.id,
      },
    ],
  });

  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Login credentials:");
  console.log("   Admin:    9999999999 / admin@123");
  console.log("   Employee: 9000000001 / emp@123");
  console.log("   Employee: 9000000002 / emp@123");
  console.log("   Employee: 9000000003 / emp@123");
}

// ─── ADDED v1.3: Card number backfill ──────────────────────────────────────
// Decrypts cardNumberEncrypted into cardNumberFull (plain text) for cards added
// before v1.3. Guarded by RUN_CARD_BACKFILL=true env var.
//
// Usage:
//   RUN_CARD_BACKFILL=true npm run db:seed
//
async function backfillCardNumbers() {
  if (process.env.RUN_CARD_BACKFILL !== "true") {
    return;
  }

  console.log("\n🔧 Running card number backfill (RUN_CARD_BACKFILL=true)…");

  const { tryDecrypt } = await import("../lib/crypto");

  const cardsNeedingBackfill = await prisma.card.findMany({
    where: {
      cardNumberFull: null,
      cardNumberEncrypted: { not: null },
    },
    select: { id: true, cardNumberEncrypted: true, cardNumberLast4: true },
  });

  console.log(`   Found ${cardsNeedingBackfill.length} card(s) needing backfill.`);

  let ok = 0;
  let failed = 0;
  for (const c of cardsNeedingBackfill) {
    if (!c.cardNumberEncrypted) continue;
    const plain = tryDecrypt(c.cardNumberEncrypted);
    if (!plain) {
      failed++;
      continue;
    }
    await prisma.card.update({
      where: { id: c.id },
      data: { cardNumberFull: plain },
    });
    ok++;
  }

  console.log(`   ✅ Backfilled ${ok} card(s); ❌ ${failed} failed (decryption error).`);
}

main()
  .then(() => backfillCardNumbers())
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
