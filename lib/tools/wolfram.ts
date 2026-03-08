import { tool } from 'ai';
import { z } from 'zod';

const WOLFRAM_APP_ID = process.env.WOLFRAM_ALPHA_APP_ID;

interface WolframPod {
  id: string;
  title: string;
  subpods: Array<{
    title: string;
    plaintext: string;
    img?: string;
  }>;
}

interface WolframResult {
  queryresult: {
    success: boolean;
    error: boolean;
    numpods: number;
    pods: WolframPod[];
  };
}

export const wolframTool = tool({
  description: 'Get computational knowledge, scientific calculations, and answers to factual questions using Wolfram Alpha. Use this for: mathematical calculations (evaluations, derivatives, integrals, equations), science (physics, chemistry, biology, astronomy), geography, history, demographics, nutrition, and any factual queries. Returns plain text results.',
  inputSchema: z.object({
    query: z.string().describe('The question or calculation to ask Wolfram Alpha. Examples: "solve x^2+2x-1=0", "derivative of sin(x)", "atomic mass of gold", "population of Japan", "distance from Earth to Mars", "weather in Tokyo"'),
  }),
  execute: async ({ query }) => {
    if (!WOLFRAM_APP_ID) {
      return { error: 'WOLFRAM_ALPHA_APP_ID not configured' };
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.wolframalpha.com/v2/query?input=${encodedQuery}&appid=${WOLFRAM_APP_ID}&format=plaintext&output=JSON`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        return { error: `Wolfram Alpha API error: ${response.status}` };
      }

      const data: WolframResult = await response.json();
      
      if (!data.queryresult?.success) {
        return { error: data.queryresult?.error ? 'Wolfram Alpha returned an error' : 'No results found' };
      }

      const pods = data.queryresult.pods;
      const results: string[] = [];
      
      // Get the main result pods
      for (const pod of pods) {
        // Skip input interpretation pods
        if (pod.id === 'Input' || pod.id === 'Interpretation') continue;
        
        for (const subpod of pod.subpods) {
          if (subpod.plaintext && subpod.plaintext.trim()) {
            results.push(subpod.plaintext.trim());
          }
        }
      }

      if (results.length === 0) {
        return { error: 'No results found for this query' };
      }

      return {
        query,
        answer: results.join('\n\n'),
        hasVisual: pods.some(p => p.subpods.some(s => s.img)),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch from Wolfram Alpha',
      };
    }
  },
});
