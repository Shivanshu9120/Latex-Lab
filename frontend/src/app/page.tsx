'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  Sparkles, 
  Download, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Info,
  Maximize2,
  Minimize2,
  RefreshCw,
  LogIn,
  LogOut,
  Save,
  FolderOpen,
  User,
  Plus,
  Trash
} from 'lucide-react';

const INITIAL_TEMPLATE = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{tabularx}
\\usepackage[hidelinks]{hyperref}

\\begin{document}

\\begin{center}
    {\\Large \\textbf{Shivanshu Singh}} \\\\[4pt]
    Lucknow, Uttar Pradesh, India \\\\[2pt]
    +91 9140284510 \\quad | \\quad \\href{mailto:kshatriyasarkar214@gmail.com}{kshatriyasarkar214@gmail.com}
\\end{center}

\\section*{Professional Summary}
B.Tech graduate in Information Technology with strong foundations in \\textbf{Python Programming, Data Structures and Algorithms, Object-Oriented Programming, and Software Engineering}. Experienced in developing backend APIs, machine learning systems, and full-stack applications using Next.js and Django.

\\section*{Education}
\\begin{tabularx}{\\textwidth}{|p{3cm}|X|p{2cm}|p{2cm}|}
\\hline
\\textbf{Degree} & \\textbf{Institute} & \\textbf{CGPA / \\%} & \\textbf{Year} \\\\
\\hline
B.Tech (IT) & Rajkiya Engineering College, Azamgarh (AKTU) & 8.67 CGPA & 2022--2026 \\\\
\\hline
Class XII & Lucknow Public College, Lucknow & 96.8\\% & 2021 \\\\
\\hline
\\end{tabularx}

\\section*{Technical Skills}
\\textbf{Programming Languages:} Python, C++, JavaScript, TypeScript \\\\[2pt]
\\textbf{Python Technologies:} Flask, Django, NumPy, Pandas, Scikit-learn \\\\[2pt]
\\textbf{Web Technologies:} React.js, Next.js, Node.js, Express.js, HTML5, CSS3 \\\\[2pt]
\\textbf{Tools:} Git, GitHub, Postman, Docker, VS Code

\\section*{Industrial Experience}
\\textbf{Software Engineer Intern --- Meteorite Labs (Remote)} \\hfill \\textbf{June 2025 -- Present}
\\begin{itemize}
    \\item Developed backend services using Python, Flask, and Django for API integration.
    \\item Collaborated with cross-functional teams on feature testing, debugging, and code optimization.
\\end{itemize}

\\section*{Leadership \\& Responsibilities}
\\begin{itemize}
    \\item Secretary, College Technical Club --- Organized technical events and hackathons.
    \\item Hostel Secretary --- Managed student welfare and admin communication.
\\end{itemize}

