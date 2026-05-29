/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { 
  User, MenuItem, Ingredient, MenuItemRecipe, Order, Shift, Customer, StoreSettings, UserRole, OrderItem 
} from '../types';

// Storage file path.
// Vercel serverless Lambdas run on a read-only filesystem — the ONLY
// guaranteed writable directory is /tmp (os.tmpdir()). All other paths
// throw EROFS on write, crashing the runtime with a 500.
const DB_FILE = process.env.VERCEL
  ? path.join(os.tmpdir(), 'server-db-store.json')
  : path.join(process.cwd(), 'src', 'server-db-store.json');

// Interface for database structure
interface DatabaseSchema {
  users: User[];
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  recipes: MenuItemRecipe[];
  orders: Order[];
  shifts: Shift[];
  customers: Customer[];
  settings: StoreSettings;
  alerts: { id: string; timestamp: string; message: string; type: 'low-stock' | 'system' }[];
}

// Simple deterministic ID helper
function generateId() {
  return crypto.randomBytes(4).toString('hex');
}

// Password hashing helper using standard Node crypto (scrypt/sha256)
export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "The Daily Grind Coffee Co.",
  address: "456 Espresso Blvd, Seattle, WA 98101",
  taxRate: 0.08, // 8%
  currency: "PKR ",
  openingHours: "Mon-Fri: 6:00 AM - 6:00 PM, Sat-Sun: 7:00 AM - 5:00 PM"
};

const INITIAL_USERS: User[] = [
  {
    id: "emp-1",
    name: "Alex Anderson (Admin)",
    email: "admin@dailygrind.com",
    pin: hashPin("9999"), // Admin PIN
    role: 'admin',
    contact: "555-0100",
    hourlyWage: 25.0,
    active: true
  },
  {
    id: "emp-2",
    name: "Elena Rostova (Manager)",
    email: "elena@dailygrind.com",
    pin: hashPin("2222"),
    role: 'manager',
    contact: "555-0102",
    hourlyWage: 19.5,
    active: true
  },
  {
    id: "emp-3",
    name: "Jordan Smith (Barista)",
    email: "jordan@dailygrind.com",
    pin: hashPin("1111"),
    role: 'barista',
    contact: "555-0103",
    hourlyWage: 15.5,
    active: true
  },
  {
    id: "emp-4",
    name: "Taylor Reed (Barista)",
    email: "taylor@dailygrind.com",
    pin: hashPin("3333"),
    role: 'barista',
    contact: "555-0104",
    hourlyWage: 15.0,
    active: true
  }
];

const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: "ing-1", name: "Premium Espresso Beans", stockLevel: 3200, unit: "g", lowStockThreshold: 1000, supplierName: "Rainier Roasters", supplierContact: "orders@rainierroasters.com", lastRestocked: "2026-05-20" },
  { id: "ing-2", name: "Whole Milk", stockLevel: 4200, unit: "ml", lowStockThreshold: 2000, supplierName: "Emerald Dairy", supplierContact: "delivery@emeralddairy.com", lastRestocked: "2026-05-28" },
  { id: "ing-3", name: "Oat Milk (Barista Ed.)", stockLevel: 3600, unit: "ml", lowStockThreshold: 1500, supplierName: "Oat-Ly Dist.", supplierContact: "dist@oatly.com", lastRestocked: "2026-05-25" },
  { id: "ing-4", name: "Almond Milk", stockLevel: 800, unit: "ml", lowStockThreshold: 1000, supplierName: "Almond Breeze Corp", supplierContact: "rep@almondbreeze.com", lastRestocked: "2026-05-24" },
  { id: "ing-5", name: "Matcha green tea powder", stockLevel: 250, unit: "g", lowStockThreshold: 100, supplierName: "Uji Imports", supplierContact: "tea@ujiimports.com", lastRestocked: "2026-05-18" },
  { id: "ing-6", name: "Organic Vanilla Syrup", stockLevel: 1500, unit: "ml", lowStockThreshold: 500, supplierName: "Sweetwater Syrups", supplierContact: "sales@sweetwatersyrups.com", lastRestocked: "2026-05-15" },
  { id: "ing-7", name: "ToGo Cups & Lids (8oz)", stockLevel: 45, unit: "pieces", lowStockThreshold: 50, supplierName: "GreenPack Dist.", supplierContact: "pack@greenpack.com", lastRestocked: "2026-05-22" },
  { id: "ing-8", name: "ToGo Cups & Lids (12oz)", stockLevel: 120, unit: "pieces", lowStockThreshold: 100, supplierName: "GreenPack Dist.", supplierContact: "pack@greenpack.com", lastRestocked: "2026-05-22" },
  { id: "ing-9", name: "Pastry Napkins", stockLevel: 650, unit: "pieces", lowStockThreshold: 200, supplierName: "GreenPack Dist.", supplierContact: "pack@greenpack.com", lastRestocked: "2026-05-22" },
  { id: "ing-10", name: "Butter Croissants (Baked)", stockLevel: 8, unit: "pieces", lowStockThreshold: 10, supplierName: "Solstice Bakery", supplierContact: "solsticebakery@bakery.com", lastRestocked: "2026-05-29" },
  { id: "ing-11", name: "Chocolate Fudge Cookies", stockLevel: 12, unit: "pieces", lowStockThreshold: 10, supplierName: "Solstice Bakery", supplierContact: "solsticebakery@bakery.com", lastRestocked: "2026-05-29" }
];

