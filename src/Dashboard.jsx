import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Users, Truck, FileText, 
  Plus, ArrowRight, AlertTriangle, IndianRupee, Activity 
} from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  
  // ==========================================
  // 1. DATA FETCHING (Read-Only from other tabs)
  // ==========================================
  
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalReceived: 0,
    pendingDues: 0,
    fleetCost: 0,
    activeVehicles: 0,
    serviceDueVehicles: 0,
    presentWorkers: 0,
    totalWorkers: 0,
    recentInvoices: []
  });

  useEffect(() => {
    // 1. BILLING DATA
    const invoices = JSON.parse(localStorage.getItem('baldigambar_invoices') || '[]');
    const totalBilled = invoices.reduce((sum, inv) => {
      const sub = inv.items.reduce((s, i) => s + Number(i.amount), 0);
      const tax = inv.isGst ? sub * 0.18 : 0;
      return sum + Math.round(sub + tax - (inv.discount || 0));
    }, 0);
    const totalReceived = invoices.reduce((sum, inv) => sum + Number(inv.advances || 0), 0);
    
    // 2. FLEET DATA
    const fleetData = JSON.parse(localStorage.getItem('baldigambar_fleet_data_v8') || '{}');
    const fleetVehicles = JSON.parse(localStorage.getItem('baldigambar_fleet_vehicles') || '[]');
    
    let fleetCost = 0;
    let serviceDueCount = 0;
    
    // Calculate Fleet Costs & Service Alerts
    Object.values(fleetData).forEach(v => {
      fleetCost += (Number(v.fuelCost) || 0) + (Number(v.service) || 0) + (Number(v.salary) || 0);
      // Check service logic (simplified check based on last data)
      // Real check requires comparing entries vs lastServiceHours, simplified here:
      if (v.lastServiceHours > 0) serviceDueCount++; // Just a placeholder logic or 0
    });

    // 3. LABOR DATA
    const workers = JSON.parse(localStorage.getItem('baldigambar_workers') || '[]');
    const attendance = JSON.parse(localStorage.getItem('baldigambar_attendance') || '{}');
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance[today] || {};
    const presentCount = Object.values(todayAttendance).filter(s => s === 'P' || s === 'HD').length;

    setStats({
      totalBilled,
      totalReceived,
      pendingDues: totalBilled - totalReceived,
      fleetCost,
      activeVehicles: fleetVehicles.length,
      serviceDueVehicles: serviceDueCount, // You might want to refine this logic by reading entries
      presentWorkers: presentCount,
      totalWorkers: workers.length,
      recentInvoices: invoices.slice(0, 5) // Last 5
    });

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
          <p className="text-slate-400 text-sm font-bold mt-1">Welcome back, Ritesh</p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-xs font-bold text-slate-500 uppercase">Current Date</p>
          <p className="text-xl font-bold">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {/* KEY METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Total Billed Revenue</p>
              <h3 className="text-3xl font-black text-emerald-600 mt-1">₹{stats.totalBilled.toLocaleString()}</h3>
            </div>
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><TrendingUp size={24}/></div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Received: ₹{stats.totalReceived.toLocaleString()}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Pending: ₹{stats.pendingDues.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: Fleet Expense */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Fleet Costs (Fuel/Maint)</p>
              <h3 className="text-3xl font-black text-red-500 mt-1">₹{stats.fleetCost.toLocaleString()}</h3>
            </div>
            <div className="bg-red-100 p-2 rounded-lg text-red-500"><Truck size={24}/></div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs font-bold text-slate-500 flex items-center gap-2">
            <AlertTriangle size={14} className="text-yellow-500"/> {stats.activeVehicles} Vehicles Active
          </div>
        </div>

        {/* Card 3: Labor */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Today's Attendance</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.presentWorkers} <span className="text-lg text-slate-400">/ {stats.totalWorkers}</span></h3>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Users size={24}/></div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs font-bold text-slate-500">
            Workers Present Today
          </div>
        </div>
      </div>

      {/* ACTION & RECENT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-700 uppercase text-sm mb-4">Quick Shortcuts</h3>
            <div className="space-y-3">
              <button onClick={() => window.location.href='/billing'} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-orange-600 shadow-sm"><FileText size={20}/></div>
                  <span className="font-bold text-slate-700">Create New Invoice</span>
                </div>
                <ArrowRight size={18} className="text-slate-300 group-hover:text-orange-600"/>
              </button>
              
              <button className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm"><Truck size={20}/></div>
                  <span className="font-bold text-slate-700">Log Fleet Work</span>
                </div>
                <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-600"/>
              </button>

              <button className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-green-600 shadow-sm"><Users size={20}/></div>
                  <span className="font-bold text-slate-700">Mark Attendance</span>
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
            <span className="text-xs font-bold text-orange-600 cursor-pointer">View All</span>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.recentInvoices.map((inv) => {
               const total = Math.round(inv.items.reduce((s,i)=>s+i.amount,0) + (inv.isGst ? inv.items.reduce((s,i)=>s+i.amount,0)*0.18 : 0) - (inv.discount||0));
               return (
                <div key={inv.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">#{inv.billNo}</div>
                    <div>
                      <p className="font-bold text-slate-800">{inv.client.name}</p>
                      <p className="text-xs font-bold text-slate-400">{inv.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800">₹{total.toLocaleString()}</p>
                    <p className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block ${total - inv.advances <= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {total - inv.advances <= 0 ? 'PAID' : 'PENDING'}
                    </p>
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