// `Product` is the *team/segment* level the app operates at (the dashboard
// product filter, the account/lead `product` field). The block decision, though,
// is at *exact product* granularity — see `ExactProduct` and `PRODUCT_CATALOG`
// below. Keep this type: the UI and worklist filter depend on it.
export type Product = "Intacct" | "X3" | "BMS" | "S50" | "CRE" | "SSG";

export interface ProductInfo {
  id: Product;
  label: string;
  description: string;
}

/**
 * Which source system holds a product's *customer* record (three-system
 * de-dupe). Intacct-SF products (Sage Intacct, Sage Intacct Construction) match
 * against Intacct Salesforce; everything else matches against SAP Fusion. Leads
 * always originate in GMO Salesforce regardless.
 */
export type CustomerSystem = "GMO" | "Intacct" | "Fusion";

/**
 * The exact product a lead/account is worked for. Identity carries the *full*
 * name because names collide across segments — "Sage 100" (BMS) vs "Sage 100
 * Contractor" (CRE), "Sage 300" (BMS) vs "Sage 300 Construction & Real Estate"
 * (CRE) — and the block decision is exact-product, so a coarse segment label
 * would wrongly block a genuine cross-sell.
 */
export type ExactProduct =
  | "Sage Intacct"
  | "Sage Intacct Construction"
  | "Sage X3"
  | "Sage 300 Construction & Real Estate"
  | "Sage 100 Contractor"
  | "Sage 100"
  | "Sage 300"
  | "Sage 50"
  | "Sage Fixed Assets"
  | "Sage HRMS"
  | "Sage Timeslips"
  | "Sage CRM"
  | "Sage BusinessVision"
  | "Sage BusinessWorks"
  | "Sage Budgeting & Planning";

export interface ProductCatalogEntry {
  product: ExactProduct;
  /** Team/segment this exact product rolls up to (the `Product` enum). */
  segment: Product;
  /**
   * System that holds this product's customer record. CRE is a *split* team:
   * Sage Intacct Construction customers live in Intacct SF, while the other two
   * CRE products live in Fusion — so this map is per *product*, not per team.
   */
  customerSystem: CustomerSystem;
}

// Product -> team (segment) -> customer-system catalog. Confirmed with the
// business (see docs/DEDUPE-CONVEX-HANDOFF.md §3.2).
export const PRODUCT_CATALOG: ProductCatalogEntry[] = [
  { product: "Sage Intacct", segment: "Intacct", customerSystem: "Intacct" },
  // CRE is split: Construction lives in Intacct SF, the rest in Fusion.
  { product: "Sage Intacct Construction", segment: "CRE", customerSystem: "Intacct" },
  { product: "Sage 300 Construction & Real Estate", segment: "CRE", customerSystem: "Fusion" },
  { product: "Sage 100 Contractor", segment: "CRE", customerSystem: "Fusion" },
  { product: "Sage X3", segment: "X3", customerSystem: "Fusion" },
  { product: "Sage 100", segment: "BMS", customerSystem: "Fusion" },
  { product: "Sage 300", segment: "BMS", customerSystem: "Fusion" },
  { product: "Sage 50", segment: "S50", customerSystem: "Fusion" },
  { product: "Sage Fixed Assets", segment: "SSG", customerSystem: "Fusion" },
  { product: "Sage HRMS", segment: "SSG", customerSystem: "Fusion" },
  { product: "Sage Timeslips", segment: "SSG", customerSystem: "Fusion" },
  { product: "Sage CRM", segment: "SSG", customerSystem: "Fusion" },
  { product: "Sage BusinessVision", segment: "SSG", customerSystem: "Fusion" },
  { product: "Sage BusinessWorks", segment: "SSG", customerSystem: "Fusion" },
  { product: "Sage Budgeting & Planning", segment: "SSG", customerSystem: "Fusion" },
];

const CATALOG_BY_PRODUCT = new Map(PRODUCT_CATALOG.map((e) => [e.product, e]));

/** Team/segment an exact product rolls up to; null for an unknown product. */
export function segmentForProduct(product: ExactProduct): Product | null {
  return CATALOG_BY_PRODUCT.get(product)?.segment ?? null;
}

/** Source system that holds a product's customer record. */
export function customerSystemForProduct(product: ExactProduct): CustomerSystem | null {
  return CATALOG_BY_PRODUCT.get(product)?.customerSystem ?? null;
}

/** Exact products that roll up to a team/segment. */
export function productsForSegment(segment: Product): ExactProduct[] {
  return PRODUCT_CATALOG.filter((e) => e.segment === segment).map((e) => e.product);
}

/**
 * A representative exact product for a segment, used as the "worked product"
 * fallback when a record carries only a segment (`Product`) and no explicit
 * exact product. Single-product segments (Intacct, X3, S50) resolve exactly;
 * multi-product segments (BMS, CRE, SSG) resolve to their first catalog entry.
 */
export function defaultProductForSegment(segment: Product): ExactProduct | null {
  return productsForSegment(segment)[0] ?? null;
}

// Short codes only, no tooltips or full labels (build-plan step 1). Selecting a
// product filters the dashboard worklist (accounts and SDR leads) to records
// associated with that product line.
export const PRODUCTS: ProductInfo[] = [
  { id: "Intacct", label: "Intacct", description: "" },
  { id: "X3", label: "X3", description: "" },
  { id: "BMS", label: "BMS", description: "" },
  { id: "S50", label: "S50", description: "" },
  { id: "CRE", label: "CRE", description: "" },
  { id: "SSG", label: "SSG", description: "" },
];

export const PRODUCT_COOKIE = "product";

export function getCurrentProduct(productId: string | undefined): Product {
  return PRODUCTS.find((p) => p.id === productId)?.id ?? "Intacct";
}