const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: "menu-1",
    name: "Classic Espresso Shot",
    description: "Our signature blend espresso. Rich, sweet crema with notes of chocolate and berries.",
    price: 3.25,
    category: 'Coffee',
    imageUrl: "https://images.unsplash.com/photo-1510707513156-4768658079a3?w=400&auto=format&fit=crop&q=60",
    isAvailable: true,
    modifiers: [
      {
        name: "Espresso Shots",
        required: false,
        options: [
          { name: "Single Shot", price: 0 },
          { name: "Double Shot (Standard)", price: 0.75 },
          { name: "Triple Shot", price: 1.50 }
        ]
      }
    ]
  },
  {
    id: "menu-2",
    name: "Caffè Latte",
    description: "Perfect layer of steamed milk and espresso topped with a delicate touch of foam.",
    price: 4.50,
    category: 'Coffee',
    imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=60",
    isAvailable: true,
    modifiers: [
      {
        name: "Milk Selection",
        required: true,
        options: [
          { name: "Whole Milk (Standard)", price: 0 },
          { name: "Oat Milk Alternative", price: 0.60 },
          { name: "Almond Milk Alternative", price: 0.60 }
        ]
      },
      {
        name: "Syrup Add-ins",
        required: false,
        options: [
          { name: "Vanilla Syrup", price: 0.50 },
          { name: "Caramel Drizzle", price: 0.50 }
        ]
      },
      {
        name: "Size",
        required: true,
        options: [
          { name: "Regular (8oz)", price: 0 },
          { name: "Large (12oz)", price: 0.85 }
        ]
      }
    ]
  },
  {
    id: "menu-3",
    name: "Matcha Zen Latte",
    description: "Premium stone-ground green tea whisked with rich steamed milk for the perfect balance.",
    price: 4.95,
    category: 'Tea',
    imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=60",
    isAvailable: true,
    modifiers: [
      {
        name: "Milk Selection",
        required: true,
        options: [
          { name: "Whole Milk", price: 0 },
          { name: "Oat Milk Alternative", price: 0.60 },
          { name: "Almond Milk Alternative", price: 0.60 }
        ]
      },
      {
        name: "Sweetness",
        required: false,
        options: [
          { name: "Unsweetened (Standard)", price: 0 },
          { name: "Light Honey Sweetener", price: 0.30 },
          { name: "Sweet", price: 0.30 }
        ]
      }
    ]
  },
  {
    id: "menu-4",
    name: "Iced Passionfruit Fizz",
    description: "Sparkling botanical infusion brewed with hibiscus, passionfruit slices, and chilled on ice.",
    price: 4.25,
    category: 'Cold Drinks',
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=60",
    isAvailable: true,
    modifiers: [
      {
        name: "Sweetener Level",
        required: false,
        options: [
          { name: "Regular Sweetness", price: 0 },
          { name: "No Sugar Added", price: 0 }
        ]
      }
    ]
  },
  {
    id: "menu-5",
    name: "Butter Sourdough Croissant",
    description: "Flaky, 81-layered golden French pastry baked fresh daily in our local partnership bakery.",
    price: 3.75,
    category: 'Bakery',
    imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=60",
    isAvailable: true,
    modifiers: [
      {
        name: "Service Level",
        required: false,
        options: [
          { name: "Warmed Up", price: 0 },
          { name: "Room Temperature", price: 0 }
        ]
      }
    ]
  },
  {
    id: "menu-6",
    name: "Salted Chocolate Chunk Cookie",
    description: "Soft-baked chocolate cookie sprinkled with hand-harvested Maldon sea salt flakes.",
    price: 3.00,
    category: 'Bakery',
    imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&auto=format&fit=crop&q=60",
    isAvailable: true,
    modifiers: []
  },
  {
    id: "menu-7",
    name: "Avocado Sourdough Tartine",
    description: "Seasoned crushed avocado, cherry tomatoes, and microgreens on toasted artisanal rustic sourdough.",
    price: 8.50,
    category: 'Food',
    imageUrl: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=400&auto=format&fit=crop&q=60",
    isAvailable: true,
    modifiers: [
      {
        name: "Additions",
        required: false,
        options: [
          { name: "No Extra Topping", price: 0 },
          { name: "Add Soft Poached Egg", price: 1.50 }
        ]
      }
    ]
  }
];

