'use client';

import React, { useState } from 'react';
import { Terminal, Play, X, Copy, Check } from 'lucide-react';
import '@/styles/components/daytona-card.css';

interface ExecutionResult {
  exitCode: number;
  result: string;
  sandboxId?: string;
  error?: string;
}

interface DaytonaCardProps {
  result: ExecutionResult;
  status: 'loading' | 'complete' | 'error';
  code?: string;
  language?: string;
}

export function DaytonaCard({ result, status, code, language }: DaytonaCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  if (status === 'error') {
    const error = result?.error || 'An error occurred while executing the code.';
 
    return (
      <div className="daytona-card">
        <div className="daytona-header daytona-header-error">
          <div className="daytona-header-left">
            <Terminal size={16} className="daytona-icon" />
            <span className="daytona-title">Code Execution</span>
          </div>
          <X size={16} className="daytona-icon-error" />
        </div>
        <div className="daytona-error-message">
          {error}
        </div>
      </div>
    );
  }
 
  const isSuccess = result?.exitCode === 0;
  const outputLines = result?.result?.split('\n').filter(line => line.trim()) || [];
 
  return (
    <div className="daytona-card">
      <div className="daytona-header">
        <div className="daytona-header-left">
          <Terminal size={16} className="daytona-icon" />
          <span className="daytona-title">Code Execution</span>
        </div>
        <div className="daytona-header-right">
          <div className={`daytona-status ${isSuccess ? 'daytona-status-success' : 'daytona-status-error'}`}>
            <Play size={12} />
            <span>{isSuccess ? 'Completed' : 'Failed'}</span>
          </div>
        </div>
      </div>
 
      {code && (
        <div className="daytona-code-block">
          <div className="daytona-code-header">
            <span className="daytona-language">{language || 'python'}</span>
            <button
              onClick={handleCopy}
              className="daytona-copy-btn"
              title="Copy code"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <pre className="daytona-code-content">
            <code>{code}</code>
          </pre>
        </div>
      )}
 
      <div className="daytona-output">
        <div className="daytona-output-header">
          <span>Output</span>
          <span className="daytona-exit-code">
            Exit code: {result?.exitCode ?? 'N/A'}
          </span>
        </div>
        <div className="daytona-output-content">
          {outputLines.length > 0 ? (
            outputLines.map((line, index) => (
              <div key={index} className="daytona-output-line">
                {line}
              </div>
            ))
          ) : (
            <div className="daytona-output-line daytona-output-empty">
              No output
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
