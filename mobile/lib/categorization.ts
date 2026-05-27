import type { TransactionCategory } from "@/context/AppContext";

// ─── Category Metadata ────────────────────────────────────────────────────────

export interface CategoryMeta {
  id: TransactionCategory;
  label: string;
  emoji: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "food",          label: "Food",        emoji: "🍔", icon: "coffee",         color: "#F5A623", bgColor: "#F5A62322" },
  { id: "transport",     label: "Transport",   emoji: "🚕", icon: "navigation",     color: "#00D9C0", bgColor: "#00D9C022" },
  { id: "shopping",      label: "Shopping",    emoji: "🛍", icon: "shopping-bag",   color: "#EC4899", bgColor: "#EC489922" },
  { id: "entertainment", label: "Fun",         emoji: "🎮", icon: "music",          color: "#7B5CF7", bgColor: "#7B5CF722" },
  { id: "utilities",     label: "Bills",       emoji: "💡", icon: "zap",            color: "#F59E0B", bgColor: "#F59E0B22" },
  { id: "health",        label: "Health",      emoji: "❤️", icon: "heart",          color: "#EF4444", bgColor: "#EF444422" },
  { id: "education",     label: "Education",   emoji: "📚", icon: "book",           color: "#3B82F6", bgColor: "#3B82F622" },
  { id: "subscriptions", label: "Subs",        emoji: "📱", icon: "repeat",         color: "#8B5CF6", bgColor: "#8B5CF622" },
  { id: "betting",       label: "Betting",     emoji: "🎰", icon: "target",         color: "#DC2626", bgColor: "#DC262622" },
  { id: "rent",          label: "Rent",        emoji: "🏠", icon: "home",           color: "#059669", bgColor: "#05966922" },
  { id: "transfers",     label: "Transfer",    emoji: "💸", icon: "send",           color: "#0EA5E9", bgColor: "#0EA5E922" },
  { id: "income",        label: "Income",      emoji: "💰", icon: "trending-up",    color: "#10B981", bgColor: "#10B98122" },
  { id: "other",         label: "Other",       emoji: "📌", icon: "more-horizontal",color: "#6B7280", bgColor: "#6B728022" },
];

export function getCategoryMeta(id: TransactionCategory): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

// ─── Merchant Pattern Database ────────────────────────────────────────────────

const MERCHANT_PATTERNS: Record<TransactionCategory, string[]> = {
  transport: [
    "uber", "bolt", "taxify", "indriver", "brt", "danfo", "keke",
    "okada", "ltsc", "ride", "transport", "fuel", "petrol", "diesel",
    "bus", "taxi", "tricycle", "drop", "bikeman", "commute", "fare",
    "lasg", "molue", "metro", "rida", "maxi", "tiper",
  ],
  food: [
    "chicken republic", "kfc", "mr biggs", "biggs", "shoprite food",
    "dominos", "pizza", "sweet sensation", "yellowchilli", "mama put",
    "buka", "restaurant", "eatery", "canteen", "cafe", "coffee",
    "bakery", "suya", "shawarma", "amala", "jollof", "fried rice",
    "indomie", "noodles", "snacks", "puff puff", "chin chin",
    "meat pie", "pastry", "gelato", "ice cream", "semo", "eba", "fufu",
    "pepper soup", "ofe", "egusi", "lunch", "dinner", "breakfast",
    "food", "eat", "meal", "grill", "kitchen", "chops", "chophouse",
    "bukka", "canteen", "diner", "plates", "spoon", "fork",
    "the place", "tantalizers", "kilimanjaro", "cold stone", "marble",
  ],
  shopping: [
    "jumia", "konga", "shoprite", "mall", "market", "store",
    "fashion", "clothes", "clothing", "shoes", "sneakers", "bag",
    "accessories", "boutique", "tailoring", "fabric", "electronics",
    "gadget", "phone accessory", "amazon", "shopping", "buy",
    "purchase", "supermarket", "grocery", "items", "stuff",
    "hardware", "market", "trade fair", "commerce", "onyeka",
  ],
  entertainment: [
    "cinema", "netflix", "showmax", "movies", "bar", "club", "lounge",
    "concert", "event", "party", "games", "arena", "sports viewing",
    "karaoke", "comedy", "night out", "outing", "hang", "fun",
    "escape room", "bowling", "lekki leisure", "leisure", "amusement",
    "silverbird", "genesis cinema", "odeon",
  ],
  utilities: [
    "dstv", "gotv", "startimes", "electricity", "ibedc", "eko disco",
    "eedc", "phcn", "wifi", "internet", "broadband", "airtime",
    "data", "mtn", "airtel", "glo", "9mobile", "etisalat", "water",
    "gas", "bill", "utility", "power", "nepa", "ekedc", "phed",
    "bedc", "kedco", "jedc", "aedc", "phcl",
  ],
  health: [
    "pharmacy", "hospital", "clinic", "doctor", "medical", "drugs",
    "vitamins", "chemist", "wellness", "health", "dentist", "optician",
    "lab test", "scan", "surgery", "treatment", "medplus", "alpha",
    "healthplus", "drugstoc", "drug", "cream", "painkiller", "infirmary",
  ],
  education: [
    "school fees", "tuition", "course", "textbook", "stationery",
    "exam", "lesson", "tutorial", "waec", "jamb", "ielts", "toefl",
    "certification", "training", "workshop", "university", "college",
    "polytechnic", "study", "learning", "class", "seminar", "conference",
    "udemy", "coursera", "khan", "printing", "photocopy",
  ],
  subscriptions: [
    "netflix", "spotify", "apple music", "amazon prime", "showmax",
    "hbo", "canva", "chatgpt", "adobe", "youtube premium", "github",
    "dropbox", "icloud", "subscription", "monthly plan", "annual plan",
    "saas", "membership", "premium", "pro plan",
  ],
  betting: [
    "sportybet", "bet9ja", "1xbet", "betway", "nairabet", "melbet",
    "mybookie", "naijabet", "betbonanza", "msport", "22bet",
    "betting", "bet", "gambling", "casino", "lottery", "raffle", "wager",
    "merrybet", "accessbet", "cloudbet",
  ],
  rent: [
    "rent", "house rent", "apartment", "landlord", "agent fee",
    "caution", "legal", "accommodation", "hostel", "lodge", "housing",
    "agency", "tenancy", "property", "estate", "renter",
  ],
  transfers: [
    "transfer", "sent to", "send money", "bank transfer", "payment to",
    "wire", "remittance", "moved to", "credit to", "debit to",
    "person", "john", "mary", "ade", "emeka", "chidi", "amaka", "tunde",
    "fola", "simi", "david", "grace", "faith", "blessing",
  ],
  income: [
    "salary", "freelance", "payment received", "income", "revenue",
    "commission", "bonus", "dividend", "profit", "earnings",
    "credit", "refund", "cashback", "award", "prize", "grant",
    "allowance", "stipend", "royalty", "upwork", "fiverr",
  ],
  other: [],
};

