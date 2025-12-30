import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Fuel, Check, Clock, Printer, X, Settings, 
  User, Wrench, TrendingUp, AlertTriangle, Search, Droplet, 
  Calendar, DollarSign, FileText, ChevronDown, ChevronUp, History,
  Download, PieChart, Activity
} from 'lucide-react';
// FIREBASE IMPORTS
import { db } from './firebase-config';
import { ref, onValue, push, remove, update, set } from 'firebase/database';

export default function FleetManager({ isAdmin }) { // <--- RECEIVES ADMIN PROP
  
  // ==========================================
  // 1. THE DATABASE (CLOUD CONNECTED)
  // ==========================================
  
  // Vehicles List
  const [vehicles, setVehicles] = useState(['JCB', 'Tipper']); 

  // Logbook Entries
  const [entries, setEntries] = useState([]);

  // Fleet Data (Drivers, Salaries, Advances)
  const [fleetData, setFleetData] = useState({});

  // UI State
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [inkSaver, setInkSaver] = useState(true);
  const [serviceInterval, setServiceInterval] = useState(250);
  const [advanceModalVehicle, setAdvanceModalVehicle] = useState(null); 
  const [selectedRowId, setSelectedRowId] = useState(null);

  // Form State
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], machine: 'JCB', time: '', client: '', hours: '', amount: '' });
  const [newVehicleName, setNewVehicleName] = useState('');

  // ==========================================
  // 2. LIVE CLOUD LISTENERS
  // ==========================================
  useEffect(() => {
    // 1. Listen for Entries
    const entriesRef = ref(db, 'fleet_entries');
    onValue(entriesRef, (snapshot) => {
      const data = snapshot.val();
      const loaded = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      setEntries(loaded);
    });

    // 2. Listen for Fleet Data (Drivers/Advances)
    const dataRef = ref(db, 'fleet_data');
    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Normalize advanceHistory from Object (Firebase) to Array (App)
        const normalized = {};
        Object.keys(data).forEach(vehicle => {
           const vData = data[vehicle];
           const advObj = vData.advanceHistory || {};
           const advArray = Object.keys(advObj).map(k => ({ id: k, ...advObj[k] }));
           normalized[vehicle] = { ...vData, advanceHistory: advArray };
        });
        setFleetData(normalized);
      } else {
        setFleetData({});
      }
    });

    // 3. Listen for Vehicle List
    const vehicleRef = ref(db, 'fleet_vehicles');
    onValue(vehicleRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setVehicles(data);
    });
  }, []);

  // ==========================================
  // 3. LOGIC & CALCULATIONS
  // ==========================================

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchesTab = activeTab === 'All' || e.machine === activeTab;
      const matchesSearch = (e.client || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (e.date || '').includes(searchQuery) ||
                            (e.machine || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries, activeTab, searchQuery]);

  // Financials
  const totalIncome = filteredEntries.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalPending = filteredEntries.filter(e => !e.isPaid).reduce((sum, item) => sum + Number(item.amount), 0);

  const getAdvancesTotal = (vehicle) => {
    return (fleetData[vehicle]?.advanceHistory || []).reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const getVehicleExpense = (v) => {
    const data = fleetData[v] || {};
    return (Number(data.fuelCost) || 0) + (Number(data.salary) || 0) + (Number(data.service) || 0);
  };

  const totalExpense = activeTab === 'All' 
    ? vehicles.reduce((sum, v) => sum + getVehicleExpense(v), 0)
    : getVehicleExpense(activeTab);

  const netProfit = totalIncome - totalExpense;

  // Site-wise Breakdown
  const siteStats = useMemo(() => {
    const stats = {};
    filteredEntries.forEach(e => {
      const client = e.client || 'Unknown';
      stats[client] = (stats[client] || 0) + Number(e.amount);
    });
    return Object.entries(stats).sort((a,b) => b[1] - a[1]); 
  }, [filteredEntries]);

  // ==========================================
  // 4. CLOUD ACTIONS (PROTECTED)
  // ==========================================

  const updateVehicleData = (vehicle, field, value) => {
    if (!isAdmin) return; // Lock for family
    update(ref(db, `fleet_data/${vehicle}`), { [field]: value });
  };

  const addAdvance = (e) => {
    e.preventDefault();
    if (!isAdmin) return; // Lock
    const fd = new FormData(e.target);
    const newAdv = { date: fd.get('date'), reason: fd.get('reason'), amount: Number(fd.get('amount')) };
    
    push(ref(db, `fleet_data/${advanceModalVehicle}/advanceHistory`), newAdv);
    e.target.reset();
  };

  const deleteAdvance = (id) => {
    if (!isAdmin) return; // Lock
    if(!confirm("Delete this advance?")) return;
    remove(ref(db, `fleet_data/${advanceModalVehicle}/advanceHistory/${id}`));
  };

  const resetService = (vehicle) => {
    if (!isAdmin) return; // Lock
    if(confirm(`Reset Service Timer for ${vehicle}?`)) {
      const totalHours = entries.filter(e => e.machine === vehicle).reduce((sum, e) => sum + Number(e.hours || 0), 0);
      update(ref(db, `fleet_data/${vehicle}`), { lastServiceHours: totalHours });
    }
  };

  const getServiceStatus = (vehicle) => {
    const totalHours = entries.filter(e => e.machine === vehicle).reduce((sum, e) => sum + Number(e.hours || 0), 0);
    const lastService = fleetData[vehicle]?.lastServiceHours || 0;
    const hoursRun = totalHours - lastService;
    const percent = Math.min((hoursRun / serviceInterval) * 100, 100);
    return { hoursRun, percent, totalHours, due: hoursRun >= serviceInterval };
  };

  const handleAddEntry = (e) => {
    e.preventDefault();
    if (!isAdmin) return; // Lock
    if (!form.amount) return;
    const machineName = activeTab === 'All' ? form.machine : activeTab;
    
    // PUSH to Cloud
    push(ref(db, 'fleet_entries'), {
        ...form,
        machine: machineName,
        isPaid: false,
        timestamp: Date.now()
    });

    setForm({ ...form, client: '', time: '', hours: '', amount: '' }); 
  };

  const deleteEntry = (id) => { 
    if (!isAdmin) return; // Lock
    if(confirm("Delete this entry?")) {
        remove(ref(db, `fleet_entries/${id}`));
    }
  };

  const togglePaymentStatus = (id, currentStatus) => {
    if (!isAdmin) return; // Lock
    update(ref(db, `fleet_entries/${id}`), { isPaid: !currentStatus });
  };

  const addVehicle = () => { 
    if (!isAdmin) return; // Lock
    if (newVehicleName && !vehicles.includes(newVehicleName)) { 
        const newVehiclesList = [...vehicles, newVehicleName];
        set(ref(db, 'fleet_vehicles'), newVehiclesList);
        setNewVehicleName(''); 
    } 
  };

  // CSV Export (Safe for everyone)
  const downloadCSV = () => {
    const headers = ["Date", "Machine", "Client", "Time", "Work(Hrs)", "Amount", "Status"];
    const rows = filteredEntries.map(e => [e.date, e.machine, e.client, e.time, e.hours, e.amount, e.isPaid ? "Paid" : "Pending"]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fleet_report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
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
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .print-ink-saver * { color: black !important; background: transparent !important; border-color: black !important; box-shadow: none !important; text-shadow: none !important; }
          .print-ink-saver .border-2 { border-width: 1px !important; }
          .print-ink-saver input, .print-ink-saver select { border: none !important; font-weight: 800; }
          .print-ink-saver ::placeholder { color: transparent; }
          .print-ink-saver table, .print-ink-saver th, .print-ink-saver td { border: 1px solid black !important; border-collapse: collapse !important; }
        }
      `}</style>

      {/* --- ADVANCE MODAL --- */}
      {advanceModalVehicle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg uppercase flex items-center gap-2"><History size={20}/> Advances: {advanceModalVehicle}</h3>
              <button onClick={() => setAdvanceModalVehicle(null)} className="hover:text-red-400"><X size={24}/></button>
            </div>
            <div className="p-6">
              
              {/* Only Admin can Add Advances */}
              {isAdmin && (
                <form onSubmit={addAdvance} className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Give New Advance</h4>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                    <input name="date" type="date" required className="border p-2 rounded-lg font-bold text-sm" defaultValue={new Date().toISOString().split('T')[0]} />
                    <input name="amount" type="number" required placeholder="Amount (₹)" className="border p-2 rounded-lg font-bold text-sm" />
                    </div>
                    <input name="reason" type="text" required placeholder="Reason (e.g. Medical, Festival)" className="w-full border p-2 rounded-lg font-bold text-sm mb-3" />
                    <button className="w-full bg-orange-600 text-white font-bold py-2 rounded-lg hover:bg-orange-700">Add Advance Entry</button>
                </form>
              )}

              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-bold sticky top-0"><tr><th className="p-2">Date</th><th className="p-2">Reason</th><th className="p-2 text-right">Amount</th><th className="p-2 w-8"></th></tr></thead>
                  <tbody className="divide-y">
                    {(fleetData[advanceModalVehicle]?.advanceHistory || []).map(adv => (
                      <tr key={adv.id}>
                        <td className="p-2 text-xs font-bold text-slate-500">{adv.date}</td>
                        <td className="p-2 font-bold text-slate-700">{adv.reason}</td>
                        <td className="p-2 text-right font-black text-orange-600">₹{adv.amount.toLocaleString()}</td>
                        <td className="p-2 text-center">
                            {isAdmin && <button onClick={()=>deleteAdvance(adv.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200"><tr><td colSpan="2" className="p-2 text-right font-bold text-xs uppercase">Total Advances:</td><td className="p-2 text-right font-black text-lg">₹{getAdvancesTotal(advanceModalVehicle).toLocaleString()}</td><td></td></tr></tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TOP BAR --- */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button onClick={() => setActiveTab('All')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'All' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>All Fleet</button>
          {vehicles.map(v => {
            const status = getServiceStatus(v);
            return (
              <button key={v} onClick={() => setActiveTab(v)} className={`relative px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === v ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                {v} {status.due && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
              </button>
            )
          })}
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg border-l ml-1"><Settings size={18}/></button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 xl:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-100 outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 pr-3">
             <button onClick={() => setInkSaver(!inkSaver)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${inkSaver ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}><Droplet size={14} /> {inkSaver ? 'Ink Saver' : 'Full Color'}</button>
             <button onClick={downloadCSV} className="p-2 text-slate-500 hover:text-blue-600" title="Download Excel"><Download size={18}/></button>
             <button onClick={() => window.print()} className="flex items-center gap-2 text-slate-700 hover:text-black font-bold text-sm"><Printer size={16} /> Print</button>
          </div>
        </div>
      </div>

      {/* --- SETTINGS DRAWER --- */}
      {showSettings && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 print:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
              <h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Add New Machine</h4>
              <div className="flex gap-2">
                  <input disabled={!isAdmin} placeholder="e.g. Tractor" className="border p-2 rounded-lg flex-1 font-bold bg-white disabled:opacity-50" value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)} />
                  <button disabled={!isAdmin} onClick={addVehicle} className="bg-slate-800 text-white px-4 rounded-lg font-bold disabled:opacity-50">Add</button>
              </div>
          </div>
          <div><h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Service Interval</h4><div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-600">Every</span><input type="number" className="w-20 border p-1 rounded font-bold text-center" value={serviceInterval} onChange={e => setServiceInterval(Number(e.target.value))} /><span className="text-sm font-bold text-slate-600">hours</span></div></div>
        </div>
      )}

      {/* --- PRINT HEADER --- */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-4xl font-black uppercase tracking-tight">Baldigambar Enterprises</h1>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Earthmovers • Material Suppliers • Civil Contracts</p>
        <div className="flex justify-between items-end mt-4 text-xs font-bold uppercase text-gray-500">
          <div className="text-left"><p>Report For</p><p className="text-xl font-black text-black">{activeTab}</p></div>
          <div className="text-right"><p>Generated On</p><p className="text-black">{new Date().toLocaleDateString()}</p></div>
        </div>
      </div>

      {/* --- KPI DASHBOARD --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-4">
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-slate-800 shadow-sm print:border-2 print:border-black print:shadow-none">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest print:text-black">Net Profit</div>
          <div className={`text-3xl font-black mt-1 break-words ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'} print:text-black`}>₹{netProfit.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-slate-400 mt-2 print:hidden">After all expenses</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:border-2 print:border-black print:shadow-none">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest print:text-black">Income</div>
          <div className="text-3xl font-black mt-1 text-slate-800 break-words print:text-black">₹{totalIncome.toLocaleString()}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:border-2 print:border-black print:shadow-none">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest print:text-black">Expenses</div>
          <div className="text-3xl font-black mt-1 text-red-600 break-words print:text-black">₹{totalExpense.toLocaleString()}</div>
        </div>
        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 shadow-sm print:border-2 print:border-black print:bg-white print:shadow-none">
           <div className="text-xs font-bold text-orange-600 uppercase tracking-widest print:text-black">Pending</div>
           <div className="text-3xl font-black mt-1 text-orange-800 break-words print:text-black">₹{totalPending.toLocaleString()}</div>
        </div>
      </div>

      {/* --- SITE BREAKDOWN --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 print:hidden">
         
         {/* ADD ENTRY FORM (PROTECTED) */}
         {isAdmin ? (
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 uppercase mb-4 text-sm flex items-center gap-2"><span className="bg-orange-100 text-orange-600 p-1 rounded"><Plus size={16}/></span> New Job Entry</h3>
                <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-7 gap-3">
                <div className="md:col-span-1"><label className="text-[10px] font-bold uppercase text-slate-400">Date</label><input type="date" required className="w-full border p-2 rounded-lg font-bold bg-slate-50 focus:bg-white outline-none" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                {activeTab === 'All' && <div className="md:col-span-1"><label className="text-[10px] font-bold uppercase text-slate-400">Machine</label><select className="w-full border p-2 rounded-lg font-bold bg-slate-50 outline-none" value={form.machine} onChange={e => setForm({...form, machine: e.target.value})}>{vehicles.map(v => <option key={v}>{v}</option>)}</select></div>}
                <div className="md:col-span-2"><label className="text-[10px] font-bold uppercase text-slate-400">Client Name</label><input placeholder="e.g. Patil Wada" className="w-full border p-2 rounded-lg font-bold bg-slate-50 focus:bg-white outline-none" value={form.client} onChange={e => setForm({...form, client: e.target.value})} /></div>
                <div className="md:col-span-1"><label className="text-[10px] font-bold uppercase text-slate-400">Time</label><input placeholder="9-6pm" className="w-full border p-2 rounded-lg font-bold bg-slate-50 focus:bg-white outline-none" value={form.time} onChange={e => setForm({...form, time: e.target.value})} /></div>
                <div className="md:col-span-1"><label className="text-[10px] font-bold uppercase text-slate-400">Work</label><input type="number" placeholder="Hrs" className="w-full border p-2 rounded-lg font-bold bg-slate-50 focus:bg-white outline-none" value={form.hours} onChange={e => setForm({...form, hours: e.target.value})} /></div>
                <div className="md:col-span-1"><label className="text-[10px] font-bold uppercase text-slate-400">Amount</label><input type="number" placeholder="₹" required className="w-full border p-2 rounded-lg font-bold bg-slate-50 focus:bg-white text-orange-600 outline-none" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
                <button className="md:col-span-7 bg-slate-800 hover:bg-black text-white p-3 rounded-lg font-bold shadow-lg mt-2 flex justify-center items-center gap-2"><Plus size={18}/> Add To Logbook</button>
                </form>
            </div>
         ) : (
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center bg-slate-50 text-slate-400 italic text-sm">
                View Only Mode. Login as Admin to Add Entries.
            </div>
         )}

         <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <h3 className="font-bold text-slate-700 uppercase mb-4 text-sm flex items-center gap-2"><PieChart size={16}/> Top Sites / Clients</h3>
             <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                 {siteStats.map(([site, amt], i) => (
                     <div key={site} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                         <div className="flex items-center gap-2">
                             <span className="font-bold text-slate-400 w-4">{i+1}.</span>
                             <span className="font-bold text-slate-700 truncate w-32">{site}</span>
                         </div>
                         <div className="font-black text-emerald-600">₹{amt.toLocaleString()}</div>
                     </div>
                 ))}
                 {siteStats.length === 0 && <div className="text-slate-400 text-center text-xs italic">No data yet</div>}
             </div>
         </div>
      </div>

      {/* --- TABLE --- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6 print:border-2 print:border-black print:rounded-none">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider print:bg-white print:text-black print:border-b-2 print:border-black">
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
              <tr key={item.id} onClick={()=>setSelectedRowId(selectedRowId===item.id?null:item.id)} className={`group hover:bg-slate-50 print:hover:bg-transparent cursor-pointer transition-colors ${selectedRowId===item.id ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : ''}`}>
                <td className="p-3 pl-4 font-bold text-slate-700 whitespace-nowrap">{item.date}</td>
                {activeTab === 'All' && <td className="p-3"><span className="bg-slate-100 border px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 print:border-black">{item.machine}</span></td>}
                <td className="p-3 font-bold text-slate-800">{item.client}</td>
                <td className="p-3 text-xs text-slate-500 font-medium print:text-black">{item.time}</td>
                <td className="p-3 text-center font-bold text-slate-600">{item.hours}</td>
                <td className="p-3 text-right font-black text-slate-800">₹{Number(item.amount).toLocaleString()}</td>
                <td className="p-3 text-center print:hidden">
                    <button 
                        disabled={!isAdmin} // Locked
                        onClick={(e) => {e.stopPropagation(); togglePaymentStatus(item.id, item.isPaid)}} 
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${item.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'} ${!isAdmin ? 'cursor-not-allowed opacity-80' : ''}`}
                    >
                        {item.isPaid ? 'Paid' : 'Pending'}
                    </button>
                </td>
                <td className="p-3 text-center print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAdmin && <button onClick={(e) => {e.stopPropagation(); deleteEntry(item.id)}} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- HEALTH & COST CARDS --- */}
      <div className="print:break-inside-avoid pt-6">
        <h3 className="font-bold uppercase tracking-widest text-slate-700 text-sm mb-4 print:text-black print:mb-2 flex items-center gap-2"><Wrench size={18} /> Vehicle Health & Costs</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {vehicles.filter(v => activeTab === 'All' || activeTab === v).map(vehicle => {
            const service = getServiceStatus(vehicle);
            const data = fleetData[vehicle] || {};
            const totalAdv = getAdvancesTotal(vehicle);
            const fuelLitres = Number(data.fuelLitres || 0);
            
            return (
              <div key={vehicle} className={`bg-white rounded-2xl border-2 ${service.due ? 'border-red-400' : 'border-slate-200'} shadow-sm overflow-hidden print:border-black print:shadow-none print:break-inside-avoid relative`}>
                
                {/* Service Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
                    <div className={`h-full ${service.percent > 90 ? 'bg-red-500' : (service.percent > 70 ? 'bg-yellow-500' : 'bg-emerald-500')}`} style={{width: `${service.percent}%`}}></div>
                </div>

                <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center print:bg-white print:border-black mt-1">
                  <div>
                      <h4 className="font-black text-xl uppercase text-slate-800">{vehicle}</h4>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Service In: <span className="text-slate-800">{Math.max(0, serviceInterval - service.hoursRun)} hrs</span></span>
                          {service.due && isAdmin && <button onClick={() => resetService(vehicle)} className="text-[10px] underline font-bold text-blue-600 print:hidden">Reset</button>}
                      </div>
                  </div>
                  <div className="text-right"><div className="text-[10px] font-bold text-slate-400 uppercase">Monthly Exp</div><div className="text-lg font-black text-red-600 print:text-black">₹{getVehicleExpense(vehicle).toLocaleString()}</div></div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div className="col-span-1 space-y-3 border-r border-slate-100 pr-4 print:border-none">
                     <div><label className="text-[10px] font-bold uppercase text-slate-400">Driver</label><input disabled={!isAdmin} type="text" placeholder="Name" className="w-full font-bold text-sm border-b border-slate-200 outline-none pb-1 bg-transparent" value={data.driver || ''} onChange={e => updateVehicleData(vehicle, 'driver', e.target.value)} /></div>
                     <div><label className="text-[10px] font-bold uppercase text-slate-400">Salary</label><div className="flex items-center"><span className="text-xs font-bold text-slate-400 mr-1">₹</span><input disabled={!isAdmin} type="number" placeholder="0" className="w-full font-bold text-sm border-b border-slate-200 outline-none pb-1 bg-transparent" value={data.salary || ''} onChange={e => updateVehicleData(vehicle, 'salary', e.target.value)} /></div></div>
                     <div>
                       <label className="text-[10px] font-bold uppercase text-orange-500 flex justify-between">Advance Given <button onClick={()=>setAdvanceModalVehicle(vehicle)} className="text-[10px] underline text-blue-600 print:hidden">Manage</button></label>
                       <div className="flex items-center"><span className="text-xs font-bold text-orange-500 mr-1">₹</span><span className="w-full font-bold text-sm border-b border-orange-200 text-orange-600 pb-1">{totalAdv.toLocaleString()}</span></div>
                       <div className="hidden print:block text-[9px] mt-1 text-gray-500">{(data.advanceHistory || []).map(a => <div key={a.id}>{a.date}: ₹{a.amount} ({a.reason})</div>)}</div>
                     </div>
                  </div>
                  <div className="col-span-1 space-y-3 pl-2">
                     <div>
                         <label className="text-[10px] font-bold uppercase text-slate-400">Fuel Cost</label>
                         <div className="flex gap-2">
                             <div className="flex items-center w-2/3"><span className="text-xs font-bold text-slate-400 mr-1">₹</span><input disabled={!isAdmin} type="number" placeholder="Cost" className="w-full font-bold text-sm border-b border-slate-200 outline-none pb-1 bg-transparent text-red-600" value={data.fuelCost || ''} onChange={e => updateVehicleData(vehicle, 'fuelCost', e.target.value)} /></div>
                             <div className="flex items-center w-1/3"><input disabled={!isAdmin} type="number" placeholder="Ltr" className="w-full font-bold text-xs border-b border-slate-200 outline-none pb-1 bg-transparent text-slate-500 text-center" value={data.fuelLitres || ''} onChange={e => updateVehicleData(vehicle, 'fuelLitres', e.target.value)} title="Litres Filled" /></div>
                         </div>
                     </div>
                     <div><label className="text-[10px] font-bold uppercase text-slate-400">Service</label><div className="flex items-center"><span className="text-xs font-bold text-slate-400 mr-1">₹</span><input disabled={!isAdmin} type="number" placeholder="0" className="w-full font-bold text-sm border-b border-slate-200 outline-none pb-1 bg-transparent text-yellow-600" value={data.service || ''} onChange={e => updateVehicleData(vehicle, 'service', e.target.value)} /></div></div>
                     <div className="pt-2"><div className="text-[10px] font-bold text-slate-400 uppercase">Payable Salary</div><div className="text-lg font-black text-slate-800">₹{((Number(data.salary)||0) - totalAdv).toLocaleString()}</div></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}