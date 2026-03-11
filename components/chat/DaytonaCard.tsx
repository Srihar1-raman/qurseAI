'use client';

import React, { useState, useCallback } from 'react';
import { Terminal, Play, Loader2, Copy, Check } from 'lucide-react';
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
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
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
    if (!code) {
      setCodeState(DEFAULT_CODE[newLang] || '');
    }
  }, [code]);

  const isSuccess = execResult?.exitCode === 0;

  if (status === 'loading') {
    return (
      <div className="daytona-card">
        <div className="daytona-card-loading">
          <div className="daytona-loading-content">
            <Terminal size={16} className="daytona-card-icon" />
            <span>Creating sandbox and running code...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="daytona-card">
      <div className="daytona-card-body">
        <div className="daytona-editor-pane">
          <div className="daytona-pane-header">
            <span>Code</span>
            <div className="daytona-pane-actions">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="daytona-lang-select"
                disabled={isRunning}
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCopy}
                className="daytona-icon-btn"
                title="Copy code"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                onClick={() => setCodeState(DEFAULT_CODE[language] || '')}
                className="daytona-text-btn"
                disabled={isRunning}
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

        <div className="daytona-output-pane">
          <div className="daytona-pane-header">
            <span>Output</span>
            <button
              onClick={handleRun}
              disabled={isRunning || !codeState.trim()}
              className="daytona-run-btn"
            >
              {isRunning ? (
                <Loader2 size={14} className="daytona-spin" />
              ) : (
                <Play size={14} />
              )}
              <span>Run</span>
            </button>
          </div>
          <div className="daytona-output-content">
            {error ? (
              <div className="daytona-error-text">{error}</div>
            ) : execResult ? (
              <>
                <div className={`daytona-exit-badge ${isSuccess ? 'success' : 'error'}`}>
                  Exit: {execResult.exitCode}
                </div>
                <pre className="daytona-output-text">
                  {(execResult.result || execResult.stdout) || 'No output'}
                </pre>
              </>
            ) : (
              <span className="daytona-placeholder">Click Run to execute</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
