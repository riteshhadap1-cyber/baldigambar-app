import React, { useState, useEffect } from 'react';
import { 
  Save, Upload, Trash2, Download, ShieldCheck, AlertTriangle, 
  CheckCircle, Server, Database, RefreshCw, Lock, Cloud,
  Building, FileText, HardDrive, UserCog, User
} from 'lucide-react';
// FIREBASE IMPORTS
import { db } from './firebase-config';
import { ref, get, set } from 'firebase/database';

export default function Settings({ isAdmin }) {
  
  // ==========================================
  // 1. STATE & TABS
  // ==========================================
  const [activeTab, setActiveTab] = useState('general'); 
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Business Profile State
  const [bizProfile, setBizProfile] = useState({
    name: '', tagline: '', address: '', mobile: '', 
    gstin: '', bankName: '', accNo: '', ifsc: '', signature: null,
    // NEW: Partner Details
    headerName1: 'प्रो. महेश हडप', headerMobile1: '9923465353',
    headerName2: 'प्रो. मोहन हडप', headerMobile2: '8329599213'
  });

  // Load Profile on Mount
  useEffect(() => {
    get(ref(db, 'biz_profile')).then(snap => {
      if(snap.exists()) setBizProfile(prev => ({...prev, ...snap.val()}));
    });
  }, []);

  // ==========================================
  // 2. ACTIONS
  // ==========================================

  const saveProfile = async () => {
    if(!isAdmin) return;
    setLoading(true);
    await set(ref(db, 'biz_profile'), bizProfile);
    setStatus('✅ Business Profile Updated Successfully!');
    setLoading(false);
    setTimeout(() => setStatus(''), 3000);
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

  const handleCloudBackup = async () => {
    setLoading(true);
    setStatus('Fetching data...');
    try {
      const snapshot = await get(ref(db));
      if (snapshot.exists()) {
        const dataStr = JSON.stringify(snapshot.val(), null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `Baldigambar_BACKUP_${new Date().toISOString().slice(0,10)}.json`);
        link.click();
        setStatus('✅ Backup Downloaded!');
      } else {
        setStatus('⚠️ No data to backup.');
      }
    } catch (err) { setStatus('❌ Error during backup.'); }
    setLoading(false);
  };

  const handleCloudRestore = (event) => {
    if (!isAdmin) return;
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        alert("❌ Invalid file type. Please select a .json backup file.");
        return;
    }

    if (!confirm("⚠️ WARNING: This will REPLACE all current data with the backup. Are you sure?")) {
        event.target.value = null; 
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        setStatus('Validating backup file...');
        const jsonData = JSON.parse(e.target.result);
        const knownKeys = ['invoices', 'workers', 'fleet_data', 'cashbook', 'inventory_items', 'biz_profile', 'clients'];
        const hasValidData = Object.keys(jsonData).some(key => knownKeys.includes(key));
        
        if (!hasValidData) {
            alert("❌ RESTORE FAILED: Invalid Backup File!");
            setStatus('❌ Restore Aborted');
            setLoading(false);
            return;
        }

        setStatus('Uploading verified data...');
        await set(ref(db), jsonData);
        setStatus('✅ Restore Complete! Reloading...');
        setTimeout(() => window.location.reload(), 2000);

      } catch (err) { 
        setStatus('❌ Error: File is corrupted.');
        alert("❌ Error: The file is corrupted.");
      }
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (!isAdmin) return;
    if (confirm("⚠️ DANGER: DELETE ALL DATA? This cannot be undone.")) {
      if (confirm("Final Check: Did you download a backup?")) {
        setLoading(true);
        await set(ref(db), null);
        window.location.reload();
      }
    }
  };

  // ==========================================
  // 3. UI RENDER
  // ==========================================
  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800 animate-fade-in max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-2">
            <UserCog className="text-orange-500" size={32}/> System Settings
          </h1>
          <p className="text-slate-400 font-bold mt-2">Global Configuration & Data Management</p>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-xl flex items-center gap-2">
           <div className={`w-3 h-3 rounded-full ${isAdmin ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
           <span className="font-bold text-sm uppercase">{isAdmin ? 'Admin Access' : 'View Only Mode'}</span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
         {[
           { id: 'general', icon: <Building size={18}/>, label: 'General & Profile' },
           { id: 'data', icon: <HardDrive size={18}/>, label: 'Data Backup' },
           { id: 'danger', icon: <AlertTriangle size={18}/>, label: 'Danger Zone' }
         ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap
               ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
           >
             {tab.icon} {tab.label}
           </button>
         ))}
      </div>

      {/* STATUS BAR */}
      {status && (
        <div className={`p-4 rounded-xl font-bold text-center border-2 animate-bounce-short ${status.includes('Error') || status.includes('❌') || status.includes('⚠️') ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {loading ? 'Processing...' : status}
        </div>
      )}

      {/* --- TAB CONTENT: GENERAL --- */}
      {activeTab === 'general' && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 uppercase">Business Details</h3>
              {!isAdmin && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Locked</span>}
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="text-xs font-bold text-slate-400 uppercase">Company Name</label><input disabled={!isAdmin} className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold" value={bizProfile.name} onChange={e=>setBizProfile({...bizProfile, name:e.target.value})} /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase">Tagline / Slogan</label><input disabled={!isAdmin} className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold" value={bizProfile.tagline} onChange={e=>setBizProfile({...bizProfile, tagline:e.target.value})} /></div>
              <div className="md:col-span-2"><label className="text-xs font-bold text-slate-400 uppercase">Address</label><input disabled={!isAdmin} className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold" value={bizProfile.address} onChange={e=>setBizProfile({...bizProfile, address:e.target.value})} /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase">Office Mobile</label><input disabled={!isAdmin} className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold" value={bizProfile.mobile} onChange={e=>setBizProfile({...bizProfile, mobile:e.target.value})} /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase">GSTIN</label><input disabled={!isAdmin} className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold" value={bizProfile.gstin} onChange={e=>setBizProfile({...bizProfile, gstin:e.target.value})} /></div>
           </div>
           
           {/* PARTNER HEADER CONFIG */}
           <h3 className="text-xl font-black text-slate-800 uppercase mt-8 mb-4">Invoice Header Names</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                  <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><User size={12}/> Left Side Name</label>
                  <input disabled={!isAdmin} className="w-full border-2 border-slate-200 p-2 rounded-lg font-bold mb-2" value={bizProfile.headerName1} onChange={e=>setBizProfile({...bizProfile, headerName1:e.target.value})} />
                  <input disabled={!isAdmin} className="w-full border-2 border-slate-200 p-2 rounded-lg font-bold" value={bizProfile.headerMobile1} onChange={e=>setBizProfile({...bizProfile, headerMobile1:e.target.value})} />
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><User size={12}/> Right Side Name</label>
                  <input disabled={!isAdmin} className="w-full border-2 border-slate-200 p-2 rounded-lg font-bold mb-2" value={bizProfile.headerName2} onChange={e=>setBizProfile({...bizProfile, headerName2:e.target.value})} />
                  <input disabled={!isAdmin} className="w-full border-2 border-slate-200 p-2 rounded-lg font-bold" value={bizProfile.headerMobile2} onChange={e=>setBizProfile({...bizProfile, headerMobile2:e.target.value})} />
              </div>
           </div>

           <h3 className="text-xl font-black text-slate-800 uppercase mt-8 mb-4">Banking & Signature</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div><label className="text-xs font-bold text-slate-400 uppercase">Bank Name</label><input disabled={!isAdmin} className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold" value={bizProfile.bankName} onChange={e=>setBizProfile({...bizProfile, bankName:e.target.value})} /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase">Account No</label><input disabled={!isAdmin} className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold" value={bizProfile.accNo} onChange={e=>setBizProfile({...bizProfile, accNo:e.target.value})} /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase">IFSC Code</label><input disabled={!isAdmin} className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold" value={bizProfile.ifsc} onChange={e=>setBizProfile({...bizProfile, ifsc:e.target.value})} /></div>
           </div>

           <div className="mt-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Authorized Signature</label>
              <div className="flex items-center gap-4">
                 {bizProfile.signature ? <img src={bizProfile.signature} alt="Sig" className="h-16 border bg-white rounded-lg"/> : <div className="h-16 w-32 bg-slate-200 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">No Sig</div>}
                 {isAdmin && <input type="file" accept="image/*" onChange={handleSignatureUpload} className="text-sm font-bold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-black"/>}
              </div>
           </div>

           {isAdmin && (
             <button onClick={saveProfile} className="mt-8 w-full bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-green-700 shadow-lg shadow-green-100 flex items-center justify-center gap-2">
                <Save size={20}/> Save Configuration
             </button>
           )}
        </div>
      )}

      {/* --- TAB CONTENT: DATA --- */}
      {activeTab === 'data' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 mb-6"><Download size={32}/></div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2">Backup Data</h3>
              <p className="text-sm text-slate-500 font-bold mb-6">Save a complete copy of your database (Invoices, Fleet, Workers) to your device.</p>
              <button onClick={handleCloudBackup} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold uppercase hover:bg-blue-700 flex items-center justify-center gap-2"><Save size={18}/> Download JSON</button>
           </div>

           <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
              {!isAdmin && <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center font-black text-slate-300 uppercase">Admin Locked</div>}
              <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 mb-6"><Upload size={32}/></div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2">Restore Data</h3>
              <p className="text-sm text-slate-500 font-bold mb-6">Upload a previously saved backup file to restore your system.</p>
              <div className="relative">
                 <input type="file" accept=".json" onChange={handleCloudRestore} disabled={!isAdmin || loading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                 <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold uppercase hover:bg-emerald-700 flex items-center justify-center gap-2"><RefreshCw size={18}/> Select File</button>
              </div>
           </div>
        </div>
      )}

      {/* --- TAB CONTENT: DANGER --- */}
      {activeTab === 'danger' && (
        <div className="bg-red-50 p-8 rounded-3xl border-2 border-red-100 shadow-sm relative overflow-hidden">
           {!isAdmin && <div className="absolute inset-0 bg-white/90 z-10 flex items-center justify-center font-black text-red-200 text-2xl uppercase">Restricted Access</div>}
           <div className="flex items-start gap-4">
              <div className="bg-white p-3 rounded-xl text-red-600 shadow-sm"><AlertTriangle size={32}/></div>
              <div>
                 <h3 className="text-2xl font-black text-red-700 uppercase">Factory Reset</h3>
                 <p className="text-red-600 font-bold mt-2">This action will permanently delete ALL data from the Cloud Database.</p>
                 <ul className="text-sm text-red-500 mt-4 list-disc pl-5 space-y-1 font-medium">
                    <li>All Invoices & Bills</li>
                    <li>Fleet Logs & Expenses</li>
                    <li>Worker Attendance Records</li>
                    <li>Inventory Items</li>
                 </ul>
                 <button onClick={handleReset} disabled={!isAdmin} className="mt-8 bg-red-600 text-white px-8 py-3 rounded-xl font-bold uppercase text-sm hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-red-200">
                    <Trash2 size={18}/> Confirm Factory Reset
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}