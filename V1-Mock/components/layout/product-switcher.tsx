"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCTS, type Product } from "@/lib/products";

export function ProductSwitcher({ currentProduct }: { currentProduct: Product }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(product: string | null) {
    if (!product) return;
    setPending(true);
    await fetch("/api/product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product }),
    });
    setPending(false);
    router.refresh();
  }

  const currentLabel = PRODUCTS.find((p) => p.id === currentProduct)?.label ?? PRODUCTS[0].label;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">Product:</span>
      <Select value={currentProduct} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger
          size="sm"
          className="w-auto rounded-full border-white/15 bg-transparent px-3 hover:bg-white/5"
        >
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PRODUCTS.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              <div className="flex flex-col">
                <span>{product.label}</span>
                {product.description && (
                  <span className="text-xs text-muted-foreground">{product.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
