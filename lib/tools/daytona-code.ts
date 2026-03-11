import { tool } from 'ai';
import { z } from 'zod';
import { Daytona, CodeLanguage } from '@daytonaio/sdk';

export const daytonaCodeTool = tool({
  description: 'Execute code in a secure Daytona sandbox. Use this when users want to run code, test algorithms, execute programs, or perform any code execution task. Supports Python, JavaScript, TypeScript, Go, Ruby, Java, C, C++, Rust, PHP, Bash.',
  inputSchema: z.object({
    code: z.string().describe('The code to execute in sandbox'),
    language: z.enum(['python', 'javascript', 'typescript', 'go', 'ruby', 'java', 'cpp', 'c', 'rust', 'php', 'bash']).default('python').describe('Programming language to use'),
  }),
  execute: async ({ code, language }) => {
    const apiKey = process.env.DAYTONA_API_KEY;

    if (!apiKey) {
      return { error: 'DAYTONA_API_KEY is not configured' };
    }

    const languageConfig: Record<string, { run: string; ext: string; install?: string }> = {
      python: { run: 'python3 /tmp/code.py', ext: '.py' },
      javascript: { run: 'node /tmp/code.js', ext: '.js' },
      typescript: { run: 'npx ts-node /tmp/code.ts', ext: '.ts', install: 'npm install -g ts-node typescript' },
      go: { run: 'cd /tmp && go run code.go', ext: '.go', install: 'apt-get update && apt-get install -y golang-go' },
      ruby: { run: 'ruby /tmp/code.rb', ext: '.rb', install: 'apt-get update && apt-get install -y ruby' },
      java: { run: 'cd /tmp && javac Main.java && java Main', ext: '.java', install: 'apt-get update && apt-get install -y default-jdk' },
      cpp: { run: 'g++ -o /tmp/main /tmp/code.cpp && /tmp/main', ext: '.cpp', install: 'apt-get update && apt-get install -y g++' },
      c: { run: 'gcc -o /tmp/main /tmp/code.c && /tmp/main', ext: '.c', install: 'apt-get update && apt-get install -y gcc' },
      rust: { run: 'rustc /tmp/code.rs -o /tmp/main && /tmp/main', ext: '.rs', install: 'apt-get update && apt-get install -y rustc' },
      php: { run: 'php /tmp/code.php', ext: '.php', install: 'apt-get update && apt-get install -y php-cli' },
      bash: { run: 'bash /tmp/code.sh', ext: '.sh' },
    };

    const config = languageConfig[language] || languageConfig.python;

    try {
      const daytona = new Daytona({ apiKey });
      const sandbox = await daytona.create({ language: CodeLanguage.PYTHON });

      if (config.install) {
        try {
          await sandbox.process.executeCommand(config.install);
        } catch (installError) {
          console.log('Install warning:', installError);
        }
      }

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
