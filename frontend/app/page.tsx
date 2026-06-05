'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, Calendar, Mail, Newspaper, History, 
  User as UserIcon, LogOut, Sparkles, AlertCircle, CheckCircle2,
  Upload, File as FileIcon, Loader2, Database, ShieldCheck, BarChart3,
  Download, Briefcase, Zap, Scale, PenTool, Search, Link as LinkIcon
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000/api";

const Toast = ({ message, type, onClose }) => (
  <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
    className={`fixed top-8 right-8 flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl z-[100] border backdrop-blur-3xl ${
      type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-blue-500/10 border-blue-500/20 text-blue-200'
    }`}
  >
    {type === 'error' ? <AlertCircle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-blue-500" />}
    <span className="text-[11px] font-bold uppercase tracking-wider">{message}</span>
    <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100">✕</button>
  </motion.div>
);

export default function Home() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [authForm, setAuthForm] = useState({ user: '', pass: '' });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const [usage, setUsage] = useState({ token_usage: 0, token_limit: 50000, tier: 'Free' });
  const [persona, setPersona] = useState('General');
  const [uploading, setUploading] = useState(false);
  const chatEndRef = useRef(null);

  const personas = [
    { id: 'General', icon: Zap, label: '일반 비서', color: 'text-blue-400' },
    { id: 'Expert', icon: Briefcase, label: '전략 컨설턴트', color: 'text-purple-400' },
    { id: 'Creative', icon: PenTool, label: '카피라이터', color: 'text-pink-400' },
    { id: 'Legal', icon: Scale, label: '법률 전문가', color: 'text-emerald-400' },
  ];

  useEffect(() => {
    const saved = localStorage.getItem('token');
    if (saved) { setToken(saved); setUser(localStorage.getItem('user')); }
  }, []);

  useEffect(() => {
    if (token) { fetchSaaSInfo(); chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }
  }, [messages, token]);

  const showToast = (message, type = 'error') => { setToast({ message, type }); setTimeout(() => setToast(null), 4000); };

  const fetchSaaSInfo = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [fRes, uRes] = await Promise.all([fetch(`${API_BASE}/files`, { headers }), fetch(`${API_BASE}/usage`, { headers })]);
      if (fRes.ok) setFiles(await fRes.json());
      if (uRes.ok) setUsage(await uRes.json());
    } catch (e) {}
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      const data = await res.json();
      showToast(data.message, "success");
      fetchSaaSInfo();
    } catch (e) { showToast("업로드 실패"); }
    finally { setUploading(false); }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const url = isLogin ? `${API_BASE}/login` : `${API_BASE}/signup?username=${encodeURIComponent(authForm.user)}&password=${encodeURIComponent(authForm.pass)}`;
    try {
      let res;
      if (isLogin) {
        const body = new URLSearchParams();
        body.append('username', authForm.user);
        body.append('password', authForm.pass);
        res = await fetch(url, { method: 'POST', body });
      } else {
        res = await fetch(url, { method: 'POST' });
      }
      if (res.ok) {
        const data = await res.json();
        if (isLogin) {
          setToken(data.access_token);
          setUser(authForm.user);
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('user', authForm.user);
        } else {
          showToast("회원가입 성공!", "success");
          setIsLogin(true);
        }
      } else { showToast("인증 실패"); }
    } catch (e) { showToast("서버 오류"); }
    finally { setLoading(false); }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messages: [...messages, userMsg], persona })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', ...data }]);
    } catch (e) { showToast("응답 오류"); }
    finally { setLoading(false); }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <AnimatePresence>{toast && <Toast {...toast} onClose={() => setToast(null)} />}</AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md p-10 bg-neutral-900 rounded-[3rem] border border-white/5 shadow-2xl">
          <div className="text-center mb-10">
            <Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase text-center">AI Agent Max</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="text" placeholder="Username" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={authForm.user} onChange={e => setAuthForm({...authForm, user: e.target.value})} />
            <input type="password" placeholder="Password" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={authForm.pass} onChange={e => setAuthForm({...authForm, pass: e.target.value})} />
            <button className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-white transition-all shadow-xl shadow-blue-600/20" disabled={loading}>{loading ? '...' : (isLogin ? 'Enter' : 'Create')}</button>
          </form>
          <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center mt-6 text-xs text-gray-500 font-bold uppercase hover:text-blue-400">{isLogin ? "Sign Up" : "Log In"}</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white flex overflow-hidden font-sans">
      <AnimatePresence>{toast && <Toast {...toast} onClose={() => setToast(null)} />}</AnimatePresence>
      
      {/* SaaS Sidebar */}
      <div className="w-80 bg-neutral-900/50 border-r border-white/5 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="font-black text-lg uppercase tracking-tighter italic">SaaS Hub</h2>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">
            <span>Usage</span>
            <span className="text-blue-400">{usage.tier} Tier</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(usage.token_usage / usage.token_limit) * 100}%` }} className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
          </div>
          <div className="flex justify-between text-[9px] font-black text-gray-600 uppercase px-1">
            <span>{usage.token_usage.toLocaleString()} used</span>
            <span>{usage.token_limit.toLocaleString()} max</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-8">
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-1">지식 베이스</h3>
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-white/5 rounded-[2rem] hover:bg-white/5 transition-all cursor-pointer group mb-4">
              {uploading ? <Loader2 className="animate-spin text-blue-500" /> : <Upload className="w-5 h-5 text-gray-600 group-hover:text-blue-400" />}
              <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
            </label>
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 text-[11px] text-gray-400 truncate">
                  <FileIcon className="w-3 h-3 text-blue-500" /> {f.filename}
                </div>
              ))}
            </div>
          </div>
        </div>

        <button onClick={() => { setToken(null); localStorage.clear(); }} className="p-4 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all">Log Out</button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col relative">
        <div className="p-6 border-b border-white/5 flex items-center justify-center gap-3 bg-black/20 backdrop-blur-md">
          {personas.map(p => (
            <button key={p.id} onClick={() => setPersona(p.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${persona === p.id ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              <p.icon className={`w-4 h-4 ${p.color}`} />
              <span className="text-[11px] font-bold uppercase tracking-tight">{p.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
              <Sparkles className="w-20 h-20 mb-6" />
              <h2 className="text-5xl font-black italic uppercase tracking-tighter">Ready to Expand</h2>
              <p className="mt-4 font-bold tracking-widest">URL 주소를 던지거나 문서를 질문하세요.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%] group">
                <div className={`p-7 rounded-[2.5rem] shadow-2xl ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-blue-600/20' : 'bg-[#0f0f0f] border border-white/5 rounded-bl-none'}`}>
                  {/* Reasoning Logs (Bixby style) */}
                  {m.role === 'assistant' && m.logs && (
                    <div className="mb-6 space-y-2 border-l-2 border-blue-500/30 pl-4 py-1">
                      {m.logs.map((log, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest animate-pulse">
                          {log.includes('🔗') ? <LinkIcon className="w-3 h-3 text-blue-400" /> : <Search className="w-3 h-3 text-purple-400" />}
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-blue-400">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                </div>
                {m.role === 'assistant' && (
                  <div className="flex gap-2 mt-4 ml-4">
                    {m.actions?.map(a => (
                      <button key={a} onClick={() => sendMessage(a)} className="px-4 py-2 bg-white/5 hover:bg-blue-600 hover:text-white border border-white/10 rounded-2xl text-[10px] font-bold uppercase transition-all text-gray-500 tracking-tighter">{a}</button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {loading && <div className="ml-4 flex items-center gap-3 text-blue-500 text-xs font-black uppercase tracking-[0.3em] animate-pulse"><Loader2 className="animate-spin w-4 h-4" /> Agent Thinking...</div>}
          <div ref={chatEndRef} />
        </div>

        {/* Action Input Area */}
        <div className="p-10 pt-0">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-[3rem] p-3 flex gap-4 shadow-2xl ring-2 ring-white/5 items-center backdrop-blur-3xl">
            <div className="w-14 h-14 bg-white/5 rounded-[1.8rem] flex items-center justify-center text-blue-500 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <input className="flex-1 bg-transparent px-2 py-4 outline-none text-sm text-white placeholder-gray-700 font-medium" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage(input)} placeholder="URL 주소를 입력하거나 지식을 물어보세요..." disabled={loading} />
            <button onClick={() => { sendMessage(input); setInput(''); }} disabled={loading || !input.trim()} className="w-16 h-14 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 rounded-[1.8rem] transition-all flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
              <Send className="w-7 h-7" />
            </button>
          </div>
          <div className="mt-6 flex justify-center gap-10 text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">
             <span className="flex items-center gap-2"><LinkIcon className="w-3 h-3 text-blue-500" /> Auto-Scraping</span>
             <span className="flex items-center gap-2"><Database className="w-3 h-3 text-purple-500" /> Infinite Coverage</span>
             <span className="flex items-center gap-2"><Search className="w-3 h-3 text-emerald-500" /> Multi-Source RAG</span>
          </div>
        </div>
      </div>
    </div>
  );
}
