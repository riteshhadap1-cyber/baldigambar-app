import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Plus, Search, AlertTriangle, ArrowUp, ArrowDown, 
  Trash2, Package, CheckCircle, ShoppingCart, History, 
  Filter, Printer, Droplet, DollarSign, Activity 
} from 'lucide-react';

export default function InventoryManager() {
  
  // ==========================================
  // 1. DATABASE & STATE
  // ==========================================
  
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('baldigambar_inventory');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Engine Oil (15W40)', category: 'Oil', qty: 20, unit: 'Liters', minLevel: 10, price: 350 },
      { id: 2, name: 'JCB Bucket Teeth', category: 'Spares', qty: 4, unit: 'Pcs', minLevel: 5, price: 1200 },
      { id: 3, name: 'Hydraulic Oil', category: 'Oil', qty: 50, unit: 'Liters', minLevel: 20, price: 280 },
      { id: 4, name: 'Grease Bucket', category: 'Consumable', qty: 2, unit: 'Bucket', minLevel: 1, price: 4500 }
    ];
  });

  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('baldigambar_inventory_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // UI State
  const [newItem, setNewItem] = useState({ name: '', category: 'Spares', qty: '', unit: 'Pcs', minLevel: '', price: '' });
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [stockAction, setStockAction] = useState({ id: null, type: '', qty: '' });
  const [showHistory, setShowHistory] = useState(false);
  const [inkSaver, setInkSaver] = useState(true);

  // ==========================================
  // 2. AUTO-SAVE
  // ==========================================
  useEffect(() => { localStorage.setItem('baldigambar_inventory', JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem('baldigambar_inventory_logs', JSON.stringify(logs)); }, [logs]);

  // ==========================================
  // 3. LOGIC & CALCULATIONS
  // ==========================================

  const categories = ['All', 'Spares', 'Oil', 'Consumable', 'Tools', 'Tyres'];

  const addItem = (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.qty) return;
    const item = { 
      ...newItem, 
      id: Date.now(), 
      qty: Number(newItem.qty), 
      minLevel: Number(newItem.minLevel) || 0,
      price: Number(newItem.price) || 0
    };
    setItems([...items, item]);
    addLog(item.name, 'CREATED', item.qty);
    setNewItem({ name: '', category: 'Spares', qty: '', unit: 'Pcs', minLevel: '', price: '' });
  };

  const deleteItem = (id, name) => {
    if (confirm(`Delete ${name} permanently?`)) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const addLog = (itemName, action, qty) => {
    const newLog = {
      id: Date.now(),
      date: new Date().toLocaleString('en-IN'),
      item: itemName,
      action: action, // 'ADDED' or 'REMOVED' or 'CREATED'
      qty: qty
    };
    setLogs([newLog, ...logs].slice(0, 50)); // Keep last 50 logs
  };

  const handleStockUpdate = (e) => {
    e.preventDefault();
    if (!stockAction.qty) return;
    const qtyChange = Number(stockAction.qty);
    
    setItems(items.map(item => {
      if (item.id === stockAction.id) {
        const newQty = stockAction.type === 'ADD' ? item.qty + qtyChange : item.qty - qtyChange;
        if (stockAction.type === 'ADD') addLog(item.name, 'ADDED', qtyChange);
        else addLog(item.name, 'USED', qtyChange);
        return { ...item, qty: Math.max(0, newQty) };
      }
      return item;
    }));
    setStockAction({ id: null, type: '', qty: '' });
  };

  // Filter Logic
  const filteredItems = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || i.category === activeCategory;
    return matchSearch && matchCat;
  });

  // Stats
  const totalValue = items.reduce((sum, i) => sum + (i.qty * i.price), 0);
  const lowStockCount = items.filter(i => i.qty <= i.minLevel).length;

  // ==========================================
  // 4. UI RENDER
  // ==========================================
  return (
    <div className={`space-y-6 pb-20 animate-fade-in font-sans text-slate-800 ${inkSaver ? 'print-ink-saver' : ''}`}>
      
      {/* CSS for Ink Saver */}
      <style>{`
        @media print {
          aside, nav, header, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          
          .print-ink-saver {
            color: black !important;
            background: white !important;
          }
          .print-ink-saver * {
            background: transparent !important;
            color: black !important;
            box-shadow: none !important;
            border-color: black !important;
          }
          .print-ink-saver .bg-slate-900 { display: none !important; } /* Hide heavy dark buttons */
          .print-ink-saver table { border: 1px solid black; width: 100%; border-collapse: collapse; }
          .print-ink-saver th, .print-ink-saver td { border: 1px solid black; padding: 5px; }
          .print-ink-saver .progress-bar { display: none !important; } /* Hide color bars */
        }
      `}</style>

      {/* --- HEADER STATS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div><p className="text-xs font-bold text-slate-400 uppercase">Total Stock Value</p><h3 className="text-3xl font-black text-emerald-600 mt-1">₹{totalValue.toLocaleString()}</h3></div>
          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><DollarSign size={24}/></div>
        </div>
        <div className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between ${lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <div><p className={`text-xs font-bold uppercase ${lowStockCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>Low Stock Alerts</p><h3 className={`text-3xl font-black mt-1 ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{lowStockCount} Items</h3></div>
          <div className={`${lowStockCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} p-3 rounded-xl`}>{lowStockCount > 0 ? <AlertTriangle size={24}/> : <CheckCircle size={24}/>}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowHistory(!showHistory)}>
          <div><p className="text-xs font-bold text-slate-400 uppercase">Recent Activity</p><h3 className="text-xl font-bold text-slate-800 mt-1">{logs.length > 0 ? logs[0].action : 'No Activity'}</h3><p className="text-[10px] text-slate-400">{logs.length > 0 ? logs[0].item : ''}</p></div>
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><History size={24}/></div>
        </div>
      </div>

      {/* --- HISTORY LOG DRAWER --- */}
      {showHistory && (
        <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-xl no-print animate-fade-in">
          <div className="flex justify-between items-center mb-4"><h3 className="font-bold uppercase text-sm flex items-center gap-2"><History size={18}/> Stock Movement Logs</h3><button onClick={() => setShowHistory(false)}><ArrowUp size={20}/></button></div>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {logs.map(log => (
              <div key={log.id} className="text-xs flex justify-between border-b border-slate-700 pb-2">
                <span className="text-slate-400 font-mono">{log.date}</span>
                <span className="font-bold text-white">{log.item}</span>
                <span className={`font-black ${log.action === 'ADDED' || log.action === 'CREATED' ? 'text-green-400' : 'text-red-400'}`}>{log.action} {log.qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- CONTROLS --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-slate-800 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14}/>
            <input className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100" placeholder="Search stock..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setInkSaver(!inkSaver)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-gray-200 ${inkSaver ? 'bg-green-100 text-green-700' : 'bg-white text-slate-500'}`}><Droplet size={16} /> {inkSaver ? 'Ink Saver' : 'Color'}</button>
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black shadow-lg flex items-center gap-2"><Printer size={16}/> Print</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- ADD NEW ITEM FORM --- */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit no-print">
          <h3 className="font-bold text-slate-700 uppercase mb-4 text-sm flex items-center gap-2"><Plus size={18}/> Add New Item</h3>
          <form onSubmit={addItem} className="space-y-4">
            <div><label className="text-xs font-bold text-slate-400 uppercase">Item Name</label><input className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold focus:border-orange-500 outline-none" placeholder="e.g. Air Filter" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs font-bold text-slate-400 uppercase">Category</label><select className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold bg-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}><option>Spares</option><option>Oil</option><option>Consumable</option><option>Tools</option><option>Tyres</option></select></div>
               <div><label className="text-xs font-bold text-slate-400 uppercase">Unit</label><select className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold bg-white outline-none" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}><option>Pcs</option><option>Liters</option><option>Kg</option><option>Bucket</option><option>Set</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs font-bold text-slate-400 uppercase">Initial Qty</label><input type="number" className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold outline-none" placeholder="0" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: e.target.value})} /></div>
               <div><label className="text-xs font-bold text-slate-400 uppercase">Unit Price (₹)</label><input type="number" className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold outline-none" placeholder="₹" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} /></div>
            </div>
            <div><label className="text-xs font-bold text-slate-400 uppercase">Min Alert Level</label><input type="number" className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold outline-none text-red-400" placeholder="5" value={newItem.minLevel} onChange={e => setNewItem({...newItem, minLevel: e.target.value})} /></div>
            <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black shadow-lg">Save Item</button>
          </form>
        </div>

        {/* --- INVENTORY LIST --- */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Print Header */}
          <div className="hidden print:block p-4 text-center border-b border-black">
             <h1 className="text-2xl font-black uppercase">Inventory Report</h1>
             <p className="text-sm">Baldigambar Enterprises • {new Date().toLocaleDateString()}</p>
          </div>

          <div className="p-4 border-b border-slate-100 flex justify-between items-center no-print">
            <h3 className="font-bold text-slate-700 uppercase text-sm">Stock List</h3>
            <span className="text-xs font-bold text-slate-400">{filteredItems.length} Items</span>
          </div>
          
          <div className="max-h-[600px] overflow-y-auto">
            {filteredItems.length === 0 ? <div className="p-8 text-center text-slate-400 font-bold">No items found.</div> : 
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase sticky top-0 print:bg-white print:text-black">
                <tr><th className="p-4">Item Name</th><th className="p-4 text-center">In Stock</th><th className="p-4 text-center">Status</th><th className="p-4 text-right no-print">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50 print:divide-black">
                {filteredItems.map(item => {
                  const percent = Math.min((item.qty / (item.minLevel * 3)) * 100, 100);
                  return (
                  <tr key={item.id} className="hover:bg-slate-50 group">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{item.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase flex gap-2">
                        <span>{item.category}</span> • <span>₹{item.price}/unit</span> • <span>Min: {item.minLevel}</span>
                      </div>
                      {/* Visual Stock Bar */}
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden progress-bar">
                        <div className={`h-full rounded-full ${item.qty <= item.minLevel ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${percent}%`}}></div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="font-black text-lg text-slate-700">{item.qty} <span className="text-xs text-slate-400 font-bold">{item.unit}</span></div>
                      <div className="text-[10px] font-bold text-slate-400 print:hidden">Value: ₹{(item.qty * item.price).toLocaleString()}</div>
                    </td>
                    <td className="p-4 text-center">
                      {item.qty <= item.minLevel ? 
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border border-red-200 print:border-black print:text-black">Low Stock</span> : 
                        <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border border-green-200 print:border-black print:text-black">Good</span>
                      }
                    </td>
                    <td className="p-4 text-right no-print">
                       {stockAction.id === item.id ? (
                         <div className="flex items-center justify-end gap-2 animate-fade-in bg-white shadow-lg p-2 rounded-xl absolute right-4 border border-orange-100 z-10">
                           <input autoFocus type="number" className="w-16 border-2 border-orange-200 rounded-lg p-1 text-center font-bold outline-none" placeholder="Qty" value={stockAction.qty} onChange={e => setStockAction({...stockAction, qty: e.target.value})} />
                           <button onClick={handleStockUpdate} className="bg-orange-600 text-white p-1.5 rounded-lg hover:bg-orange-700"><CheckCircle size={16}/></button>
                           <button onClick={() => setStockAction({id:null, type:'', qty:''})} className="bg-slate-200 text-slate-500 p-1.5 rounded-lg hover:bg-slate-300"><X size={16}/></button>
                         </div>
                       ) : (
                         <div className="flex items-center justify-end gap-2 opacity-100">
                           <button onClick={() => setStockAction({id: item.id, type: 'ADD', qty: ''})} className="bg-green-50 text-green-600 hover:bg-green-600 hover:text-white p-2 rounded-lg transition-colors border border-green-100" title="Add Stock"><Plus size={16}/></button>
                           <button onClick={() => setStockAction({id: item.id, type: 'REMOVE', qty: ''})} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-lg transition-colors border border-red-100" title="Use/Remove Stock"><ArrowDown size={16}/></button>
                           <button onClick={() => deleteItem(item.id, item.name)} className="bg-slate-50 text-slate-300 hover:bg-slate-200 hover:text-slate-500 p-2 rounded-lg ml-2"><Trash2 size={16}/></button>
                         </div>
                       )}
                    </td>
                  </tr>
                )})} 
              </tbody>
            </table>
            }
          </div>
        </div>
      </div>
    </div>
  );
}