// ─── Classification Engine ────────────────────────────────────────────────────

export interface ClassificationResult {
  category: TransactionCategory;
  confidence: number;
  alternatives: Array<{ category: TransactionCategory; confidence: number }>;
  source: "memory" | "pattern" | "fallback";
}

export function classifyTransaction(
  description: string,
  merchantMemory: Record<string, TransactionCategory>
): ClassificationResult {
  const lower = description.toLowerCase().trim();

  // 1. Check merchant memory first — highest priority
  for (const [merchant, category] of Object.entries(merchantMemory)) {
    if (lower === merchant || lower.includes(merchant) || merchant.includes(lower)) {
      return { category, confidence: 99, alternatives: [], source: "memory" };
    }
  }

  // 2. Score all categories via pattern matching
  const scores: Array<{ category: TransactionCategory; score: number }> = [];

  for (const [cat, patterns] of Object.entries(MERCHANT_PATTERNS)) {
    const category = cat as TransactionCategory;
    if (category === "other" || patterns.length === 0) continue;

    let score = 0;
    for (const pattern of patterns) {
      if (lower === pattern) {
        score += 100;
      } else if (lower.startsWith(pattern + " ") || lower.endsWith(" " + pattern)) {
        score += 85;
      } else if (lower.includes(pattern)) {
        score += 60 + (pattern.length / Math.max(lower.length, 1)) * 30;
      } else if (pattern.split(" ").every((word) => lower.includes(word))) {
        score += 50;
      }
    }

    if (score > 0) {
      scores.push({ category, score });
    }
  }

  if (scores.length === 0) {
    return { category: "other", confidence: 12, alternatives: [], source: "fallback" };
  }

  scores.sort((a, b) => b.score - a.score);

  const maxScore = scores[0].score;
  const confidence = Math.min(94, Math.round(35 + (maxScore / 120) * 60));

  return {
    category: scores[0].category,
    confidence,
    alternatives: scores.slice(1, 4).map((s) => ({
      category: s.category,
      confidence: Math.min(88, Math.round(30 + (s.score / 120) * 55)),
    })),
    source: "pattern",
  };
}

// ─── Confidence Thresholds ────────────────────────────────────────────────────

export const CONFIDENCE = {
  HIGH: 80,    // Auto-categorize silently
  MEDIUM: 55,  // Show "Looks like X? Correct?"
  LOW: 0,      // Show full category picker
} as const;

export function getConfidenceLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= CONFIDENCE.HIGH) return "high";
  if (confidence >= CONFIDENCE.MEDIUM) return "medium";
  return "low";
}

// ─── AI Note Generator ────────────────────────────────────────────────────────

export function generateAINote(
  category: TransactionCategory,
  amount: number,
  avgAmount: number,
  budgetPct: number
): string | null {
  if (budgetPct >= 100) return `${category} budget exceeded this month`;
  if (budgetPct >= 85) return `${Math.round(budgetPct)}% of ${category} budget used`;
  if (avgAmount > 0 && amount < avgAmount * 0.75) return `Less than usual for ${category}`;
  if (avgAmount > 0 && amount > avgAmount * 1.5) return `More than usual for ${category}`;
  return null;
}
