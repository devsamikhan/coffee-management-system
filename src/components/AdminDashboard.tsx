/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  BarChart as RechartsBarChart, Bar, LineChart as RechartsLineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Users, Package, Clock, ShoppingBag, Settings as SettingsIcon, 
  Plus, Edit2, Trash2, Check, RefreshCw, Download, AlertTriangle, UserCheck, Play,
  Search, Filter, Calendar, Award, DollarSign, BarChart3, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { 
  MenuItem, Ingredient, Shift, Customer, Order, StoreSettings, User, MenuItemRecipe, ModifierGroup, ModifierOption
} from '../types';
import { formatCurrency, formatDate, formatDateTime, downloadCSV } from '../utils';

// Lazy-loaded secure modular subcomponents with React.lazy
const AdminReports = lazy(() => import('./reports/AdminReports').then(m => ({ default: m.AdminReports })));
const ManagerReports = lazy(() => import('./reports/ManagerReports').then(m => ({ default: m.ManagerReports })));
const StaffReports = lazy(() => import('./reports/StaffReports').then(m => ({ default: m.StaffReports })));
const UserManagement = lazy(() => import('./admin/UserManagement').then(m => ({ default: m.UserManagement })));

/**
 * Gorgeous glassmorphic loading skeleton component with elegant warm coffee theme gradients
 * serves as the fallback UI while chunks are being fetched over the network.
 */
