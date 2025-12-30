import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Check, X, Clock, Plus, Trash2, 
  DollarSign, Printer, Search, ChevronRight, ChevronLeft, UserPlus,
  Gift, AlertCircle, Phone, FileText, MessageCircle, Droplet, Lock,
  CalendarDays, Download, BarChart3, Sun
} from 'lucide-react';
// FIREBASE IMPORTS
import { db } from './firebase-config';
import { ref, onValue, push, remove, update } from 'firebase/database';

export default function LaborManager({ isAdmin }) { 
  
  // ==========================================
  // 1. DATABASE & STATE
  // ==========================================
  
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [advances, setAdvances] = useState({});
  const [bonuses, setBonuses] = useState({});

  const [selectedWorker, setSelectedWorker] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance'); 
  
  // DATE STATES
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
  const [viewMonth, setViewMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const [newWorker, setNewWorker] = useState({ name: '', role: '', rate: '', phone: '' });
  const [moneyForm, setMoneyForm] = useState({ 
    amount: '', 
    reason: '', 
    type: 'ADVANCE',
    date: new Date().toISOString().split('T')[0]
  }); 
  const [inkSaver, setInkSaver] = useState(true);

  // ==========================================
  // 2. LIVE CLOUD CONNECTION
  // ==========================================
  
  useEffect(() => {
    onValue(ref(db, 'workers'), (snapshot) => {
      const data = snapshot.val();
      const loaded = data ? Object.keys(data).map(key => ({ firebaseId: key, ...data[key] })) : [];
      setWorkers(loaded);
    });

    onValue(ref(db, 'attendance'), (snapshot) => {
      setAttendance(snapshot.val() || {});
    });

    onValue(ref(db, 'labor_advances'), (snapshot) => {
      setAdvances(snapshot.val() || {});
    });
    
    onValue(ref(db, 'labor_bonuses'), (snapshot) => {
      setBonuses(snapshot.val() || {});
    });
  }, []);

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

  const markAttendance = (workerId, status) => {
    if (!isAdmin) return;
    update(ref(db, `attendance/${selectedDate}`), { [workerId]: status });
  };

  const markAllPresent = () => {
    if (!isAdmin) return;
    if (!confirm("Mark ALL workers as PRESENT for today?")) return;
    const updates = {};
    workers.forEach(w => {
      updates[w.id] = 'P';
    });
    update(ref(db, `attendance/${selectedDate}`), updates);
  };

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const addWorker = (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!newWorker.name || !newWorker.rate) return;
    
    const cleanName = newWorker.name.replace(/\b\w/g, l => l.toUpperCase());
    const cleanRole = newWorker.role.replace(/\b\w/g, l => l.toUpperCase()) || 'Helper';
    
    const workerData = { 
      ...newWorker, 
      id: Date.now(),
      name: cleanName, 
      role: cleanRole 
    };

    push(ref(db, 'workers'), workerData);
    setNewWorker({ name: '', role: '', rate: '', phone: '' });
  };

  const removeWorker = (firebaseId, id) => {
    if (!isAdmin) return;
    if (confirm("Remove this worker permanently?")) {
      remove(ref(db, `workers/${firebaseId}`));
      if (selectedWorker?.id === id) setSelectedWorker(null);
    }
  };

  const addMoneyEntry = (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!selectedWorker || !moneyForm.amount) return;
    
    const newEntry = { 
      id: Date.now(), 
      date: moneyForm.date, 
      amount: Number(moneyForm.amount), 
      reason: moneyForm.reason 
    };

    if (moneyForm.type === 'ADVANCE') {
      push(ref(db, `labor_advances/${selectedWorker.id}`), newEntry);
    } else {
      push(ref(db, `labor_bonuses/${selectedWorker.id}`), newEntry);
    }
    setMoneyForm(prev => ({ ...prev, amount: '', reason: '' }));
  };

  const deleteMoneyEntry = (workerId, firebaseKey, type) => {
    if (!isAdmin) return;
    if(!confirm("Delete this entry?")) return;
    
    if (type === 'ADVANCE') {
      remove(ref(db, `labor_advances/${workerId}/${firebaseKey}`));
    } else {
      remove(ref(db, `labor_bonuses/${workerId}/${firebaseKey}`));
    }
  };

  // --- CSV EXPORT ---
  const downloadCSV = () => {
    if (!selectedWorker) return;
    const stats = getWorkerStats(selectedWorker.id);
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `BALDIGAMBAR ENTERPRISES - PAYROLL REPORT\n`;
    csvContent += `Worker,${selectedWorker.name}\n`;
    csvContent += `Month,${viewMonth}\n\n`;
    
    csvContent += "DATE,STATUS,DAY\n";
    stats.monthLog.forEach(log => {
        csvContent += `${log.dateStr},${log.status},${log.dayName}\n`;
    });

    csvContent += `\nSUMMARY\n`;
    csvContent += `Days Present,${stats.present}\n`;
    csvContent += `Half Days,${stats.half}\n`;
    csvContent += `Total Earned,${stats.earned}\n`;
    csvContent += `Total Bonus,${stats.totalBonus}\n`;
    csvContent += `Total Advance,${stats.totalAdvance}\n`;
    csvContent += `NET PAYABLE,${stats.payable}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedWorker.name}_${viewMonth}_Report.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // --- STATS LOGIC ---
  const getWorkerStats = (id) => {
    let present = 0, half = 0, absent = 0;
    
    // Filter Attendance
    Object.keys(attendance).forEach(date => {
      if (date.startsWith(viewMonth)) { 
        const dayStatus = attendance[date][id];
        if (dayStatus === 'P') present++;
        if (dayStatus === 'HD') half++;
        if (dayStatus === 'A') absent++;
      }
    });
    
    const worker = workers.find(w => w.id === id);
    if (!worker) return { present:0, half:0, absent:0, earned:0, totalAdvance:0, totalBonus:0, payable:0, monthLog: [], monthlyAdvances:[], monthlyBonuses:[] };

    const rate = Number(worker.rate);
    const earned = (present * rate) + (half * (rate / 2));
    
    // Filter Advances/Bonuses
    const allAdvances = advances[id] ? Object.values(advances[id]) : [];
    const monthlyAdvances = allAdvances.filter(a => a.date.startsWith(viewMonth));
    const totalAdvance = monthlyAdvances.reduce((sum, a) => sum + Number(a.amount), 0);

    const allBonuses = bonuses[id] ? Object.values(bonuses[id]) : [];
    const monthlyBonuses = allBonuses.filter(b => b.date.startsWith(viewMonth));
    const totalBonus = monthlyBonuses.reduce((sum, b) => sum + Number(b.amount), 0);
    
    const payable = earned + totalBonus - totalAdvance;

    // Grid Generation
    const daysInMonth = new Date(viewMonth.split('-')[0], viewMonth.split('-')[1], 0).getDate();
    const monthLog = [];
    
    for(let i=1; i<=daysInMonth; i++) {
        const dayStr = `${viewMonth}-${String(i).padStart(2, '0')}`;
        const dateObj = new Date(dayStr);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }); 
        const isSunday = dateObj.getDay() === 0;
        
        const status = (attendance[dayStr] || {})[id] || '-';
        monthLog.push({ day: i, dateStr: dayStr, dayName, isSunday, status });
    }

    return { present, half, absent, earned, totalAdvance, totalBonus, payable, monthLog, monthlyAdvances, monthlyBonuses };
  };

  const dailyCost = workers.reduce((sum, w) => {
    const status = (attendance[selectedDate] || {})[w.id];
    if (status === 'P') return sum + Number(w.rate);
    if (status === 'HD') return sum + (Number(w.rate) / 2);
    return sum;
  }, 0);

  const formatMonth = (ym) => {
    if(!ym) return "";
    const [y, m] = ym.split('-');
    const date = new Date(y, m - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // ==========================================
  // 4. UI RENDER
  // ==========================================
  return (
    <div className={`space-y-6 pb-20 font-sans text-slate-800 animate-fade-in ${inkSaver ? 'print-ink-saver' : ''}`}>
      
      {/* PRINT STYLES */}
      <style>{`
        @media print {
          aside, nav, header, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .print-area { display: block !important; padding: 0 !important; width: 100%; }
          .print-ink-saver * { color: black !important; background: transparent !important; border-color: black !important; box-shadow: none !important; }
          .print-ink-saver .bg-black { background: white !important; border: 1px solid black !important; color: black !important; }
          .print-ink-saver .text-white { color: black !important; }
          .print-ink-saver .bg-slate-900 { background: white !important; border: 2px solid black !important; }
          .muster-grid { display: grid; grid-template-columns: repeat(16, 1fr); border: 2px solid black; }
          .muster-cell { border: 1px solid black; padding: 2px; text-align: center; font-size: 10px; }
          .sunday-cell { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; } 
        }
      `}</style>

      {/* DASHBOARD HEADER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Users size={20}/></div>
            <div><p className="text-[10px] text-gray-400 font-bold uppercase">Total Staff</p><p className="font-black text-xl">{workers.length}</p></div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg text-green-600"><Check size={20}/></div>
            <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Present Today</p>
                <p className="font-black text-xl">{workers.filter(w => (attendance[selectedDate] || {})[w.id] === 'P').length}</p>
            </div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><DollarSign size={20}/></div>
            <div><p className="text-[10px] text-gray-400 font-bold uppercase">Today's Cost</p><p className="font-black text-xl">₹{dailyCost}</p></div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
             <button onClick={() => setInkSaver(!inkSaver)} className={`w-full h-full flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all border ${inkSaver ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-slate-500 border-gray-200'}`}>
                <Droplet size={16} /> {inkSaver ? 'Ink Saver ON' : 'Ink Saver OFF'}
            </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm w-full md:w-auto">
          <button onClick={() => setActiveTab('attendance')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'attendance' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Daily Muster</button>
          <button onClick={() => setActiveTab('payroll')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'payroll' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Monthly Payroll</button>
          <button onClick={() => setActiveTab('workers')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'workers' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Workers</button>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {activeTab === 'attendance' && (
            <div className="flex items-center gap-2 bg-white p-1 pr-1 rounded-xl border border-gray-200 shadow-sm">
              <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={20}/></button>
              <input type="date" className="border-none bg-transparent font-bold text-slate-700 outline-none p-2 text-sm" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={20}/></button>
            </div>
          )}
          {activeTab === 'payroll' && (
            <div className="flex items-center bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors">
                    <ChevronLeft size={20} />
                </button>
                
                <div className="relative px-4 py-1 text-center min-w-[140px] group">
                    <div className="flex flex-col items-center cursor-pointer">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Payroll Month</span>
                        <span className="text-sm font-bold text-slate-700 uppercase tracking-wider group-hover:text-orange-600 transition-colors">{formatMonth(viewMonth)}</span>
                    </div>
                    {/* Hidden input overlay */}
                    <input type="month" value={viewMonth} onChange={(e) => setViewMonth(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
                </div>

                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors">
                    <ChevronRight size={20} />
                </button>
            </div>
          )}
        </div>
      </div>

      {/* --- TAB 1: DAILY ATTENDANCE --- */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 uppercase text-sm">Attendance List</h3>
            <div className="flex gap-2">
                {isAdmin && <button onClick={markAllPresent} className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors">Mark All Present</button>}
                <button onClick={() => window.print()} className="text-xs font-bold bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-300 flex items-center gap-1"><Printer size={14}/> Print</button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {workers.map(w => {
              const status = (attendance[selectedDate] || {})[w.id];
              return (
                <div key={w.id} className="p-4 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50 gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg">{w.name.charAt(0)}</div>
                    <div>
                      <div className="font-bold text-slate-800 text-lg">{w.name}</div>
                      <div className="text-xs font-bold text-slate-400 uppercase">{w.role} • ₹{w.rate}/day</div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto justify-end">
                    {isAdmin ? (
                        <>
                            <button onClick={() => markAttendance(w.id, 'P')} className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg border-2 transition-all ${status === 'P' ? 'bg-green-600 border-green-600 text-white shadow-lg scale-105' : 'border-slate-200 text-slate-300 hover:border-green-400 hover:text-green-400'}`}>P</button>
                            <button onClick={() => markAttendance(w.id, 'HD')} className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg border-2 transition-all ${status === 'HD' ? 'bg-yellow-500 border-yellow-500 text-white shadow-lg scale-105' : 'border-slate-200 text-slate-300 hover:border-yellow-400 hover:text-yellow-400'}`}>H</button>
                            <button onClick={() => markAttendance(w.id, 'A')} className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg border-2 transition-all ${status === 'A' ? 'bg-red-500 border-red-500 text-white shadow-lg scale-105' : 'border-slate-200 text-slate-300 hover:border-red-400 hover:text-red-400'}`}>A</button>
                        </>
                    ) : (
                        <span className={`px-4 py-2 rounded-lg font-bold text-sm ${status === 'P' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>{status || 'PENDING'}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* --- TAB 2: MONTHLY PAYROLL --- */}
      {activeTab === 'payroll' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-1 h-fit">
            <div className="p-4 border-b border-gray-200 font-bold text-slate-700 bg-slate-50 flex justify-between">
                <span>Select Worker</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded uppercase font-bold">{formatMonth(viewMonth)}</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {workers.map(w => {
                const stats = getWorkerStats(w.id);
                return (
                  <div key={w.id} onClick={() => setSelectedWorker(w)} className={`p-4 cursor-pointer hover:bg-orange-50 transition-colors ${selectedWorker?.id === w.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''}`}>
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-slate-800">{w.name}</div>
                      <div className={`text-xs font-black px-2 py-1 rounded ${stats.payable < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {stats.payable < 0 ? `Due ₹${Math.abs(stats.payable)}` : `Pay ₹${stats.payable}`}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2 text-[10px] uppercase font-bold text-slate-400">
                      <span>Days: {stats.present}</span>
                      <span className="text-red-400">Adv: -₹{stats.totalAdvance}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {selectedWorker ? (
              <>
                {/* SALARY CARD */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <h2 className="text-3xl font-black">{selectedWorker.name}</h2>
                      <p className="text-slate-400 font-bold text-sm uppercase">{selectedWorker.role} • {formatMonth(viewMonth)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase">Net Payable</p>
                      <p className={`text-5xl font-black ${getWorkerStats(selectedWorker.id).payable < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        ₹{getWorkerStats(selectedWorker.id).payable.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 relative z-10">
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Month Earnings</div>
                      <div className="text-2xl font-bold">₹{getWorkerStats(selectedWorker.id).earned.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Advance Taken</div>
                      <div className="text-2xl font-bold text-red-400">-₹{getWorkerStats(selectedWorker.id).totalAdvance.toLocaleString()}</div>
                    </div>
                    
                    <div className="col-span-2 md:col-span-1 flex gap-2">
                        <button onClick={downloadCSV} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-xl flex flex-col items-center justify-center transition-colors">
                            <Download size={18}/>
                            <span className="text-[9px] uppercase mt-1">CSV</span>
                        </button>
                        <button onClick={() => window.print()} className="flex-1 bg-white hover:bg-gray-100 text-slate-900 p-2 rounded-xl flex flex-col items-center justify-center transition-colors">
                            <Printer size={18}/>
                            <span className="text-[9px] uppercase mt-1 font-bold">Print Slip</span>
                        </button>
                    </div>
                  </div>
                </div>

                {/* ADD MONEY FORM */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex gap-4 mb-4">
                    <button onClick={() => setMoneyForm({...moneyForm, type: 'ADVANCE'})} className={`flex-1 py-2 rounded-lg font-bold text-sm ${moneyForm.type === 'ADVANCE' ? 'bg-red-50 text-red-600 border border-red-200' : 'text-slate-400 bg-slate-50'}`}>Give Advance (-)</button>
                    <button onClick={() => setMoneyForm({...moneyForm, type: 'BONUS'})} className={`flex-1 py-2 rounded-lg font-bold text-sm ${moneyForm.type === 'BONUS' ? 'bg-green-50 text-green-600 border border-green-200' : 'text-slate-400 bg-slate-50'}`}>Give Bonus (+)</button>
                  </div>
                  
                  {isAdmin ? (
                    <form onSubmit={addMoneyEntry} className="flex flex-col md:flex-row gap-3 items-center">
                        <input type="date" required className="w-full md:w-auto border-2 border-gray-100 p-3 rounded-xl font-bold text-slate-600 outline-none" value={moneyForm.date} onChange={e => setMoneyForm({...moneyForm, date: e.target.value})} />
                        <input type="number" required placeholder="Amount" className="w-full md:w-32 border-2 border-gray-100 p-3 rounded-xl font-bold focus:border-orange-500 outline-none text-lg" value={moneyForm.amount} onChange={e => setMoneyForm({...moneyForm, amount: e.target.value})} />
                        <input type="text" placeholder="Reason (Optional)" className="w-full border-2 border-gray-100 p-3 rounded-xl font-bold flex-1 focus:border-orange-500 outline-none" value={moneyForm.reason} onChange={e => setMoneyForm({...moneyForm, reason: e.target.value})} />
                        <button className={`w-full md:w-auto text-white px-6 py-3 rounded-xl font-bold shadow-md ${moneyForm.type === 'ADVANCE' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>Save</button>
                    </form>
                  ) : (
                    <div className="p-3 bg-slate-50 text-center rounded-xl border border-slate-200 font-bold text-slate-400 text-sm">
                        <Lock size={16} className="inline mr-2"/> Login as Admin
                    </div>
                  )}
                </div>

                {/* TRANSACTION HISTORY */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-gray-200 font-bold text-slate-700 text-sm flex justify-between">
                    <span>Transaction History</span>
                    <span className="text-gray-400">{formatMonth(viewMonth)}</span>
                  </div>
                  <table className="w-full text-sm text-left">
                    <tbody className="divide-y divide-gray-100">
                      <tr className="bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-600">Base Pay</td>
                        <td className="p-4 text-xs text-slate-400 font-bold uppercase">{getWorkerStats(selectedWorker.id).present} Days Worked</td>
                        <td className="p-4 text-right font-black text-slate-700">+ ₹{getWorkerStats(selectedWorker.id).earned}</td>
                        <td className="p-4 w-10"></td>
                      </tr>
                      {getWorkerStats(selectedWorker.id).monthlyBonuses.map((b, idx) => (
                         <tr key={idx} className="hover:bg-green-50">
                           <td className="p-4 font-bold text-green-700">{b.date}</td>
                           <td className="p-4"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold uppercase">Bonus</span> <span className="text-gray-500 font-medium ml-2">{b.reason}</span></td>
                           <td className="p-4 text-right font-black text-green-600">+ ₹{b.amount}</td>
                           <td className="p-4 text-center">{isAdmin && <button onClick={() => deleteMoneyEntry(selectedWorker.id, b.firebaseId || idx, 'BONUS')}><Trash2 size={16} className="text-slate-300 hover:text-red-500"/></button>}</td>
                         </tr>
                      ))}
                      {getWorkerStats(selectedWorker.id).monthlyAdvances.map((a, idx) => (
                         <tr key={idx} className="hover:bg-red-50">
                           <td className="p-4 font-bold text-red-700">{a.date}</td>
                           <td className="p-4"><span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold uppercase">Advance</span> <span className="text-gray-500 font-medium ml-2">{a.reason}</span></td>
                           <td className="p-4 text-right font-black text-red-600">- ₹{a.amount}</td>
                           <td className="p-4 text-center">{isAdmin && <button onClick={() => deleteMoneyEntry(selectedWorker.id, a.firebaseId || idx, 'ADVANCE')}><Trash2 size={16} className="text-slate-300 hover:text-red-500"/></button>}</td>
                         </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Users size={48} className="mb-4 opacity-20"/>
                Select a worker to manage payroll
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: MANAGE WORKERS --- */}
      {activeTab === 'workers' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm max-w-2xl mx-auto animate-fade-in">
          <h3 className="font-bold text-slate-700 uppercase mb-4 flex items-center gap-2"><UserPlus size={18}/> Add New Worker</h3>
          
          {isAdmin ? (
            <form onSubmit={addWorker} className="grid grid-cols-2 gap-4 mb-8">
                <div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Full Name</label><input className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold focus:border-orange-500 outline-none" value={newWorker.name} onChange={e => setNewWorker({...newWorker, name: e.target.value})} placeholder="e.g. Rahul Patil"/></div>
                <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Role</label>
                <input list="roleList" className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold bg-white focus:border-orange-500 outline-none" value={newWorker.role} onChange={e => setNewWorker({...newWorker, role: e.target.value})} placeholder="Type or Select..." />
                <datalist id="roleList"><option value="Driver"/><option value="Helper"/><option value="Mistri"/><option value="Supervisor"/><option value="Security"/><option value="Operator"/></datalist>
                </div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Daily Rate (₹)</label><input type="number" className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold focus:border-orange-500 outline-none" value={newWorker.rate} onChange={e => setNewWorker({...newWorker, rate: e.target.value})} /></div>
                <div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Mobile</label><input className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold focus:border-orange-500 outline-none" value={newWorker.phone} onChange={e => setNewWorker({...newWorker, phone: e.target.value})} placeholder="Optional for WhatsApp"/></div>
                <button className="col-span-2 bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-black">Save Worker</button>
            </form>
          ) : (
            <div className="mb-8 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 font-bold text-sm">
                Login as Admin to add new workers.
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-bold text-gray-400 text-xs uppercase mb-2">Current Staff</h4>
            {workers.map(w => (
              <div key={w.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-slate-50">
                <div><div className="font-bold text-slate-800">{w.name}</div><div className="text-xs text-slate-500 font-bold uppercase">{w.role} • ₹{w.rate}/day</div></div>
                <div className="flex gap-2">
                  {w.phone && <a href={`https://wa.me/${w.phone}`} target="_blank" className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><MessageCircle size={18}/></a>}
                  {isAdmin && <button onClick={() => removeWorker(w.firebaseId, w.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PRINT SLIP --- */}
      <div className="hidden print:block p-8 bg-white text-black print-area">
        {selectedWorker && (
          <div className="border-2 border-black p-8 max-w-3xl mx-auto mt-4 text-center">
            {/* Header */}
            <div className="border-b-4 border-black pb-4 mb-6">
                <h1 className="font-black text-3xl uppercase tracking-tighter">BALDIGAMBAR ENTERPRISES</h1>
                <p className="text-sm font-bold uppercase tracking-widest mt-1">Salary Payment Voucher</p>
            </div>
            
            {/* Worker Info & Totals */}
            <div className="grid grid-cols-2 gap-8 text-left mb-6">
                <div>
                    <div className="mb-4"><span className="text-[10px] uppercase font-bold block text-gray-500">Employee Name</span><span className="font-black text-xl block border-b border-black">{selectedWorker.name}</span></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-[10px] uppercase font-bold block text-gray-500">Designation</span><span className="font-bold block">{selectedWorker.role}</span></div>
                        <div><span className="text-[10px] uppercase font-bold block text-gray-500">Month</span><span className="font-bold block">{formatMonth(viewMonth)}</span></div>
                    </div>
                </div>
                <div className="border-l-2 border-black pl-8 flex flex-col justify-center">
                    <div className="flex justify-between mb-2"><span className="font-bold">Total Earnings</span><span className="font-bold">₹{getWorkerStats(selectedWorker.id).earned}</span></div>
                    <div className="flex justify-between mb-2"><span className="font-bold">Incentives</span><span className="font-bold">+ ₹{getWorkerStats(selectedWorker.id).totalBonus}</span></div>
                    <div className="flex justify-between mb-2"><span className="font-bold">Less: Advance</span><span className="font-bold">- ₹{getWorkerStats(selectedWorker.id).totalAdvance}</span></div>
                    <div className="flex justify-between text-xl font-black border-t-2 border-black pt-2 mt-2"><span>NET PAYABLE</span><span>₹{getWorkerStats(selectedWorker.id).payable.toLocaleString()}</span></div>
                </div>
            </div>

            {/* MUSTER GRID */}
            <div className="mt-8 text-left">
                <p className="text-[10px] font-bold uppercase mb-2">Attendance Register (Muster Roll)</p>
                {/* 1st to 16th */}
                <div className="muster-grid mb-2">
                    {getWorkerStats(selectedWorker.id).monthLog.slice(0, 16).map((log) => (
                        <div key={log.day} className={`muster-cell ${log.isSunday ? 'sunday-cell' : ''}`}>
                            <div className="font-bold border-b border-black bg-gray-100">{log.day}</div>
                            <div className="text-[8px] uppercase">{log.dayName.charAt(0)}</div>
                            <div className="font-black text-sm">{log.status === '-' ? '' : log.status}</div>
                        </div>
                    ))}
                </div>
                {/* 17th to End */}
                <div className="muster-grid">
                    {getWorkerStats(selectedWorker.id).monthLog.slice(16).map((log) => (
                        <div key={log.day} className={`muster-cell ${log.isSunday ? 'sunday-cell' : ''}`}>
                            <div className="font-bold border-b border-black bg-gray-100">{log.day}</div>
                            <div className="text-[8px] uppercase">{log.dayName.charAt(0)}</div>
                            <div className="font-black text-sm">{log.status === '-' ? '' : log.status}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Signatures */}
            <div className="mt-16 pt-8 border-t border-black flex justify-between text-xs font-bold uppercase">
                <div className="text-center w-32 border-t border-dotted border-black pt-2">Employee Signature</div>
                <div className="text-center w-32 border-t border-dotted border-black pt-2">Authorized Signatory</div>
            </div>
            <div className="text-[8px] text-center mt-4 text-gray-400">Generated by Baldigambar Tech • {new Date().toLocaleString()}</div>
          </div>
        )}
      </div>

    </div>
  );
}