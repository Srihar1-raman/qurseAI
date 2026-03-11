import { NextRequest, NextResponse } from 'next/server';
import { Daytona, CodeLanguage } from '@daytonaio/sdk';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('api/daytona/sandbox');

interface SandboxInstance {
  id: string;
  sandbox: Daytona | null;
  language: string;
  createdAt: number;
}

const activeSandboxes = new Map<string, SandboxInstance>();

function getDaytonaClient(): Daytona | null {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    logger.error('DAYTONA_API_KEY not configured');
    return null;
  }
  return new Daytona({ apiKey });
}

function mapLanguage(language: string): CodeLanguage {
  const languageMap: Record<string, CodeLanguage> = {
    python: CodeLanguage.PYTHON,
    javascript: CodeLanguage.JAVASCRIPT,
    typescript: CodeLanguage.TYPESCRIPT,
  };
  return languageMap[language] || CodeLanguage.PYTHON;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, code, language = 'python', sandboxId } = body;

    const daytona = getDaytonaClient();
    if (!daytona) {
      return NextResponse.json(
        { error: 'Daytona API not configured' },
        { status: 500 }
      );
    }

    switch (action) {
      case 'create': {
        logger.info('Creating sandbox', { language });
        
        const sandbox = await daytona.create({
          language: mapLanguage(language),
          autoStopInterval: 15,
        });

        const instance: SandboxInstance = {
          id: sandbox.id,
          sandbox: sandbox as any,
          language,
          createdAt: Date.now(),
        };

        activeSandboxes.set(sandbox.id, instance);

        logger.info('Sandbox created', { sandboxId: sandbox.id });

        return NextResponse.json({
          success: true,
          sandboxId: sandbox.id,
          language,
          message: 'Sandbox created successfully',
        });
      }

      case 'execute': {
        const lang = language || 'python';
        
        const languageConfig: Record<string, { run: string; ext: string; compile?: string }> = {
          python: { run: 'python3', ext: '.py' },
          javascript: { run: 'node', ext: '.js' },
          typescript: { run: 'npx ts-node', ext: '.ts' },
          go: { run: 'go run', ext: '.go' },
          ruby: { run: 'ruby', ext: '.rb' },
          java: { run: 'java', ext: '.java' },
          cpp: { run: 'g++ -o /tmp/main /tmp/main.cpp && /tmp/main', ext: '.cpp' },
          c: { run: 'gcc -o /tmp/main /tmp/main.c && /tmp/main', ext: '.c' },
          rust: { run: 'rustc /tmp/main.rs -o /tmp/main && /tmp/main', ext: '.rs' },
          php: { run: 'php', ext: '.php' },
          bash: { run: 'bash', ext: '.sh' },
        };

        const config = languageConfig[lang] || languageConfig.python;
        
        logger.info('Creating fresh sandbox for execution', { language: lang });
        
        let sandbox;
        try {
          sandbox = await daytona.create({
            language: 'python',
            autoStopInterval: 15,
          });
        } catch (createError) {
          logger.error('Failed to create sandbox', { error: createError });
          return NextResponse.json(
            { error: 'Failed to create sandbox' },
            { status: 500 }
          );
        }

        logger.info('Executing code', { sandboxId: sandbox.id, language: lang, run: config.run });

        let response;
        try {
          const fileName = `/tmp/code${config.ext}`;
          await sandbox.fs.uploadFile(Buffer.from(code), fileName);
          response = await sandbox.process.executeCommand(`${config.run} ${fileName}`);
        } catch (execError) {
          await sandbox.delete().catch(() => {});
          logger.error('Failed to execute code', { error: execError });
          return NextResponse.json(
            { error: execError instanceof Error ? execError.message : 'Failed to execute code' },
            { status: 500 }
          );
        }

        await sandbox.delete().catch(() => {});

        logger.info('Code executed', { sandboxId: sandbox.id, exitCode: response.exitCode });

        return NextResponse.json({
          success: true,
          exitCode: response.exitCode,
          result: response.result || '',
          stdout: response.result || '',
          stderr: '',
          sandboxId: null,
        });
      }

      case 'delete': {
        if (!sandboxId) {
          return NextResponse.json(
            { error: 'sandboxId is required' },
            { status: 400 }
          );
        }

        const instance = activeSandboxes.get(sandboxId);
        if (!instance) {
          return NextResponse.json(
            { error: 'Sandbox not found' },
            { status: 404 }
          );
        }

        logger.info('Deleting sandbox', { sandboxId });

        try {
          const sandbox = instance.sandbox as any;
          if (sandbox) {
            await sandbox.delete();
          }
        } catch (error) {
          logger.warn('Error deleting sandbox', { sandboxId, error });
        }

        activeSandboxes.delete(sandboxId);

        return NextResponse.json({
          success: true,
          message: 'Sandbox deleted',
        });
      }

      case 'status': {
        if (!sandboxId) {
          const sandboxes = Array.from(activeSandboxes.entries()).map(([id, inst]) => ({
            id,
            language: inst.language,
            createdAt: inst.createdAt,
            age: Date.now() - inst.createdAt,
          }));
          return NextResponse.json({ sandboxes });
        }

        const instance = activeSandboxes.get(sandboxId);
        if (!instance) {
          return NextResponse.json({ exists: false });
        }

        return NextResponse.json({
          exists: true,
          sandboxId: instance.id,
          language: instance.language,
          createdAt: instance.createdAt,
          age: Date.now() - instance.createdAt,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, execute, delete, or status' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Sandbox operation failed', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const sandboxId = searchParams.get('sandboxId');

  const daytona = getDaytonaClient();
  if (!daytona) {
    return NextResponse.json(
      { error: 'Daytona API not configured' },
      { status: 500 }
    );
  }

  if (action === 'status') {
    if (!sandboxId) {
      const sandboxes = Array.from(activeSandboxes.entries()).map(([id, inst]) => ({
        id,
        language: inst.language,
        createdAt: inst.createdAt,
        age: Date.now() - inst.createdAt,
      }));
      return NextResponse.json({ sandboxes });
    }

    const instance = activeSandboxes.get(sandboxId);
    if (!instance) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      sandboxId: instance.id,
      language: instance.language,
      createdAt: instance.createdAt,
      age: Date.now() - instance.createdAt,
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
