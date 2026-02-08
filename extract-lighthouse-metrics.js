#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const reportsDir = './lighthouse-reports';
const reports = [
  { name: 'Home Page', file: 'home.report.json' },
  { name: 'Design System Gallery', file: 'design-system.report.json' },
  { name: 'Design System Test', file: 'design-system-test.report.json' },
  { name: 'Dashboard', file: 'dashboard.report.json' },
];

console.log('\n📊 Lighthouse Performance Metrics Summary\n');
console.log('='.repeat(80));

reports.forEach(({ name, file }) => {
  const filePath = path.join(reportsDir, file);

  if (!fs.existsSync(filePath)) {
    console.log(`\n❌ ${name}: Report not found`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const audits = data.audits;
  const categories = data.categories;

  // Extract metrics
  const performanceScore = Math.round(categories.performance.score * 100);
  const fcp = audits['first-contentful-paint']?.displayValue || 'N/A';
  const lcp = audits['largest-contentful-paint']?.displayValue || 'N/A';
  const tti = audits['interactive']?.displayValue || 'N/A';
  const cls = audits['cumulative-layout-shift']?.displayValue || 'N/A';
  const tbt = audits['total-blocking-time']?.displayValue || 'N/A';
  const si = audits['speed-index']?.displayValue || 'N/A';

  console.log(`\n${name}`);
  console.log('-'.repeat(80));
  console.log(`Performance Score:          ${performanceScore}/100 ${performanceScore >= 90 ? '✅' : '⚠️'}`);
  console.log(`First Contentful Paint:     ${fcp} ${getFcpStatus(fcp)}`);
  console.log(`Largest Contentful Paint:   ${lcp}`);
  console.log(`Time to Interactive:        ${tti} ${getTtiStatus(tti)}`);
  console.log(`Cumulative Layout Shift:    ${cls} ${getClsStatus(cls)}`);
  console.log(`Total Blocking Time:        ${tbt}`);
  console.log(`Speed Index:                ${si}`);
});

console.log('\n' + '='.repeat(80));
console.log('\n📋 Performance Targets:');
console.log('  ✓ Performance Score ≥ 90');
console.log('  ✓ First Contentful Paint < 1.5s');
console.log('  ✓ Time to Interactive < 3s');
console.log('  ✓ Cumulative Layout Shift = 0');
console.log('');

function getFcpStatus(fcp) {
  const value = parseFloat(fcp);
  return value < 1.5 ? '✅' : '⚠️';
}

function getTtiStatus(tti) {
  const value = parseFloat(tti);
  return value < 3.0 ? '✅' : '⚠️';
}

function getClsStatus(cls) {
  const value = parseFloat(cls);
  return value === 0 ? '✅' : '⚠️';
}
