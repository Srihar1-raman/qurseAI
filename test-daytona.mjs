import { Daytona } from '@daytonaio/sdk';

const apiKey = 'dtn_49324fbe12fa2139f7759af4fac10dae695d61a9be7a338b125335d1922d950d';
const apiUrl = 'https://app.daytona.io/api';

const daytona = new Daytona({ apiKey });

console.log('Creating sandbox...');
const sandbox = await daytona.create();
console.log('Sandbox created:', sandbox.id);

console.log('\nRunning Python code...');
const response = await sandbox.process.codeRun('print("Hello World")');
console.log('Response:', response);

console.log('\nDeleting sandbox...');
await sandbox.delete();
console.log('Done');
