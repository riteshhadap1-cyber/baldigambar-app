import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Printer, Save, Settings, FileText, 
  Search, Share2, Upload, Lock, Minimize, Maximize, FileType,
  Filter, CheckCircle, Clock, Download, RefreshCw
} from 'lucide-react';

// FIREBASE IMPORTS
import { db } from './firebase-config';
import { 
  ref, onValue, push, set, update, remove, query, limitToLast 
} from 'firebase/database';

export default function BillingSystem({ isAdmin }) { 
  
  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  
  const [bizProfile, setBizProfile] = useState({
    name: 'बालदिगंबर इंटरप्राइजेस', 
    tagline: 'जय अंबे बिल्डिंग मटेरियल सप्लायर्स',
    address: 'मु. गणेशगाव - चिंचवली, पो. कडाव, ता. कर्जत, जि. रायगड.',
    mobile: '9923465353', 
    terms: '', 
    signature: null
  });

  const [formData, setFormData] = useState({
    id: Date.now(),
    billNo: 101,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: 'TAX INVOICE', 
    client: { name: '', address: '', gstin: '', mobile: '' },
    items: [{ id: `${Date.now()}-0`, date: '', gadiNo: '', desc: '', brass: 0, trip: 0, rate: 0, amount: 0 }],
    isGst: false,
    gstRate: 18,
    advances: 0,
    discount: 0, 
    discountReason: '',
    paymentMode: 'Cash'
  });

  const [activeTab, setActiveTab] = useState('create'); 
  const [showStamp, setShowStamp] = useState(true);
  const [paperSize, setPaperSize] = useState('A4');
  const [historyFilter, setHistoryFilter] = useState('All'); // All, Paid, Pending
  
  // Letterhead State
  const [letterContent, setLetterContent] = useState('');

  // ==========================================
  // 2. FIREBASE CONNECTION
  // ==========================================
  useEffect(() => {
    const invoicesRef = query(ref(db, 'invoices'), limitToLast(100));
    const unsubInvoices = onValue(invoicesRef, (snapshot) => {
      const data = snapshot.val();
      const loadedInvoices = data ? Object.keys(data).map(key => ({ firebaseId: key, ...data[key] })) : [];
      loadedInvoices.sort((a,b) => b.billNo - a.billNo);
      setInvoices(loadedInvoices);
      
      if(activeTab === 'create' && loadedInvoices.length > 0) {
        const maxBillNo = Math.max(...loadedInvoices.map(i => Number(i.billNo) || 0));
        setFormData(prev => ({ ...prev, billNo: maxBillNo + 1 }));
      }
    });

    const clientsRef = ref(db, 'clients');
    const unsubClients = onValue(clientsRef, (snap) => setClients(snap.val() ? Object.values(snap.val()) : []));

    const profileRef = ref(db, 'biz_profile');
    const unsubProfile = onValue(profileRef, (snap) => { if(snap.val()) setBizProfile(snap.val()); });

    return () => { unsubInvoices(); unsubClients(); unsubProfile(); };
  }, [activeTab]);

  // ==========================================
  // 3. CALCULATIONS & HELPERS
  // ==========================================
  const calculateTotal = (inv) => {
    const items = inv.items || [];
    const sub = items.reduce((s, i) => s + Number(i.amount), 0);
    const gst = inv.isGst ? (sub * (inv.gstRate || 18) / 100) : 0;
    const discount = Number(inv.discount) || 0;
    return Math.round(Math.max(0, sub + gst - discount));
  };

  const getBalance = (inv) => {
    const total = calculateTotal(inv);
    const paid = Number(inv.advances) || 0;
    return total - paid;
  };

  // Current Form Calculations
  const subTotal = formData.items.reduce((sum, item) => sum + Number(item.amount), 0);
  const gstAmount = formData.isGst ? (subTotal * (formData.gstRate / 100)) : 0;
  const totalBeforeDiscount = subTotal + gstAmount;
  const discountAmount = Number(formData.discount) || 0;
  const grandTotal = Math.round(Math.max(0, totalBeforeDiscount - discountAmount));
  const balanceDue = grandTotal - Number(formData.advances);

  // Number to Words
  const numToWords = (num) => {
    if (num === 0) return "Zero";
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

  // Auto Resize Textarea
  const AutoResizeTextarea = ({ value, onChange, placeholder, disabled }) => {
    const textareaRef = useRef(null);
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
    }, [value]);
    return (
      <textarea
        ref={textareaRef}
        disabled={disabled}
        rows={1}
        className="w-full bg-transparent outline-none font-bold text-black text-sm resize-none p-1 leading-relaxed overflow-hidden"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{ minHeight: '3rem' }} 
      />
    );
  };

  // ==========================================
  // 4. ACTIONS
  // ==========================================
  const handleItemChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const newItem = { ...item, [field]: value };
          if (['brass','trip','rate'].includes(field)) {
            const brassVal = Number(field === 'brass' ? value : newItem.brass || 0);
            const tripVal = Number(field === 'trip' ? value : newItem.trip || 0);
            const rateVal = Number(field === 'rate' ? value : newItem.rate || 0);
            const quantity = brassVal > 0 ? brassVal : tripVal;
            newItem.amount = quantity * rateVal;
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
      items: [...prev.items, { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, date: '', gadiNo: '', desc: '', brass: 0, trip: 0, rate: 0, amount: 0 }]
    }));
  };

  const removeItem = (id) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
    }
  };

  const saveInvoice = () => {
    if (!isAdmin) return;
    if (!formData.client.name) return alert("Please enter client name");

    const existingClient = clients.find(c => c.name === formData.client.name);
    if (!existingClient) push(ref(db, 'clients'), { ...formData.client, id: Date.now() });
    
    if (formData.firebaseId) {
       update(ref(db, `invoices/${formData.firebaseId}`), formData);
    } else {
       push(ref(db, 'invoices'), formData);
    }
    alert("Invoice Saved Successfully!");
    
    const maxNo = Math.max(...invoices.map(i => Number(i.billNo) || 0));
    setFormData({
      id: Date.now(),
      billNo: maxNo + 1,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      type: 'TAX INVOICE', 
      client: { name: '', address: '', gstin: '', mobile: '' },
      items: [{ id: `${Date.now()}-new`, date: '', gadiNo: '', desc: '', brass: 0, trip: 0, rate: 0, amount: 0 }],
      isGst: false, gstRate: 18, advances: 0, discount: 0, discountReason: '', paymentMode: 'Cash'
    });
  };

  const markAsPaid = (inv) => {
    if (!isAdmin) return;
    if (!confirm(`Mark Bill #${inv.billNo} as fully PAID?`)) return;
    
    const total = calculateTotal(inv);
    update(ref(db, `invoices/${inv.firebaseId}`), { advances: total });
  };

  const downloadHistoryCSV = () => {
    const headers = ["Bill No", "Date", "Client", "Total Amount", "Paid", "Balance", "Status"];
    
    const filteredRows = invoices.filter(inv => {
        const bal = getBalance(inv);
        if (historyFilter === 'Paid') return bal <= 0;
        if (historyFilter === 'Pending') return bal > 0;
        return true;
    });

    const rows = filteredRows.map(inv => {
        const total = calculateTotal(inv);
        const paid = Number(inv.advances) || 0;
        const bal = total - paid;
        return [inv.billNo, inv.date, inv.client.name, total, paid, bal, bal <= 0 ? "PAID" : "PENDING"];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Billing_Report_${historyFilter}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const saveSettings = () => {
    if (!isAdmin) return;
    set(ref(db, 'biz_profile'), bizProfile);
    alert("Settings Saved!");
  };

  const selectClient = (clientName) => {
    const client = clients.find(c => c.name === clientName);
    if (client) setFormData(prev => ({ ...prev, client: { ...client } }));
  };

  const handleSignatureUpload = (e) => {
    if (!isAdmin) return;
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBizProfile(prev => ({ ...prev, signature: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const shareOnWhatsApp = (inv) => {
    const total = calculateTotal(inv);
    const text = `Hello ${inv.client.name},%0A%0AHere is your Invoice *#${inv.billNo}* from ${bizProfile.name}.%0A%0ADate: ${inv.date}%0AAmount: *₹${total.toLocaleString()}*%0A%0APlease pay by due date.%0A%0AThank you!`;
    window.open(`https://wa.me/${inv.client.mobile}?text=${text}`, '_blank');
  };

  // ==========================================
  // 5. RENDER UI
  // ==========================================
  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800 animate-fade-in">
      
      {/* CRITICAL PRINT FIX */}
      <style>{`
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        
        @media print {
          body * { visibility: hidden; }
          .print-wrapper, .print-wrapper * { visibility: visible; }
          .print-wrapper { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white; z-index: 9999; }
          html, body { height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .border-red-600 { border-color: #dc2626 !important; }
          .text-red-600 { color: #dc2626 !important; }
          .bg-red-50 { background-color: #fef2f2 !important; }
          .no-print { display: none !important; }
          .print-content-visible { display: block !important; }
          .print-input-hidden { display: none !important; }
        }
      `}</style>

      {/* --- HEADER CONTROLS --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-x-auto w-full md:w-auto">
          <button onClick={() => setActiveTab('create')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'create' ? 'bg-orange-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Create Bill</button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'history' ? 'bg-orange-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>History</button>
          <button onClick={() => setActiveTab('letterhead')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap flex items-center gap-1 ${activeTab === 'letterhead' ? 'bg-orange-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}><FileType size={16}/> Letterhead</button>
          {isAdmin && <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'settings' ? 'bg-orange-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}><Settings size={16}/></button>}
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm items-center">
             <button onClick={() => setPaperSize('A4')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${paperSize === 'A4' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}><Maximize size={12}/> A4</button>
             <button onClick={() => setPaperSize('A5')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${paperSize === 'A5' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}><Minimize size={12}/> A5</button>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-black">
            <Printer size={18}/> Print
          </button>
        </div>
      </div>

      {/* --- SETTINGS TAB --- */}
      {activeTab === 'settings' && isAdmin && (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-3xl mx-auto animate-fade-in">
          <h3 className="text-xl font-black uppercase text-gray-800 mb-6 border-b pb-2">Business Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div><label className="text-xs font-bold text-gray-400 uppercase">Company Name</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold outline-none" value={bizProfile.name} onChange={e => setBizProfile({...bizProfile, name: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase">Tagline</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold outline-none" value={bizProfile.tagline} onChange={e => setBizProfile({...bizProfile, tagline: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Address</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold outline-none" value={bizProfile.address} onChange={e => setBizProfile({...bizProfile, address: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase">Mobile</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold outline-none" value={bizProfile.mobile} onChange={e => setBizProfile({...bizProfile, mobile: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase">GSTIN</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold outline-none" value={bizProfile.gstin} onChange={e => setBizProfile({...bizProfile, gstin: e.target.value})} /></div>
          </div>
          <h3 className="text-xl font-black uppercase text-gray-800 mb-4 mt-8 border-b pb-2">Bank & Sig</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div><label className="text-xs font-bold text-gray-400 uppercase">Bank</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold outline-none" value={bizProfile.bankName} onChange={e => setBizProfile({...bizProfile, bankName: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase">Acc No</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold outline-none" value={bizProfile.accNo} onChange={e => setBizProfile({...bizProfile, accNo: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-400 uppercase">IFSC</label><input className="w-full border-2 border-gray-100 p-3 rounded-lg font-bold outline-none" value={bizProfile.ifsc} onChange={e => setBizProfile({...bizProfile, ifsc: e.target.value})} /></div>
          </div>
          <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
             <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 mb-2"><Upload size={14}/> Signature</label>
             <div className="flex gap-2 items-center">
                <input type="file" accept="image/*" onChange={handleSignatureUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"/>
                {bizProfile.signature && <button onClick={() => setBizProfile(prev => ({...prev, signature: null}))} className="text-red-500 font-bold text-xs hover:bg-red-50 px-3 py-2 rounded-lg border border-red-200">Remove</button>}
             </div>
             {bizProfile.signature && <div className="mt-4 p-2 bg-white border border-slate-200 inline-block rounded"><img src={bizProfile.signature} alt="Sig" className="h-16" /></div>}
          </div>
          <button onClick={saveSettings} className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-black w-full">Save Settings</button>
        </div>
      )}

      {/* --- HISTORY TAB (UPDATED: Filters, Mark Paid, Download) --- */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
          
          {/* FILTER HEADER */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50">
             <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-500 uppercase flex items-center gap-1"><Filter size={16}/> Filter:</span>
                <select 
                  className="bg-white border border-gray-300 text-slate-700 font-bold text-sm rounded-lg p-2 outline-none focus:border-orange-500"
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                >
                  <option value="All">All Invoices</option>
                  <option value="Pending">Pending Only</option>
                  <option value="Paid">Paid Only</option>
                </select>
             </div>
             <button onClick={downloadHistoryCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-2">
               <Download size={16}/> Download List
             </button>
          </div>

          <table className="w-full text-sm text-left">
            <thead className="bg-white text-gray-500 uppercase font-bold text-xs border-b border-gray-200">
              <tr><th className="p-4">Bill No</th><th className="p-4">Date</th><th className="p-4">Client</th><th className="p-4 text-right">Amount</th><th className="p-4 text-center">Status</th><th className="p-4 text-center">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices
                .filter(inv => {
                   const bal = getBalance(inv);
                   if (historyFilter === 'Paid') return bal <= 0;
                   if (historyFilter === 'Pending') return bal > 0;
                   return true;
                })
                .map(inv => {
                const total = calculateTotal(inv);
                const balance = getBalance(inv);
                const isPaid = balance <= 0;

                return (
                  <tr key={inv.id} className="hover:bg-orange-50 transition-colors group">
                    <td className="p-4 font-bold text-slate-700">#{inv.billNo}</td>
                    <td className="p-4 font-medium text-gray-500">{inv.date}</td>
                    <td className="p-4 font-bold text-gray-800">{inv.client.name}</td>
                    <td className="p-4 text-right font-black text-slate-800">₹{total.toLocaleString()}</td>
                    <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase flex items-center justify-center gap-1 w-20 mx-auto ${isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                           {isPaid ? <CheckCircle size={12}/> : <Clock size={12}/>}
                           {isPaid ? 'PAID' : 'PENDING'}
                        </span>
                    </td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      {/* Mark Paid Button */}
                      {!isPaid && isAdmin && (
                         <button onClick={() => markAsPaid(inv)} className="bg-green-50 text-green-600 p-2 rounded-lg hover:bg-green-100" title="Mark Fully Paid">
                            <CheckCircle size={16}/>
                         </button>
                      )}
                      
                      <button onClick={() => {setFormData(inv); setActiveTab('create');}} className="text-orange-600 font-bold hover:bg-orange-50 p-2 rounded-lg" title="Edit / View"><FileText size={16}/></button>
                      <button onClick={() => shareOnWhatsApp(inv)} className="text-green-600 font-bold hover:bg-green-50 p-2 rounded-lg" title="WhatsApp"><Share2 size={16}/></button>
                      {isAdmin && <button onClick={() => { if(confirm('Delete?')) remove(ref(db, `invoices/${inv.firebaseId}`)); }} className="text-red-400 hover:bg-red-50 p-2 rounded-lg" title="Delete"><Trash2 size={16}/></button>}
                    </td>
                  </tr>
                )
              })}
              {invoices.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-400 italic">No invoices found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* --- LETTERHEAD TAB (UNCHANGED) --- */}
      {activeTab === 'letterhead' && (
        <div className="flex justify-center animate-fade-in">
           <div className={`print-wrapper bg-white print:bg-red-50 p-[10mm] shadow-xl print:shadow-none text-red-700 font-sans transition-all duration-300 flex flex-col ${
                paperSize === 'A5' ? 'w-[148mm] min-h-[210mm] text-[10px]' : 'w-[210mm] min-h-[297mm] text-sm'
              }`}>
              
              <div className="mb-2">
                <div className={`flex justify-between items-end font-bold text-red-600 mb-1 ${paperSize === 'A5' ? 'text-[9px]' : 'text-sm'}`}>
                  <div className="text-left leading-tight"><p>प्रो. महेश हडप</p><p>मो. 9923465353</p></div>
                  <div className={`text-center font-black ${paperSize === 'A5' ? 'text-sm' : 'text-lg'}`}>|| श्री गजानन प्रसन्न ||</div>
                  <div className="text-right leading-tight"><p>प्रो. मोहन हडप</p><p>मो. 8329599213</p></div>
                </div>
                <div className="text-center">
                   <h1 className={`font-black text-red-600 uppercase tracking-tighter ${paperSize === 'A5' ? 'text-3xl' : 'text-5xl'}`} style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>{bizProfile.name}</h1>
                   <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-red-600 text-xl font-bold">✽</span>
                      <h2 className={`font-bold text-red-600 ${paperSize === 'A5' ? 'text-sm' : 'text-xl'}`}>{bizProfile.tagline}</h2>
                      <span className="text-red-600 text-xl font-bold">✽</span>
                   </div>
                   <p className={`text-center font-bold text-red-700 mt-1 leading-relaxed px-4 ${paperSize === 'A5' ? 'text-[8px]' : 'text-sm'}`}>
                     सिमेंट प्लेट, सिमेंट पोल, रेडीमेन प्लेट, कंपाऊंड योग्य दरात करून मिळेल व 
                     वाळू, डबर, विट, शेणखत, लाल माती व फार्म हाऊस योग्य दरात डेव्हलप करून मिळेल 
                     आणि इतर कंट्रक्शनची कामे योग्य दरात करून मिळतील.
                   </p>
                </div>
                <div className="border-y-2 border-red-600 py-1 mt-2 text-center">
                  <p className={`font-bold text-red-700 ${paperSize === 'A5' ? 'text-[9px]' : 'text-sm'}`}>{bizProfile.address}</p>
                </div>
              </div>

              <div className="flex-1 min-h-[500px]">
                 <textarea 
                    className="w-full h-full resize-none outline-none bg-transparent p-4 font-bold text-black placeholder:text-gray-200" 
                    placeholder="Type official letter content here..."
                    value={letterContent}
                    onChange={(e) => setLetterContent(e.target.value)}
                 />
              </div>

              <div className="mt-8 pt-8 flex justify-end">
                 <div className="text-center">
                    <p className="text-[10px] font-bold text-red-700">बालदिगंबर इंटरप्राइजेस करिता</p>
                 </div>
              </div>

           </div>
        </div>
      )}

      {/* --- CREATE TAB (UNCHANGED) --- */}
      {activeTab === 'create' && (
        <div className="flex flex-col lg:flex-row gap-6">
          
          <div className="lg:w-1/3 space-y-4 no-print animate-fade-in">
            {isAdmin ? (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-slate-700 uppercase mb-4 flex items-center gap-2"><Settings size={16}/> Bill Details</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><label className="text-xs font-bold text-gray-400 uppercase">Type</label><select className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold bg-white outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option>TAX INVOICE</option><option>QUOTATION</option><option>DELIVERY CHALLAN</option></select></div>
                  <div><label className="text-xs font-bold text-gray-400 uppercase">Date</label><input type="date" className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold bg-white outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                </div>
                <div className="mb-4 relative">
                  <label className="text-xs font-bold text-gray-400 uppercase">Client</label>
                  <div className="flex gap-2">
                    <input type="text" list="clientList" placeholder="Search..." className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold outline-none" value={formData.client.name} onChange={e => { setFormData({...formData, client: { ...formData.client, name: e.target.value }}); }} />
                    <datalist id="clientList">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
                    <button onClick={() => selectClient(formData.client.name)} className="bg-orange-100 text-orange-600 p-2.5 rounded-lg"><Search size={20}/></button>
                  </div>
                </div>
                <div className="mb-4"><label className="text-xs font-bold text-gray-400 uppercase">Address</label><textarea rows="2" className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold text-sm outline-none" value={formData.client.address} onChange={e => setFormData({...formData, client: { ...formData.client, address: e.target.value }})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-400 uppercase">Mobile</label><input className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold outline-none" value={formData.client.mobile} onChange={e => setFormData({...formData, client: { ...formData.client, mobile: e.target.value }})} /></div>
                  <div><label className="text-xs font-bold text-gray-400 uppercase">GSTIN</label><input className="w-full border-2 border-gray-100 p-2.5 rounded-lg font-bold outline-none" value={formData.client.gstin} onChange={e => setFormData({...formData, client: { ...formData.client, gstin: e.target.value }})} /></div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="flex gap-2 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><input type="checkbox" checked={showStamp} onChange={e => setShowStamp(e.target.checked)} className="accent-orange-600 w-4 h-4"/><span className="text-xs font-bold text-slate-600 uppercase">Stamp</span></label>
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><input type="checkbox" checked={formData.isGst} onChange={e => setFormData({...formData, isGst: e.target.checked})} className="accent-orange-600 w-4 h-4"/><span className="text-xs font-bold text-slate-600 uppercase">GST 18%</span></label>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                    <label className="text-xs font-bold text-yellow-700 uppercase">Discount</label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <input type="text" placeholder="Reason" className="bg-white border border-yellow-200 p-2 rounded-lg font-bold text-xs" value={formData.discountReason} onChange={e => setFormData({...formData, discountReason: e.target.value})} />
                      <input type="number" placeholder="Amt" className="bg-white border border-yellow-200 p-2 rounded-lg font-bold text-yellow-800" value={formData.discount} onChange={e => setFormData({...formData, discount: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="mt-4 bg-green-50 p-4 rounded-xl border border-green-100">
                    <label className="text-xs font-bold text-green-700 uppercase">Advance / Paid</label>
                    <input type="number" className="w-full bg-white border border-green-200 p-2.5 rounded-lg font-bold mt-2 text-green-800 outline-none" value={formData.advances} onChange={e => setFormData({...formData, advances: Number(e.target.value)})} />
                  </div>
                  <button onClick={saveInvoice} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold mt-6 flex items-center justify-center gap-2 hover:bg-black shadow-lg">
                    <Save size={18}/> Save to Cloud
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                <Lock className="mx-auto text-slate-300 mb-2" size={40} />
                <p className="font-bold text-slate-500">Locked</p>
                <p className="text-xs text-slate-400">Admin Only</p>
              </div>
            )}
          </div>

          <div className="lg:w-2/3 bg-slate-100 p-4 lg:p-8 rounded-2xl overflow-auto print:p-0 print:bg-white print:w-full print:rounded-none flex justify-center">
            <div className={`print-wrapper bg-white print:bg-red-50 p-[10mm] shadow-xl print:shadow-none text-red-700 font-sans transition-all duration-300 ${
                paperSize === 'A5' ? 'w-[148mm] min-h-[210mm] text-[10px]' : 'w-[210mm] min-h-[297mm] text-sm'
              }`}>
              {showStamp && (
                balanceDue <= 0 
                  ? <div className="absolute top-[40%] left-[40%] border-4 border-green-600 text-green-600 text-6xl font-black opacity-40 transform -rotate-45 p-4 rounded-xl pointer-events-none z-10">PAID</div>
                  : <div className="absolute top-[40%] left-[35%] border-4 border-red-600 text-red-600 text-6xl font-black opacity-20 transform -rotate-45 p-4 rounded-xl pointer-events-none z-10">UNPAID</div>
              )}
              <div className="mb-2">
                <div className={`flex justify-between items-end font-bold text-red-600 mb-1 ${paperSize === 'A5' ? 'text-[9px]' : 'text-sm'}`}>
                  <div className="text-left leading-tight"><p>प्रो. महेश हडप</p><p>मो. 9923465353</p></div>
                  <div className={`text-center font-black ${paperSize === 'A5' ? 'text-sm' : 'text-lg'}`}>|| श्री गजानन प्रसन्न ||</div>
                  <div className="text-right leading-tight"><p>प्रो. मोहन हडप</p><p>मो. 8329599213</p></div>
                </div>
                <div className="text-center">
                   <h1 className={`font-black text-red-600 uppercase tracking-tighter ${paperSize === 'A5' ? 'text-3xl' : 'text-5xl'}`} style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>{bizProfile.name}</h1>
                   <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-red-600 text-xl font-bold">✽</span>
                      <h2 className={`font-bold text-red-600 ${paperSize === 'A5' ? 'text-sm' : 'text-xl'}`}>{bizProfile.tagline}</h2>
                      <span className="text-red-600 text-xl font-bold">✽</span>
                   </div>
                   <p className={`text-center font-bold text-red-700 mt-1 leading-relaxed px-4 ${paperSize === 'A5' ? 'text-[8px]' : 'text-sm'}`}>
                     सिमेंट प्लेट, सिमेंट पोल, रेडीमेन प्लेट, कंपाऊंड योग्य दरात करून मिळेल व 
                     वाळू, डबर, विट, शेणखत, लाल माती व फार्म हाऊस योग्य दरात डेव्हलप करून मिळेल 
                     आणि इतर कंट्रक्शनची कामे योग्य दरात करून मिळतील.
                   </p>
                </div>
                <div className="border-y-2 border-red-600 py-1 mt-2 text-center">
                  <p className={`font-bold text-red-700 ${paperSize === 'A5' ? 'text-[9px]' : 'text-sm'}`}>{bizProfile.address}</p>
                </div>
              </div>
              <div className={`flex justify-between items-center py-2 px-1 text-red-800 font-bold ${paperSize === 'A5' ? 'text-xs' : 'text-lg'}`}>
                <div className="flex gap-2"><span>बिल नं. :</span><span className="text-black">{formData.billNo}</span></div>
                <div className="flex gap-2"><span>दिनांक :</span><span className="text-black underline decoration-dotted underline-offset-4">{new Date(formData.date).toLocaleDateString('en-IN')}</span></div>
              </div>
              <div className={`flex items-end gap-2 mb-4 text-red-800 font-bold border-b border-red-300 pb-1 ${paperSize === 'A5' ? 'text-sm' : 'text-lg'}`}>
                 <span>मेसर्स :</span><span className="flex-1 text-black pl-2">{formData.client.name}</span>
                 {formData.client.mobile && <span className="text-sm text-red-600">({formData.client.mobile})</span>}
              </div>
              <div className="border-2 border-red-600 rounded-sm">
                <table className={`w-full border-collapse ${paperSize === 'A5' ? 'text-[9px]' : 'text-sm'}`}>
                  <thead className="bg-red-50 text-red-700 border-b-2 border-red-600">
                    <tr>
                      <th className={`p-1 border-r border-red-600 ${paperSize === 'A5' ? 'w-12' : 'w-20'}`}>दिनांक<br/><span className="text-[8px]">Date</span></th>
                      <th className={`p-1 border-r border-red-600 ${paperSize === 'A5' ? 'w-12' : 'w-20'}`}>गाडी नंबर<br/><span className="text-[8px]">Vehicle No</span></th>
                      <th className="p-1 border-r border-red-600 text-left pl-2 w-[40%]">मालाचा तपशिल<br/><span className="text-[8px]">Particulars</span></th>
                      <th className={`p-1 border-r border-red-600 ${paperSize === 'A5' ? 'w-8' : 'w-12'}`}>ब्रास<br/><span className="text-[8px]">Brass</span></th>
                      <th className={`p-1 border-r border-red-600 ${paperSize === 'A5' ? 'w-8' : 'w-12'}`}>ट्रीप<br/><span className="text-[8px]">Trip</span></th>
                      <th className={`p-1 border-r border-red-600 ${paperSize === 'A5' ? 'w-14' : 'w-20'}`}>दर<br/><span className="text-[8px]">Rate</span></th>
                      <th className="p-1 w-24 text-right pr-2">रक्कम<br/><span className="text-[8px]">Amount</span></th>
                      <th className="w-6 no-print bg-white border-none"></th>
                    </tr>
                  </thead>
                  <tbody className="text-red-900 font-bold align-top">
                    {formData.items.map((item) => (
                      <tr key={item.id} className="border-b border-red-200">
                        <td className="p-1 border-r border-red-600 text-center"><input disabled={!isAdmin} className="w-full bg-transparent outline-none text-center font-bold text-black text-xs" value={item.date || ''} onChange={e => handleItemChange(item.id, 'date', e.target.value)} /></td>
                        <td className="p-1 border-r border-red-600 text-center"><input disabled={!isAdmin} className="w-full bg-transparent outline-none text-center font-bold text-black" value={item.gadiNo} onChange={e => handleItemChange(item.id, 'gadiNo', e.target.value)} /></td>
                        <td className="p-1 border-r border-red-600 text-left pl-2 align-top">
                           <div className="hidden print:block print-content-visible whitespace-pre-wrap font-bold text-black p-1 leading-relaxed break-words w-full">{item.desc}</div>
                           <div className="print:hidden print-input-hidden"><AutoResizeTextarea disabled={!isAdmin} placeholder="Item..." value={item.desc} onChange={(e) => handleItemChange(item.id, 'desc', e.target.value)} /></div>
                        </td>
                        <td className="p-1 border-r border-red-600 text-center"><input disabled={!isAdmin} type="number" className="w-full bg-transparent outline-none text-center font-bold text-black" value={item.brass > 0 ? item.brass : ''} onChange={e => handleItemChange(item.id, 'brass', e.target.value)} /></td>
                        <td className="p-1 border-r border-red-600 text-center"><input disabled={!isAdmin} type="number" className="w-full bg-transparent outline-none text-center font-bold text-black" value={item.trip > 0 ? item.trip : ''} onChange={e => handleItemChange(item.id, 'trip', e.target.value)} /></td>
                        <td className="p-1 border-r border-red-600 text-right pr-2"><input disabled={!isAdmin} type="number" className="w-full bg-transparent outline-none text-right font-bold text-black" value={item.rate} onChange={e => handleItemChange(item.id, 'rate', e.target.value)} /></td>
                        <td className="p-1 text-right pr-2 font-black text-black">{Number(item.amount).toLocaleString()}</td>
                        <td className="p-1 text-center no-print border-none align-middle">{isAdmin && <button onClick={() => removeItem(item.id)} className="text-red-300 hover:text-red-600"><Trash2 size={14}/></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isAdmin && <button onClick={addItem} className="no-print mt-2 mb-2 text-xs font-bold text-white bg-red-600 px-3 py-1 rounded hover:bg-red-800 flex items-center gap-1 w-fit"><Plus size={10}/> Add Item</button>}
              <div className="mt-2 border-2 border-t-0 border-red-600 flex text-red-800 print:break-inside-avoid">
                <div className="flex-1 p-2 flex flex-col justify-between border-r-2 border-red-600">
                   <div>
                     <div className="flex flex-wrap gap-2 mb-2">
                       <span className={`font-bold whitespace-nowrap ${paperSize === 'A5' ? 'text-[9px]' : 'text-xs'}`}>अक्षरी रुपये :</span>
                       <span className={`border-b border-dotted border-red-600 flex-1 font-bold text-black italic px-2 capitalize break-words whitespace-pre-wrap ${paperSize === 'A5' ? 'text-[9px]' : 'text-sm'}`}>{numToWords(balanceDue)} Only.</span>
                     </div>
                     {bizProfile.bankName && (
                        <div className={`font-bold mt-4 ${paperSize === 'A5' ? 'text-[9px]' : 'text-xs'}`}>
                          <p>बँक : {bizProfile.bankName}</p>
                          <p>खाते क्र. : {bizProfile.accNo} &nbsp; IFSC : {bizProfile.ifsc}</p>
                          {bizProfile.gstin && <p>GSTIN : {bizProfile.gstin}</p>}
                        </div>
                     )}
                   </div>
                   <div className="mt-4 text-[10px] font-bold text-red-500">Subject to Karjat Jurisdiction.</div>
                </div>
                <div className={`w-1/3 font-bold ${paperSize === 'A5' ? 'text-xs' : 'text-sm'}`}>
                   { (formData.isGst || formData.discount > 0) && (
                     <>
                        <div className="flex border-b border-red-600"><div className="w-1/2 p-1 border-r border-red-600">Subtotal</div><div className="w-1/2 p-1 text-right text-black">{subTotal.toLocaleString()}</div></div>
                        {formData.isGst && (
                          <>
                            <div className="flex border-b border-red-600"><div className="w-1/2 p-1 border-r border-red-600 text-[10px]">CGST (9%)</div><div className="w-1/2 p-1 text-right text-black">{(gstAmount/2).toLocaleString()}</div></div>
                            <div className="flex border-b border-red-600"><div className="w-1/2 p-1 border-r border-red-600 text-[10px]">SGST (9%)</div><div className="w-1/2 p-1 text-right text-black">{(gstAmount/2).toLocaleString()}</div></div>
                          </>
                        )}
                        {formData.discount > 0 && (
                          <div className="flex border-b border-red-600"><div className="w-1/2 p-1 border-r border-red-600 text-[10px]">Discount</div><div className="w-1/2 p-1 text-right text-black">-{formData.discount.toLocaleString()}</div></div>
                        )}
                     </>
                   )}
                   <div className="flex border-b border-red-600"><div className="w-1/2 p-1 border-r border-red-600">एकूण (Total)</div><div className="w-1/2 p-1 text-right text-black">{grandTotal.toLocaleString()}</div></div>
                   <div className="flex border-b border-red-600"><div className="w-1/2 p-1 border-r border-red-600">जमा (Paid)</div><div className="w-1/2 p-1 text-right text-black">{formData.advances}</div></div>
                   <div className="flex border-b border-red-600"><div className="w-1/2 p-1 border-r border-red-600">बाकी (Balance)</div><div className="w-1/2 p-1 text-right text-black">{balanceDue.toLocaleString()}</div></div>
                   <div className="p-2 text-center mt-2 h-24 flex flex-col justify-end">
                      {bizProfile.signature ? <img src={bizProfile.signature} alt="Sig" className={`mx-auto mb-1 ${paperSize === 'A5' ? 'h-10' : 'h-14'}`} style={{ mixBlendMode: 'multiply' }} /> : <div className="h-10"></div>}
                      <p className="text-[10px]">बालदिगंबर इंटरप्राइजेस करिता</p>
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