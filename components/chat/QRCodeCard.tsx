'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import qrcodeGenerator from 'qrcode-generator';

interface QRCodeData {
  data: string;
  typeNumber: number;
  errorCorrectionLevel: string;
  moduleCount: number;
  svg: string;
  dataURL?: string;
  html?: string;
  ascii?: string;
  size: number;
  options: {
    cellSize: number;
    margin: number;
    darkColor: string;
    lightColor: string;
  };
}

interface QRCodeCardProps {
  qrData: QRCodeData;
}

const PRESET_COLORS = [
  { name: 'Black', dark: '#000000', light: '#ffffff' },
  { name: 'Navy', dark: '#1e3a8a', light: '#e0f2fe' },
  { name: 'Green', dark: '#166534', light: '#dcfce7' },
  { name: 'Purple', dark: '#6b21a8', light: '#f3e8ff' },
  { name: 'Red', dark: '#991b1b', light: '#fee2e2' },
  { name: 'Orange', dark: '#c2410c', light: '#ffedd5' },
  { name: 'Pink', dark: '#9d174d', light: '#fce7f3' },
  { name: 'Dark', dark: '#1f2937', light: '#f3f4f6' },
];

const ERROR_CORRECTION_LEVELS = [
  { level: 'L' as const },
  { level: 'M' as const },
  { level: 'Q' as const },
  { level: 'H' as const },
];

