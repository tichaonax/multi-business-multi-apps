#!/usr/bin/env node
/**
 * Script to find snake_case usage in Prisma-related code
 * Prisma models should use PascalCase, attributes should use camelCase
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SEARCH_PATTERNS = {
  // Model names (should be PascalCase)
  modelNames: /\b[a-z]+_[a-z_]+\b(?=\s*\{|\s*\(|\s*\.)/g,
  
  // Field/attribute access (should be camelCase)
  fieldAccess: /\.\s*[a-z]+_[a-z_]+\b/g,
  
  // Prisma queries with snake_case
  prismaQueries: /prisma\.[a-z]+_[a-z_]+/g,
  
  // Model references in where clauses, etc.
  modelReferences: /\b[a-z]+_[a-z_]+\s*:/g,
  
  // Type definitions
  typeReferences: /:\s*[A-Z][a-z]*_[a-z_]+/g
};

const DIRECTORIES_TO_SEARCH = [
  'src/',
  'prisma/',
  'scripts/'
];

const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.prisma'];

const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  'coverage',
  'dist',
  'dist/service/daemon',
  'dist/service/lib',
  'dist/service/service'
];

// Tokens and files to ignore (third-party libraries, SQL system identifiers, and tool scripts)
const IGNORE_TOKENS = new Set([
  'information_schema',
  'pg_terminate_backend',
  'pg_backend_pid',
  'to_regclass',
  'XLSX',
  'XLSX.utils'
]);

// Additional function names and tokens from 3rd-party libs and env vars we should ignore
const ADDITIONAL_IGNORES = [
  'book_new',
  'aoa_to_sheet',
  'decode_range',
  'encode_cell',
  'book_append_sheet',
  'sheet_to_csv',
  'sheet_to_json',
  'npm_package_version',
  'id_format_templates'
];

ADDITIONAL_IGNORES.forEach(t => IGNORE_TOKENS.add(t));

const IGNORE_FILES = [
  'scripts/fix-prisma-snake-case.js'
];

class PrismaSnakeCaseFinder {
  constructor() {
    this.results = [];
    this.fileCount = 0;
    this.issueCount = 0;
  }

  /**
   * Check if file should be excluded
   */
  shouldExclude(filePath) {
    if (EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern))) return true;
    // Exclude the fixer script itself and any explicit ignore files
    if (IGNORE_FILES.some(f => filePath.includes(f))) return true;
    return false;
  }

  /**
   * Check if file has valid extension
   */
  hasValidExtension(filePath) {
    return FILE_EXTENSIONS.some(ext => filePath.endsWith(ext));
  }

  /**
   * Convert snake_case to singular camelCase (following User model pattern)
   */
  toCamelCase(str) {
    // Convert to camelCase first
    let camelCase = str.replace(/_./g, (match) => match.charAt(1).toUpperCase());
    
    // Convert to singular form (remove common plural endings)
    if (camelCase.endsWith('ies')) {
      camelCase = camelCase.slice(0, -3) + 'y';
    } else if (camelCase.endsWith('es') && camelCase.length > 3) {
      // Check for special cases like "boxes" -> "box", "classes" -> "class"
      const withoutEs = camelCase.slice(0, -2);
      if (withoutEs.endsWith('x') || withoutEs.endsWith('s') || withoutEs.endsWith('sh') || withoutEs.endsWith('ch')) {
        camelCase = withoutEs;
      } else {
        camelCase = camelCase.slice(0, -1); // Just remove 's'
      }
    } else if (camelCase.endsWith('s') && camelCase.length > 2) {
      // Simple case: remove trailing 's'
      camelCase = camelCase.slice(0, -1);
    }
    
    return camelCase;
  }

  /**
   * Convert snake_case to singular PascalCase (following User model pattern)
   */
  toPascalCase(str) {
    // Convert to PascalCase first
    let pascalCase = str.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    
    // Convert to singular form (remove common plural endings)
    if (pascalCase.endsWith('ies')) {
      pascalCase = pascalCase.slice(0, -3) + 'y';
    } else if (pascalCase.endsWith('es') && pascalCase.length > 3) {
      // Check for special cases like "boxes" -> "box", "classes" -> "class"
      const withoutEs = pascalCase.slice(0, -2);
      if (withoutEs.endsWith('x') || withoutEs.endsWith('s') || withoutEs.endsWith('sh') || withoutEs.endsWith('ch')) {
        pascalCase = withoutEs;
      } else {
        pascalCase = pascalCase.slice(0, -1); // Just remove 's'
      }
    } else if (pascalCase.endsWith('s') && pascalCase.length > 2) {
      // Simple case: remove trailing 's'
      pascalCase = pascalCase.slice(0, -1);
    }
    
    return pascalCase;
  }

  /**
   * Search for patterns in file content
   */
  searchInFile(filePath, content) {
    const lines = content.split('\n');
    const fileResults = [];

    lines.forEach((line, lineIndex) => {
      const lineNumber = lineIndex + 1;

      // Search for each pattern
      Object.entries(SEARCH_PATTERNS).forEach(([patternName, regex]) => {
        let match;
        const globalRegex = new RegExp(regex.source, 'g');
        
        while ((match = globalRegex.exec(line)) !== null) {
          const snakeCaseText = match[0];
          const cleanText = snakeCaseText.replace(/^\.|\s*:|\s*\{|\s*\(|\s*\./g, '').trim();
          
          // Skip if it's not actually snake_case or is a valid exception or in global ignore tokens
          if (!cleanText.includes('_') || this.isValidException(cleanText) || IGNORE_TOKENS.has(cleanText)) {
            continue;
          }

          let suggestion = '';
          if (patternName === 'modelNames' || patternName === 'typeReferences') {
            suggestion = this.toPascalCase(cleanText);
          } else {
            suggestion = this.toCamelCase(cleanText);
          }

          fileResults.push({
            line: lineNumber,
            column: match.index + 1,
            pattern: patternName,
            found: snakeCaseText,
            context: line.trim(),
            suggestion: suggestion,
            severity: this.getSeverity(patternName, filePath)
          });

          this.issueCount++;
        }
      });
    });

    return fileResults;
  }

  /**
   * Check if the snake_case usage is a valid exception
   */
  isValidException(text) {
    const exceptions = [
      // Database column names that might be intentionally snake_case
      'created_at',
      'updated_at',
      'deleted_at',
      // Environment variables
      'NODE_ENV',
      'DATABASE_URL',
      // SQL reserved words or technical terms
      'primary_key',
      'foreign_key',
      // Migration-specific terms
      'migration_lock',
      // Constants that are intentionally snake_case
      '__param_type__',
      '__tag__',
      '__param_position__'
    ];

    return exceptions.includes(text.toLowerCase()) || 
           text.startsWith('__') || // Double underscore prefixed (often technical)
           text.toUpperCase() === text; // ALL_CAPS constants
  }

  /**
   * Get severity based on pattern type and file location
   */
  getSeverity(patternName, filePath) {
    if (filePath.includes('.prisma')) {
      return 'HIGH'; // Schema file issues are critical
    }
    
    if (patternName === 'prismaQueries' || patternName === 'modelNames') {
      return 'HIGH'; // Direct Prisma usage issues
    }
    
    if (filePath.includes('/api/')) {
      return 'MEDIUM'; // API routes are important
    }
    
    return 'LOW';
  }

  /**
   * Recursively search directory
   */
  async searchDirectory(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (this.shouldExclude(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.searchDirectory(fullPath);
        } else if (entry.isFile() && this.hasValidExtension(fullPath)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const results = this.searchInFile(fullPath, content);
            
            if (results.length > 0) {
              this.results.push({
                file: fullPath,
                issues: results
              });
            }
            
            this.fileCount++;
          } catch (error) {
            console.warn(`⚠️  Could not read file ${fullPath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Generate report
   */
  generateReport() {
    console.log('🔍 Prisma Snake Case Analysis Report');
    console.log('=' .repeat(50));
    console.log(`📁 Files scanned: ${this.fileCount}`);
    console.log(`🐍 Snake case issues found: ${this.issueCount}`);
    console.log(`📄 Files with issues: ${this.results.length}`);
    console.log('');

    if (this.results.length === 0) {
      console.log('✅ No snake_case issues found in Prisma-related code!');
      return;
    }

    // Group by severity
    const bySeverity = {
      HIGH: [],
      MEDIUM: [],
      LOW: []
    };

    this.results.forEach(fileResult => {
      fileResult.issues.forEach(issue => {
        bySeverity[issue.severity].push({
          file: fileResult.file,
          ...issue
        });
      });
    });

    // Report high priority issues first
    Object.entries(bySeverity).forEach(([severity, issues]) => {
      if (issues.length === 0) return;

      console.log(`\n${'🚨'.repeat(severity === 'HIGH' ? 3 : severity === 'MEDIUM' ? 2 : 1)} ${severity} PRIORITY (${issues.length} issues)`);
      console.log('-'.repeat(30));

      issues.forEach(issue => {
        const relativePath = path.relative(process.cwd(), issue.file);
        console.log(`\n📄 ${relativePath}:${issue.line}:${issue.column}`);
        console.log(`   Pattern: ${issue.pattern}`);
        console.log(`   Found: "${issue.found}"`);
        console.log(`   Context: ${issue.context}`);
        console.log(`   💡 Suggest: "${issue.suggestion}"`);
      });
    });

    // Summary by file type
    console.log('\n📊 SUMMARY BY FILE TYPE');
    console.log('-'.repeat(30));
    const byFileType = {};
    this.results.forEach(fileResult => {
      const ext = path.extname(fileResult.file);
      if (!byFileType[ext]) byFileType[ext] = 0;
      byFileType[ext] += fileResult.issues.length;
    });

    Object.entries(byFileType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([ext, count]) => {
        console.log(`${ext || 'no extension'}: ${count} issues`);
      });

    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('1. Fix HIGH priority issues first (schema and direct Prisma queries)');
    console.log('2. Update model names to PascalCase');
    console.log('3. Update field/attribute names to camelCase');
    console.log('4. Run `npx prisma generate` after schema changes');
    console.log('5. Test thoroughly after changes');
  }

  /**
   * Run the analysis
   */
  async run() {
    console.log('🔍 Searching for snake_case usage in Prisma-related code...');
    console.log('');

    for (const dir of DIRECTORIES_TO_SEARCH) {
      if (fs.existsSync(dir)) {
        console.log(`📁 Scanning ${dir}...`);
        await this.searchDirectory(dir);
      }
    }

    this.generateReport();
  }
}

// Run the script
if (require.main === module) {
  const finder = new PrismaSnakeCaseFinder();
  finder.run().catch(console.error);
}

module.exports = PrismaSnakeCaseFinder;