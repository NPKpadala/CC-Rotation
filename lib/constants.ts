// ─── Banks ────────────────────────────────────────────────────────────
// v1.2: extended list. "OTHER" lets the user enter a custom bank name.
export const BANK_NAMES = [
  "SBI",
  "ICICI",
  "HDFC",
  "AXIS",
  "BANK_OF_BARODA",
  "HSBC",
  "KOTAK_MAHINDRA",
  "IDBI",
  "IDFC",
  "RBL",
  "INDUSIND",
  "BANK_OF_INDIA",
  "AMERICAN_EXPRESS",
  "PUNJAB_NATIONAL",
  "YES_BANK",
  "AU_SMALL_FINANCE",
  "ONE_BOB",
  "DBS",
  "FEDERAL",
  "INDIAN_BANK",
  "SBM",
  "UNION_BANK",
  "CANARA",
  "OTHER",
] as const;

export type BankName = (typeof BANK_NAMES)[number];

export const BANK_LABELS: Record<string, string> = Object.fromEntries(
  BANK_NAMES.map((b) => [b, b.replace(/_/g, " ")])
);

// ─── Payment gateways ────────────────────────────────────────────────
// v1.2: extended list. "OTHER" lets user enter a custom gateway name.
export const PAYMENT_GATEWAYS = [
  "PAY1",
  "PAY_BIJILI",
  "PAYMAMA",
  "SOFT_PAY",
  "ROI_NET",
  "INSTANT_MUDRA",
  "GREEN_PAY",
  "PAY_KARTHIK",
  "CHOTAPAY",
  "PAY_JAS",
  "MOS",
  "NTAR",
  "IOB",
  "HDFC",
  "YES_BANK",
  "CANARA_BANK",
  "OTHER",
] as const;

export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];

export const CHARGES_SENT_TYPES = ["cash", "online", "adjusted"] as const;
export type ChargesSentType = (typeof CHARGES_SENT_TYPES)[number];

export const WALLET_PROVIDERS = [
  "cash",
  "phonepay",
  "pay1",
  "paybijili",
  "paymama",
  "softpay",
  "roinet",
  "other",
] as const;
export type WalletProvider = (typeof WALLET_PROVIDERS)[number];

export const CARD_NETWORK_LABELS: Record<string, string> = {
  VISA: "Visa",
  RUPAY: "RuPay",
  MASTERCARD: "MasterCard",
  HDFC_RUPAY: "HDFC RuPay",
  HDFC_MASTER: "HDFC MasterCard",
  DINERS_CLUB: "Diners Club",
  AMERICAN_EXPRESS: "American Express",
  OTHER: "Other",
};

export const CARD_TYPE_LABELS: Record<string, string> = {
  DOMESTIC: "Domestic",
  BUSINESS: "Business",
  INTERNATIONAL: "International",
};

export const PAGE_SIZE = 20;
