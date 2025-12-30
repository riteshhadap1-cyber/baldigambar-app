import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Printer, Save, Download, Settings, 
  FileText, User, Search, Copy, Check, ChevronDown, 
  Share2, Upload, Calendar, X, Lock 
} from 'lucide-react';
// FIREBASE IMPORTS
import { db } from './firebase-config';
import { ref, onValue, push, set, update, remove } from 'firebase/database';

export default function BillingSystem({ isAdmin }) { // <--- RECEIVES ADMIN PROP
  
  // ==========================================
  // 1. DATABASE & STATE (CLOUD CONNECTED)
  // ==========================================
  
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [bizProfile, setBizProfile] = useState({
    name: 'BALDIGAMBAR ENTERPRISES',
    tagline: 'Earthmovers • Material Suppliers • Civil Contracts',
    address: 'Mauli niwas, Ganegoan Chinchawali, Karjat',
    mobile: '9923465353',
    terms: 'Subject to Karjat Jurisdiction.',
    signature: null
  });

  // Form State
  const [formData, setFormData] = useState({
    id: Date.now(),
    billNo: 101,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: 'TAX INVOICE', 
    client: { name: '', address: '', gstin: '', mobile: '' },
    items: [{ id: 1, desc: '', hsn: '', qty: 1, rate: 0, amount: 0 }],
    isGst: false,
    gstRate: 18,
    advances: 0,
    discount: 0, 
    discountReason: '',
    paymentMode: 'Cash'
  });

  const [activeTab, setActiveTab] = useState('create'); 
  const [showStamp, setShowStamp] = useState(true);

  // ==========================================
  // 2. LIVE CLOUD CONNECTION
  // ==========================================
  useEffect(() => {
    // 1. Listen to Invoices
    onValue(ref(db, 'invoices'), (snapshot) => {
      const data = snapshot.val();
      const loaded = data ? Object.keys(data).map(key => ({ firebaseId: key, ...data[key] })) : [];
      // Sort by Bill No descending
      loaded.sort((a,b) => b.billNo - a.billNo);
      setInvoices(loaded);
      
      // Auto-set next Bill Number if in Create Mode
      if(activeTab === 'create' && loaded.length > 0) {
        const maxNo = Math.max(...loaded.map(i => Number(i.billNo) || 0));
        setFormData(prev => ({ ...prev, billNo: maxNo + 1 }));
      }
    });

    // 2. Listen to Clients
    onValue(ref(db, 'clients'), (snapshot) => {
      const data = snapshot.val();
      setClients(data ? Object.values(data) : []);
    });

    // 3. Listen to Business Profile
    onValue(ref(db, 'biz_profile'), (snapshot) => {
      const data = snapshot.val();
      if(data) setBizProfile(data);
    });
  }, [activeTab]);

  // ==========================================
  // 3. CALCULATIONS
  // ==========================================

  const subTotal = formData.items.reduce((sum, item) => sum + Number(item.amount), 0);
  const gstAmount = formData.isGst ? (subTotal * (formData.gstRate / 100)) : 0;
  const totalBeforeDiscount = subTotal + gstAmount;
  const discountAmount = Number(formData.discount) || 0;
  const grandTotal = Math.round(Math.max(0, totalBeforeDiscount - discountAmount));
  const balanceDue = grandTotal - Number(formData.advances);

  const numToWords = (num) => {
    const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; 
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only ' : '';
    return str;
  };

  // ==========================================
  // 4. ACTIONS (PROTECTED)
  // ==========================================

  const handleItemChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const newItem = { ...item, [field]: value };
          if (field === 'qty' || field === 'rate') {
            newItem.amount = newItem.qty * newItem.rate;
          }
          return newItem;
        }
        return item;
      })
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), desc: '', hsn: '', qty: 1, rate: 0, amount: 0 }]
    }));
  };

  const removeItem = (id) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
    }
  };

  const saveInvoice = () => {
    if (!isAdmin) return; // Lock
    if (!formData.client.name) return alert("Please enter client name");

    // 1. Save Client if new
    const existingClient = clients.find(c => c.name === formData.client.name);
    if (!existingClient) {
      push(ref(db, 'clients'), { ...formData.client, id: Date.now() });
    }
    
    // 2. Save/Update Invoice to Cloud
    // Check if we are editing an existing firebase entry
    if (formData.firebaseId) {
       update(ref(db, `invoices/${formData.firebaseId}`), formData);
    } else {
       push(ref(db, 'invoices'), formData);
    }
    
    alert("Invoice Saved to Cloud!");
    
    // Reset Form
    const maxNo = Math.max(...invoices.map(i => Number(i.billNo) || 0));
    setFormData({
      id: Date.now(),
      billNo: maxNo + 1,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      type: 'TAX INVOICE', 
      client: { name: '', address: '', gstin: '', mobile: '' },
      items: [{ id: Date.now(), desc: '', hsn: '', qty: 1, rate: 0, amount: 0 }],
      isGst: false, gstRate: 18, advances: 0, discount: 0, discountReason: '', paymentMode: 'Cash'
    });
  };

  const saveSettings = () => {
    if (!isAdmin) return;
    set(ref(db, 'biz_profile'), bizProfile);
    alert("Settings Saved to Cloud!");
  };

  const selectClient = (clientName) => {
    const client = clients.find(c => c.name === clientName);
    if (client) {
      setFormData(prev => ({ ...prev, client: { ...client } }));
    }
  };

  const handleSignatureUpload = (e) => {
    if (!isAdmin) return;
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBizProfile(prev => ({ ...prev, signature: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const shareOnWhatsApp = (inv) => {
    const total = Math.round(inv.items.reduce((s,i)=>s+i.amount,0) + (inv.isGst ? inv.items.reduce((s,i)=>s+i.amount,0)*0.18 : 0) - (inv.discount || 0));
    const text = `Hello ${inv.client.name},%0A%0AHere is your Invoice *#${inv.billNo}* from ${bizProfile.name}.%0A%0ADate: ${inv.date}%0AAmount: *₹${total.toLocaleString()}*%0A%0APlease pay by due date.%0A%0AThank you!`;
    window.open(`https://wa.me/${inv.client.mobile}?text=${text}`, '_blank');
  };

  // ==========================================
  // 5. UI RENDER
  // ==========================================
  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800 animate-fade-in">
      
      <style>{`
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        @media print {
          aside, nav, header, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
          body { background: white !important; }
          .print-area { display: block !important; padding: 0 !important; }
          .input-print { border: none !important; padding: 0 !important; background: transparent !important; }
        }
      `}</style>

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          <button onClick={() => setActiveTab('create')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'create' ? 'bg-orange-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Create Bill</button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'history' ? 'bg-orange-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>History</button>
          {isAdmin && <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'settings' ? 'bg-orange-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}><Settings size={16}/></button>}
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-black">
          <Printer size={18}/> Print Invoice
        </button>
      </div>

      {/* --- TAB: SETTINGS (ADMIN ONLY) --- */}
      {activeTab === 'settings' && isAdmin && (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-3xl mx-auto animate-fade-in">
          <h3 className="text-xl font-black uppercase text-gray-800 mb-6 border-b pb-2">Business Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div><label className="text-xs font-bold text-gray-400 uppercase">Company Name</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold focus:border-orange-500 outline-none" value={bizProfile.name} onChange={e => setBizProfile({...bizProfile, name: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase">Tagline</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold focus:border-orange-500 outline-none" value={bizProfile.tagline} onChange={e => setBizProfile({...bizProfile, tagline: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Address</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold focus:border-orange-500 outline-none" value={bizProfile.address} onChange={e => setBizProfile({...bizProfile, address: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase">Mobile</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold focus:border-orange-500 outline-none" value={bizProfile.mobile} onChange={e => setBizProfile({...bizProfile, mobile: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase">GSTIN</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold focus:border-orange-500 outline-none" value={bizProfile.gstin} onChange={e => setBizProfile({...bizProfile, gstin: e.target.value})} /></div>
          </div>
          
          <h3 className="text-xl font-black uppercase text-gray-800 mb-4 mt-8 border-b pb-2">Bank Details & Signature</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div><label className="text-xs font-bold text-gray-400 uppercase">Bank Name</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold focus:border-orange-500 outline-none" value={bizProfile.bankName} onChange={e => setBizProfile({...bizProfile, bankName: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase">Account No</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold focus:border-orange-500 outline-none" value={bizProfile.accNo} onChange={e => setBizProfile({...bizProfile, accNo: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase">IFSC Code</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold focus:border-orange-500 outline-none" value={bizProfile.ifsc} onChange={e => setBizProfile({...bizProfile, ifsc: e.target.value})} /></div>
          </div>

          <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
             <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 mb-2"><Upload size={14}/> Upload Signature (Image)</label>
             <input type="file" accept="image/*" onChange={handleSignatureUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"/>
             {bizProfile.signature && <img src={bizProfile.signature} alt="Sig" className="h-16 mt-2 border border-slate-300 bg-white p-1 rounded" />}
          </div>
          
          <button onClick={saveSettings} className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-black w-full">Save Settings to Cloud</button>
        </div>
      )}

      {/* --- TAB: HISTORY --- */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-gray-500 uppercase font-bold text-xs border-b border-gray-200">
              <tr><th className="p-4">Bill No</th><th className="p-4">Date</th><th className="p-4">Client</th><th className="p-4 text-right">Amount</th><th className="p-4 text-center">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => {
                const total = Math.round(inv.items.reduce((s,i)=>s+i.amount,0) + (inv.isGst ? inv.items.reduce((s,i)=>s+i.amount,0)*0.18 : 0) - (inv.discount||0));
                return (
                  <tr key={inv.id} className="hover:bg-orange-50 transition-colors">
                    <td className="p-4 font-bold text-slate-700">#{inv.billNo}</td>
                    <td className="p-4 font-medium text-gray-500">{inv.date}</td>
                    <td className="p-4 font-bold text-gray-800">{inv.client.name}</td>
                    <td className="p-4 text-right font-black text-emerald-600">₹{total.toLocaleString()}</td>
                    <td className="p-4 text-center flex justify-center gap-3">
                      <button onClick={() => {setFormData(inv); setActiveTab('create');}} className="text-orange-600 font-bold hover:underline flex items-center gap-1"><FileText size={16}/> View/Edit</button>
                      <button onClick={() => shareOnWhatsApp(inv)} className="text-green-600 font-bold hover:underline flex items-center gap-1"><Share2 size={16}/> WhatsApp</button>
                      {isAdmin && <button onClick={() => { if(confirm('Delete?')) remove(ref(db, `invoices/${inv.firebaseId}`)); }} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>}
                    </td>
                  </tr>
                )
              })}
              {invoices.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400 italic">No invoices found on cloud.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAB: CREATE INVOICE --- */}
      {activeTab === 'create' && (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT: CONTROLS (HIDDEN FOR FAMILY IF YOU WANT, OR READ ONLY) */}
          <div className="lg:w-1/3 space-y-4 no-print animate-fade-in">
            {isAdmin ? (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-slate-700 uppercase mb-4 flex items-center gap-2"><Settings size={16}/> Invoice Details</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><label className="text-xs font-bold text-gray-400 uppercase">Bill Type</label><select className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold bg-white focus:border-orange-500 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option>TAX INVOICE</option><option>QUOTATION</option><option>DELIVERY CHALLAN</option></select></div>
                  <div><label className="text-xs font-bold text-gray-400 uppercase">Date</label><input type="date" className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold bg-white focus:border-orange-500 outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                </div>
                <div className="mb-4 relative">
                  <label className="text-xs font-bold text-gray-400 uppercase">Client Name</label>
                  <div className="flex gap-2">
                    <input type="text" list="clientList" placeholder="Search Client..." className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold focus:border-orange-500 outline-none" value={formData.client.name} onChange={e => { setFormData({...formData, client: { ...formData.client, name: e.target.value }}); }} />
                    <datalist id="clientList">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
                    <button onClick={() => selectClient(formData.client.name)} className="bg-orange-100 text-orange-600 p-2.5 rounded-lg hover:bg-orange-200"><Search size={20}/></button>
                  </div>
                </div>
                <div className="mb-4"><label className="text-xs font-bold text-gray-400 uppercase">Address</label><textarea rows="2" className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold text-sm focus:border-orange-500 outline-none" value={formData.client.address} onChange={e => setFormData({...formData, client: { ...formData.client, address: e.target.value }})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-400 uppercase">Mobile</label><input className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold focus:border-orange-500 outline-none" value={formData.client.mobile} onChange={e => setFormData({...formData, client: { ...formData.client, mobile: e.target.value }})} /></div>
                  <div><label className="text-xs font-bold text-gray-400 uppercase">GSTIN</label><input className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold focus:border-orange-500 outline-none" value={formData.client.gstin} onChange={e => setFormData({...formData, client: { ...formData.client, gstin: e.target.value }})} /></div>
                </div>

                {/* CALCULATIONS BOX */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-700 uppercase text-sm">Calculations</h4>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100">
                        <input type="checkbox" checked={showStamp} onChange={e => setShowStamp(e.target.checked)} className="accent-orange-600 w-4 h-4"/>
                        <span className="text-xs font-bold text-slate-600 uppercase">Stamp</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100">
                        <input type="checkbox" checked={formData.isGst} onChange={e => setFormData({...formData, isGst: e.target.checked})} className="accent-orange-600 w-4 h-4"/>
                        <span className="text-xs font-bold text-slate-600 uppercase">GST 18%</span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                    <label className="text-xs font-bold text-yellow-700 uppercase">Discount / Offer</label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <input type="text" placeholder="Reason" className="bg-white border border-yellow-200 p-2 rounded-lg font-bold text-xs" value={formData.discountReason} onChange={e => setFormData({...formData, discountReason: e.target.value})} />
                      <input type="number" placeholder="Amt" className="bg-white border border-yellow-200 p-2 rounded-lg font-bold text-yellow-800" value={formData.discount} onChange={e => setFormData({...formData, discount: Number(e.target.value)})} />
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-green-50 p-4 rounded-xl border border-green-100">
                    <label className="text-xs font-bold text-green-700 uppercase">Less: Advance / Paid</label>
                    <input type="number" className="w-full bg-white border border-green-200 p-2.5 rounded-lg font-bold mt-2 text-green-800 focus:outline-none" value={formData.advances} onChange={e => setFormData({...formData, advances: Number(e.target.value)})} />
                  </div>

                  <button onClick={saveInvoice} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold mt-6 flex items-center justify-center gap-2 hover:bg-black shadow-lg shadow-slate-900/20 transition-all">
                    <Save size={18}/> Save to Cloud
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                <Lock className="mx-auto text-slate-300 mb-2" size={40} />
                <p className="font-bold text-slate-500">Editing Locked</p>
                <p className="text-xs text-slate-400">Login as Admin to create bills.</p>
              </div>
            )}
          </div>

          {/* RIGHT: INVOICE PREVIEW (Pure White for Print) */}
          <div className="lg:w-2/3 bg-slate-100 p-4 lg:p-8 rounded-2xl overflow-auto print:p-0 print:bg-white print:w-full print:rounded-none flex justify-center">
            
            {/* PAPER */}
            <div className="bg-white w-[210mm] min-h-[297mm] p-[10mm] shadow-xl print:shadow-none print:m-0 relative flex flex-col print-area">
              
              {/* STAMP */}
              {showStamp && (
                balanceDue <= 0 ? (
                  <div className="absolute top-[40%] left-[40%] border-4 border-green-600 text-green-600 text-6xl font-black opacity-20 transform -rotate-45 p-4 rounded-xl pointer-events-none">PAID</div>
                ) : (
                  <div className="absolute top-[40%] left-[35%] border-4 border-red-600 text-red-600 text-6xl font-black opacity-20 transform -rotate-45 p-4 rounded-xl pointer-events-none">UNPAID</div>
                )
              )}

              {/* HEADER */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
                <div className="w-2/3">
                  <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{bizProfile.name}</h1>
                  <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mt-1">{bizProfile.tagline}</p>
                  <div className="mt-3 text-sm text-slate-600 leading-tight font-medium">
                    <p>{bizProfile.address}</p>
                    <p>Mob: <b>{bizProfile.mobile}</b></p>
                    {bizProfile.gstin && <p>GSTIN: <b>{bizProfile.gstin}</b></p>}
                  </div>
                </div>
                <div className="w-1/3 text-right">
                  <div className="bg-slate-100 border border-slate-200 px-4 py-1.5 inline-block mb-3 rounded-lg print:border-slate-900 print:bg-white print:rounded-none">
                    <h2 className="text-lg font-black uppercase text-slate-900 tracking-widest">{formData.type}</h2>
                  </div>
                  <div className="text-sm">
                    <div className="flex justify-end gap-4"><span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider pt-0.5">Invoice No:</span> <span className="font-black text-lg">#{formData.billNo}</span></div>
                    <div className="flex justify-end gap-4"><span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider pt-0.5">Date:</span> <span className="font-bold">{new Date(formData.date).toLocaleDateString('en-IN')}</span></div>
                    <div className="flex justify-end gap-4"><span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider pt-0.5">Due Date:</span> <span className="font-bold text-red-600">{new Date(formData.dueDate).toLocaleDateString('en-IN')}</span></div>
                  </div>
                </div>
              </div>

              {/* CLIENT INFO */}
              <div className="border border-slate-200 rounded-lg p-4 mb-6 bg-slate-50 print:bg-transparent print:border-slate-800 print:rounded-none">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bill To</p>
                <h3 className="text-xl font-black uppercase text-slate-900">{formData.client.name || 'CASH CLIENT'}</h3>
                <p className="text-sm font-medium text-slate-600 mt-1">{formData.client.address}</p>
                <div className="flex gap-6 mt-2 text-sm">
                  {formData.client.gstin && <span>GSTIN: <b className="text-slate-800">{formData.client.gstin}</b></span>}
                  {formData.client.mobile && <span>Mob: <b className="text-slate-800">{formData.client.mobile}</b></span>}
                </div>
              </div>

              {/* TABLE */}
              <div className="flex-1">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-50 text-slate-800 uppercase text-[10px] font-bold border-y-2 border-slate-900 print:bg-white">
                    <tr>
                      <th className="p-2 text-center w-12 border-r border-slate-300">Sr</th>
                      <th className="p-2 text-left border-r border-slate-300">Description of Goods / Service</th>
                      <th className="p-2 text-center w-16 border-r border-slate-300">HSN</th>
                      <th className="p-2 text-center w-16 border-r border-slate-300">Qty</th>
                      <th className="p-2 text-right w-24 border-r border-slate-300">Rate</th>
                      <th className="p-2 text-right w-28">Amount</th>
                      <th className="w-8 no-print bg-white border-none"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={item.id} className="border-b border-slate-200 print:border-slate-300">
                        <td className="p-2 text-center border-r border-slate-300 align-top font-medium">{index + 1}</td>
                        <td className="p-2 border-r border-slate-300 align-top">
                          <input disabled={!isAdmin} className="w-full bg-transparent outline-none font-bold text-slate-800" placeholder="Item Name" value={item.desc} onChange={e => handleItemChange(item.id, 'desc', e.target.value)} />
                        </td>
                        <td className="p-2 text-center border-r border-slate-300 align-top">
                          <input disabled={!isAdmin} className="w-full bg-transparent outline-none text-center font-medium" placeholder="-" value={item.hsn} onChange={e => handleItemChange(item.id, 'hsn', e.target.value)} />
                        </td>
                        <td className="p-2 text-center border-r border-slate-300 align-top">
                          <input disabled={!isAdmin} type="number" className="w-full bg-transparent outline-none text-center font-bold text-slate-800" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', e.target.value)} />
                        </td>
                        <td className="p-2 text-right border-r border-slate-300 align-top">
                          <input disabled={!isAdmin} type="number" className="w-full bg-transparent outline-none text-right font-bold text-slate-800" value={item.rate} onChange={e => handleItemChange(item.id, 'rate', e.target.value)} />
                        </td>
                        <td className="p-2 text-right font-black align-top text-slate-900">₹{Number(item.amount).toLocaleString()}</td>
                        <td className="p-2 text-center no-print border-none">
                            {isAdmin && <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {isAdmin && <button onClick={addItem} className="no-print mt-3 text-xs font-bold text-white bg-slate-800 px-3 py-1 rounded-full hover:bg-black flex items-center gap-1 w-fit"><Plus size={10}/> Add Item</button>}
              </div>

              {/* TOTALS & FOOTER */}
              <div className="mt-auto border-t-2 border-slate-900 pt-3">
                <div className="flex gap-6">
                  {/* Left Footer: Words & Banks */}
                  <div className="w-2/3 text-xs">
                    <div className="font-bold text-slate-400 uppercase mb-1 text-[10px] tracking-wider">Amount in Words</div>
                    <div className="italic font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3 text-sm">{numToWords(grandTotal)}</div>
                    
                    {bizProfile.bankName && (
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 print:bg-white print:border-slate-800">
                        <p className="font-black text-[10px] text-slate-600 uppercase mb-1">Bank Details</p>
                        <p>Bank: <b className="text-slate-900">{bizProfile.bankName}</b></p>
                        <p>A/c No: <b className="text-slate-900">{bizProfile.accNo}</b> &nbsp; IFSC: <b className="text-slate-900">{bizProfile.ifsc}</b></p>
                      </div>
                    )}
                    <div className="mt-3 text-[10px] text-slate-500 leading-tight">
                      <p className="font-bold uppercase text-slate-700">Terms & Conditions:</p>
                      <p className="whitespace-pre-wrap">{bizProfile.terms}</p>
                    </div>
                  </div>

                  {/* Right Footer: Totals & Sign */}
                  <div className="w-1/3 flex flex-col justify-between">
                    <div className="space-y-1 text-sm text-right">
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Sub Total</span><span className="font-bold text-slate-800">₹{subTotal.toLocaleString()}</span></div>
                      {formData.isGst && (
                        <>
                          <div className="flex justify-between"><span className="text-slate-500 text-xs">CGST (9%)</span><span className="text-slate-600">₹{(gstAmount/2).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 text-xs">SGST (9%)</span><span className="text-slate-600">₹{(gstAmount/2).toLocaleString()}</span></div>
                        </>
                      )}
                      
                      {formData.discount > 0 && (
                        <div className="flex justify-between text-yellow-700 font-bold border-t border-dashed pt-1">
                          <span>Discount</span>
                          <span>- ₹{formData.discount}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-xl font-black border-t-2 border-slate-900 pt-2 mt-2 text-slate-900"><span>TOTAL</span><span>₹{grandTotal.toLocaleString()}</span></div>
                      {formData.advances > 0 && <div className="flex justify-between text-xs text-emerald-600 font-bold border-b pb-1 pt-2"><span>Less: Paid</span><span>- ₹{formData.advances}</span></div>}
                      {formData.advances > 0 && <div className="flex justify-between text-base font-black pt-1 text-slate-800"><span>Balance</span><span>₹{balanceDue.toLocaleString()}</span></div>}
                    </div>

                    <div className="mt-12 text-center">
                      <p className="text-[10px] font-bold uppercase mb-4 text-slate-600">For, {bizProfile.name}</p>
                      {bizProfile.signature ? (
                         <img src={bizProfile.signature} alt="Sig" className="h-12 mx-auto mb-1" />
                      ) : (
                         <div className="h-12"></div> 
                      )}
                      <p className="border-t border-slate-400 w-3/4 mx-auto pt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}