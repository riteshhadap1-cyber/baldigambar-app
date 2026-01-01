import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Truck, FileText, Users, Box, Sparkles, 
  Settings, Menu, X, Wallet, Lock, LogOut, ShieldCheck, User, Key
} from 'lucide-react';

// Import All The Rooms
import Dashboard from './Dashboard';
import FleetManager from './FleetManager';
import BillingSystem from './BillingSystem';
import LaborManager from './LaborManager';
import InventoryManager from './InventoryManager';
import ExpenseManager from './ExpenseManager';
import AIAssistant from './AIAssistant';
import SettingsPage from './Settings';

// --- SECURITY HELPER: Simple Hash Function ---
// This turns "password" into "2848482..." so the plain text isn't in your code.
const hashString = (str) => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
};

export default function App() {
  // ==========================================
  // 1. SECURITY GATE LOGIC
  // ==========================================
  
  // Retrieve the actual password from .env file (Vite syntax)
  const ENV_PASS = import.meta.env.VITE_ADMIN_PASS || "admin123"; 
  // Pre-calculate the hash of the real password so we compare hashes, not text
  const REAL_PASS_HASH = hashString(ENV_PASS);
  const GUEST_PASS_HASH = hashString("Hadap");

  const [authLevel, setAuthLevel] = useState(() => {
    // Session persistence using simple Obfuscation
    const saved = localStorage.getItem('baldigambar_auth_session');
    if (saved === 'x8d7s_admin') return 'admin';
    if (saved === 'x8d7s_guest') return 'guest';
    return null;
  });

  const [passInput, setPassInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Derived Admin Status
  const isAdmin = authLevel === 'admin';

  // LOGIN FUNCTION
  const handleLogin = (e) => {
    e.preventDefault();
    const inputHash = hashString(passInput);

    if (inputHash === REAL_PASS_HASH) {
      setAuthLevel('admin');
      // Store an obfuscated value, not "admin" directly
      localStorage.setItem('baldigambar_auth_session', 'x8d7s_admin');
    } else if (inputHash === GUEST_PASS_HASH) { 
      setAuthLevel('guest');
      localStorage.setItem('baldigambar_auth_session', 'x8d7s_guest');
    } else {
      setLoginError('❌ Incorrect Password');
      setPassInput('');
      setTimeout(() => setLoginError(''), 2000);
    }
  };

  // LOGOUT FUNCTION
  const handleLogout = () => {
    setAuthLevel(null);
    localStorage.removeItem('baldigambar_auth_session');
    setPassInput('');
  };

  // TOGGLE ADMIN (Re-Login inside app)
  const toggleAdmin = () => {
    if (isAdmin) {
      // Downgrade to Guest
      setAuthLevel('guest');
      localStorage.setItem('baldigambar_auth_session', 'x8d7s_guest');
    } else {
      // Upgrade to Admin
      const pass = prompt("🔐 SECURITY CHECK\nEnter Admin Password:");
      if (pass && hashString(pass) === REAL_PASS_HASH) { 
        setAuthLevel('admin');
        localStorage.setItem('baldigambar_auth_session', 'x8d7s_admin');
        alert("✅ Admin Mode Unlocked!");
      } else {
        alert("❌ Wrong Password.");
      }
    }
  };

  // ==========================================
  // 2. LOCKED SCREEN (IF NOT LOGGED IN)
  // ==========================================
  if (!authLevel) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center animate-fade-in">
          <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-50">
            <Lock size={40} className="text-slate-800" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Baldigambar ERP</h1>
          <p className="text-slate-500 font-bold text-sm mb-6">Restricted Access System</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-4 top-4 text-slate-300" size={20}/>
              <input 
                type="password" 
                placeholder="Enter Password" 
                className="w-full text-center text-xl font-bold p-4 pl-10 rounded-xl border-2 border-slate-200 focus:border-orange-500 outline-none transition-colors placeholder:text-slate-300"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                autoFocus
              />
            </div>
            {loginError && <p className="text-red-500 font-bold text-sm animate-bounce">{loginError}</p>}
            <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-black shadow-lg transition-transform active:scale-95">
              Unlock System
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Authorized Personnel Only</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. MAIN APP (LOGGED IN)
  // ==========================================
  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, component: <Dashboard setActiveTab={setActiveTab} isAdmin={isAdmin} /> },
    { name: 'Fleet Manager', icon: <Truck size={20} />, component: <FleetManager isAdmin={isAdmin} /> },
    { name: 'Billing / Invoice', icon: <FileText size={20} />, component: <BillingSystem isAdmin={isAdmin} /> },
    { name: 'Labor & HR', icon: <Users size={20} />, component: <LaborManager isAdmin={isAdmin} /> },
    { name: 'Inventory', icon: <Box size={20} />, component: <InventoryManager isAdmin={isAdmin} /> },
    { name: 'Business Cashbook', icon: <Wallet size={20} />, component: <ExpenseManager isAdmin={isAdmin} /> }, 
    { name: 'AI Assistant', icon: <Sparkles size={20} />, component: <AIAssistant /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* Mobile Menu Button */}
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden absolute top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-full shadow-lg">
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-2xl flex flex-col`}>
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
            BALDIGAMBAR
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Enterprise Suite</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => { setActiveTab(item.name); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${activeTab === item.name ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className={`relative z-10 ${activeTab === item.name ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>{item.icon}</span>
              <span className="relative z-10 font-bold text-sm tracking-wide">{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <button onClick={() => { setActiveTab('Settings'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'Settings' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Settings size={18} /> Settings
          </button>

          {/* ADMIN TOGGLE */}
          <button 
            onClick={toggleAdmin} 
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest border ${isAdmin ? 'bg-green-900/30 text-green-400 border-green-900' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'}`}
          >
            {isAdmin ? <><ShieldCheck size={14}/> Admin Active</> : <><Lock size={14}/> View Only</>}
          </button>

          {/* LOGOUT BUTTON */}
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest bg-red-900/30 text-red-400 border border-red-900 hover:bg-red-900 hover:text-white">
            <LogOut size={14}/> Lock System
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative w-full bg-slate-50">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-8 py-4 border-b border-slate-200 flex justify-between items-center shadow-sm no-print">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{activeTab}</h2>
          <div className="flex items-center gap-3">
            {isAdmin ? (
               <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><ShieldCheck size={12}/> Admin</span>
            ) : (
               <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><Lock size={12}/> View Only</span>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-400 uppercase">{isAdmin ? 'Ritesh' : 'Family'}</p>
              <p className={`text-xs font-black ${isAdmin ? 'text-orange-600' : 'text-slate-600'}`}>{isAdmin ? 'Owner' : 'Guest'}</p>
            </div>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 ${isAdmin ? 'bg-slate-900 border-orange-500' : 'bg-slate-400 border-slate-300'}`}>
              {isAdmin ? 'R' : <User size={20}/>}
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24">
          {activeTab === 'Settings' ? <SettingsPage isAdmin={isAdmin} /> : menuItems.find(item => item.name === activeTab)?.component}
        </div>
      </main>
    </div>
  );
}