const INITIAL_RECIPES: MenuItemRecipe[] = [
  {
    menuItemId: "menu-1", // Espresso shot
    requirements: [
      { ingredientId: "ing-1", quantity: 18 }, // 18g coffee
      { ingredientId: "ing-7", quantity: 1 } // ToGo Cup (8oz) or espresso cup
    ]
  },
  {
    menuItemId: "menu-2", // Caffè Latte
    requirements: [
      { ingredientId: "ing-1", quantity: 18 }, // 18g coffee
      { ingredientId: "ing-2", quantity: 200 }, // 200ml regular whole milk
      { ingredientId: "ing-8", quantity: 1 } // 12oz cup
    ]
  },
  {
    menuItemId: "menu-3", // Matcha Zen Latte
    requirements: [
      { ingredientId: "ing-5", quantity: 6 }, // 6g matcha
      { ingredientId: "ing-2", quantity: 200 }, // 200ml milk
      { ingredientId: "ing-8", quantity: 1 } // Cup
    ]
  },
  {
    menuItemId: "menu-5", // Croissant
    requirements: [
      { ingredientId: "ing-10", quantity: 1 }, // 1 Croissant
      { ingredientId: "ing-9", quantity: 1 } // 1 Napkin
    ]
  },
  {
    menuItemId: "menu-6", // Cookie
    requirements: [
      { ingredientId: "ing-11", quantity: 1 }, // 1 Cookie
      { ingredientId: "ing-9", quantity: 1 } // 1 Napkin
    ]
  }
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: "cust-1", name: "Alice Jenkins", phone: "206-555-4422", email: "alice.j@gmail.com", points: 42, joinDate: "2026-03-10" },
  { id: "cust-2", name: "Robert Cooper", phone: "206-555-8811", email: "bob.coop@yahoo.com", points: 15, joinDate: "2026-04-15" },
  { id: "cust-3", name: "Sarah Miller", phone: "206-555-1219", email: "sarahm@outlook.com", points: 110, joinDate: "2026-01-22" }
];

const INITIAL_SHIFTS: Shift[] = [
  { id: "shift-1", employeeId: "emp-3", employeeName: "Jordan Smith", shiftDate: "2026-05-29", startTime: "06:00", endTime: "14:00" },
  { id: "shift-2", employeeId: "emp-4", employeeName: "Taylor Reed", shiftDate: "2026-05-29", startTime: "12:00", endTime: "18:00" },
  { id: "shift-3", employeeId: "emp-2", employeeName: "Elena Rostova", shiftDate: "2026-05-29", startTime: "08:00", endTime: "16:00" }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: "ord-8831",
    timestamp: "2026-05-28T09:12:00Z",
    items: [
      {
        itemId: "menu-2",
        name: "Caffè Latte",
        quantity: 2,
        price: 5.10, // With Oat Milk
        selectedModifiers: [
          { groupName: "Milk Selection", optionName: "Oat Milk Alternative", price: 0.60 },
          { groupName: "Size", optionName: "Regular (8oz)", price: 0 }
        ]
      }
    ],
    customerId: "cust-1",
    subtotal: 10.20,
    tax: 0.82,
    discount: null,
    total: 11.02,
    paymentMethod: "Card",
    baristaId: "emp-3",
    baristaName: "Jordan Smith"
  },
  {
    id: "ord-8832",
    timestamp: "2026-05-28T14:45:00Z",
    items: [
      {
        itemId: "menu-3",
        name: "Matcha Zen Latte",
        quantity: 1,
        price: 4.95,
        selectedModifiers: [
          { groupName: "Milk Selection", optionName: "Whole Milk", price: 0 }
        ]
      },
      {
        itemId: "menu-5",
        name: "Butter Sourdough Croissant",
        quantity: 1,
        price: 3.75,
        selectedModifiers: [
          { groupName: "Service Level", optionName: "Warmed Up", price: 0 }
        ]
      }
    ],
    customerId: "cust-3",
    subtotal: 8.70,
    tax: 0.70,
    discount: { type: "percentage", value: 10, code: "WELCOME10" },
    total: 8.53, // (8.70 - 0.87) + 0.70
    paymentMethod: "Mobile",
    baristaId: "emp-4",
    baristaName: "Taylor Reed"
  }
];

