// src/components/ColumbiaApp.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Columbia-specific styling
const columbiaStyles = `
  .columbia-container {
    background: linear-gradient(to bottom, #eff6ff, #dbeafe) !important;
    min-height: 100vh !important;
  }

  .columbia-container main {
    padding-left: 1.5rem !important;
    padding-right: 1.5rem !important;
  }
  
  .columbia-container header > div,
  .columbia-container footer > div {
    padding-left: 1.5rem !important;
    padding-right: 1.5rem !important;
  }

   /* Override global body background for Columbia */
  body {
    background: linear-gradient(to bottom, #eff6ff, #dbeafe) !important;
  }
  
  .columbia-container .tab-selector {
    background: white !important;
  }
  
  .columbia-container .tab-button.active {
    background: #2563eb !important;
    color: white !important;
  }
  
  .columbia-container .submit-button {
    background: #2563eb !important;
  }
  
  .columbia-container .submit-button:hover:not(:disabled) {
    background: #1d4ed8 !important;
  }
  
  .columbia-container .mic-button.ready {
    background: #2563eb !important;
  }
  
  .columbia-container .mic-button.ready:hover {
    background: #1d4ed8 !important;
  }
`;

// Configuration for Columbia CC
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://linkslogic-backend-576708582341.us-central1.run.app';
const CLUB_ID = 'columbia_cc';

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

interface QuickQuestion {
  id: string;
  text: string;
  category: string;
  icon: string;
}

// Voice Recognition Hook (same as before)
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
      
      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        accumulatedTranscript = '';
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          accumulatedTranscript += finalTranscript + ' ';
        }
        
        const currentTranscript = accumulatedTranscript + interimTranscript;
        if (currentTranscript.trim()) {
          setTranscript(currentTranscript.trim());
          
          if (submitTimeout) {
            clearTimeout(submitTimeout);
          }
          
          submitTimeout = setTimeout(() => {
            console.log('🎤 5-second pause detected, submitting:', currentTranscript.trim());
            accumulatedTranscript = '';
            recognition.stop();
          }, 5000);
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Voice recognition error: ${event.error}`);
        setIsListening(false);
      };
    }
  }, []);
  
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setError(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        setError('Failed to start voice recognition');
      }
    }
  };
  
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };
  
  return {
    isListening,
    transcript,
    isSupported,
    error,
    startListening,
    stopListening
  };
}

// API Hook
function useColumbiaRulesAPI() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RulesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quickQuestions, setQuickQuestions] = useState<QuickQuestion[]>([]);
  const [requestInProgress, setRequestInProgress] = useState(false);
  
  useEffect(() => {
    loadQuickQuestions();
  }, []);
  
  const loadQuickQuestions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/quick-questions`);
      const data = await response.json();
      if (data.success) {
        setQuickQuestions(data.questions);
      }
    } catch (err) {
      console.error('Failed to load quick questions:', err);
    }
  };
  
  const askQuestion = useCallback(async (question: string, fastMode: boolean = true) => {
    if (requestInProgress || loading) {
      console.log('🚨 Request blocked - already in progress');
      return;
    }
    
    console.log('🚀 Starting API request for:', question);
    setRequestInProgress(true);
    setLoading(true);
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${API_BASE_URL}/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          club_id: CLUB_ID,
          fast_mode: fastMode
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (data.success) {
        setResponse(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to get response');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request timed out');
      } else {
        setError('Network error. Please check your connection.');
      }
      console.error('API Error:', err);
    } finally {
      setLoading(false);
      setRequestInProgress(false);
    }
  }, [requestInProgress, loading]);
  
  return { 
    loading, 
    response, 
    error, 
    quickQuestions,
    askQuestion
  };
}

