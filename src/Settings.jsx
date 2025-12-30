import React, { useState } from 'react';
import { 
  Save, Upload, Trash2, Download, ShieldCheck, AlertTriangle, 
  CheckCircle, Server, Database, RefreshCw, Lock, Cloud 
} from 'lucide-react';
// FIREBASE IMPORTS
import { db } from './firebase-config';
import { ref, get, set } from 'firebase/database';

export default function Settings({ isAdmin }) { // <--- RECEIVES ADMIN PROP
  
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // ==========================================
  // 1. CLOUD BACKUP (EXPORT)
  // ==========================================
  const handleCloudBackup = async () => {
    setLoading(true);
    setStatus('Fetching data from Cloud...');
    
    try {
      // Get snapshot of ENTIRE database
      const snapshot = await get(ref(db));
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Convert to JSON and Download
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `Baldigambar_CLOUD_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        setStatus('✅ Backup Downloaded Successfully!');
      } else {
        setStatus('⚠️ No data found in Cloud to backup.');
      }
    } catch (error) {
      console.error(error);
      setStatus('❌ Error: Could not fetch cloud data.');
    }
    setLoading(false);
  };

  // ==========================================
  // 2. CLOUD RESTORE (IMPORT) - ADMIN ONLY
  // ==========================================
  const handleCloudRestore = (event) => {
    if (!isAdmin) return; // Lock

    const file = event.target.files[0];
    if (!file) return;

    if (!confirm("⚠️ WARNING: This will OVERWRITE all current cloud data with this backup. Are you sure?")) {
      event.target.value = null; // Reset input
      return;
    }

    const fileReader = new FileReader();
    fileReader.readAsText(file, "UTF-8");
    
    fileReader.onload = async (e) => {
      try {
        setLoading(true);
        setStatus('Uploading data to Cloud...');
        const jsonData = JSON.parse(e.target.result);
        
        // Overwrite Database
        await set(ref(db), jsonData);
        
        setStatus('✅ Success! Cloud data restored. Reloading...');
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        setStatus('❌ Error: Invalid Backup File');
        console.error(err);
      }
      setLoading(false);
    };
  };

  // ==========================================
  // 3. FACTORY RESET - ADMIN ONLY
  // ==========================================
  const handleReset = async () => {
    if (!isAdmin) return; // Lock

    if (confirm("⚠️ DANGER: Are you sure you want to DELETE ALL CLOUD DATA? This cannot be undone.")) {
      if (confirm("Final Check: Did you take a backup? Click OK to wipe everything.")) {
        setLoading(true);
        try {
          await set(ref(db), null); // Wipe DB
          localStorage.clear(); // Wipe Local Settings
          window.location.reload();
        } catch(err) {
          alert("Error wiping data.");
        }
      }
    }
  };

  return (
    <div className="space-y-8 pb-20 font-sans text-slate-800 animate-fade-in max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">System Settings</h1>
          <p className="text-slate-400 font-bold mt-2">Cloud Data, Backups & Security</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-full">
          <SettingsIcon size={40} className="text-orange-500 animate-spin-slow" />
        </div>
      </div>

      {/* Status Bar */}
      {status && (
        <div className={`p-4 rounded-xl font-bold text-center border-2 ${status.includes('Error') || status.includes('⚠️') ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {loading ? 'Processing...' : status}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* BACKUP CARD (Available to Everyone) */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
            <Download size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase mb-2">Cloud Backup</h3>
          <p className="text-sm text-slate-500 font-medium mb-6">
            Download a full copy of your live database (Invoices, Fleet, Workers) to your computer.
          </p>
          <button onClick={handleCloudBackup} disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50">
            <Save size={20} /> {loading ? 'Downloading...' : 'Download Backup'}
          </button>
        </div>

        {/* RESTORE CARD (Admin Only) */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          {!isAdmin && (
             <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6">
                <Lock size={40} className="text-slate-300 mb-2"/>
                <p className="font-black text-slate-400 uppercase">Restoring Locked</p>
                <p className="text-xs text-slate-400 font-bold">Only Admin can restore data</p>
             </div>
          )}
          <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
            <Upload size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase mb-2">Restore Cloud</h3>
          <p className="text-sm text-slate-500 font-medium mb-6">
            Upload your backup file to instantly restore the entire system state.
          </p>
          <div className="relative">
            <input 
              type="file" 
              accept=".json" 
              onChange={handleCloudRestore} 
              disabled={!isAdmin || loading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
            />
            <button disabled={!isAdmin || loading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50">
              <RefreshCw size={20} /> Select Backup File
            </button>
          </div>
        </div>

        {/* PROFILE CARD */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm md:col-span-2 flex items-center justify-between">
           <div className="flex items-center gap-6">
             <div className="h-20 w-20 bg-slate-900 rounded-full flex items-center justify-center font-black text-3xl text-white shadow-lg border-4 border-orange-500">R</div>
             <div>
               <h3 className="text-xl font-black text-slate-800 uppercase">Ritesh (Admin)</h3>
               <p className="text-sm text-slate-500 font-bold">Mac Mini M4 • Baldigambar Enterprises</p>
               <div className="flex gap-2 mt-2">
                 <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1"><CheckCircle size={12}/> System Active</span>
                 <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1"><Cloud size={12}/> Firebase Cloud</span>
               </div>
             </div>
           </div>
           <div className="text-right hidden md:block">
             <p className="text-xs font-bold text-slate-400 uppercase">App Version</p>
             <p className="text-xl font-black text-slate-800">v3.0 Cloud</p>
           </div>
        </div>

        {/* DANGER ZONE (Admin Only) */}
        <div className="bg-red-50 p-8 rounded-3xl border border-red-100 shadow-sm md:col-span-2 relative overflow-hidden">
          {!isAdmin && (
             <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2 font-bold text-slate-400 text-sm">
                   <Lock size={16}/> Admin Access Required
                </div>
             </div>
          )}
          <div className="flex items-start gap-4">
            <div className="bg-white p-3 rounded-xl text-red-600 shadow-sm"><AlertTriangle size={24}/></div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-red-700 uppercase">Danger Zone</h3>
              <p className="text-sm text-red-500 font-bold mt-1 mb-4">
                This will delete all invoices, workers, and fleet data permanently from the Cloud. Use this only if you want to start fresh.
              </p>
              <button onClick={handleReset} disabled={!isAdmin} className="bg-white text-red-600 border-2 border-red-100 px-6 py-3 rounded-xl font-bold uppercase text-xs hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2">
                <Trash2 size={16}/> Factory Reset Data
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Icon component needed locally
const SettingsIcon = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);