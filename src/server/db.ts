/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Database Module — Supabase PostgreSQL
 * All methods are async and use the Supabase JS client.
 * Zero file-system dependency — fully serverless-compatible.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  User, MenuItem, Ingredient, MenuItemRecipe, Order, Shift,
  Customer, StoreSettings, OrderItem
} from '../types';

// ---------------------------------------------------------------------------
// Supabase client
// On Vercel: set SUPABASE_URL + SUPABASE_ANON_KEY in Project → Settings → Env Vars
// Locally:   add them to your .env file (gitignored)
// ---------------------------------------------------------------------------
const supabaseUrl  = process.env.SUPABASE_URL  || 'https://psjahqvyntyuvljkwqao.supabase.co';
const supabaseKey  = process.env.SUPABASE_ANON_KEY || 'sb_publishable_u__TMeHvuyz8sz8W-slKow_wm9kba0j';

export const supabase = createClient(supabaseUrl, supabaseKey);
console.log(`[db] Supabase connected → ${supabaseUrl}`);

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

function generateId(): string {
  return crypto.randomBytes(4).toString('hex');
}

// ---------------------------------------------------------------------------
// Row mappers  —  snake_case DB columns → camelCase TypeScript interfaces
// ---------------------------------------------------------------------------

function mapUser(r: any): User {
  return {
    id: r.id, name: r.name, email: r.email, pin: r.pin,
    role: r.role, contact: r.contact || '',
    hourlyWage: Number(r.hourly_wage), active: r.active,
  };
}

function mapMenuItem(r: any): MenuItem {
  return {
    id: r.id, name: r.name, description: r.description,
    price: Number(r.price), category: r.category,
    imageUrl: r.image_url, isAvailable: r.is_available,
    modifiers: r.modifiers || [],
  };
}

function mapIngredient(r: any): Ingredient {
  return {
    id: r.id, name: r.name,
    stockLevel: Number(r.stock_level), unit: r.unit,
    lowStockThreshold: Number(r.low_stock_threshold),
    supplierName: r.supplier_name, supplierContact: r.supplier_contact,
    lastRestocked: r.last_restocked,
  };
}

function mapRecipe(r: any): MenuItemRecipe {
  return { menuItemId: r.menu_item_id, requirements: r.requirements || [] };
}

function mapOrder(r: any): Order {
  return {
    id: r.id, timestamp: r.timestamp,
    items: r.items || [], customerId: r.customer_id,
    subtotal: Number(r.subtotal), tax: Number(r.tax),
    discount: r.discount || null, total: Number(r.total),
    paymentMethod: r.payment_method,
    baristaId: r.barista_id, baristaName: r.barista_name,
  };
}

function mapShift(r: any): Shift {
  return {
    id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
    shiftDate: r.shift_date, startTime: r.start_time, endTime: r.end_time,
    clockInTime:  r.clock_in_time  ?? undefined,
    clockOutTime: r.clock_out_time ?? undefined,
    totalHoursWorked: r.total_hours_worked != null ? Number(r.total_hours_worked) : undefined,
    estimatedWage:    r.estimated_wage    != null ? Number(r.estimated_wage)    : undefined,
  };
}

function mapCustomer(r: any): Customer {
  return {
    id: r.id, name: r.name, phone: r.phone,
    email: r.email, points: r.points, joinDate: r.join_date,
  };
}

function mapSettings(r: any): StoreSettings {
  return {
    storeName: r.store_name, address: r.address,
    taxRate: Number(r.tax_rate), currency: r.currency,
    openingHours: r.opening_hours,
  };
}

// ---------------------------------------------------------------------------
// CoffeeShopDB — all methods are async, Supabase-backed
// ---------------------------------------------------------------------------

class CoffeeShopDB {

