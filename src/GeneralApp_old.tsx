// src/App.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://linkslogic-backend-576708582341.us-central1.run.app';

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

// Voice Recognition Hook - STABLE VERSION
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
      
      recognition.continuous = true;  // Keep listening
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };
      
      let submitTimeout: NodeJS.Timeout | null = null;
      let accumulatedTranscript = '';  // Keep building transcript

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
  
        // Add new final text to accumulated transcript
        if (finalTranscript) {
          accumulatedTranscript += finalTranscript + ' ';
        }
  
        // Show accumulated + current interim
        const currentTranscript = accumulatedTranscript + interimTranscript;
        if (currentTranscript.trim()) {
          setTranscript(currentTranscript.trim());
    
          // Clear any existing timeout
          if (submitTimeout) {
            clearTimeout(submitTimeout);
          }
    
          // Set new 5-second timeout
          submitTimeout = setTimeout(() => {
            console.log('🎤 5-second pause detected, submitting:', currentTranscript.trim());
            accumulatedTranscript = '';  // Reset for next session
            recognitionRef.current?.stop();
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

// API Hook - SAFER VERSION
function useGolfRulesAPI() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RulesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quickQuestions, setQuickQuestions] = useState<QuickQuestion[]>([]);
  const [requestInProgress, setRequestInProgress] = useState(false); // NEW
  
  // Load quick questions ONCE on mount
  useEffect(() => {
    loadQuickQuestions();
  }, []); // EMPTY dependency array - only runs once
  
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
    // CRITICAL: Prevent multiple calls
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
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          club_id: 'columbia_cc',
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
  }, [requestInProgress, loading]); // Dependencies for useCallback
  
  return { 
    loading, 
    response, 
    error, 
    quickQuestions,
    askQuestion
  };
}

// Voice Input Component - FIXED VERSION
function VoiceInput({ onTranscript, disabled }: { onTranscript: (text: string) => void; disabled: boolean }) {
  const { isListening, transcript, isSupported, error, startListening, stopListening } = useVoiceRecognition();
  const [hasSubmitted, setHasSubmitted] = useState(false); // NEW: Prevent multiple submissions
  
  // Only trigger onTranscript ONCE per session
  useEffect(() => {
    if (transcript && !isListening && !hasSubmitted) {
      console.log('🎤 Voice transcript ready, submitting:', transcript);
      setHasSubmitted(true); // Mark as submitted
      onTranscript(transcript);
    }
  }, [transcript, isListening, hasSubmitted, onTranscript]);
  
  // Reset when starting new recording
  const handleStartListening = () => {
    console.log('🎤 Starting fresh voice session');
    setHasSubmitted(false); // Reset submission flag
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
                ? 'bg-gray-500'  // Show as disabled after submission
                : 'bg-green-600 hover:bg-green-700 hover:scale-105'
          }
        `}
      >
        {isListening ? '🔴' : hasSubmitted ? '✅' : '🎤'}
      </button>
      
      <div>
        <p className="text-sm text-gray-600">
          {isListening 
            ? 'Listening... Click to stop' 
            : hasSubmitted 
              ? 'Question submitted!'
              : 'Click to ask a question'
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
            <p className="text-green-600 text-sm mt-1">✅ Submitted</p>
          )}
        </div>
      )}
    </div>
  );
}

// Response Display Component
function RulesResponse({ response, loading }: { response: RulesResponse | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg fade-in">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          <span className="text-gray-600">Consulting rules database...</span>
        </div>
      </div>
    );
  }
  
  if (!response) return null;
  
  const getRuleTypeConfig = (type: string) => {
    switch (type) {
      case 'local':
        return { color: 'bg-blue-500', label: 'Club Local Rule', textColor: 'text-blue-600' };
      case 'official':
        return { color: 'bg-green-500', label: 'Official Rules of Golf', textColor: 'text-green-600' };
      default:
        return { color: 'bg-purple-500', label: 'Combined Rules', textColor: 'text-purple-600' };
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className={`${ruleConfig.color} text-white px-3 py-1 rounded-full text-sm font-medium`}>
            {ruleConfig.label}
          </span>
          
          {response.rule_numbers && response.rule_numbers.length > 0 && (
            <span className="text-gray-600 text-sm">
              Rules: {response.rule_numbers.join(', ')}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <span className={confidenceConfig.color}>{confidenceConfig.icon}</span>
          <span className={`text-xs font-medium ${confidenceConfig.color}`}>
            {response.confidence.toUpperCase()}
          </span>
        </div>
      </div>
      
      {/* Answer */}
      <div className="prose prose-sm max-w-none mb-4">
        <div 
    	  className="text-gray-800 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: response.answer
               .replace(/\n/g, '<br>')
               .replace(/•/g, '&bull;')
          }}
        />
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          Response time: {response.response_time}s
        </span>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => navigator.clipboard?.writeText(response.answer)}
            className="text-blue-600 text-sm hover:text-blue-800"
          >
            📋 Copy
          </button>
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Golf Rules Answer',
                  text: `Q: ${response.question}\n\nA: ${response.answer}`
                });
              }
            }}
            className="text-blue-600 text-sm hover:text-blue-800"
          >
            📤 Share
          </button>
        </div>
      </div>
    </div>
  );
}

// Quick Questions Component
function QuickQuestions({ questions, onQuestionSelect, disabled }: {
  questions: QuickQuestion[];
  onQuestionSelect: (question: string) => void;
  disabled: boolean;
}) {
  if (questions.length === 0) return null;
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <p className="text-gray-600 text-sm mb-3 font-medium">Common Questions:</p>
      <div className="grid gap-2">
        {questions.map((q) => (
          <button
            key={q.id}
            onClick={() => onQuestionSelect(q.text)}
            disabled={disabled}
            className="flex items-center p-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-left transition-colors"
          >
            <span className="text-lg mr-3">{q.icon}</span>
            <span className="text-gray-700">{q.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Main Component
export default function GeneralApp() {
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState('');
  const { loading, response, error, quickQuestions, askQuestion } = useGolfRulesAPI();
  
  const handleQuestion = (question: string) => {
    askQuestion(question, true); // Use fast mode by default
    setTextInput(''); // Clear text input after submission
  };
  
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleQuestion(textInput.trim());
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-900">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-800">Columbia Country Club</h1>
            <p className="text-sm text-gray-600">Rules Assistant</p>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Tab Selector */}
        <div className="bg-white rounded-lg p-1 shadow-sm">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveTab('voice')}
              className={`py-2 px-4 rounded-md font-medium text-sm transition ${
                activeTab === 'voice' 
                  ? 'bg-green-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🎤 Voice
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`py-2 px-4 rounded-md font-medium text-sm transition ${
                activeTab === 'text' 
                  ? 'bg-green-600 text-white' 
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
            <VoiceInput onTranscript={handleQuestion} disabled={loading} />
          ) : (
            <form onSubmit={handleTextSubmit} className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your golf rules question here..."
                className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !textInput.trim()}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : 'Ask Question'}
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
        <RulesResponse response={response} loading={loading} />
        
        {/* Quick Questions */}
        {!loading && !response && (
          <QuickQuestions 
            questions={quickQuestions}
            onQuestionSelect={handleQuestion}
            disabled={loading}
          />
        )}
      </main>
      
      {/* Footer */}
      <footer className="max-w-md mx-auto px-4 pb-6">
        <div className="text-center text-white text-xs opacity-75">
          <p>Powered by Official Rules of Golf & Club Local Rules</p>
          <p className="mt-1">Version 2.0 • API Connected</p>
        </div>
      </footer>
    </div>
  );
}