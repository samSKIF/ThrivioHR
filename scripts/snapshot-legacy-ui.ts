#!/usr/bin/env tsx
import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

const GIT_URL = 'https://github.com/samSKIF/ThrivioHR';
const TEMP_DIR = '.tmp-legacy';
const OUTPUT_DIR = 'legacy-ui';
const MAX_FILE_SIZE = 300 * 1024; // 300KB
const MAX_FILE_LINES = 500;

interface FileStats {
  originalPath: string;
  newPath: string;
  lines: number;
  bytes: number;
  importCount: number;
}

interface CopyCounts {
  ts: number;
  tsx: number;
  js: number;
  jsx: number;
  css: number;
  scss: number;
  svg: number;
  img: number;
}

const counts: CopyCounts = { ts: 0, tsx: 0, js: 0, jsx: 0, css: 0, scss: 0, svg: 0, img: 0 };
const fileStats: FileStats[] = [];
const skippedFiles: Array<{ path: string; reason: string }> = [];

async function cleanup() {
  try {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    console.log('✓ Temp cleaned');
  } catch (err) {
    console.warn('Warning: temp cleanup failed:', err);
  }
}

async function cloneRepo() {
  console.log('Cloning repository...');
  await cleanup(); // ensure clean start
  
  // Use simpler clone without sparse checkout initially
  execSync(`git clone --depth 1 ${GIT_URL} ${TEMP_DIR}/repo`, 
    { stdio: 'inherit' });
  
  const repoPath = path.join(TEMP_DIR, 'repo');
  return repoPath;
}

async function getFileStats(filePath: string): Promise<{ lines: number; bytes: number }> {
  const content = await fs.readFile(filePath, 'utf-8');
  return {
    lines: content.split('\n').length,
    bytes: content.length
  };
}

async function shouldCopyFile(filePath: string, relativePath: string): Promise<{ copy: boolean; reason?: string }> {
  const ext = path.extname(filePath).toLowerCase();
  const allowedExtensions = ['.tsx', '.jsx', '.ts', '.js', '.css', '.scss', '.svg', '.png', '.jpg', '.jpeg', '.webp'];
  
  if (!allowedExtensions.includes(ext)) {
    return { copy: false, reason: 'excluded file type' };
  }
  
  // Check if file already exists in output
  const outputPath = path.join(OUTPUT_DIR, relativePath);
  try {
    await fs.access(outputPath);
    return { copy: false, reason: 'already exists' };
  } catch {
    // File doesn't exist, continue checks
  }
  
  const stats = await fs.stat(filePath);
  
  // Check file size for images
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    if (stats.size >= MAX_FILE_SIZE) {
      return { copy: false, reason: 'image too large' };
    }
  }
  
  // Check line count for source files
  if (['.tsx', '.jsx', '.ts', '.js'].includes(ext)) {
    const { lines } = await getFileStats(filePath);
    if (lines >= MAX_FILE_LINES) {
      return { copy: false, reason: 'too many lines' };
    }
  }
  
  return { copy: true };
}

async function copyFile(sourcePath: string, relativePath: string) {
  const outputPath = path.join(OUTPUT_DIR, relativePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.copyFile(sourcePath, outputPath);
  
  const ext = path.extname(sourcePath).toLowerCase().substring(1);
  if (ext in counts) {
    (counts as any)[ext]++;
  } else if (['.png', '.jpg', '.jpeg', '.webp'].includes('.' + ext)) {
    counts.img++;
  }
  
  // Record file stats
  const { lines, bytes } = await getFileStats(sourcePath);
  fileStats.push({
    originalPath: relativePath,
    newPath: path.join(OUTPUT_DIR, relativePath),
    lines,
    bytes,
    importCount: 0 // Will be calculated later
  });
}

async function walkDirectory(dir: string, baseDir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      await walkDirectory(fullPath, baseDir);
    } else {
      const { copy, reason } = await shouldCopyFile(fullPath, relativePath);
      if (copy) {
        await copyFile(fullPath, relativePath);
      } else if (reason) {
        skippedFiles.push({ path: relativePath, reason });
      }
    }
  }
}

