export type Product = "Intacct" | "BMS" | "S50" | "CRE" | "SSG";

export interface ProductInfo {
  id: Product;
  label: string;
  description: string;
}

// Short codes only, no tooltips or full labels (build-plan step 1). Selecting a
// product is a visual stub today — it does not yet filter the worklist.
export const PRODUCTS: ProductInfo[] = [
  { id: "Intacct", label: "Intacct", description: "" },
  { id: "BMS", label: "BMS", description: "" },
  { id: "S50", label: "S50", description: "" },
  { id: "CRE", label: "CRE", description: "" },
  { id: "SSG", label: "SSG", description: "" },
];

export const PRODUCT_COOKIE = "product";

export function getCurrentProduct(productId: string | undefined): Product {
  return PRODUCTS.find((p) => p.id === productId)?.id ?? "Intacct";
}