  // ── Users ──────────────────────────────────────────────────────────────────

  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*').order('name');
    if (error) throw error;
    return (data || []).map(mapUser);
  }

  async findUserByPin(pin: string): Promise<User | undefined> {
    const hashed = hashPin(pin);
    const { data } = await supabase
      .from('users').select('*')
      .eq('pin', hashed).eq('active', true).maybeSingle();
    return data ? mapUser(data) : undefined;
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const { data } = await supabase
      .from('users').select('*')
      .ilike('email', email).eq('active', true).maybeSingle();
    return data ? mapUser(data) : undefined;
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const { data, error } = await supabase.from('users').insert({
      id: 'emp-' + generateId(), name: user.name, email: user.email,
      pin: hashPin(user.pin), role: user.role,
      contact: user.contact, hourly_wage: user.hourlyWage, active: user.active,
    }).select().single();
    if (error) throw error;
    return mapUser(data);
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id'>>): Promise<User | null> {
    const patch: any = {};
    if (updates.name      !== undefined) patch.name        = updates.name;
    if (updates.email     !== undefined) patch.email       = updates.email;
    if (updates.pin       !== undefined && updates.pin.length === 4)
                                          patch.pin         = hashPin(updates.pin);
    if (updates.role      !== undefined) patch.role        = updates.role;
    if (updates.contact   !== undefined) patch.contact     = updates.contact;
    if (updates.hourlyWage !== undefined) patch.hourly_wage = updates.hourlyWage;
    if (updates.active    !== undefined) patch.active      = updates.active;

    const { data, error } = await supabase.from('users').update(patch).eq('id', id).select().single();
    if (error || !data) return null;

    if (updates.name) {
      await Promise.all([
        supabase.from('shifts').update({ employee_name: updates.name }).eq('employee_id', id),
        supabase.from('orders').update({ barista_name:  updates.name }).eq('barista_id',  id),
      ]);
    }
    return mapUser(data);
  }

  async deleteUser(id: string): Promise<boolean> {
    const { error } = await supabase.from('users').update({ active: false }).eq('id', id);
    return !error;
  }

  // ── Menu Items ─────────────────────────────────────────────────────────────

  async getMenuItems(): Promise<MenuItem[]> {
    const { data, error } = await supabase.from('menu_items').select('*').order('name');
    if (error) throw error;
    return (data || []).map(mapMenuItem);
  }

  async createMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem> {
    const { data, error } = await supabase.from('menu_items').insert({
      id: 'menu-' + generateId(), name: item.name, description: item.description,
      price: item.price, category: item.category,
      image_url: item.imageUrl, is_available: item.isAvailable,
      modifiers: item.modifiers,
    }).select().single();
    if (error) throw error;
    return mapMenuItem(data);
  }

  async updateMenuItem(id: string, updates: Partial<Omit<MenuItem, 'id'>>): Promise<MenuItem | null> {
    const patch: any = {};
    if (updates.name        !== undefined) patch.name         = updates.name;
    if (updates.description !== undefined) patch.description  = updates.description;
    if (updates.price       !== undefined) patch.price        = updates.price;
    if (updates.category    !== undefined) patch.category     = updates.category;
    if (updates.imageUrl    !== undefined) patch.image_url    = updates.imageUrl;
    if (updates.isAvailable !== undefined) patch.is_available = updates.isAvailable;
    if (updates.modifiers   !== undefined) patch.modifiers    = updates.modifiers;

    const { data, error } = await supabase.from('menu_items').update(patch).eq('id', id).select().single();
    if (error || !data) return null;
    return mapMenuItem(data);
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    await supabase.from('recipes').delete().eq('menu_item_id', id);
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    return !error;
  }

  // ── Recipes ────────────────────────────────────────────────────────────────

  async getRecipes(): Promise<MenuItemRecipe[]> {
    const { data, error } = await supabase.from('recipes').select('*');
    if (error) throw error;
    return (data || []).map(mapRecipe);
  }

  async getRecipeForMenuItem(menuItemId: string): Promise<MenuItemRecipe | undefined> {
    const { data } = await supabase.from('recipes').select('*').eq('menu_item_id', menuItemId).maybeSingle();
    return data ? mapRecipe(data) : undefined;
  }

  async saveRecipe(menuItemId: string, requirements: MenuItemRecipe['requirements']): Promise<void> {
    const { error } = await supabase.from('recipes')
      .upsert({ menu_item_id: menuItemId, requirements }, { onConflict: 'menu_item_id' });
    if (error) throw error;
  }

  // ── Ingredients ────────────────────────────────────────────────────────────

  async getIngredients(): Promise<Ingredient[]> {
    const { data, error } = await supabase.from('ingredients').select('*').order('name');
    if (error) throw error;
    return (data || []).map(mapIngredient);
  }

  async createIngredient(ing: Omit<Ingredient, 'id'>): Promise<Ingredient> {
    const { data, error } = await supabase.from('ingredients').insert({
      id: 'ing-' + generateId(), name: ing.name, stock_level: ing.stockLevel,
      unit: ing.unit, low_stock_threshold: ing.lowStockThreshold,
      supplier_name: ing.supplierName, supplier_contact: ing.supplierContact,
      last_restocked: ing.lastRestocked,
    }).select().single();
    if (error) throw error;
    const result = mapIngredient(data);
    await this.checkIngredientAlert(result);
    return result;
  }

  async updateIngredient(id: string, updates: Partial<Omit<Ingredient, 'id'>>): Promise<Ingredient | null> {
    const patch: any = {};
    if (updates.name              !== undefined) patch.name               = updates.name;
    if (updates.stockLevel        !== undefined) patch.stock_level        = updates.stockLevel;
    if (updates.unit              !== undefined) patch.unit               = updates.unit;
    if (updates.lowStockThreshold !== undefined) patch.low_stock_threshold = updates.lowStockThreshold;
    if (updates.supplierName      !== undefined) patch.supplier_name      = updates.supplierName;
    if (updates.supplierContact   !== undefined) patch.supplier_contact   = updates.supplierContact;
    if (updates.lastRestocked     !== undefined) patch.last_restocked     = updates.lastRestocked;

    const { data, error } = await supabase.from('ingredients').update(patch).eq('id', id).select().single();
    if (error || !data) return null;
    const result = mapIngredient(data);
    await this.checkIngredientAlert(result);
    return result;
  }

  async deleteIngredient(id: string): Promise<boolean> {
    // Strip ingredient from all recipe requirements
    const { data: recipes } = await supabase.from('recipes').select('*');
    if (recipes) {
      for (const recipe of recipes) {
        const filtered = (recipe.requirements || []).filter((r: any) => r.ingredientId !== id);
        if (filtered.length !== (recipe.requirements || []).length) {
          await supabase.from('recipes').update({ requirements: filtered })
            .eq('menu_item_id', recipe.menu_item_id);
        }
      }
    }
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    return !error;
  }

  private async checkIngredientAlert(ing: Ingredient): Promise<void> {
    if (ing.stockLevel <= ing.lowStockThreshold) {
      const { data } = await supabase.from('alerts').select('id').ilike('message', `%${ing.name}%`);
      if (!data || data.length === 0) {
        await this.addAlert(
          `Low stock warning! ${ing.name} is down to ${ing.stockLevel} ${ing.unit} (Threshold: ${ing.lowStockThreshold} ${ing.unit}).`,
          'low-stock'
        );
      }
    } else {
      await supabase.from('alerts').delete().ilike('message', `%${ing.name}%`);
    }
  }

  // ── Shifts ─────────────────────────────────────────────────────────────────

  async getShifts(): Promise<Shift[]> {
    const { data, error } = await supabase.from('shifts').select('*')
      .order('shift_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapShift);
  }

  async createShift(shift: Omit<Shift, 'id'>): Promise<Shift> {
    const { data, error } = await supabase.from('shifts').insert({
      id: 'shf-' + generateId(),
      employee_id:   shift.employeeId,
      employee_name: shift.employeeName,
      shift_date:    shift.shiftDate,
      start_time:    shift.startTime,
      end_time:      shift.endTime,
      clock_in_time:  shift.clockInTime  || null,
      clock_out_time: shift.clockOutTime || null,
      total_hours_worked: shift.totalHoursWorked || null,
      estimated_wage:     shift.estimatedWage    || null,
    }).select().single();
    if (error) throw error;
    return mapShift(data);
  }

  async updateShift(id: string, updates: Partial<Omit<Shift, 'id'>>): Promise<Shift | null> {
    const { data: existing } = await supabase.from('shifts').select('*').eq('id', id).maybeSingle();
    if (!existing) return null;

    const current = mapShift(existing);
    const patch: any = {};

    if (updates.employeeName !== undefined) patch.employee_name = updates.employeeName;
    if (updates.shiftDate    !== undefined) patch.shift_date    = updates.shiftDate;
    if (updates.startTime    !== undefined) patch.start_time    = updates.startTime;
    if (updates.endTime      !== undefined) patch.end_time      = updates.endTime;
    if (updates.clockInTime  !== undefined) patch.clock_in_time  = updates.clockInTime;
    if (updates.clockOutTime !== undefined) patch.clock_out_time = updates.clockOutTime;

    // Auto-calculate hours and wage when clock-out is set
    const clockIn  = updates.clockInTime  ?? current.clockInTime;
    const clockOut = updates.clockOutTime ?? current.clockOutTime;
    if (clockIn && clockOut) {
      const hrs = Math.max(0, (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3_600_000);
      patch.total_hours_worked = parseFloat(hrs.toFixed(2));

      const { data: emp } = await supabase.from('users')
        .select('hourly_wage').eq('id', current.employeeId).maybeSingle();
      if (emp) {
        patch.estimated_wage = parseFloat((patch.total_hours_worked * Number(emp.hourly_wage)).toFixed(2));
      }
    }

    const { data, error } = await supabase.from('shifts').update(patch).eq('id', id).select().single();
    if (error || !data) return null;
    return mapShift(data);
  }

  async deleteShift(id: string): Promise<boolean> {
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    return !error;
  }

  async employeeClockInOut(pin: string): Promise<{ success: boolean; message: string; shift?: Shift }> {
    const staff = await this.findUserByPin(pin);
    if (!staff) return { success: false, message: 'Invalid PIN code.' };

    const todayDate = new Date().toISOString().split('T')[0];

    // Active shift = clocked in but not out
    const { data: active } = await supabase.from('shifts').select('*')
      .eq('employee_id', staff.id)
      .not('clock_in_time', 'is', null)
      .is('clock_out_time', null);

    if (active && active.length > 0) {
      const updated = await this.updateShift(active[0].id, { clockOutTime: new Date().toISOString() });
      return {
        success: true,
        message: `${staff.name} is now clocked out. Hours worked: ${updated?.totalHoursWorked ?? 0}`,
        shift: updated ?? undefined,
      };
    }

    // Planned shift today
    const { data: planned } = await supabase.from('shifts').select('*')
      .eq('employee_id', staff.id)
      .eq('shift_date', todayDate)
      .is('clock_in_time', null);

    const clockIn = new Date().toISOString();

    if (planned && planned.length > 0) {
      const updated = await this.updateShift(planned[0].id, { clockInTime: clockIn });
      return {
        success: true,
        message: `${staff.name} clocked in for schedule: ${planned[0].start_time}–${planned[0].end_time}`,
        shift: updated ?? undefined,
      };
    }

    // Auto-create unscheduled shift
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endTime = new Date(Date.now() + 8 * 3_600_000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const newShift = await this.createShift({
      employeeId: staff.id, employeeName: staff.name,
      shiftDate: todayDate, startTime: nowTime, endTime,
      clockInTime: clockIn,
    });
    return { success: true, message: `${staff.name} clocked in (unscheduled shift auto-logged).`, shift: newShift };
  }

  // ── Customers ──────────────────────────────────────────────────────────────

  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) throw error;
    return (data || []).map(mapCustomer);
  }

  async createCustomer(cust: Omit<Customer, 'id' | 'points' | 'joinDate'>): Promise<Customer> {
    const { data, error } = await supabase.from('customers').insert({
      id: 'cust-' + generateId(), name: cust.name,
      phone: cust.phone, email: cust.email,
      points: 0, join_date: new Date().toISOString().split('T')[0],
    }).select().single();
    if (error) throw error;
    return mapCustomer(data);
  }

  async updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'joinDate'>>): Promise<Customer | null> {
    const patch: any = {};
    if (updates.name   !== undefined) patch.name   = updates.name;
    if (updates.phone  !== undefined) patch.phone  = updates.phone;
    if (updates.email  !== undefined) patch.email  = updates.email;
    if (updates.points !== undefined) patch.points = updates.points;

    const { data, error } = await supabase.from('customers').update(patch).eq('id', id).select().single();
    if (error || !data) return null;
    return mapCustomer(data);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async getOrders(): Promise<Order[]> {
    const { data, error } = await supabase.from('orders').select('*')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapOrder);
  }

  async createOrder(orderData: Omit<Order, 'id' | 'timestamp'>): Promise<Order> {
    const { data, error } = await supabase.from('orders').insert({
      id: 'ord-' + Math.floor(1000 + Math.random() * 9000),
      timestamp: new Date().toISOString(),
      items: orderData.items,
      customer_id:    orderData.customerId   || null,
      subtotal:       orderData.subtotal,
      tax:            orderData.tax,
      discount:       orderData.discount     || null,
      total:          orderData.total,
      payment_method: orderData.paymentMethod,
      barista_id:     orderData.baristaId,
      barista_name:   orderData.baristaName,
    }).select().single();
    if (error) throw error;

    const order = mapOrder(data);

    // Non-blocking: stock deduction + loyalty points
    await Promise.all([
      this.deductStockForOrder(order.items),
      order.customerId ? this.applyLoyaltyPoints(order) : Promise.resolve(),
    ]);

    return order;
  }

  private async deductStockForOrder(items: OrderItem[]): Promise<void> {
    for (const item of items) {
      const recipe = await this.getRecipeForMenuItem(item.itemId);
      if (!recipe) continue;

      for (const req of recipe.requirements) {
        const { data: ing } = await supabase.from('ingredients')
          .select('*').eq('id', req.ingredientId).maybeSingle();
        if (ing) {
          const newLevel = Math.max(0, Number(ing.stock_level) - req.quantity * item.quantity);
          await supabase.from('ingredients').update({ stock_level: newLevel }).eq('id', req.ingredientId);
          await this.checkIngredientAlert({ ...mapIngredient(ing), stockLevel: newLevel });
        }
      }

      for (const mod of item.selectedModifiers) {
        if (mod.optionName.includes('Oat Milk'))
          await this.deductIngByName('oat milk', 200 * item.quantity);
        else if (mod.optionName.includes('Almond Milk'))
          await this.deductIngByName('almond milk', 200 * item.quantity);
        else if (mod.optionName.includes('Double Shot') || mod.optionName.includes('Triple'))
          await this.deductIngByName('beans', (mod.optionName.includes('Triple') ? 18 : 9) * item.quantity);
        else if (mod.optionName.includes('Vanilla'))
          await this.deductIngByName('vanilla', 20 * item.quantity);
      }
    }
  }

  private async deductIngByName(fragment: string, amount: number): Promise<void> {
    const { data } = await supabase.from('ingredients').select('*').ilike('name', `%${fragment}%`).maybeSingle();
    if (data) {
      const newLevel = Math.max(0, Number(data.stock_level) - amount);
      await supabase.from('ingredients').update({ stock_level: newLevel }).eq('id', data.id);
      await this.checkIngredientAlert({ ...mapIngredient(data), stockLevel: newLevel });
    }
  }

  private async applyLoyaltyPoints(order: Order): Promise<void> {
    const { data: cust } = await supabase.from('customers')
      .select('points').eq('id', order.customerId!).maybeSingle();
    if (!cust) return;

    let pts = cust.points + Math.floor(order.total);
    if (order.discount?.code === 'REDEEM-FREE-DRINK') pts = Math.max(0, pts - 80);
    await supabase.from('customers').update({ points: pts }).eq('id', order.customerId!);
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  private readonly DEFAULT_SETTINGS: StoreSettings = {
    storeName: 'The Daily Grind Coffee Co.',
    address: '456 Espresso Blvd, Seattle, WA 98101',
    taxRate: 0.08, currency: 'PKR ',
    openingHours: 'Mon-Fri: 6:00 AM - 6:00 PM, Sat-Sun: 7:00 AM - 5:00 PM',
  };

  async getSettings(): Promise<StoreSettings> {
    const { data } = await supabase.from('store_settings').select('*').eq('id', 1).maybeSingle();
    return data ? mapSettings(data) : this.DEFAULT_SETTINGS;
  }

  async updateSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
    const patch: any = {};
    if (updates.storeName    !== undefined) patch.store_name    = updates.storeName;
    if (updates.address      !== undefined) patch.address       = updates.address;
    if (updates.taxRate      !== undefined) patch.tax_rate      = updates.taxRate;
    if (updates.currency     !== undefined) patch.currency      = updates.currency;
    if (updates.openingHours !== undefined) patch.opening_hours = updates.openingHours;

    const { data } = await supabase.from('store_settings').update(patch).eq('id', 1).select().maybeSingle();
    return data ? mapSettings(data) : this.getSettings();
  }

  // ── Alerts ─────────────────────────────────────────────────────────────────

  async getAlerts(): Promise<{ id: string; timestamp: string; message: string; type: 'low-stock' | 'system' }[]> {
    const { data, error } = await supabase.from('alerts').select('*')
      .order('timestamp', { ascending: false }).limit(50);
    if (error) throw error;
    return data || [];
  }

  async addAlert(message: string, type: 'low-stock' | 'system' = 'system'): Promise<void> {
    await supabase.from('alerts').insert({
      id: 'alert-' + generateId(),
      timestamp: new Date().toISOString(),
      message, type,
    });
  }

  async dismissAlert(id: string): Promise<boolean> {
    const { error } = await supabase.from('alerts').delete().eq('id', id);
    return !error;
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  async getDashboardMetrics() {
    const todayStr = new Date().toISOString().split('T')[0];

    const [ordersRes, ingredientsRes, shiftsRes] = await Promise.all([
      supabase.from('orders').select('*'),
      supabase.from('ingredients').select('*'),
      supabase.from('shifts').select('*').eq('shift_date', todayStr),
    ]);

    const orders      = (ordersRes.data      || []).map(mapOrder);
    const ingredients = (ingredientsRes.data || []).map(mapIngredient);
    const shifts      = (shiftsRes.data      || []).map(mapShift);

    const todaysOrders = orders.filter(o => o.timestamp.startsWith(todayStr));
    const todaySales   = todaysOrders.reduce((s, o) => s + o.total, 0);
    const todayCount   = todaysOrders.length;

    const salesCounts: Record<string, { name: string; qty: number; total: number }> = {};
    orders.forEach(o => o.items.forEach(item => {
      if (!salesCounts[item.itemId]) salesCounts[item.itemId] = { name: item.name, qty: 0, total: 0 };
      salesCounts[item.itemId].qty   += item.quantity;
      salesCounts[item.itemId].total += item.price * item.quantity;
    }));

    const topSellers = Object.values(salesCounts).sort((a, b) => b.qty - a.qty).slice(0, 5);
    const lowStockCount = ingredients.filter(i => i.stockLevel <= i.lowStockThreshold).length;
    const todayLaborCost = shifts
      .filter(s => s.estimatedWage !== undefined)
      .reduce((s, sh) => s + (sh.estimatedWage ?? 0), 0);

    return {
      todaySales:         parseFloat(todaySales.toFixed(2)),
      todayOrdersCount:   todayCount,
      avgOrderValue:      parseFloat((todayCount > 0 ? todaySales / todayCount : 0).toFixed(2)),
      lowStockCount,
      todayShiftLaborCost: parseFloat(todayLaborCost.toFixed(2)),
      topSellers,
    };
  }

  async getSalesReport() {
    const [ordersRes, menuRes] = await Promise.all([
      supabase.from('orders').select('*'),
      supabase.from('menu_items').select('id, category'),
    ]);

    const orders  = (ordersRes.data || []).map(mapOrder);
    const menuMap: Record<string, string> = Object.fromEntries(
      (menuRes.data || []).map((m: any) => [m.id, m.category])
    );

    const dailyData: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dailyData[d.toISOString().split('T')[0]] = 0;
    }

    const categoriesShare: Record<string, number> = {};
    orders.forEach(o => {
      const dateStr = o.timestamp.split('T')[0];
      if (dailyData[dateStr] !== undefined) dailyData[dateStr] += o.total;

      o.items.forEach(item => {
        const cat = menuMap[item.itemId] || 'Coffee';
        categoriesShare[cat] = (categoriesShare[cat] || 0) + item.price * item.quantity;
      });
    });

    return {
      timeline:   Object.keys(dailyData).map(k => ({ date: k, sales: parseFloat(dailyData[k].toFixed(2)) })),
      categories: Object.keys(categoriesShare).map(k => ({ name: k, value: parseFloat(categoriesShare[k].toFixed(2)) })),
    };
  }
}

// Singleton export
export const db = new CoffeeShopDB();