async function calculateImportCounts() {
  console.log('Analyzing component imports...');
  
  // Read all copied source files
  const sourceFiles = fileStats.filter(f => 
    f.originalPath.match(/\.(tsx?|jsx?)$/)
  );
  
  for (const file of sourceFiles) {
    try {
      const content = await fs.readFile(file.newPath, 'utf-8');
      
      // Find import statements with relative paths
      const importRegex = /from\s+['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          // Find matching component
          for (const target of fileStats) {
            if (target.originalPath.includes(importPath) || 
                target.originalPath.includes(path.basename(importPath))) {
              target.importCount++;
            }
          }
        }
      }
    } catch (err) {
      // Skip files that can't be read
    }
  }
}

async function generateComponentMap() {
  console.log('Generating component map...');
  
  const totalSize = fileStats.reduce((sum, f) => sum + f.bytes, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  
  const topComponents = fileStats
    .filter(f => f.importCount > 0)
    .sort((a, b) => b.importCount - a.importCount)
    .slice(0, 10);
  
  const mapContent = `# Legacy UI Component Map

Generated: ${new Date().toISOString()}
Total Size: ${totalSizeMB} MB
Total Files: ${fileStats.length}

## File Mapping

| Original Path | New Path | Lines | Bytes | Imports |
|---------------|----------|-------|-------|---------|
${fileStats.map(f => 
  `| ${f.originalPath} | ${f.newPath} | ${f.lines} | ${f.bytes} | ${f.importCount} |`
).join('\n')}

## Top 10 Components by Import Count

| Component | Path | Import Count |
|-----------|------|--------------|
${topComponents.map(f => 
  `| ${path.basename(f.originalPath)} | ${f.originalPath} | ${f.importCount} |`
).join('\n')}

## Skipped Files

| Path | Reason |
|------|--------|
${skippedFiles.map(f => 
  `| ${f.path} | ${f.reason} |`
).join('\n')}

## File Type Counts

- TypeScript: ${counts.ts}
- TSX: ${counts.tsx}
- JavaScript: ${counts.js}
- JSX: ${counts.jsx}
- CSS: ${counts.css}
- SCSS: ${counts.scss}
- SVG: ${counts.svg}
- Images: ${counts.img}
`;

  await fs.writeFile(path.join(OUTPUT_DIR, 'COMPONENT_MAP.md'), mapContent);
  return { totalSizeMB: parseFloat(totalSizeMB), topComponents };
}

async function main() {
  try {
    const repoPath = await cloneRepo();
    
    // Create output directory
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Copy files from client directory
    const clientPath = path.join(repoPath, 'client');
    try {
      await fs.access(clientPath);
      await walkDirectory(clientPath, clientPath);
    } catch {
      console.log('No client directory found, trying root...');
      await walkDirectory(repoPath, repoPath);
    }
    
    await calculateImportCounts();
    const { totalSizeMB, topComponents } = await generateComponentMap();
    
    // Print results
    console.log('\n=== SNAPSHOT RESULTS ===');
    console.log('File type counts:');
    console.log(`- ts: ${counts.ts}, tsx: ${counts.tsx}, js: ${counts.js}, jsx: ${counts.jsx}`);
    console.log(`- css: ${counts.css}, scss: ${counts.scss}, svg: ${counts.svg}, images: ${counts.img}`);
    
    console.log('\nTop 10 components by import references:');
    topComponents.forEach((comp, i) => {
      console.log(`${i + 1}. ${path.basename(comp.originalPath)} (${comp.importCount} imports)`);
    });
    
    console.log(`\nTotal size: ${totalSizeMB} MB`);
    
    // Show first 20 lines of component map
    const mapPath = path.join(OUTPUT_DIR, 'COMPONENT_MAP.md');
    console.log(`\nComponent map: ${mapPath}`);
    const mapContent = await fs.readFile(mapPath, 'utf-8');
    const first20Lines = mapContent.split('\n').slice(0, 20).join('\n');
    console.log('First 20 lines:\n' + first20Lines);
    
  } finally {
    await cleanup();
  }
}

main().catch(console.error);