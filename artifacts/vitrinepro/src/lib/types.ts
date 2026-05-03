import { Product } from "@workspace/api-zod";

export interface CartItem {
  product: Product;
  quantity: number;
}
