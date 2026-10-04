'use client';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Custom Code Block Component with Copy Button
const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');

  const handleCopy = () => {
    const code = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return !inline && match ? (
    <div className="relative my-4 rounded-lg overflow-hidden border border-white/10 bg-[#1e1e2e]">
      <div className="flex justify-between items-center px-4 py-2 text-xs text-gray-400 border-b border-white/10 bg-[#252536]">
        <span className="font-mono">{match[1].toUpperCase()}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>
      <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.85rem' }} {...props}>
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className="bg-[#1e1e2e] px-1.5 py-0.5 rounded text-sm text-cyan-300 font-mono break-all" {...props}>{children}</code>
  );
};

export default function Home() {
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('vybe_chats');
    if (saved) {
      const parsed = JSON.parse(saved);
      setChats(parsed);
      setCurrentChatId(parsed[0].id);
    } else {
      createNewChat();
    }
  }, []);

  useEffect(() => {
    if (chats.length > 0) localStorage.setItem('vybe_chats', JSON.stringify(chats));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, loading]);

  const createNewChat = () => {
    const newChat = { id: Date.now(), title: 'New Chat', messages: [] };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setSidebarOpen(false);
  };

  const currentChat = chats.find(c => c.id === currentChatId);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || !currentChat || loading) return;
    
    const userMsg = { role: 'user', content: input, image: selectedImage };
    const updatedMessages = [...currentChat.messages, userMsg];
    
    setChats(prev => prev.map(c => 
      c.id === currentChatId 
        ? { ...c, messages: updatedMessages, title: c.messages.length === 0 ? (input || "Image Analysis").substring(0, 25) + '...' : c.title } 
        : c
    ));
    
    const imageToSend = selectedImage;
    setInput('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: updatedMessages, image: imageToSend })
      });
      const data = await res.json();
      const aiMsg = { role: 'assistant', content: data.reply || data.error };

      setChats(prev => prev.map(c => 
        c.id === currentChatId ? { ...c, messages: [...updatedMessages, aiMsg] } : c
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] bg-[#0a0a0f] text-white overflow-hidden">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative md:translate-x-0 z-50 w-64 h-full bg-[#11111a] border-r border-white/10 transition-transform duration-300 flex flex-col`}>
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-bold text-cyan-400">History</h2>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {chats.map(chat => (
            <button key={chat.id} onClick={() => { setCurrentChatId(chat.id); setSidebarOpen(false); }}
              className={`w-full text-left p-3 rounded-lg text-sm truncate transition-colors ${chat.id === currentChatId ? 'bg-cyan-900/30 border border-cyan-500/50 text-cyan-300' : 'hover:bg-white/5 text-gray-400'}`}>
              {chat.title}
            </button>
          ))}
        </div>
        <button onClick={createNewChat} className="m-4 p-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors">+ New Chat</button>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full relative w-full min-w-0">
        <div className="relative z-10 p-4 border-b border-white/10 flex items-center gap-4 bg-[#0a0a0f]">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-2xl text-cyan-400">☰</button>
          <h1 className="text-xl font-bold text-cyan-400">Vybe AI</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentChat?.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {/* FIX: Added min-w-0 and overflow-hidden to prevent text from breaking the bubble */}
              <div className={`max-w-[85%] min-w-0 p-4 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-[#1a1a24] border border-white/10 text-gray-200 rounded-bl-none'}`}>
                {msg.image && <img src={msg.image} className="max-w-full rounded-lg mb-3 border border-white/20" alt="Uploaded" />}
                
                {/* FIX: Wrapped Markdown in overflow-x-auto to handle wide tables/code */}
                <div className="w-full overflow-x-auto break-words text-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{ code: CodeBlock }}
                    className="prose prose-invert prose-sm max-w-none break-words [&_table]:w-full [&_table]:text-xs [&_pre]:overflow-x-auto [&_img]:max-w-full"
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#1a1a24] p-4 rounded-2xl rounded-bl-none border border-white/10">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="relative z-10 p-4 border-t border-white/10 bg-[#0a0a0f]">
          <div className="flex flex-col gap-2 max-w-4xl mx-auto">
            {selectedImage && (
              <div className="relative w-fit">
                <img src={selectedImage} className="h-20 rounded-lg border border-cyan-500/50" alt="Preview" />
                <button onClick={() => { setSelectedImage(null); fileInputRef.current.value = ""; }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
              </div>
            )}
            <div className="flex gap-2">
              <label className="cursor-pointer bg-[#1a1a24] border border-white/10 p-3 rounded-xl hover:bg-white/5 transition-colors flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Message Vybe AI or upload an image..."
                className="flex-1 bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors" />
              <button onClick={sendMessage} disabled={loading || (!input.trim() && !selectedImage)}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold transition-colors">➤</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
