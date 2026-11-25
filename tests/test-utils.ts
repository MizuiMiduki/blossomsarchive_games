export class TestContext {
  suiteName: string;
  passed = 0;
  failed = 0;
  failures: string[] = [];

  constructor(suiteName: string) {
    this.suiteName = suiteName;
  }

  assert(condition: boolean, message: string): void {
    if (condition) {
      this.passed++;
      console.log(`    ✓ ${message}`);
    } else {
      this.failed++;
      this.failures.push(message);
      console.error(`    ✗ FAIL: ${message}`);
    }
  }

  assertEqual<T>(actual: T, expected: T, message: string): void {
    const isEq = JSON.stringify(actual) === JSON.stringify(expected);
    if (isEq) {
      this.passed++;
      console.log(`    ✓ ${message}`);
    } else {
      this.failed++;
      const detail = `${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`;
      this.failures.push(detail);
      console.error(`    ✗ FAIL: ${detail}`);
    }
  }

  assertThrows(fn: () => void, message: string): void {
    try {
      fn();
      this.failed++;
      this.failures.push(`${message} (Expected exception but none was thrown)`);
      console.error(`    ✗ FAIL: ${message} (Expected exception)`);
    } catch {
      this.passed++;
      console.log(`    ✓ ${message}`);
    }
  }

  summary(): { passed: number; failed: number; failures: string[] } {
    return {
      passed: this.passed,
      failed: this.failed,
      failures: this.failures,
    };
  }
}
