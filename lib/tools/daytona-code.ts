import { tool } from 'ai';
import { z } from 'zod';
import { Daytona, CodeLanguage } from '@daytonaio/sdk';

export const daytonaCodeTool = tool({
  description: 'Execute code in a secure Daytona sandbox. Use this when users want to run code, test algorithms, execute programs, or perform any code execution task. Supports Python, JavaScript, TypeScript, C, C++, Bash.',
  inputSchema: z.object({
    code: z.string().describe('The code to execute in sandbox'),
    language: z.enum(['python', 'javascript', 'typescript', 'c', 'cpp', 'bash']).default('python').describe('Programming language to use'),
  }),
  execute: async ({ code, language }) => {
    const apiKey = process.env.DAYTONA_API_KEY;

    if (!apiKey) {
      return { error: 'DAYTONA_API_KEY is not configured' };
    }

    const languageConfig: Record<string, { run: string; ext: string }> = {
      python: { run: 'python3 /tmp/code.py', ext: '.py' },
      javascript: { run: 'node /tmp/code.js', ext: '.js' },
      typescript: { run: 'npx ts-node /tmp/code.ts', ext: '.ts' },
      c: { run: 'gcc -o /tmp/main /tmp/code.c && /tmp/main', ext: '.c' },
      cpp: { run: 'g++ -o /tmp/main /tmp/code.cpp && /tmp/main', ext: '.cpp' },
      bash: { run: 'bash /tmp/code.sh', ext: '.sh' },
    };

    const config = languageConfig[language] || languageConfig.python;

    try {
      const daytona = new Daytona({ apiKey });
      const sandbox = await daytona.create({ language: CodeLanguage.PYTHON });

      const fileName = `/tmp/code${config.ext}`;
      await sandbox.fs.uploadFile(Buffer.from(code), fileName);
      const response = await sandbox.process.executeCommand(config.run);

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
