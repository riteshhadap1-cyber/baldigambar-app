import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Check, X, Clock, Plus, Trash2, 
  DollarSign, Printer, Search, ChevronRight, ChevronLeft, UserPlus,
  Gift, AlertCircle, Phone, FileText, MessageCircle, Droplet 
} from 'lucide-react';

export default function LaborManager() {
  
  // ==========================================
  // 1. THE DATABASE
  // ==========================================
  
  const [workers, setWorkers] = useState(() => {
    const saved = localStorage.getItem('baldigambar_workers');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Raju Driver', role: 'Driver', rate: 500, phone: '9922...' },
      { id: 2, name: 'Sham Helper', role: 'Helper', rate: 350, phone: '' }
    ];
  });

  const [attendance, setAttendance] = useState(() => {
    const saved = localStorage.getItem('baldigambar_attendance');
    return saved ? JSON.parse(saved) : {};
  });

  const [advances, setAdvances] = useState(() => {
    const saved = localStorage.getItem('baldigambar_labor_advances');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [bonuses, setBonuses] = useState(() => {
    const saved = localStorage.getItem('baldigambar_labor_bonuses');
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedWorker, setSelectedWorker] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance'); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newWorker, setNewWorker] = useState({ name: '', role: '', rate: '', phone: '' });
  const [moneyForm, setMoneyForm] = useState({ amount: '', reason: '', type: 'ADVANCE' }); 
  const [inkSaver, setInkSaver] = useState(true); // Default Ink Saver ON

  // ==========================================
  // 2. AUTO-SAVE
  // ==========================================
  
  useEffect(() => { localStorage.setItem('baldigambar_workers', JSON.stringify(workers)); }, [workers]);
  useEffect(() => { localStorage.setItem('baldigambar_attendance', JSON.stringify(attendance)); }, [attendance]);
  useEffect(() => { localStorage.setItem('baldigambar_labor_advances', JSON.stringify(advances)); }, [advances]);
  useEffect(() => { localStorage.setItem('baldigambar_labor_bonuses', JSON.stringify(bonuses)); }, [bonuses]);

  // ==========================================
  // 3. LOGIC
  // ==========================================

  const markAttendance = (workerId, status) => {
    setAttendance(prev => ({
      ...prev,
      [selectedDate]: { ...(prev[selectedDate] || {}), [workerId]: status }
    }));
  };

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const addWorker = (e) => {
    e.preventDefault();
    if (!newWorker.name || !newWorker.rate) return;
    const cleanName = newWorker.name.replace(/\b\w/g, l => l.toUpperCase());
    const cleanRole = newWorker.role.replace(/\b\w/g, l => l.toUpperCase()) || 'Helper';
    setWorkers([...workers, { ...newWorker, name: cleanName, role: cleanRole, id: Date.now() }]);
    setNewWorker({ name: '', role: '', rate: '', phone: '' });
  };

  const removeWorker = (id) => {
    if (confirm("Remove this worker permanently?")) {
      setWorkers(workers.filter(w => w.id !== id));
      if (selectedWorker?.id === id) setSelectedWorker(null);
    }
  };

  const addMoneyEntry = (e) => {
    e.preventDefault();
    if (!selectedWorker || !moneyForm.amount) return;
    const newEntry = { id: Date.now(), date: new Date().toISOString().split('T')[0], amount: Number(moneyForm.amount), reason: moneyForm.reason };
    if (moneyForm.type === 'ADVANCE') {
      setAdvances(prev => ({ ...prev, [selectedWorker.id]: [newEntry, ...(prev[selectedWorker.id] || [])] }));
    } else {
      setBonuses(prev => ({ ...prev, [selectedWorker.id]: [newEntry, ...(prev[selectedWorker.id] || [])] }));
    }
    setMoneyForm({ amount: '', reason: '', type: 'ADVANCE' });
  };

  const deleteMoneyEntry = (workerId, entryId, type) => {
    if(!confirm("Delete this entry?")) return;
    if (type === 'ADVANCE') {
      setAdvances(prev => ({ ...prev, [workerId]: (prev[workerId] || []).filter(a => a.id !== entryId) }));
    } else {
      setBonuses(prev => ({ ...prev, [workerId]: (prev[workerId] || []).filter(b => b.id !== entryId) }));
    }
  };

  const getWorkerStats = (id) => {
    let present = 0, half = 0, absent = 0;
    Object.values(attendance).forEach(day => {
      if (day[id] === 'P') present++;
      if (day[id] === 'HD') half++;
      if (day[id] === 'A') absent++;
    });
    
    const worker = workers.find(w => w.id === id);
    const earned = (present * worker.rate) + (half * (worker.rate / 2));
    const totalAdvance = (advances[id] || []).reduce((sum, a) => sum + a.amount, 0);
    const totalBonus = (bonuses[id] || []).reduce((sum, b) => sum + b.amount, 0);
    const payable = earned + totalBonus - totalAdvance;

    const historyDots = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const status = (attendance[dateStr] || {})[id];
      historyDots.push({ date: dateStr, status: status || '-' });
    }

    return { present, half, absent, earned, totalAdvance, totalBonus, payable, historyDots };
  };

  const dailyCost = workers.reduce((sum, w) => {
    const status = (attendance[selectedDate] || {})[w.id];
    if (status === 'P') return sum + Number(w.rate);
    if (status === 'HD') return sum + (Number(w.rate) / 2);
    return sum;
  }, 0);

  // ==========================================
  // 4. UI RENDER
  // ==========================================
  return (
    <div className={`space-y-6 pb-20 font-sans text-slate-800 animate-fade-in ${inkSaver ? 'print-ink-saver' : ''}`}>
      
      {/* --- STEALTH & INK SAVER CSS --- */}
      <style>{`
        @media print {
          aside, nav, header, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .print-area { display: block !important; padding: 0 !important; }
          
          /* Ink Saver Logic */
          .print-ink-saver * {
            color: black !important;
            background: transparent !important;
            border-color: black !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          .print-ink-saver .border-2 { border-width: 1px !important; }
          .print-ink-saver ::placeholder { color: transparent; }
          
          /* Table Borders for Ink Saver */
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid black; padding: 5px; text-align: left; }
        }
      `}</style>

      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'attendance' ? 'bg-orange-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Daily Muster</button>
          <button onClick={() => setActiveTab('payroll')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'payroll' ? 'bg-orange-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Payroll & Advances</button>
          <button onClick={() => setActiveTab('workers')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'workers' ? 'bg-orange-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Manage Workers</button>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === 'attendance' && (
            <div className="flex items-center gap-2 bg-white p-1 pr-1 rounded-xl border border-gray-200">
              <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={20}/></button>
              <input type="date" className="border-none bg-transparent font-bold text-slate-700 outline-none p-2 text-sm" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={20}/></button>
            </div>
          )}
          {/* INK SAVER TOGGLE */}
          <button onClick={() => setInkSaver(!inkSaver)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-gray-200 ${inkSaver ? 'bg-green-100 text-green-700' : 'bg-white text-slate-500'}`}>
             <Droplet size={16} /> {inkSaver ? 'Ink Saver ON' : 'Ink Saver OFF'}
          </button>
        </div>
      </div>

      {/* --- TAB 1: DAILY ATTENDANCE --- */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center print:bg-white print:border-black">
            <div className="flex items-center gap-2">
               <h3 className="font-bold text-slate-700 uppercase text-sm print:text-black">Muster: {new Date(selectedDate).toLocaleDateString()}</h3>
               <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase print:border print:border-black print:text-black">Today's Cost: ₹{dailyCost.toLocaleString()}</span>
            </div>
            <button onClick={() => window.print()} className="text-xs font-bold flex items-center gap-1 text-slate-500 hover:text-black no-print"><Printer size={14}/> Print Muster</button>
          </div>
          
          <div className="divide-y divide-gray-100 print:divide-black">
            {/* Table Header for Print */}
            <div className="hidden print:flex bg-gray-100 p-2 font-bold text-xs uppercase border-b border-black">
               <div className="w-1/2">Worker Name</div>
               <div className="w-1/4 text-center">Status</div>
               <div className="w-1/4 text-right">Remarks</div>
            </div>

            {workers.map(w => {
              const status = (attendance[selectedDate] || {})[w.id];
              const stats = getWorkerStats(w.id);
              return (
                <div key={w.id} className="p-4 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50 gap-4 print:flex-row print:p-2 print:border-b print:border-black">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-lg border border-slate-200 print:hidden">{w.name.charAt(0)}</div>
                    <div>
                      <div className="font-bold text-slate-800 text-lg">{w.name}</div>
                      <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 print:text-black">
                        <span>{w.role} • ₹{w.rate}/day</span>
                        <div className="flex gap-1 ml-2 print:hidden">
                          {stats.historyDots.map((d, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${d.status === 'P' ? 'bg-green-500' : d.status === 'A' ? 'bg-red-500' : d.status === 'HD' ? 'bg-yellow-500' : 'bg-slate-200'}`} title={d.date}></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto justify-end print:hidden">
                    <button onClick={() => markAttendance(w.id, 'P')} className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg border-2 transition-all ${status === 'P' ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'border-slate-200 text-slate-300 hover:border-green-400 hover:text-green-400'}`}>P</button>
                    <button onClick={() => markAttendance(w.id, 'HD')} className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg border-2 transition-all ${status === 'HD' ? 'bg-yellow-500 border-yellow-500 text-white shadow-lg' : 'border-slate-200 text-slate-300 hover:border-yellow-400 hover:text-yellow-400'}`}>H</button>
                    <button onClick={() => markAttendance(w.id, 'A')} className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg border-2 transition-all ${status === 'A' ? 'bg-red-500 border-red-500 text-white shadow-lg' : 'border-slate-200 text-slate-300 hover:border-red-400 hover:text-red-400'}`}>A</button>
                  </div>
                  {/* Print Status Only */}
                  <div className="hidden print:block font-bold">
                     {status === 'P' ? 'PRESENT' : status === 'HD' ? 'HALF DAY' : status === 'A' ? 'ABSENT' : '-'}
                  </div>
                </div>
              )
            })}
            {workers.length === 0 && <div className="p-8 text-center text-gray-400">No workers added yet.</div>}
          </div>
        </div>
      )}

      {/* --- TAB 2: PAYROLL --- */}
      {activeTab === 'payroll' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-1 h-fit">
            <div className="p-4 border-b border-gray-200 font-bold text-slate-700 bg-slate-50">Select Worker</div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {workers.map(w => {
                const stats = getWorkerStats(w.id);
                return (
                  <div key={w.id} onClick={() => setSelectedWorker(w)} className={`p-4 cursor-pointer hover:bg-orange-50 transition-colors ${selectedWorker?.id === w.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''}`}>
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-slate-800">{w.name}</div>
                      <div className={`text-xs font-black px-2 py-1 rounded ${stats.payable < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {stats.payable < 0 ? `Owes ₹${Math.abs(stats.payable)}` : `Pay ₹${stats.payable}`}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2 text-[10px] uppercase font-bold text-slate-400">
                      <span>P: {stats.present}</span>
                      <span>H: {stats.half}</span>
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
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <h2 className="text-3xl font-black">{selectedWorker.name}</h2>
                      <p className="text-slate-400 font-bold text-sm uppercase">{selectedWorker.role} • ₹{selectedWorker.rate}/day</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase">Net Payable</p>
                      <p className="text-5xl font-black text-green-400">₹{getWorkerStats(selectedWorker.id).payable.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-8 relative z-10">
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Total Earned</div>
                      <div className="text-2xl font-bold">₹{getWorkerStats(selectedWorker.id).earned.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Less Advance</div>
                      <div className="text-2xl font-bold text-red-400">-₹{getWorkerStats(selectedWorker.id).totalAdvance.toLocaleString()}</div>
                    </div>
                    <button onClick={() => window.print()} className="bg-white text-slate-900 p-3 rounded-xl font-bold flex flex-col items-center justify-center hover:bg-gray-100 transition-colors">
                      <Printer size={20}/>
                      <span className="text-[10px] uppercase mt-1">Print Slip</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex gap-4 mb-4">
                    <button onClick={() => setMoneyForm({...moneyForm, type: 'ADVANCE'})} className={`flex-1 py-2 rounded-lg font-bold text-sm ${moneyForm.type === 'ADVANCE' ? 'bg-red-50 text-red-600 border border-red-200' : 'text-slate-400 bg-slate-50'}`}>Give Advance (-)</button>
                    <button onClick={() => setMoneyForm({...moneyForm, type: 'BONUS'})} className={`flex-1 py-2 rounded-lg font-bold text-sm ${moneyForm.type === 'BONUS' ? 'bg-green-50 text-green-600 border border-green-200' : 'text-slate-400 bg-slate-50'}`}>Give Bonus (+)</button>
                  </div>
                  <form onSubmit={addMoneyEntry} className="flex gap-3">
                    <input type="number" placeholder="Amount (₹)" className="border-2 border-gray-100 p-3 rounded-xl font-bold w-32 focus:border-orange-500 outline-none text-lg" value={moneyForm.amount} onChange={e => setMoneyForm({...moneyForm, amount: e.target.value})} />
                    <input type="text" placeholder={`Reason for ${moneyForm.type.toLowerCase()}...`} className="border-2 border-gray-100 p-3 rounded-xl font-bold flex-1 focus:border-orange-500 outline-none" value={moneyForm.reason} onChange={e => setMoneyForm({...moneyForm, reason: e.target.value})} />
                    <button className={`text-white px-6 rounded-xl font-bold ${moneyForm.type === 'ADVANCE' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>Add</button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-gray-200 font-bold text-slate-700 text-sm">Transaction History</div>
                  <table className="w-full text-sm text-left">
                    <tbody className="divide-y divide-gray-100">
                      <tr className="bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-600">Work Earnings</td>
                        <td className="p-4 text-xs text-slate-400 font-bold uppercase">{getWorkerStats(selectedWorker.id).present} Days Present</td>
                        <td className="p-4 text-right font-black text-slate-700">+ ₹{getWorkerStats(selectedWorker.id).earned}</td>
                        <td className="p-4 w-10"></td>
                      </tr>
                      {(bonuses[selectedWorker.id] || []).map(b => (
                        <tr key={b.id} className="hover:bg-green-50">
                          <td className="p-4 font-bold text-green-700">{b.date}</td>
                          <td className="p-4"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold uppercase">Bonus</span> <span className="text-gray-500 font-medium ml-2">{b.reason}</span></td>
                          <td className="p-4 text-right font-black text-green-600">+ ₹{b.amount}</td>
                          <td className="p-4 text-center"><button onClick={() => deleteMoneyEntry(selectedWorker.id, b.id, 'BONUS')} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></td>
                        </tr>
                      ))}
                      {(advances[selectedWorker.id] || []).map(a => (
                        <tr key={a.id} className="hover:bg-red-50">
                          <td className="p-4 font-bold text-red-700">{a.date}</td>
                          <td className="p-4"><span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold uppercase">Advance</span> <span className="text-gray-500 font-medium ml-2">{a.reason}</span></td>
                          <td className="p-4 text-right font-black text-red-600">- ₹{a.amount}</td>
                          <td className="p-4 text-center"><button onClick={() => deleteMoneyEntry(selectedWorker.id, a.id, 'ADVANCE')} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
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
          <form onSubmit={addWorker} className="grid grid-cols-2 gap-4 mb-8">
            <div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Full Name</label><input className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold focus:border-orange-500 outline-none" value={newWorker.name} onChange={e => setNewWorker({...newWorker, name: e.target.value})} placeholder="e.g. Rahul Patil"/></div>
            
            {/* UNLIMITED ROLES INPUT */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">Role</label>
              <input list="roleList" className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold bg-white focus:border-orange-500 outline-none" value={newWorker.role} onChange={e => setNewWorker({...newWorker, role: e.target.value})} placeholder="Type or Select..." />
              <datalist id="roleList">
                <option value="Driver"/><option value="Helper"/><option value="Mistri"/><option value="Supervisor"/><option value="Security"/><option value="Operator"/>
              </datalist>
            </div>
            
            <div><label className="text-xs font-bold text-gray-400 uppercase">Daily Rate (₹)</label><input type="number" className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold focus:border-orange-500 outline-none" value={newWorker.rate} onChange={e => setNewWorker({...newWorker, rate: e.target.value})} /></div>
            
            <div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Mobile</label><input className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold focus:border-orange-500 outline-none" value={newWorker.phone} onChange={e => setNewWorker({...newWorker, phone: e.target.value})} placeholder="Optional for WhatsApp"/></div>
            
            <button className="col-span-2 bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-black">Save Worker</button>
          </form>

          <div className="space-y-2">
            <h4 className="font-bold text-gray-400 text-xs uppercase mb-2">Current Staff</h4>
            {workers.map(w => (
              <div key={w.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-slate-50">
                <div>
                  <div className="font-bold text-slate-800">{w.name}</div>
                  <div className="text-xs text-slate-500 font-bold uppercase">{w.role} • ₹{w.rate}/day</div>
                </div>
                <div className="flex gap-2">
                  {w.phone && <a href={`https://wa.me/${w.phone}`} target="_blank" className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><MessageCircle size={18}/></a>}
                  <button onClick={() => removeWorker(w.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- HIDDEN PRINT SLIP --- */}
      <div className="hidden print:block p-8 bg-white text-black print-area">
        {selectedWorker && (
          <div className="border-2 border-black p-8 max-w-lg mx-auto mt-10 text-center">
            <h1 className="font-black text-2xl uppercase tracking-tighter">BALDIGAMBAR ENTERPRISES</h1>
            <p className="text-xs font-bold uppercase mb-6 border-b-2 border-black pb-2">Salary Voucher</p>
            <div className="text-left mb-6">
              <div className="flex justify-between mb-1"><span className="text-xs uppercase text-gray-500 font-bold">Worker Name</span><span className="font-black text-xl">{selectedWorker.name}</span></div>
              <div className="flex justify-between"><span className="text-xs uppercase text-gray-500 font-bold">Role</span><span className="font-bold">{selectedWorker.role}</span></div>
              <div className="flex justify-between"><span className="text-xs uppercase text-gray-500 font-bold">Date</span><span className="font-bold">{new Date().toLocaleDateString()}</span></div>
            </div>
            <div className="border-t-2 border-dashed border-gray-300 pt-4 pb-4 space-y-2 text-left">
              <div className="flex justify-between"><span className="font-bold">Work Earnings ({getWorkerStats(selectedWorker.id).present} Days)</span><span className="font-bold">₹{getWorkerStats(selectedWorker.id).earned}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-600">Incentive / Bonus</span><span className="font-bold text-gray-600">+ ₹{getWorkerStats(selectedWorker.id).totalBonus}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-600">Less: Advance Taken</span><span className="font-bold text-gray-600">- ₹{getWorkerStats(selectedWorker.id).totalAdvance}</span></div>
            </div>
            <div className="flex justify-between text-2xl font-black border-t-2 border-black pt-4 mt-2"><span>NET PAYABLE</span><span>₹{getWorkerStats(selectedWorker.id).payable.toLocaleString()}</span></div>
            <div className="mt-16 pt-4 border-t border-black flex justify-between text-xs font-bold uppercase"><span>Receiver Signature</span><span>Manager Signature</span></div>
          </div>
        )}
      </div>

    </div>
  );
}