\\end{document}
`;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface SavedDoc {
  _id: string;
  title: string;
  created_at: string;
}

export default function EditorPage() {
  const [code, setCode] = useState<string>(INITIAL_TEMPLATE);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [compiling, setCompiling] = useState<boolean>(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'level1' | 'level2' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Authentication states
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Auth Form Inputs
  const [authUsername, setAuthUsername] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Document Management States
  const [savedDocs, setSavedDocs] = useState<SavedDoc[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeDocTitle, setActiveDocTitle] = useState<string>('Untitled Document');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [showDocSidebar, setShowDocSidebar] = useState<boolean>(false);

  // Check auth token and fetch profile on load
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
      fetchUserProfile(savedToken);
    }
  }, []);

  // Fetch documents list when user logs in
  useEffect(() => {
    if (token) {
      fetchUserDocuments(token);
    } else {
      setSavedDocs([]);
      setActiveDocId(null);
      setActiveDocTitle('Untitled Document');
    }
  }, [token]);

  // Clean up ObjectURL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
        headers: { 'Authorization': `Token ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUser({ username: data.username, email: data.email });
      } else {
        // Token is invalid/expired
        handleLogoutLocal();
      }
    } catch {
      handleLogoutLocal();
    }
  };

  const fetchUserDocuments = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/`, {
        headers: { 'Authorization': `Token ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSavedDocs(data);
      }
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const endpoint = authMode === 'login' ? 'login/' : 'signup/';
    const body = authMode === 'login' 
      ? { username: authUsername, password: authPassword }
      : { username: authUsername, email: authEmail, password: authPassword };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }

      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      resetAuthForm();
    } catch {
      setAuthError('Cannot connect to authorization backend.');
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout/`, {
          method: 'POST',
          headers: { 'Authorization': `Token ${token}` },
        });
      } catch (err) {
        console.error('Logout request failed', err);
      }
    }
    handleLogoutLocal();
  };

  const handleLogoutLocal = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    setShowDocSidebar(false);
  };

  const resetAuthForm = () => {
    setAuthUsername('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthError(null);
  };

  const handleSaveDocument = async () => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    if (!activeDocId) {
      // Prompt for title if it's a new document
      setShowSaveModal(true);
      return;
    }

    // Otherwise, perform direct update
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${activeDocId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ title: activeDocTitle, code }),
      });
      if (response.ok) {
        alert('Document updated successfully!');
        fetchUserDocuments(token);
      } else {
        alert('Failed to update document.');
      }
    } catch {
      alert('Network error while saving document.');
    }
  };

  const handleCreateNewDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ title: activeDocTitle, code }),
      });
      const data = await response.json();
      if (response.ok) {
        setActiveDocId(data.id);
        setShowSaveModal(false);
        fetchUserDocuments(token);
        alert('Document saved successfully!');
      } else {
        alert(data.error || 'Failed to save document.');
      }
    } catch {
      alert('Network error while saving document.');
    }
  };

  const loadDocument = async (docId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${docId}/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCode(data.source_code);
        setActiveDocId(data._id);
        setActiveDocTitle(data.title);
        setShowDocSidebar(false);
      }
    } catch {
      alert('Failed to load document content.');
    }
  };

  const handleCompile = async (mode: 'level1' | 'level2') => {
    setCompiling(true);
    setErrorLog(null);
    setActiveMode(mode);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/compile/?mode=${mode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorLog(errorData.log || errorData.error || 'A compilation error occurred.');
        setPdfUrl(null);
        setPdfBlob(null);
        return;
      }

      const blob = await response.blob();
      setPdfBlob(blob);
      
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      const fileUrl = URL.createObjectURL(blob);
      setPdfUrl(fileUrl);
    } catch (err) {
      setErrorLog(`Failed to connect to the compilation server. Please ensure the Django backend is running at ${API_BASE_URL}.`);
      setPdfUrl(null);
      setPdfBlob(null);
    } finally {
      setCompiling(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pdfBlob);
    a.download = `${activeDocTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNewBlankDoc = () => {
    setCode(INITIAL_TEMPLATE);
    setActiveDocId(null);
    setActiveDocTitle('Untitled Document');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0b1329] text-slate-100 overflow-hidden select-none">
      {/* Top Header Navigation */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#080d1c] border-b border-[#1e2e5c]/50 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
            <span className="font-extrabold text-white text-base">L</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">
                LaTeX Lab
              </h1>
              <span className="text-[10px] text-slate-400">/</span>
              <span className="text-xs font-medium text-indigo-300 truncate max-w-[120px]">{activeDocTitle}</span>
            </div>
            <p className="text-[10px] text-slate-400">Web Editor & Real-time Compiler</p>
          </div>
        </div>

        {/* Compile Operations */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleCompile('level1')}
            disabled={compiling}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-900/20 transition cursor-pointer"
          >
            {compiling && activeMode === 'level1' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-white" />
            )}
            Compile (Tectonic)
          </button>
          
          <button 
            onClick={() => handleCompile('level2')}
            disabled={compiling}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-950/20 transition cursor-pointer"
          >
            {compiling && activeMode === 'level2' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Transpile (HTML)
          </button>

          {pdfBlob && (
            <button 
              onClick={handleDownload}
              className="flex items-center justify-center p-2 bg-[#1e2e5c]/40 hover:bg-[#1e2e5c]/60 text-indigo-300 border border-[#1e2e5c]/60 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Download PDF"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* User Account Controls */}
        <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
          {user ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowDocSidebar(!showDocSidebar)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-[#1e2e5c]/30 rounded-lg text-xs font-semibold text-slate-300 transition cursor-pointer"
              >
                <FolderOpen className="h-3.5 w-3.5 text-indigo-400" />
                Docs
              </button>
              
              <button 
                onClick={handleSaveDocument}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/30 rounded-lg text-xs font-semibold text-[#10b981] transition cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>

              <div className="flex items-center gap-2 bg-[#1e2e5c]/25 border border-[#1e2e5c]/30 px-3 py-1.5 rounded-lg">
                <User className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">{user.username}</span>
              </div>

              <button 
                onClick={handleLogout}
                className="flex items-center justify-center p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                title="Log Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { resetAuthForm(); setAuthMode('login'); setShowAuthModal(true); }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-tr from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-900/20 transition cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Panel View */}
      <main className="flex flex-1 overflow-hidden relative">
        
        {/* Document List Sidebar (authenticated users) */}
        {user && showDocSidebar && (
          <div className="w-64 bg-[#090f1f] border-r border-[#1e2e5c]/35 flex flex-col z-20 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-[#1e2e5c]/20 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4 text-indigo-400" />
                My Documents
              </span>
              <button 
                onClick={handleNewBlankDoc}
                className="p-1 hover:bg-[#1e2e5c]/30 rounded text-slate-400 hover:text-white transition cursor-pointer"
                title="New Document"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {savedDocs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No saved files found.
                </div>
              ) : (
                savedDocs.map(doc => (
                  <button
                    key={doc._id}
                    onClick={() => loadDocument(doc._id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${doc._id === activeDocId ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/25' : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'}`}
                  >
                    <span className="truncate">{doc.title}</span>
                    <span className="text-[9px] text-slate-500 font-mono">{new Date(doc.created_at).toLocaleDateString()}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Editor Area (Left Side) */}
        <div className={`h-full border-r border-[#1e2e5c]/30 flex flex-col transition-all duration-300 ${isFullscreen ? 'w-0 hidden' : 'w-1/2'}`}>
          <div className="flex items-center justify-between px-4 py-2 bg-[#091024] border-b border-[#1e2e5c]/20 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-indigo-400" />
              source.tex
            </span>
            <button 
              onClick={() => setCode(INITIAL_TEMPLATE)}
              className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Reset Template
            </button>
          </div>
          <div className="flex-1 overflow-hidden bg-[#070c1a]">
            <Editor
              height="100%"
              defaultLanguage="latex"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                fontSize: 14,
                fontFamily: 'Consolas, "Fira Code", monospace',
                minimap: { enabled: false },
                wordWrap: 'on',
                lineHeight: 22,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                padding: { top: 12, bottom: 12 },
                scrollbar: {
                  verticalSliderSize: 6,
                  horizontalSliderSize: 6
                }
              }}
            />
          </div>
        </div>

        {/* Preview Area (Right Side) */}
        <div className={`h-full bg-[#050812] flex flex-col relative transition-all duration-300 ${isFullscreen ? 'w-full' : 'w-1/2'}`}>
          <div className="flex items-center justify-between px-4 py-2 bg-[#091024] border-b border-[#1e2e5c]/20 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              PDF Output Preview
            </span>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-slate-500 hover:text-slate-300 transition cursor-pointer p-0.5 rounded hover:bg-[#1e2e5c]/30"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Compilation Spinner Overlay */}
          {compiling && (
            <div className="absolute inset-0 bg-[#050812]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Compiling your LaTeX...</p>
                <p className="text-xs text-slate-400 mt-1">
                  {activeMode === 'level1' ? 'Downloading packages and running Tectonic' : 'Transpiling tags to PDF'}
                </p>
              </div>
            </div>
          )}

          {/* Preview Container */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center">
            {pdfUrl ? (
              <iframe 
                src={`${pdfUrl}#toolbar=0&navpanes=0`} 
                className="w-full h-full rounded-xl shadow-2xl border border-[#1e2e5c]/30 bg-white"
              />
            ) : errorLog ? (
              <div className="w-full max-h-full overflow-hidden flex flex-col bg-red-950/20 border border-red-900/50 rounded-xl p-5 text-red-300 font-mono text-sm shadow-xl">
                <div className="flex items-center gap-2 text-red-400 font-bold mb-3 border-b border-red-900/30 pb-2">
                  <AlertCircle className="h-5 w-5" />
                  Compilation Failed
                </div>
                <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-xs font-mono text-red-200/90 leading-5 pr-2 select-text">
                  {errorLog}
                </div>
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed border-[#1e2e5c]/30 rounded-2xl max-w-sm bg-[#091024]/20">
                <Info className="h-8 w-8 text-indigo-400/60 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-200">No Compiled Document</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Make your modifications in the editor and click either <strong className="text-indigo-400">Compile (Tectonic)</strong> or <strong className="text-emerald-400">Transpile (HTML)</strong> above to render the PDF.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* AUTH MODAL (Login / SignUp) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#091024] border border-[#1e2e5c]/50 rounded-2xl shadow-2xl overflow-hidden p-6 relative animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white mb-1">
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              {authMode === 'login' ? 'Login to save your documents in MongoDB.' : 'Sign up to unlock document storage.'}
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Username</label>
                <input 
                  type="text" 
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full bg-[#060b19] border border-[#1e2e5c]/40 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  placeholder="e.g. shivanshu"
                  required
                />
              </div>

              {authMode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-[#060b19] border border-[#1e2e5c]/40 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    placeholder="e.g. user@domain.com"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Password</label>
                <input 
                  type="password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#060b19] border border-[#1e2e5c]/40 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  placeholder="••••••••"
                  required
                />
              </div>

              {authError && (
                <div className="p-3 bg-red-950/30 border border-red-900/50 text-red-400 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-950/40 transition cursor-pointer"
              >
                {authMode === 'login' ? 'Login' : 'Sign Up'}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-slate-400 border-t border-[#1e2e5c]/25 pt-4">
              {authMode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button 
                    onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                    className="text-indigo-400 font-semibold hover:underline cursor-pointer"
                  >
                    Create Account
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button 
                    onClick={() => { setAuthMode('login'); setAuthError(null); }}
                    className="text-indigo-400 font-semibold hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>

            <button 
              onClick={() => { setShowAuthModal(false); resetAuthForm(); }}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* SAVE DOCUMENT DIALOG MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#091024] border border-[#1e2e5c]/50 rounded-2xl p-6 relative animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-white mb-1">Save New Document</h3>
            <p className="text-xs text-slate-400 mb-4">Enter a title to save this file to MongoDB.</p>
            
            <form onSubmit={handleCreateNewDocument} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Document Title</label>
                <input 
                  type="text"
                  value={activeDocTitle}
                  onChange={(e) => setActiveDocTitle(e.target.value)}
                  className="w-full bg-[#060b19] border border-[#1e2e5c]/40 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Save to Database
              </button>
            </form>

            <button 
              onClick={() => setShowSaveModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
