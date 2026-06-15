import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  Upload, BarChart3, Sparkles, History, Settings, Shield,
  Menu, X, LogOut, MessageSquare, Sliders, Grid, Layers,
  Moon, Sun, Cpu, ClipboardCheck, GitBranch, Bell, Award,
  FileText, Activity, ShieldAlert, Target, RefreshCw, Calendar,
  Radio, GitCompare, Rocket, Wand2, Trophy, Share2
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
import MultiAgentAuditor from './components/MultiAgentAuditor';
import ComplianceChecker from './components/ComplianceChecker';
import FairnessDigitalTwin from './components/FairnessDigitalTwin';

// New advanced components
import GovernanceDashboard from './components/GovernanceDashboard';
import DatasetHealthCenter from './components/DatasetHealthCenter';
import BiasRiskPredictor from './components/BiasRiskPredictor';
import DecisionDrivers from './components/DecisionDrivers';
import DecisionConsistencyCheck from './components/DecisionConsistencyCheck';
import SmartDataGenerator from './components/SmartDataGenerator';
import DocumentAuditor from './components/DocumentAuditor';
import GenAIAuditor from './components/GenAIAuditor';
import AlertCenter from './components/AlertCenter';
import FairnessTimeline from './components/FairnessTimeline';
import GovernanceScore from './components/GovernanceScore';
import FairlensCertification from './components/FairlensCertification';
import BenchmarkCenter from './components/BenchmarkCenter';
import RealTimeMonitoring from './components/RealTimeMonitoring';
import ComparisonStudio from './components/ComparisonStudio';
import DeploymentSafetyCheck from './components/DeploymentSafetyCheck';
import AutoImprovementEngine from './components/AutoImprovementEngine';
import RelationshipExplorer from './components/RelationshipExplorer';
import ModelInspectionStudio from './components/ModelInspectionStudio';

