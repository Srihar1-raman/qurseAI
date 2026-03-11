'use client';

import React, { useState, useCallback } from 'react';
import { Terminal, Play, Loader2, Check, Copy, ChevronDown, X } from 'lucide-react';
import '@/styles/components/daytona-card.css';

interface ExecutionResult {
  exitCode: number;
  result: string;
  stdout?: string;
  stderr?: string;
}

interface DaytonaCardProps {
  result: ExecutionResult & { error?: string; sandboxId?: string };
  status: 'loading' | 'complete' | 'error';
  code?: string;
  language?: string;
}

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'javascript', label: 'JavaScript', icon: '📜' },
  { value: 'typescript', label: 'TypeScript', icon: '🔷' },
];

const DEFAULT_CODE: Record<string, string> = {
  python: `# Write your Python code here
def greet(name):
    return f"Hello, {name}!"

result = greet("World")
print(result)`,
  javascript: `// Write your JavaScript code here
function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet("World"));`,
  typescript: `// Write your TypeScript code here
function greet(name: string): string {
    return \`Hello, \${name}!\`;
}

console.log(greet("World"));`,
};

export function DaytonaCard({ result, status, code, language: initialLanguage = 'python' }: DaytonaCardProps) {
  const [codeState, setCodeState] = useState(code || DEFAULT_CODE[initialLanguage] || '');
  const [language, setLanguage] = useState(initialLanguage);
  const [isRunning, setIsRunning] = useState(false);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(status === 'complete' ? result : null);
  const [error, setError] = useState<string | null>(status === 'error' ? (result as any).error || 'An error occurred' : null);
  const [copied, setCopied] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setExecResult(null);

    try {
      const response = await fetch('/api/daytona/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          code: codeState,
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute code');
      }

      setExecResult({
        exitCode: data.exitCode,
        result: data.result,
        stdout: data.stdout,
        stderr: data.stderr,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute code');
    } finally {
      setIsRunning(false);
    }
  }, [codeState, language]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(codeState);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeState]);

  const handleLanguageChange = useCallback((newLang: string) => {
    setLanguage(newLang);
    setShowLangDropdown(false);
    if (!code) {
      setCodeState(DEFAULT_CODE[newLang] || '');
    }
  }, [code]);

  const isSuccess = execResult?.exitCode === 0;

  if (status === 'loading') {
    return (
      <div className="daytona-card">
        <div className="daytona-header">
          <div className="daytona-header-left">
            <Terminal size={16} className="daytona-icon" />
            <span className="daytona-title">Code Execution</span>
          </div>
          <div className="daytona-header-right">
            <div className="daytona-spinner" />
          </div>
        </div>
        <div className="daytona-terminal">
          <div className="daytona-line">
            <span className="daytona-prompt">$</span>
            <span className="daytona-loading-text">Creating sandbox and running code...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="daytona-card daytona-editor">
      <div className="daytona-header">
        <div className="daytona-header-left">
          <Terminal size={16} className="daytona-icon" />
          <span className="daytona-title">Code Editor</span>

          <div className="daytona-lang-selector">
            <button
              className="daytona-lang-btn"
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              disabled={isRunning}
            >
              <span>{LANGUAGE_OPTIONS.find(l => l.value === language)?.icon}</span>
              <span>{LANGUAGE_OPTIONS.find(l => l.value === language)?.label}</span>
              <ChevronDown size={14} />
            </button>

            {showLangDropdown && (
              <div className="daytona-lang-dropdown">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang.value}
                    className={`daytona-lang-option ${language === lang.value ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(lang.value)}
                  >
                    <span>{lang.icon}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="daytona-header-right">
          <button
            onClick={handleRun}
            disabled={isRunning || !codeState.trim()}
            className="daytona-run-btn"
          >
            {isRunning ? (
              <Loader2 size={16} className="daytona-spin" />
            ) : (
              <Play size={16} />
            )}
            <span>Run</span>
          </button>
        </div>
      </div>

      <div className="daytona-editor-body">
        <div className="daytona-code-section">
          <div className="daytona-code-header">
            <span className="daytona-language">{language}</span>
            <div className="daytona-code-actions">
              <button onClick={handleCopy} className="daytona-copy-btn" title="Copy code">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                onClick={() => setCodeState(DEFAULT_CODE[language] || '')}
                className="daytona-reset-btn"
                title="Reset to default"
              >
                Reset
              </button>
            </div>
          </div>
          <textarea
            value={codeState}
            onChange={(e) => setCodeState(e.target.value)}
            className="daytona-code-input"
            placeholder={`Write your ${language} code here...`}
            spellCheck={false}
          />
        </div>

        {(execResult || error) && (
          <div className="daytona-output">
            <div className="daytona-output-header">
              <span>Output</span>
              {execResult && (
                <span className={`daytona-exit-code ${isSuccess ? 'success' : 'error'}`}>
                  Exit code: {execResult.exitCode}
                </span>
              )}
              {(execResult || error) && (
                <button onClick={() => { setExecResult(null); setError(null); }} className="daytona-clear-btn">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="daytona-output-content">
              {error ? (
                <div className="daytona-error-message">{error}</div>
              ) : execResult ? (
                <pre className="daytona-result">{(execResult.result || execResult.stdout) || 'No output'}</pre>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
