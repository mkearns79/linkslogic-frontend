// src/components/ColumbiaApp.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import cccLogo from './CCC logo.png';
import linksLogicLogo from './LL logo.png';

// Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.158:5001';
const CLUB_ID = 'columbia_cc';

// Color palette derived from LinksLogic + CCC logos
const colors = {
  darkGreen: '#1a3c34',
  accentGreen: '#2d6a4f',
  gold: '#b8860b',
  navy: '#1a2744',
  white: '#ffffff',
  bgLight: '#f5f5f7',
  bgCard: '#fafafa',
  borderLight: '#f0f0f0',
  borderMedium: '#e0e0e0',
  textPrimary: '#333333',
  textSecondary: '#888888',
  textTertiary: '#bbbbbb',
};

// Styles
const appStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; }
  body { background: ${colors.white} !important; margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
  .columbia-app { min-height: 100vh; min-height: 100dvh; background: ${colors.white}; display: flex; flex-direction: column; max-width: 480px; margin: 0 auto; }
  .app-header { padding: 16px 20px; border-bottom: 0.5px solid ${colors.borderLight}; background: ${colors.white}; position: sticky; top: 0; z-index: 10; }
  .header-inner { display: flex; align-items: center; gap: 14px; }
  .header-logo { width: 48px; height: 48px; object-fit: contain; flex-shrink: 0; }
  .header-divider { width: 1px; height: 36px; background: ${colors.borderMedium}; flex-shrink: 0; }
  .header-text h1 { font-size: 15px; font-weight: 600; color: ${colors.navy}; margin: 0; line-height: 1.3; }
  .header-text p { font-size: 12px; color: ${colors.textSecondary}; margin: 2px 0 0 0; }
  .app-main { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
  .input-container { position: relative; }
  .text-input { width: 100%; background: ${colors.bgLight}; border-radius: 14px; padding: 14px 52px 14px 16px; font-size: 15px; color: ${colors.textPrimary}; border: 1px solid transparent; outline: none; font-family: inherit; line-height: 1.4; transition: border-color 0.2s; }
  .text-input::placeholder { color: #999; }
  .text-input:focus { border-color: ${colors.accentGreen}; }
  .mic-button { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; border-radius: 50%; background: ${colors.darkGreen}; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; padding: 0; }
  .mic-button:hover { background: ${colors.accentGreen}; }
  .mic-button.listening { background: #c0392b; animation: pulse-ring 1.5s ease infinite; }
  .mic-button:disabled { background: #ccc; cursor: not-allowed; }
  .mic-button svg { width: 16px; height: 16px; }
  @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(192, 57, 43, 0); } 100% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0); } }
  .listening-indicator { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #fef3e2; border-radius: 10px; font-size: 13px; color: ${colors.gold}; }
  .listening-dots { display: flex; gap: 3px; }
  .listening-dots span { width: 4px; height: 4px; background: ${colors.gold}; border-radius: 50%; animation: bounce-dot 1.2s ease infinite; }
  .listening-dots span:nth-child(2) { animation-delay: 0.2s; }
  .listening-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce-dot { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
  .section-label { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .section-label span { font-size: 11px; font-weight: 500; color: #aaa; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; }
  .section-label-line { flex: 1; height: 0.5px; background: #eaeaea; }
  .quick-questions { display: flex; flex-direction: column; gap: 8px; }
  .quick-card { background: ${colors.bgCard}; border: 0.5px solid ${colors.borderLight}; border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.15s; text-align: left; width: 100%; font-family: inherit; }
  .quick-card:hover { background: #f0f0f2; }
  .quick-card:disabled { opacity: 0.5; cursor: not-allowed; }
  .quick-card-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .quick-card-text { font-size: 14px; color: ${colors.textPrimary}; line-height: 1.4; }
  .response-container { background: ${colors.white}; border-radius: 14px; border: 0.5px solid ${colors.borderLight}; overflow: hidden; }
  .response-header { display: flex; align-items: center; gap: 10px; padding: 16px 16px 12px; border-bottom: 0.5px solid ${colors.borderLight}; }
  .rex-badge { width: 36px; height: 36px; border-radius: 50%; background: ${colors.bgLight}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: ${colors.darkGreen}; flex-shrink: 0; }
  .response-meta { flex: 1; }
  .response-meta-name { font-size: 14px; font-weight: 600; color: ${colors.textPrimary}; margin: 0; }
  .response-badges { display: flex; align-items: center; gap: 6px; margin-top: 3px; flex-wrap: wrap; }
  .rule-badge { font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 10px; color: ${colors.white}; }
  .rule-badge.local { background: ${colors.navy}; }
  .rule-badge.official { background: ${colors.accentGreen}; }
  .rule-badge.hybrid { background: ${colors.gold}; }
  .rule-numbers { font-size: 11px; color: ${colors.textSecondary}; }
  .response-body { padding: 16px; }
  .response-body p { font-size: 14px; line-height: 1.7; color: ${colors.textPrimary}; margin: 0; white-space: pre-wrap; }
  .response-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 0.5px solid ${colors.borderLight}; }
  .response-time { font-size: 11px; color: ${colors.textTertiary}; }
  .ask-again-button { font-size: 13px; color: ${colors.accentGreen}; background: none; border: none; cursor: pointer; font-family: inherit; font-weight: 500; padding: 4px 0; }
  .ask-again-button:hover { color: ${colors.darkGreen}; }
  .loading-container { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 24px; background: ${colors.bgCard}; border-radius: 14px; border: 0.5px solid ${colors.borderLight}; }
  .loading-spinner { width: 20px; height: 20px; border: 2px solid ${colors.borderMedium}; border-top-color: ${colors.accentGreen}; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-text { font-size: 14px; color: ${colors.textSecondary}; }
  .error-display { padding: 12px 16px; background: #fef2f2; border: 0.5px solid #fecaca; border-radius: 10px; font-size: 13px; color: #991b1b; }
  .app-footer { padding: 12px 20px 24px; display: flex; flex-direction: column; align-items: center; }
  .powered-by { font-size: 10px; color: ${colors.textTertiary}; margin: 0 0 6px 0; letter-spacing: 0.5px; text-transform: uppercase; }
  .footer-logo { width: 140px; height: auto; object-fit: contain; opacity: 0.8; }
  .slogan { font-size: 10px; color: ${colors.textTertiary}; margin: 4px 0 0 0; }
  .fade-in { animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .rex-intro { background: #f0f7f4; border: 0.5px solid #d4e8dc; border-radius: 14px; padding: 16px; }
  .rex-intro-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .rex-intro-dismiss { background: none; border: none; font-size: 16px; color: #999; cursor: pointer; padding: 0; line-height: 1; }
  .rex-intro-dismiss:hover { color: #666; }
  .rex-intro-title { font-size: 15px; font-weight: 600; color: #1a3c34; margin: 0 0 6px 0; }
  .rex-intro-text { font-size: 13px; color: #555; line-height: 1.5; margin: 0; }
`;

// Types
interface RulesResponse {
  success: boolean;
  answer: string;
  question: string;
  club_id: string;
  rule_type: 'local' | 'official' | 'hybrid';
  rule_numbers: string[];
  confidence: 'high' | 'medium' | 'low';
  response_time: number;
  error?: string;
}

// ─── Voice Recognition Hook ──────────────────────────────────────
function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      let submitTimeout: NodeJS.Timeout | null = null;
      let accumulatedTranscript = '';
      recognition.onstart = () => { setIsListening(true); setError(null); accumulatedTranscript = ''; };
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += t;
          else interimTranscript += t;
        }
        if (finalTranscript) accumulatedTranscript += finalTranscript + ' ';
        const currentTranscript = accumulatedTranscript + interimTranscript;
        if (currentTranscript.trim()) {
          setTranscript(currentTranscript.trim());
          if (submitTimeout) clearTimeout(submitTimeout);
          submitTimeout = setTimeout(() => { accumulatedTranscript = ''; recognition.stop(); }, 5000);
        }
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => { setError(`Voice recognition error: ${event.error}`); setIsListening(false); };
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript(''); setError(null);
      try { recognitionRef.current.start(); } catch { setError('Failed to start voice recognition'); }
    }
  };
  const stopListening = () => { if (recognitionRef.current && isListening) recognitionRef.current.stop(); };

  return { isListening, transcript, isSupported, error, startListening, stopListening };
}

// ─── API Hook ────────────────────────────────────────────────────
function useColumbiaRulesAPI(): {
  loading: boolean;
  response: RulesResponse | null;
  error: string | null;
  askQuestion: (question: string, fastMode?: boolean) => Promise<void>;
  resetResponse: () => void;
} {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RulesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestInProgress, setRequestInProgress] = useState(false);
  const resetResponse = () => { setResponse(null); setError(null); };

  const askQuestion = useCallback(async (question: string, fastMode: boolean = true) => {
    if (requestInProgress || loading) return;
    setRequestInProgress(true); setLoading(true); setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${API_BASE_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, club_id: CLUB_ID, fast_mode: fastMode }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.success) { setResponse(data); setError(null); }
      else setError(data.error || 'Failed to get response');
    } catch (err: any) {
      setError(err.name === 'AbortError' ? 'Request timed out' : 'Network error. Please check your connection.');
    } finally { setLoading(false); setRequestInProgress(false); }
  }, [requestInProgress, loading]);

  return { loading, response, error, askQuestion, resetResponse };
}

// ─── Mic Icon ────────────────────────────────────────────────────
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

// ─── Quick Question Icons ────────────────────────────────────────
const quickQuestionIcons: Record<string, { bg: string; icon: React.ReactElement }> = {
  train: {
    bg: '#f3e8ff',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="14" rx="3" stroke="#7c3aed" strokeWidth="2"/><path d="M4 13h16" stroke="#7c3aed" strokeWidth="2"/><circle cx="8" cy="20" r="1.5" fill="#7c3aed"/><circle cx="16" cy="20" r="1.5" fill="#7c3aed"/><path d="M9 17l-3 6M15 17l3 6" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/><rect x="8" y="6" width="3" height="4" rx="0.5" stroke="#7c3aed" strokeWidth="1.5"/><rect x="13" y="6" width="3" height="4" rx="0.5" stroke="#7c3aed" strokeWidth="1.5"/></svg>,
  },
  water: {
    bg: '#e6f1fb',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke="#378add" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  },
  maintenance: {
    bg: '#fef3e2',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 21V9l9-6 9 6v12" stroke="#ba7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 21V14h6v7" stroke="#ba7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 21h22" stroke="#ba7517" strokeWidth="2" strokeLinecap="round"/><path d="M10 10h4" stroke="#ba7517" strokeWidth="2" strokeLinecap="round"/></svg>,
  },
  cart: {
    bg: '#e8f5ec',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="7" cy="19" r="2" stroke="#1d9e75" strokeWidth="2"/><circle cx="18" cy="19" r="2" stroke="#1d9e75" strokeWidth="2"/><path d="M5 19h-1a1 1 0 0 1-1-1v-4l3-8h8l2 5h4a1 1 0 0 1 1 1v6" stroke="#1d9e75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 19h7" stroke="#1d9e75" strokeWidth="2"/><path d="M14 7v5" stroke="#1d9e75" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
};

// ─── Quick Questions Data ────────────────────────────────────────
const quickQuestions = [
  { id: 'purple', text: 'What is the Purple Line boundary rule?', iconType: 'train' },
  { id: 'water17', text: 'Options for ball in the water on #17?', iconType: 'water' },
  { id: 'maintenance', text: 'Ball went into the maintenance area on #10', iconType: 'maintenance' },
  { id: 'cartpath', text: 'Do I get relief from cart path behind #14 and #17 greens?', iconType: 'cart' },
];

// ─── Response Component ──────────────────────────────────────────
function formatResponse(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} style={{
          margin: '8px 0', paddingLeft: '20px', listStyleType: 'disc'
        }}>
          {currentList.map((item, i) => (
            <li key={i} style={{
              fontSize: '14px', lineHeight: '1.7', color: '#333',
              paddingLeft: '4px', marginBottom: '4px'
            }}>{item}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[•\-–—]\s*(.+)/);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
    } else {
      flushList();
      if (trimmed) {
        elements.push(
          <p key={`p-${i}`} style={{
            fontSize: '14px', lineHeight: '1.7', color: '#333',
            margin: '0 0 8px 0'
          }}>{trimmed}</p>
        );
      }
    }
  });

  flushList();
  return elements;
}

function ResponseDisplay({ response, loading, onReset }: { response: RulesResponse | null; loading: boolean; onReset: () => void }) {
  if (loading) {
    return (
      <div className="loading-container fade-in">
        <div className="loading-spinner" />
        <span className="loading-text">Rex is checking the rules...</span>
      </div>
    );
  }
  if (!response) return null;

  const ruleLabels: Record<string, { label: string; className: string }> = {
    local: { label: 'Columbia CC Local Rule', className: 'local' },
    official: { label: 'Official Rules of Golf', className: 'official' },
    hybrid: { label: 'Combined Rules', className: 'hybrid' },
  };
  const rule = ruleLabels[response.rule_type] || ruleLabels.official;

  return (
    <div className="response-container fade-in">
      <div className="response-header">
        <div className="rex-badge">REX</div>
        <div className="response-meta">
          <p className="response-meta-name">Rex says:</p>
          <div className="response-badges">
            <span className={`rule-badge ${rule.className}`}>{rule.label}</span>
            {response.rule_numbers?.length > 0 && (
              <span className="rule-numbers">Rules: {response.rule_numbers.join(', ')}</span>
            )}
          </div>
        </div>
      </div>
      <div className="response-body">
        {formatResponse(response.answer)}
      </div>
      <div className="response-footer">
        <span className="response-time">Response time: {response.response_time}s</span>
        <button className="ask-again-button" onClick={onReset}>
  	  Ask another question
	</button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function ColumbiaApp() {
  const [textInput, setTextInput] = useState('');
  const { loading, response, error, askQuestion, resetResponse } = useColumbiaRulesAPI();
  const { isListening, transcript, isSupported, error: voiceError, startListening, stopListening } = useVoiceRecognition();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [showIntro, setShowIntro] = useState(() => {
    return !localStorage.getItem('rex_introduced');
  });

  const dismissIntro = () => {
    localStorage.setItem('rex_introduced', 'true');
    setShowIntro(false);
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = appStyles;
    document.head.appendChild(style);
    return () => { if (document.head.contains(style)) document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    if (transcript && !isListening && !hasSubmitted) {
      setHasSubmitted(true);
      setTextInput(transcript);
      askQuestion(transcript, true);
    }
  }, [transcript, isListening, hasSubmitted, askQuestion]);

  const handleSubmit = () => {
    if (textInput.trim() && !loading) { setHasSubmitted(true); askQuestion(textInput.trim(), true); }
  };

  const handleReset = () => {
    resetResponse();
    setTextInput('');
    setHasSubmitted(false);
    setTimeout(() => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
      inputRef.current?.focus();
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  };

  const handleQuickQuestion = (text: string) => {
    setTextInput(text); setHasSubmitted(true); askQuestion(text, true);
  };

  const handleMicClick = () => {
    if (isListening) { stopListening(); }
    else { setHasSubmitted(false); setTextInput(''); startListening(); }
  };

  const showQuickQuestions = !loading && !response;

  return (
    <div className="columbia-app">
      <div className="app-header" ref={topRef}>
        <div className="header-inner">
          <img src={cccLogo} alt="Columbia Country Club" className="header-logo" />
          <div className="header-divider" />
          <div className="header-text">
            <h1>Golf Rules Assistant</h1>
            <p>Columbia Country Club</p>
          </div>
        </div>
      </div>

      <div className="app-main">
	{showIntro && (
  	  <div className="rex-intro fade-in">
    	    <div className="rex-intro-header">
      	      <div className="rex-badge">REX</div>
      	      <button className="rex-intro-dismiss" onClick={dismissIntro}>✕</button>
    	    </div>
    	    <p className="rex-intro-title">Meet Rex — your Rules Expert</p>
    	    <p className="rex-intro-text">
      	      Ask me any golf rules question, including Columbia CC local rules. 
     	      Type below or tap the mic to speak.
    	    </p>
  	  </div>
	)}
        <div className="input-container">
          <input
            ref={inputRef}
            type="text"
            className="text-input"
            placeholder={isListening ? 'Listening...' : 'Ask Rex a rules question...'}
            value={isListening ? transcript : textInput}
            onChange={(e) => { setTextInput(e.target.value); setHasSubmitted(false); }}
            onKeyDown={handleKeyDown}
            disabled={loading || isListening}
          />
          {isSupported && (
            <button
              className={`mic-button ${isListening ? 'listening' : ''}`}
              onClick={handleMicClick}
              disabled={loading}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? (
                <svg viewBox="0 0 24 24" fill="white" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              ) : (
                <MicIcon />
              )}
            </button>
          )}
        </div>

        {isListening && (
          <div className="listening-indicator fade-in">
            <div className="listening-dots"><span/><span/><span/></div>
            Listening — Rex will submit after 5 seconds of silence
          </div>
        )}

        {voiceError && <div className="error-display">{voiceError}</div>}
        {error && <div className="error-display">{error}</div>}

        <ResponseDisplay response={response} loading={loading} onReset={handleReset} />

        {showQuickQuestions && (
          <>
            <div className="section-label">
              <span>Common questions</span>
              <div className="section-label-line" />
            </div>
            <div className="quick-questions">
              {quickQuestions.map((q) => {
                const iconConfig = quickQuestionIcons[q.iconType];
                return (
                  <button key={q.id} className="quick-card" onClick={() => handleQuickQuestion(q.text)} disabled={loading}>
                    <div className="quick-card-icon" style={{ background: iconConfig.bg }}>{iconConfig.icon}</div>
                    <span className="quick-card-text">{q.text}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="app-footer">
        <p className="powered-by">Powered by</p>
        <img src={linksLogicLogo} alt="LinksLogic" className="footer-logo" />
        <p className="slogan">Your Course. Your Rules. Instantly.</p>
      </div>
    </div>
  );
}
