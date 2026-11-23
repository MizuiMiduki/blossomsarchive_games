import fs from 'fs';
import path from 'path';

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      scanDir(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = scanDir(path.resolve('src'));
let issues = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');

  // 1. className in Solid.js
  const classNameMatches = content.match(/\bclassName=/g);
  if (classNameMatches) {
    issues.push(`${file}: found className (${classNameMatches.length} occurrences) - should be 'class' in Solid.js`);
  }

  // 2. readOnly on input
  const readOnlyMatches = content.match(/\breadOnly\b/g);
  if (readOnlyMatches) {
    issues.push(`${file}: found readOnly (${readOnlyMatches.length} occurrences) - should be 'readonly' in Solid.js`);
  }

  // 3. onMount in solid-js
  if (content.includes("from 'solid-js'") && content.match(/\bonMount\b/)) {
    issues.push(`${file}: imports or uses 'onMount' - should be 'onSettled' in Solid.js 2.x`);
  }
}

console.log(`Scanned ${files.length} TypeScript/TSX files.`);
if (issues.length > 0) {
  console.log(`Found ${issues.length} potential issues:`);
  issues.forEach((i) => console.log('  - ' + i));
} else {
  console.log('✓ No Solid.js JSX attribute or lifecycle issues found!');
}
