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
  description: 'Create an interactive math calculator with the Desmos API. Use this tool whenever users want to visualize math, plot functions, or work with any mathematical content. Note: Only the graphing calculator supports pre-filling expressions. Other calculators (scientific, four-function, geometry, 3D) will show an empty calculator for the user to interact with.',
  inputSchema: z.object({
    calculatorType: z.enum(['graphing', 'scientific', 'fourFunction', 'geometry', '3d'])
      .default('graphing')
      .describe('Type of calculator: graphing (full-featured 2D graphing - supports pre-filling expressions), scientific (scientific calculator), fourFunction (basic calculator), geometry (interactive geometry), 3D (3D graphing)'),
    expressions: z.array(z.object({
      id: z.string(),
      latex: z.string(),
      color: z.string().optional(),
    })).optional()
      .describe('Initial expressions to plot. Only works with graphing calculator. Examples: y=x^2, y=sin(x), x^2+y^2=25'),
    viewport: z.object({
      xmin: z.number(),
      xmax: z.number(),
      ymin: z.number(),
      ymax: z.number(),
    }).optional()
      .describe('Initial viewport bounds (for graphing calculator only)'),
  }),
  execute: async ({ calculatorType, expressions, viewport }) => {
    return {
      calculatorType,
      initialExpressions: expressions || [],
      viewport,
    };
  },
});
