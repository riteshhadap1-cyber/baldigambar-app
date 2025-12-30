import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Users, Truck, FileText, 
  Plus, ArrowRight, AlertTriangle, IndianRupee, Activity,
  Wallet, Clock, CheckCircle
} from 'lucide-react';
// FIREBASE IMPORTS
import { db } from './firebase-config';
import { ref, onValue } from 'firebase/database';

export default function Dashboard({ setActiveTab, isAdmin }) {
  
  // ==========================================
  // 1. DATA FETCHING (LIVE CLOUD)
  // ==========================================
  
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalReceived: 0,
    pendingDues: 0,
    cashBalance: 0, // New Metric
    fleetCost: 0,
    activeVehicles: 0,
    serviceDueVehicles: 0,
    presentWorkers: 0,
    totalWorkers: 0,
    recentInvoices: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refs = {
      invoices: ref(db, 'invoices'),
      fleetData: ref(db, 'fleet_data'),
      fleetVehicles: ref(db, 'fleet_vehicles'),
      workers: ref(db, 'workers'),
      attendance: ref(db, 'attendance'),
      cashbook: ref(db, 'cashbook')
    };

    // We use a single listener approach or multiple. 
    // Since Firebase is real-time, we can set up listeners for each.
    // For simplicity in a Dashboard, we will set up individual listeners that update the state.

    // 1. INVOICES
    const unsubInvoices = onValue(refs.invoices, (snapshot) => {
      const data = snapshot.val();
      const invoices = data ? Object.values(data) : [];
      
      const totalBilled = invoices.reduce((sum, inv) => {
        const sub = (inv.items || []).reduce((s, i) => s + Number(i.amount), 0);
        const tax = inv.isGst ? sub * 0.18 : 0;
        return sum + Math.round(sub + tax - (inv.discount || 0));
      }, 0);
      
      const totalReceived = invoices.reduce((sum, inv) => sum + Number(inv.advances || 0), 0);
      
      // Sort by newest for "Recent Activity"
      const recent = invoices.sort((a,b) => b.id - a.id).slice(0, 5);

      setStats(prev => ({
        ...prev,
        totalBilled,
        totalReceived,
        pendingDues: totalBilled - totalReceived,
        recentInvoices: recent
      }));
    });

    // 2. FLEET
    const unsubFleet = onValue(refs.fleetData, (snapshot) => {
      const data = snapshot.val() || {};
      let cost = 0;
      let serviceCount = 0;
      
      Object.values(data).forEach(v => {
        cost += (Number(v.fuelCost) || 0) + (Number(v.service) || 0) + (Number(v.salary) || 0);
        // Simplified service check logic
        if (v.lastServiceHours > 0) serviceCount++; 
      });

      setStats(prev => ({ ...prev, fleetCost: cost, serviceDueVehicles: serviceCount }));
    });

    // 2b. FLEET VEHICLES COUNT
    const unsubVehicles = onValue(refs.fleetVehicles, (snapshot) => {
      const data = snapshot.val() || [];
      setStats(prev => ({ ...prev, activeVehicles: data.length }));
    });

    // 3. LABOR
    const unsubLabor = onValue(refs.workers, (snapshot) => {
      const data = snapshot.val();
      const workers = data ? Object.values(data) : [];
      setStats(prev => ({ ...prev, totalWorkers: workers.length }));
    });

    const unsubAttendance = onValue(refs.attendance, (snapshot) => {
      const data = snapshot.val() || {};
      const today = new Date().toISOString().split('T')[0];
      const todayData = data[today] || {};
      const present = Object.values(todayData).filter(s => s === 'P' || s === 'HD').length;
      setStats(prev => ({ ...prev, presentWorkers: present }));
    });

    // 4. CASHBOOK (New!)
    const unsubCashbook = onValue(refs.cashbook, (snapshot) => {
      const data = snapshot.val();
      const entries = data ? Object.values(data) : [];
      const income = entries.filter(e => e.type === 'Income').reduce((s, e) => s + Number(e.amount), 0);
      const expense = entries.filter(e => e.type === 'Expense').reduce((s, e) => s + Number(e.amount), 0);
      setStats(prev => ({ ...prev, cashBalance: income - expense }));
      setLoading(false);
    });

    return () => {
      unsubInvoices(); unsubFleet(); unsubVehicles(); unsubLabor(); unsubAttendance(); unsubCashbook();
    };
  }, []);

  // ==========================================
  // 2. UI RENDER
  // ==========================================
  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800 animate-fade-in">
      
      {/* WELCOME HEADER */}
      <div className="flex justify-between items-center bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Baldigambar HQ</h1>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <p className="text-slate-400 text-sm font-bold">System Online • Cloud Active</p>
          </div>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-xs font-bold text-slate-500 uppercase">Current Date</p>
          <p className="text-xl font-bold">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {/* KEY METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Total Billed</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">₹{stats.totalBilled.toLocaleString()}</h3>
            </div>
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform"><TrendingUp size={20}/></div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex gap-3 text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1 text-orange-600"><AlertTriangle size={10}/> Due: ₹{stats.pendingDues.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: Cash Balance (NEW) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Cash in Hand</p>
              <h3 className={`text-2xl font-black mt-1 ${stats.cashBalance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>₹{stats.cashBalance.toLocaleString()}</h3>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:scale-110 transition-transform"><Wallet size={20}/></div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-500">
            Live from Cashbook
          </div>
        </div>

        {/* Card 3: Fleet Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Fleet Status</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.activeVehicles} <span className="text-sm text-slate-400 font-bold">Active</span></h3>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg text-orange-600 group-hover:scale-110 transition-transform"><Truck size={20}/></div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-red-500">
             Monthly Exp: ₹{stats.fleetCost.toLocaleString()}
          </div>
        </div>

        {/* Card 4: Labor */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Attendance</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.presentWorkers} <span className="text-lg text-slate-300">/ {stats.totalWorkers}</span></h3>
            </div>
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600 group-hover:scale-110 transition-transform"><Users size={20}/></div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-500">
            Workers On-Site Today
          </div>
        </div>
      </div>

      {/* ACTION & RECENT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Quick Actions (FIXED NAVIGATION) */}
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

        {/* Right: Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
  );
}