import { tool } from 'ai';
import { z } from 'zod';

const WOLFRAM_APP_ID = process.env.WOLFRAM_ALPHA_APP_ID;

interface WolframImage {
  src: string;
  alt?: string;
}

interface WolframSubpod {
  title: string;
  plaintext: string;
  img?: WolframImage;
}

interface WolframPod {
  id: string;
  title: string;
  subpods: WolframSubpod[];
}

interface WolframResult {
  queryresult: {
    success: boolean;
    error: boolean;
    numpods: number;
    pods: WolframPod[];
  };
}

interface PodResult {
  title: string;
  plaintext?: string;
  image?: string;
}

export const wolframTool = tool({
  description: 'Get computational knowledge, scientific calculations, and answers to factual questions using Wolfram Alpha. Use this for: mathematical calculations (evaluations, derivatives, integrals, equations), science (physics, chemistry, biology, astronomy), geography, history, demographics, nutrition, and any factual queries. Returns plain text results and images.',
  inputSchema: z.object({
    query: z.string().describe('The question or calculation to ask Wolfram Alpha. Examples: "solve x^2+2x-1=0", "derivative of sin(x)", "atomic mass of gold", "population of Japan", "distance from Earth to Mars", "weather in Tokyo"'),
  }),
  execute: async ({ query }) => {
    if (!WOLFRAM_APP_ID) {
      return { error: 'WOLFRAM_ALPHA_APP_ID not configured' };
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.wolframalpha.com/v2/query?input=${encodedQuery}&appid=${WOLFRAM_APP_ID}&format=plaintext,image&output=JSON`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        return { error: `Wolfram Alpha API error: ${response.status}` };
      }

      const data: WolframResult = await response.json();
      
      if (!data.queryresult?.success) {
        return { error: data.queryresult?.error ? 'Wolfram Alpha returned an error' : 'No results found' };
      }

      const pods = data.queryresult.pods;
      const podResults: PodResult[] = [];
      
      for (const pod of pods) {
        for (const subpod of pod.subpods) {
          if (subpod.plaintext?.trim() || subpod.img?.src) {
            podResults.push({
              title: pod.title,
              plaintext: subpod.plaintext?.trim(),
              image: subpod.img?.src,
            });
          }
        }
      }

      if (podResults.length === 0) {
        return { error: 'No results found for this query' };
      }

      return {
        query,
        pods: podResults,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch from Wolfram Alpha',
      };
    }
  },
});
