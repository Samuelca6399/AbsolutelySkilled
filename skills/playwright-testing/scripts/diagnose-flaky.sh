#!/usr/bin/env bash
# Diagnose flaky Playwright tests by running them repeatedly and analyzing results.
# Usage: bash scripts/diagnose-flaky.sh [test-file-or-pattern] [--runs N]
#
# What it does:
#   1. Runs specified tests N times (default: 10) with --repeat-each
#   2. Parses the JSON report to find tests that passed sometimes and failed others
#   3. Groups failures by error category (timeout, strict mode, navigation, assertion)
#   4. Prints a diagnosis with suggested fixes per category
#   5. Appends results to .playwright-skill/run-log.json for cross-session tracking

set -euo pipefail

RUNS=10
TEST_PATTERN=""
REPORT_DIR="test-results/flaky-diagnosis"

while [[ $# -gt 0 ]]; do
  case $1 in
    --runs) RUNS="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: diagnose-flaky.sh [test-file-or-pattern] [--runs N]"
      echo ""
      echo "Examples:"
      echo "  diagnose-flaky.sh tests/checkout.spec.ts --runs 20"
      echo "  diagnose-flaky.sh 'checkout' --runs 5"
      exit 0
      ;;
    *) TEST_PATTERN="$1"; shift ;;
  esac
done

if [ -z "$TEST_PATTERN" ]; then
  echo "Error: provide a test file or grep pattern"
  echo "Usage: diagnose-flaky.sh <test-file-or-pattern> [--runs N]"
  exit 1
fi

echo "==> Running '$TEST_PATTERN' $RUNS times..."
echo ""

# Run with JSON reporter to get machine-readable results
mkdir -p "$REPORT_DIR"
npx playwright test "$TEST_PATTERN" \
  --repeat-each="$RUNS" \
  --reporter=json \
  --output="$REPORT_DIR" \
  > "$REPORT_DIR/results.json" 2>&1 || true

# Parse results with node (available since we're in a Playwright project)
node -e "
const fs = require('fs');
const raw = fs.readFileSync('$REPORT_DIR/results.json', 'utf8');

// Find the JSON object (skip any non-JSON output before it)
const jsonStart = raw.indexOf('{');
if (jsonStart === -1) {
  console.log('No JSON output found. Tests may have failed to start.');
  process.exit(1);
}

const report = JSON.parse(raw.slice(jsonStart));
const suites = report.suites || [];
const results = [];

function walkSuite(suite) {
  for (const spec of suite.specs || []) {
    const outcomes = spec.tests.flatMap(t => t.results.map(r => r.status));
    const passed = outcomes.filter(s => s === 'passed').length;
    const failed = outcomes.filter(s => s !== 'passed').length;
    if (failed > 0 && passed > 0) {
      const errors = spec.tests
        .flatMap(t => t.results)
        .filter(r => r.status !== 'passed')
        .map(r => r.error?.message || 'unknown')
        .slice(0, 3);
      results.push({
        title: spec.title,
        file: spec.file,
        line: spec.line,
        passed,
        failed,
        rate: ((passed / (passed + failed)) * 100).toFixed(0) + '%',
        errorSample: errors[0] || '',
      });
    }
  }
  for (const child of suite.suites || []) walkSuite(child);
}

suites.forEach(walkSuite);

if (results.length === 0) {
  console.log('No flaky tests detected in $RUNS runs.');
  console.log('If tests consistently fail, they are not flaky - they are broken.');
  process.exit(0);
}

console.log('==> Flaky tests found:\n');
for (const r of results) {
  console.log('  ' + r.file + ':' + r.line + ' - ' + r.title);
  console.log('    Pass rate: ' + r.rate + ' (' + r.passed + '/' + (r.passed + r.failed) + ')');

  // Categorize the error
  const err = r.errorSample.toLowerCase();
  let category = 'unknown';
  let fix = '';
  if (err.includes('timeout')) {
    category = 'timeout';
    fix = 'Element not found in time. Check: is it behind an animation? Is the selector stable? Is the page hydrated?';
  } else if (err.includes('strict mode violation')) {
    category = 'strict-mode';
    fix = 'Multiple elements match the locator. Make it more specific: add { name: \"...\" }, scope to a parent, or use .filter()';
  } else if (err.includes('navigation')) {
    category = 'navigation';
    fix = 'Page navigated during an action. Use waitForURL() or waitForLoadState() before asserting.';
  } else if (err.includes('expect(')) {
    category = 'assertion';
    fix = 'Value mismatch. If the value changes between runs, suspect a race condition or shared mutable state.';
  } else if (err.includes('net::err') || err.includes('failed to fetch')) {
    category = 'network';
    fix = 'Network request failed. Mock the route with page.route() or use waitForResponse() before asserting.';
  }

  console.log('    Category: ' + category);
  console.log('    Suggested fix: ' + fix);
  console.log('    Error: ' + r.errorSample.split('\n')[0].slice(0, 120));
  console.log('');
}

// Update run log
const logDir = '.playwright-skill';
const logPath = logDir + '/run-log.json';
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

let log = { runs: [] };
try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch {}

log.runs.push({
  timestamp: new Date().toISOString(),
  pattern: '$TEST_PATTERN',
  repeatCount: $RUNS,
  flakyTests: results.map(r => r.file + ':' + r.line),
});

// Keep last 20 runs
log.runs = log.runs.slice(-20);

// Find recurring flaky tests (appear in 3+ runs)
const allFlaky = log.runs.flatMap(r => r.flakyTests);
const counts = {};
allFlaky.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
log.chronicFlaky = Object.entries(counts)
  .filter(([, c]) => c >= 3)
  .map(([test, count]) => ({ test, occurrences: count }));

fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

if (log.chronicFlaky.length > 0) {
  console.log('==> Chronically flaky tests (seen in 3+ diagnosis runs):');
  for (const { test, occurrences } of log.chronicFlaky) {
    console.log('  ' + test + ' (' + occurrences + ' runs)');
  }
  console.log('');
  console.log('Consider quarantining these with test.fixme() and loading');
  console.log('references/flaky-test-playbook.md for root cause analysis.');
}
"

echo ""
echo "==> Results saved to $REPORT_DIR/"
echo "==> Run log updated at .playwright-skill/run-log.json"
