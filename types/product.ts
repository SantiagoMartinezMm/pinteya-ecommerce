export interface Product {
  id: string;
  name: string;
  code: string;
  image: string;
  price: number;
  originalPrice?: number;
  description: string;
  category: string;
  brand: string;
  sku: string;
  stock: number;
  features: string[];
  images: string[];
}
