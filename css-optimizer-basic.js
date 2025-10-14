import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import safeParser from 'postcss-safe-parser';
import sortMediaQueries from 'postcss-sort-media-queries';
import autoprefixer from 'autoprefixer';
import prettier from 'prettier';
import stylelint from 'stylelint';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
    INPUT_PATH: path.resolve(__dirname, 'style.css'),
    OUTPUT_PATH: path.resolve(__dirname, 'style.optimized.css'),
    BACKUP_PATH: path.resolve(__dirname, 'style.backup.css'),
};

console.log('🚀 Ultimate CSS Optimizer');
console.log('=========================\n');

const startTime = performance.now();

try {
    // Backup original file
    await fs.copy(CONFIG.INPUT_PATH, CONFIG.BACKUP_PATH);
    console.log('💾 Backup created');

    // Read CSS
    console.log('📖 Reading CSS file...');
    let css = await fs.readFile(CONFIG.INPUT_PATH, 'utf8');
    const originalSize = Buffer.byteLength(css, 'utf8');

    // Apply basic fixes
    console.log('🔧 Applying fixes...');
    css = css.replace(/word-break\s*:\s*break-word\b/g, 'overflow-wrap: break-word');
    css = css.replace(/\b(\d+)xp\b/g, '$1px');
    css = css.replace(/\balign-items\s*:\s*anchor-center\b/g, 'align-items: center');

    // Add units to unitless values
    const unitlessRegex = /(padding|margin|top|bottom|left|right|width|height|min-width|max-width|min-height|max-height|font-size|border-radius|text-indent|letter-spacing|word-spacing|gap|column-gap|row-gap)\s*:\s*(\b(?!0\b)\d+)(?=\s*(;|\}|$))/g;
    css = css.replace(unitlessRegex, '$1: $2px');

    // Process with PostCSS
    console.log('🔄 Processing with PostCSS...');
    const plugins = [
        sortMediaQueries({ sort: 'desktop-first' }),
        autoprefixer({
            overrideBrowserslist: ['> 1%', 'last 2 versions', 'not dead'],
            grid: 'autoplace'
        })
    ];

    const result = await postcss(plugins).process(css, {
        from: CONFIG.INPUT_PATH,
        to: CONFIG.OUTPUT_PATH,
        parser: safeParser
    });

    // Format with Prettier
    console.log('💅 Formatting with Prettier...');
    const formatted = await prettier.format(result.css, {
        parser: 'css',
        tabWidth: 2,
        useTabs: false,
        printWidth: 100,
        endOfLine: 'lf'
    });

    // Write output
    await fs.writeFile(CONFIG.OUTPUT_PATH, formatted);

    // Show results
    const endTime = performance.now();
    const finalSize = Buffer.byteLength(formatted, 'utf8');

    console.log('\n🎉 Optimization completed!');
    console.log(`📁 Output: ${path.basename(CONFIG.OUTPUT_PATH)}`);
    console.log(`⏱️  Time: ${((endTime - startTime) / 1000).toFixed(2)}s`);
    console.log(`💾 Size: ${(originalSize / 1024).toFixed(2)} KB → ${(finalSize / 1024).toFixed(2)} KB`);

    const compression = ((originalSize - finalSize) / originalSize) * 100;
    if (compression > 0) {
        console.log(`🗜️  Compressed: ${compression.toFixed(1)}%`);
    } else {
        console.log(`📈 Formatted (${Math.abs(compression).toFixed(1)}% larger due to formatting)`);
    }

} catch (error) {
    console.error('❌ Error:', error.message);
    if (error.line) console.error(`   Line: ${error.line}`);
    process.exit(1);
}
