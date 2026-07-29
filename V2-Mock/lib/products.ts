export type Product = "Intacct" | "X3" | "BMS" | "S50" | "CRE" | "SSG";

export interface ProductInfo {
  id: Product;
  label: string;
  description: string;
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