class CoffeeShopDB {
  private db: DatabaseSchema | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.db = JSON.parse(fileContent);
      } else {
        this.writeDefaultDB();
      }
    } catch (err) {
      console.error("Failed to read database store file. Generating fresh DB seed. Error: ", err);
      this.writeDefaultDB();
    }
  }

  private writeDefaultDB() {
    const defaultData: DatabaseSchema = {
      users: INITIAL_USERS,
      menuItems: INITIAL_MENU_ITEMS,
      ingredients: INITIAL_INGREDIENTS,
      recipes: INITIAL_RECIPES,
      orders: INITIAL_ORDERS,
      shifts: INITIAL_SHIFTS,
      customers: INITIAL_CUSTOMERS,
      settings: DEFAULT_SETTINGS,
      alerts: [
        { id: "alert-1", timestamp: new Date().toISOString(), message: "ToGo Cups & Lids (8oz) is below the recommended threshold of 50 pieces.", type: "low-stock" },
        { id: "alert-2", timestamp: new Date().toISOString(), message: "Butter Croissants (Baked) is close to critical low level (8 left).", type: "low-stock" }
      ]
    };
    this.db = defaultData;
    this.save();
  }

  private save() {
    if (!this.db) return;
    try {
      const parentDir = path.dirname(DB_FILE);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (err) {
      console.error("Failed to write to file database store path: ", err);
    }
  }

  // --- Auth & Users ---
  getUsers(): User[] {
    return this.db ? this.db.users : [];
  }

  findUserByPin(pin: string): User | undefined {
    const hashed = hashPin(pin);
    return this.getUsers().find(u => u.pin === hashed && u.active);
  }

  findUserByEmail(email: string): User | undefined {
    return this.getUsers().find(u => u.email?.toLowerCase() === email.toLowerCase() && u.active);
  }

  createUser(user: Omit<User, 'id'>): User {
    const newUser: User = {
      ...user,
      id: "emp-" + generateId(),
      pin: hashPin(user.pin) // Auto-hashpin
    };
    this.db?.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id: string, updates: Partial<Omit<User, 'id'>>): User | null {
    if (!this.db) return null;
    const idx = this.db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;

    if (updates.pin && updates.pin.length === 4) {
      updates.pin = hashPin(updates.pin);
    }

    const updatedUser = { ...this.db.users[idx], ...updates } as User;
    this.db.users[idx] = updatedUser;
    
    // Also update Shift employeeName mapping if changed
    if (updates.name) {
      this.db.shifts = this.db.shifts.map(s => s.employeeId === id ? { ...s, employeeName: updates.name! } : s);
      this.db.orders = this.db.orders.map(o => o.baristaId === id ? { ...o, baristaName: updates.name! } : o);
    }

    this.save();
    return updatedUser;
  }

  deleteUser(id: string): boolean {
    if (!this.db) return false;
    const idx = this.db.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.db.users[idx].active = false; // Soft delete to keep historical sales logs
    this.save();
    return true;
  }

  // --- Menu Management ---
  getMenuItems(): MenuItem[] {
    return this.db ? this.db.menuItems : [];
  }

  createMenuItem(item: Omit<MenuItem, 'id'>): MenuItem {
    const newItem: MenuItem = {
      ...item,
      id: "menu-" + generateId()
    };
    this.db?.menuItems.push(newItem);
    this.save();
    return newItem;
  }

  updateMenuItem(id: string, updates: Partial<Omit<MenuItem, 'id'>>): MenuItem | null {
    if (!this.db) return null;
    const idx = this.db.menuItems.findIndex(m => m.id === id);
    if (idx === -1) return null;
    const updated = { ...this.db.menuItems[idx], ...updates } as MenuItem;
    this.db.menuItems[idx] = updated;
    this.save();
    return updated;
  }

  deleteMenuItem(id: string): boolean {
    if (!this.db) return false;
    this.db.menuItems = this.db.menuItems.filter(m => m.id !== id);
    // Also remove recipe associated with it
    this.db.recipes = this.db.recipes.filter(r => r.menuItemId !== id);
    this.save();
    return true;
  }

  // --- Recipes ---
  getRecipes(): MenuItemRecipe[] {
    return this.db ? this.db.recipes : [];
  }

  getRecipeForMenuItem(menuItemId: string): MenuItemRecipe | undefined {
    return this.getRecipes().find(r => r.menuItemId === menuItemId);
  }

  saveRecipe(menuItemId: string, requirements: MenuItemRecipe['requirements']) {
    if (!this.db) return;
    const idx = this.db.recipes.findIndex(r => r.menuItemId === menuItemId);
    if (idx > -1) {
      this.db.recipes[idx].requirements = requirements;
    } else {
      this.db.recipes.push({ menuItemId, requirements });
    }
    this.save();
  }

  // --- Inventory & Stock ---
  getIngredients(): Ingredient[] {
    return this.db ? this.db.ingredients : [];
  }

  createIngredient(ing: Omit<Ingredient, 'id'>): Ingredient {
    const newIngredient: Ingredient = {
      ...ing,
      id: "ing-" + generateId()
    };
    this.db?.ingredients.push(newIngredient);
    this.save();
    return newIngredient;
  }

  updateIngredient(id: string, updates: Partial<Omit<Ingredient, 'id'>>): Ingredient | null {
    if (!this.db) return null;
    const idx = this.db.ingredients.findIndex(g => g.id === id);
    if (idx === -1) return null;
    const updated = { ...this.db.ingredients[idx], ...updates } as Ingredient;
    this.db.ingredients[idx] = updated;

    // Check low stock
    this.checkSingleIngredientAlerts(updated);

    this.save();
    return updated;
  }

  deleteIngredient(id: string): boolean {
    if (!this.db) return false;
    this.db.ingredients = this.db.ingredients.filter(g => g.id !== id);
    // Remove from recipes
    this.db.recipes = this.db.recipes.map(r => ({
      ...r,
      requirements: r.requirements.filter(req => req.ingredientId !== id)
    }));
    this.save();
    return true;
  }

  private checkSingleIngredientAlerts(ingredient: Ingredient) {
    if (!this.db) return;
    const hasAlert = this.db.alerts.some(a => a.message.includes(ingredient.name));
    
    if (ingredient.stockLevel <= ingredient.lowStockThreshold) {
      if (!hasAlert) {
        this.addAlert(`Low stock warning! ${ingredient.name} is down to ${ingredient.stockLevel} ${ingredient.unit} (Threshold: ${ingredient.lowStockThreshold} ${ingredient.unit}).`, 'low-stock');
      }
    } else {
      // Clear alert if stocked back up
      this.db.alerts = this.db.alerts.filter(a => !a.message.includes(ingredient.name));
    }
  }

  // Deduct ingredients checklist when completing order
  private deductStockForOrder(items: OrderItem[]) {
    if (!this.db) return;
    
    items.forEach(orderItem => {
      // Find recipe
      const recipe = this.getRecipeForMenuItem(orderItem.itemId);
      if (!recipe) return;

      recipe.requirements.forEach(req => {
        const ingredient = this.db?.ingredients.find(i => i.id === req.ingredientId);
        if (ingredient) {
          // Total deduction: recipe quantity * item quantity ordered
          const deduction = req.quantity * orderItem.quantity;
          ingredient.stockLevel = Math.max(0, ingredient.stockLevel - deduction);
          this.checkSingleIngredientAlerts(ingredient);
        }
      });

      // Modifiers ingredient deduction helper (e.g. Oat Milk, Extra Shot)
      orderItem.selectedModifiers.forEach(mod => {
        if (mod.optionName.includes("Oat Milk")) {
          const oatMilk = this.db?.ingredients.find(i => i.name.toLowerCase().includes("oat milk"));
          if (oatMilk) {
            oatMilk.stockLevel = Math.max(0, oatMilk.stockLevel - (200 * orderItem.quantity));
            this.checkSingleIngredientAlerts(oatMilk);
          }
        } else if (mod.optionName.includes("Almond Milk")) {
          const almondMilk = this.db?.ingredients.find(i => i.name.toLowerCase().includes("almond milk"));
          if (almondMilk) {
            almondMilk.stockLevel = Math.max(0, almondMilk.stockLevel - (200 * orderItem.quantity));
            this.checkSingleIngredientAlerts(almondMilk);
          }
        } else if (mod.optionName.includes("Double Shot") || mod.optionName.includes("Extra Shot") || mod.optionName.includes("Triple")) {
          const beans = this.db?.ingredients.find(i => i.name.toLowerCase().includes("beans"));
          if (beans) {
            const addBeans = mod.optionName.includes("Triple") ? 18 : 9; // Extra 18g/9g espresso beans
            beans.stockLevel = Math.max(0, beans.stockLevel - (addBeans * orderItem.quantity));
            this.checkSingleIngredientAlerts(beans);
          }
        } else if (mod.optionName.includes("Vanilla")) {
          const vanilla = this.db?.ingredients.find(i => i.name.toLowerCase().includes("vanilla"));
          if (vanilla) {
            vanilla.stockLevel = Math.max(0, vanilla.stockLevel - (20 * orderItem.quantity)); // 20ml syrup
            this.checkSingleIngredientAlerts(vanilla);
          }
        }
      });
    });
    this.save();
  }

  // --- Shifting & Schedule ---
  getShifts(): Shift[] {
    return this.db ? this.db.shifts : [];
  }

  createShift(shift: Omit<Shift, 'id'>): Shift {
    const newShift: Shift = {
      ...shift,
      id: "shf-" + generateId()
    };
    this.db?.shifts.push(newShift);
    this.save();
    return newShift;
  }

  updateShift(id: string, updates: Partial<Omit<Shift, 'id'>>): Shift | null {
    if (!this.db) return null;
    const idx = this.db.shifts.findIndex(s => s.id === id);
    if (idx === -1) return null;
    
    const updated = { ...this.db.shifts[idx], ...updates } as Shift;

    // If clock-out is updated, process hours
    if (updated.clockInTime && updated.clockOutTime) {
      const start = new Date(updated.clockInTime);
      const end = new Date(updated.clockOutTime);
      const diffMs = end.getTime() - start.getTime();
      const diffHrs = Math.max(0, diffMs / (1000 * 60 * 60));
      updated.totalHoursWorked = parseFloat(diffHrs.toFixed(2));
      
      const employee = this.getUsers().find(u => u.id === updated.employeeId);
      if (employee) {
        updated.estimatedWage = parseFloat((updated.totalHoursWorked * employee.hourlyWage).toFixed(2));
      }
    }

    this.db.shifts[idx] = updated;
    this.save();
    return updated;
  }

  deleteShift(id: string): boolean {
    if (!this.db) return false;
    this.db.shifts = this.db.shifts.filter(s => s.id !== id);
    this.save();
    return true;
  }

  // Fast clock in via employee PIN
  employeeClockInOut(pin: string): { success: boolean; message: string; shift?: Shift } {
    const staff = this.findUserByPin(pin);
    if (!staff) {
      return { success: false, message: "Invalid PIN code." };
    }

    const todayDate = new Date().toISOString().split('T')[0];
    
    // Find active shift checking if barista is clocked in but not out
    const activeShiftIdx = this.db?.shifts.findIndex(s => 
      s.employeeId === staff.id && s.clockInTime && !s.clockOutTime
    );

    if (activeShiftIdx !== undefined && activeShiftIdx !== -1 && this.db) {
      // Clock Out
      const oldShift = this.db.shifts[activeShiftIdx];
      const clockOut = new Date().toISOString();
      const updated = this.updateShift(oldShift.id, { clockOutTime: clockOut });
      return { 
        success: true, 
        message: `${staff.name} is now clocked out. Total hours worked: ${updated?.totalHoursWorked ?? 0}`, 
        shift: updated ?? undefined
      };
    } else {
      // Clock In: Look for existing planned shift for today, otherwise create manual clock in
      let plannedShift = this.db?.shifts.find(s => 
        s.employeeId === staff.id && s.shiftDate === todayDate && !s.clockInTime
      );

      const clockIn = new Date().toISOString();
      if (plannedShift) {
        const updated = this.updateShift(plannedShift.id, { clockInTime: clockIn });
        return { 
          success: true, 
          message: `${staff.name} clocked in successfully for schedule: ${plannedShift.startTime}-${plannedShift.endTime}`, 
          shift: updated ?? undefined 
        };
      } else {
        // Create auto-scheduled shift
        const newShiftObj = this.createShift({
          employeeId: staff.id,
          employeeName: staff.name,
          shiftDate: todayDate,
          startTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          endTime: new Date(Date.now() + 8 * 3600 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), // +8 hours
          clockInTime: clockIn
        });
        return { 
          success: true, 
          message: `${staff.name} clocked in successfully (Unscheduled shifts auto-logged).`, 
          shift: newShiftObj 
        };
      }
    }
  }

  // --- Customer Database & Referral ---
  getCustomers(): Customer[] {
    return this.db ? this.db.customers : [];
  }

  createCustomer(cust: Omit<Customer, 'id' | 'points' | 'joinDate'>): Customer {
    const fresh: Customer = {
      ...cust,
      id: "cust-" + generateId(),
      points: 0,
      joinDate: new Date().toISOString().split('T')[0]
    };
    this.db?.customers.push(fresh);
    this.save();
    return fresh;
  }

  updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'joinDate'>>): Customer | null {
    if (!this.db) return null;
    const idx = this.db.customers.findIndex(c => c.id === id);
    if (idx === -1) return null;
    const updated = { ...this.db.customers[idx], ...updates } as Customer;
    this.db.customers[idx] = updated;
    this.save();
    return updated;
  }

  // --- Orders ---
  getOrders(): Order[] {
    return this.db ? this.db.orders : [];
  }

  createOrder(orderData: Omit<Order, 'id' | 'timestamp'>): Order {
    const newOrder: Order = {
      ...orderData,
      id: "ord-" + Math.floor(1000 + Math.random() * 9000), // Human-friendly invoice number
      timestamp: new Date().toISOString()
    };
    
    // Process recipe stock deductions
    this.deductStockForOrder(newOrder.items);

    // Apply loyalty points (1 point per dollar total)
    if (newOrder.customerId) {
      const loyaltyEarned = Math.floor(newOrder.total);
      const cust = this.db?.customers.find(c => c.id === newOrder.customerId);
      if (cust) {
        cust.points += loyaltyEarned;
        // Check if customer redeemed any reward points. If discount had promo "REDEEM-FREE-DRINK", subtract 80 points
        if (newOrder.discount?.code === "REDEEM-FREE-DRINK") {
          cust.points = Math.max(0, cust.points - 80);
        }
      }
    }

    this.db?.orders.push(newOrder);
    this.save();
    return newOrder;
  }

  // --- System Settings & Alerts ---
  getSettings(): StoreSettings {
    return this.db ? this.db.settings : DEFAULT_SETTINGS;
  }

  updateSettings(updates: Partial<StoreSettings>): StoreSettings {
    if (!this.db) return DEFAULT_SETTINGS;
    this.db.settings = { ...this.db.settings, ...updates };
    this.save();
    return this.db.settings;
  }

  getAlerts() {
    return this.db ? this.db.alerts : [];
  }

  addAlert(message: string, type: 'low-stock' | 'system' = 'system') {
    if (!this.db) return;
    this.db.alerts.unshift({
      id: "alert-" + generateId(),
      timestamp: new Date().toISOString(),
      message,
      type
    });
    // Cap alert log at 50
    if (this.db.alerts.length > 50) this.db.alerts.pop();
    this.save();
  }

  dismissAlert(id: string): boolean {
    if (!this.db) return false;
    this.db.alerts = this.db.alerts.filter(a => a.id !== id);
    this.save();
    return true;
  }
}

// Export singleton database instance
export const db = new CoffeeShopDB();
