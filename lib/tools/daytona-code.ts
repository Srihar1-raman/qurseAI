import { tool } from 'ai';
import { z } from 'zod';
import { Daytona, CodeLanguage } from '@daytonaio/sdk';

export const daytonaCodeTool = tool({
  description: 'Execute code in a secure Daytona sandbox. Use this when users want to run code, test algorithms, execute programs, or perform any code execution task. Supports Python, JavaScript, and TypeScript.',
  inputSchema: z.object({
    code: z.string().describe('The code to execute in sandbox'),
    language: z.enum(['python', 'javascript', 'typescript']).default('python').describe('Programming language to use'),
  }),
  execute: async ({ code, language }) => {
    const apiKey = process.env.DAYTONA_API_KEY;

    if (!apiKey) {
      return { error: 'DAYTONA_API_KEY is not configured' };
    }

    try {
      const daytona = new Daytona({ apiKey });

      const languageMap = {
        python: CodeLanguage.PYTHON,
        javascript: CodeLanguage.JAVASCRIPT,
        typescript: CodeLanguage.TYPESCRIPT,
      };

      const sandbox = await daytona.create({ language: languageMap[language] || CodeLanguage.PYTHON });

      const response = await sandbox.process.codeRun(code);

      await sandbox.delete();

      return {
        exitCode: response.exitCode,
        result: response.result || '',
        sandboxId: sandbox.id,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to execute code',
      };
    }
  },
});
