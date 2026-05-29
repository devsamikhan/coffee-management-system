import React from 'react';
import { Package, ShieldAlert, Award, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { Ingredient, MenuItem, MenuItemRecipe, Shift, StoreSettings } from '../../types';
import { formatCurrency, formatDate } from '../../utils';

interface ManagerReportsProps {
  ingredients: Ingredient[];
  menuItems: MenuItem[];
  recipes: MenuItemRecipe[];
  shifts: Shift[];
  settings: StoreSettings;
  searchQuery: string;
}

const INGREDIENT_UNIT_COSTS: Record<string, number> = {
  "ing-1": 0.05, // Espresso Beans ($0.05 / g)
  "ing-2": 0.002, // Whole Milk ($0.002 / ml)
  "ing-3": 0.02, // Caramel Sauce ($0.02 / ml)
  "ing-4": 0.003, // Almond Milk ($0.003 / ml)
  "ing-5": 0.15, // Matcha powder ($0.15 / g)
  "ing-6": 0.015, // Vanilla syrup ($0.015 / ml)
  "ing-7": 0.15, // Cup 8oz ($0.15 / piece)
  "ing-8": 0.20, // Cup 12oz ($0.20 / piece)
  "ing-9": 0.01, // Napkins ($0.01 / piece)
  "ing-10": 1.25, // Butter Croissants ($1.25 / piece)
  "ing-11": 0.95 // Chocolate Fudge Cookies ($0.95 / piece)
};

export const ManagerReports: React.FC<ManagerReportsProps> = ({
  ingredients,
  menuItems,
  recipes,
  shifts,
  settings,
  searchQuery,
}) => {
  // Operational calculations
  const getInventoryReportData = () => {
    let filtered = [...ingredients];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        i.name.toLowerCase().includes(q) || 
        (i.supplierName && i.supplierName.toLowerCase().includes(q))
      );
    }

    const lowStockCount = ingredients.filter(i => i.stockLevel <= i.lowStockThreshold).length;
    const outOfStockCount = ingredients.filter(i => i.stockLevel === 0).length;

    const getUsedInRecipes = (ingredientId: string): string[] => {
      const matched: string[] = [];
      recipes.forEach(r => {
        if (r.requirements.some(req => req.ingredientId === ingredientId)) {
          const item = menuItems.find(m => m.id === r.menuItemId);
          if (item) matched.push(item.name);
        }
      });
      return matched;
    };

    const recipeMargins = menuItems.map(item => {
      const recipe = recipes.find(r => r.menuItemId === item.id);
      let estCost = 0;
      if (recipe) {
        recipe.requirements.forEach(req => {
          const cost = INGREDIENT_UNIT_COSTS[req.ingredientId] || 0.05;
          estCost += req.quantity * cost;
        });
      }
      const margin = item.price - estCost;
      const marginPercent = item.price > 0 ? (margin / item.price) * 100 : 0;
      
      return {
        ...item,
        estimatedCost: estCost,
        margin: margin,
        marginPercent: marginPercent
      };
    });

    return {
      filteredIngredients: filtered,
      lowStockCount,
      outOfStockCount,
      getUsedInRecipes,
      recipeMargins
    };
  };

  const inv = getInventoryReportData();
  const activeShiftsCount = shifts.filter(s => s.clockInTime && !s.clockOutTime).length;

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Header Info */}
      <div className="bg-white border border-[#E9E4DC] p-5 rounded-3xl shadow-sm">
        <h4 className="font-extrabold text-[#5C3F2A] text-base flex items-center gap-2">
          <Package className="h-5 w-5 text-[#8C6239]" />
          Operations & Inventory Supervisor Dashboard
        </h4>
        <p className="text-xs text-stone-500 font-semibold mt-1 leading-relaxed">
          Monitor real-time ingredient volumes, recipe ingredient mapping, and shift coverage. Sensitive corporate financial data and net profit values are redacted.
        </p>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Redacted Asset valuation */}
        <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between relative overflow-hidden">
          <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Ingredient Assets Value</span>
          <div className="my-2.5">
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-50 text-amber-800 border border-amber-200/50 backdrop-blur-md inline-block shadow-sm"
            >
              [REDACTED - ADMINS ONLY]
            </motion.span>
          </div>
          <span className="text-[10px] text-stone-400 font-bold block leading-none">Net resource valuation</span>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Total Catalog Items</span>
          <div className="my-2.5">
            <span className="text-2xl font-black text-stone-850">
              {inv.filteredIngredients.length} ingredients
            </span>
          </div>
          <span className="text-[10px] text-stone-500 font-bold block leading-none">Registered stock catalog</span>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Critical Safety Thresholds</span>
          <div className="my-2.5">
            <span className="text-2xl font-black text-rose-700">
              {inv.lowStockCount} alerts
            </span>
          </div>
          <span className="text-[10px] text-rose-600 font-bold block leading-none">Ingredients below safety margin</span>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Active On-Duty Shifts</span>
          <div className="my-2.5">
            <span className="text-2xl font-black text-[#8C6239] animate-pulse">
              {activeShiftsCount} baristas
            </span>
          </div>
          <span className="text-[10px] text-[#8C6239] font-bold block leading-none">Currently clocked staff</span>
        </div>
      </div>

      {/* Redacted Margin Matrix */}
      <div className="bg-white rounded-3xl border border-[#EBE6DF] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#FAF6EE] flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-[#8C6239]" />
          <h4 className="font-extrabold text-stone-800 text-sm">Product Profit Margin Estimations (Sensitive Costs Redacted)</h4>
        </div>
        <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-[#F4ECE4] text-[#8B7565] font-black uppercase tracking-wider">
                <th className="py-3 px-4">Product Catalog Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Recipe Raw Cost</th>
                <th className="py-3 px-4 text-right">Retail Menu Price</th>
                <th className="py-3 px-4 text-right">Estimated Net Profit</th>
                <th className="py-3 px-4 text-center">Profit Margin %</th>
              </tr>
            </thead>
            <tbody>
              {inv.recipeMargins.map(item => (
                <tr key={item.id} className="border-b border-[#FAF6EE] hover:bg-[#FAF9F6] text-stone-700">
                  <td className="py-3 px-4 font-bold text-[#2B1B10]">{item.name}</td>
                  <td className="py-3 px-4">
                    <span className="text-[9px] bg-stone-100 font-bold uppercase py-0.5 px-2 rounded-md text-stone-600">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <motion.span
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                      className="text-[9px] bg-gradient-to-r from-amber-50 via-amber-100/40 to-amber-50 text-amber-800 px-2 py-0.5 rounded font-sans font-bold border border-amber-250/20 inline-block shadow-sm"
                    >
                      REDACTED
                    </motion.span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">{formatCurrency(item.price, settings.currency)}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    <motion.span
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                      className="text-[9px] bg-gradient-to-r from-amber-50 via-amber-100/40 to-amber-50 text-amber-800 px-2 py-0.5 rounded font-sans font-bold border border-amber-250/20 inline-block shadow-sm"
                    >
                      REDACTED
                    </motion.span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center">
                      <motion.span
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        className="text-[9px] bg-gradient-to-r from-amber-50 via-amber-100/40 to-amber-50 text-amber-800 px-2 py-0.5 rounded font-sans font-bold border border-amber-250/20 inline-block shadow-sm"
                      >
                        REDACTED
                      </motion.span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Levels & Ingredient Matrix */}
      <div className="bg-white rounded-3xl border border-[#EBE6DF] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#FAF6EE] flex items-center justify-between">
          <h4 className="font-extrabold text-stone-800 text-sm">Ingredient Levels and Supplier Contacts Registry</h4>
        </div>
        <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-[#F4ECE4] text-[#8B7565] font-black uppercase tracking-wider">
                <th className="py-3 px-4">Ingredient Specs</th>
                <th className="py-3 px-4 text-center">Remaining Level</th>
                <th className="py-3 px-4 text-center">Low Threshold</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Supplier Rep</th>
                <th className="py-3 px-4">Used In Menu Recipes</th>
              </tr>
            </thead>
            <tbody>
              {inv.filteredIngredients.map(i => {
                const low = i.stockLevel <= i.lowStockThreshold;
                const empty = i.stockLevel === 0;
                const recipeList = inv.getUsedInRecipes(i.id);
                return (
                  <tr key={i.id} className={`border-b border-[#FAF6EE] hover:bg-[#FAF9F6] text-stone-700 ${
                    low ? 'bg-rose-50/40' : ''
                  }`}>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-[#2B1B10]">{i.name}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-stone-900">
                      {i.stockLevel} {i.unit}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-stone-400">
                      {i.lowStockThreshold} {i.unit}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg select-none ${
                        empty ? 'bg-red-100 text-red-900 border border-red-200' :
                        low ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                        'bg-green-50 text-green-800 border border-green-100'
                      }`}>
                        {empty ? 'OUT OF STOCK' : low ? 'LOW STOCK ALERT' : 'HEALTHY RESERVES'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="leading-snug">
                        <p className="font-bold text-stone-800">{i.supplierName || 'Self Managed'}</p>
                        <p className="text-[10px] text-stone-400 font-bold">{i.supplierContact || 'No Contact'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {recipeList.length > 0 ? (
                          recipeList.map(name => (
                            <span key={name} className="text-[9px] bg-stone-100 text-stone-600 font-black px-1.5 py-0.5 rounded-md">
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-stone-400 font-bold">Unused Raw Material</span>
                        )}
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
  );
};
