'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calculator } from 'lucide-react';

type CalculatorType = 'graphing' | 'scientific' | 'fourFunction' | 'geometry' | '3d';

interface Expression {
  id: string;
  latex: string;
  color?: string;
}

interface Viewport {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

interface DesmosCardProps {
  calculatorType: CalculatorType;
  initialExpressions: Expression[];
  viewport?: Viewport;
}

declare global {
  interface Window {
    Desmos: {
      GraphingCalculator: (element: HTMLElement, options?: any) => any;
      ScientificCalculator: (element: HTMLElement, options?: any) => any;
      FourFunctionCalculator: (element: HTMLElement, options?: any) => any;
      Geometry: (element: HTMLElement, options?: any) => any;
      Graphing3D: (element: HTMLElement, options?: any) => any;
    };
  }
}

const API_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY || '';

function loadDesmosScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Desmos) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${API_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Desmos API'));
    document.head.appendChild(script);
  });
}

function getCalculatorName(type: CalculatorType): string {
  const names: Record<string, string> = {
    graphing: 'Graphing Calculator',
    scientific: 'Scientific Calculator',
    fourFunction: 'Four Function Calculator',
    geometry: 'Geometry',
    threeD: '3D Calculator',
  };
  return names[type] || 'Calculator';
}

export function DesmosCard({ calculatorType, initialExpressions, viewport }: DesmosCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initCalculator() {
      try {
        await loadDesmosScript();
        
        if (!mounted || !containerRef.current || !window.Desmos) return;

        setIsScriptLoaded(true);

        const container = containerRef.current;
        container.innerHTML = '';

        let calculator: any;

        const options = {
          graphpaper: true,
          expressions: true,
          settingsMenu: true,
          zoomButtons: true,
          keypad: true,
          border: false,
          autosize: true,
        };

        switch (calculatorType) {
          case 'graphing':
            calculator = window.Desmos.GraphingCalculator(container, options);
            break;
          case 'scientific':
            calculator = window.Desmos.ScientificCalculator ? window.Desmos.ScientificCalculator(container, {
              ...options,
              expressions: false,
              graphpaper: false,
            }) : window.Desmos.GraphingCalculator(container, options);
            break;
          case 'fourFunction':
            calculator = window.Desmos.FourFunctionCalculator ? window.Desmos.FourFunctionCalculator(container, {
              ...options,
              expressions: false,
              graphpaper: false,
            }) : window.Desmos.GraphingCalculator(container, options);
            break;
          case 'geometry':
            calculator = window.Desmos.Geometry ? window.Desmos.Geometry(container, options) : window.Desmos.GraphingCalculator(container, options);
            break;
          case '3d':
            calculator = window.Desmos.Graphing3D ? window.Desmos.Graphing3D(container, options) : window.Desmos.GraphingCalculator(container, options);
            break;
          default:
            calculator = window.Desmos.GraphingCalculator(container, options);
        }

        if (!mounted) {
          if (calculator?.destroy) calculator.destroy();
          return;
        }

        calculatorRef.current = calculator;

        // Set viewport for graphing calculator only
        if (calculatorType === 'graphing' && viewport) {
          calculator.setMathBounds({
            left: viewport.xmin,
            right: viewport.xmax,
            bottom: viewport.ymin,
            top: viewport.ymax,
          });
        }

        // Set initial expressions for graphing calculator only
        // (Scientific, FourFunction, Geometry, 3D don't support setExpression)
        if (calculatorType === 'graphing' && initialExpressions.length > 0) {
          initialExpressions.forEach((expr) => {
            calculator.setExpression({
              id: expr.id,
              latex: expr.latex,
              color: expr.color,
            });
          });
        }

        setIsLoading(false);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize calculator');
          setIsLoading(false);
        }
      }
    }

    initCalculator();

    return () => {
      mounted = false;
      if (calculatorRef.current?.destroy) {
        calculatorRef.current.destroy();
      }
    };
  }, [calculatorType, initialExpressions, viewport]);

  return (
    <div className="desmos-card">
      <div className="desmos-card-header">
        <Calculator className="desmos-card-icon" />
        <span className="desmos-card-title">{getCalculatorName(calculatorType)}</span>
      </div>
      
      <div className="desmos-card-container">
        {isLoading && (
          <div className="desmos-card-loading">
            <div className="desmos-spinner" />
            <span>Loading calculator...</span>
          </div>
        )}
        
        {error && (
          <div className="desmos-card-error">
            <span>{error}</span>
          </div>
        )}
        
        <div 
          ref={containerRef} 
          className="desmos-calculator"
          style={{ display: isLoading || error ? 'none' : 'block' }}
        />
      </div>
    </div>
  );
}
