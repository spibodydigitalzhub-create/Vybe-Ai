"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isListening, setIsListening] = useState(false);
  
  // PWA Install States
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('vybe_history');
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('vybe_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Catch the browser's install prompt
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleNewChat = () => {
    if (messages.length === 0) return;
    if (confirm('Start a new chat? Current history will be cleared.')) {
      setMessages([]);
      localStorage.removeItem('vybe_history');
      setIsNavOpen(false);
    }
  };

  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? ' ' : '') + transcript);
    };
    
    recognition.start();
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000); 

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: messages }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const data = await res.json();
      
      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply, isImage: data.isImage }]);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error: Request timed out. The AI took too long. Try asking for smaller parts of the code." }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error: Failed to connect to the server." }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-[100dvh] bg-[#0a0a0a] text-white font-sans relative overflow-hidden">
      
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl z-20 shrink-0"
      >
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsNavOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </motion.button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-500/20">V</div>
          <h1 className="text-lg font-bold tracking-tight">Vybe AI</h1>
        </div>

        {/* SMART INSTALL BUTTON */}
        <AnimatePresence>
          {isInstallable && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleInstall}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Install
            </motion.button>
          )}
        </AnimatePresence>
      </motion.header>

      <AnimatePresence>
        {isNavOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsNavOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
            />
            <motion.nav
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-[#111111] border-r border-white/10 z-40 flex flex-col"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold shadow-lg">V</div>
                  <div>
                    <h2 className="font-bold text-white">Vybe AI</h2>
                    <p className="text-[10px] text-indigo-400 uppercase tracking-wider">Pro Version</p>
                  </div>
                </div>
                <button onClick={() => setIsNavOpen(false)} className="text-gray-400 hover:text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                <button onClick={handleNewChat} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors text-left">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  <span className="font-medium">New Chat</span>
                </button>
                <button onClick={() => { setActiveModal('help'); setIsNavOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-left">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  <span className="font-medium">Help & Commands</span>
                </button>
                <button onClick={() => { setActiveModal('settings'); setIsNavOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-left">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  <span className="font-medium">Settings</span>
                </button>
              </div>
              <div className="p-4 border-t border-white/10 text-center text-xs text-gray-500">Vybe AI v1.0 • Unrestricted</div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setActiveModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161616] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-3">{activeModal === 'settings' ? 'Settings' : 'Help & Commands'}</h3>
              <div className="text-gray-300 text-sm space-y-3">
                {activeModal === 'settings' ? (
                  <>
                    <p>API Status: <span className="text-green-400 font-mono">Connected</span></p>
                    <p>Model: <span className="text-indigo-400 font-mono">Auto (Free Tier)</span></p>
                    <button onClick={() => { localStorage.clear(); setMessages([]); setActiveModal(null); }} className="w-full mt-4 bg-red-500/10 text-red-400 border border-red-500/20 py-2 rounded-lg hover:bg-red-500/20 transition-colors">Clear All Data</button>
                  </>
                ) : (
                  <>
                    <p>Vybe AI is your unrestricted assistant.</p>
                    <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                      <p className="font-bold text-white mb-1">Image Generation:</p>
                      <p className="font-mono text-indigo-400 text-xs">image: a cyberpunk city</p>
                    </div>
                    <p>Just type or speak naturally to chat!</p>
                  </>
                )}
              </div>
              <button onClick={() => setActiveModal(null)} className="w-full mt-6 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-medium transition-colors">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 w-full">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold shadow-2xl shadow-indigo-500/30">V</div>
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome to Vybe AI</h2>
              <p className="text-gray-400 mt-2 max-w-xs text-sm mx-auto">Tap the menu icon to start a new chat, view help, or change settings.</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm break-words ${msg.role === "user" ? "bg-indigo-600 text-white rounded-br-md" : "bg-white/5 border border-white/10 text-gray-100 rounded-bl-md"}`}>
                {msg.isImage ? (
                  <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                ) : (
                  <ReactMarkdown
                    components={{
                      a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300 break-all" />,
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeText = String(children).replace(/\n$/, '');
                        return !inline && match ? (
                          <div className="relative my-2 rounded-lg border border-white/5 overflow-hidden">
                            <button
                              onClick={() => handleCopyCode(codeText)}
                              className="absolute top-2 right-2 z-10 bg-white/10 hover:bg-white/20 text-xs text-white px-2 py-1 rounded transition-colors"
                            >
                              {copiedCode === codeText ? 'Copied!' : 'Copy'}
                            </button>
                            <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" className="text-sm m-0 pt-8" {...props}>
                              {codeText}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className="bg-black/40 px-1.5 py-0.5 rounded text-indigo-300 text-sm font-mono" {...props}>{children}</code>
                        );
                      },
                      p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>
                    }}
                  >{msg.content}</ReactMarkdown>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-5 py-4 flex items-center gap-1.5">
              <motion.span animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }} className="w-2 h-2 bg-indigo-400 rounded-full" />
              <motion.span animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
              <motion.span animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-4 border-t border-white/10 bg-[#0a0a0a] shrink-0">
        <div className="relative max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Message Vybe AI..."
            rows={1}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-24 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
            style={{ minHeight: "56px", maxHeight: "200px" }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            <motion.button 
              whileTap={{ scale: 0.9 }} 
              onClick={startVoiceInput}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }} 
              onClick={sendMessage} 
              disabled={!input.trim() || isLoading} 
              className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 text-white rounded-xl flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
