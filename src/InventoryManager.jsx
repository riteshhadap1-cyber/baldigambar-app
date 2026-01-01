import React, { useState, useEffect } from 'react';
import { 
  Box, Plus, Minus, Search, AlertTriangle, History, 
  Trash2, Filter, ArrowUpRight, ArrowDownLeft, Package, 
  LayoutGrid, List, Edit3, X, RefreshCw
} from 'lucide-react';

// FIREBASE IMPORTS
import { db } from './firebase-config';
import { 
  ref, onValue, push, update, remove, query, limitToLast 
} from 'firebase/database';

export default function InventoryManager({ isAdmin }) {
  
  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sites, setSites] = useState(['Godown', 'Civil Site A', 'JCB Site', 'Patil Wada']); 
  
  // UI State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEditItem, setShowEditItem] = useState(null); // For Direct Stock Correction
  
  // Forms
  const [newItem, setNewItem] = useState({ 
    name: '', category: 'Material', unit: 'Bags', 
    qty: 0, minLevel: 10, price: 0 
  });

  const [stockAction, setStockAction] = useState({ 
    item: null, type: 'OUT', qty: '', reason: '' 
  });

  // ==========================================
  // 2. FIREBASE CONNECTION
  // ==========================================
  useEffect(() => {
    // 1. Items
    const unsubItems = onValue(ref(db, 'inventory_items'), (snapshot) => {
      const data = snapshot.val();
      setItems(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
    });

    // 2. Logs (Last 100)
    const logsQuery = query(ref(db, 'inventory_logs'), limitToLast(100));
    const unsubLogs = onValue(logsQuery, (snapshot) => {
      const data = snapshot.val();
      const loadedLogs = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
      loadedLogs.sort((a,b) => new Date(b.date) - new Date(a.date));
      setLogs(loadedLogs);
    });

    // 3. Sites
    const unsubSites = onValue(ref(db, 'sites'), (snapshot) => {
      if(snapshot.exists()) setSites(snapshot.val());
    });

    return () => { unsubItems(); unsubLogs(); unsubSites(); };
  }, []);

  // ==========================================
  // 3. ACTIONS
  // ==========================================
  
  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const lowStockCount = items.filter(i => i.qty <= i.minLevel).length;
  const totalStockValue = items.reduce((sum, i) => sum + (i.qty * i.price), 0);
  const categories = ['All', 'Material', 'Tools', 'Safety', 'Fuel/Oil', 'Spare Parts'];

  const handleAddItem = () => {
    if(!isAdmin) return;
    if(!newItem.name) return alert("Item Name is required");
    push(ref(db, 'inventory_items'), { ...newItem, qty: Number(newItem.qty), minLevel: Number(newItem.minLevel), price: Number(newItem.price), lastUpdated: new Date().toISOString() });
    setNewItem({ name: '', category: 'Material', unit: 'Bags', qty: 0, minLevel: 10, price: 0 });
    setShowAddModal(false);
  };

  const handleDeleteItem = (id) => {
    if(!isAdmin) return;
    if(confirm("Delete this item permanently?")) remove(ref(db, `inventory_items/${id}`));
  };

  // --- NEW: DIRECT EDIT (CORRECTION) ---
  const handleDirectEdit = (item) => {
    if(!isAdmin) return;
    const newQty = prompt(`CORRECTION MODE:\nEnter correct actual stock for ${item.name}:`, item.qty);
    if(newQty !== null && !isNaN(newQty)) {
        update(ref(db, `inventory_items/${item.id}`), { qty: Number(newQty) });
        // Optional: Log the correction
        push(ref(db, 'inventory_logs'), {
            date: new Date().toISOString(),
            itemName: item.name,
            type: 'CORRECT',
            qty: Number(newQty),
            reason: 'Manual Correction',
            user: 'Admin'
        });
    }
  };

  // --- NEW: DELETE LOG ---
  const handleDeleteLog = (id) => {
    if(!isAdmin) return;
    if(confirm("Remove this log entry? (Note: This does NOT revert the stock count, only the history record).")) {
        remove(ref(db, `inventory_logs/${id}`));
    }
  };

  // --- NEW: CLEAR ALL HISTORY ---
  const handleClearHistory = () => {
    if(!isAdmin) return;
    if(confirm("⚠️ DANGER: This will wipe ALL transaction history logs permanently. Proceed?")) {
        remove(ref(db, 'inventory_logs'));
    }
  };

  // Stock In/Out Logic
  const openStockAction = (item, type) => {
    setStockAction({ item, type, qty: '', reason: type === 'OUT' ? sites[0] : 'Purchase' });
  };

  const submitStockAction = (e) => {
    e.preventDefault();
    if(!isAdmin) return;
    const { item, type, qty, reason } = stockAction;
    const quantity = Number(qty);
    if(quantity <= 0) return alert("Enter valid quantity");

    const newQty = type === 'IN' ? item.qty + quantity : item.qty - quantity;
    if(newQty < 0) return alert("Not enough stock!");

    update(ref(db, `inventory_items/${item.id}`), { qty: newQty, lastUpdated: new Date().toISOString() });
    push(ref(db, 'inventory_logs'), { date: new Date().toISOString(), itemId: item.id, itemName: item.name, type: type, qty: quantity, reason: reason, user: 'Admin' });
    setStockAction({ item: null, type: 'OUT', qty: '', reason: '' });
  };

  // ==========================================
  // 4. RENDER UI
  // ==========================================
  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800 animate-fade-in">
      
      {/* ADD ITEM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-black text-xl mb-4 uppercase text-slate-800">Add New Item</h3>
            <div className="space-y-3">
              <input placeholder="Item Name" className="w-full border p-2 rounded-lg font-bold" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <select className="border p-2 rounded-lg font-bold" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>{categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}</select>
                <input placeholder="Unit (e.g. Bags)" className="border p-2 rounded-lg font-bold" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Opening Stock" className="border p-2 rounded-lg font-bold" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: e.target.value})} />
                <input type="number" placeholder="Alert Level" className="border p-2 rounded-lg font-bold text-red-500" value={newItem.minLevel} onChange={e => setNewItem({...newItem, minLevel: e.target.value})} />
              </div>
              <input type="number" placeholder="Price (₹)" className="w-full border p-2 rounded-lg font-bold" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              <div className="flex gap-2 mt-4"><button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Cancel</button><button onClick={handleAddItem} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold">Save</button></div>
            </div>
          </div>
        </div>
      )}

      {/* STOCK IN/OUT MODAL */}
      {stockAction.item && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={submitStockAction} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className={`p-4 text-white flex justify-between items-center ${stockAction.type === 'IN' ? 'bg-green-600' : 'bg-red-600'}`}>
               <h3 className="font-black text-lg uppercase flex items-center gap-2">{stockAction.type === 'IN' ? <ArrowDownLeft/> : <ArrowUpRight/>} {stockAction.type === 'IN' ? 'Add Stock' : 'Issue Stock'}</h3>
               <button type="button" onClick={() => setStockAction({ ...stockAction, item: null })}><X size={24}/></button>
            </div>
            <div className="p-6 space-y-4">
               <div className="text-center"><h2 className="text-2xl font-black">{stockAction.item.name}</h2><p className="font-bold text-slate-500">Current: {stockAction.item.qty} {stockAction.item.unit}</p></div>
               <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl"><input autoFocus type="number" placeholder="Qty" className="flex-1 bg-transparent text-xl font-black text-center outline-none" value={stockAction.qty} onChange={e => setStockAction({...stockAction, qty: e.target.value})} /><span className="font-bold text-slate-400 pr-4">{stockAction.item.unit}</span></div>
               <div>
                 <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{stockAction.type === 'IN' ? 'Supplier' : 'Site / Destination'}</label>
                 {stockAction.type === 'OUT' ? <select className="w-full border p-2 rounded-lg font-bold" value={stockAction.reason} onChange={e => setStockAction({...stockAction, reason: e.target.value})}>{sites.map(s => <option key={s}>{s}</option>)}</select> : <input className="w-full border p-2 rounded-lg font-bold" placeholder="Reason/Supplier" value={stockAction.reason} onChange={e => setStockAction({...stockAction, reason: e.target.value})} />}
               </div>
               <button className={`w-full py-3 rounded-xl font-bold text-white shadow-lg ${stockAction.type === 'IN' ? 'bg-green-600' : 'bg-red-600'}`}>Confirm</button>
            </div>
          </form>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><Package className="text-orange-500"/> Inventory</h2>
           <p className="text-xs font-bold text-slate-400 uppercase">Stock & Material Management</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setShowLogModal(!showLogModal)} className={`p-2 rounded-xl border ${showLogModal ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`} title="History Logs"><History size={20}/></button>
           <button onClick={() => setViewMode(viewMode==='grid'?'list':'grid')} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500" title="Toggle View">{viewMode === 'grid' ? <List size={20}/> : <LayoutGrid size={20}/>}</button>
           {isAdmin && <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-black flex items-center gap-2"><Plus size={18}/> <span className="hidden sm:inline">Add Item</span></button>}
        </div>
      </div>

      {/* --- STATS BAR --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase">Total Value</p><h3 className="text-xl font-black text-slate-800">₹{totalStockValue.toLocaleString()}</h3></div>
         <div className={`p-4 rounded-xl border shadow-sm ${lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}><p className={`text-[10px] font-bold uppercase ${lowStockCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>Low Stock Alerts</p><h3 className={`text-xl font-black ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{lowStockCount} Items</h3></div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 flex items-center gap-2">
            <Search className="text-slate-400" size={20}/>
            <input placeholder="Search items..." className="w-full outline-none font-bold text-slate-700 bg-transparent" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="bg-slate-100 text-xs font-bold p-2 rounded-lg outline-none" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select>
         </div>
      </div>

      {/* --- LOGS DRAWER (WITH DELETE) --- */}
      {showLogModal && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
           <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="font-bold text-xs uppercase text-slate-500">History Log</h4>
              <div className="flex gap-2">
                 {isAdmin && <button onClick={handleClearHistory} className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200">Clear History</button>}
                 <button onClick={() => setShowLogModal(false)}><X className="text-slate-400" size={16}/></button>
              </div>
           </div>
           <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left">
                 <thead className="bg-white text-slate-400 font-bold sticky top-0">
                    <tr><th className="p-3">Date</th><th className="p-3">Item</th><th className="p-3">Type</th><th className="p-3">Reason</th><th className="p-3 text-center">Act</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {logs.map(log => (
                       <tr key={log.id} className="group hover:bg-slate-50">
                          <td className="p-3 text-slate-500 font-bold">{new Date(log.date).toLocaleDateString()}</td>
                          <td className="p-3 font-bold text-slate-800">{log.itemName} <span className="text-slate-400 font-normal">({log.qty})</span></td>
                          <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${log.type === 'IN' ? 'bg-green-100 text-green-700' : log.type === 'CORRECT' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{log.type}</span></td>
                          <td className="p-3 font-bold text-slate-600">{log.reason}</td>
                          <td className="p-3 text-center">{isAdmin && <button onClick={()=>handleDeleteLog(log.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* --- INVENTORY GRID --- */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const isLow = item.qty <= item.minLevel;
            return (
              <div key={item.id} className={`bg-white rounded-2xl p-5 border-2 shadow-sm transition-all hover:shadow-md relative group ${isLow ? 'border-red-100' : 'border-slate-100'}`}>
                 {isLow && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl rounded-tr-xl flex items-center gap-1"><AlertTriangle size={10}/> Low</div>}
                 
                 <div className="flex justify-between items-start mb-2">
                    <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category}</span><h3 className="font-black text-lg text-slate-800 leading-tight">{item.name}</h3></div>
                    {isAdmin && (
                        <div className="flex gap-1">
                            <button onClick={() => handleDirectEdit(item)} className="text-slate-200 hover:text-blue-500" title="Correction"><Edit3 size={16}/></button>
                            <button onClick={() => handleDeleteItem(item.id)} className="text-slate-200 hover:text-red-400" title="Delete"><Trash2 size={16}/></button>
                        </div>
                    )}
                 </div>

                 <div className="flex items-baseline gap-1 my-3">
                    <span className={`text-3xl font-black ${item.qty === 0 ? 'text-slate-300' : 'text-slate-800'}`}>{item.qty}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">{item.unit}</span>
                 </div>

                 <div className="flex gap-2 mt-4">
                    <button onClick={() => openStockAction(item, 'IN')} disabled={!isAdmin} className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg font-black text-xs hover:bg-green-100 flex items-center justify-center gap-1 disabled:opacity-50"><Plus size={14}/> ADD</button>
                    <button onClick={() => openStockAction(item, 'OUT')} disabled={!isAdmin || item.qty <= 0} className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-black text-xs hover:bg-black flex items-center justify-center gap-1 disabled:opacity-50 disabled:bg-slate-300"><Minus size={14}/> USE</button>
                 </div>
              </div>
            )
          })}
        </div>
      ) : (
        // LIST VIEW
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
           <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                 <tr><th className="p-4">Item Name</th><th className="p-4">Category</th><th className="p-4 text-center">Stock</th><th className="p-4 text-right">Value</th><th className="p-4 text-center">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                       <td className="p-4 font-bold text-slate-800 flex items-center gap-2">{item.name} {item.qty <= item.minLevel && <AlertTriangle size={14} className="text-red-500"/>}</td>
                       <td className="p-4 text-slate-500 font-bold text-xs">{item.category}</td>
                       <td className="p-4 text-center"><span className="font-black text-slate-800">{item.qty}</span> <span className="text-xs text-slate-400">{item.unit}</span></td>
                       <td className="p-4 text-right font-bold text-slate-600">₹{(item.qty * item.price).toLocaleString()}</td>
                       <td className="p-4 flex justify-center gap-2">
                          <button onClick={() => handleDirectEdit(item)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Correct Stock"><Edit3 size={14}/></button>
                          <button onClick={() => openStockAction(item, 'IN')} disabled={!isAdmin} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"><Plus size={14}/></button>
                          <button onClick={() => openStockAction(item, 'OUT')} disabled={!isAdmin || item.qty <= 0} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"><Minus size={14}/></button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}