// Rex Avatar Component
function RexAvatar({ isListening }: { isListening: boolean }) {
  return (
    <div className="text-center mb-6">
      <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-4xl transition-all duration-300 ${
        isListening ? 'bg-red-100 animate-pulse' : 'bg-blue-100'
      }`}>
        🦅
      </div>
      <h2 className="text-xl font-bold text-gray-800 mt-3">Hi, I'm Rex!</h2>
      <p className="text-gray-600">Your Columbia Golf Rules Expert</p>
    </div>
  );
}

// Voice Input Component
function ColumbiaVoiceInput({ onTranscript, disabled }: { onTranscript: (text: string) => void; disabled: boolean }) {
  const { isListening, transcript, isSupported, error, startListening, stopListening } = useVoiceRecognition();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  useEffect(() => {
    if (transcript && !isListening && !hasSubmitted) {
      console.log('🎤 Voice transcript ready, submitting:', transcript);
      setHasSubmitted(true);
      onTranscript(transcript);
    }
  }, [transcript, isListening, hasSubmitted, onTranscript]);
  
  const handleStartListening = () => {
    console.log('🎤 Starting fresh voice session');
    setHasSubmitted(false);
    startListening();
  };
  
  if (!isSupported) {
    return (
      <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-yellow-800 font-medium">Voice recognition not available</p>
        <p className="text-sm text-yellow-600 mt-1">
          Try using Chrome, Edge, or Safari for voice features
        </p>
      </div>
    );
  }
  
  return (
    <div className="text-center space-y-4">
      <button
        onClick={isListening ? stopListening : handleStartListening}
        disabled={disabled}
        className={`
          w-20 h-20 rounded-full text-white font-bold text-2xl shadow-lg
          transition-all duration-200 transform active:scale-95
          ${disabled 
            ? 'bg-gray-400 cursor-not-allowed' 
            : isListening 
              ? 'bg-red-500 recording-pulse' 
              : hasSubmitted
                ? 'bg-green-500'
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
          }
        `}
      >
        {isListening ? '🔴' : hasSubmitted ? '✅' : '🎤'}
      </button>
      
      <div>
        <p className="text-sm text-gray-600">
          {isListening 
            ? 'Listening... (I\'ll submit after 5 seconds of silence)' 
            : hasSubmitted 
              ? 'Question submitted!'
              : 'Tap to ask Rex a question'
          }
        </p>
        
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
      
      {transcript && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-left fade-in">
          <p className="text-blue-800 font-medium text-sm">You said:</p>
          <p className="text-blue-600 mt-1">"{transcript}"</p>
          {hasSubmitted && (
            <p className="text-green-600 text-sm mt-1">✅ Sent to Rex</p>
          )}
        </div>
      )}
    </div>
  );
}

// Response Display Component
function ColumbiaRulesResponse({ response, loading }: { response: RulesResponse | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg fade-in">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Rex is verifying the rules...</span>
        </div>
      </div>
    );
  }
  
  if (!response) return null;
  
  const getRuleTypeConfig = (type: string) => {
    switch (type) {
      case 'local':
        return { color: 'bg-blue-600', label: 'Columbia CC Local Rule' };
      case 'official':
        return { color: 'bg-green-600', label: 'Official Rules of Golf' };
      default:
        return { color: 'bg-purple-600', label: 'Combined Rules' };
    }
  };
  
  const getConfidenceConfig = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return { color: 'text-green-600', icon: '✅' };
      case 'medium':
        return { color: 'text-yellow-600', icon: '⚠️' };
      default:
        return { color: 'text-red-600', icon: '❓' };
    }
  };
  
  const ruleConfig = getRuleTypeConfig(response.rule_type);
  const confidenceConfig = getConfidenceConfig(response.confidence);
  
  return (
    <div className="bg-white rounded-lg p-6 shadow-lg fade-in">
      {/* Rex Header */}
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
          🦅
        </div>
        <div>
          <p className="font-medium text-gray-800">Rex says:</p>
          <div className="flex items-center space-x-2">
            <span className={`${ruleConfig.color} text-white px-2 py-1 rounded-full text-xs font-medium`}>
              {ruleConfig.label}
            </span>
            {response.rule_numbers && response.rule_numbers.length > 0 && (
              <span className="text-gray-600 text-xs">
                Rules: {response.rule_numbers.join(', ')}
              </span>
            )}
            <span className={confidenceConfig.color}>{confidenceConfig.icon}</span>
          </div>
        </div>
      </div>
      
      {/* Answer */}
      <div className="prose prose-sm max-w-none mb-4">
        <div 
    	  className="text-gray-800 leading-relaxed"
	  dangerouslySetInnerHTML={{
            __html: response.answer 
	      .split('\n')
              .map(line => {
                if (line.trim().startsWith('• ')) {
                  const text = line.replace('• ', '');
                  return `<div style="display: flex; margin-bottom: 2px; padding-left: 0;"><span style="margin-right: 8px;">&bull;</span><span>${text}</span></div>`;
                } else {
                  return line;
                }
              })
              .join('<br>')
	      .replace(/<\/div><br><div style="display: flex/g, '</div><div style="display: flex') // Remove <br> between consecutive bullets
          }}
        />
       </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100" style={{ marginTop: '20px' }}>
        <span className="text-xs text-gray-500">
          Response time: {response.response_time}s
        </span>
        <button 
          onClick={() => window.location.reload()}
          className="text-blue-600 text-sm hover:text-blue-800"
        >
          🔄 Ask Another Question
        </button>
      </div>
    </div>
  );
}

// Quick Questions Component
function ColumbiaQuickQuestions({ questions, onQuestionSelect, disabled }: {
  questions: QuickQuestion[];
  onQuestionSelect: (question: string) => void;
  disabled: boolean;
}) {
  if (questions.length === 0) return null;
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <p className="text-gray-600 text-sm mb-3 font-medium">Common Columbia Rules Questions:</p>
      <div className="grid gap-2">
        {questions.map((q) => (
          <button
            key={q.id}
            onClick={() => onQuestionSelect(q.text)}
            disabled={disabled}
            className="flex items-center p-4 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-left transition-colors"
          >
            <span className="text-lg mr-3">{q.icon}</span>
            <span className="text-gray-700">{q.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Main Columbia App Component
export default function ColumbiaApp() {
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState('');
  const { loading, response, error, quickQuestions, askQuestion } = useColumbiaRulesAPI();

  useEffect(() => {
   const styleElement = document.createElement('style');
   styleElement.textContent = columbiaStyles;
   document.head.appendChild(styleElement);
    
   return () => {
     if (document.head.contains(styleElement)) {
       document.head.removeChild(styleElement);
     }
   };
  }, []);  

  const handleQuestion = (question: string) => {
    askQuestion(question, true);
    setTextInput('');
  };
  
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleQuestion(textInput.trim());
    }
  };
  
  return (
    <div className="min-h-screen columbia-container">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-4 border-blue-600">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-800">Columbia Country Club</h1>
            <p className="text-sm text-gray-600">Golf Rules Assistant</p>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 py-6 space-y-6">
        {/* Rex Introduction */}
        <RexAvatar isListening={loading} />
        
        {/* Tab Selector */}
        <div className="bg-white rounded-lg p-1 shadow-sm">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveTab('voice')}
              className={`py-3 px-6 rounded-md font-medium text-sm transition ${
                activeTab === 'voice' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🎤 Voice
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`py-3 px-6 rounded-md font-medium text-sm transition ${
                activeTab === 'text' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ⌨️ Type
            </button>
          </div>
        </div>
        
        {/* Input Section */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          {activeTab === 'voice' ? (
            <ColumbiaVoiceInput onTranscript={handleQuestion} disabled={loading} />
          ) : (
            <form onSubmit={handleTextSubmit} className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your golf rules question..."
                className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !textInput.trim()}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Rex is thinking...' : 'Ask Rex'}
              </button>
            </form>
          )}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 fade-in">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {/* Response Display */}
        <ColumbiaRulesResponse response={response} loading={loading} />
        
        {/* Quick Questions */}
        {!loading && !response && (
          <ColumbiaQuickQuestions 
            questions={quickQuestions}
            onQuestionSelect={handleQuestion}
            disabled={loading}
          />
        )}
      </main>
      
      {/* Footer */}
      <footer className="max-w-md mx-auto px-6 pb-6">
        <div className="text-center text-blue-600 text-xs">
          <p>Powered by LinksLogic AI • Columbia Golf Rules Expert</p>
        </div>
      </footer>
    </div>
  );
}