import { initGeminiAPI, isGeminiReady, initGroqAPI, isGroqReady } from './utils/geminiAPI';
import { checkBackendHealth, isBackendAvailable } from './utils/backendAPI';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('fairlens_dark') === 'true');
  const [apiKey, setApiKey] = useState(localStorage.getItem('fairlens_api_key') || '');
  const [groqKey, setGroqKey] = useState(localStorage.getItem('fairlens_groq_key') || localStorage.getItem('fairlens_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [parsedData, setParsedData] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [aiInsightsText, setAiInsightsText] = useState('');
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [backendOnline, setBackendOnline] = useState(false);

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

  // Sync Alert Counter
  const updateAlertCount = useCallback(() => {
    try {
      const saved = localStorage.getItem('fairlens_alerts');
      if (saved) {
        const alerts = JSON.parse(saved);
        setUnreadAlerts(alerts.filter(a => !a.read).length);
      } else {
        setUnreadAlerts(3); // Default count of default alerts
      }
    } catch {
      setUnreadAlerts(0);
    }
  }, []);

  useEffect(() => {
    updateAlertCount();
    window.addEventListener('storage', updateAlertCount);
    return () => window.removeEventListener('storage', updateAlertCount);
  }, [updateAlertCount]);

  // Check backend health on mount and every 30 seconds
  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
    const interval = setInterval(() => checkBackendHealth().then(setBackendOnline), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleSaveApiKey = useCallback((geminiKey, groqApiKey) => {
    // Auto-detect key type and route correctly
    const isGroqKey = (k) => k && (k.startsWith('gsk_') || k.startsWith('AQ.') || (k.length > 40 && !k.startsWith('AIza')));
    if (geminiKey) {
      if (isGroqKey(geminiKey)) {
        // User pasted a Groq key in the Gemini field — auto-route
        setGroqKey(geminiKey);
        localStorage.setItem('fairlens_groq_key', geminiKey);
        initGroqAPI(geminiKey);
      } else {
        setApiKey(geminiKey);
        localStorage.setItem('fairlens_api_key', geminiKey);
        initGeminiAPI(geminiKey);
      }
    }
    if (groqApiKey) {
      setGroqKey(groqApiKey);
      localStorage.setItem('fairlens_groq_key', groqApiKey);
      initGroqAPI(groqApiKey);
    }
    setShowSettings(false);
  }, []);

  if (apiKey && !isGroqReady()) initGeminiAPI(apiKey);
  if (groqKey && !isGroqReady()) initGroqAPI(groqKey);

  if (authLoading) {
    return <div className="auth-page"><div className="spinner"></div></div>;
  }

  if (!user) return <AuthPage />;

  if (isLanding) {
    return (
      <>
        <LandingPage
          onGetStarted={() => navigate('/dashboard')}
          onOpenSettings={() => {}}
          geminiReady={geminiReady}
        />
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
          <div className="sidebar-logo" onClick={() => navigate('/dashboard')}>
            <div className="logo-icon"><Shield size={18} /></div>
            <div>
              <h1>FairLens AI</h1>
              <div className="logo-tag">AI Governance Platform</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-group">
            <div className="sidebar-group-title">OVERVIEW</div>
            <button className={`sidebar-nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={() => { navigate('/dashboard'); setSidebarOpen(false); }}>
              <BarChart3 className="nav-icon" size={18} /> Dashboard
            </button>
          </div>

          <div className="sidebar-group">
            <div className="sidebar-group-title">ANALYZE</div>
            <button className={`sidebar-nav-item ${location.pathname === '/analyze' ? 'active' : ''}`} onClick={() => { navigate('/analyze'); setSidebarOpen(false); }}>
              <Upload className="nav-icon" size={18} /> Upload Data
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/health' ? 'active' : ''}`} onClick={() => { navigate('/health'); setSidebarOpen(false); }}>
              <Activity className="nav-icon" size={18} /> Data Health
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/risk-predictor' ? 'active' : ''}`} onClick={() => { navigate('/risk-predictor'); setSidebarOpen(false); }}>
              <ShieldAlert className="nav-icon" size={18} /> Risk Predictor
            </button>
          </div>

          <div className="sidebar-group">
            <div className="sidebar-group-title">FAIRNESS</div>
            <button className={`sidebar-nav-item ${location.pathname === '/report' ? 'active' : ''}`} onClick={() => { navigate('/report'); setSidebarOpen(false); }}>
              <BarChart3 className="nav-icon" size={18} /> Fairness Report
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/drivers' ? 'active' : ''}`} onClick={() => { navigate('/drivers'); setSidebarOpen(false); }}>
              <Target className="nav-icon" size={18} /> Decision Drivers
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/consistency' ? 'active' : ''}`} onClick={() => { navigate('/consistency'); setSidebarOpen(false); }}>
              <RefreshCw className="nav-icon" size={18} /> Consistency Check
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/timeline' ? 'active' : ''}`} onClick={() => { navigate('/timeline'); setSidebarOpen(false); }}>
              <Calendar className="nav-icon" size={18} /> Timeline
            </button>
          </div>

          <div className="sidebar-group">
            <div className="sidebar-group-title">AI TOOLS</div>
            <button className={`sidebar-nav-item ${location.pathname === '/chat' ? 'active' : ''}`} onClick={() => { navigate('/chat'); setSidebarOpen(false); }}>
              <MessageSquare className="nav-icon" size={18} /> AI Copilot
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/insights' ? 'active' : ''}`} onClick={() => { navigate('/insights'); setSidebarOpen(false); }}>
              <Sparkles className="nav-icon" size={18} /> AI Insights
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/audit' ? 'active' : ''}`} onClick={() => { navigate('/audit'); setSidebarOpen(false); }}>
              <Cpu className="nav-icon" size={18} /> Multi-Agent Audit
            </button>
          </div>

          <div className="sidebar-group">
            <div className="sidebar-group-title">GOVERNANCE</div>
            <button className={`sidebar-nav-item ${location.pathname === '/governance-score' ? 'active' : ''}`} onClick={() => { navigate('/governance-score'); setSidebarOpen(false); }}>
              <ClipboardCheck className="nav-icon" size={18} /> Governance Score
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/compliance' ? 'active' : ''}`} onClick={() => { navigate('/compliance'); setSidebarOpen(false); }}>
              <ClipboardCheck className="nav-icon" size={18} /> Compliance
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/alerts' ? 'active' : ''}`} onClick={() => { navigate('/alerts'); setSidebarOpen(false); }}>
              <Bell className="nav-icon" size={18} /> Alerts
              {unreadAlerts > 0 && <span className="nav-badge" style={{ marginLeft: 'auto', background: 'var(--red)', color: 'white', borderRadius: '10px', padding: '2px 6px', fontSize: '0.6875rem', fontWeight: 'bold' }}>{unreadAlerts}</span>}
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/certification' ? 'active' : ''}`} onClick={() => { navigate('/certification'); setSidebarOpen(false); }}>
              <Award className="nav-icon" size={18} /> Certification
            </button>
          </div>

          <div className="sidebar-group">
            <div className="sidebar-group-title">AUDIT</div>
            <button className={`sidebar-nav-item ${location.pathname === '/document-audit' ? 'active' : ''}`} onClick={() => { navigate('/document-audit'); setSidebarOpen(false); }}>
              <FileText className="nav-icon" size={18} /> Document Audit
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/genai-audit' ? 'active' : ''}`} onClick={() => { navigate('/genai-audit'); setSidebarOpen(false); }}>
              <Cpu className="nav-icon" size={18} /> AI System Audit
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/model-inspection' ? 'active' : ''}`} onClick={() => { navigate('/model-inspection'); setSidebarOpen(false); }}>
              <Cpu className="nav-icon" size={18} /> Model Inspection Studio
            </button>
          </div>

          <div className="sidebar-group">
            <div className="sidebar-group-title">SIMULATE</div>
            <button className={`sidebar-nav-item ${location.pathname === '/digital-twin' ? 'active' : ''}`} onClick={() => { navigate('/digital-twin'); setSidebarOpen(false); }}>
              <GitBranch className="nav-icon" size={18} /> Digital Twin
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/simulator' ? 'active' : ''}`} onClick={() => { navigate('/simulator'); setSidebarOpen(false); }}>
              <Sliders className="nav-icon" size={18} /> What-If
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/comparison' ? 'active' : ''}`} onClick={() => { navigate('/comparison'); setSidebarOpen(false); }}>
              <GitCompare className="nav-icon" size={18} /> Comparison Studio
            </button>
          </div>

          <div className="sidebar-group">
            <div className="sidebar-group-title">TOOLS</div>
            <button className={`sidebar-nav-item ${location.pathname === '/scan' ? 'active' : ''}`} onClick={() => { navigate('/scan'); setSidebarOpen(false); }}>
              <Grid className="nav-icon" size={18} /> Auto-Scan
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/intersectional' ? 'active' : ''}`} onClick={() => { navigate('/intersectional'); setSidebarOpen(false); }}>
              <Layers className="nav-icon" size={18} /> Intersectional
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/data-generator' ? 'active' : ''}`} onClick={() => { navigate('/data-generator'); setSidebarOpen(false); }}>
              <Sparkles className="nav-icon" size={18} /> Data Generator
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/improvement' ? 'active' : ''}`} onClick={() => { navigate('/improvement'); setSidebarOpen(false); }}>
              <Wand2 className="nav-icon" size={18} /> Auto-Improvement
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/benchmark' ? 'active' : ''}`} onClick={() => { navigate('/benchmark'); setSidebarOpen(false); }}>
              <Trophy className="nav-icon" size={18} /> Benchmark
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/monitoring' ? 'active' : ''}`} onClick={() => { navigate('/monitoring'); setSidebarOpen(false); }}>
              <Radio className="nav-icon" size={18} /> Live Monitoring
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/deployment-check' ? 'active' : ''}`} onClick={() => { navigate('/deployment-check'); setSidebarOpen(false); }}>
              <Rocket className="nav-icon" size={18} /> Deployment Check
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/relationships' ? 'active' : ''}`} onClick={() => { navigate('/relationships'); setSidebarOpen(false); }}>
              <Share2 className="nav-icon" size={18} /> Relationship Map
            </button>
            <button className={`sidebar-nav-item ${location.pathname === '/history' ? 'active' : ''}`} onClick={() => { navigate('/history'); setSidebarOpen(false); }}>
              <History className="nav-icon" size={18} /> History
            </button>
          </div>
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

          <div className="sidebar-api-status" style={{ marginTop: 6 }}>
            <span className={`status-dot connected`}></span>
            AI Connected
          </div>
          <div className="sidebar-api-status" style={{ marginTop: 4 }}>
            <span className={`status-dot ${backendOnline ? 'connected' : ''}`}
              style={{ background: backendOnline ? '#1e8e3e' : '#f9ab00' }}></span>
            <span style={{ fontSize: '0.6875rem' }}>
              {backendOnline ? '⚡ ML Backend Online' : '○ Frontend-Only Mode'}
            </span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<GovernanceDashboard analysisResult={analysisResult} onNavigate={navigate} />} />
          <Route path="/analyze" element={<UploadPanel parsedData={parsedData} setParsedData={setParsedData} analysisResult={analysisResult} setAnalysisResult={setAnalysisResult} onViewReport={() => navigate('/report')} />} />
          <Route path="/health" element={<DatasetHealthCenter parsedData={parsedData} />} />
          <Route path="/risk-predictor" element={<BiasRiskPredictor parsedData={parsedData} analysisResult={analysisResult} />} />

          <Route path="/report" element={<BiasReport analysisResult={analysisResult} onGetInsights={() => navigate('/insights')} onGoBack={() => navigate('/analyze')} />} />
          <Route path="/drivers" element={<DecisionDrivers parsedData={parsedData} analysisResult={analysisResult} />} />
          <Route path="/consistency" element={<DecisionConsistencyCheck parsedData={parsedData} analysisResult={analysisResult} />} />
          <Route path="/timeline" element={<FairnessTimeline />} />

          <Route path="/chat" element={<AIChatAssistant analysisResult={analysisResult} />} />
          <Route path="/insights" element={<AIInsights analysisResult={analysisResult} geminiReady={geminiReady} aiInsightsText={aiInsightsText} setAiInsightsText={setAiInsightsText} onOpenSettings={() => setShowSettings(true)} onGoBack={() => navigate('/report')} />} />
          <Route path="/audit" element={<MultiAgentAuditor analysisResult={analysisResult} />} />

          <Route path="/governance-score" element={<GovernanceScore />} />
          <Route path="/compliance" element={<ComplianceChecker analysisResult={analysisResult} />} />
          <Route path="/alerts" element={<AlertCenter />} />
          <Route path="/certification" element={<FairlensCertification />} />

           <Route path="/document-audit" element={<DocumentAuditor />} />
          <Route path="/genai-audit" element={<GenAIAuditor />} />
          <Route path="/model-inspection" element={<ModelInspectionStudio />} />

          <Route path="/digital-twin" element={<FairnessDigitalTwin analysisResult={analysisResult} />} />
          <Route path="/simulator" element={<WhatIfSimulator analysisResult={analysisResult} parsedData={parsedData} />} />

          <Route path="/scan" element={<AutoScanHeatmap parsedData={parsedData} />} />
          <Route path="/intersectional" element={<IntersectionalBias parsedData={parsedData} analysisResult={analysisResult} />} />
          <Route path="/data-generator" element={<SmartDataGenerator parsedData={parsedData} />} />
          <Route path="/improvement" element={<AutoImprovementEngine analysisResult={analysisResult} />} />
          <Route path="/benchmark" element={<BenchmarkCenter analysisResult={analysisResult} />} />
          <Route path="/monitoring" element={<RealTimeMonitoring />} />
          <Route path="/comparison" element={<ComparisonStudio analysisResult={analysisResult} />} />
          <Route path="/deployment-check" element={<DeploymentSafetyCheck analysisResult={analysisResult} />} />
          <Route path="/relationships" element={<RelationshipExplorer />} />
          <Route path="/history" element={<AuditHistoryPage setAnalysisResult={setAnalysisResult} setAiInsightsText={setAiInsightsText} onViewReport={() => navigate('/report')} />} />
        </Routes>
      </main>



      <style>{`@media (max-width: 1024px) { #mobile-menu-toggle { display: flex !important; } }`}</style>
    </div>
  );
}

export default App;
