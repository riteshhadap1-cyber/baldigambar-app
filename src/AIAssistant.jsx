import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, Bot, User, TrendingUp, AlertTriangle, 
  CheckCircle, Loader, DollarSign, BrainCircuit 
} from 'lucide-react';
// FIREBASE IMPORTS
import { db } from './firebase-config';
import { ref, onValue } from 'firebase/database';

export default function AIAssistant() {
  
  // ==========================================
  // 1. LIVE DATA FEED (The "Brain" Context)
  // ==========================================
  const [businessData, setBusinessData] = useState({
    pendingDues: 0,
    cashBalance: 0,
    activeWorkers: 0,
    fleetStatus: 'Unknown',
    highExpenseVehicle: 'None'
  });

  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    // We listen to all main nodes to build a "Mental Model" for the AI
    const refs = {
      invoices: ref(db, 'invoices'),
      cashbook: ref(db, 'cashbook'),
      workers: ref(db, 'attendance'),
      fleet: ref(db, 'fleet_data')
    };

    const unsubInvoices = onValue(refs.invoices, (snap) => {
      const data = snap.val() ? Object.values(snap.val()) : [];
      // Calculate Pending Dues
      const pending = data.reduce((sum, inv) => {
        const total = (inv.items||[]).reduce((s,i)=>s+Number(i.amount),0);
        const paid = Number(inv.advances || 0);
        const due = total - paid;
        return sum + (due > 0 ? due : 0);
      }, 0);
      
      setBusinessData(prev => ({ ...prev, pendingDues: pending }));
    });

    const unsubCashbook = onValue(refs.cashbook, (snap) => {
      const data = snap.val() ? Object.values(snap.val()) : [];
      const income = data.filter(e => e.type === 'Income').reduce((s,e)=>s+Number(e.amount),0);
      const expense = data.filter(e => e.type === 'Expense').reduce((s,e)=>s+Number(e.amount),0);
      setBusinessData(prev => ({ ...prev, cashBalance: income - expense }));
    });

    const unsubFleet = onValue(refs.fleet, (snap) => {
      const data = snap.val() || {};
      // Find vehicle with highest fuel cost
      let maxCost = 0;
      let maxVehicle = 'None';
      Object.entries(data).forEach(([name, details]) => {
        const cost = Number(details.fuelCost || 0);
        if(cost > maxCost) {
          maxCost = cost;
          maxVehicle = name;
        }
      });
      setBusinessData(prev => ({ ...prev, highExpenseVehicle: maxVehicle }));
    });

    // Simulating "Data Ready" state
    setTimeout(() => setLoadingData(false), 1500);

    return () => { unsubInvoices(); unsubCashbook(); unsubFleet(); };
  }, []);

  // ==========================================
  // 2. CHAT LOGIC
  // ==========================================
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello Ritesh! I am connected to your live Baldigambar Cloud Database. Ask me about pending payments, fleet costs, or cash flow." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    // SIMULATED AI RESPONSE (Since we don't have a real OpenAI Key here)
    // In a real app, you would send 'businessData' + 'userMsg' to GPT-4
    setTimeout(() => {
      let aiResponse = "I'm analyzing your request...";
      const lower = userMsg.toLowerCase();

      if (lower.includes('pending') || lower.includes('due') || lower.includes('money')) {
        aiResponse = `Based on your live invoices, you have a total of ₹${businessData.pendingDues.toLocaleString()} pending from clients. You should check the Billing tab to send reminders.`;
      } 
      else if (lower.includes('cash') || lower.includes('balance') || lower.includes('bank')) {
        aiResponse = `Your current Net Cash Balance (Income - Expense) is ₹${businessData.cashBalance.toLocaleString()}.`;
        if(businessData.cashBalance < 0) aiResponse += " Warning: You are in negative cash flow.";
      }
      else if (lower.includes('fleet') || lower.includes('fuel') || lower.includes('vehicle')) {
        aiResponse = `Your fleet data shows that ${businessData.highExpenseVehicle} has the highest fuel consumption right now. You might want to check its mileage or service status.`;
      }
      else if (lower.includes('hello') || lower.includes('hi')) {
        aiResponse = "Welcome back, Boss! Your system is running smoothly on the Cloud. What data do you need?";
      }
      else {
        aiResponse = "I can help you track Pending Dues, Cash Balance, or Fleet Expenses. Try asking 'How much money is pending?'";
      }

      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
      
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
           <div className="bg-orange-500 p-2 rounded-lg"><BrainCircuit size={20} className="text-white"/></div>
           <div>
             <h3 className="font-bold text-sm">Baldigambar AI</h3>
             <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
               {loadingData ? <><Loader size={10} className="animate-spin"/> Syncing Data...</> : <><CheckCircle size={10} className="text-green-500"/> Live Cloud Data</>}
             </p>
           </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        
        {/* Insight Cards (Auto-Generated) */}
        {!loadingData && messages.length === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-bold uppercase"><AlertTriangle size={14} className="text-orange-500"/> Action Item</div>
               <div className="font-bold text-slate-700">Collect Pending Dues</div>
               <div className="text-2xl font-black text-slate-900">₹{businessData.pendingDues.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-bold uppercase"><TrendingUp size={14} className="text-emerald-500"/> Current Health</div>
               <div className="font-bold text-slate-700">Net Cash Balance</div>
               <div className={`text-2xl font-black ${businessData.cashBalance >=0 ? 'text-emerald-600' : 'text-red-600'}`}>₹{businessData.cashBalance.toLocaleString()}</div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1">
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200">
        <div className="relative flex items-center gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your business..." 
            className="w-full bg-slate-100 border-none rounded-xl py-3 pl-4 pr-12 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-100 placeholder:text-slate-400"
          />
          <button className="absolute right-2 p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}