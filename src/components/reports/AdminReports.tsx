import React from 'react';
import { 
  BarChart as RechartsBarChart, Bar, LineChart as RechartsLineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Users, Calendar, Award, DollarSign, Download, Clock
} from 'lucide-react';
import { Order, Shift, User as DbUser, StoreSettings } from '../../types';
import { formatCurrency, formatDate, formatDateTime, downloadCSV } from '../../utils';

interface AdminReportsProps {
  orders: Order[];
  shifts: Shift[];
  employees: DbUser[];
  settings: StoreSettings;
  startDate: string;
  endDate: string;
  employeeFilter: string;
  searchQuery: string;
}

const COLORS = ['#5C3F2A', '#8C6239', '#CF9A72', '#EDD3C4', '#A59283', '#5D6B54', '#8C9A86'];

export const AdminReports: React.FC<AdminReportsProps> = ({
  orders,
  shifts,
  employees,
  settings,
  startDate,
  endDate,
  employeeFilter,
  searchQuery,
}) => {
  // 1. Sales Calculations
  const getSalesReportData = () => {
    let filtered = [...orders];
    if (startDate) {
      filtered = filtered.filter(o => o.timestamp.split('T')[0] >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(o => o.timestamp.split('T')[0] <= endDate);
    }
    if (employeeFilter !== 'all') {
      filtered = filtered.filter(o => o.baristaId === employeeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.id.toLowerCase().includes(q) ||
        o.baristaName.toLowerCase().includes(q) ||
        o.paymentMethod.toLowerCase().includes(q) ||
        (o.discount?.code && o.discount.code.toLowerCase().includes(q))
      );
    }

    const totalRevenue = filtered.reduce((sum, o) => sum + o.total, 0);
    const totalSubtotal = filtered.reduce((sum, o) => sum + o.subtotal, 0);
    const totalTax = filtered.reduce((sum, o) => sum + o.tax, 0);
    const totalDiscounts = filtered.reduce((sum, o) => {
      if (!o.discount) return sum;
      return sum + (o.discount.type === 'percentage' ? (o.subtotal * o.discount.value) / 100 : o.discount.value);
    }, 0);
    const avgOrderValue = filtered.length > 0 ? totalRevenue / filtered.length : 0;

    // Timeline Grouping
    const dailyMap: Record<string, number> = {};
    filtered.forEach(o => {
      const day = o.timestamp.split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + o.total;
    });
    const timelineData = Object.keys(dailyMap).sort().map(d => ({ date: formatDate(d), sales: parseFloat(dailyMap[d].toFixed(2)) }));

    // Payment Method Shares
    const payMap: Record<string, number> = { Cash: 0, Card: 0, Mobile: 0 };
    filtered.forEach(o => {
      if (payMap[o.paymentMethod] !== undefined) {
        payMap[o.paymentMethod] += o.total;
      }
    });
    const paymentData = Object.keys(payMap).map(k => ({ name: k, value: parseFloat(payMap[k].toFixed(2)) }));

    // Barista Sales Volume
    const baristaMap: Record<string, number> = {};
    filtered.forEach(o => {
      baristaMap[o.baristaName] = (baristaMap[o.baristaName] || 0) + o.total;
    });
    const baristaSalesData = Object.keys(baristaMap).map(k => ({ name: k, sales: parseFloat(baristaMap[k].toFixed(2)) }));

    return {
      filteredOrders: filtered,
      totalRevenue,
      totalSubtotal,
      totalTax,
      totalDiscounts,
      avgOrderValue,
      timelineData,
      paymentData,
      baristaSalesData
    };
  };

  // 2. Staff & Payroll Calculations
  const getStaffReportData = () => {
    let filtered = [...shifts];
    if (startDate) {
      filtered = filtered.filter(s => s.shiftDate >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(s => s.shiftDate <= endDate);
    }
    if (employeeFilter !== 'all') {
      filtered = filtered.filter(s => s.employeeId === employeeFilter);
    }

    const totalLaborCost = filtered.reduce((sum, s) => sum + (s.estimatedWage || 0), 0);
    const totalHours = filtered.reduce((sum, s) => sum + (s.totalHoursWorked || 0), 0);
    const completedCount = filtered.filter(s => s.clockOutTime).length;
    const activeCount = filtered.filter(s => s.clockInTime && !s.clockOutTime).length;

    const employeeSummaryMap: Record<string, {
      employeeId: string;
      name: string;
      role: string;
      shiftsCount: number;
      hoursWorked: number;
      wageEarned: number;
    }> = {};

    filtered.forEach(s => {
      if (!employeeSummaryMap[s.employeeId]) {
        const emp = employees.find(e => e.id === s.employeeId);
        employeeSummaryMap[s.employeeId] = {
          employeeId: s.employeeId,
          name: s.employeeName,
          role: emp?.role || 'Barista',
          shiftsCount: 0,
          hoursWorked: 0,
          wageEarned: 0
        };
      }
      const record = employeeSummaryMap[s.employeeId];
      record.shiftsCount += 1;
      if (s.totalHoursWorked) record.hoursWorked += s.totalHoursWorked;
      if (s.estimatedWage) record.wageEarned += s.estimatedWage;
    });

    const employeeSummaries = Object.values(employeeSummaryMap).sort((a, b) => b.wageEarned - a.wageEarned);

    return {
      filteredShifts: filtered,
      totalLaborCost,
      totalHours,
      completedCount,
      activeCount,
      employeeSummaries
    };
  };

  const sales = getSalesReportData();
  const staff = getStaffReportData();

  // Export handlers
  const handleExportSalesReportCSV = () => {
    const headers = ["Invoice ID", "Timestamp", "Subtotal", "Discount", "Tax", "Total Revenue", "Barista Name", "Payment Method", "Discount Code"];
    const rows = sales.filteredOrders.map(o => {
      const disc = o.discount ? (o.discount.type === 'percentage' ? (o.subtotal * o.discount.value) / 100 : o.discount.value) : 0;
      return [
        o.id,
        formatDateTime(o.timestamp),
        o.subtotal.toFixed(2),
        disc.toFixed(2),
        o.tax.toFixed(2),
        o.total.toFixed(2),
        o.baristaName,
        o.paymentMethod,
        o.discount?.code || "None"
      ];
    });
    downloadCSV(`Daily_Grind_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const handleExportStaffReportCSV = () => {
    const headers = ["Shift ID", "Date", "Barista Name", "Planned Time", "Clocked In", "Clocked Out", "Hours Worked", "Hourly Wage ($)", "Shift Earnings ($)"];
    const rows = staff.filteredShifts.map(s => {
      const emp = employees.find(e => e.id === s.employeeId);
      return [
        s.id,
        s.shiftDate,
        s.employeeName,
        `${s.startTime} - ${s.endTime}`,
        s.clockInTime ? new Date(s.clockInTime).toLocaleTimeString() : "N/A",
        s.clockOutTime ? new Date(s.clockOutTime).toLocaleTimeString() : "N/A",
        s.totalHoursWorked || 0,
        emp?.hourlyWage || 15.00,
        s.estimatedWage || 0
      ];
    });
    downloadCSV(`Daily_Grind_Staff_Report_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* CSV Export & Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-[#E9E4DC] p-5 rounded-3xl shadow-sm">
        <div>
          <h4 className="font-extrabold text-[#5C3F2A] text-base">Corporate Sales, Revenue & Labor Center</h4>
          <p className="text-xs text-stone-500 font-semibold leading-relaxed">Comprehensive tracking of gross metrics, active wage streams, and payment distributions.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleExportSalesReportCSV}
            className="px-4 h-11 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider min-h-[44px]"
          >
            <Download className="h-3.5 w-3.5" /> Export Sales CSV
          </button>
          <button
            onClick={handleExportStaffReportCSV}
            className="px-4 h-11 bg-stone-700 hover:bg-stone-850 text-white text-[11px] font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider min-h-[44px]"
          >
            <Download className="h-3.5 w-3.5" /> Export Staff CSV
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Total Sales Revenue</span>
          <div className="my-2.5">
            <span className="text-2xl font-black text-[#5C3F2A]">
              {formatCurrency(sales.totalRevenue, settings.currency)}
            </span>
          </div>
          <span className="text-[10px] text-green-700 font-bold block leading-none">Gross business revenue calculated</span>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Total Labor Costs</span>
          <div className="my-2.5">
            <span className="text-2xl font-black text-amber-900 font-mono">
              {formatCurrency(staff.totalLaborCost, settings.currency)}
            </span>
          </div>
          <span className="text-[10px] text-stone-500 font-bold block leading-none">Total compensation pay calculated</span>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Completed Shifts</span>
          <div className="my-2.5">
            <span className="text-2xl font-black text-stone-800">
              {staff.completedCount} shifts
            </span>
          </div>
          <span className="text-[10px] text-stone-500 font-bold block leading-none">Clockout shifts count</span>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border border-[#E9E4DC] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#8B7565] font-black uppercase tracking-wider block">Accrued Tax depletions</span>
          <div className="my-2.5">
            <span className="text-2xl font-black text-rose-700 font-mono">
              {formatCurrency(sales.totalTax, settings.currency)}
            </span>
          </div>
          <span className="text-[10px] text-rose-600 font-bold block leading-none">Sales tax generated</span>
        </div>
      </div>

      {/* Visual Analytics Timelines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="bg-white rounded-3xl border border-[#EBE6DF] p-6 shadow-sm lg:col-span-2">
          <h4 className="font-extrabold text-stone-800 text-sm mb-4 border-b border-[#FAF6EE] pb-2 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-[#8C6239]" /> Sales Growth timeline curve
          </h4>
          <div className="h-60 sm:h-72 lg:h-80 mt-3">
            {sales.timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={sales.timelineData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5C3F2A" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#5C3F2A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F2EE" />
                  <XAxis dataKey="date" stroke="#9E8B7E" fontSize={10} fontWeight="bold" />
                  <YAxis stroke="#9E8B7E" fontSize={10} fontWeight="bold" />
                  <RechartsTooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Line type="monotone" dataKey="sales" stroke="#5C3F2A" strokeWidth={3.5} activeDot={{ r: 6 }} />
                </RechartsLineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#C4B7AC]">No historical order sales within selected dates.</div>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-3xl border border-[#EBE6DF] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-stone-800 text-sm mb-4 border-b border-[#FAF6EE] pb-2 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-[#8C6239]" /> Payment Shares
            </h4>
            <div className="h-44 sm:h-52 lg:h-60 flex items-center justify-center relative mt-3">
              {sales.paymentData.some(p => p.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sales.paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sales.paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [`$${value}`, 'Revenue Share']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-[#C4B7AC]">No payment data to compile.</div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-[#8B7565] border-t border-[#FAF6EE] pt-4">
            {sales.paymentData.map((entry, index) => (
              <div key={entry.name} className="flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full block mb-1" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate text-stone-800 font-extrabold">{entry.name}</span>
                <span className="font-mono text-amber-900">{formatCurrency(entry.value, settings.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barista Sales Performance */}
      <div className="bg-white rounded-3xl border border-[#EBE6DF] p-6 shadow-sm">
        <h4 className="font-extrabold text-stone-800 text-sm mb-4 border-b border-[#FAF6EE] pb-2 flex items-center gap-1.5">
          <Users className="h-4 w-4 text-[#8C6239]" /> Barista Performance Leadership Board
        </h4>
        <div className="h-60 sm:h-72 lg:h-80 mt-3">
          {sales.baristaSalesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={sales.baristaSalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F2EE" />
                <XAxis dataKey="name" stroke="#9E8B7E" fontSize={10} fontWeight="bold" />
                <YAxis stroke="#9E8B7E" fontSize={10} fontWeight="bold" />
                <RechartsTooltip formatter={(value) => [`$${value}`, 'Total Checkout Sales']} />
                <Bar dataKey="sales" fill="#8C6239" radius={[10, 10, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[#C4B7AC]">No transactions processed by baristas.</div>
          )}
        </div>
      </div>

      {/* Cumulative Staff Payroll Grid */}
      <div className="space-y-3">
        <h4 className="font-extrabold text-stone-800 text-sm flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-[#8C6239]" /> Cumulative Barista Payroll Summaries
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {staff.employeeSummaries.map(summary => (
            <div key={summary.employeeId} className="bg-white p-5 rounded-3xl border border-[#EBE6DF] shadow-sm space-y-3 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-extrabold text-stone-800 text-sm">{summary.name}</h5>
                  <span className="text-[9px] bg-[#FAF6EE] text-[#8C6239] font-bold uppercase px-1.5 py-0.5 rounded block mt-0.5 w-max">
                    {summary.role}
                  </span>
                </div>
                <span className="text-xl font-black text-amber-900 font-mono">
                  ${summary.wageEarned.toFixed(2)}
                </span>
              </div>
              
              <div className="border-t border-[#FAF6EE] pt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-stone-500">
                <div>
                  <p className="text-[8px] text-[#8B7565] uppercase">Hours Logged</p>
                  <p className="text-stone-800 text-xs font-mono font-black">{summary.hoursWorked.toFixed(1)} hrs</p>
                </div>
                <div>
                  <p className="text-[8px] text-[#8B7565] uppercase">Shifts Taken</p>
                  <p className="text-stone-800 text-xs font-mono font-black">{summary.shiftsCount} shifts</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Invoice Ledger */}
      <div className="bg-white rounded-3xl border border-[#EBE6DF] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#FAF6EE]">
          <h4 className="font-extrabold text-stone-800 text-sm">Detailed Invoice Transactions Ledger ({sales.filteredOrders.length})</h4>
        </div>
        <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-[#F4ECE4] text-[#8B7565] font-black uppercase tracking-wider">
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Barista Staff</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Discount Code</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right font-bold">Total revenue</th>
              </tr>
            </thead>
            <tbody>
              {sales.filteredOrders.map(o => {
                const discAmt = o.discount ? (o.discount.type === 'percentage' ? (o.subtotal * o.discount.value) / 100 : o.discount.value) : 0;
                return (
                  <tr key={o.id} className="border-b border-[#FAF6EE] hover:bg-[#FAF9F6] text-stone-700">
                    <td className="py-3 px-4 font-mono font-extrabold text-[#2B1B10]">#{o.id}</td>
                    <td className="py-3 px-4 text-stone-500 font-semibold">{formatDateTime(o.timestamp)}</td>
                    <td className="py-3 px-4 font-bold text-stone-800">{o.baristaName}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] bg-stone-100 font-extrabold px-2 py-0.5 rounded-lg text-stone-600">
                        {o.paymentMethod.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-700">{o.discount?.code || 'None'}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(o.subtotal, settings.currency)}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-amber-900">{formatCurrency(o.total, settings.currency)}</td>
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
