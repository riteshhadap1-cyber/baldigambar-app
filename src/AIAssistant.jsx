import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, Bot, User, TrendingUp, AlertTriangle, 
  Wallet, Truck, Users, Box, ArrowRight 
} from 'lucide-react';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: "Hello Boss! I am the Baldigambar AI. I have analyzed your Fleet, Labor, and Accounts. What do you want to know?", type: 'intro' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // --- 1. LOAD ALL DATA (The "Brain") ---
  const getData = () => {
    return {
      fleet: JSON.parse(localStorage.getItem('baldigambar_fleet_entries') || '[]'),
      expenses: JSON.parse(localStorage.getItem('baldigambar_business_expenses') || '[]'), // Cashbook
      invoices: JSON.parse(localStorage.getItem('baldigambar_invoices') || '[]'),
      inventory: JSON.parse(localStorage.getItem('baldigambar_inventory') || '[]'),
      workers: JSON.parse(localStorage.getItem('baldigambar_workers') || '[]'),
      laborAdvances: JSON.parse(localStorage.getItem('baldigambar_labor_advances') || '{}')
    };
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  // --- 2. THE INTELLIGENCE ENGINE ---
  const analyzeData = (query) => {
    const data = getData();
    const q = query.toLowerCase();

    // LOGIC: PROFIT & CASHFLOW
    if (q.includes('profit') || q.includes('money') || q.includes('earning')) {
      const totalIncome = data.expenses.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = data.expenses.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
      const net = totalIncome - totalExpense;
      const status = net >= 0 ? "Profit 🟢" : "Loss 🔴";
      return `Based on your Cashbook:\n• Total Income: ₹${totalIncome.toLocaleString()}\n• Total Expense: ₹${totalExpense.toLocaleString()}\n----------------\nNet Status: ${status} ₹${Math.abs(net).toLocaleString()}`;
    }

    // LOGIC: PENDING PAYMENTS (COLLECTIONS)
    if (q.includes('pending') || q.includes('owe') || q.includes('unpaid')) {
      const pendingInvoices = data.invoices.reduce((sum, inv) => {
         const total = inv.items.reduce((s,i) => s + i.amount, 0);
         return sum + (total - (inv.advances || 0));
      }, 0);
      
      const pendingDues = data.expenses.filter(e => e.type === 'Income' && e.status === 'Pending').length;
      
      if (pendingInvoices === 0 && pendingDues === 0) return "Great news! You have Zero pending collections. Everyone has paid.";
      return `You have approx ₹${pendingInvoices.toLocaleString()} pending to collect from Invoices. Check the Billing Tab for details.`;
    }

    // LOGIC: FLEET ANALYSIS
    if (q.includes('fleet') || q.includes('jcb') || q.includes('machine')) {
      const topMachine = data.fleet.reduce((acc, curr) => {
        acc[curr.machine] = (acc[curr.machine] || 0) + Number(curr.amount);
        return acc;
      }, {});
      const best = Object.entries(topMachine).sort((a,b) => b[1]-a[1])[0];
      
      if (!best) return "No fleet data found yet.";
      return `Your top performing machine is **${best[0]}** with total earnings of ₹${best[1].toLocaleString()}.`;
    }

    // LOGIC: INVENTORY ALERTS
    if (q.includes('stock') || q.includes('inventory') || q.includes('buy')) {
      const lowStock = data.inventory.filter(i => i.qty <= i.minLevel);
      if (lowStock.length === 0) return "Inventory is healthy. Nothing to buy right now.";
      return `⚠️ Alert: You need to buy these ${lowStock.length} items:\n` + lowStock.map(i => `• ${i.name} (Only ${i.qty} left)`).join('\n');
    }

    // LOGIC: LABOR/ADVANCES
    if (q.includes('labor') || q.includes('worker') || q.includes('advance')) {
      let totalAdv = 0;
      Object.values(data.laborAdvances).forEach(list => list.forEach(a => totalAdv += a.amount));
      return `You have given a total of **₹${totalAdv.toLocaleString()}** in advances to workers.`;
    }

    return "I am specialized in Baldigambar Business Data. Ask me about Profit, Fleet, Stocks, or Pending Payments.";
  };

  const handleSend = (text) => {
    if (!text) return;
    const userMsg = { id: Date.now(), sender: 'user', text: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate "Thinking" time
    setTimeout(() => {
      const responseText = analyzeData(text);
      const botMsg = { id: Date.now() + 1, sender: 'bot', text: responseText };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1000);
  };

  // Quick Action Chips
  const suggestions = [
    { icon: <TrendingUp size={14}/>, text: "How is my Profit?" },
    { icon: <AlertTriangle size={14}/>, text: "Any pending payments?" },
    { icon: <Box size={14}/>, text: "Low stock alerts?" },
    { icon: <Truck size={14}/>, text: "Best performing machine?" },
    { icon: <Users size={14}/>, text: "Total Labor Advances?" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in font-sans">
      
      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center gap-3 text-white shadow-md z-10">
        <div className="w-10 h-10 bg-gradient-to-tr from-orange-400 to-red-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
          <Sparkles size={20} className="text-white"/>
        </div>
        <div>
          <h2 className="font-black text-lg tracking-tight">Baldigambar AI</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Intelligence</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-sm whitespace-pre-wrap leading-relaxed ${
              msg.sender === 'user' 
                ? 'bg-slate-800 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex gap-1">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions & Input */}
      <div className="bg-white p-4 border-t border-slate-200">
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleSend(s.text)} className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 transition-all whitespace-nowrap">
              {s.icon} {s.text}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="relative flex items-center gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your business..."
            className="w-full bg-slate-100 border-2 border-transparent focus:bg-white focus:border-slate-200 rounded-xl pl-4 pr-12 py-3 font-bold text-sm outline-none transition-all"
          />
          <button type="submit" disabled={!input} className="absolute right-2 bg-slate-900 text-white p-2 rounded-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}