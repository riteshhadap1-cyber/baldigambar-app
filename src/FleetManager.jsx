import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Fuel, Check, Clock, Printer, X, Settings, 
  User, Wrench, TrendingUp, AlertTriangle, Search, Droplet, 
  Calendar, DollarSign, FileText, ChevronDown, ChevronUp, History,
  Download, PieChart, Activity, CalendarDays, Lock,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle
} from 'lucide-react';
// FIREBASE IMPORTS
import { db } from './firebase-config';
import { ref, onValue, push, remove, update, set, query, orderByChild, startAt, endAt, get, increment } from 'firebase/database';

export default function FleetManager({ isAdmin }) { 
  
  // ==========================================
  // 1. DATABASE & STATE
  // ==========================================
  
  const [vehicles, setVehicles] = useState(['JCB', 'Tipper']); 
  const [entries, setEntries] = useState([]);
  const [fleetData, setFleetData] = useState({});

  // UI State
  const [activeTab, setActiveTab] = useState('All');
  const [viewMonth, setViewMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [inkSaver, setInkSaver] = useState(true);
  const [serviceInterval, setServiceInterval] = useState(250);
  const [advanceModalVehicle, setAdvanceModalVehicle] = useState(null); 
  const [selectedRowId, setSelectedRowId] = useState(null);

  // Form State
  const [form, setForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    machine: 'JCB', 
    time: '', 
    client: '', 
    hours: '', 
    amount: '' 
  });
  const [newVehicleName, setNewVehicleName] = useState('');

  // ==========================================
  // 2. LIVE CLOUD LISTENERS
  // ==========================================
  useEffect(() => {
    // 1. Listen for Entries - FILTERED BY MONTH
    const monthStart = viewMonth;
    const monthEnd = viewMonth + "\uf8ff";
    
    const entriesQuery = query(
      ref(db, 'fleet_entries'), 
      orderByChild('date'), 
      startAt(monthStart), 
      endAt(monthEnd)
    );

    const unsubEntries = onValue(entriesQuery, (snapshot) => {
      const data = snapshot.val();
      const loaded = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      loaded.sort((a, b) => new Date(b.date) - new Date(a.date));
      setEntries(loaded);
    });

    // 2. Listen for Fleet Data (Fuel, Advances, Service Info)
    const dataRef = ref(db, 'fleet_data');
    const unsubData = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const normalized = {};
        Object.keys(data).forEach(vehicle => {
           const vData = data[vehicle];
           const advObj = vData.advanceHistory || {};
           const advArray = Object.keys(advObj).map(k => ({ id: k, ...advObj[k] }));
           const fuelObj = vData.fuelHistory || {};
           const fuelArray = Object.keys(fuelObj).map(k => ({ id: k, ...fuelObj[k] }));
           normalized[vehicle] = { ...vData, advanceHistory: advArray, fuelHistory: fuelArray };
        });
        setFleetData(normalized);
      } else {
        setFleetData({});
      }
    });

    // 3. Listen for Vehicle List
    const vehicleRef = ref(db, 'fleet_vehicles');
    const unsubVehicles = onValue(vehicleRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setVehicles(data);
    });

    return () => {
      unsubEntries();
      unsubData();
      unsubVehicles();
    };
  }, [viewMonth]); 

  // ==========================================
  // 3. LOGIC & CALCULATIONS
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

  // Filter Logbook
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchesTab = activeTab === 'All' || e.machine === activeTab;
      const matchesSearch = (e.client || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (e.machine || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [entries, activeTab, searchQuery]);

  // Financials
  const totalIncome = filteredEntries.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalPending = filteredEntries.filter(e => !e.isPaid).reduce((sum, item) => sum + Number(item.amount), 0);
  const totalHoursWorked = filteredEntries.reduce((sum, item) => sum + Number(item.hours), 0);

  const getVehicleMonthlyStats = (vehicle) => {
      const data = fleetData[vehicle] || {};
      const monthlyAdvances = (data.advanceHistory || []).filter(a => a.date && a.date.startsWith(viewMonth));
      const totalAdvance = monthlyAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
      const monthlyFuel = (data.fuelHistory || []).filter(f => f.date && f.date.startsWith(viewMonth));
      const totalFuelCost = monthlyFuel.reduce((sum, f) => sum + Number(f.cost), 0);
      const totalFuelLitres = monthlyFuel.reduce((sum, f) => sum + Number(f.litres), 0);
      
      const salary = Number(data.salary || 0);
      const maintenance = Number(data.service || 0);

      return { totalAdvance, totalFuelCost, totalFuelLitres, salary, maintenance, monthlyAdvances, monthlyFuel };
  };

  const getVehicleExpense = (v) => {
      const stats = getVehicleMonthlyStats(v);
      return stats.totalFuelCost + stats.salary + stats.maintenance;
  };

  const totalExpense = activeTab === 'All' 
    ? vehicles.reduce((sum, v) => sum + getVehicleExpense(v), 0)
    : getVehicleExpense(activeTab);

  const netProfit = totalIncome - totalExpense;

  const siteStats = useMemo(() => {
    const stats = {};
    filteredEntries.forEach(e => {
      const client = e.client || 'Unknown';
      stats[client] = (stats[client] || 0) + Number(e.amount);
    });
    return Object.entries(stats).sort((a,b) => b[1] - a[1]); 
  }, [filteredEntries]);

  // Service Status
  const getServiceStatus = (vehicle) => {
    const lifetimeHours = fleetData[vehicle]?.totalRunningHours || 0;
    const lastServiceAt = fleetData[vehicle]?.lastServiceHours || 0;
    const hoursRun = lifetimeHours - lastServiceAt;
    const percent = Math.min((hoursRun / serviceInterval) * 100, 100);
    return { hoursRun, percent, lifetimeHours, due: hoursRun >= serviceInterval };
  };

  // ==========================================
  // 4. CLOUD ACTIONS (WITH CASHBOOK INTEGRATION)
  // ==========================================

  const updateVehicleData = (vehicle, field, value) => {
    if (!isAdmin) return; 
    update(ref(db, `fleet_data/${vehicle}`), { [field]: value });
  };

  // --- THIS IS THE KEY FUNCTION FOR SYNCING ---
  const addHistoryEntry = (e, type) => {
    e.preventDefault();
    if (!isAdmin) return;
    const fd = new FormData(e.target);
    
    // Common Data
    const date = fd.get('date');
    const amount = Number(fd.get('amount'));
    const entry = { date, amount };
    const machine = advanceModalVehicle; // The currently selected vehicle (e.g., 'JCB')

    if (type === 'advance') {
        entry.reason = fd.get('reason');
        
        // 1. Add to Fleet History
        push(ref(db, `fleet_data/${machine}/advanceHistory`), entry);
        
        // 2. SYNC TO CASHBOOK (EXPENSE)
        push(ref(db, 'cashbook'), {
            date: date,
            type: 'Expense',
            category: 'Salaries',
            site: machine, 
            payee: `${machine} Driver`,
            amount: amount,
            mode: 'Cash',
            note: `Driver Advance (${machine}): ${entry.reason}`,
            status: 'Paid',
            timestamp: Date.now()
        });
        alert("Advance Added & Logged to Cashbook!");

    } else if (type === 'fuel') {
        entry.cost = amount; 
        entry.litres = Number(fd.get('litres'));
        delete entry.amount; // Cleanup internal object
        
        // 1. Add to Fleet History
        push(ref(db, `fleet_data/${machine}/fuelHistory`), entry);

        // 2. SYNC TO CASHBOOK (EXPENSE)
        // This is the part that was likely missing or broken
        push(ref(db, 'cashbook'), {
            date: date,
            type: 'Expense',
            category: 'Fuel/Travel',
            site: machine,
            payee: 'Petrol Pump',
            amount: amount,
            mode: 'Cash',
            note: `Diesel (${machine}): ${entry.litres} Litres`,
            status: 'Paid',
            timestamp: Date.now()
        });
        alert("Fuel Added & Logged to Cashbook!");
    }
    e.target.reset();
  };

  const deleteHistoryEntry = (id, type) => {
    if (!isAdmin) return;
    if(!confirm("Delete this entry? (Note: This deletes from Fleet history only. Please delete from Cashbook manually if needed.)")) return;
    const path = type === 'advance' ? 'advanceHistory' : 'fuelHistory';
    remove(ref(db, `fleet_data/${advanceModalVehicle}/${path}/${id}`));
  };

  const resetService = (vehicle) => {
    if (!isAdmin) return;
    if(confirm(`Reset Service Timer for ${vehicle}? Confirm only if Oil Change is done.`)) {
      const currentTotal = fleetData[vehicle]?.totalRunningHours || 0;
      update(ref(db, `fleet_data/${vehicle}`), { lastServiceHours: currentTotal });
    }
  };

  const handleAddEntry = (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!form.amount) return;
    const machineName = activeTab === 'All' ? form.machine : activeTab;
    const hrs = Number(form.hours) || 0;

    // 1. Add Entry Log
    push(ref(db, 'fleet_entries'), {
        ...form,
        machine: machineName,
        isPaid: false,
        timestamp: Date.now()
    });

    // 2. Increment Total Hours
    if (hrs > 0) {
        update(ref(db, `fleet_data/${machineName}`), {
            totalRunningHours: increment(hrs)
        });
    }

    setForm({ ...form, client: '', time: '', hours: '', amount: '' }); 
  };

  const deleteEntry = (id, machine, hours) => { 
    if (!isAdmin) return;
    if(confirm("Delete this entry?")) {
        remove(ref(db, `fleet_entries/${id}`));
        if(hours > 0 && machine) {
            update(ref(db, `fleet_data/${machine}`), {
                totalRunningHours: increment(-hours)
            });
        }
    }
  };

  const togglePaymentStatus = (id, currentStatus) => {
    if (!isAdmin) return;
    update(ref(db, `fleet_entries/${id}`), { isPaid: !currentStatus });
  };

  const addVehicle = () => { 
    if (!isAdmin) return;
    if (newVehicleName && !vehicles.includes(newVehicleName)) { 
        const newVehiclesList = [...vehicles, newVehicleName];
        set(ref(db, 'fleet_vehicles'), newVehiclesList);
        setNewVehicleName(''); 
    } 
  };

  const syncTotalHours = async () => {
    if(!confirm("Recalculate total hours for all machines?")) return;
    const snapshot = await get(ref(db, 'fleet_entries'));
    const allEntries = snapshot.val() || {};
    const totals = {};
    Object.values(allEntries).forEach(e => {
        if(e.machine && e.hours) totals[e.machine] = (totals[e.machine] || 0) + Number(e.hours);
    });
    Object.keys(totals).forEach(machine => {
        update(ref(db, `fleet_data/${machine}`), { totalRunningHours: totals[machine] });
    });
    alert("Sync Complete!");
  };

  // ==========================================
  // 5. UI RENDER
  // ==========================================
  return (
    <div className={`space-y-6 pb-20 font-sans text-slate-800 animate-fade-in ${inkSaver ? 'print-ink-saver' : ''}`}>
      
      <style>{`
        @media print {
          aside, nav, header, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
          body { background: white !important; }
          .print-area { display: block !important; width: 100%; }
          .print-ink-saver * { color: black !important; background: transparent !important; border-color: black !important; box-shadow: none !important; }
          .print-ink-saver .border-2 { border-width: 1px !important; }
          .print-ink-saver table { border: 1px solid black !important; border-collapse: collapse !important; }
          .print-ink-saver th, .print-ink-saver td { border: 1px solid black !important; }
        }
      `}</style>

      {/* --- ADVANCE/FUEL MODAL --- */}
      {advanceModalVehicle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-900 p-4 flex justify-between items-center text-white sticky top-0 z-10">
              <h3 className="font-bold text-lg uppercase flex items-center gap-2"><Fuel size={20}/> Manage: {advanceModalVehicle}</h3>
              <button onClick={() => setAdvanceModalVehicle(null)} className="hover:text-red-400"><X size={24}/></button>
            </div>
            <div className="p-6 space-y-8">
              
              {/* FUEL SECTION */}
              <div>
                  <h4 className="font-black text-slate-700 uppercase mb-2 flex items-center gap-2"><Droplet size={16} className="text-red-500"/> Fuel Log ({formatMonth(viewMonth)})</h4>
                  {isAdmin && (
                    <form onSubmit={(e)=>addHistoryEntry(e, 'fuel')} className="bg-red-50 p-3 rounded-xl mb-3 border border-red-100 flex gap-2">
                        <input name="date" type="date" required className="w-1/3 border p-1 rounded font-bold text-xs" defaultValue={new Date().toISOString().split('T')[0]} />
                        <input name="litres" type="number" placeholder="Ltrs" className="w-1/4 border p-1 rounded font-bold text-xs" />
                        <input name="amount" type="number" required placeholder="Cost (₹)" className="w-1/3 border p-1 rounded font-bold text-xs" />
                        <button className="bg-red-500 text-white rounded px-2 font-bold">+</button>
                    </form>
                  )}
                  <table className="w-full text-xs text-left">
                     <thead><tr className="border-b"><th className="pb-1">Date</th><th className="pb-1">Litres</th><th className="pb-1 text-right">Cost</th><th className="w-6"></th></tr></thead>
                     <tbody>
                        {getVehicleMonthlyStats(advanceModalVehicle).monthlyFuel.map(f => (
                            <tr key={f.id} className="border-b border-gray-50">
                                <td className="py-1 font-bold text-gray-500">{f.date}</td>
                                <td className="py-1 font-bold">{f.litres} L</td>
                                <td className="py-1 text-right font-bold text-red-600">₹{f.cost}</td>
                                <td className="text-center">{isAdmin && <button onClick={()=>deleteHistoryEntry(f.id, 'fuel')}><Trash2 size={12} className="text-gray-300 hover:text-red-500"/></button>}</td>
                            </tr>
                        ))}
                     </tbody>
                  </table>
              </div>

              {/* ADVANCE SECTION */}
              <div>
                  <h4 className="font-black text-slate-700 uppercase mb-2 flex items-center gap-2"><DollarSign size={16} className="text-orange-500"/> Advances ({formatMonth(viewMonth)})</h4>
                  {isAdmin && (
                    <form onSubmit={(e)=>addHistoryEntry(e, 'advance')} className="bg-orange-50 p-3 rounded-xl mb-3 border border-orange-100">
                        <div className="flex gap-2 mb-2">
                            <input name="date" type="date" required className="w-1/2 border p-1 rounded font-bold text-xs" defaultValue={new Date().toISOString().split('T')[0]} />
                            <input name="amount" type="number" required placeholder="Amount (₹)" className="w-1/2 border p-1 rounded font-bold text-xs" />
                        </div>
                        <div className="flex gap-2">
                            <input name="reason" type="text" placeholder="Reason" className="flex-1 border p-1 rounded font-bold text-xs" />
                            <button className="bg-orange-500 text-white rounded px-3 font-bold">+</button>
                        </div>
                    </form>
                  )}
                  <table className="w-full text-xs text-left">
                     <thead><tr className="border-b"><th className="pb-1">Date</th><th className="pb-1">Reason</th><th className="pb-1 text-right">Amount</th><th className="w-6"></th></tr></thead>
                     <tbody>
                        {getVehicleMonthlyStats(advanceModalVehicle).monthlyAdvances.map(a => (
                            <tr key={a.id} className="border-b border-gray-50">
                                <td className="py-1 font-bold text-gray-500">{a.date}</td>
                                <td className="py-1 font-bold">{a.reason}</td>
                                <td className="py-1 text-right font-bold text-orange-600">₹{a.amount}</td>
                                <td className="text-center">{isAdmin && <button onClick={()=>deleteHistoryEntry(a.id, 'advance')}><Trash2 size={12} className="text-gray-300 hover:text-red-500"/></button>}</td>
                            </tr>
                        ))}
                     </tbody>
                  </table>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button onClick={() => setActiveTab('All')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'All' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>All Fleet</button>
          {vehicles.map(v => {
            const service = getServiceStatus(v);
            return (
              <button key={v} onClick={() => setActiveTab(v)} className={`relative px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === v ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                {v} {service.due && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
              </button>
            )
          })}
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg border-l ml-1"><Settings size={18}/></button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 xl:w-48">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          
          <div className="flex items-center bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"><ChevronLeft size={20} /></button>
                <div className="relative px-2 py-1 text-center min-w-[120px] group">
                    <div className="flex flex-col items-center cursor-pointer">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Report Month</span>
                        <span className="text-sm font-bold text-slate-700 uppercase tracking-wider group-hover:text-orange-600 transition-colors">{formatMonth(viewMonth)}</span>
                    </div>
                    <input type="month" value={viewMonth} onChange={(e) => setViewMonth(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"><ChevronRight size={20} /></button>
          </div>

          <button onClick={() => setInkSaver(!inkSaver)} className={`p-2 rounded-xl transition-all border ${inkSaver ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-slate-400 border-slate-200'}`} title="Ink Saver"><Droplet size={18}/></button>
          <button onClick={() => window.print()} className="bg-slate-800 text-white p-2 rounded-xl hover:bg-black"><Printer size={18}/></button>
        </div>
      </div>

      {/* --- SETTINGS DRAWER --- */}
      {showSettings && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 print:hidden grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div>
              <h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Add New Machine</h4>
              <div className="flex gap-2">
                  <input disabled={!isAdmin} placeholder="e.g. Tractor" className="border p-2 rounded-lg flex-1 font-bold bg-white disabled:opacity-50" value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)} />
                  <button disabled={!isAdmin} onClick={addVehicle} className="bg-slate-800 text-white px-4 rounded-lg font-bold disabled:opacity-50">Add</button>
              </div>
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Service Interval</h4>
            <div className="flex items-center gap-2 mb-2"><span className="text-sm font-bold text-slate-600">Every</span><input type="number" className="w-20 border p-1 rounded font-bold text-center" value={serviceInterval} onChange={e => setServiceInterval(Number(e.target.value))} /><span className="text-sm font-bold text-slate-600">hours</span></div>
            <button onClick={syncTotalHours} className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded hover:bg-orange-200 flex items-center gap-1"><RefreshCw size={12}/> Sync Total Hours</button>
          </div>
        </div>
      )}

      {/* --- KPI DASHBOARD (MONTHLY) --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-4 rounded-2xl border-l-4 border-l-emerald-500 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Profit</div>
          <div className={`text-2xl font-black mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₹{netProfit.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Income</div>
          <div className="text-2xl font-black mt-1 text-slate-800">₹{totalIncome.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Expense</div>
          <div className="text-2xl font-black mt-1 text-red-600">₹{totalExpense.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hours Worked</div>
           <div className="text-2xl font-black mt-1 text-slate-800">{totalHoursWorked} hrs</div>
        </div>
      </div>

      {/* --- ADD ENTRY & SITE LIST --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2 no-print">
         {isAdmin ? (
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 uppercase mb-4 text-sm flex items-center gap-2"><span className="bg-orange-100 text-orange-600 p-1 rounded"><Plus size={16}/></span> Log Entry</h3>
                <form onSubmit={handleAddEntry} className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <input type="date" required className="col-span-1 border p-2 rounded-lg font-bold bg-slate-50 text-sm" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    {activeTab === 'All' && <select className="col-span-1 border p-2 rounded-lg font-bold bg-slate-50 text-sm" value={form.machine} onChange={e => setForm({...form, machine: e.target.value})}>{vehicles.map(v => <option key={v}>{v}</option>)}</select>}
                    <input placeholder="Client Name" className="col-span-2 border p-2 rounded-lg font-bold bg-slate-50 text-sm" value={form.client} onChange={e => setForm({...form, client: e.target.value})} />
                    <input placeholder="Time (e.g. 9-5)" className="col-span-1 border p-2 rounded-lg font-bold bg-slate-50 text-sm" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                    <input type="number" placeholder="Hrs" className="col-span-1 border p-2 rounded-lg font-bold bg-slate-50 text-sm" value={form.hours} onChange={e => setForm({...form, hours: e.target.value})} />
                    <input type="number" placeholder="Amount (₹)" required className="col-span-2 border p-2 rounded-lg font-bold bg-slate-50 text-sm text-orange-600" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                    <button className="col-span-2 md:col-span-4 bg-slate-800 hover:bg-black text-white p-2 rounded-lg font-bold shadow-md text-sm">Add Record</button>
                </form>
            </div>
         ) : (
            <div className="lg:col-span-2 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 font-bold text-sm">
                <Lock size={16} className="mr-2"/> Admin Access Required
            </div>
         )}

         <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <h3 className="font-bold text-slate-700 uppercase mb-4 text-sm flex items-center gap-2"><PieChart size={16}/> Top Clients ({formatMonth(viewMonth)})</h3>
             <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                 {siteStats.map(([site, amt], i) => (
                     <div key={site} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                         <div className="flex items-center gap-2"><span className="font-bold text-slate-400 w-4">{i+1}.</span><span className="font-bold text-slate-700 truncate w-24">{site}</span></div>
                         <div className="font-black text-emerald-600">₹{amt.toLocaleString()}</div>
                     </div>
                 ))}
                 {siteStats.length === 0 && <div className="text-slate-400 text-center text-xs italic">No entries this month</div>}
             </div>
         </div>
      </div>

      {/* --- LOG TABLE --- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6 print:border-2 print:border-black print:rounded-none">
        <div className="hidden print:block p-4 text-center border-b-2 border-black">
            <h1 className="text-2xl font-black uppercase">BALDIGAMBAR ENTERPRISES</h1>
            <p className="text-xs font-bold uppercase tracking-widest mt-1">Work Report: {activeTab} • {formatMonth(viewMonth)}</p>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider print:bg-white print:text-black print:border-b print:border-black">
            <tr>
              <th className="p-3 pl-4">Date</th>
              {activeTab === 'All' && <th className="p-3">Machine</th>}
              <th className="p-3">Client</th>
              <th className="p-3">Time</th>
              <th className="p-3 text-center">Work</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-center print:hidden">Status</th>
              <th className="p-3 text-center print:hidden">Act</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-black">
            {filteredEntries.map((item) => (
              <tr key={item.id} onClick={()=>setSelectedRowId(selectedRowId===item.id?null:item.id)} className={`group hover:bg-slate-50 cursor-pointer ${selectedRowId===item.id ? 'bg-yellow-50' : ''}`}>
                <td className="p-3 pl-4 font-bold text-slate-700">{item.date}</td>
                {activeTab === 'All' && <td className="p-3"><span className="bg-slate-100 border px-1 rounded text-[10px] font-bold text-slate-600 print:border-black">{item.machine}</span></td>}
                <td className="p-3 font-bold text-slate-800">{item.client}</td>
                <td className="p-3 text-xs text-slate-500 font-medium print:text-black">{item.time}</td>
                <td className="p-3 text-center font-bold text-slate-600">{item.hours}</td>
                <td className="p-3 text-right font-black text-slate-800">₹{Number(item.amount).toLocaleString()}</td>
                <td className="p-3 text-center print:hidden">
                    <button disabled={!isAdmin} onClick={(e) => {e.stopPropagation(); togglePaymentStatus(item.id, item.isPaid)}} className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                        {item.isPaid ? 'Paid' : 'Pending'}
                    </button>
                </td>
                <td className="p-3 text-center print:hidden opacity-0 group-hover:opacity-100">
                    {isAdmin && <button onClick={(e) => {e.stopPropagation(); deleteEntry(item.id, item.machine, item.hours)}} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- DRIVER PAYSLIPS (PRINTABLE) --- */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-8">
        {vehicles.filter(v => activeTab === 'All' || activeTab === v).map(vehicle => {
            const stats = getVehicleMonthlyStats(vehicle);
            const service = getServiceStatus(vehicle);
            const data = fleetData[vehicle] || {};
            const payable = stats.salary - stats.totalAdvance;

            return (
                <div key={vehicle} className="bg-white rounded-2xl border-2 border-slate-200 p-0 overflow-hidden shadow-sm print:border-black print:break-inside-avoid print:shadow-none mb-6">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center print:bg-white print:border-black">
                        <div>
                            <h4 className="font-black text-xl uppercase text-slate-800">{vehicle}</h4>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Month: {formatMonth(viewMonth)}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-bold uppercase text-slate-400">Driver</p>
                           <input disabled={!isAdmin} className="font-bold text-right bg-transparent outline-none w-32 border-b border-slate-300 focus:border-orange-500" value={data.driver || ''} onChange={e => updateVehicleData(vehicle, 'driver', e.target.value)} placeholder="Name"/>
                        </div>
                    </div>

                    <div className="relative h-1 bg-slate-100 w-full print:border-b print:border-black">
                        <div className={`h-full ${service.percent > 90 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${service.percent}%`}}></div>
                    </div>

                    <div className="p-4 grid grid-cols-2 gap-6">
                        <div className="space-y-2 border-r border-dashed border-slate-200 pr-4 print:border-black">
                            <h5 className="text-[10px] font-bold uppercase text-slate-400 mb-2">Driver Salary</h5>
                            <div className="flex justify-between text-sm"><span className="font-bold text-slate-600">Base Salary</span><input disabled={!isAdmin} type="number" className="w-16 text-right font-bold bg-transparent border-b border-slate-200 outline-none" value={data.salary || ''} onChange={e => updateVehicleData(vehicle, 'salary', e.target.value)}/></div>
                            <div className="flex justify-between text-sm"><span className="font-bold text-slate-600">Less: Advance</span><span className="font-bold text-red-500">- ₹{stats.totalAdvance}</span></div>
                            <div className="border-t border-slate-200 pt-2 flex justify-between text-lg font-black mt-2 print:border-black">
                                <span>PAYABLE</span><span>₹{payable.toLocaleString()}</span>
                            </div>
                            <button onClick={()=>setAdvanceModalVehicle(vehicle)} className="w-full mt-2 text-xs font-bold text-blue-600 bg-blue-50 py-1 rounded hover:bg-blue-100 print:hidden">Manage Advances / Fuel</button>
                        </div>

                        <div className="space-y-2">
                             <h5 className="text-[10px] font-bold uppercase text-slate-400 mb-2">Machine Stats</h5>
                             <div className="flex justify-between text-xs"><span className="font-bold text-slate-600">Fuel Used</span><span className="font-bold">{stats.totalFuelLitres} Ltrs</span></div>
                             <div className="flex justify-between text-xs"><span className="font-bold text-slate-600">Fuel Cost</span><span className="font-bold text-red-500">₹{stats.totalFuelCost}</span></div>
                             <div className="flex justify-between text-xs"><span className="font-bold text-slate-600">Maintenance</span><input disabled={!isAdmin} type="number" className="w-16 text-right font-bold bg-transparent border-b border-slate-200 outline-none" value={data.service || ''} onChange={e => updateVehicleData(vehicle, 'service', e.target.value)}/></div>
                             
                             <div className="pt-2 mt-2 border-t border-slate-200 print:border-black">
                                 <div className="flex justify-between items-center">
                                     <span className="text-[10px] font-bold uppercase text-slate-500">Service Due In</span>
                                     <span className={`font-black ${service.due ? 'text-red-600 animate-pulse print:animate-none' : 'text-emerald-600'}`}>{Math.max(0, serviceInterval - service.hoursRun)} hrs</span>
                                 </div>
                                 {isAdmin && service.due && <button onClick={()=>resetService(vehicle)} className="text-[9px] underline text-blue-500 mt-1 print:hidden">Reset Timer</button>}
                             </div>
                        </div>
                    </div>
                </div>
            )
        })}
      </div>

    </div>
  );
}