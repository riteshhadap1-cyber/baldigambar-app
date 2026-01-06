import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Users, Truck, FileText, 
  Wallet, AlertTriangle, PieChart, Activity,
  ChevronLeft, ChevronRight, Coins, ArrowRight
} from 'lucide-react';
// FIREBASE IMPORTS
import { db } from './firebase-config';
import { ref, onValue, query, limitToLast } from 'firebase/database';

export default function Dashboard({ setActiveTab, isAdmin }) {
  
  // ==========================================
  // 1. STATE & DATA FETCHING
  // ==========================================
  
  const [viewMonth, setViewMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(true);

  // Raw Data Storage
  const [invoices, setInvoices] = useState([]);
  const [cashbook, setCashbook] = useState([]);
  const [fleetData, setFleetData] = useState({});
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    // 1. INVOICES (For "Total Billed" & "Pending" stats)
    const unsubInvoices = onValue(ref(db, 'invoices'), (snapshot) => {
      const data = snapshot.val();
      setInvoices(data ? Object.values(data) : []);
    });

    // 2. CASHBOOK (For "Net Profit", "Income", "Expense")
    // We fetch all to ensure we get the full month's data
    const unsubCashbook = onValue(ref(db, 'cashbook'), (snapshot) => {
      const data = snapshot.val();
      setCashbook(data ? Object.values(data) : []);
    });

    // 3. FLEET DATA (For Vehicle Count)
    const unsubFleet = onValue(ref(db, 'fleet_data'), (snapshot) => {
      const data = snapshot.val() || {};
      setFleetData(data);
    });

    // 4. WORKERS (For Worker Count)
    const unsubWorkers = onValue(ref(db, 'workers'), (snapshot) => {
      const data = snapshot.val();
      setWorkers(data ? Object.values(data) : []);
      setLoading(false);
    });

    return () => {
      unsubInvoices(); unsubCashbook(); unsubFleet(); unsubWorkers();
    };
  }, []);

  // ==========================================
  // 2. FIXED CALCULATIONS (Cashbook Driven)
  // ==========================================
  
  const stats = useMemo(() => {
    let monthlyBilled = 0;     // Sales (Invoices created this month)
    let globalPending = 0;     // Money people owe you (Total)
    
    let monthlyIncome = 0;     // REAL CASH IN (From Cashbook)
    let monthlyExpense = 0;    // REAL CASH OUT (From Cashbook)

    // 1. CALCULATE CASH FLOW (Strictly from Cashbook)
    // This fixes the double counting/messy logic.
    cashbook.forEach(txn => {
        if (txn.date && txn.date.startsWith(viewMonth)) {
            const amt = Number(txn.amount) || 0;
            if (txn.type === 'Income') {
                monthlyIncome += amt;
            } else if (txn.type === 'Expense') {
                monthlyExpense += amt;
            }
        }
    });

    // 2. CALCULATE BILLING STATS (From Invoices)
    invoices.forEach(inv => {
        // Calculate Totals
        const items = inv.items || [];
        const sub = items.reduce((s, i) => s + Number(i.amount), 0);
        const gst = inv.isGst ? (sub * (inv.gstRate || 18) / 100) : 0;
        const grandTotal = Math.round(Math.max(0, sub + gst - (Number(inv.discount) || 0)));
        
        // Calculate Received
        const received = (Number(inv.advances) || 0) + (inv.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
        const balance = grandTotal - received;

        // Global Pending (All time)
        if (balance > 0) globalPending += balance;

        // Monthly Billed (Performance metric, not cash flow)
        if (inv.date.startsWith(viewMonth)) {
            monthlyBilled += grandTotal;
        }
    });

    // 3. NET PROFIT
    const netProfit = monthlyIncome - monthlyExpense;

    return {
        monthlyBilled,
        monthlyIncome,
        monthlyExpense,
        netProfit,
        globalPending
    };
  }, [invoices, cashbook, viewMonth]);


  // Recent Activity Feed
  const recentActivity = useMemo(() => {
    // Only show Cashbook entries to keep it clean and matching the totals
    const monthTxns = cashbook.filter(txn => txn.date && txn.date.startsWith(viewMonth));
    
    return monthTxns.sort((a,b) => new Date(b.date) - new Date(a.date) || b.timestamp - a.timestamp).slice(0, 8);
  }, [cashbook, viewMonth]);

  // ==========================================
  // 3. RENDER UI
  // ==========================================
  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800 animate-fade-in">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Business Overview</h2>
            <p className="text-xs font-bold text-slate-400 uppercase">Financial Health & Updates</p>
         </div>
         
         <div className="flex items-center bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
            <button onClick={() => {
                const d = new Date(viewMonth + "-01");
                d.setMonth(d.getMonth() - 1);
                setViewMonth(d.toISOString().slice(0,7));
            }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800"><ChevronLeft size={20}/></button>
            
            <div className="px-4 text-center relative group">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Period</span>
                <span className="text-sm font-bold text-slate-700 uppercase">{new Date(viewMonth + "-01").toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <input type="month" value={viewMonth} onChange={e => setViewMonth(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
            </div>

            <button onClick={() => {
                const d = new Date(viewMonth + "-01");
                d.setMonth(d.getMonth() + 1);
                setViewMonth(d.toISOString().slice(0,7));
            }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800"><ChevronRight size={20}/></button>
         </div>
      </div>

      {/* --- KPI GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. NET PROFIT (CASH) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                  <Wallet size={80} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Cash Profit</p>
              <div className="flex items-baseline gap-1">
                 <h3 className={`text-3xl font-black ${stats.netProfit >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                    ₹{stats.netProfit.toLocaleString()}
                 </h3>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-slate-50 w-fit px-2 py-1 rounded-lg">
                  <span className="text-emerald-600 flex items-center gap-1"><TrendingUp size={12}/> In: ₹{stats.monthlyIncome.toLocaleString()}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-red-500 flex items-center gap-1"><TrendingDown size={12}/> Out: ₹{stats.monthlyExpense.toLocaleString()}</span>
              </div>
          </div>

          {/* 2. OUTSTANDING DUES (ASSET) */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg shadow-slate-200 relative overflow-hidden">
               <div className="absolute right-0 top-0 p-4 opacity-10">
                  <AlertTriangle size={80} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Market Pending</p>
               <h3 className="text-3xl font-black text-orange-400">₹{stats.globalPending.toLocaleString()}</h3>
               <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                   *Total amount yet to be received from clients (All time).
               </p>
          </div>

          {/* 3. BUSINESS VOLUME (SALES) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="absolute right-0 top-0 p-4 opacity-5">
                  <FileText size={80} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Billed (Month)</p>
               <h3 className="text-3xl font-black text-slate-800">₹{stats.monthlyBilled.toLocaleString()}</h3>
               <div className="mt-4 text-xs font-bold text-slate-400">
                   Value of invoices created this month.
               </div>
          </div>

           {/* 4. TOTAL EXPENSE */}
           <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="absolute right-0 top-0 p-4 opacity-5">
                  <PieChart size={80} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Cash Expense</p>
               <h3 className="text-3xl font-black text-red-600">₹{stats.monthlyExpense.toLocaleString()}</h3>
               <div className="mt-4 text-xs font-bold text-slate-500">
                   Fuel, Salaries, Materials, etc.
               </div>
          </div>
      </div>

      {/* --- RECENT ACTIVITY & LINKS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: RECENT CASH TRANSACTIONS */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-orange-500"/> Cash Flow Activity</h3>
                  <button onClick={() => setActiveTab('Business Cashbook')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>
              </div>
              <div className="divide-y divide-slate-50">
                  {recentActivity.map(item => (
                      <div key={item.id || Math.random()} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white shadow-sm
                                  ${item.type === 'Income' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                  {item.type === 'Income' ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-slate-800">{item.category}</p>
                                  <p className="text-xs text-slate-400 font-medium">{item.payee || item.note || '-'} • {new Date(item.date).toLocaleDateString()}</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <p className={`font-black ${item.type === 'Expense' ? 'text-red-500' : 'text-emerald-600'}`}>
                                  {item.type === 'Expense' ? '-' : '+'}₹{Number(item.amount).toLocaleString()}
                              </p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">{item.mode || 'Cash'}</p>
                          </div>
                      </div>
                  ))}
                  {recentActivity.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-sm font-bold">No cash activity this month.</div>
                  )}
              </div>
          </div>

          {/* RIGHT: QUICK ACTIONS */}
          <div className="space-y-4">
              <div onClick={() => setActiveTab('Fleet Manager')} className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer hover:shadow-xl transition-shadow">
                  <div className="absolute top-0 right-0 p-4 opacity-20"><Truck size={100}/></div>
                  <h3 className="text-lg font-black uppercase mb-1">Fleet Manager</h3>
                  <p className="text-sm font-medium opacity-90 mb-4">View Fuel & Trip Logs</p>
                  <div className="flex items-center text-xs font-bold uppercase bg-white/20 w-fit px-3 py-1 rounded-lg">Open <ArrowRight size={12} className="ml-1"/></div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Users size={18}/> Quick Stats</h3>
                  <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-bold">Total Workers</span>
                          <span className="font-black text-slate-800">{workers.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-bold">Fleet Vehicles</span>
                          <span className="font-black text-slate-800">{Object.keys(fleetData).length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-bold">Cashbook Entries</span>
                          <span className="font-black text-slate-800">{cashbook.length}</span>
                      </div>
                  </div>
              </div>
          </div>

      </div>
    </div>
  );
}