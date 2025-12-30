import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, Plus, Trash2, TrendingUp, Calendar, 
  Coffee, Zap, Home, FileText, Filter, Printer, Droplet,
  Building, CreditCard, Download, Copy, Settings, PieChart, 
  AlertCircle, CheckCircle, Clock, X, ArrowUpCircle, ArrowDownCircle, 
  ToggleLeft, ToggleRight, Eye, EyeOff
} from 'lucide-react';

export default function ExpenseManager() {
  
  // ==========================================
  // 1. DATABASE & STATE
  // ==========================================
  
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('baldigambar_cashbook');
    return saved ? JSON.parse(saved) : [
      { id: 1, date: '2025-12-28', type: 'Expense', category: 'Site Material', site: 'Patil Wada', payee: 'Samarth Hardware', amount: 5500, mode: 'UPI', status: 'Paid', note: 'Cement Bags' },
      { id: 2, date: '2025-12-01', type: 'Expense', category: 'Rent', site: 'Main Office', payee: 'Owner', amount: 5000, mode: 'Bank', status: 'Paid', note: 'Office Rent Dec' },
      { id: 3, date: '2025-12-30', type: 'Income', category: 'Scrap Sale', site: 'JCB 01', payee: 'Raju Scrap', amount: 12000, mode: 'Cash', status: 'Paid', note: 'Sold old bucket iron' }
    ];
  });

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('baldigambar_exp_categories');
    return saved ? JSON.parse(saved) : ['Site Material', 'Fuel/Travel', 'Food/Tea', 'Salaries', 'Rent', 'Repairs', 'Utilities', 'Scrap Sale', 'Advance Return', 'Other Income'];
  });

  const [sites, setSites] = useState(() => {
    const saved = localStorage.getItem('baldigambar_sites');
    return saved ? JSON.parse(saved) : ['Main Office', 'Patil Wada', 'Civil Site A', 'JCB 01', 'General'];
  });

  const [budget, setBudget] = useState(() => Number(localStorage.getItem('baldigambar_monthly_budget')) || 50000);
  const [budgetEnabled, setBudgetEnabled] = useState(() => localStorage.getItem('baldigambar_budget_enabled') === 'true');

  // UI State
  const [form, setForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    type: 'Expense', // 'Income' or 'Expense'
    category: '', 
    site: '', 
    payee: '', 
    amount: '', 
    mode: 'Cash', 
    status: 'Paid',
    note: '' 
  });

  // Default selection safe guard
  useEffect(() => {
    if (!form.category && categories.length > 0) setForm(f => ({ ...f, category: categories[0] }));
    if (!form.site && sites.length > 0) setForm(f => ({ ...f, site: sites[0] }));
  }, [categories, sites]);

  const [filter, setFilter] = useState({ type: 'All', category: 'All', site: 'All', month: new Date().toISOString().slice(0, 7) });
  const [inkSaver, setInkSaver] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newSite, setNewSite] = useState('');

  // ==========================================
  // 2. AUTO-SAVE
  // ==========================================
  useEffect(() => { localStorage.setItem('baldigambar_cashbook', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('baldigambar_exp_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('baldigambar_sites', JSON.stringify(sites)); }, [sites]);
  useEffect(() => { localStorage.setItem('baldigambar_monthly_budget', budget); }, [budget]);
  useEffect(() => { localStorage.setItem('baldigambar_budget_enabled', budgetEnabled); }, [budgetEnabled]);

  // ==========================================
  // 3. LOGIC
  // ==========================================

  const addTransaction = (e) => {
    e.preventDefault();
    if (!form.amount) return;
    setTransactions([{ ...form, id: Date.now(), amount: Number(form.amount) }, ...transactions]);
    setForm({ ...form, amount: '', payee: '', note: '' }); // Reset fields
  };

  const deleteTransaction = (id) => {
    if (confirm("Delete this record permanently?")) setTransactions(transactions.filter(e => e.id !== id));
  };

  const duplicateTransaction = (item) => {
    const newItem = { ...item, id: Date.now(), date: new Date().toISOString().split('T')[0] };
    setTransactions([newItem, ...transactions]);
  };

  // --- SETTINGS LOGIC ---
  const addCategory = () => { if(newCat && !categories.includes(newCat)) { setCategories([...categories, newCat]); setNewCat(''); }};
  const removeCategory = (cat) => { if(confirm(`Delete category "${cat}"?`)) setCategories(categories.filter(c => c !== cat)); };

  const addSite = () => { if(newSite && !sites.includes(newSite)) { setSites([...sites, newSite]); setNewSite(''); }};
  const removeSite = (site) => { if(confirm(`Delete site "${site}"?`)) setSites(sites.filter(s => s !== site)); };

  // --- FILTER & STATS ---
  const filteredTransactions = transactions.filter(e => {
    const matchType = filter.type === 'All' || e.type === filter.type;
    const matchCat = filter.category === 'All' || e.category === filter.category;
    const matchSite = filter.site === 'All' || e.site === filter.site;
    const matchMonth = e.date.startsWith(filter.month);
    return matchType && matchCat && matchSite && matchMonth;
  });
  
  const totalExpense = filteredTransactions.filter(t => t.type === 'Expense').reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = filteredTransactions.filter(t => t.type === 'Income').reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Unique Payees for Auto-Complete
  const uniquePayees = [...new Set(transactions.map(e => e.payee))].filter(Boolean);

  // CSV Export
  const downloadCSV = () => {
    const headers = ["Date", "Type", "Category", "Site/Project", "Payee", "Mode", "Status", "Note", "Amount"];
    const rows = filteredTransactions.map(e => [e.date, e.type, e.category, e.site, e.payee, e.mode, e.status, e.note, e.amount]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `cashbook_${filter.month}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // ==========================================
  // 4. UI RENDER
  // ==========================================
  return (
    <div className={`space-y-6 pb-20 font-sans text-slate-800 animate-fade-in ${inkSaver ? 'print-ink-saver' : ''}`}>
      
      {/* CSS for Ink Saver */}
      <style>{`
        @media print {
          aside, nav, header, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
          body { background: white !important; }
          .print-ink-saver * { color: black !important; background: transparent !important; border-color: black !important; box-shadow: none !important; }
          .print-ink-saver .border-2 { border-width: 1px !important; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
        }
      `}</style>

      {/* --- SETTINGS MODAL --- */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">Manage Settings</h3><button onClick={()=>setShowSettings(false)}><X size={24}/></button></div>
            <div className="space-y-6">
              {/* Budget Setting */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <label className="text-xs font-bold text-slate-400 uppercase">Monthly Expense Limit</label>
                 <div className="flex gap-2 mt-1">
                   <input type="number" className="border p-2 rounded-lg flex-1 font-bold" value={budget} onChange={e=>setBudget(e.target.value)} />
                   <div className="bg-slate-200 p-2 rounded-lg text-xs font-bold flex items-center">₹ Limit</div>
                 </div>
              </div>
              {/* Category Manager */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Categories (Income & Expense)</label>
                <div className="flex gap-2 mt-1 mb-2"><input className="border p-2 rounded-lg flex-1 font-bold" placeholder="New Category" value={newCat} onChange={e=>setNewCat(e.target.value)} /><button onClick={addCategory} className="bg-slate-900 text-white px-4 rounded-lg font-bold">Add</button></div>
                <div className="flex flex-wrap gap-2">{categories.map(c=><span key={c} className="bg-white border border-slate-200 text-xs font-bold pl-2 pr-1 py-1 rounded-lg flex items-center gap-1">{c} <button onClick={()=>removeCategory(c)} className="text-slate-400 hover:text-red-600"><X size={14}/></button></span>)}</div>
              </div>
              {/* Site Manager */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Sites / Projects</label>
                <div className="flex gap-2 mt-1 mb-2"><input className="border p-2 rounded-lg flex-1 font-bold" placeholder="New Site Name" value={newSite} onChange={e=>setNewSite(e.target.value)} /><button onClick={addSite} className="bg-slate-900 text-white px-4 rounded-lg font-bold">Add</button></div>
                <div className="flex flex-wrap gap-2">{sites.map(s=><span key={s} className="bg-white border border-slate-200 text-xs font-bold pl-2 pr-1 py-1 rounded-lg flex items-center gap-1">{s} <button onClick={()=>removeSite(s)} className="text-slate-400 hover:text-red-600"><X size={14}/></button></span>)}</div>
              </div>
            </div>
            <button onClick={()=>setShowSettings(false)} className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black">Save & Close</button>
          </div>
        </div>
      )}

      {/* --- DASHBOARD STATS --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        {/* Balance Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={64}/></div>
           <p className="text-xs font-bold text-slate-400 uppercase">Net Balance</p>
           <h3 className={`text-3xl font-black mt-1 ${netBalance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>₹{netBalance.toLocaleString()}</h3>
           <div className="flex gap-4 mt-2 text-xs font-bold">
             <span className="text-green-600 flex items-center gap-1"><ArrowDownCircle size={12}/> +{totalIncome.toLocaleString()}</span>
             <span className="text-red-500 flex items-center gap-1"><ArrowUpCircle size={12}/> -{totalExpense.toLocaleString()}</span>
           </div>
        </div>

        {/* Budget Bar (Toggleable) */}
        {budgetEnabled ? (
          <div className="md:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
            <button onClick={() => setBudgetEnabled(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-600" title="Hide Budget"><EyeOff size={18}/></button>
            <div className="flex justify-between items-start mb-2">
              <div><p className="text-xs font-bold text-slate-400 uppercase">Monthly Expense Limit</p><h3 className="text-3xl font-black text-slate-800 mt-1">₹{totalExpense.toLocaleString()} <span className="text-lg text-slate-300">/ {budget.toLocaleString()}</span></h3></div>
              <div className="text-right mt-6"><p className={`text-sm font-black ${totalExpense > budget ? 'text-red-600' : 'text-green-600'}`}>{Math.round((totalExpense/budget)*100)}% Used</p></div>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${totalExpense > budget ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${Math.min((totalExpense/budget)*100, 100)}%`}}></div></div>
          </div>
        ) : (
          <div className="md:col-span-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center">
            <button onClick={() => setBudgetEnabled(true)} className="flex items-center gap-2 text-slate-400 font-bold hover:text-slate-600"><Eye size={20}/> Show Monthly Budget Limit</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- ADD FORM (Income & Expense) --- */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit no-print">
          <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700 uppercase text-sm flex items-center gap-2"><Plus size={18}/> New Entry</h3><button onClick={()=>setShowSettings(true)} className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"><Settings size={14}/> Manage</button></div>
          
          {/* INCOME / EXPENSE TOGGLE */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button onClick={() => setForm({...form, type: 'Expense'})} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${form.type === 'Expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Expense (Out)</button>
            <button onClick={() => setForm({...form, type: 'Income'})} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${form.type === 'Income' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Income (In)</button>
          </div>

          <form onSubmit={addTransaction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-slate-400 uppercase">Date</label><input type="date" className="w-full border-2 border-slate-100 p-2.5 rounded-xl font-bold outline-none" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase">Amount (₹)</label><input type="number" className={`w-full border-2 border-slate-100 p-2.5 rounded-xl font-bold outline-none ${form.type === 'Expense' ? 'text-red-600' : 'text-green-600'}`} value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">{form.type === 'Expense' ? 'Paid To' : 'Received From'}</label>
              <input list="payeeList" type="text" placeholder={form.type === 'Expense' ? 'e.g. Hardware Store' : 'e.g. Scrap Dealer'} className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold outline-none" value={form.payee} onChange={e => setForm({...form, payee: e.target.value})} />
              <datalist id="payeeList">{uniquePayees.map(p => <option key={p} value={p}/>)}</datalist>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-slate-400 uppercase">Category</label><select className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold bg-white outline-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase">Site / Side</label><select className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold bg-white outline-none" value={form.site} onChange={e => setForm({...form, site: e.target.value})}>{sites.map(s => <option key={s}>{s}</option>)}</select></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs font-bold text-slate-400 uppercase">Mode</label><select className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold bg-white outline-none" value={form.mode} onChange={e => setForm({...form, mode: e.target.value})}><option>Cash</option><option>UPI</option><option>Bank</option><option>Card</option></select></div>
               <div><label className="text-xs font-bold text-slate-400 uppercase">Status</label><select className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold bg-white outline-none" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option>Paid</option><option>Pending</option></select></div>
            </div>

            <div><label className="text-xs font-bold text-slate-400 uppercase">Note</label><input type="text" placeholder="Details..." className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold outline-none" value={form.note} onChange={e => setForm({...form, note: e.target.value})} /></div>
            
            <button className={`w-full text-white py-3 rounded-xl font-bold shadow-lg ${form.type === 'Expense' ? 'bg-slate-900 hover:bg-red-900' : 'bg-green-600 hover:bg-green-700'}`}>{form.type === 'Expense' ? 'Save Expense' : 'Save Income'}</button>
          </form>
        </div>

        {/* --- CASHBOOK LIST --- */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[800px]">
          
          <div className="p-4 border-b border-slate-100 flex flex-col gap-4 no-print">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-700 uppercase text-sm">Cashbook History</h3>
              <div className="flex gap-2">
                 <button onClick={downloadCSV} className="p-2 text-slate-400 hover:text-green-600 border border-slate-200 rounded-lg" title="Export Excel"><Download size={18}/></button>
                 <button onClick={() => setInkSaver(!inkSaver)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 ${inkSaver ? 'bg-green-100 text-green-700' : 'bg-white text-slate-500'}`}><Droplet size={14} /> Ink Saver</button>
                 <button onClick={() => window.print()} className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-black flex items-center gap-2"><Printer size={14}/> Print</button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <input type="month" className="bg-slate-50 border border-slate-200 text-xs font-bold p-2 rounded-lg outline-none" value={filter.month} onChange={e => setFilter({...filter, month: e.target.value})} />
              <select className="bg-slate-50 border border-slate-200 text-xs font-bold p-2 rounded-lg outline-none" value={filter.type} onChange={e => setFilter({...filter, type: e.target.value})}><option value="All">All Types</option><option value="Income">Income Only</option><option value="Expense">Expense Only</option></select>
              <select className="bg-slate-50 border border-slate-200 text-xs font-bold p-2 rounded-lg outline-none" value={filter.site} onChange={e => setFilter({...filter, site: e.target.value})}><option value="All">All Sites</option>{sites.map(s => <option key={s} value={s}>{s}</option>)}</select>
            </div>
          </div>

          <div className="hidden print:block p-4 text-center border-b border-black">
            <h1 className="text-2xl font-black uppercase">Business Cashbook</h1>
            <p className="text-sm">Baldigambar Enterprises • {new Date().toLocaleDateString()}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredTransactions.length === 0 ? <div className="p-8 text-center text-slate-400 font-bold">No records found.</div> : 
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase sticky top-0 print:bg-white print:text-black">
                <tr><th className="p-4">Date</th><th className="p-4">Details</th><th className="p-4">Payee/Mode</th><th className="p-4 text-right">Amount</th><th className="p-4 text-center no-print">Act</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50 print:divide-black">
                {filteredTransactions.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 group">
                    <td className="p-4 font-bold text-slate-600 whitespace-nowrap align-top">{item.date}</td>
                    <td className="p-4 align-top">
                      <div className="font-bold text-slate-800">{item.note || item.category}</div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase print:border print:border-black print:text-black ${item.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>{item.type}</span>
                         <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase print:border print:border-black print:text-black">{item.category}</span>
                         <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[10px] font-black uppercase print:border print:border-black print:text-black">{item.site}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-500 align-top">
                      <div className="text-slate-800">{item.payee || '-'}</div>
                      <div className="flex gap-2 mt-1">
                        <span className="uppercase text-[10px] tracking-wide">{item.mode}</span>
                        {item.status === 'Pending' && <span className="text-red-600 bg-red-50 px-1 rounded text-[10px] uppercase">Pending</span>}
                      </div>
                    </td>
                    <td className={`p-4 text-right font-black align-top ${item.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>{item.type === 'Income' ? '+' : '-'}₹{item.amount.toLocaleString()}</td>
                    <td className="p-4 text-center no-print align-top">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => duplicateTransaction(item)} className="text-slate-300 hover:text-blue-500" title="Duplicate"><Copy size={16}/></button>
                        <button onClick={() => deleteTransaction(item.id)} className="text-slate-300 hover:text-red-500" title="Delete"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 print:bg-white print:border-black sticky bottom-0">
                <tr>
                  <td colSpan="3" className="p-4 text-right font-black uppercase text-xs text-slate-500">Net Balance:</td>
                  <td className={`p-4 text-right font-black text-xl ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{netBalance.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            }
          </div>
        </div>
      </div>
    </div>
  );
}