import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Users, Truck, FileText, 
  ArrowRight, AlertTriangle, IndianRupee, Wallet, Clock, 
  CheckCircle, CalendarDays, Download, PieChart, Activity,
  ChevronLeft, ChevronRight, BarChart3, Coins
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
    // 1. INVOICES (Fetch All to calculate Total Pending Dues correctly)
    const unsubInvoices = onValue(ref(db, 'invoices'), (snapshot) => {
      const data = snapshot.val();
      setInvoices(data ? Object.values(data) : []);
    });

    // 2. CASHBOOK (Fetch Last 200 for speed, filter later)
    const cashbookQuery = query(ref(db, 'cashbook'), limitToLast(200));
    const unsubCashbook = onValue(cashbookQuery, (snapshot) => {
      const data = snapshot.val();
      setCashbook(data ? Object.values(data) : []);
    });

    // 3. FLEET DATA (For Fuel/Service expenses)
    const unsubFleet = onValue(ref(db, 'fleet_data'), (snapshot) => {
      const data = snapshot.val() || {};
      setFleetData(data);
    });

    // 4. WORKERS (For count)
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
  // 2. SMART CALCULATIONS (The "Refinement")
  // ==========================================
  
  const stats = useMemo(() => {
    let monthlyInvoiced = 0;   // Total value of bills created this month
    let monthlyCollected = 0;  // Actual CASH received from bills this month
    let globalPending = 0;     // Total money stuck in market (All time)
    
    let monthlyExpense = 0;    // Cashbook expenses
    let monthlyOtherIncome = 0;// Cashbook income

    // 1. PROCESS INVOICES
    invoices.forEach(inv => {
        // Calculate Grand Total of Invoice
        const items = inv.items || [];
        const sub = items.reduce((s, i) => s + Number(i.amount), 0);
        const gst = inv.isGst ? (sub * (inv.gstRate || 18) / 100) : 0;
        const discount = Number(inv.discount) || 0;
        const grandTotal = Math.round(Math.max(0, sub + gst - discount));
        const received = Number(inv.advances) || 0;
        const balance = grandTotal - received;

        // GLOBAL STAT: Outstanding Dues (Money stuck in market)
        if (balance > 0) {
            globalPending += balance;
        }

        // MONTHLY STATS (Only if invoice belongs to selected month)
        if (inv.date.startsWith(viewMonth)) {
            monthlyInvoiced += grandTotal;
            monthlyCollected += received; // <--- FIX: We only count what was PAID
        }
    });

    // 2. PROCESS CASHBOOK (Month Filtered)
    cashbook.forEach(txn => {
        if (txn.date && txn.date.startsWith(viewMonth)) {
            if (txn.type === 'Income') monthlyOtherIncome += Number(txn.amount);
            if (txn.type === 'Expense') monthlyExpense += Number(txn.amount);
        }
    });

    // 3. PROCESS FLEET EXPENSES (Month Filtered)
    // We look inside fleet_data history arrays
    Object.values(fleetData).forEach(vehicle => {
        // Fuel
        const fuel = vehicle.fuelHistory ? Object.values(vehicle.fuelHistory) : [];
        fuel.forEach(f => {
            if (f.date && f.date.startsWith(viewMonth)) monthlyExpense += Number(f.cost);
        });
        // Advances/Salary logic is usually handled in 'cashbook' if you are paying driver, 
        // but if you track it separately, add it here.
    });

    // 4. FINAL KPI
    // Actual Income = Cashbook Income + Collected from Invoices
    const totalActualIncome = monthlyOtherIncome + monthlyCollected; 
    
    // Net Profit = Actual Income - Total Expenses
    const netProfit = totalActualIncome - monthlyExpense;

    return {
        monthlyInvoiced,
        monthlyCollected,
        globalPending,
        monthlyExpense,
        totalActualIncome,
        netProfit
    };
  }, [invoices, cashbook, fleetData, viewMonth]);


  // Recent Activity Feed (Merge Invoices & Expenses)
  const recentActivity = useMemo(() => {
    const combined = [];
    
    // Add Invoices
    invoices.forEach(inv => {
        if(inv.date.startsWith(viewMonth)) {
            combined.push({
                id: inv.id,
                date: inv.date,
                title: `Invoice #${inv.billNo}`,
                subtitle: inv.client?.name,
                amount: Number(inv.advances) || 0, // Show received amount
                total: calculateInvTotal(inv),     // Show total bill amount
                type: 'bill_payment',
                isPaid: (calculateInvTotal(inv) - (Number(inv.advances)||0)) <= 0
            });
        }
    });

    // Add Expenses
    cashbook.forEach(txn => {
        if(txn.date.startsWith(viewMonth)) {
            combined.push({
                id: txn.id || Math.random(),
                date: txn.date,
                title: txn.category,
                subtitle: txn.payee || txn.note || '-',
                amount: Number(txn.amount),
                type: txn.type === 'Income' ? 'other_income' : 'expense'
            });
        }
    });

    // Sort by date desc
    return combined.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  }, [invoices, cashbook, viewMonth]);

  // Helper for invoice total
  function calculateInvTotal(inv) {
    const items = inv.items || [];
    const sub = items.reduce((s, i) => s + Number(i.amount), 0);
    const gst = inv.isGst ? (sub * (inv.gstRate || 18) / 100) : 0;
    return Math.round(Math.max(0, sub + gst - (Number(inv.discount)||0)));
  }

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
            
            <div className="px-4 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Period</span>
                <span className="text-sm font-bold text-slate-700 uppercase">{new Date(viewMonth + "-01").toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <input type="month" value={viewMonth} onChange={e => setViewMonth(e.target.value)} className="absolute opacity-0 w-8 h-8 cursor-pointer"/>
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
          
          {/* 1. NET PROFIT (CASH IN HAND) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                  <Wallet size={80} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Cash Profit (Month)</p>
              <div className="flex items-baseline gap-1">
                 <h3 className={`text-3xl font-black ${stats.netProfit >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                    ₹{stats.netProfit.toLocaleString()}
                 </h3>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-slate-50 w-fit px-2 py-1 rounded-lg">
                  <span className="text-green-600 flex items-center gap-1"><TrendingUp size={12}/> In: ₹{stats.totalActualIncome.toLocaleString()}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-red-500 flex items-center gap-1"><TrendingDown size={12}/> Out: ₹{stats.monthlyExpense.toLocaleString()}</span>
              </div>
          </div>

          {/* 2. OUTSTANDING DUES (MARKET MONEY) */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg shadow-slate-200 relative overflow-hidden">
               <div className="absolute right-0 top-0 p-4 opacity-10">
                  <AlertTriangle size={80} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Market Pending</p>
               <h3 className="text-3xl font-black text-orange-400">₹{stats.globalPending.toLocaleString()}</h3>
               <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                   *Total amount yet to be received from clients across all time.
               </p>
          </div>

          {/* 3. BUSINESS VOLUME (BILLED) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="absolute right-0 top-0 p-4 opacity-5">
                  <FileText size={80} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Billed (Month)</p>
               <h3 className="text-3xl font-black text-slate-800">₹{stats.monthlyInvoiced.toLocaleString()}</h3>
               
               {/* RECOVERY BAR */}
               <div className="mt-4">
                   <div className="flex justify-between text-[10px] font-bold uppercase mb-1 text-slate-400">
                       <span>Recovery Rate</span>
                       <span>{stats.monthlyInvoiced > 0 ? Math.round((stats.monthlyCollected / stats.monthlyInvoiced) * 100) : 0}%</span>
                   </div>
                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                       <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.monthlyInvoiced > 0 ? (stats.monthlyCollected / stats.monthlyInvoiced) * 100 : 0}%` }}></div>
                   </div>
               </div>
          </div>

           {/* 4. EXPENSE METRICS */}
           <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="absolute right-0 top-0 p-4 opacity-5">
                  <PieChart size={80} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Expenses (Month)</p>
               <h3 className="text-3xl font-black text-red-600">₹{stats.monthlyExpense.toLocaleString()}</h3>
               <div className="mt-4 text-xs font-bold text-slate-500">
                   Includes Fuel, Salaries, Material Purchases & Maintenance.
               </div>
          </div>
      </div>

      {/* --- RECENT ACTIVITY & LINKS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: RECENT ACTIVITY */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-orange-500"/> Recent Activity</h3>
                  <button onClick={() => setActiveTab('Billing / Invoice')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>
              </div>
              <div className="divide-y divide-slate-50">
                  {recentActivity.map(item => (
                      <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white shadow-sm
                                  ${item.type === 'bill_payment' ? 'bg-slate-800' : 
                                    item.type === 'expense' ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                  {item.type === 'bill_payment' ? <FileText size={18}/> : 
                                   item.type === 'expense' ? <TrendingDown size={18}/> : <Coins size={18}/>}
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-slate-800">{item.title}</p>
                                  <p className="text-xs text-slate-400 font-medium">{item.subtitle} • {new Date(item.date).toLocaleDateString()}</p>
                              </div>
                          </div>
                          <div className="text-right">
                              {/* For Bills: Show Collected Amount. For Expense: Show Amount */}
                              <p className={`font-black ${item.type === 'expense' ? 'text-red-500' : 'text-emerald-600'}`}>
                                  {item.type === 'expense' ? '-' : '+'}₹{item.amount.toLocaleString()}
                              </p>
                              {item.type === 'bill_payment' && (
                                  <p className={`text-[9px] font-bold uppercase ${item.isPaid ? 'text-emerald-500' : 'text-orange-500'}`}>
                                      {item.isPaid ? 'Fully Paid' : `Bill Value: ₹${item.total.toLocaleString()}`}
                                  </p>
                              )}
                          </div>
                      </div>
                  ))}
                  {recentActivity.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-sm font-bold">No activity this month.</div>
                  )}
              </div>
          </div>

          {/* RIGHT: QUICK LINKS */}
          <div className="space-y-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-20"><Truck size={100}/></div>
                  <h3 className="text-lg font-black uppercase mb-1">Fleet Status</h3>
                  <p className="text-sm font-medium opacity-90 mb-4">Manage vehicles & logs</p>
                  <button onClick={() => setActiveTab('Fleet Manager')} className="bg-white text-orange-600 px-4 py-2 rounded-lg font-bold text-xs uppercase shadow hover:bg-slate-50">Open Fleet</button>
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
                  </div>
              </div>
          </div>

      </div>
    </div>
  );
}