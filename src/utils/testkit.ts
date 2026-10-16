// Minimal test runner for `tsx` scripts (no test framework dependency).
export async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    process.exitCode = 1;
    console.log(`✗ ${name}\n    ${e instanceof Error ? e.message.split('\n').join('\n    ') : String(e)}`);
  }
}
