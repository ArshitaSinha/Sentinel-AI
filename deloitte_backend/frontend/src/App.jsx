import React, { useState } from 'react';
import './App.css';
import ResultsDisplay from './ResultsDisplay';

function App() {
  const [activeTab, setActiveTab] = useState('local');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [resultType, setResultType] = useState(null); 
  const [meta, setMeta] = useState(null);

  const handleProcess = async (action) => {
    if (!inputValue) {
      alert("Please enter a path or URL");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResultData(null);
    setMeta(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: activeTab,
          path: inputValue,
          action: action
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setResultData(data.data);
      setMeta(data.meta);
      setResultType(action);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <div className="logo">AI Analyzer</div>
        <nav className="nav-tabs">
          <button 
            className={`nav-item ${activeTab === 'local' ? 'active' : ''}`} 
            onClick={() => {setActiveTab('local'); setInputValue(''); setResultData(null);}}
          >
            Local Files
          </button>
          <button 
            className={`nav-item ${activeTab === 'github' ? 'active' : ''}`} 
            onClick={() => {setActiveTab('github'); setInputValue(''); setResultData(null);}}
          >
            GitHub Repo
          </button>
          <button 
            className={`nav-item ${activeTab === 'jira' ? 'active' : ''}`} 
            onClick={() => setActiveTab('jira')}
          >
            Jira Connect
          </button>
        </nav>
      </header>

      <main className="content-wrapper">
        {activeTab === 'jira' ? (
          <div className="empty-state">
            <h3>Jira Integration</h3>
            <p>This feature is currently under development.</p>
          </div>
        ) : (
          <>
            <div className="card input-card">
              <h2>{activeTab === 'local' ? "Analyze Local Project" : "Analyze GitHub Repository"}</h2>
              <div className="input-row">
                <input 
                  type="text" 
                  className="modern-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={activeTab === 'local' ? "e.g., /Users/name/Projects/MyApp" : "https://github.com/username/repository"}
                />
              </div>

              <div className="action-row">
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleProcess('summary')}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Generate Summary'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleProcess('testcases')}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Generate Test Cases'}
                </button>
              </div>

              {error && <div className="alert alert-error">{error}</div>}
              {meta && !loading && !error && (
                <div className="alert alert-success">
                  Scan complete. Found <strong>{meta.found}</strong> files ({meta.skipped} skipped).
                </div>
              )}
            </div>

            {resultData && (
              <div className="results-container fade-in">
                <ResultsDisplay type={resultType} data={resultData} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;