export type Category = 'live' | 'boiled' | 'spices';

export interface Product {
  id: string;
  name: string;
  category: Category;
  size: string; // e.g. "20-30 г/шт"
  price: number; // price per kg or piece
  unit: 'кг' | 'шт';
  description: string;
  imageUrl: string;
  available: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  prepType: 'live' | 'boiled'; // boiled might add an extra fee per kg
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryMethod: 'courier' | 'pickup';
  address: string;
  items: {
    productName: string;
    quantity: number;
    unit: string;
    prepType: 'live' | 'boiled';
    price: number;
  }[];
  totalPrice: number;
  status: 'pending' | 'preparing' | 'delivered';
  createdAt: string;
}
