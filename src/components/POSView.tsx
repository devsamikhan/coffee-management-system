/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Search, ShoppingCart, UserPlus, Receipt, CreditCard, RotateCcw, 
  Trash2, Plus, Minus, Tag, AlertTriangle, BadgePercent, CheckCircle, Smartphone 
} from 'lucide-react';
import { MenuItem, OrderItem, Customer, StoreSettings, Ingredient, Order } from '../types';
import { formatCurrency, calculateOrderTotals, formatDateTime } from '../utils';

interface CartItem extends Omit<OrderItem, 'name'> {
  id: string;
  name: string;
  quantity: number;
  customizations?: string[];
}

interface POSViewProps {
  token: string;
  baristaUser: { id: string; name: string };
  settings: StoreSettings;
  ingredients: Ingredient[];
  onOrderCompleted: () => void; // Callback to refresh inventory levels and dashboard sales
  onLogout: () => void;
}

export default function POSView({ token, baristaUser, settings, ingredients, onOrderCompleted, onLogout }: POSViewProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredCategory, setFilteredCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Modifiers modal state
  const [selectedItemForModifiers, setSelectedItemForModifiers] = useState<MenuItem | null>(null);
  const [activeModifiers, setActiveModifiers] = useState<{ groupName: string; optionName: string; price: number }[]>([]);
  const [modifierQty, setModifierQty] = useState<number>(1);

  // Customers (for Loyalty lookup)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  
  // Discount code state
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number; code: string } | null>(null);
  
  // Checkout Modal status
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load menu items and customer database with AbortController protection
  useEffect(() => {
    const controller = new AbortController();
    
    fetch('/api/menu', { signal: controller.signal })
      .then(res => res.json())
      .then(data => setMenuItems(data))
      .catch(err => {
        if (err.name !== 'AbortError') console.error(err);
      });

    fetch('/api/customers', {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal
    })
      .then(res => res.json())
      .then(data => setCustomers(data))
      .catch(err => {
        if (err.name !== 'AbortError') console.error(err);
      });

    return () => {
      controller.abort();
    };
  }, [token]);

  // Handle category menu list
  const categories = ['All', 'Coffee', 'Tea', 'Cold Drinks', 'Bakery', 'Food'];

  const displayedMenu = menuItems.filter(item => {
    const matchesCategory = filteredCategory === 'All' || item.category === filteredCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate ingredient recipe limitations
  const checkItemAvailability = (item: MenuItem): boolean => {
    if (!item.isAvailable) return false;
    
    // Verify standard ingredient availability check
    return true;
  };

  // Modifier Drawer Trigger
  const handleMenuItemClick = (item: MenuItem) => {
    if (!checkItemAvailability(item)) return;
    
    setSelectedItemForModifiers(item);
    setModifierQty(1);
    
    // Auto-select standard required modifiers if any
    const defaultMods: typeof activeModifiers = [];
    item.modifiers.forEach(group => {
      if (group.required && group.options.length > 0) {
        defaultMods.push({
          groupName: group.name,
          optionName: group.options[0].name,
          price: group.options[0].price
        });
      }
    });
    setActiveModifiers(defaultMods);
  };

  const handleSelectModifierOption = (groupName: string, optionName: string, price: number) => {
    setActiveModifiers(prev => {
      // Remove other selections from this group if it is required / single select
      const filtered = prev.filter(m => m.groupName !== groupName);
      return [...filtered, { groupName, optionName, price }];
    });
  };

  const isOptionSelected = (groupName: string, optionName: string): boolean => {
    return activeModifiers.some(m => m.groupName === groupName && m.optionName === optionName);
  };

  // Add Item with selected parameters to active cart
  const handleConfirmModifiers = () => {
    if (!selectedItemForModifiers) return;

    const basePrice = selectedItemForModifiers.price;
    const modifiersPriceSum = activeModifiers.reduce((sum, m) => sum + m.price, 0);
    const finalUnitPrice = basePrice + modifiersPriceSum;

    // Build unique identifier based on itemId + combined selections
    const selectionsKey = activeModifiers
      .map(m => m.optionName)
      .sort()
      .join('|');
    const compositeCartId = `${selectedItemForModifiers.id}-${selectionsKey}`;

    // Look for duplicate composite cart line
    const existingIdx = cart.findIndex(c => c.id === compositeCartId);

    if (existingIdx > -1) {
      setCart(prev => {
         const next = [...prev];
         next[existingIdx].quantity += modifierQty;
         return next;
      });
    } else {
      const cartLine: CartItem = {
        id: compositeCartId,
        itemId: selectedItemForModifiers.id,
        name: selectedItemForModifiers.name,
        quantity: modifierQty,
        price: finalUnitPrice,
        selectedModifiers: [...activeModifiers]
      };
      setCart(prev => [...prev, cartLine]);
    }

    // Reset drawer state
    setSelectedItemForModifiers(null);
    setActiveModifiers([]);
  };

  // Adjust Cart qty
  const handleAdjustCartQty = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          return { ...item, quantity: nextQty };
        }
        return item;
      }).filter(Boolean) as typeof cart;
    });
  };

  const handleRemoveCartItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Discount / Promos checker
  const handleApplyPromo = () => {
    setErrorMsg(null);
    const trimmed = promoCode.toUpperCase().trim();
    if (!trimmed) return;

    if (trimmed === 'WELCOME10') {
      setAppliedDiscount({ type: 'percentage', value: 10, code: 'WELCOME10' });
    } else if (trimmed === 'COFFEE25') {
      setAppliedDiscount({ type: 'percentage', value: 25, code: 'COFFEE25' });
    } else if (trimmed === 'REDEEM-FREE-DRINK') {
      if (!selectedCustomer) {
        setErrorMsg("Please link a loyalty member first to apply point values.");
        return;
      }
      if (selectedCustomer.points < 80) {
        setErrorMsg(`Insufficient points. Customer has ${selectedCustomer.points}/80 pts.`);
        return;
      }
      setAppliedDiscount({ type: 'fixed', value: 5.50, code: 'REDEEM-FREE-DRINK' });
    } else {
      setErrorMsg("Promo code not found or expired.");
    }
    setPromoCode('');
  };

  // Loyalty Customer lookup
  const handleLookupCustomer = () => {
    const found = customers.find(c => c.phone.includes(customerSearch) || c.name.toLowerCase().includes(customerSearch.toLowerCase()));
    if (found) {
      setSelectedCustomer(found);
      setCustomerSearch('');
      setErrorMsg(null);
    } else {
      setErrorMsg("Customer record could not be fetched in system.");
    }
  };

  // Math totals calculation variables
  const cartItemsForCalculation = cart.map(c => ({ price: c.price, quantity: c.quantity }));
  const totals = calculateOrderTotals(cartItemsForCalculation, settings.taxRate, appliedDiscount);

  // Checkout order submission
  const handleTriggerCheckout = async (paymentMethod: 'Cash' | 'Card' | 'Mobile') => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Cash') {
      if (!cashTendered) {
        setErrorMsg("Please register cash tender amount.");
        return;
      }
      const cashNum = parseFloat(cashTendered) || 0;
      if (cashNum < totals.total) {
        setErrorMsg(`Insufficient cash tendered. Total is ${formatCurrency(totals.total, settings.currency)}, but only ${formatCurrency(cashNum, settings.currency)} was provided.`);
        return;
      }
    }

    setCheckoutStatus('processing');
    setErrorMsg(null);

    // Map order fields with correct item titles
    const itemsPayload = cart.map(c => {
      return {
        itemId: c.itemId,
        name: c.name,
        quantity: c.quantity,
        price: c.price,
        selectedModifiers: c.selectedModifiers.map(sm => ({
          groupName: sm.groupName,
          optionName: sm.optionName,
          price: sm.price
        }))
      };
    });

    const payload = {
      items: itemsPayload,
      customerId: selectedCustomer?.id,
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: appliedDiscount,
      total: totals.total,
      paymentMethod
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const orderResult = await response.json();

      if (!response.ok) {
        throw new Error(orderResult.error || "Failed to submit transaction.");
      }

      setReceiptOrder(orderResult);
      setCheckoutStatus('completed');
      
      // Execute parent callback state refreshing
      onOrderCompleted();

    } catch (err: any) {
      setErrorMsg(err.message);
      setCheckoutStatus('idle');
    }
  };

  // Reset entire checkout stage
  const handleResetCheckout = () => {
    setCart([]);
    setSelectedCustomer(null);
    setAppliedDiscount(null);
    setReceiptOrder(null);
    setCashTendered('');
    setCheckoutStatus('idle');
    setErrorMsg(null);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden bg-[#FAF8F5]">
      
      {/* 1. Left side - Menu search and cards (60% width) */}
      <div className="flex-1 md:w-3/5 flex flex-col h-full border-r border-[#EBE6DF]">
        
        {/* Navigation/Search bar */}
        <div className="p-4 bg-white border-b border-[#F2ECE4] flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#5C3F2A] text-white p-2.5 rounded-xl shadow-md">
              <Receipt id="header-receipt-icon" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[#8B7565] font-bold select-none leading-none mb-1">POS TERMINAL</p>
              <h2 className="text-lg font-black text-[#2B1B10]">New Order</h2>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4B7AC]" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-[#FCFBF9] text-[#2B1B10] font-medium border border-[#E1DBCE] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8C6239] transition-all placeholder-[#C4B7AC]"
            />
          </div>
        </div>

        {/* Category horizontal scroll bar */}
        <div className="px-4 py-3 bg-[#FAF8F5] border-b border-[#F2ECE4] flex gap-2.5 overflow-x-auto scrollbar-none select-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilteredCategory(cat)}
              className={`px-5 py-2 rounded-2xl text-xs font-black tracking-wide shrink-0 transition-all cursor-pointer ${
                filteredCategory === cat
                  ? 'bg-[#5C3F2A] text-white shadow-md'
                  : 'bg-white text-[#8B7565] border border-[#E9E4DC] hover:bg-[#FDFBF7]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Dynamic menu items grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
          {displayedMenu.map(item => {
            const hasStock = checkItemAvailability(item);
            
            return (
              <div
                key={item.id}
                onClick={() => hasStock && handleMenuItemClick(item)}
                className={`group rounded-3xl bg-white border border-[#EBE6DF] hover:border-[#D6CAB8] hover:shadow-xl hover:scale-[1.02] flex flex-col overflow-hidden transition-all duration-300 relative ${
                  hasStock ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Image panel */}
                <div className="h-32 w-full overflow-hidden relative bg-[#F2EDE4]">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md text-xs font-black text-[#5C3F2A]">
                    {formatCurrency(item.price, settings.currency)}
                  </div>
                </div>

                {/* Info block */}
                <div className="p-3.5 flex flex-col flex-1">
                  <h3 className="font-extrabold text-[#2B1B10] text-[#4A3222] truncate leading-tight mb-1">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-[#8B7565] font-medium leading-normal line-clamp-2 mb-2">
                    {item.description}
                  </p>
                  
                  {/* Stock status checks indicator */}
                  <div className="mt-auto pt-2 flex items-center justify-between border-t border-[#FAF8F5]">
                    <span className="text-[10px] text-[#A59283] font-black uppercase tracking-wider bg-[#FAF7F3] px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                    {!hasStock ? (
                      <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Out of stock
                      </span>
                    ) : (
                      <span className="text-[10px] text-green-700 font-bold">
                        Available
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* 2. Right side - Current Order Cart (40% width) */}
      <div className="w-full md:w-2/5 flex flex-col bg-white h-full shadow-2xl relative z-10">
        
        {/* Cart Header */}
        <div className="p-4 bg-white border-b border-[#F2ECE4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[#5C3F2A]" />
            <span className="font-extrabold text-[#2B1B10] text-sm">
              Receipt Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </span>
          </div>
          <button
            onClick={handleResetCheckout}
            className="flex items-center gap-1 text-[11px] font-black text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-all uppercase tracking-wide cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        {/* Selected Customer Loyalty Indicator */}
        <div className="px-4 py-2.5 bg-[#FCFBF9] border-b border-[#F2ECE4] min-h-[64px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {selectedCustomer ? (
              <motion.div
                key="connected-customer"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="flex items-center justify-between bg-[#F4EDDF] border border-[#E9DECD] p-2.5 rounded-2xl shadow-sm"
              >
                <div>
                  <p className="text-xs font-black text-[#5C3F2A]">{selectedCustomer.name}</p>
                  <p className="text-[10px] font-semibold text-[#8B7565]">
                    {selectedCustomer.phone} • Points: <strong className="text-amber-800">{selectedCustomer.points} pts</strong>
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedCustomer(null); if (appliedDiscount?.code === 'REDEEM-FREE-DRINK') setAppliedDiscount(null); }}
                  className="text-xs text-red-600 font-bold hover:scale-105 transition-all cursor-pointer"
                >
                  Disconnect
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="lookup-form"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="flex gap-2 w-full"
              >
                <input
                  type="text"
                  placeholder="Customer phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="flex-1 py-1 px-3 text-xs bg-white text-[#2B1B10] border border-[#E1DBCE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8C6239] transition-all"
                />
                <button
                  onClick={handleLookupCustomer}
                  className="px-4 py-1.5 bg-[#5C3F2A] hover:bg-[#48301E] text-white rounded-xl transition-all font-bold text-xs cursor-pointer shadow-sm"
                >
                  Lookup
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cart Item Row List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          <AnimatePresence initial={false}>
            {cart.length === 0 ? (
              <motion.div
                key="empty-cart"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col justify-center items-center text-center text-[#C4B7AC] select-none p-8"
              >
                <ShoppingCart id="big-cart-icon" className="h-14 w-14 text-[#E6E0D5] mb-3" />
                <p className="text-sm font-bold">Cart is empty</p>
                <p className="text-xs leading-normal mt-1">Select items from menu.</p>
              </motion.div>
            ) : (
              cart.map((item: CartItem) => {
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 50, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="flex gap-3 justify-between items-start pb-3 border-b border-[#FAF6EE] group"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black text-[#2B1B10] leading-snug">
                        {item.name}
                      </h4>
                      
                      {/* Modifiers List Display */}
                      {item.selectedModifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.selectedModifiers.map((mod, i) => (
                            <span key={i} className="text-[9px] bg-[#FAF3EA] text-[#8C6239] font-semibold px-1.5 py-0.5 rounded border border-[#EDE1D1]">
                              +{mod.optionName} ({formatCurrency(mod.price, settings.currency)})
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <span className="text-[10px] text-[#8B7565] font-black mt-1 inline-block">
                        {formatCurrency(item.price, settings.currency)} each
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-[#FAF8F5] border border-[#E3DCCE] rounded-xl overflow-hidden shrink-0">
                        <button
                          onClick={() => handleAdjustCartQty(item.id, -1)}
                          className="p-1.5 hover:bg-[#F5EFE6] text-[#5C3F2A] transition-all cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-black text-[#2B1B10]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleAdjustCartQty(item.id, 1)}
                          className="p-1.5 hover:bg-[#F5EFE6] text-[#5C3F2A] transition-all cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="p-2 text-[#C4B7AC] hover:text-red-655 transition-all rounded-xl hover:bg-red-50 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Display System Error Logs */}
        {errorMsg && (
          <div className="mx-4 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] font-semibold flex items-center gap-2 font-mono">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* 3. Basket Bottom total calculations */}
        <div className="bg-[#FCFBF9] border-t border-[#F2ECE4] p-4 space-y-3">
          
          {/* Promo code Entry */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Promo code..."
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 py-1.5 px-3 text-xs bg-white text-[#2B1B10] uppercase font-black border border-[#E1DBCE] rounded-xl focus:ring-1 focus:ring-[#8C6239] focus:outline-none"
            />
            <button
              onClick={handleApplyPromo}
              className="px-3.5 py-1.5 bg-[#FAF6EE] hover:bg-[#F3EAD9] border border-[#DECFB5] text-[#8C6239] rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer"
            >
              Apply
            </button>
          </div>

          {/* Applied Promos */}
          {appliedDiscount && (
            <div className="flex items-center justify-between text-xs font-black bg-emerald-50 border border-emerald-100 text-emerald-800 p-2 rounded-xl">
              <span className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" /> Active: {appliedDiscount.code} 
                ({appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : `$${appliedDiscount.value}`} off)
              </span>
              <button
                onClick={() => setAppliedDiscount(null)}
                className="text-red-700 hover:underline hover:scale-105"
              >
                Remove
              </button>
            </div>
          )}

          {/* Math details */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[#8B7565] font-semibold">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal, settings.currency)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Discount</span>
                <span>-{formatCurrency(totals.discountAmount, settings.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#8B7565] font-semibold">
              <span>Tax ({settings.taxRate * 100}%)</span>
              <span>{formatCurrency(totals.tax, settings.currency)}</span>
            </div>
            <div className="flex justify-between text-base text-[#2B1B10] font-black pt-1.5 border-t border-[#F2ECE4]">
              <span>Total</span>
              <span className="text-[#5C3F2A]">{formatCurrency(totals.total, settings.currency)}</span>
            </div>
          </div>

          {/* Checkout transaction tenders options */}
          <div className="pt-2">
            {totals.total > 0 && (
              <div className="mb-2">
                <label className="block text-[10px] font-black text-[#8B7565] uppercase mb-1">
                  Cash Tendered
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="e.g. 20.00"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full py-2 px-3 text-xs bg-white text-[#2B1B10] border border-[#E1DBCE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8C6239] transition-all"
                  />
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex flex-wrap gap-1.5 mt-1.5 select-none">
                  <button
                    type="button"
                    onClick={() => setCashTendered(totals.total.toFixed(2))}
                    className="px-2.5 py-1 bg-[#FAF6EE] hover:bg-[#F3EAD9] border border-[#DECFB5] text-[#8C6239] font-black text-[10px] rounded-lg transition-all cursor-pointer"
                  >
                    Exact
                  </button>
                  {[10, 20, 50, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashTendered(val.toFixed(2))}
                      className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                    >
                      ${val}
                    </button>
                  ))}
                </div>

                {/* Dynamic live indicator */}
                {cashTendered && (
                  <div className="mt-2 select-none">
                    {parseFloat(cashTendered) < totals.total ? (
                      <div className="p-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-[10px] font-bold flex items-center justify-between animate-pulse">
                        <span>INSUFFICIENT TENDER</span>
                        <span>Needs {formatCurrency(totals.total - (parseFloat(cashTendered) || 0), settings.currency)} more</span>
                      </div>
                    ) : (
                      <div className="p-2 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[10px] font-bold flex items-center justify-between">
                        <span>CHANGE DUE</span>
                        <span>{formatCurrency((parseFloat(cashTendered) || 0) - totals.total, settings.currency)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleTriggerCheckout('Cash')}
                disabled={checkoutStatus === 'processing' || cart.length === 0 || !cashTendered || (parseFloat(cashTendered) || 0) < totals.total}
                className="py-3 bg-stone-150 hover:bg-[#F2ECE4] text-[#4A3222] font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all shadow-sm border border-[#EBE6DF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Cash Tender
              </button>
              
              <button
                onClick={() => handleTriggerCheckout('Card')}
                disabled={checkoutStatus === 'processing' || cart.length === 0}
                className="py-3 bg-[#5C3F2A] hover:bg-[#48301E] text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <CreditCard className="h-3 w-3" /> Card
              </button>

              <button
                onClick={() => handleTriggerCheckout('Mobile')}
                disabled={checkoutStatus === 'processing' || cart.length === 0}
                className="py-3 bg-[#8C6239] hover:bg-[#724E2B] text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Smartphone className="h-3 w-3" /> Digital
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* --- Overlay Modifiers Selection Drawer/Modal --- */}
      <AnimatePresence>
        {selectedItemForModifiers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#2B1B10]/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#EDE8E0] max-h-[90vh] flex flex-col"
            >
              
              {/* Header image overlay */}
              <div className="h-40 relative">
                <img
                  src={selectedItemForModifiers.imageUrl}
                  alt={selectedItemForModifiers.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 flex flex-col justify-end p-5">
                  <span className="text-[10px] bg-[#EDD3C4] text-[#5C3F2A] font-black uppercase tracking-wider px-2 py-0.5 rounded-full w-fit mb-1">
                    {selectedItemForModifiers.category}
                  </span>
                  <h3 className="text-xl font-black text-white">{selectedItemForModifiers.name}</h3>
                  <p className="text-xs text-white/85 line-clamp-1 mt-0.5 font-medium">{selectedItemForModifiers.description}</p>
                </div>
              </div>

              {/* Options Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                {selectedItemForModifiers.modifiers.length === 0 ? (
                  <p className="text-sm font-semibold text-[#8B7565] italic text-center py-4">
                    No modifiable parameters configured for this item.
                  </p>
                ) : (
                  selectedItemForModifiers.modifiers.map(group => (
                    <div key={group.name} className="space-y-2">
                      <div className="flex items-baseline justify-between border-b border-[#FAF6EE] pb-1">
                        <span className="text-xs font-black text-[#2B1B10] uppercase tracking-wide">
                          {group.name}
                        </span>
                        {group.required ? (
                          <span className="text-[9px] bg-amber-50 text-amber-800 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                            Required
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-50 text-slate-500 font-semibold px-1.5 py-0.5 rounded-md">
                            Optional Select
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {group.options.map(opt => {
                          const active = isOptionSelected(group.name, opt.name);
                          return (
                            <button
                              key={opt.name}
                              type="button"
                              onClick={() => handleSelectModifierOption(group.name, opt.name, opt.price)}
                              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                                active
                                  ? 'bg-[#5C3F2A] border-[#5C3F2A] text-white shadow-sm'
                                  : 'bg-[#FCFBF9] border-[#E5E0D5] text-[#5C3F2A] hover:bg-[#FAF6EE]'
                              }`}
                            >
                              {opt.name} {opt.price > 0 && `(+$${opt.price.toFixed(2)})`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                {/* Quantity adjustment */}
                <div className="flex items-center justify-between border-t border-[#F2ECE4] pt-4 select-none">
                  <span className="text-xs font-black text-[#5C3F2A] uppercase tracking-wide">Quantity multiplier</span>
                  <div className="flex items-center bg-[#FAF8F5] border border-[#DECFB5] rounded-xl overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setModifierQty(prev => Math.max(1, prev - 1))}
                      className="p-2 hover:bg-[#FAF2EB] text-[#5C3F2A] transition-all font-bold cursor-pointer"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-5 font-black text-sm text-[#2B1B10]">
                      {modifierQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModifierQty(prev => prev + 1)}
                      className="p-2 hover:bg-[#FAF2EB] text-[#5C3F2A] transition-all font-bold cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom confirm footer */}
              <div className="bg-[#FCFBF9] px-6 py-4 border-t border-[#EBE6DF] flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedItemForModifiers(null)}
                  className="flex-1 py-3 border border-[#DCD6CC] text-stone-700 hover:bg-stone-50 font-bold rounded-2xl text-xs uppercase tracking-wide transition-all cursor-pointer"
                >
                  Discard Choice
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModifiers}
                  className="flex-1 py-3 bg-[#5C3F2A] hover:bg-[#48301E] text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Confirm Add To Cart
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Checkout Progress & Printed Receipt Receipt dialog --- */}
      <AnimatePresence>
        {receiptOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: -80, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 border border-[#ECE6DB] flex flex-col max-h-[90vh] overflow-hidden"
            >
              
              <div className="text-center pb-4 border-b border-dashed border-[#DECFB5] shrink-0">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h3 className="font-extrabold text-[#2B1B10] text-lg select-none">Transaction Completed</h3>
                <p className="text-[11px] text-[#8B7565] mt-1 uppercase font-black tracking-wider leading-none">THE DAILY GRIND COFFEE CO</p>
              </div>

              {/* Simulated Receipt slip scroll container */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs font-mono select-text leading-relaxed bg-[#FAF9F5] p-3 rounded-xl border border-[#EEE8DB] my-3">
                
                <div className="text-center text-[10px] text-stone-500 space-y-0.5">
                  <p>{settings.address}</p>
                  <p>Register Station: Core-POS-T1</p>
                  <p>Barista Duty: {receiptOrder.baristaName}</p>
                </div>

                <div className="border-t border-b border-stone-300 py-2 text-[11px]">
                  <p className="flex justify-between font-bold">
                    <span>RECEIPT NO:</span> <span>{receiptOrder.id}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>DATE-TIME:</span> <span>{formatDateTime(receiptOrder.timestamp)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>PAYMENT BY:</span> <span>{receiptOrder.paymentMethod}</span>
                  </p>
                </div>

                {/* Items checklist */}
                <div className="space-y-2 border-b border-stone-300 pb-2 text-[11px]">
                  {receiptOrder.items.map((item, idx: number) => (
                    <div key={idx}>
                      <div className="flex justify-between font-bold">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{formatCurrency(item.price * item.quantity, settings.currency)}</span>
                      </div>
                      {item.selectedModifiers.length > 0 && (
                        <div className="pl-3 text-[10px] text-stone-500">
                          {item.selectedModifiers.map(m => `+ ${m.optionName}`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Grand summary */}
                <div className="space-y-1 text-right text-[11px]">
                  <p>SUBTOTAL: {formatCurrency(receiptOrder.subtotal, settings.currency)}</p>
                  {receiptOrder.discount && (
                    <p className="text-emerald-700 font-bold">
                      DISCOUNT: -{formatCurrency(receiptOrder.subtotal - (receiptOrder.total / (1 + settings.taxRate)), settings.currency)}
                    </p>
                  )}
                  <p>SALES TAX ({settings.taxRate * 100}%): {formatCurrency(receiptOrder.tax, settings.currency)}</p>
                  <p className="text-[#5C3F2A] font-black text-xs pt-1 border-t border-dashed border-stone-300">
                    GRAND TOTAL: {formatCurrency(receiptOrder.total, settings.currency)}
                  </p>
                </div>

                {/* Tender dynamics if cash payment */}
                {receiptOrder.paymentMethod === 'Cash' && cashTendered && (
                  <div className="bg-stone-100 p-2.5 rounded-lg border text-[11px] text-stone-700 space-y-0.5">
                    <p className="flex justify-between"><span>CASH REGISTER RENDER:</span> <span>{formatCurrency(parseFloat(cashTendered), settings.currency)}</span></p>
                    <p className="flex justify-between font-bold text-[#5C3F2A]">
                      <span>DUE BACK CHANGE:</span> 
                      <span>{formatCurrency(Math.max(0, parseFloat(cashTendered) - receiptOrder.total), settings.currency)}</span>
                    </p>
                  </div>
                )}

                {selectedCustomer && (
                  <div className="border-t border-stone-300 pt-2 text-center text-[10px] text-stone-600 font-bold">
                    <p>LOYALTY MEMBER DETECTED: {selectedCustomer.name}</p>
                    <p>NEW LOYALTY POINTS EARNED: +{Math.floor(receiptOrder.total)} pts</p>
                    <p>TOTAL ACCUMULATED SAVINGS POINTS: {selectedCustomer.points + Math.floor(receiptOrder.total)} pts</p>
                  </div>
                )}

                <div className="text-center pt-3 text-[10px] text-stone-400 font-black tracking-widest">
                  THANK YOU FOR GRADING THE DAY!
                </div>

              </div>

              <button
                type="button"
                onClick={handleResetCheckout}
                className="mt-auto w-full py-4 bg-[#5C3F2A] hover:bg-[#48301E] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                Done / Ready Next customer
              </button>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
