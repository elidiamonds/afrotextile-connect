import { Product } from "@/types";
import { products } from "@/data/mock";

export type TrendSignalType = "street note" | "maker pulse" | "editorial cue";
export type TrendSignalStatus = "inbox" | "approved" | "snoozed" | "dismissed";

export interface TrendSignal {
  id: string;
  dedupeKey: string;
  eyebrow: string;
  title: string;
  note: string;
  source: "Curated fallback";
  sourceDetail: "Pinterest unavailable";
  type: TrendSignalType;
  tags: string[];
  productId?: string;
  image: string;
}

export interface TrendDecision {
  status: Exclude<TrendSignalStatus, "inbox">;
  updatedAt: string;
}

export const TREND_DESK_STORAGE_KEY = "afrotextile-trend-desk-decisions-v1";
// Change this one public URL to switch the board shown in the Trend Desk.
export const NIGERIAN_FASHION_PINTEREST_BOARD =
  "https://www.pinterest.com/maryodiaseugbo/nigeria-fashion/";

const nigerianProducts = products.filter((product) => product.category === "Nigerian Styles");

const productImage = (id: string) => nigerianProducts.find((product) => product.id === id)?.images[0] ?? "";

export const curatedTrendSignals: TrendSignal[] = [
  {
    id: "lagos-quiet-luxury-01",
    dedupeKey: "lagos-quiet-luxury",
    eyebrow: "Lagos, 07:40",
    title: "Ceremonial volume, edited down",
    note: "The strongest Nigerian tailoring story right now is less about adding more and more about one generous shape. Keep the Agbada shoulder, then let the rest of the look breathe.",
    source: "Curated fallback",
    sourceDetail: "Pinterest unavailable",
    type: "street note",
    tags: ["Agbada", "modern heirloom", "occasion"],
    productId: "9",
    image: productImage("9"),
  },
  {
    id: "lagos-indigo-02",
    dedupeKey: "lagos-indigo",
    eyebrow: "Colour desk",
    title: "Indigo is doing the quiet work",
    note: "A deep, inky blue is showing up as the grounding note against ivory, gold and warm skin tones. It reads considered without asking for attention.",
    source: "Curated fallback",
    sourceDetail: "Pinterest unavailable",
    type: "editorial cue",
    tags: ["indigo", "Aso-Oke", "tonal"],
    productId: "9",
    image: productImage("9"),
  },
  {
    id: "lagos-iro-buba-03",
    dedupeKey: "iro-buba-recut",
    eyebrow: "Silhouette file",
    title: "Iro & Buba, with a sharper point of view",
    note: "The classic pairing is moving beyond ceremony. A sculptural sleeve or a precise hem gives the set a place in a weekday wardrobe, too.",
    source: "Curated fallback",
    sourceDetail: "Pinterest unavailable",
    type: "maker pulse",
    tags: ["Iro & Buba", "sculptural", "day-to-night"],
    productId: "10",
    image: productImage("10"),
  },
  {
    id: "lagos-aso-ebi-04",
    dedupeKey: "cobalt-aso-ebi",
    eyebrow: "Occasion edit",
    title: "Cobalt is the new wedding-weekend signal",
    note: "For the full weekend wardrobe, saturated cobalt brings the energy. Pair dimensional lace with a cleaner base so the texture has room to land.",
    source: "Curated fallback",
    sourceDetail: "Pinterest unavailable",
    type: "street note",
    tags: ["Aso Ebi", "cobalt", "lace"],
    productId: "11",
    image: productImage("11"),
  },
  {
    id: "lagos-isi-agu-05",
    dedupeKey: "isi-agu-tailoring",
    eyebrow: "Tailoring note",
    title: "Isi Agu leaves the ceremony",
    note: "The graphic rhythm of Isi Agu works especially well when it is cut into one decisive jacket. Treat it like a wardrobe anchor, not a costume cue.",
    source: "Curated fallback",
    sourceDetail: "Pinterest unavailable",
    type: "maker pulse",
    tags: ["Isi Agu", "tailoring", "graphic"],
    productId: "12",
    image: productImage("12"),
  },
  {
    id: "lagos-gold-detail-06",
    dedupeKey: "gold-thread-detail",
    eyebrow: "Finishings",
    title: "Let one gold detail carry the look",
    note: "A single line of gold embroidery is enough to make a look feel occasion-ready. The edit is restraint: one glint, beautifully placed.",
    source: "Curated fallback",
    sourceDetail: "Pinterest unavailable",
    type: "editorial cue",
    tags: ["goldwork", "finishings", "restraint"],
    productId: "12",
    image: productImage("12"),
  },
];

export const dedupeTrendSignals = (signals: TrendSignal[]) => {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    if (seen.has(signal.dedupeKey)) return false;
    seen.add(signal.dedupeKey);
    return true;
  });
};

export const getNigerianProduct = (productId?: string): Product | undefined =>
  nigerianProducts.find((product) => product.id === productId);