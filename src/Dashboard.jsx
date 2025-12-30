import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Users, Truck, FileText, 
  ArrowRight, AlertTriangle, IndianRupee, Wallet, Clock, 
  CheckCircle, CalendarDays, Download, PieChart, Activity,
  ChevronLeft, ChevronRight
} from 'lucide-react';
// FIREBASE IMPORTS
import { db } from './firebase-config';
import { ref, onValue } from 'firebase/database';

export default function Dashboard({ setActiveTab, isAdmin }) {
  
  // ==========================================
  // 1. STATE & DATA FETCHING
  // ==========================================
  
  const [viewMonth, setViewMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(true);

  // Raw Data Storage
  const [rawInvoices, setRawInvoices] = useState([]);
  const [rawFleet, setRawFleet] = useState({});
  const [rawWorkers, setRawWorkers] = useState([]);
  const [rawAttendance, setRawAttendance] = useState({});
  const [rawCashbook, setRawCashbook] = useState([]);

  useEffect(() => {
    // 1. INVOICES
    onValue(ref(db, 'invoices'), (snapshot) => {
      const data = snapshot.val();
      setRawInvoices(data ? Object.values(data) : []);
    });

    // 2. FLEET DATA
    onValue(ref(db, 'fleet_data'), (snapshot) => {
      const data = snapshot.val() || {};
      const normalized = {};
      Object.keys(data).forEach(k => {
          normalized[k] = {
              ...data[k],
              fuelHistory: data[k].fuelHistory ? Object.values(data[k].fuelHistory) : [],
              advanceHistory: data[k].advanceHistory ? Object.values(data[k].advanceHistory) : []
          };
      });
      setRawFleet(normalized);
    });

    // 3. LABOR
    onValue(ref(db, 'workers'), (snapshot) => {
      setRawWorkers(snapshot.val() ? Object.values(snapshot.val()) : []);
    });

    onValue(ref(db, 'attendance'), (snapshot) => {
      setRawAttendance(snapshot.val() || {});
    });

    // 4. CASHBOOK
    onValue(ref(db, 'cashbook'), (snapshot) => {
      setRawCashbook(snapshot.val() ? Object.values(snapshot.val()) : []);
      setLoading(false);
    });
  }, []);

  // ==========================================
  // 2. LOGIC & HELPERS
  // ==========================================

  const changeMonth = (offset) => {
    const [y, m] = viewMonth.split('-').map(Number);
    const date = new Date(y, m - 1 + offset);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    setViewMonth(`${newY}-${newM}`);
  };

  const formatMonth = (ym) => {
    if(!ym) return "";
    const [y, m] = ym.split('-');
    const date = new Date(y, m - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // ==========================================
  // 3. CALCULATIONS (MEMOIZED)
  // ==========================================

  const stats = useMemo(() => {
    // A. INVOICE CALCULATIONS (Monthly)
    const monthlyInvoices = rawInvoices.filter(inv => inv.date.startsWith(viewMonth));
    const totalBilled = monthlyInvoices.reduce((sum, inv) => {
        const sub = (inv.items || []).reduce((s, i) => s + Number(i.amount), 0);
        const tax = inv.isGst ? sub * 0.18 : 0;
        return sum + Math.round(sub + tax - (inv.discount || 0));
    }, 0);
    const totalReceived = monthlyInvoices.reduce((sum, inv) => sum + Number(inv.advances || 0), 0);
    const pendingDues = totalBilled - totalReceived;

    // B. FLEET EXPENSES (Monthly)
    let fleetFuelCost = 0;
    let fleetMaintenance = 0;
    let fleetDriverSalaries = 0;

    Object.values(rawFleet).forEach(v => {
        const monthlyFuel = v.fuelHistory.filter(f => f.date.startsWith(viewMonth));
        fleetFuelCost += monthlyFuel.reduce((s, f) => s + Number(f.cost), 0);
        fleetMaintenance += Number(v.service || 0);
        fleetDriverSalaries += Number(v.salary || 0);
    });
    const totalFleetExpense = fleetFuelCost + fleetMaintenance + fleetDriverSalaries;

    // C. LABOR COSTS (Monthly Estimated)
    let laborCost = 0;
    let presentToday = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    rawWorkers.forEach(w => {
        const todayStatus = (rawAttendance[todayStr] || {})[w.id];
        if (todayStatus === 'P' || todayStatus === 'HD') presentToday++;

        let daysPresent = 0;
        let halfDays = 0;
        
        Object.keys(rawAttendance).forEach(date => {
            if (date.startsWith(viewMonth)) {
                if (rawAttendance[date][w.id] === 'P') daysPresent++;
                if (rawAttendance[date][w.id] === 'HD') halfDays++;
            }
        });
        laborCost += (daysPresent * Number(w.rate)) + (halfDays * (Number(w.rate)/2));
    });

    // D. CASHBOOK (Monthly)
    const monthlyCashbook = rawCashbook.filter(e => e.date.startsWith(viewMonth));
    const cashIncome = monthlyCashbook.filter(e => e.type === 'Income').reduce((s, e) => s + Number(e.amount), 0);
    const cashExpense = monthlyCashbook.filter(e => e.type === 'Expense').reduce((s, e) => s + Number(e.amount), 0);

    // E. NET PROFIT
    const totalIncome = totalBilled + cashIncome;
    const totalExpense = totalFleetExpense + laborCost + cashExpense;
    const netProfit = totalIncome - totalExpense;

    return {
        totalBilled,
        pendingDues,
        presentWorkers: presentToday,
        totalWorkers: rawWorkers.length,
        activeVehicles: Object.keys(rawFleet).length,
        fleetFuelCost,
        laborCost,
        totalIncome,
        totalExpense,
        netProfit,
        recentInvoices: rawInvoices.sort((a,b) => b.id - a.id).slice(0, 5)
    };
  }, [rawInvoices, rawFleet, rawWorkers, rawAttendance, rawCashbook, viewMonth]);

  // CASH IN HAND (Lifetime)
  const cashInHand = useMemo(() => {
      const inc = rawCashbook.filter(e => e.type === 'Income').reduce((s, e) => s + Number(e.amount), 0);
      const exp = rawCashbook.filter(e => e.type === 'Expense').reduce((s, e) => s + Number(e.amount), 0);
      return inc - exp;
  }, [rawCashbook]);

  const downloadReport = () => {
      let csv = `BALDIGAMBAR FINANCIAL REPORT - ${formatMonth(viewMonth)}\n\n`;
      csv += `METRIC,AMOUNT\n`;
      csv += `Total Invoice Billed,${stats.totalBilled}\n`;
      csv += `Labor Payroll Cost,${stats.laborCost}\n`;
      csv += `Fleet Fuel Cost,${stats.fleetFuelCost}\n`;
      csv += `Total Expenses,${stats.totalExpense}\n`;
      csv += `NET PROFIT,${stats.netProfit}\n`;
      
      const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Report_${viewMonth}.csv`);
      document.body.appendChild(link);
      link.click();
  };

  // ==========================================
  // 4. UI RENDER
  // ==========================================
  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800 animate-fade-in">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Baldigambar HQ</h1>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <p className="text-slate-400 text-sm font-bold">System Online • Cloud Active</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            {/* NEW CALENDAR NAVIGATOR */}
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 shadow-lg">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft size={20} />
                </button>
                
                <div className="relative px-4 py-1 text-center min-w-[160px] group">
                    <div className="flex flex-col items-center cursor-pointer">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Viewing Report</span>
                        <span className="text-sm font-bold text-white uppercase tracking-wider group-hover:text-orange-400 transition-colors">{formatMonth(viewMonth)}</span>
                    </div>
                    {/* Hidden input overlay for direct jumping */}
                    <input 
                    type="month" 
                    value={viewMonth} 
                    onChange={(e) => setViewMonth(e.target.value)} 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Jump to specific month"
                    />
                </div>

                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ChevronRight size={20} />
                </button>
            </div>

            <button onClick={downloadReport} className="bg-white text-slate-900 p-3 rounded-xl hover:bg-orange-50 transition-colors shadow-lg" title="Download CSV Report">
                <Download size={20}/>
            </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Net Profit Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Net Profit ({formatMonth(viewMonth)})</p>
              <h3 className={`text-3xl font-black mt-1 ${stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₹{stats.netProfit.toLocaleString()}</h3>
            </div>
            <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${stats.netProfit >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {stats.netProfit >= 0 ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-[10px] font-bold">
             <span className="text-slate-500">Income: ₹{stats.totalIncome.toLocaleString()}</span>
             <span className="text-red-500">Exp: ₹{stats.totalExpense.toLocaleString()}</span>
          </div>
        </div>

        {/* Cash Balance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Cash In Hand (Total)</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">₹{cashInHand.toLocaleString()}</h3>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:scale-110 transition-transform"><Wallet size={20}/></div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-500">
            Available Liquid Cash
          </div>
        </div>

        {/* Invoice Stats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Billed ({formatMonth(viewMonth)})</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">₹{stats.totalBilled.toLocaleString()}</h3>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg text-orange-600 group-hover:scale-110 transition-transform"><FileText size={20}/></div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-red-500 flex items-center gap-1">
             <AlertTriangle size={12}/> Pending Dues: ₹{stats.pendingDues.toLocaleString()}
          </div>
        </div>

        {/* Labor Stats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Labor Cost ({formatMonth(viewMonth)})</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">₹{stats.laborCost.toLocaleString()}</h3>
            </div>
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600 group-hover:scale-110 transition-transform"><Users size={20}/></div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-green-600">
             {stats.presentWorkers} / {stats.totalWorkers} Present Today
          </div>
        </div>
      </div>

      {/* DETAILED SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-full">
            <h3 className="font-bold text-slate-700 uppercase text-sm mb-4">Quick Shortcuts</h3>
            <div className="space-y-3">
              <button onClick={() => setActiveTab('Billing / Invoice')} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 rounded-xl border border-slate-100 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-orange-600 shadow-sm"><FileText size={20}/></div>
                  <span className="font-bold text-slate-700 group-hover:text-orange-700">Create New Invoice</span>
                </div>
                <ArrowRight size={18} className="text-slate-300 group-hover:text-orange-600"/>
              </button>
              
              <button onClick={() => setActiveTab('Fleet Manager')} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 rounded-xl border border-slate-100 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm"><Truck size={20}/></div>
                  <span className="font-bold text-slate-700 group-hover:text-blue-700">Log Fleet Work</span>
                </div>
                <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-600"/>
              </button>

              <button onClick={() => setActiveTab('Labor & HR')} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-green-50 hover:border-green-200 rounded-xl border border-slate-100 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-green-600 shadow-sm"><Users size={20}/></div>
                  <span className="font-bold text-slate-700 group-hover:text-green-700">Mark Attendance</span>
                </div>
                <ArrowRight size={18} className="text-slate-300 group-hover:text-green-600"/>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Recent Invoices & Expenses Breakdown */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Monthly Expense Breakdown Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-700 uppercase text-sm mb-4 flex items-center gap-2"><PieChart size={16}/> Expense Breakdown ({formatMonth(viewMonth)})</h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-500">Labor Payroll</span><span>₹{stats.laborCost.toLocaleString()}</span></div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{width: `${(stats.laborCost/stats.totalExpense)*100}%`}}></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-500">Fleet Fuel & Maint</span><span>₹{stats.fleetFuelCost.toLocaleString()}</span></div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{width: `${(stats.fleetFuelCost/stats.totalExpense)*100}%`}}></div></div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-between font-black text-sm">
                        <span>TOTAL MONTHLY EXPENSE</span>
                        <span className="text-red-600">₹{stats.totalExpense.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Recent Invoices */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 uppercase text-sm">Recent Invoices</h3>
                    <button onClick={() => setActiveTab('Billing / Invoice')} className="text-xs font-bold text-orange-600 hover:text-orange-800 transition-colors">View All</button>
                </div>
                <div className="divide-y divide-slate-50">
                    {stats.recentInvoices.map((inv) => {
                    const total = Math.round((inv.items || []).reduce((s,i)=>s+Number(i.amount),0) + (inv.isGst ? (inv.items || []).reduce((s,i)=>s+Number(i.amount),0)*0.18 : 0) - (inv.discount||0));
                    const paid = total - (Number(inv.advances) || 0) <= 0;
                    
                    return (
                        <div key={inv.id || Math.random()} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">#{inv.billNo}</div>
                            <div>
                            <p className="font-bold text-slate-800">{inv.client?.name || 'Unknown'}</p>
                            <p className="text-xs font-bold text-slate-400">{inv.date}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-slate-800">₹{total.toLocaleString()}</p>
                            <div className={`flex items-center gap-1 justify-end text-[10px] font-bold uppercase ${paid ? 'text-green-600' : 'text-red-600'}`}>
                            {paid ? <CheckCircle size={10}/> : <Clock size={10}/>}
                            {paid ? 'PAID' : 'PENDING'}
                            </div>
                        </div>
                        </div>
                    )
                    })}
                    {stats.recentInvoices.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm font-bold">No invoices generated yet.</div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}