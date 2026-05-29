/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Coffee, Key, Clock, ShieldAlert, ArrowRight, UserCheck, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: { id: string; name: string; role: 'admin' | 'manager' | 'barista'; email?: string }) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'pin' | 'manager'>('pin');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick virtual PIN input handler
  const handlePinPress = (val: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + val);
    }
  };

  const handlePinClear = () => {
    setPin('');
  };

  // Staff POS PIN login
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length < 4) {
      setStatusMsg({ text: "Please enter a complete 4-digit PIN.", isError: true });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const response = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed.");
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setStatusMsg({ text: err.message, isError: true });
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Quick Employee Clock In/Clock Out handler
  const handleClockInOut = async () => {
    if (pin.length < 4) {
      setStatusMsg({ text: "Please enter your 4-digit PIN to clock in/out.", isError: true });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const response = await fetch('/api/auth/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Clock-in/out action failed.");
      }

      setStatusMsg({ text: data.message, isError: false });
      setPin('');
    } catch (err: any) {
      setStatusMsg({ text: err.message, isError: true });
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Manager Email + Password credentials login
  const handleManagerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setStatusMsg({ text: "Please enter both credentials.", isError: true });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setStatusMsg({ text: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-50/40 via-[#FCFAF7] to-[#F3EDE2] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
      
      {/* Decorative Blur Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#8C6239]/5 rounded-full filter blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#5C3F2A]/5 rounded-full filter blur-3xl -z-10" />

      {/* Brand Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="flex flex-col items-center mb-8 text-center"
      >
        <motion.div 
          whileHover={{ scale: 1.08, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-br from-[#5C3F2A] to-[#3C2516] text-[#EDD3C4] p-4 rounded-2xl shadow-xl flex items-center justify-center mb-4 border border-[#5C3F2A]/30 relative group cursor-pointer"
        >
          <Coffee className="h-8 w-8 text-[#EDD3C4] group-hover:scale-110 transition-transform duration-300" />
          <div className="absolute inset-0 bg-[#EDD3C4]/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.div>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#2B1B10] flex items-center gap-1.5 select-none font-sans">
          The Daily Grind
          <Sparkles className="h-5 w-5 text-[#8C6239] animate-pulse shrink-0" />
        </h1>
        <p className="text-[10px] text-[#8B7565] mt-2 font-black tracking-widest uppercase select-none">
          COFFEE SHOP MANAGEMENT SYSTEM
        </p>
      </motion.div>

      {/* Main Authentication Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 25 }}
        className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_20px_50px_rgba(92,63,42,0.06)] overflow-hidden"
      >
        
        {/* Tab Switcher */}
        <div className="flex border-b border-[#F2ECE4]/70 bg-[#FAF8F5]/60 backdrop-blur-md">
          <button
            onClick={() => { setActiveTab('pin'); setStatusMsg(null); }}
            className={`flex-1 py-4 text-center font-bold text-xs flex items-center justify-center gap-2 border-b-2 transition-all uppercase tracking-wider cursor-pointer ${
              activeTab === 'pin' 
                ? 'border-[#8C6239] text-[#5C3F2A] bg-white/80 shadow-sm font-extrabold' 
                : 'border-transparent text-[#9C8A7C] hover:text-[#5C3F2A]'
            }`}
          >
            <Key className="h-4 w-4" />
            Quick PIN / Clock
          </button>
          
          <button
            onClick={() => { setActiveTab('manager'); setStatusMsg(null); }}
            className={`flex-1 py-4 text-center font-bold text-xs flex items-center justify-center gap-2 border-b-2 transition-all uppercase tracking-wider cursor-pointer ${
              activeTab === 'manager' 
                ? 'border-[#8C6239] text-[#5C3F2A] bg-white/80 shadow-sm font-extrabold' 
                : 'border-transparent text-[#9C8A7C] hover:text-[#5C3F2A]'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Manager Sign In
          </button>
        </div>

        {/* Content Panel */}
        <div className="p-6">
          
          {/* Status Message */}
          <AnimatePresence>
            {statusMsg && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className={`p-4 mb-5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 border shadow-sm ${
                  statusMsg.isError 
                    ? 'bg-rose-50/90 text-rose-800 border-rose-100' 
                    : 'bg-emerald-50/90 text-emerald-800 border-emerald-100'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${statusMsg.isError ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                <div className="leading-relaxed">{statusMsg.text}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'pin' ? (
              <motion.div 
                key="pin"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-4"
              >
                
                {/* Display Header */}
                <div className="text-center">
                  <p className="text-[10px] text-[#8B7565] font-black tracking-widest uppercase mb-1.5">
                    Enter 4-Digit Security PIN
                  </p>
                  <div className="h-14 flex justify-center items-center gap-4 bg-white border border-[#E9E4DC] rounded-2xl tracking-widest text-[#2B1B10] text-3xl font-black shadow-inner">
                    {pin ? '●'.repeat(pin.length) : <span className="text-[#C4B7AC] font-normal text-xs uppercase tracking-widest select-none">Enter PIN</span>}
                  </div>
                </div>

                {/* Virtual Keypad (Grid layout) */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                    <motion.button
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      key={num}
                      type="button"
                      onClick={() => handlePinPress(num)}
                      className="h-14 rounded-2xl bg-white border border-[#E9E4DC] text-[#4A3222] font-black text-xl hover:shadow-md transition-all shadow-sm focus:outline-none flex items-center justify-center cursor-pointer"
                    >
                      {num}
                    </motion.button>
                  ))}
                  
                  {/* Clear Button */}
                  <motion.button
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handlePinClear}
                    className="h-14 rounded-2xl bg-rose-50/70 hover:bg-rose-50 border border-rose-100 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:shadow-md transition-all shadow-sm focus:outline-none flex items-center justify-center cursor-pointer"
                  >
                    Clear
                  </motion.button>

                  {/* Zero Button */}
                  <motion.button
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => handlePinPress('0')}
                    className="h-14 rounded-2xl bg-white border border-[#E9E4DC] text-[#4A3222] font-black text-xl hover:shadow-md transition-all shadow-sm focus:outline-none flex items-center justify-center cursor-pointer"
                  >
                    0
                  </motion.button>

                  {/* Login Arrow */}
                  <motion.button
                    whileHover={pin.length === 4 ? { scale: 1.04, y: -2 } : {}}
                    whileTap={pin.length === 4 ? { scale: 0.95 } : {}}
                    type="button"
                    onClick={() => handlePinSubmit()}
                    disabled={loading || pin.length < 4}
                    className="h-14 rounded-2xl bg-[#5C3F2A] hover:bg-[#48301E] text-white flex items-center justify-center font-extrabold shadow-md focus:outline-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-6 w-6 text-[#EDD3C4]" />}
                  </motion.button>
                </div>

                {/* Clock In/Out button */}
                <motion.button
                  whileHover={pin.length === 4 ? { scale: 1.02 } : {}}
                  whileTap={pin.length === 4 ? { scale: 0.98 } : {}}
                  type="button"
                  onClick={handleClockInOut}
                  disabled={loading || pin.length < 4}
                  className="w-full mt-4 bg-[#EDD3C4] hover:bg-[#E5C3B0] text-[#5C3F2A] font-black py-3.5 px-4 rounded-2xl shadow-sm transition-all focus:outline-none flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <Clock className="h-4 w-4" />
                  Shift Clock In / Clock Out
                </motion.button>

                <div className="pt-2.5 text-center">
                  <span className="text-[10px] text-[#9E8B7E] font-bold leading-relaxed block">
                    Demo PINs: <span className="text-[#5C3F2A]">9999</span> (Admin), <span className="text-[#5C3F2A]">2222</span> (Manager), <span className="text-[#5C3F2A]">1111</span> (Barista)
                  </span>
                </div>

              </motion.div>
            ) : (
              <motion.form 
                key="manager"
                onSubmit={handleManagerSubmit}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1.5 tracking-widest">
                    Manager Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="manager@dailygrind.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E9E4DC] text-[#2B1B10] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#8C6239] placeholder-[#C4B7AC]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1.5 tracking-widest">
                    Manager PIN / Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter security credentials"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E9E4DC] text-[#2B1B10] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#8C6239] placeholder-[#C4B7AC]"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 bg-[#5C3F2A] hover:bg-[#48301E] text-white font-black py-3.5 px-4 rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-40"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4 text-[#EDD3C4]" />}
                  {loading ? 'Authenticating...' : 'Sign In To Panel'}
                </motion.button>

                <div className="pt-2 text-center">
                  <span className="text-[10px] text-[#9E8B7E] font-bold block">
                    Credential tip: <span className="text-[#5C3F2A]">admin@dailygrind.com</span> with PIN <span className="text-[#5C3F2A]">9999</span>
                  </span>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

        </div>
      </motion.div>

      {/* Developer Attribution & Signature Footer */}
      <footer className="text-center py-4 text-xs tracking-wider opacity-60 backdrop-blur-sm border-t border-[#8C6239]/10 mt-8 w-full max-w-md select-none font-semibold text-[#8B7565]">
        The Daily Grind Console • Developed by Sami Ullah
      </footer>

    </div>
  );
}
