import { Daytona, CodeLanguage } from '@daytonaio/sdk';

const apiKey = 'dtn_49324fbe12fa2139f7759af4fac10dae695d61a9be7a338b125335d1922d950d';
const daytona = new Daytona({ apiKey });

async function test() {
  console.log('Creating Python sandbox...');
  const sandbox = await daytona.create({ language: CodeLanguage.PYTHON });
  console.log('Sandbox ID:', sandbox.id);

  const code = `def hcf(a, b):
    while b:
        a, b = b, a % b
    return abs(a)

print("The HCF of 12 and 18 is", hcf(12, 18))`;

  console.log('\nRunning code...');
  const response = await sandbox.process.codeRun(code);
  console.log('Exit code:', response.exitCode);
  console.log('Result:', response.result);

  console.log('\nDeleting sandbox...');
  await sandbox.delete();
  console.log('Done');
}

test().catch(console.error);