export function SkeletonPulse() {
  return (
    <div className="w-full bg-white/30 backdrop-blur-md border border-white/20 rounded-3xl p-6 space-y-6 shadow-lg animate-pulse">
      {/* Skeleton Header */}
      <div className="flex items-center justify-between border-b border-[#F2ECE4]/50 pb-4">
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-gradient-to-r from-[#5C3F2A]/20 to-[#8C6239]/20 rounded-lg w-1/3" />
          <div className="h-3 bg-[#8C6239]/10 rounded-md w-1/2" />
        </div>
        <div className="h-10 bg-gradient-to-r from-[#5C3F2A]/10 to-[#8C6239]/10 rounded-xl w-32" />
      </div>

      {/* Skeleton Content Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/40 border border-white/25 rounded-2xl p-4.5 space-y-3.5 shadow-sm">
            <div className="h-3 bg-[#8B7565]/20 rounded w-1/2" />
            <div className="h-7 bg-gradient-to-r from-[#5C3F2A]/15 to-[#8C6239]/15 rounded-lg w-2/3" />
            <div className="h-3 bg-stone-300/40 rounded w-3/4" />
          </div>
        ))}
      </div>

      {/* Skeleton Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/40 border border-white/25 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-[#FAF6EE]/50 pb-3">
            <div className="h-4 bg-[#5C3F2A]/20 rounded w-1/4" />
            <div className="h-8 bg-[#8C6239]/10 rounded-lg w-24" />
          </div>
          <div className="h-56 bg-gradient-to-b from-[#5C3F2A]/5 to-[#8C6239]/5 rounded-2xl flex items-end p-4 justify-between">
            {[30, 45, 20, 60, 80, 50, 70, 95, 40].map((h, idx) => (
              <div
                key={idx}
                className="w-8 rounded-t-lg bg-gradient-to-t from-[#5C3F2A]/10 to-[#8C6239]/10"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="bg-white/40 border border-white/25 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="h-4 bg-stone-400/20 rounded w-1/3 mb-4" />
            <div className="h-36 w-36 mx-auto rounded-full border-8 border-double border-[#8C6239]/10 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#5C3F2A]/20 to-[#8C6239]/20 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-400/35 shrink-0" />
                <div className="h-3 bg-stone-400/20 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AdminDashboardProps {
  token: string;
  currentUser: { id: string; name: string; role: 'admin' | 'manager' | 'barista' };
  settings: StoreSettings;
  ingredients: Ingredient[];
  onRefreshDB: () => void; // Trigger standard DB pull
  onLogout: () => void;
}

export default function AdminDashboard({ token, currentUser, settings, ingredients, onRefreshDB, onLogout }: AdminDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'menu' | 'inventory' | 'scheduling' | 'loyalty' | 'staff' | 'settings' | 'reports'>('analytics');
  
  // Reports Hub interactive filtering and navigation states
  const [reportsTab, setReportsTab] = useState<'sales' | 'inventory' | 'staff' | 'loyalty'>('sales');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  
  // States fetched from backend
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [recipes, setRecipes] = useState<MenuItemRecipe[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>({
    todaySales: 0, todayOrdersCount: 0, avgOrderValue: 0, lowStockCount: 0, todayShiftLaborCost: 0, topSellers: []
  });
  const [chartData, setChartData] = useState<any>({ timeline: [], categories: [] });
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);

  // Editing forms state
  const [editingMenuItem, setEditingMenuItem] = useState<Partial<MenuItem> | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<Partial<Ingredient> | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Partial<User> | null>(null);
  const [schedulingShift, setSchedulingShift] = useState<Partial<Shift> | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [storeSettingsForm, setStoreSettingsForm] = useState<StoreSettings>(settings);

  // Modal active recipes state
  const [activeRecipeMapItem, setActiveRecipeMapItem] = useState<MenuItem | null>(null);
  const [activeRecipeInputs, setActiveRecipeInputs] = useState<{ ingredientId: string; quantity: number }[]>([]);

  const COLORS = ['#5C3F2A', '#8C6239', '#CF9A72', '#EDD3C4', '#A59283', '#5D6B54', '#8C9A86'];

  // Fetch all administration datasets
  const fetchAllData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [menuRes, orderRes, shiftRes, custRes, empRes, recRes, metricsRes, chartRes, alertRes] = await Promise.all([
        fetch('/api/menu').then(r => r.json()),
        fetch('/api/orders', { headers }).then(r => r.json()),
        fetch('/api/shifts', { headers }).then(r => r.json()),
        fetch('/api/customers', { headers }).then(r => r.json()),
        fetch('/api/employees', { headers }).then(r => r.json()),
        fetch('/api/recipes', { headers }).then(r => r.json()),
        fetch('/api/reports/dashboard', { headers }).then(r => r.json()),
        fetch('/api/reports/sales', { headers }).then(r => r.json()),
        fetch('/api/alerts', { headers }).then(r => r.json())
      ]);

      if (Array.isArray(menuRes)) setMenuItems(menuRes);
      if (Array.isArray(orderRes)) setOrders(orderRes);
      if (Array.isArray(shiftRes)) setShifts(shiftRes);
      if (Array.isArray(custRes)) setCustomers(custRes);
      if (Array.isArray(empRes)) setEmployees(empRes);
      if (Array.isArray(recRes)) setRecipes(recRes);
      if (metricsRes && !metricsRes.error) setDashboardMetrics(metricsRes);
      if (chartRes && !chartRes.error) setChartData(chartRes);
      if (Array.isArray(alertRes)) setSystemAlerts(alertRes);

      // Trigger standard callback inventory sync
      onRefreshDB();
    } catch (err) {
      console.error("Failed to load dashboard payload: ", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token, activeSubTab]);

  useEffect(() => {
    if (currentUser.role === 'barista' && (reportsTab === 'sales' || reportsTab === 'loyalty')) {
      setReportsTab('inventory');
    }
  }, [currentUser.role, reportsTab]);

  // --- CSV Export Handlers ---
  const handleExportOrdersCSV = () => {
    const headers = ["Order ID", "Timestamp", "Total Price", "Barista", "Payment Method", "Discount Code"];
    const rows = orders.map(o => [
      o.id,
      formatDateTime(o.timestamp),
      o.total,
      o.baristaName,
      o.paymentMethod,
      o.discount?.code || "None"
    ]);
    downloadCSV(`Daily_Grind_Orders_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const handleExportPayrollCSV = () => {
    const headers = ["Employee Name", "Role", "Hourly Wage", "Date", "Expected Wage", "Hours Worked", "Clock In", "Clock Out"];
    const completedShifts = shifts.filter(s => s.clockInTime && s.clockOutTime);
    const rows = completedShifts.map(s => [
      s.employeeName,
      employees.find(e => e.id === s.employeeId)?.role || "Barista",
      employees.find(e => e.id === s.employeeId)?.hourlyWage || 15.00,
      s.shiftDate,
      s.estimatedWage ?? 0,
      s.totalHoursWorked ?? 0,
      s.clockInTime ? new Date(s.clockInTime).toLocaleTimeString() : "",
      s.clockOutTime ? new Date(s.clockOutTime).toLocaleTimeString() : ""
    ]);
    downloadCSV(`Daily_Grind_Payroll_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  // --- Alerts dismiss ---
  const handleDismissAlert = async (id: string) => {
    await fetch(`/api/alerts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setSystemAlerts(prev => prev.filter(a => a.id !== id));
  };

  // --- CRUD Menu operations ---
  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenuItem) return;

    const isNew = !editingMenuItem.id;
    const url = isNew ? '/api/menu' : `/api/menu/${editingMenuItem.id}`;
    const method = isNew ? 'POST' : 'PUT';

    // Supply placeholder Unsplash URL if empty
    if (!editingMenuItem.imageUrl) {
      editingMenuItem.imageUrl = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&auto=format&fit=crop&q=60";
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingMenuItem)
      });

      if (response.ok) {
        setEditingMenuItem(null);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm("Are you sure you want to remove this menu item?")) return;
    try {
      await fetch(`/api/menu/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Recipe Link builders ---
  const handleTriggerRecipeForm = (item: MenuItem) => {
    setActiveRecipeMapItem(item);
    const existingRecipe = recipes.find(r => r.menuItemId === item.id);
    if (existingRecipe) {
      setActiveRecipeInputs([...existingRecipe.requirements]);
    } else {
      setActiveRecipeInputs([{ ingredientId: ingredients[0]?.id || '', quantity: 0 }]);
    }
  };

  const handleAddRecipeRow = () => {
    setActiveRecipeInputs(prev => [...prev, { ingredientId: ingredients[0]?.id || '', quantity: 0 }]);
  };

  const handleRemoveRecipeRow = (idx: number) => {
    setActiveRecipeInputs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveRecipe = async () => {
    if (!activeRecipeMapItem) return;
    try {
      const response = await fetch(`/api/recipes/${activeRecipeMapItem.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requirements: activeRecipeInputs })
      });

      if (response.ok) {
        setActiveRecipeMapItem(null);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- CRUD Ingredients / Stock operations ---
  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIngredient) return;

    const isNew = !editingIngredient.id;
    const url = isNew ? '/api/ingredients' : `/api/ingredients/${editingIngredient.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingIngredient)
      });

      if (response.ok) {
        setEditingIngredient(null);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Restock helper
  const handleQuickRestock = async (ing: Ingredient, amount: number) => {
    try {
      await fetch(`/api/ingredients/${ing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stockLevel: ing.stockLevel + amount, lastRestocked: new Date().toISOString().split('T')[0] })
      });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Schedule Shift operations ---
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingShift) return;

    const isNew = !schedulingShift.id;
    const url = isNew ? '/api/shifts' : `/api/shifts/${schedulingShift.id}`;
    const method = isNew ? 'POST' : 'PUT';

    // Map employeeName automatically
    const emp = employees.find(e => e.id === schedulingShift.employeeId);
    if (emp) {
      schedulingShift.employeeName = emp.name;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(schedulingShift)
      });

      if (response.ok) {
        setSchedulingShift(null);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm("Remove this shift planning?")) return;
    try {
      await fetch(`/api/shifts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- CRUD Employees Management ---
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const isNew = !editingEmployee.id;
    const url = isNew ? '/api/employees' : `/api/employees/${editingEmployee.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingEmployee)
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Save action failed.");
        return;
      }

      setEditingEmployee(null);
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Settings modifications ---
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(storeSettingsForm)
      });
      if (response.ok) {
        alert("Store metadata successfully updated!");
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- System Reports are now managed by modular secure subcomponents ---

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-screen bg-[#FAF8F5]">
      
      {/* Interactive Tabs bar header */}
      <div className="bg-white border-b border-[#F2ECE4] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm">
        
        <div className="flex items-center gap-3">
          <div className="bg-[#8C6239] text-white p-2.5 rounded-2xl shadow-md">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#2B1B10]">Management Console</h2>
            <p className="text-xs text-[#8B7565] font-semibold mt-0.5 select-none uppercase tracking-wide">
              Logged in: <strong className="text-stone-800 font-bold">{currentUser.name}</strong> ({currentUser.role})
            </p>
          </div>
        </div>

        {/* Tab Links lists */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none select-none">
          {currentUser.role !== 'barista' && (
            <button
              onClick={() => setActiveSubTab('analytics')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border ${
                activeSubTab === 'analytics'
                  ? 'bg-[#563a24] text-white border-[#563a24] shadow-md'
                  : 'bg-white text-[#8B7565] border-[#E9E4DC] hover:bg-[#FDFBF7]'
              }`}
            >
              Analytics Reports
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border ${
              activeSubTab === 'reports'
                ? 'bg-[#563a24] text-white border-[#563a24] shadow-md'
                : 'bg-white text-[#8B7565] border-[#E9E4DC] hover:bg-[#FDFBF7]'
            }`}
          >
            System Reports Hub
          </button>
          
          {currentUser.role !== 'barista' && (
            <>
              <button
                onClick={() => setActiveSubTab('menu')}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border ${
                  activeSubTab === 'menu'
                    ? 'bg-[#563a24] text-white border-[#563a24] shadow-md'
                    : 'bg-white text-[#8B7565] border-[#E9E4DC] hover:bg-[#FDFBF7]'
                }`}
              >
                Products / Menus
              </button>
              
              <button
                onClick={() => setActiveSubTab('inventory')}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border ${
                  activeSubTab === 'inventory'
                    ? 'bg-[#563a24] text-white border-[#563a24] shadow-md'
                    : 'bg-white text-[#8B7565] border-[#E9E4DC] hover:bg-[#FDFBF7]'
                }`}
              >
                Inventory Stock
              </button>
              
              <button
                onClick={() => setActiveSubTab('scheduling')}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border ${
                  activeSubTab === 'scheduling'
                    ? 'bg-[#563a24] text-white border-[#563a24] shadow-md'
                    : 'bg-white text-[#8B7565] border-[#E9E4DC] hover:bg-[#FDFBF7]'
                }`}
              >
                Schedules & Payroll
              </button>

              <button
                onClick={() => setActiveSubTab('loyalty')}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border ${
                  activeSubTab === 'loyalty'
                    ? 'bg-[#563a24] text-white border-[#563a24] shadow-md'
                    : 'bg-white text-[#8B7565] border-[#E9E4DC] hover:bg-[#FDFBF7]'
                }`}
              >
                Loyalty Clubs
              </button>
            </>
          )}

          {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <button
              onClick={() => setActiveSubTab('staff')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border ${
                activeSubTab === 'staff'
                  ? 'bg-[#563a24] text-white border-[#563a24] shadow-md'
                  : 'bg-white text-[#8B7565] border-[#E9E4DC] hover:bg-[#FDFBF7]'
              }`}
            >
              System Staff
            </button>
          )}

          {currentUser.role !== 'barista' && (
            <button
              onClick={() => setActiveSubTab('settings')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border ${
                activeSubTab === 'settings'
                  ? 'bg-[#563a24] text-white border-[#563a24] shadow-md'
                  : 'bg-white text-[#8B7565] border-[#E9E4DC] hover:bg-[#FDFBF7]'
              }`}
            >
              Settings
            </button>
          )}
        </div>
      </div>

      {/* Main scrolling inner workspace */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* --- SYSTEM NOTIFICATIONS / ALERTS BANNER --- */}
        {systemAlerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-black text-rose-800 uppercase tracking-widest flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> Operational Attention Required ({systemAlerts.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {systemAlerts.map(alert => (
                <div key={alert.id} className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start justify-between gap-3 shadow-sm animate-pulse-slow">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-rose-900 leading-snug">{alert.message}</p>
                    <span className="text-[10px] text-rose-500 font-bold block">{formatDateTime(alert.timestamp)}</span>
                  </div>
                  <button
                    onClick={() => handleDismissAlert(alert.id)}
                    className="text-rose-700 hover:text-rose-900 font-black text-[10px] uppercase border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-white transition-all tracking-wider shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full"
          >

        {/* =========================================================================
            A. ANALYTICS TABS 
           ========================================================================= */}
        {activeSubTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Bento-grid KPIs Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              
              <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Today's Sales</span>
                <div className="my-2.5">
                  <span className="text-2xl font-black text-[#5C3F2A]">
                    {formatCurrency(dashboardMetrics.todaySales, settings.currency)}
                  </span>
                </div>
                <span className="text-[10px] text-green-700 font-bold block leading-none">Complete checkout transactions</span>
              </div>

              <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Completed Orders</span>
                <div className="my-2.5">
                  <span className="text-2xl font-black text-stone-800">
                    {dashboardMetrics.todayOrdersCount}
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 font-bold block leading-none">Today's invoice count</span>
              </div>

              <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Average Basket</span>
                <div className="my-2.5">
                  <span className="text-2xl font-black text-stone-800">
                    {formatCurrency(dashboardMetrics.avgOrderValue, settings.currency)}
                  </span>
                </div>
                <span className="text-[10px] text-[#8B7565] font-bold block leading-none">Sales per ticket basket</span>
              </div>

              <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Low Stock Reserves</span>
                <div className="my-2.5">
                  <span className="text-2xl font-black text-rose-700">
                    {dashboardMetrics.lowStockCount}
                  </span>
                </div>
                <span className="text-[10px] text-rose-600 font-bold block leading-none">Alerting items supply counts</span>
              </div>

              <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
                <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Today Labor Cost</span>
                <div className="my-2.5">
                  <span className="text-2xl font-black text-amber-900">
                    {formatCurrency(dashboardMetrics.todayShiftLaborCost, settings.currency)}
                  </span>
                </div>
                <span className="text-[10px] text-amber-700 font-bold block leading-none">Scheduled shifts payout</span>
              </div>

            </div>

            {/* Graphic visual charts row using Recharts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="bg-white rounded-3xl border border-[#EBE6DF] p-6 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between mb-4 border-b border-[#FAF6EE] pb-2">
                  <h4 className="font-extrabold text-stone-800 text-sm select-none">Daily Sales Velocity Timeline</h4>
                  <button
                    onClick={handleExportOrdersCSV}
                    className="p-2 border bg-stone-50 hover:bg-stone-100 rounded-xl flex items-center gap-1.5 text-[11px] font-black text-[#5C3F2A] transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <Download className="h-3.5 w-3.5" /> Export All Orders (.csv)
                  </button>
                </div>
                
                <div className="h-64 mt-3">
                  {chartData.timeline && chartData.timeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={chartData.timeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F4F2EE" />
                        <XAxis dataKey="date" stroke="#9E8B7E" fontSize={10} fontWeight="bold" />
                        <YAxis stroke="#9E8B7E" fontSize={10} fontWeight="bold" />
                        <RechartsTooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                        <Line type="monotone" dataKey="sales" stroke="#5C3F2A" strokeWidth={3} activeDot={{ r: 6 }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#C4B7AC]">No historical order sales.</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-[#EBE6DF] p-6 shadow-sm">
                <h4 className="font-extrabold text-stone-800 text-sm mb-4 border-b border-[#FAF6EE] pb-2">Sales Allocation By Category</h4>
                <div className="h-44 flex items-center justify-center relative mt-3">
                  {chartData.categories && chartData.categories.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.categories}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.categories.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => [`$${value}`, 'Amount Share']} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-[#C4B7AC]">No catalog categorizations logs.</div>
                  )}
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold text-[#8B7565]">
                  {chartData.categories && chartData.categories.map((entry: any, index: number) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="truncate">{entry.name}: <strong>{formatCurrency(entry.value, settings.currency)}</strong></span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Top selling table review */}
            <div className="bg-white rounded-3xl border border-[#EBE6DF] p-6 shadow-sm">
              <h4 className="font-extrabold text-stone-800 text-sm mb-4 border-b border-[#FAF6EE] pb-2">Top Selling Coffee & Goods Menu Items</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#F4ECE4] text-[#8B7565] font-black uppercase tracking-wider">
                      <th className="py-2.5">Menu Item</th>
                      <th className="py-2.5">Quantity Sold</th>
                      <th className="py-2.5">Generated Revenues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardMetrics.topSellers && dashboardMetrics.topSellers.map((seller: any, idx: number) => (
                      <tr key={idx} className="border-b border-[#FAF6EE] font-medium text-stone-700">
                        <td className="py-2.5 font-bold text-stone-900">{seller.name}</td>
                        <td className="py-2.5 font-mono">{seller.qty} items</td>
                        <td className="py-2.5 font-bold text-amber-900">{formatCurrency(seller.total, settings.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            H. SYSTEM REPORTS HUB TAB
           ========================================================================= */}
        {activeSubTab === 'reports' && (() => {
          const mappedRole: 'admin' | 'manager' | 'staff' = currentUser.role === 'barista' ? 'staff' : (currentUser.role as any);
          return (
            <div className="space-y-6 animate-fade-in">
              
              {/* Main Reports Hub Title Panel */}
              <div className="bg-gradient-to-r from-[#5C3F2A] to-[#8C6239] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden font-sans">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 font-black text-9xl select-none">
                  REPORTS
                </div>
                <div className="relative z-10 space-y-2">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-[#EDD3C4]" />
                    Daily Grind — Operations Reports Center
                  </h3>
                  <p className="text-xs text-[#EDD3C4] font-medium max-w-xl leading-relaxed">
                    Access advanced operations reporting, ingredient stocks logs, wage bills timesheets, and customer referral tallies. Update filters to compute real-time statistics and download CSV spreadsheets.
                  </p>
                </div>
              </div>

              {/* Sub-Navigation and Quick Filters controls */}
              {mappedRole !== 'staff' && (
                <div className="bg-white border border-[#E9E4DC] p-4.5 rounded-3xl shadow-sm space-y-4">
                  
                  {/* Reports categories subtab switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#FAF6EE] pb-3">
                    
                    {/* Mobile Select Switcher (visible on mobile only) */}
                    <div className="block sm:hidden w-full max-w-xs">
                      <label className="block text-[9px] font-black text-[#5C3F2A] uppercase mb-1">
                        Report Category
                      </label>
                      <select
                        value={reportsTab}
                        onChange={(e) => setReportsTab(e.target.value as any)}
                        className="w-full h-11 px-3 bg-[#FCFBF9] border border-[#DECFB5] rounded-xl text-xs text-[#5C3F2A] font-extrabold focus:outline-none cursor-pointer select-none"
                      >
                        <option value="sales">💰 Sales & Revenues</option>
                        <option value="inventory">📦 Stock & Depletion</option>
                        <option value="staff">⏰ Labor & Wage Payroll</option>
                        <option value="loyalty">🏅 Loyalty Customer Engagement</option>
                      </select>
                    </div>

                    {/* Desktop Button Switcher (visible on tablet/desktop only) */}
                    <div className="hidden sm:flex flex-wrap gap-2 select-none">
                      <button
                        onClick={() => setReportsTab('sales')}
                        className={`px-4 h-11 text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border min-h-[44px] ${
                          reportsTab === 'sales'
                            ? 'bg-[#5C3F2A] text-white border-[#5C3F2A] shadow-sm'
                            : 'bg-[#FCFBF9] text-[#8B7565] border-[#E9E4DC] hover:bg-stone-50'
                        }`}
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        Sales & Revenues
                      </button>
                      
                      <button
                        onClick={() => setReportsTab('inventory')}
                        className={`px-4 h-11 text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border min-h-[44px] ${
                          reportsTab === 'inventory'
                            ? 'bg-[#5C3F2A] text-white border-[#5C3F2A] shadow-sm'
                            : 'bg-[#FCFBF9] text-[#8B7565] border-[#E9E4DC] hover:bg-stone-50'
                        }`}
                      >
                        <Package className="h-3.5 w-3.5" />
                        Stock & Depletion
                      </button>
                      
                      <button
                        onClick={() => setReportsTab('staff')}
                        className={`px-4 h-11 text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border min-h-[44px] ${
                          reportsTab === 'staff'
                            ? 'bg-[#5C3F2A] text-white border-[#5C3F2A] shadow-sm'
                            : 'bg-[#FCFBF9] text-[#8B7565] border-[#E9E4DC] hover:bg-stone-50'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Labor & Wage Payroll
                      </button>
                      
                      <button
                        onClick={() => setReportsTab('loyalty')}
                        className={`px-4 h-11 text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border min-h-[44px] ${
                          reportsTab === 'loyalty'
                            ? 'bg-[#5C3F2A] text-white border-[#5C3F2A] shadow-sm'
                            : 'bg-[#FCFBF9] text-[#8B7565] border-[#E9E4DC] hover:bg-stone-50'
                        }`}
                      >
                        <Award className="h-3.5 w-3.5" />
                        Loyalty Customer Engagement
                      </button>
                    </div>
                  </div>

                  {/* Filter Inputs Drawer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {(reportsTab === 'sales' || reportsTab === 'staff') && (
                      <>
                        <div>
                          <label className="block text-[9px] font-black text-[#5C3F2A] uppercase mb-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Start Date
                          </label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full py-1.5 px-3 bg-[#FCFBF9] border border-[#DECFB5] rounded-xl text-xs text-[#5C3F2A] font-bold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-[#5C3F2A] uppercase mb-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> End Date
                          </label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full py-1.5 px-3 bg-[#FCFBF9] border border-[#DECFB5] rounded-xl text-xs text-[#5C3F2A] font-bold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-[#5C3F2A] uppercase mb-1 flex items-center gap-1">
                            <Users className="h-3 w-3" /> Filter Barista Staff
                          </label>
                          <select
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            className="w-full py-1.5 px-3 bg-[#FCFBF9] border border-[#DECFB5] rounded-xl text-xs text-[#5C3F2A] font-bold focus:outline-none cursor-pointer"
                          >
                            <option value="all">All Employees</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {(reportsTab === 'sales' || reportsTab === 'inventory' || reportsTab === 'loyalty') && (
                      <div className={(reportsTab === 'sales') ? 'col-span-1' : 'col-span-2'}>
                        <label className="block text-[9px] font-black text-[#5C3F2A] uppercase mb-1 flex items-center gap-1">
                          <Search className="h-3 w-3" /> Search Records
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={
                              reportsTab === 'sales' ? 'Search by Order ID, codes...' :
                              reportsTab === 'inventory' ? 'Search ingredients, suppliers...' :
                              'Search members by name, email, phone...'
                            }
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full py-1.5 pl-8 pr-3 bg-[#FCFBF9] border border-[#DECFB5] rounded-xl text-xs text-[#5C3F2A] focus:outline-none"
                          />
                          <Search className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-2" />
                        </div>
                      </div>
                    )}

                    {/* Reset Filter Button */}
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                          setEmployeeFilter('all');
                          setSearchQuery('');
                        }}
                        className="w-full py-1.5 border border-[#DECFB5] hover:bg-stone-50 text-[10px] font-black text-[#8B7565] uppercase rounded-xl transition-all cursor-pointer"
                      >
                        Clear Search Filters
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Conditional layouts based on user roles */}
              <Suspense fallback={<SkeletonPulse />}>
                {mappedRole === 'admin' && (
                  <AdminReports
                    orders={orders}
                    shifts={shifts}
                    employees={employees}
                    settings={settings}
                    startDate={startDate}
                    endDate={endDate}
                    employeeFilter={employeeFilter}
                    searchQuery={searchQuery}
                  />
                )}

                {mappedRole === 'manager' && (
                  <ManagerReports
                    ingredients={ingredients}
                    menuItems={menuItems}
                    recipes={recipes}
                    shifts={shifts}
                    settings={settings}
                    searchQuery={searchQuery}
                  />
                )}

                {mappedRole === 'staff' && (
                  <StaffReports
                    ingredients={ingredients}
                    menuItems={menuItems}
                    recipes={recipes}
                    shifts={shifts}
                    currentUser={currentUser}
                  />
                )}
              </Suspense>
            </div>
          );
        })()}

        {/* =========================================================================
            B. MENU PRODUCT MAINTENANCE TABS
           ========================================================================= */}
        {activeSubTab === 'menu' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#F2ECE4] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-stone-800 select-none">Coffee Shop Menu Catalog</h3>
                <p className="text-xs text-[#8B7565] mt-0.5 leading-none">Configure beverages, food items, price modifications, and standard ingredients recipes.</p>
              </div>
              <button
                onClick={() => setEditingMenuItem({ name: '', description: '', price: 0, category: 'Coffee', isAvailable: true, modifiers: [] })}
                className="py-2.5 px-4 bg-[#5C3F2A] hover:bg-[#48301E] text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Menu Item
              </button>
            </div>

            {/* Overlay Active Recipe Map Modal */}
            <AnimatePresence>
              {activeRecipeMapItem && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-[#ECE6DB] flex flex-col max-h-[85vh]"
                  >
                    <h3 className="font-extrabold text-[#2B1B10] text-sm pb-1.5 border-b border-[#FAF6EE]">
                      Ingredient Recipe Formula: {activeRecipeMapItem.name}
                    </h3>
                    <p className="text-[11px] text-[#8B7565] mt-1 mb-4 leading-normal">
                      Map this beverage/food to individual dry or fluid ingredients. The system will slice the stock weights during real checkout events!
                    </p>

                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                      {activeRecipeInputs.map((row, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <select
                            value={row.ingredientId}
                            onChange={(e) => {
                              const next = [...activeRecipeInputs];
                              next[idx].ingredientId = e.target.value;
                              setActiveRecipeInputs(next);
                            }}
                            className="flex-1 py-1.5 px-3 bg-stone-50 border border-[#DECFB5] rounded-xl text-xs font-semibold text-[#5C3F2A] focus:outline-none"
                          >
                            {ingredients.map(ing => (
                              <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                            ))}
                          </select>
                          
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              required
                              placeholder="Qty"
                              value={row.quantity || ''}
                              onChange={(e) => {
                                const next = [...activeRecipeInputs];
                                next[idx].quantity = parseFloat(e.target.value) || 0;
                                setActiveRecipeInputs(next);
                              }}
                              className="w-20 py-1.5 px-2 bg-stone-50 border border-[#DECFB5] rounded-xl text-xs font-mono font-bold focus:outline-none text-center"
                            />
                            <span className="text-[10px] text-[#8B7565] font-black w-6">
                              {ingredients.find(i => i.id === row.ingredientId)?.unit || ''}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveRecipeRow(idx)}
                            className="text-red-600 hover:scale-105 font-bold text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      
                      <button
                        onClick={handleAddRecipeRow}
                        className="text-[11px] font-black text-amber-800 hover:scale-105 flex items-center gap-1 uppercase tracking-wide cursor-pointer"
                      >
                        + Add Recipe Ingredient Row
                      </button>
                    </div>

                    <div className="pt-4 border-t border-[#F2ECE4] flex gap-3 mt-4">
                      <button
                        onClick={() => setActiveRecipeMapItem(null)}
                        className="flex-1 py-2.5 border border-stone-300 text-stone-600 font-bold text-xs rounded-xl"
                      >
                        Discard Form
                      </button>
                      <button
                        onClick={handleSaveRecipe}
                        className="flex-1 py-2.5 bg-[#5C3F2A] hover:bg-[#48301E] text-white font-extrabold text-xs rounded-xl shadow-md"
                      >
                        Save Recipe Formulas
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {editingMenuItem && (
                <motion.form
                  onSubmit={handleSaveMenuItem}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="bg-[#FAF6EE] border border-[#DECFB5] rounded-3xl p-6 space-y-4 shadow-sm overflow-hidden"
                >
                  <h4 className="font-extrabold text-[#5C3F2A] text-sm border-b border-[#DECFB5] pb-2 select-none">
                    {editingMenuItem.id ? "Edit Menu Configuration" : "Add Brand New Menu Item"}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Item Title Name</label>
                      <input
                        type="text"
                        required
                        value={editingMenuItem.name}
                        onChange={(e) => setEditingMenuItem({ ...editingMenuItem, name: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Category Group</label>
                      <select
                        value={editingMenuItem.category}
                        onChange={(e) => setEditingMenuItem({ ...editingMenuItem, category: e.target.value as any })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      >
                        <option value="Coffee">Coffee</option>
                        <option value="Tea">Tea</option>
                        <option value="Cold Drinks">Cold Drinks</option>
                        <option value="Bakery">Bakery</option>
                        <option value="Food">Food</option>
                        <option value="Retail">Retail</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Base Price ({settings.currency})</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editingMenuItem.price || ''}
                        onChange={(e) => setEditingMenuItem({ ...editingMenuItem, price: parseFloat(e.target.value) || 0 })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Description Description</label>
                      <input
                        type="text"
                        required
                        value={editingMenuItem.description}
                        onChange={(e) => setEditingMenuItem({ ...editingMenuItem, description: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Image Asset Unsplash URL</label>
                      <input
                        type="text"
                        required
                        placeholder="https://images.unsplash.com/photo-..."
                        value={editingMenuItem.imageUrl}
                        onChange={(e) => setEditingMenuItem({ ...editingMenuItem, imageUrl: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingMenuItem(null)}
                      className="py-1.5 px-4 border border-stone-300 text-stone-600 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-1.5 px-5 bg-[#5C3F2A] hover:bg-[#48301E] text-white rounded-xl font-black text-xs shadow-md cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Menu Items Table list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map(item => {
                const recipeFormula = recipes.find(r => r.menuItemId === item.id);
                return (
                  <div key={item.id} className="bg-white border rounded-3xl p-4 flex gap-4 items-start relative hover:shadow-md transition-all">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-2xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] bg-stone-100 font-bold uppercase py-0.5 px-1.5 rounded-md text-stone-600">
                        {item.category}
                      </span>
                      <h4 className="font-extrabold text-stone-800 text-xs truncate mt-1">{item.name}</h4>
                      <p className="text-[11px] text-[#5C3F2A] font-bold mt-0.5">{formatCurrency(item.price, settings.currency)}</p>
                      
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleTriggerRecipeForm(item)}
                          className={`text-[9px] font-black px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            recipeFormula 
                              ? 'bg-[#F2ECE4] text-[#8C6239] border-[#DECFB5]' 
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {recipeFormula ? `${recipeFormula.requirements.length} Recipe Formula` : "No Recipe Linked (Click)"}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => setEditingMenuItem(item)}
                        className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-500 hover:text-[#5C3F2A]"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMenuItem(item.id)}
                        className="p-1.5 rounded-lg border border-stone-200 hover:bg-rose-50 text-stone-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            C. INVENTORY SUPPLY AND STOCK ADJUSTMENT TABS 
           ========================================================================= */}
        {activeSubTab === 'inventory' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#F2ECE4] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-stone-800 select-none">Coffee Ingredient Stock reserves</h3>
                <p className="text-xs text-[#8B7565] mt-0.5 leading-none">Track storage weights, coffee bean bags, milk jugs, containers supply, and supplier contact listings.</p>
              </div>
              <button
                onClick={() => setEditingIngredient({ name: '', stockLevel: 0, unit: 'g', lowStockThreshold: 100, supplierName: '', supplierContact: '' })}
                className="py-2.5 px-4 bg-[#5C3F2A] hover:bg-[#48301E] text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Storage Ingredient
              </button>
            </div>

            <AnimatePresence>
              {editingIngredient && (
                <motion.form
                  onSubmit={handleSaveIngredient}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="bg-[#FAF6EE] border border-[#DECFB5] rounded-3xl p-6 space-y-4 shadow-sm overflow-hidden"
                >
                  <h4 className="font-extrabold text-[#5C3F2A] text-sm border-b border-[#DECFB5] pb-2">
                    {editingIngredient.id ? "Manual Adjustment Item" : "Create New Storage Parameter"}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Ingredient Title</label>
                      <input
                        type="text"
                        required
                        value={editingIngredient.name}
                        onChange={(e) => setEditingIngredient({ ...editingIngredient, name: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Current Stock Reserves</label>
                      <input
                        type="number"
                        required
                        value={editingIngredient.stockLevel || ''}
                        onChange={(e) => setEditingIngredient({ ...editingIngredient, stockLevel: parseFloat(e.target.value) || 0 })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Storage Unit</label>
                      <select
                        value={editingIngredient.unit}
                        onChange={(e) => setEditingIngredient({ ...editingIngredient, unit: e.target.value as any })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      >
                        <option value="ml">ml (Fluids)</option>
                        <option value="g">g (Beans / Powders)</option>
                        <option value="pieces">pieces (Cups / Napkins)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Low Stock Alert Threshold</label>
                      <input
                        type="number"
                        required
                        value={editingIngredient.lowStockThreshold || ''}
                        onChange={(e) => setEditingIngredient({ ...editingIngredient, lowStockThreshold: parseFloat(e.target.value) || 0 })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Supplier Brand Name</label>
                      <input
                        type="text"
                        value={editingIngredient.supplierName}
                        onChange={(e) => setEditingIngredient({ ...editingIngredient, supplierName: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Supplier Business Email / Tel</label>
                      <input
                        type="text"
                        value={editingIngredient.supplierContact}
                        onChange={(e) => setEditingIngredient({ ...editingIngredient, supplierContact: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingIngredient(null)}
                      className="py-1.5 px-4 border border-stone-300 text-stone-600 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      className="py-1.5 px-5 bg-[#5C3F2A] hover:bg-[#48301E] text-white rounded-xl font-black text-xs shadow-md cursor-pointer"
                    >
                      Confirm Storage Specs
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Ingredients Table data */}
            <div className="bg-white rounded-3xl border border-[#EBE6DF] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-[#F4ECE4] text-[#8B7565] font-black uppercase tracking-wider">
                      <th className="py-3 px-4">Ingredient Name</th>
                      <th className="py-3 px-4 text-center">Remaining Reservor</th>
                      <th className="py-3 px-4 text-center">Threshold Alert</th>
                      <th className="py-3 px-4">Supplier Rep</th>
                      <th className="py-3 px-4">Last Stock event</th>
                      <th className="py-3 px-4 text-center">Acquire / Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map(ing => {
                      const low = ing.stockLevel <= ing.lowStockThreshold;
                      
                      return (
                        <tr key={ing.id} className={`border-b border-[#FAF6EE] font-medium text-stone-700 hover:bg-[#FAF9F6] ${
                          low ? 'bg-rose-50/40 hover:bg-rose-50/60' : ''
                        }`}>
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-[#2B1B10] flex items-center gap-1.5">
                              {low && <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                              {ing.name}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            <span className={low ? 'text-rose-600' : 'text-stone-800'}>
                              {ing.stockLevel} {ing.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-stone-400">
                            {ing.lowStockThreshold} {ing.unit}
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-bold text-stone-800">{ing.supplierName || 'Self Managed'}</p>
                              <p className="text-[10px] text-stone-400 font-bold">{ing.supplierContact || 'None'}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-stone-400">
                            {ing.lastRestocked ? formatDate(ing.lastRestocked) : 'Not documented'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* Quick restock buttons */}
                              <button
                                onClick={() => handleQuickRestock(ing, ing.unit === 'pieces' ? 50 : 1000)}
                                className="px-2 py-1 bg-[#F2ECE4] hover:bg-[#E5DBCB] text-[#5C3F2A] border border-[#DECFB5] font-black text-[9px] rounded-lg uppercase tracking-wider cursor-pointer"
                              >
                                Restock +{ing.unit === 'pieces' ? '50' : '1K'}
                              </button>
                              
                              <button
                                onClick={() => setEditingIngredient(ing)}
                                className="p-1 rounded bg-stone-50 hover:bg-stone-100 text-stone-500 transition-all border select-none"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            D. SHIFTS SCHEDULING AND LABOR TIMESHEET TABS 
           ========================================================================= */}
        {activeSubTab === 'scheduling' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#F2ECE4] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-stone-800 select-none">Employee weekly Shift Planner</h3>
                <p className="text-xs text-[#8B7565] mt-0.5 leading-none">Log shift calendars, approve clock-in time stamps, examine cumulative working totals, and calculate labor wage payments.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportPayrollCSV}
                  className="py-2.5 px-4 border bg-white hover:bg-stone-50 text-xs font-black text-[#5C3F2A] border-[#DCD6CC] rounded-xl shadow-sm flex items-center gap-1 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <Download className="h-4 w-4" /> Download Payroll (.csv)
                </button>
                <button
                  onClick={() => setSchedulingShift({ employeeId: employees[0]?.id || '', shiftDate: new Date().toISOString().split('T')[0], startTime: '06:00', endTime: '14:00' })}
                  className="py-2.5 px-4 bg-[#5C3F2A] hover:bg-[#48301E] text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Create Shift
                </button>
              </div>
            </div>

            <AnimatePresence>
              {schedulingShift && (
                <motion.form
                  onSubmit={handleSaveShift}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="bg-[#FAF6EE] border border-[#DECFB5] rounded-3xl p-6 space-y-4 shadow-sm overflow-hidden"
                >
                  <h4 className="font-extrabold text-[#5C3F2A] text-sm border-b border-[#DECFB5] pb-2">
                    Shift Allocation Form
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Select Employee Staff</label>
                      <select
                        value={schedulingShift.employeeId}
                        onChange={(e) => setSchedulingShift({ ...schedulingShift, employeeId: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      >
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Date OF Shift</label>
                      <input
                        type="date"
                        required
                        value={schedulingShift.shiftDate}
                        onChange={(e) => setSchedulingShift({ ...schedulingShift, shiftDate: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Shift Start Time</label>
                      <input
                        type="time"
                        required
                        value={schedulingShift.startTime}
                        onChange={(e) => setSchedulingShift({ ...schedulingShift, startTime: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Shift End Time</label>
                      <input
                        type="time"
                        required
                        value={schedulingShift.endTime}
                        onChange={(e) => setSchedulingShift({ ...schedulingShift, endTime: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setSchedulingShift(null)}
                      className="py-1.5 px-4 border border-stone-300 text-stone-600 rounded-xl font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-1.5 px-5 bg-[#5C3F2A] hover:bg-[#48301E] text-white rounded-xl font-black text-xs shadow-md"
                    >
                      Save Allocation
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Shift calendar lists */}
            <div className="bg-white rounded-3xl border border-[#EBE6DF] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-[#F4ECE4] text-[#8B7565] font-black uppercase tracking-wider">
                      <th className="py-3 px-4">Barista Employee</th>
                      <th className="py-3 px-4">Date Approved</th>
                      <th className="py-3 px-4">Scheduled Hours</th>
                      <th className="py-3 px-4">Clocked Activity</th>
                      <th className="py-3 px-4 text-center">Hours worked</th>
                      <th className="py-3 px-4">Wages calculated</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map(sh => (
                      <tr key={sh.id} className="border-b border-[#FAF6EE] font-medium text-stone-700 hover:bg-[#FAF9F6]">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-[#2B1B10]">{sh.employeeName}</div>
                        </td>
                        <td className="py-3 px-4 text-stone-500 font-bold">
                          {formatDate(sh.shiftDate)}
                        </td>
                        <td className="py-3 px-4 font-mono select-all">
                          {sh.startTime} - {sh.endTime}
                        </td>
                        <td className="py-3 px-4">
                          {sh.clockInTime ? (
                            <div className="text-[10px] space-y-0.5 font-mono">
                              <p className="text-green-700 font-bold">● CLOCKED IN: {new Date(sh.clockInTime).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</p>
                              {sh.clockOutTime ? (
                                <p className="text-stone-500">● CLOCKED OUT: {new Date(sh.clockOutTime).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</p>
                              ) : (
                                <p className="text-[#8C6239] animate-pulse font-bold">ACTIVE DUTY NOW</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] bg-stone-100 text-stone-400 font-bold px-2 py-0.5 rounded-lg">NOT CLOCKED YET</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-stone-800">
                          {sh.totalHoursWorked ? `${sh.totalHoursWorked} hrs` : '-'}
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-900 font-mono">
                          {sh.estimatedWage ? `${settings.currency}${sh.estimatedWage.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5 select-none">
                            <button
                              onClick={() => setSchedulingShift(sh)}
                              className="p-1 rounded bg-stone-50 hover:bg-stone-100 text-stone-500 border border-stone-200"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteShift(sh.id)}
                              className="p-1 rounded bg-stone-50 hover:bg-rose-50 text-stone-400 hover:text-red-600 border border-stone-200"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            E. LOYALTY CLUB SYSTEMS
           ========================================================================= */}
        {activeSubTab === 'loyalty' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#F2ECE4] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-stone-800 select-none">Loyalty Customer Club</h3>
                <p className="text-xs text-[#8B7565] mt-0.5 leading-none">Register customer accounts, review accrued rewards points (80 pts free drink offer), and view purchase history logs.</p>
              </div>
              <button
                onClick={() => setEditingCustomer({ name: '', phone: '', email: '' })}
                className="py-2.5 px-4 bg-[#5C3F2A] hover:bg-[#48301E] text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Club Member
              </button>
            </div>

            <AnimatePresence>
              {editingCustomer && (
                <motion.form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!editingCustomer) return;
                    const url = editingCustomer.id ? `/api/customers/${editingCustomer.id}` : '/api/customers';
                    const method = editingCustomer.id ? 'PUT' : 'POST';
                    
                    const response = await fetch(url, {
                      method,
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify(editingCustomer)
                    });
                    if (response.ok) {
                      setEditingCustomer(null);
                      fetchAllData();
                    }
                  }}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="bg-[#FAF6EE] border border-[#DECFB5] rounded-3xl p-6 space-y-4 shadow-sm overflow-hidden"
                >
                  <h4 className="font-extrabold text-[#5C3F2A] text-sm border-b border-[#DECFB5] pb-2">
                    Customer Registration Form
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Member Name Name</label>
                      <input
                        type="text"
                        required
                        value={editingCustomer.name}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Telephone phone</label>
                      <input
                        type="text"
                        required
                        value={editingCustomer.phone}
                        placeholder="206-555-xxxx"
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Email address</label>
                      <input
                        type="email"
                        required
                        placeholder="alice@gmail.com"
                        value={editingCustomer.email}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                        className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingCustomer(null)}
                      className="py-1.5 px-4 border border-stone-300 text-stone-600 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-1.5 px-5 bg-[#5C3F2A] hover:bg-[#48301E] text-white rounded-xl font-black text-xs shadow-md cursor-pointer"
                    >
                      Confirm Member Setup
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Customers layout list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map(cust => (
                <div key={cust.id} className="bg-white border rounded-3xl p-4 flex justify-between items-start hover:shadow-md transition-all">
                  <div className="space-y-1.5">
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 font-bold border border-emerald-150 px-2 py-0.5 rounded-lg select-none">
                      LOYALTY REWARDS CLUB
                    </span>
                    <h4 className="font-extrabold text-[#2B1B10] text-sm pt-1">{cust.name} Standard</h4>
                    <p className="text-[11px] text-stone-500 font-bold font-mono select-all shrink-0">{cust.phone} • {cust.email}</p>
                    <p className="text-xs text-[#5C3F2A] font-black">
                      Rewards Tally balance: <strong className="text-[#8C6239] text-base font-black font-mono">{cust.points}</strong> points
                    </p>
                    <span className="text-[10px] text-stone-400 block font-bold leading-none">Joined: {formatDate(cust.joinDate)}</span>
                  </div>
                  
                  <button
                    onClick={() => setEditingCustomer(cust)}
                    className="p-1.5 rounded-lg border hover:bg-stone-50 text-stone-400 hover:text-[#5C3F2A]"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            F. SYSTEM STAFF WORKERS (CRUD Accessible to ADMIN and MANAGER)
           ========================================================================= */}
        {activeSubTab === 'staff' && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
          <Suspense fallback={<SkeletonPulse />}>
            <UserManagement
              token={token}
              employees={employees}
              currentUser={currentUser}
              onRefresh={fetchAllData}
            />
          </Suspense>
        )}


        {/* =========================================================================
            G. SYSTEM SETTINGS PANEL
           ========================================================================= */}
        {activeSubTab === 'settings' && (
          <form onSubmit={handleSaveStoreSettings} className="bg-white rounded-3xl border border-[#EBE6DF] p-6 space-y-4 shadow-sm max-w-2xl animate-fade-in">
            <h3 className="text-base font-extrabold text-stone-800 select-none pb-2 border-b border-[#F2ECE4]">Store Configuration Variables</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Company / Coffee Shop title</label>
                <input
                  type="text"
                  required
                  value={storeSettingsForm.storeName}
                  onChange={(e) => setStoreSettingsForm({ ...storeSettingsForm, storeName: e.target.value })}
                  className="w-full py-1.5 px-3 bg-[#FCFBF9] border border-[#DECFB5] rounded-xl text-xs focus:ring-1 focus:ring-[#8C6239] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1 font-mono">Tax Rate Variable (e.g. 0.08 for 8%)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={storeSettingsForm.taxRate}
                  onChange={(e) => setStoreSettingsForm({ ...storeSettingsForm, taxRate: parseFloat(e.target.value) || 0 })}
                  className="w-full py-1.5 px-3 bg-[#FCFBF9] border border-[#DECFB5] rounded-xl text-xs focus:ring-1 focus:ring-[#8C6239] focus:outline-none font-bold text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Store Address location line</label>
              <input
                type="text"
                required
                value={storeSettingsForm.address}
                onChange={(e) => setStoreSettingsForm({ ...storeSettingsForm, address: e.target.value })}
                className="w-full py-1.5 px-3 bg-[#FCFBF9] border border-[#DECFB5] rounded-xl text-xs focus:ring-1 focus:ring-[#8C6239] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Business Opening hours</label>
              <input
                type="text"
                required
                value={storeSettingsForm.openingHours}
                onChange={(e) => setStoreSettingsForm({ ...storeSettingsForm, openingHours: e.target.value })}
                className="w-full py-1.5 px-3 bg-[#FCFBF9] border border-[#DECFB5] rounded-xl text-xs focus:ring-1 focus:ring-[#8C6239] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="mt-4 px-6 py-2.5 bg-[#5C3F2A] hover:bg-[#48301E] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
            >
              Save Company Configurations
            </button>
          </form>
        )}

          </motion.div>
        </AnimatePresence>

        {/* Developer Attribution & Signature Footer */}
        <footer className="text-center py-4 text-xs tracking-wider opacity-60 backdrop-blur-sm border-t border-[#8C6239]/10 mt-8 text-[#8B7565]">
          The Daily Grind Console • Developed by Sami Ullah
        </footer>

      </div>

    </div>
  );
}
