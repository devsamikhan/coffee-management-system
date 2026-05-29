/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'manager' | 'barista';

export interface User {
  id: string;
  name: string;
  email?: string;
  pin: string; // 4-digit PIN for clock-in/fast auth
  role: UserRole;
  contact: string;
  hourlyWage: number;
  active: boolean;
}

export interface ModifierOption {
  name: string;
  price: number;
}

export interface ModifierGroup {
  name: string; // e.g., "Milk Alternative", "Extra Shot", "Size"
  required: boolean;
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Coffee' | 'Tea' | 'Cold Drinks' | 'Bakery' | 'Food' | 'Retail';
  imageUrl: string;
  isAvailable: boolean;
  modifiers: ModifierGroup[];
}

export interface Ingredient {
  id: string;
  name: string;
  stockLevel: number;
  unit: 'ml' | 'g' | 'pieces' | 'oz';
  lowStockThreshold: number;
  supplierName?: string;
  supplierContact?: string;
  lastRestocked?: string;
}

export interface RecipeRequirement {
  ingredientId: string;
  quantity: number; // Deducted on order completion
}

export interface MenuItemRecipe {
  menuItemId: string;
  requirements: RecipeRequirement[];
}

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number; // base price + modifiers at time of order
  selectedModifiers: {
    groupName: string;
    optionName: string;
    price: number;
  }[];
}

export interface Order {
  id: string;
  timestamp: string; // ISO string
  items: OrderItem[];
  customerId?: string; // Optional linked loyalty customer
  subtotal: number;
  tax: number;
  discount: {
    type: 'percentage' | 'fixed';
    value: number;
    code?: string;
  } | null;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'Mobile';
  baristaId: string;
  baristaName: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  shiftDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  clockInTime?: string; // ISO string
  clockOutTime?: string; // ISO string
  totalHoursWorked?: number;
  estimatedWage?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  points: number;
  joinDate: string; // YYYY-MM-DD
}

export interface StoreSettings {
  storeName: string;
  address: string;
  taxRate: number; // e.g. 0.08 for 8%
  currency: string; // e.g. "$"
  openingHours: string;
}

export interface ActiveSession {
  token: string;
  user: {
    id: string;
    name: string;
    role: UserRole;
  };
}
