#!/usr/bin/env tsx
/**
 * Analyze config sizes to identify largest sections
 */

import { nounsSystemConfig } from '../src/config/nouns/index';

function getSize(obj: any): number {
  return JSON.stringify(obj).length;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const config = nounsSystemConfig;

const sizes = {
  brand: getSize(config.brand),
  assets: getSize(config.assets),
  theme: getSize(config.theme),
  community: getSize(config.community),
  fidgets: getSize(config.fidgets),
  homePage: getSize(config.homePage),
  explorePage: getSize(config.explorePage),
  navigation: getSize(config.navigation || {}),
  ui: getSize(config.ui || {}),
};

const total = Object.values(sizes).reduce((a, b) => a + b, 0);

console.log('\n📊 Config Size Analysis\n');
console.log('Section sizes:');
console.log('─'.repeat(50));

const sorted = Object.entries(sizes)
  .sort(([, a], [, b]) => b - a)
  .map(([key, size]) => ({
    section: key,
    size,
    percentage: ((size / total) * 100).toFixed(1),
    formatted: formatSize(size),
  }));

sorted.forEach(({ section, formatted, percentage }) => {
  console.log(`${section.padEnd(15)} ${formatted.padStart(10)} (${percentage}%)`);
});

console.log('─'.repeat(50));
console.log(`Total: ${formatSize(total).padStart(10)}`);

// Analyze theme config in detail
console.log('\n🎨 Theme Config Breakdown:\n');
const themeKeys = Object.keys(config.theme);
themeKeys.forEach((key) => {
  const themeSize = getSize(config.theme[key as keyof typeof config.theme]);
  console.log(`  ${key.padEnd(20)} ${formatSize(themeSize)}`);
});

// Analyze homePage tabs
console.log('\n🏠 Home Page Tabs:\n');
const homeTabs = Object.keys(config.homePage.tabs);
homeTabs.forEach((tab) => {
  const tabSize = getSize(config.homePage.tabs[tab]);
  console.log(`  ${tab.padEnd(20)} ${formatSize(tabSize)}`);
});

// Check for large strings (like HTML)
console.log('\n🔍 Large String Analysis:\n');
function findLargeStrings(obj: any, path = '', threshold = 1000): void {
  if (typeof obj === 'string' && obj.length > threshold) {
    console.log(`  ${path}: ${formatSize(obj.length)}`);
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach((key) => {
      findLargeStrings(obj[key], path ? `${path}.${key}` : key, threshold);
    });
  }
}

findLargeStrings(config, '', 1000);

