'use client';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 1. CODE BLOCK COMPONENT
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
    <div className="relative my-3 rounded-lg overflow-hidden border border-white/10 bg-[#1e1e2e]">
      <div className="flex justify-between items-center px-4 py-2 text-xs text-gray-400 border-b border-white/10 bg-[#252536]">
        <span className="font-mono">{match[1].toUpperCase()}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>
      <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.8rem' }} {...props}>
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className="bg-[#1e1e2e] px-1.5 py-0.5 rounded text-xs text-cyan-300 font-mono break-all" {...props}>{children}</code>
  );
};

// 2. IMAGE COMPONENT
const ImageBlock = ({ src }) => (
  <div className="relative group my-3 rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black">
    <img src={src} alt="AI Generated" className="w-full h-auto max-h-[500px] object-contain" />
    <a href={src} download={`vybe-${Date.now()}.jpg`} target="_blank" className="absolute top-2 right-2 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
      ⬇ Download
    </a>
  </div>
);

// 3. CUSTOM MARKDOWN LAYOUT
const MarkdownComponents = {
  p: ({ children }) => <p className="mb-3 text-gray-200 leading-relaxed text-[0.95rem]">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-gray-200">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-gray-200">{children}</ol>,
  li: ({ children }) => <li className="text-gray-200 text-[0.95rem]">{children}</li>,
  h1: ({ children }) => <h1 className="text-xl font-bold text-cyan-400 mb-2 mt-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold text-cyan-300 mb-2 mt-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-bold text-cyan-200 mb-2 mt-2">{children}</h3>,
  table: ({ children }) => (
    <div className="w-full overflow-x-auto my-3 border border-white/10 rounded-lg">
      <table className="w-full text-xs text-left text-gray-300 min-w-[300px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="px-3 py-2 bg-[#252536] border-b border-white/10 font-bold whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 border-b border-white/10 whitespace-nowrap">{children}</td>,
  a: ({ href, children }) => <a href={href} target="_blank" className="text-cyan-400 underline hover:text-cyan-300">{children}</a>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-cyan-500 pl-4 italic text-gray-400 my-3">{children}</blockquote>,
  code: CodeBlock,
  img: () => null // Hide default markdown images so we can render our custom ones
};

// Helper to split text and images
const renderMessageContent = (content) => {
  if (!content) return null;
  // Split by Pollinations URL
  const parts = content.split(/(https:\/\/image\.pollinations\.ai\/prompt\/[^\s\)]+)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('https://image.pollinations.ai/prompt/')) {
      return <ImageBlock key={index} src={part} />;
    }
    if (part.trim()) {
      return (
        <ReactMarkdown
          key={index}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={MarkdownComponents}
        >
          {part}
        </ReactMarkdown>
      );
    }
    return null;
  });
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

  // Register Service Worker for PWA Install
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    }
  }, []);

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
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400"></button>
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
              <div className={`max-w-[90%] min-w-0 p-4 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-[#1a1a24] border border-white/10 text-gray-200 rounded-bl-none'}`}>
                {msg.image && <img src={msg.image} className="max-w-full rounded-lg mb-3 border border-white/20" alt="Uploaded" />}
                
                {/* SMART RENDERER: Separates Images from Text */}
                {renderMessageContent(msg.content)}
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
                <button onClick={() => { setSelectedImage(null); fileInputRef.current.value = ""; }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"></button>
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
