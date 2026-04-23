import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{
    sender: 'user' | 'ai', 
    text: string, 
    reasoning?: {title: string, content: string}[],
    citations?: {label: string, symbol: string, source: string}[]
  }[]>([{
    sender: 'ai', 
    text: 'Hi! I am your ProfitSense AI Assistant. Ask me about the market, live signals, or portfolio analysis.'
  }]);
  const [isThinking, setIsThinking] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const toggleListen = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice dictates not supported in this browser.");
      return;
    }
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    
    setIsThinking(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: data.reply,
        reasoning: data.reasoning_steps,
        citations: data.citations
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Connection to AI server failed.' }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <>
      <motion.button 
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-blue-600 shadow-xl z-50 flex items-center justify-center cursor-pointer group border border-blue-400/20"
      >
        <div className="absolute inset-0 rounded-full bg-blue-600/20 animate-ping" />
        <MessageCircle size={28} className="text-white relative z-10" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-28 right-8 w-[400px] h-[600px] bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl flex flex-col overflow-hidden z-50 border border-slate-200"
          >
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center italic">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-lg"></div>
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest font-black text-slate-900">Intelligence Assistant</h3>
                  <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">Operational v4.0</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-6 font-sans no-scrollbar bg-white/50 italic">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.reasoning && msg.reasoning.length > 0 && (
                    <div className="mb-3 w-full max-w-[90%] space-y-2">
                      {msg.reasoning.map((step, si) => (
                        <motion.div 
                          key={si}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: si * 0.1 }}
                          className="text-[9px] bg-blue-50 border border-blue-100 rounded-lg p-3 text-blue-600 font-bold uppercase tracking-wider shadow-sm"
                        >
                          <div className="flex items-center gap-1.5 opacity-70 mb-1">
                            <span className="w-1 h-1 rounded-full bg-blue-600" />
                            {step.title}
                          </div>
                          <p className="mt-0.5 text-slate-500 leading-relaxed normal-case">{step.content}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  
                  <div className={`p-4 rounded-2xl max-w-[85%] text-xs font-bold leading-relaxed shadow-sm uppercase tracking-tighter ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-sm' 
                      : 'bg-white text-slate-900 border border-slate-100 rounded-bl-sm shadow-md'
                  }`}>
                    {msg.text}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                        {msg.citations.map((cite, ci) => (
                          <div key={ci} className="px-2 py-1 bg-slate-50 rounded text-[8px] font-black text-blue-600 border border-slate-200 uppercase tracking-widest cursor-pointer hover:bg-blue-50 transition-colors">
                            {cite.label} • {cite.source}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-bl-sm border border-slate-100 flex gap-2 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex gap-3 items-center italic">
              <button 
                onClick={toggleListen} 
                className={`p-3 rounded-full cursor-pointer transition shadow-sm ${isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`}
                title="Voice Input"
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Query Intelligence Hub..." 
                className="flex-1 bg-slate-50 text-slate-900 text-[11px] font-bold uppercase tracking-widest rounded-full px-6 py-3 border border-slate-100 focus:outline-none focus:border-blue-600 shadow-inner"
              />
              <button 
                onClick={handleSend} 
                className="p-3 bg-blue-600 text-white rounded-full cursor-pointer transition shadow-md hover:bg-blue-700"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
