import React from 'react';
import { Clock, ShieldAlert, Award, FileText } from 'lucide-react';
import { Ingredient, MenuItem, MenuItemRecipe, Shift } from '../../types';
import { formatDate } from '../../utils';

interface StaffReportsProps {
  ingredients: Ingredient[];
  menuItems: MenuItem[];
  recipes: MenuItemRecipe[];
  shifts: Shift[];
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

export const StaffReports: React.FC<StaffReportsProps> = ({
  ingredients,
  menuItems,
  recipes,
  shifts,
  currentUser,
}) => {
  const userShifts = shifts.filter(s => s.employeeId === currentUser.id);
  const totalHours = userShifts.reduce((sum, s) => sum + (s.totalHoursWorked || 0), 0);

  // Today shift calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayShift = shifts.find(s => s.employeeId === currentUser.id && s.shiftDate === todayStr);
  let expectedHours = 0;
  if (todayShift) {
    const [shStart, smStart] = todayShift.startTime.split(':').map(Number);
    const [shEnd, smEnd] = todayShift.endTime.split(':').map(Number);
    expectedHours = (shEnd + smEnd / 60) - (shStart + smStart / 60);
    if (expectedHours < 0) expectedHours += 24;
  }

  // Used in recipes mapper
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

  const lowStockIngredients = ingredients.filter(i => i.stockLevel <= i.lowStockThreshold);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Panel */}
      <div className="bg-white border border-[#E9E4DC] p-5 rounded-3xl shadow-sm">
        <h4 className="font-extrabold text-[#5C3F2A] text-base flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#8C6239]" />
          My Shift Timesheets & Ingredient Registry
        </h4>
        <p className="text-xs text-stone-500 font-semibold mt-1 leading-relaxed">
          Review your scheduled shift clock-in records, expected floor timings, and track low stock ingredients to prepare for your shift.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Your Hours Clocked</span>
          <div className="my-2.5">
            <span className="text-2xl font-black text-[#5C3F2A]">
              {totalHours.toFixed(1)} hrs
            </span>
          </div>
          <span className="text-[10px] text-green-700 font-bold block leading-none">Your total recorded shift hours</span>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Expected Hours Today</span>
          <div className="my-2.5">
            <span className="text-2xl font-black text-stone-800">
              {expectedHours > 0 ? `${expectedHours.toFixed(1)} hrs` : 'No shift scheduled today'}
            </span>
          </div>
          <span className="text-[10px] text-stone-500 font-bold block leading-none">
            {todayShift ? `Scheduled: ${todayShift.startTime} - ${todayShift.endTime}` : 'No expected hours'}
          </span>
        </div>
      </div>

      {/* Personal Timesheets Table */}
      <div className="bg-white rounded-3xl border border-[#EBE6DF] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#FAF6EE]">
          <h4 className="font-extrabold text-stone-800 text-sm">Your Shift Stamp Timesheet Ledger</h4>
        </div>
        <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-[#F4ECE4] text-[#8B7565] font-black uppercase tracking-wider">
                <th className="py-3 px-4">Employee Staff</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Planned Allocation</th>
                <th className="py-3 px-4">Clocked Stamps</th>
                <th className="py-3 px-4 text-center">Hours worked</th>
              </tr>
            </thead>
            <tbody>
              {userShifts.map(sh => (
                <tr key={sh.id} className="border-b border-[#FAF6EE] hover:bg-[#FAF9F6] text-stone-700">
                  <td className="py-3 px-4 font-bold text-[#2B1B10]">{sh.employeeName}</td>
                  <td className="py-3 px-4 text-stone-500 font-bold">{formatDate(sh.shiftDate)}</td>
                  <td className="py-3 px-4 font-mono">{sh.startTime} - {sh.endTime}</td>
                  <td className="py-3 px-4">
                    {sh.clockInTime ? (
                      <div className="text-[10px] space-y-0.5 leading-tight">
                        <p className="text-green-700 font-bold">IN: {new Date(sh.clockInTime).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</p>
                        {sh.clockOutTime ? (
                          <p className="text-stone-500 font-semibold">OUT: {new Date(sh.clockOutTime).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</p>
                        ) : (
                          <p className="text-amber-700 font-black animate-pulse uppercase tracking-wider">ACTIVE</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] bg-stone-100 text-stone-400 font-bold px-2 py-0.5 rounded">NO CLOCK STAMP</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-[#2B1B10]">
                    {sh.totalHoursWorked ? `${sh.totalHoursWorked} hrs` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floor Stock Tracking & Recipes Mappings */}
      <div className="bg-white rounded-3xl border border-[#EBE6DF] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#FAF6EE] flex items-center justify-between">
          <h4 className="font-extrabold text-stone-800 text-sm">Floor stock & recipe references</h4>
          <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-lg border border-rose-100">
            {lowStockIngredients.length} low stock warnings
          </span>
        </div>
        <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-[#F4ECE4] text-[#8B7565] font-black uppercase tracking-wider">
                <th className="py-3 px-4">Ingredient Specs</th>
                <th className="py-3 px-4 text-center">Remaining Level</th>
                <th className="py-3 px-4 text-center">Safety Threshold</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Used In Menu Recipes</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map(i => {
                const low = i.stockLevel <= i.lowStockThreshold;
                const empty = i.stockLevel === 0;
                const recipeList = getUsedInRecipes(i.id);
                return (
                  <tr key={i.id} className={`border-b border-[#FAF6EE] hover:bg-[#FAF9F6] text-stone-700 ${
                    low ? 'bg-rose-50/40' : ''
                  }`}>
                    <td className="py-3 px-4 font-bold text-stone-850">{i.name}</td>
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
                        {empty ? 'OUT OF STOCK' : low ? 'LOW STOCK' : 'HEALTHY'}
                      </span>
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
