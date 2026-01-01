import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, Bot, User, TrendingUp, AlertTriangle, 
  CheckCircle, Loader, DollarSign, BrainCircuit, Info 
} from 'lucide-react';
// FIREBASE IMPORTS
import { db } from './firebase-config';
import { ref, onValue } from 'firebase/database';

export default function AIAssistant() {
  
  // ==========================================
  // 1. LIVE DATA FEED (The "Brain" Context)
  // ==========================================
  const [contextData, setContextData] = useState({
    invoices: [],
    expenses: [],
    workers: [],
    fleet: {}
  });
  
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: "Hello! I am connected to your live business data. Ask me about pending bills, expenses, or fleet status." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // FETCH LIVE DATA FOR CONTEXT
  useEffect(() => {
    // 1. Invoices (Simplified for AI Context)
    onValue(ref(db, 'invoices'), (snap) => {
      const data = snap.val() ? Object.values(snap.val()) : [];
      const simpleInvoices = data.map(inv => {
        const total = (inv.items||[]).reduce((s,i)=>s+Number(i.amount),0);
        const gst = inv.isGst ? total * 0.18 : 0;
        const grand = Math.round(total + gst - (Number(inv.discount)||0));
        const paid = Number(inv.advances) || 0;
        return {
            client: inv.client.name,
            total: grand,
            balance: grand - paid,
            status: (grand - paid) <= 0 ? "Paid" : "Pending"
        };
      });
      setContextData(prev => ({ ...prev, invoices: simpleInvoices }));
    });

    // 2. Expenses (Last 30 only)
    onValue(ref(db, 'cashbook'), (snap) => {
      const data = snap.val() ? Object.values(snap.val()) : [];
      const recent = data.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 30).map(e => ({
          date: e.date,
          category: e.category,
          amount: e.amount,
          type: e.type
      }));
      setContextData(prev => ({ ...prev, expenses: recent }));
    });

    // 3. Fleet
    onValue(ref(db, 'fleet_data'), (snap) => {
        setContextData(prev => ({ ...prev, fleet: snap.val() || {} }));
    });

    // 4. Workers
    onValue(ref(db, 'workers'), (snap) => {
        const data = snap.val() ? Object.values(snap.val()) : [];
        setContextData(prev => ({ ...prev, workers: data.map(w => w.name) }));
    });

  }, []);

  // SCROLL TO BOTTOM
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // ==========================================
  // 2. AI LOGIC (Google Gemini API)
  // ==========================================
  
  const generateAIResponse = async (userQuestion) => {
    // Access the key from your .env file
    const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
    
    if (!API_KEY) {
        return "⚠️ Setup Error: Google API Key is missing. Please check your .env file.";
    }

    // Prepare the "Context" - summarized data for the AI to read
    const pendingInvoices = contextData.invoices.filter(i => i.balance > 0);
    const totalPending = pendingInvoices.reduce((s, i) => s + i.balance, 0);
    
    const systemPrompt = `
      You are an intelligent business assistant for "Baldigambar Enterprises".
      
      HERE IS THE LIVE BUSINESS DATA:
      - Total Pending Money to Collect: ₹${totalPending}
      - Pending Invoice List: ${JSON.stringify(pendingInvoices.slice(0, 15))}
      - Recent Expenses: ${JSON.stringify(contextData.expenses.slice(0, 10))}
      - Staff Names: ${JSON.stringify(contextData.workers)}
      - Vehicles: ${JSON.stringify(Object.keys(contextData.fleet))}

      USER QUESTION: "${userQuestion}"

      INSTRUCTIONS:
      - Answer the question using ONLY the data above.
      - If asking about pending money, tell them exactly who owes what.
      - Keep answers short, professional, and direct.
      - If the answer isn't in the data, say "I don't see that in the current records."
    `;

    try {
      // Call Google Gemini 1.5 Flash
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });

      const data = await response.json();
      
      if (data.error) {
          console.error("AI Error:", data.error);
          return "I encountered an error connecting to Google AI. Please check your API Key.";
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";

    } catch (error) {
      return "I am having trouble connecting to the internet.";
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1. Add User Message
    const userMsg = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // 2. Get AI Response
    const answer = await generateAIResponse(userMsg.text);

    // 3. Add Bot Message
    const botMsg = { id: Date.now() + 1, sender: 'bot', text: answer };
    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  // ==========================================
  // 3. RENDER UI
  // ==========================================
  return (
    <div className="h-[85vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-xl">
            <BrainCircuit size={24} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Smart Assistant</h3>
            <div className="flex items-center gap-1.5">
               <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
               <p className="text-[10px] font-medium text-slate-300 uppercase tracking-wider">Gemini Connected</p>
            </div>
          </div>
        </div>
        <div className="text-right hidden sm:block">
           <p className="text-[10px] text-slate-400">Powered by</p>
           <p className="text-xs font-bold text-white">Google AI</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'}`}>
              {msg.sender === 'bot' && (
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-1">
                      <Sparkles size={14} className="text-purple-500"/> 
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Analysis</span>
                  </div>
              )}
              <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 flex gap-1 items-center shadow-sm">
               <Loader size={16} className="animate-spin text-purple-500"/>
               <span className="text-xs font-bold text-slate-400 ml-2">Thinking...</span>
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
            placeholder="Ask: 'Who owes money?', 'Total fuel cost?', etc." 
            className="w-full bg-slate-100 border-none rounded-xl py-4 pl-4 pr-14 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-400 transition-all"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-2 bg-slate-900 text-white rounded-lg hover:bg-black disabled:opacity-50 transition-colors shadow-lg"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2 font-medium flex items-center justify-center gap-1">
           <Info size={10}/> AI answers based on live data. Verify important financial figures.
        </p>
      </form>
    </div>
  );
}