export type Product = "Intacct" | "X3";

export interface ProductInfo {
  id: Product;
  label: string;
  description: string;
}

export const PRODUCTS: ProductInfo[] = [
  { id: "Intacct", label: "Intacct", description: "" },
  { id: "X3", label: "X3", description: "" },
];

export const PRODUCT_COOKIE = "product";

export function getCurrentProduct(productId: string | undefined): Product {
  return PRODUCTS.find((p) => p.id === productId)?.id ?? "Intacct";
}
