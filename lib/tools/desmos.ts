import { tool } from 'ai';
import { z } from 'zod';

export type CalculatorType = 'graphing' | 'scientific' | 'fourFunction' | 'geometry' | '3d';

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

export interface DesmosResult {
  calculatorType: CalculatorType;
  initialExpressions: Expression[];
  viewport?: Viewport;
}

export const desmosTool = tool({
  description: 'Create an interactive math calculator (graphing, scientific, four-function, geometry, or 3D) with the Desmos API. Use this tool whenever users want to visualize math, plot functions, do calculations, or work with any mathematical content that would benefit from an interactive calculator.',
  inputSchema: z.object({
    calculatorType: z.enum(['graphing', 'scientific', 'fourFunction', 'geometry', '3d'])
      .default('graphing')
      .describe('Type of calculator: graphing (full-featured 2D graphing), scientific (scientific calculator), fourFunction (basic calculator), geometry (interactive geometry), 3D (3D graphing)'),
    expressions: z.array(z.object({
      id: z.string(),
      latex: z.string(),
      color: z.string().optional(),
    })).optional()
      .describe('Initial expressions to plot or calculate. For graphing: equations like y=x^2. For scientific/fourFunction: calculations like 2+2 or sin(pi/2). For geometry: expressions like (0,0),(1,1) for points. For 3D: 3D equations like x^2+y^2+z^2=1'),
    expression: z.string().optional()
      .describe('Simple expression string (alternative to expressions array). For scientific/fourFunction: calculation to pre-fill like "2+2" or "sqrt(16)".'),
    viewport: z.object({
      xmin: z.number(),
      xmax: z.number(),
      ymin: z.number(),
      ymax: z.number(),
    }).optional()
      .describe('Initial viewport bounds (for graphing calculator)'),
  }),
  execute: async ({ calculatorType, expressions, expression, viewport }) => {
    let finalExpressions = expressions || [];
    
    if (expression && finalExpressions.length === 0) {
      finalExpressions = [{
        id: '1',
        latex: expression,
      }];
    }
    
    return {
      calculatorType,
      initialExpressions: finalExpressions,
      viewport,
    };
  },
});
