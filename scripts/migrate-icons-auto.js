#!/usr/bin/env node

/**
 * Automated Icon Migration Script
 * Migrates Lucide icons to SF Symbols across all files
 * Skips already migrated files in tools directory
 */

const fs = require('fs');
const path = require('path');

// Icon mapping from Lucide to SF Symbols
const ICON_MAPPINGS = {
  'Plus': 'plus',
  'Minus': 'minus',
  'X': 'x',
  'Check': 'check',
  'Shuffle': 'shuffle',
  'Dice6': 'dice6',
  'Trophy': 'trophy',
  'Users': 'users',
  'RotateCcw': 'rotateccw',
  'Pen': 'pen',
  'ListFilter': 'listfilter',
  'Camera': 'camera',
  'Clock': 'clock',
  'ChevronDown': 'chevron-down',
  'ChevronUp': 'chevron-up',
  'ChevronRight': 'chevron-right',
  'ChevronLeft': 'chevron-left',
  'Calendar': 'calendar',
  'Star': 'star',
  'Baby': 'baby',
  'Brain': 'brain',
  'Loader2': 'loader2',
  'ArrowLeft': 'arrow-left',
  'Upload': 'upload',
  'UserPlus': 'user-plus',
  'Share2': 'share2',
  'Trash2': 'trash2',
  'MapPin': 'mappin',
  'Copy': 'copy',
  'BarChart3': 'barchart3',
  'Edit': 'edit',
  'Medal': 'medal',
  'Award': 'award',
  'Search': 'search',
  'Info': 'info',
  'CheckCircle': 'checkcircle',
  'SmilePlus': 'smileplus',
  'Smile': 'smile',
  'Laugh': 'laugh',
  'HelpCircle': 'helpcircle',
  'ThumbsDown': 'thumbsdown',
  'ThumbsUp': 'thumbsup',
  'Heart': 'heart',
  'Link': 'link',
  'Settings': 'settings',
  'Library': 'library',
  'User': 'user',
  'Vote': 'vote',
  'Wrench': 'wrench',
  'LogOut': 'logout',
  'CreditCard': 'creditcard',
  'ExternalLink': 'external-link',
  'Mail': 'mail',
  'LogIn': 'login',
  'RefreshCw': 'refresh',
  'Filter': 'filter',
  'CheckSquare': 'check-square',
  'Meh': 'meh',
  'AlertTriangle': 'alert-triangle',
  'SquarePen': 'square-pen',
  'Shield': 'shield',
  'CircleAlert': 'circle-alert'
};

// Files to skip (none - we want to migrate all files)
const SKIP_FILES = [];

// Directories to scan
const SCAN_DIRS = [
  path.join(__dirname, '..', 'app'),
  path.join(__dirname, '..', 'components')
];

function shouldSkipFile(filePath) {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  return SKIP_FILES.some(skipFile => relativePath.includes(skipFile));
}

function migrateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let changesMade = 0;

    // Check if file already uses SFSymbolIcon (but still process it to ensure consistency)
    if (content.includes('SFSymbolIcon')) {
      console.log(`🔄 Processing ${filePath} - already has SFSymbolIcon, ensuring consistency`);
    }

    // Check if file has Lucide imports
    const lucideImportMatch = content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react-native['"]/);
    if (!lucideImportMatch) {
      console.log(`⏭️  Skipping ${filePath} - no Lucide imports`);
      return { success: true, changes: 0, reason: 'no-lucide-imports' };
    }

    // Extract imported icons
    const importedIcons = lucideImportMatch[1]
      .split(',')
      .map(icon => icon.trim())
      .filter(icon => ICON_MAPPINGS[icon]);

    if (importedIcons.length === 0) {
      console.log(`⏭️  Skipping ${filePath} - no mappable icons`);
      return { success: true, changes: 0, reason: 'no-mappable-icons' };
    }

    // Replace import statement
    newContent = newContent.replace(
      /import\s*{\s*[^}]+\s*}\s*from\s*['"]lucide-react-native['"]/,
      "import SFSymbolIcon from '@/components/SFSymbolIcon';"
    );

    // Replace icon usages
    importedIcons.forEach(iconName => {
      const sfSymbolName = ICON_MAPPINGS[iconName];
      
      // Pattern for icon usage: <IconName ... />
      const iconPattern = new RegExp(`<${iconName}\\s+([^>]*?)\\s*/>`, 'g');
      
      newContent = newContent.replace(iconPattern, (match, props) => {
        changesMade++;
        
        // Extract props
        const propsMatch = props.match(/(\w+)=["']([^"']*)["']/g);
        let extractedProps = {};
        
        if (propsMatch) {
          propsMatch.forEach(prop => {
            const [key, value] = prop.split('=');
            extractedProps[key] = value.replace(/['"]/g, '');
          });
        }
        
        // Build new SFSymbolIcon props
        const newProps = Object.entries(extractedProps)
          .map(([key, value]) => `${key}="${value}"`)
          .join(' ');
        
        return `<SFSymbolIcon name="${sfSymbolName}" ${newProps} />`;
      });
    });

    // Write the updated content
    if (changesMade > 0) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Migrated ${filePath} - ${changesMade} changes`);
      return { success: true, changes: changesMade };
    } else {
      console.log(`⏭️  Skipping ${filePath} - no changes needed`);
      return { success: true, changes: 0, reason: 'no-changes' };
    }

  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error.message);
    return { success: false, error: error.message };
  }
}

function findAndMigrateFiles() {
  console.log('🚀 Starting automated icon migration...\n');
  
  const results = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    details: []
  };

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !file.includes('SFSymbolIcon')) {
        results.total++;
        
        if (shouldSkipFile(filePath)) {
          results.skipped++;
          results.details.push({ file: filePath, status: 'skipped', reason: 'already-migrated' });
          return;
        }

        const result = migrateFile(filePath);
        results.details.push({ file: filePath, ...result });

        if (result.success) {
          if (result.changes > 0) {
            results.migrated++;
          } else {
            results.skipped++;
          }
        } else {
          results.errors++;
        }
      }
    });
  }

  // Scan all directories
  SCAN_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      scanDirectory(dir);
    }
  });

  // Print summary
  console.log('\n📊 Migration Summary:');
  console.log(`Total files processed: ${results.total}`);
  console.log(`Files migrated: ${results.migrated}`);
  console.log(`Files skipped: ${results.skipped}`);
  console.log(`Errors: ${results.errors}`);

  // Print detailed results
  if (results.details.length > 0) {
    console.log('\n📋 Detailed Results:');
    results.details.forEach(detail => {
      const status = detail.success ? (detail.changes > 0 ? '✅' : '⏭️') : '❌';
      const reason = detail.reason ? ` (${detail.reason})` : '';
      console.log(`${status} ${detail.file}${reason}`);
    });
  }

  return results;
}

// Run the migration
if (require.main === module) {
  const results = findAndMigrateFiles();
  
  if (results.errors > 0) {
    console.log('\n⚠️  Some files had errors. Please check the output above.');
    process.exit(1);
  } else {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  }
}

module.exports = { findAndMigrateFiles, migrateFile };
