import React, { useState } from 'react';
import { 
  Save, Upload, Trash2, Download, ShieldCheck, AlertTriangle, 
  CheckCircle, Server, Database, RefreshCw 
} from 'lucide-react';

export default function Settings() {
  
  const [importStatus, setImportStatus] = useState('');

  // ==========================================
  // 1. BACKUP (EXPORT) LOGIC
  // ==========================================
  const handleExport = () => {
    const allData = {
      baldigambar_fleet_vehicles: localStorage.getItem('baldigambar_fleet_vehicles'),
      baldigambar_fleet_entries: localStorage.getItem('baldigambar_fleet_entries'),
      baldigambar_fleet_data_v8: localStorage.getItem('baldigambar_fleet_data_v8'),
      baldigambar_invoices: localStorage.getItem('baldigambar_invoices'),
      baldigambar_clients: localStorage.getItem('baldigambar_clients'),
      baldigambar_biz_profile: localStorage.getItem('baldigambar_biz_profile'),
      baldigambar_workers: localStorage.getItem('baldigambar_workers'),
      baldigambar_attendance: localStorage.getItem('baldigambar_attendance'),
      baldigambar_labor_advances: localStorage.getItem('baldigambar_labor_advances'),
      baldigambar_labor_bonuses: localStorage.getItem('baldigambar_labor_bonuses'),
      baldigambar_inventory: localStorage.getItem('baldigambar_inventory'),
      baldigambar_inventory_logs: localStorage.getItem('baldigambar_inventory_logs'),
      baldigambar_cashbook: localStorage.getItem('baldigambar_cashbook'),
      baldigambar_exp_categories: localStorage.getItem('baldigambar_exp_categories'),
      baldigambar_sites: localStorage.getItem('baldigambar_sites'),
      baldigambar_monthly_budget: localStorage.getItem('baldigambar_monthly_budget'),
      baldigambar_budget_enabled: localStorage.getItem('baldigambar_budget_enabled')
    };

    const dataStr = JSON.stringify(allData);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `Baldigambar_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // ==========================================
  // 2. RESTORE (IMPORT) LOGIC
  // ==========================================
  const handleImport = (event) => {
    const fileReader = new FileReader();
    const file = event.target.files[0];

    if (!file) return;

    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = e => {
      try {
        const jsonData = JSON.parse(e.target.result);
        
        // Loop through keys and save to localStorage
        Object.keys(jsonData).forEach(key => {
          if (jsonData[key]) {
            localStorage.setItem(key, jsonData[key]);
          }
        });

        setImportStatus('Success! Data restored. Reloading...');
        setTimeout(() => window.location.reload(), 1500); // Auto-reload to reflect changes
      } catch (err) {
        setImportStatus('Error: Invalid Backup File');
        console.error(err);
      }
    };
  };

  // ==========================================
  // 3. WIPE DATA LOGIC
  // ==========================================
  const handleReset = () => {
    if (confirm("⚠️ DANGER: Are you sure you want to DELETE ALL DATA? This cannot be undone.")) {
      if (confirm("Final Check: Did you take a backup? Click OK to wipe everything.")) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  return (
    <div className="space-y-8 pb-20 font-sans text-slate-800 animate-fade-in max-w-4xl mx-auto">
      
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">System Settings</h1>
          <p className="text-slate-400 font-bold mt-2">Manage your Data, Backups & Security</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-full">
          <SettingsIcon size={40} className="text-orange-500 animate-spin-slow" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* BACKUP CARD */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
            <Download size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase mb-2">Backup Data</h3>
          <p className="text-sm text-slate-500 font-medium mb-6">
            Download a full copy of your business data (Invoices, Fleet, Workers) to your computer. Do this weekly!
          </p>
          <button onClick={handleExport} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
            <Save size={20} /> Download Backup
          </button>
        </div>

        {/* RESTORE CARD */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
            <Upload size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase mb-2">Restore Data</h3>
          <p className="text-sm text-slate-500 font-medium mb-6">
            Lost your data? Upload your backup file here to restore everything instantly.
          </p>
          <div className="relative">
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            />
            <button className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
              <RefreshCw size={20} /> Select Backup File
            </button>
          </div>
          {importStatus && <p className={`mt-3 text-center font-bold ${importStatus.includes('Success') ? 'text-green-600' : 'text-red-600'}`}>{importStatus}</p>}
        </div>

        {/* PROFILE CARD */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm md:col-span-2 flex items-center justify-between">
           <div className="flex items-center gap-6">
             <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center font-black text-3xl text-slate-400">R</div>
             <div>
               <h3 className="text-xl font-black text-slate-800 uppercase">Ritesh (Admin)</h3>
               <p className="text-sm text-slate-500 font-bold">Mac Mini M4 • Baldigambar Enterprises</p>
               <div className="flex gap-2 mt-2">
                 <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1"><CheckCircle size={12}/> System Active</span>
                 <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1"><Database size={12}/> Local Storage</span>
               </div>
             </div>
           </div>
           <div className="text-right hidden md:block">
             <p className="text-xs font-bold text-slate-400 uppercase">App Version</p>
             <p className="text-xl font-black text-slate-800">v2.5 Pro</p>
           </div>
        </div>

        {/* DANGER ZONE */}
        <div className="bg-red-50 p-8 rounded-3xl border border-red-100 shadow-sm md:col-span-2">
          <div className="flex items-start gap-4">
            <div className="bg-white p-3 rounded-xl text-red-600 shadow-sm"><AlertTriangle size={24}/></div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-red-700 uppercase">Danger Zone</h3>
              <p className="text-sm text-red-500 font-bold mt-1 mb-4">
                This will delete all invoices, workers, and fleet data permanently. Use this only if you want to start fresh.
              </p>
              <button onClick={handleReset} className="bg-white text-red-600 border-2 border-red-100 px-6 py-3 rounded-xl font-bold uppercase text-xs hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2">
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