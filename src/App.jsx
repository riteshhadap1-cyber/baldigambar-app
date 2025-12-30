import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Truck, FileText, Users, Box, Sparkles, 
  Settings, Menu, X, Wallet, Lock, Unlock, ShieldCheck 
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

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open on desktop
  
  // --- ADMIN MODE LOGIC ---
  // We check LocalStorage to remember if you were logged in
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('baldigambar_admin') === 'true');

  const toggleAdmin = () => {
    if (isAdmin) {
      // Logout
      localStorage.setItem('baldigambar_admin', 'false');
      setIsAdmin(false);
    } else {
      // Login
      const pin = prompt("🔐 SECURITY CHECK\nEnter Admin PIN to Enable Editing:");
      if (pin === "2026") { // <--- YOUR SECRET PIN
        localStorage.setItem('baldigambar_admin', 'true');
        setIsAdmin(true);
        alert("✅ Admin Mode Unlocked! You can now Edit and Delete.");
      } else {
        alert("❌ Wrong PIN. Access Denied.");
      }
    }
  };

  // Define Menu Items
  // We pass 'isAdmin' prop to every component so they know how to behave
  const menuItems = [
    { 
      name: 'Dashboard', 
      icon: <LayoutDashboard size={20} />, 
      component: <Dashboard setActiveTab={setActiveTab} isAdmin={isAdmin} /> 
    },
    { 
      name: 'Fleet Manager', 
      icon: <Truck size={20} />, 
      component: <FleetManager isAdmin={isAdmin} /> 
    },
    { 
      name: 'Billing / Invoice', 
      icon: <FileText size={20} />, 
      component: <BillingSystem isAdmin={isAdmin} /> 
    },
    { 
      name: 'Labor & HR', 
      icon: <Users size={20} />, 
      component: <LaborManager isAdmin={isAdmin} /> 
    },
    { 
      name: 'Inventory', 
      icon: <Box size={20} />, 
      component: <InventoryManager isAdmin={isAdmin} /> 
    },
    { 
      name: 'Business Cashbook', 
      icon: <Wallet size={20} />, 
      component: <ExpenseManager isAdmin={isAdmin} /> 
    }, 
    { 
      name: 'AI Assistant', 
      icon: <Sparkles size={20} />, 
      component: <AIAssistant /> // AI is always read-only mostly
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* Mobile Menu Button (Hamburger) */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        className="lg:hidden absolute top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-full shadow-lg"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-2xl flex flex-col`}>
        
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
            BALDIGAMBAR
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Enterprise Suite</p>
        </div>
        
        {/* Navigation Links */}
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

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          
          {/* Settings Button */}
          <button 
            onClick={() => { setActiveTab('Settings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'Settings' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings size={18} /> Settings
          </button>

          {/* ADMIN TOGGLE BUTTON */}
          <button 
            onClick={toggleAdmin} 
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest border ${isAdmin ? 'bg-green-900/30 text-green-400 border-green-900' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'}`}
          >
            {isAdmin ? <><Unlock size={14}/> Admin Active</> : <><Lock size={14}/> View Only</>}
          </button>

        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative w-full bg-slate-50">
        
        {/* Top Header Bar */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-8 py-4 border-b border-slate-200 flex justify-between items-center shadow-sm no-print">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{activeTab}</h2>
          
          <div className="flex items-center gap-3">
            {/* Admin Status Badge */}
            {isAdmin ? (
               <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                 <ShieldCheck size={12}/> Admin Editing
               </span>
            ) : (
               <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                 <Lock size={12}/> Read Only
               </span>
            )}

            {/* Profile Icon */}
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-400 uppercase">Ritesh</p>
              <p className="text-xs font-black text-orange-600">{isAdmin ? 'Owner' : 'Viewer'}</p>
            </div>
            <div className="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-orange-500">R</div>
          </div>
        </header>

        {/* Page Content Rendered Here */}
        <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24">
          {activeTab === 'Settings' 
            ? <SettingsPage isAdmin={isAdmin} /> 
            : menuItems.find(item => item.name === activeTab)?.component
          }
        </div>
      </main>
    </div>
  );
}