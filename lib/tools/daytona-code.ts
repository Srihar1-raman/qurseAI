import { tool } from 'ai';
import { z } from 'zod';

interface DaytonaCodeResult {
  exitCode: number;
  result: string;
  sandboxId?: string;
}

interface ErrorResponse {
  error: string;
}

export const daytonaCodeTool = tool({
  description: 'Execute code in a secure Daytona sandbox. Use this when users want to run code, test algorithms, execute programs, or perform any code execution task. Supports multiple languages including Python, JavaScript, TypeScript, Go, Ruby, and more.',
  inputSchema: z.object({
    code: z.string().describe('The code to execute in the sandbox'),
    language: z.enum(['python', 'javascript', 'typescript', 'go', 'ruby', 'java', 'c', 'cpp', 'rust', 'php', 'bash']).default('python').describe('Programming language to use'),
  }),
  execute: async ({ code, language }) => {
    const apiKey = process.env.DAYTONA_API_KEY;
    const apiUrl = process.env.DAYTONA_API_URL || 'https://app.daytona.io/api';

    if (!apiKey) {
      return { error: 'DAYTONA_API_KEY is not configured' };
    }

    try {
      const createResponse = await fetch(`${apiUrl}/sandbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({}),
      });

      if (!createResponse.ok) {
        throw new Error(`Daytona API error: ${createResponse.status} ${createResponse.statusText}`);
      }

      const sandbox = await createResponse.json();
      const sandboxId = sandbox.id;

      const codeRunResponse = await fetch(`${apiUrl}/sandbox/${sandboxId}/process/code-run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      if (!codeRunResponse.ok) {
        await fetch(`${apiUrl}/sandbox/${sandboxId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        throw new Error(`Daytona Code Run API error: ${codeRunResponse.status} ${codeRunResponse.statusText}`);
      }

      const result = await codeRunResponse.json();

      await fetch(`${apiUrl}/sandbox/${sandboxId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const daytonaResult: DaytonaCodeResult = {
        exitCode: result.exitCode || 0,
        result: result.result || result.stdout || result.output || '',
        sandboxId,
      };

      return daytonaResult;
    } catch (error) {
      const errorResult: ErrorResponse = {
        error: error instanceof Error ? error.message : 'Failed to execute code',
      };
      return errorResult;
    }
  },
});
