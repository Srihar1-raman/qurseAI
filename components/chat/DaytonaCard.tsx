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
  { value: 'python', label: 'Python', ext: '.py', run: 'python3' },
  { value: 'javascript', label: 'JavaScript', ext: '.js', run: 'node' },
  { value: 'typescript', label: 'TypeScript', ext: '.ts', run: 'npx ts-node' },
  { value: 'go', label: 'Go', ext: '.go', run: 'go run' },
  { value: 'ruby', label: 'Ruby', ext: '.rb', run: 'ruby' },
  { value: 'java', label: 'Java', ext: '.java', run: 'java' },
  { value: 'cpp', label: 'C++', ext: '.cpp', run: 'g++ -o main && ./main' },
  { value: 'c', label: 'C', ext: '.c', run: 'gcc -o main && ./main' },
  { value: 'rust', label: 'Rust', ext: '.rs', run: 'rustc && ./main' },
  { value: 'php', label: 'PHP', ext: '.php', run: 'php' },
  { value: 'bash', label: 'Bash', ext: '.sh', run: 'bash' },
];

const DEFAULT_CODE: Record<string, string> = {
  python: `print("Hello, World!")`,
  javascript: `console.log("Hello, World!");`,
  typescript: `console.log("Hello, World!");`,
  go: `package main
import "fmt"
func main() {
    fmt.Println("Hello, World!")
}`,
  ruby: `puts "Hello, World!"`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
  cpp: `#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`,
  c: `#include <stdio.h>
int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
  rust: `fn main() {
    println!("Hello, World!");
}`,
  php: `<?php
echo "Hello, World!";
?>` ,
  bash: `#!/bin/bash
echo "Hello, World!"`,
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
              <pre className="daytona-output-text">
                  {(execResult.result || execResult.stdout) || 'No output'}
                </pre>
            ) : (
              <span className="daytona-placeholder">Click Run to execute</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
