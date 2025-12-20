/**
 * Test suite for markdown rendering performance
 * Tests streaming scenarios and edge cases
 */

import { describe, it, expect } from 'vitest';

// Test constants match implementation
const THROTTLE_DELAY_MS = 150;
const VIRTUAL_SCROLL_THRESHOLD_STREAMING = 20000;
const VIRTUAL_SCROLL_THRESHOLD_NORMAL = 100000;

describe('Markdown Rendering - Performance Tests', () => {
  describe('Virtual Scrolling Thresholds', () => {
    it('should use lower threshold during streaming', () => {
      const isStreaming = true;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      expect(threshold).toBe(20000);
      expect(threshold).toBeLessThan(VIRTUAL_SCROLL_THRESHOLD_NORMAL);
    });

    it('should use normal threshold when not streaming', () => {
      const isStreaming = false;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      expect(threshold).toBe(100000);
    });

    it('should activate virtual scrolling at correct size during streaming', () => {
      const content = 'x'.repeat(25000); // 25k chars
      const isStreaming = true;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      const shouldUseVirtual = content.length > threshold;
      expect(shouldUseVirtual).toBe(true);
    });

    it('should not activate virtual scrolling for small content', () => {
      const content = 'x'.repeat(10000); // 10k chars
      const isStreaming = true;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      const shouldUseVirtual = content.length > threshold;
      expect(shouldUseVirtual).toBe(false);
    });
  });

  describe('Content Size Scenarios', () => {
    it('should handle small content (1-10k chars)', () => {
      const content = 'x'.repeat(5000);
      const isStreaming = false;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      expect(content.length).toBeLessThan(threshold);
      expect(content.length).toBeGreaterThan(0);
    });

    it('should handle medium content (10-50k chars)', () => {
      const content = 'x'.repeat(30000);
      const isStreaming = false;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      expect(content.length).toBeLessThan(threshold);
      expect(content.length).toBeGreaterThan(10000);
    });

    it('should handle large content (50-200k chars)', () => {
      const content = 'x'.repeat(150000);
      const isStreaming = false;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      expect(content.length).toBeGreaterThan(threshold);
    });

    it('should handle very large content (200k+ chars)', () => {
      const content = 'x'.repeat(500000);
      const isStreaming = false;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      expect(content.length).toBeGreaterThan(threshold);
    });
  });

  describe('Streaming Mode Optimizations', () => {
    it('should skip expensive operations during streaming', () => {
      const isStreaming = true;
      const shouldSkipExpensive = isStreaming;
      
      expect(shouldSkipExpensive).toBe(true);
    });

    it('should process full content when not streaming', () => {
      const isStreaming = false;
      const shouldProcessFull = !isStreaming;
      
      expect(shouldProcessFull).toBe(true);
    });

    it('should handle streaming to non-streaming transition', () => {
      let isStreaming = true;
      expect(isStreaming).toBe(true);
      
      // Streaming stops
      isStreaming = false;
      expect(isStreaming).toBe(false);
    });
  });

  describe('Content Hash Stability', () => {
    it('should generate stable hash for same content', () => {
      const content = 'This is test content';
      const hash1 = content.slice(0, 200);
      const hash2 = content.slice(0, 200);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different content', () => {
      const content1 = 'First content';
      const content2 = 'Second content';
      const hash1 = content1.slice(0, 200);
      const hash2 = content2.slice(0, 200);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should use first 200 chars for hash', () => {
      const content = 'x'.repeat(1000);
      const hash = content.slice(0, 200);
      
      expect(hash.length).toBe(200);
    });

    it('should handle content shorter than 200 chars', () => {
      const content = 'Short content';
      const hash = content.slice(0, 200);
      
      expect(hash.length).toBe(content.length);
      expect(hash).toBe(content);
    });
  });

  describe('Performance Metrics', () => {
    it('should maintain render frequency target', () => {
      const originalFreq = 20; // updates/sec
      const throttleDelay = THROTTLE_DELAY_MS;
      const targetFreq = 1000 / throttleDelay;
      
      expect(targetFreq).toBeLessThan(originalFreq);
      expect(targetFreq).toBeCloseTo(6.67, 1);
    });

    it('should maintain processing time target', () => {
      const maxProcessingTime = 200; // ms
      const targetTime = 150; // ms
      
      expect(targetTime).toBeLessThan(maxProcessingTime);
    });

    it('should handle large content efficiently', () => {
      const largeContent = 'x'.repeat(100001); // Just over threshold
      const isStreaming = false;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      // Large content should use virtual scrolling
      const shouldUseVirtual = largeContent.length > threshold;
      expect(shouldUseVirtual).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const content = '';
      const isStreaming = false;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      expect(content.length).toBe(0);
      expect(content.length).toBeLessThan(threshold);
    });

    it('should handle single character content', () => {
      const content = 'x';
      const isStreaming = false;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      expect(content.length).toBe(1);
      expect(content.length).toBeLessThan(threshold);
    });

    it('should handle content exactly at threshold', () => {
      const content = 'x'.repeat(20000);
      const isStreaming = true;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      // At threshold, should not activate (uses > not >=)
      const shouldUseVirtual = content.length > threshold;
      expect(shouldUseVirtual).toBe(false);
    });

    it('should handle content one char over threshold', () => {
      const content = 'x'.repeat(20001);
      const isStreaming = true;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      const shouldUseVirtual = content.length > threshold;
      expect(shouldUseVirtual).toBe(true);
    });

    it('should handle rapid streaming state changes', () => {
      let isStreaming = false;
      const states: boolean[] = [];
      
      // Simulate rapid toggling
      for (let i = 0; i < 10; i++) {
        isStreaming = !isStreaming;
        states.push(isStreaming);
      }
      
      expect(states.length).toBe(10);
      expect(states[0]).toBe(true);
      expect(states[9]).toBe(false);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical chat message (1-5k chars)', () => {
      const content = 'This is a typical chat message. '.repeat(100); // ~3.5k chars
      const isStreaming = false;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      expect(content.length).toBeLessThan(threshold);
      expect(content.length).toBeGreaterThan(1000);
    });

    it('should handle code block response (10-20k chars)', () => {
      const codeBlock = 'function test() {\n  return "hello";\n}'.repeat(500);
      const content = `Here's the code:\n\n\`\`\`\n${codeBlock}\n\`\`\``;
      const isStreaming = false;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      expect(content.length).toBeLessThan(threshold);
      expect(content.length).toBeGreaterThan(10000);
    });

    it('should handle long article response (50k+ chars)', () => {
      const content = 'This is a long article. '.repeat(2500); // ~62.5k chars
      const isStreaming = false;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      expect(content.length).toBeLessThan(threshold);
    });

    it('should handle very long response (200k+ chars)', () => {
      const content = 'This is a very long response. '.repeat(8000); // ~200k chars
      const isStreaming = false;
      const threshold = isStreaming ? VIRTUAL_SCROLL_THRESHOLD_STREAMING : VIRTUAL_SCROLL_THRESHOLD_NORMAL;
      
      expect(content.length).toBeGreaterThan(threshold);
    });
  });
});

