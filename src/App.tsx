/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Coffee, Shield, ShoppingBag, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { StoreSettings, Ingredient } from './types';
import AuthScreen from './components/AuthScreen';
import POSView from './components/POSView';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('daily_grind_token'));
  const [sessionUser, setSessionUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('daily_grind_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Global database configurations parameters synced from API
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    storeName: "The Daily Grind Coffee Co.",
    address: "456 Espresso Blvd, Seattle, WA 98101",
    taxRate: 0.08,
    currency: "PKR ",
    openingHours: "Mon-Fri: 6:00 AM - 6:00 PM, Sat-Sun: 7:00 AM - 5:00 PM"
  });
  
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Tab control for managers & admins (switch between taking orders or looking at reporting spreadsheets)
  const [activePortalTab, setActivePortalTab] = useState<'pos' | 'admin'>(() => {
    return (localStorage.getItem('daily_grind_portal_tab') as 'pos' | 'admin') || 'pos';
  });

  useEffect(() => {
    localStorage.setItem('daily_grind_portal_tab', activePortalTab);
  }, [activePortalTab]);

  // Trigger sync fetch from database
  const syncStoreData = async () => {
    try {
      // Load public store settings configs
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setStoreSettings(settingsData);
      }

      // If authorized token exists, pull live ingredients and alerts tally
      if (token) {
        const headers = { 'Authorization': `Bearer ${token}` };
        const [ingRes, metricsRes] = await Promise.all([
          fetch('/api/ingredients', { headers }),
          fetch('/api/reports/dashboard', { headers })
        ]);

        if (ingRes.ok) {
          const ingData = await ingRes.ok ? await ingRes.json() : [];
          setIngredients(ingData);
        }

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setLowStockCount(metricsData.lowStockCount || 0);
        }
      }
    } catch (err) {
      console.error("Failed to sync store dataset: ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncStoreData();
  }, [token]);

  // Auth logins callback
  const handleLoginSuccess = (newToken: string, userProfile: any) => {
    localStorage.setItem('daily_grind_token', newToken);
    localStorage.setItem('daily_grind_user', JSON.stringify(userProfile));
    setToken(newToken);
    setSessionUser(userProfile);
    
    // Auto land on Admin dashboard default if administrator
    if (userProfile.role === 'admin' || userProfile.role === 'manager') {
      setActivePortalTab('admin');
    } else {
      setActivePortalTab('pos');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('daily_grind_token');
    localStorage.removeItem('daily_grind_user');
    setToken(null);
    setSessionUser(null);
    setIngredients([]);
    setLowStockCount(0);
  };

  if (loading && token) {
    return (
      <div className="h-screen w-screen flex flex-col justify-center items-center bg-[#FAF8F5] gap-3">
        <Loader2 className="h-8 w-8 text-[#5C3F2A] animate-spin" />
        <p className="text-xs text-[#8B7565] font-black tracking-widest uppercase">Syncing POS station logs...</p>
      </div>
    );
  }

  // Lockscreen interface overlay
  if (!token || !sessionUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#FAF8F5] font-sans">
      
      {/* Dynamic top menu panel */}
      <header className="bg-[#2B1B10] text-[#EDD3C4] px-6 py-3.5 flex items-center justify-between shadow-2xl relative z-20 select-none border-b border-[#412B1C]">
        
        <div className="flex items-center gap-2.5">
          <div className="bg-[#5C3F2A] text-[#EDD3C4] p-1.5 rounded-xl border border-[#48301E] shrink-0">
            <Coffee className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white leading-none">
              {storeSettings.storeName}
            </h1>
            <p className="text-[10px] text-[#C4B7AC] font-semibold mt-0.5 leading-none">
              Register Node #T1 • {sessionUser.name} ({sessionUser.role.toUpperCase()})
            </p>
          </div>
        </div>

        {/* Header controller tabs for authorized roles */}
        <div className="flex items-center gap-4">
          
          {(sessionUser.role === 'admin' || sessionUser.role === 'manager') && (
            <div className="bg-[#1C110A] p-1 rounded-xl flex border border-[#3E291B]">
              <button
                onClick={() => setActivePortalTab('pos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wide flex items-center gap-1.5 transition-all uppercase cursor-pointer ${
                  activePortalTab === 'pos'
                    ? 'bg-[#5C3F2A] text-white shadow-sm'
                    : 'text-[#C4B7AC] hover:text-white'
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                POS Order
              </button>
              
              <button
                onClick={() => setActivePortalTab('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wide flex items-center gap-1.5 transition-all uppercase cursor-pointer ${
                  activePortalTab === 'admin'
                    ? 'bg-[#5C3F2A] text-white shadow-sm'
                    : 'text-[#C4B7AC] hover:text-white'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Admin Panel
              </button>
            </div>
          )}

          {/* Quick low stock alerts indicator badges */}
          {lowStockCount > 0 && (
            <div className="hidden sm:flex items-center gap-1 bg-rose-950 border border-rose-800 text-rose-300 px-2.5 py-1 rounded-xl text-[10px] font-black animate-pulse-slow">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{lowStockCount} INGREDIENTS SLOW</span>
            </div>
          )}

          {/* Logout Trigger */}
          <button
            onClick={handleLogout}
            className="p-2 border border-[#48301E] hover:border-red-800 hover:bg-red-950/45 text-[#C4B7AC] hover:text-red-400 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0 uppercase"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Clock Out Portal</span>
          </button>

        </div>

      </header>

      {/* Main Container screen with transition effects */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activePortalTab === 'pos' ? (
            <motion.div
              key="posView"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute inset-0 flex flex-col"
            >
              <POSView
                token={token}
                baristaUser={sessionUser}
                settings={storeSettings}
                ingredients={ingredients}
                onOrderCompleted={syncStoreData}
                onLogout={handleLogout}
              />
            </motion.div>
          ) : (
            <motion.div
              key="adminView"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col"
            >
              <AdminDashboard
                token={token}
                currentUser={sessionUser}
                settings={storeSettings}
                ingredients={ingredients}
                onRefreshDB={syncStoreData}
                onLogout={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

    </div>
  );
}