export function QRCodeCard({ qrData }: QRCodeCardProps) {
  const [darkColor, setDarkColor] = useState(qrData.options.darkColor);
  const [lightColor, setLightColor] = useState(qrData.options.lightColor);
  const [cellSize, setCellSize] = useState(qrData.options.cellSize);
  const [margin, setMargin] = useState(4);
  const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [copied, setCopied] = useState(false);
  const [previewSvg, setPreviewSvg] = useState(qrData.svg);

  useEffect(() => {
    setDarkColor(qrData.options.darkColor);
    setLightColor(qrData.options.lightColor);
    setCellSize(qrData.options.cellSize);
  }, [qrData.options.darkColor, qrData.options.lightColor, qrData.options.cellSize]);

  const generateNewQR = useCallback(() => {
    const typeNumber = 0;
    const qr = qrcodeGenerator(typeNumber as any, errorLevel as any);
    qr.addData(qrData.data);
    qr.make();

    const moduleCount = qr.getModuleCount();
    const totalCellSize = cellSize + (cellSize > 2 ? 1 : 0);
    const size = moduleCount * totalCellSize + margin * 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
    svg += `<rect width="${size}" height="${size}" fill="${lightColor}"/>`;

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          const x = col * totalCellSize + margin;
          const y = row * totalCellSize + margin;
          svg += `<rect x="${x}" y="${y}" width="${totalCellSize}" height="${totalCellSize}" fill="${darkColor}"/>`;
        }
      }
    }
    svg += '</svg>';

    setPreviewSvg(svg);
  }, [qrData.data, darkColor, lightColor, cellSize, margin, errorLevel]);

  useEffect(() => {
    generateNewQR();
  }, [darkColor, lightColor, cellSize, errorLevel, generateNewQR]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(previewSvg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadSVG = () => {
    const blob = new Blob([previewSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qrcode-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const applyPreset = (preset: typeof PRESET_COLORS[0]) => {
    setDarkColor(preset.dark);
    setLightColor(preset.light);
  };

  return (
    <div className="qr-code-card">
      <div className="qr-code-preview-box">
        <div 
          className="qr-code-preview"
          dangerouslySetInnerHTML={{ __html: previewSvg }}
        />
      </div>

        <div className="qr-code-controls">
        <div className="qr-code-data-text">{qrData.data}</div>

        <div className="qr-code-settings-grid">
          <div className="qr-code-row">
            <span className="qr-code-row-label">Colors</span>
            <div className="qr-code-presets">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.name}
                  className={`qr-code-preset-btn ${darkColor === preset.dark ? 'active' : ''}`}
                  onClick={() => applyPreset(preset)}
                  title={preset.name}
                >
                  <div className="qr-code-preset-colors">
                    <div className="qr-code-preset-color" style={{ background: preset.dark }} />
                    <div className="qr-code-preset-color" style={{ background: preset.light }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="qr-code-row">
            <span className="qr-code-row-label">Size</span>
            <input
              type="range"
              min="2"
              max="10"
              value={cellSize}
              onChange={(e) => setCellSize(parseInt(e.target.value))}
              className="qr-code-slider"
            />
            <span className="qr-code-slider-value">{cellSize}</span>
          </div>

          <div className="qr-code-row">
            <span className="qr-code-row-label">Error</span>
            <div className="qr-code-error-levels">
              {ERROR_CORRECTION_LEVELS.map((level) => (
                <button
                  key={level.level}
                  className={`qr-code-error-btn ${errorLevel === level.level ? 'active' : ''}`}
                  onClick={() => setErrorLevel(level.level)}
                >
                  {level.level}
                </button>
              ))}
            </div>
          </div>

          <div className="qr-code-row">
            <span className="qr-code-row-label">Margin</span>
            <input
              type="range"
              min="0"
              max="10"
              value={margin}
              onChange={(e) => setMargin(parseInt(e.target.value))}
              className="qr-code-slider"
            />
            <span className="qr-code-slider-value">{margin}</span>
          </div>
        </div>

        <div className="qr-code-actions">
          <button className="qr-code-btn" onClick={copyToClipboard}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="qr-code-btn qr-code-btn-primary" onClick={downloadSVG}>
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      <style jsx>{`
        .qr-code-card {
          display: flex;
          background: var(--color-bg, #ffffff);
          border: 1px solid var(--color-border, #e2e8f0);
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 12px;
          width: 100%;
          max-width: 100%;
          gap: 14px;
          backdrop-filter: blur(8px);
          height: auto;
          min-height: 240px;
          box-sizing: border-box;
        }
        
        .qr-code-preview-box {
          flex-shrink: 0;
          width: 212px;
          height: 212px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 12px;
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.04);
          padding: 10px;
        }
        
        .qr-code-preview {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .qr-code-preview :global(svg) {
          max-width: 100%;
          max-height: 100%;
        }
        
        .qr-code-controls {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          justify-content: flex-start;
          min-width: 0;
        }
        
        .qr-code-settings-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }
        
        .qr-code-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .qr-code-row-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-secondary, #64748b);
          width: 45px;
          flex-shrink: 0;
        }
        
        .qr-code-presets {
          display: flex;
          gap: 4px;
          flex: 1;
          flex-wrap: wrap;
        }
        
        .qr-code-preset-btn {
          width: 24px;
          height: 20px;
          border-radius: 4px;
          border: 1px solid var(--color-border, #e2e8f0);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          transition: all 0.15s ease;
          background: white;
        }
        
        .qr-code-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .qr-code-row-label {
          font-size: 9px;
          font-weight: 600;
          color: var(--color-text-secondary, #64748b);
          width: 36px;
          flex-shrink: 0;
        }
        
        .qr-code-presets {
          display: flex;
          gap: 2px;
          flex: 1;
          flex-wrap: wrap;
        }
        
        .qr-code-preset-btn {
          width: 18px;
          height: 14px;
          border-radius: 2px;
          border: 1px solid var(--color-border, #e2e8f0);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1px;
          transition: all 0.15s ease;
          background: white;
        }
        
        .qr-code-preset-btn:hover {
          border-color: #10b981;
          transform: scale(1.1);
        }
        
        .qr-code-preset-btn.active {
          border-color: #10b981;
          box-shadow: 0 0 0 1px #10b981;
        }
        
        .qr-code-preset-colors {
          display: flex;
          width: 100%;
          height: 100%;
          border-radius: 1px;
          overflow: hidden;
        }
        
        .qr-code-preset-color {
          flex: 1;
        }
        
        .qr-code-slider {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          appearance: none;
          background: var(--color-border, #e2e8f0);
          cursor: pointer;
        }
        
        .qr-code-slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
        }
        
        .qr-code-slider-value {
          font-size: 11px;
          color: var(--color-text, #1e293b);
          min-width: 28px;
          text-align: right;
        }
        
        .qr-code-error-levels {
          display: flex;
          gap: 4px;
          flex: 1;
        }
        
        .qr-code-error-btn {
          flex: 1;
          padding: 6px 4px;
          border-radius: 6px;
          border: 1px solid var(--color-border, #e2e8f0);
          background: var(--color-bg-secondary, #f8fafc);
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text, #1e293b);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .qr-code-error-btn:hover {
          border-color: #10b981;
          background: var(--color-bg-tertiary, #f1f5f9);
          color: var(--color-text, #1e293b);
        }
        
        :global(.dark) .qr-code-error-btn:hover {
          background: #374151;
          color: white;
        }
        
        .qr-code-error-btn.active {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }
        
        .qr-code-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }
        
        .qr-code-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 14px;
          border: 1px solid var(--color-border, #e2e8f0);
          border-radius: 8px;
          background: var(--color-bg-secondary, #f8fafc);
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text, #1e293b);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        :global(.dark) .qr-code-btn {
          color: var(--color-text, #e2e8f0);
        }
        
        .qr-code-btn:hover {
          background: var(--color-bg-tertiary, #f1f5f9);
        }
        
        :global(.dark) .qr-code-btn:hover {
          background: #374151;
          color: white;
        }
        
        .qr-code-btn-primary {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }
        
        .qr-code-btn-primary:hover {
          background: #059669;
          border-color: #059669;
        }
      `}</style>
    </div>
  );
}
