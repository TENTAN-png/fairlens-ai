import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  Upload, BarChart3, Sparkles, History, Settings, Shield,
  Menu, X, LogOut, MessageSquare, Sliders, Grid, Layers,
  Moon, Sun
} from 'lucide-react';
import { auth } from './utils/firebase';
import AuthPage from './components/AuthPage';
import LandingPage from './components/LandingPage';
import UploadPanel from './components/UploadPanel';
import BiasReport from './components/BiasReport';
import AIInsights from './components/AIInsights';
import AuditHistoryPage from './components/AuditHistoryPage';
import SettingsModal from './components/SettingsModal';
import AIChatAssistant from './components/AIChatAssistant';
import WhatIfSimulator from './components/WhatIfSimulator';
import AutoScanHeatmap from './components/AutoScanHeatmap';
import IntersectionalBias from './components/IntersectionalBias';
import { initGeminiAPI, isGeminiReady, initGroqAPI, isGroqReady } from './utils/geminiAPI';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('fairlens_dark') === 'true');
  const [apiKey, setApiKey] = useState(localStorage.getItem('fairlens_api_key') || '');
  const [groqKey, setGroqKey] = useState(localStorage.getItem('fairlens_groq_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [parsedData, setParsedData] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [aiInsightsText, setAiInsightsText] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const isLanding = location.pathname === '/';
  const geminiReady = isGeminiReady();

  // Dark mode toggle
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('fairlens_dark', darkMode);
  }, [darkMode]);

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleSaveApiKey = useCallback((geminiKey, groqApiKey) => {
    if (geminiKey) {
      setApiKey(geminiKey);
      localStorage.setItem('fairlens_api_key', geminiKey);
      initGeminiAPI(geminiKey);
    }
    if (groqApiKey) {
      setGroqKey(groqApiKey);
      localStorage.setItem('fairlens_groq_key', groqApiKey);
      initGroqAPI(groqApiKey);
    }
    setShowSettings(false);
  }, []);

  if (apiKey && !geminiReady) initGeminiAPI(apiKey);
  if (groqKey && !isGroqReady()) initGroqAPI(groqKey);

  if (authLoading) {
    return <div className="auth-page"><div className="spinner"></div></div>;
  }

  if (!user) return <AuthPage />;

  const navItems = [
    { path: '/analyze', label: 'Analyze', icon: Upload },
    { path: '/report', label: 'Report', icon: BarChart3 },
    { path: '/insights', label: 'AI Insights', icon: Sparkles },
    { path: '/chat', label: 'AI Chat', icon: MessageSquare },
    { path: '/simulator', label: 'What-If', icon: Sliders },
    { path: '/scan', label: 'Auto-Scan', icon: Grid },
    { path: '/intersectional', label: 'Intersectional', icon: Layers },
    { path: '/history', label: 'History', icon: History },
  ];

  if (isLanding) {
    return (
      <>
        <LandingPage
          onGetStarted={() => navigate('/analyze')}
          onOpenSettings={() => setShowSettings(true)}
          geminiReady={geminiReady}
        />
        {showSettings && (
          <SettingsModal apiKey={apiKey} groqKey={groqKey} onSave={handleSaveApiKey} onClose={() => setShowSettings(false)} />
        )}
      </>
    );
  }

  const userInitial = user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="app-layout">
      <button className="btn btn-icon" style={{ position: 'fixed', top: 12, left: 12, zIndex: 200, display: 'none' }} id="mobile-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo" onClick={() => navigate('/')}>
            <div className="logo-icon"><Shield size={18} /></div>
            <div>
              <h1>FairLens AI</h1>
              <div className="logo-tag">Bias Detection</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.path}
              className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            >
              <item.icon className="nav-icon" size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-bar" style={{ marginBottom: 8 }}>
            <div className="user-avatar">
              {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : userInitial}
            </div>
            <span className="user-name">{user.displayName || user.email}</span>
            <button className="btn btn-icon" onClick={handleSignOut} title="Sign out" style={{ width: 28, height: 28 }}>
              <LogOut size={14} />
            </button>
          </div>

          {/* Dark mode toggle */}
          <button className="sidebar-nav-item" onClick={() => setDarkMode(!darkMode)} style={{ width: '100%' }}>
            {darkMode ? <Sun size={18} className="nav-icon" /> : <Moon size={18} className="nav-icon" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>

          <button className="sidebar-nav-item" onClick={() => setShowSettings(true)} style={{ width: '100%' }}>
            <Settings size={18} className="nav-icon" />
            Settings
          </button>
          <div className="sidebar-api-status" style={{ marginTop: 8 }}>
            <span className={`status-dot ${geminiReady ? 'connected' : ''}`}></span>
            {geminiReady ? 'API Connected' : 'API Key Required'}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/analyze" element={<UploadPanel parsedData={parsedData} setParsedData={setParsedData} analysisResult={analysisResult} setAnalysisResult={setAnalysisResult} onViewReport={() => navigate('/report')} />} />
          <Route path="/report" element={<BiasReport analysisResult={analysisResult} onGetInsights={() => navigate('/insights')} onGoBack={() => navigate('/analyze')} />} />
          <Route path="/insights" element={<AIInsights analysisResult={analysisResult} geminiReady={geminiReady} aiInsightsText={aiInsightsText} setAiInsightsText={setAiInsightsText} onOpenSettings={() => setShowSettings(true)} onGoBack={() => navigate('/report')} />} />
          <Route path="/chat" element={<AIChatAssistant analysisResult={analysisResult} />} />
          <Route path="/simulator" element={<WhatIfSimulator analysisResult={analysisResult} parsedData={parsedData} />} />
          <Route path="/scan" element={<AutoScanHeatmap parsedData={parsedData} />} />
          <Route path="/intersectional" element={<IntersectionalBias parsedData={parsedData} analysisResult={analysisResult} />} />
          <Route path="/history" element={<AuditHistoryPage setAnalysisResult={setAnalysisResult} setAiInsightsText={setAiInsightsText} onViewReport={() => navigate('/report')} />} />
        </Routes>
      </main>

      {showSettings && <SettingsModal apiKey={apiKey} groqKey={groqKey} onSave={handleSaveApiKey} onClose={() => setShowSettings(false)} />}

      <style>{`@media (max-width: 1024px) { #mobile-menu-toggle { display: flex !important; } }`}</style>
    </div>
  );
}

export default App;
