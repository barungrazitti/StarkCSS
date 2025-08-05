import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import safeParser from 'postcss-safe-parser';
import sortMediaQueries from 'postcss-sort-media-queries';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import prettier from 'prettier';
import stylelint from 'stylelint';
import { performance } from 'perf_hooks';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - Enhanced with .env support
const CONFIG = {
    INPUT_PATH: path.resolve(__dirname, process.env.CSS_INPUT_FILE || 'style.css'),
    OUTPUT_PATH: path.resolve(__dirname, process.env.CSS_OUTPUT_FILE || 'style.optimized.css'),
    BACKUP_PATH: path.resolve(__dirname, process.env.CSS_BACKUP_FILE || 'style.backup.css'),

    // Processing options
    ENABLE_AUTOPREFIXER: process.env.ENABLE_AUTOPREFIXER !== 'false',
    ENABLE_MINIFICATION: process.env.ENABLE_MINIFICATION === 'true',
    ENABLE_SOURCE_MAPS: process.env.ENABLE_SOURCE_MAPS === 'true',

    // Browser support
    BROWSERS: process.env.BROWSERS ? process.env.BROWSERS.split(',').map(b => b.trim()) : ['> 1%', 'last 2 versions', 'not dead'],

    // File size limits
    MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10'),
    WARN_SIZE_MB: parseInt(process.env.WARN_SIZE_MB || '5'),

    // Groq AI Configuration
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    GROQ_API_URL: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
    GROQ_MODEL: process.env.GROQ_MODEL || 'llama3-70b-8192',
    ENABLE_AI_FIXES: process.env.ENABLE_AI_FIXES !== 'false',

    // AI Processing limits
    AI_MAX_ERRORS_TO_PROCESS: parseInt(process.env.AI_MAX_ERRORS_TO_PROCESS || '5'),
    AI_MAX_TOKENS_PER_REQUEST: parseInt(process.env.AI_MAX_TOKENS_PER_REQUEST || '1000'),
    AI_TEMPERATURE: parseFloat(process.env.AI_TEMPERATURE || '0.1'),
    AI_TOP_P: parseFloat(process.env.AI_TOP_P || '1.0'),
    AI_MAX_RETRIES: parseInt(process.env.AI_MAX_RETRIES || '3'),
    AI_RETRY_DELAY_MS: parseInt(process.env.AI_RETRY_DELAY_MS || '1000'),

    // Prettier settings
    PRETTIER_TAB_WIDTH: parseInt(process.env.PRETTIER_TAB_WIDTH || '2'),
    PRETTIER_USE_TABS: process.env.PRETTIER_USE_TABS === 'true',
    PRETTIER_PRINT_WIDTH: parseInt(process.env.PRETTIER_PRINT_WIDTH || '100'),
    PRETTIER_END_OF_LINE: process.env.PRETTIER_END_OF_LINE || 'lf',
    PRETTIER_SEMI: process.env.PRETTIER_SEMI !== 'false',
    PRETTIER_SINGLE_QUOTE: process.env.PRETTIER_SINGLE_QUOTE === 'true',

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    ENABLE_VERBOSE_LOGGING: process.env.ENABLE_VERBOSE_LOGGING === 'true',
    ENABLE_PERFORMANCE_TIMING: process.env.ENABLE_PERFORMANCE_TIMING !== 'false',
};

/**
 * Validate configuration and show helpful messages
 */
function validateConfig() {
    const issues = [];

    if (CONFIG.ENABLE_AI_FIXES && !CONFIG.GROQ_API_KEY) {
        issues.push('⚠️ AI fixes enabled but GROQ_API_KEY not set');
        issues.push('   Get your free API key: https://console.groq.com/');
        issues.push('   Set it in .env file: GROQ_API_KEY=your_key_here');
    }

    if (CONFIG.MAX_FILE_SIZE_MB < 1) {
        issues.push('⚠️ MAX_FILE_SIZE_MB should be at least 1MB');
    }

    if (CONFIG.AI_MAX_ERRORS_TO_PROCESS > 10) {
        issues.push('⚠️ AI_MAX_ERRORS_TO_PROCESS > 10 may result in high API costs');
    }

    if (issues.length > 0) {
        console.log('🔧 Configuration Notes:');
        issues.forEach(issue => console.log(`   ${issue}`));
        console.log('');
    }

    if (CONFIG.ENABLE_VERBOSE_LOGGING) {
        console.log('📋 Current Configuration:');
        console.log(`   Input: ${path.basename(CONFIG.INPUT_PATH)}`);
        console.log(`   Output: ${path.basename(CONFIG.OUTPUT_PATH)}`);
        console.log(`   AI Fixes: ${CONFIG.ENABLE_AI_FIXES ? '✅' : '❌'}`);
        console.log(`   Autoprefixer: ${CONFIG.ENABLE_AUTOPREFIXER ? '✅' : '❌'}`);
        console.log(`   Minification: ${CONFIG.ENABLE_MINIFICATION ? '✅' : '❌'}`);
        console.log('');
    }
}/**
 * Enhanced linting and fixing CSS using Stylelint
 */
async function lintAndFixCss(cssCode, filePath) {
    try {
        console.log('🔍 Running Stylelint analysis...');

        const result = await stylelint.lint({
            code: cssCode,
            codeFilename: filePath,
            fix: true,
            configFile: path.join(__dirname, '.stylelintrc.json'),
        });

        const [firstResult] = result.results;
        const fixedCss = firstResult?.output ?? cssCode;
        let remainingErrors = [];

        if (firstResult?.warnings?.length > 0) {
            const errors = firstResult.warnings.filter(w => w.severity === 'error');
            const warnings = firstResult.warnings.filter(w => w.severity === 'warning');

            if (errors.length > 0) {
                console.error(`❌ ${errors.length} critical errors found:`);
                errors.slice(0, 10).forEach(err => {
                    console.error(`   Line ${err.line}: ${err.rule} — ${err.text}`);
                });
                if (errors.length > 10) {
                    console.error(`   ... and ${errors.length - 10} more errors`);
                }
                remainingErrors = errors; // Store for AI processing
            }

            if (warnings.length > 0) {
                console.warn(`⚠️ ${warnings.length} warnings found (showing first 5):`);
                warnings.slice(0, 5).forEach(warn => {
                    console.warn(`   Line ${warn.line}: ${warn.rule} — ${warn.text}`);
                });
                if (warnings.length > 5) {
                    console.warn(`   ... and ${warnings.length - 5} more warnings`);
                }
            }
        } else {
            console.log('✅ No linting issues found');
        }

        return { fixedCss, errors: remainingErrors };
    } catch (error) {
        console.error('❌ Stylelint error:', error.message);
        return { fixedCss: cssCode, errors: [] };
    }
}

/**
 * Enhanced additional fixes that Stylelint doesn't handle automatically
 * (Comprehensive approach - target specific error patterns)
 */
function applyAdditionalFixes(cssCode) {
    console.log('🔧 Applying advanced CSS fixes...');
    let fixed = cssCode;
    let fixCount = 0;

    // 1. Fix: `word-break: break-word` → `overflow-wrap: break-word`
    const wordBreakMatches = fixed.match(/word-break\s*:\s*break-word\b/g);
    if (wordBreakMatches) {
        fixed = fixed.replace(/word-break\s*:\s*break-word\b/g, 'overflow-wrap: break-word');
        fixCount += wordBreakMatches.length;
        console.log(`   ✓ Fixed ${wordBreakMatches.length} deprecated word-break declarations`);
    }

    // 2. Fix common typos: `36xp` → `36px`, `0xp` → `0px`
    const typoMatches = fixed.match(/\b(\d+)xp\b/g);
    if (typoMatches) {
        fixed = fixed.replace(/\b(\d+)xp\b/g, '$1px');
        fixCount += typoMatches.length;
        console.log(`   ✓ Fixed ${typoMatches.length} 'xp' typos`);
    }

    // 3. Fix unitless values for properties that require units
    const unitlessRegex = /(padding-top|padding-bottom|padding-left|padding-right|margin-top|margin-bottom|margin-left|margin-right|font-size|border-radius)\s*:\s*(\b(?!0\b|auto\b|inherit\b|initial\b|unset\b)\d+)(?=\s*(;|\n|\}|$))/g;
    const unitlessMatches = [...fixed.matchAll(unitlessRegex)];
    if (unitlessMatches.length > 0 && unitlessMatches.length < 100) { // Safety limit
        fixed = fixed.replace(unitlessRegex, '$1: $2px');
        fixCount += unitlessMatches.length;
        console.log(`   ✓ Added units to ${unitlessMatches.length} numeric values`);
    }

    // 4. Fix invalid flex/grid values
    const invalidFlexMatches = fixed.match(/\balign-items\s*:\s*anchor-center\b/g);
    if (invalidFlexMatches) {
        fixed = fixed.replace(/\balign-items\s*:\s*anchor-center\b/g, 'align-items: center');
        fixCount += invalidFlexMatches.length;
        console.log(`   ✓ Fixed ${invalidFlexMatches.length} invalid align-items values`);
    }

    // 5. Fix shorthand property overrides - CRITICAL FIX
    // This is a sophisticated fix that looks within CSS rule blocks
    let backgroundFixCount = 0;
    let borderFixCount = 0;

    // Fix background shorthand after background-color within the same rule block
    const ruleBlockPattern = /([^{}]*\{[^{}]*background-color[^{}]*background[^{}]*\})/g;
    const ruleBlocks = [...fixed.matchAll(ruleBlockPattern)];

    for (const [fullMatch] of ruleBlocks) {
        // Within each rule block, swap background-color and background
        const withinBlockPattern = /(background-color\s*:[^;]+;)(\s*[^{}]*?)(background\s*:[^;]+;)/;
        if (withinBlockPattern.test(fullMatch)) {
            const newBlock = fullMatch.replace(withinBlockPattern, '$3$2$1');
            fixed = fixed.replace(fullMatch, newBlock);
            backgroundFixCount++;
        }
    }

    // Fix border shorthand after border-color within the same rule block
    const borderRuleBlockPattern = /([^{}]*\{[^{}]*border-color[^{}]*border[^{}]*\})/g;
    const borderRuleBlocks = [...fixed.matchAll(borderRuleBlockPattern)];

    for (const [fullMatch] of borderRuleBlocks) {
        // Within each rule block, swap border-color and border
        const withinBorderBlockPattern = /(border-color\s*:[^;]+;)(\s*[^{}]*?)(border\s*:[^;]+;)/;
        if (withinBorderBlockPattern.test(fullMatch)) {
            const newBlock = fullMatch.replace(withinBorderBlockPattern, '$3$2$1');
            fixed = fixed.replace(fullMatch, newBlock);
            borderFixCount++;
        }
    }

    if (backgroundFixCount > 0) {
        console.log(`   ✓ Reordered ${backgroundFixCount} background property declarations`);
        fixCount += backgroundFixCount;
    }

    if (borderFixCount > 0) {
        console.log(`   ✓ Reordered ${borderFixCount} border property declarations`);
        fixCount += borderFixCount;
    }

    // 6. Fix malformed pseudo-elements and selectors
    const simplePseudoMatches = fixed.match(/::\s*;/g);
    if (simplePseudoMatches && simplePseudoMatches.length < 10) {
        fixed = fixed.replace(/::\s*;/g, ';');
        fixCount += simplePseudoMatches.length;
        console.log(`   ✓ Removed ${simplePseudoMatches.length} malformed pseudo-elements`);
    }

    // 7. Advanced cleanup and validation
    // Remove duplicate semicolons
    const duplicateSemicolons = fixed.match(/;\s*;/g);
    if (duplicateSemicolons) {
        fixed = fixed.replace(/;\s*;/g, ';');
        console.log(`   ✓ Removed ${duplicateSemicolons.length} duplicate semicolons`);
    }

    // Remove multiple empty lines
    fixed = fixed.replace(/\n\s*\n\s*\n/g, '\n\n');

    // 8. Report summary
    if (fixCount > 0) {
        console.log(`   🎉 Applied ${fixCount} total structural fixes`);
        console.log(`   📋 Breakdown: Background (${backgroundFixCount}), Border (${borderFixCount}), Other (${fixCount - backgroundFixCount - borderFixCount})`);
    } else {
        console.log('   ✅ No additional fixes needed');
    }

    return fixed;
}

/**
 * AI-powered CSS fix using Groq API
 * Handles complex structural issues that regex cannot solve
 */
async function applyAIFixes(cssCode, errors) {
    if (!CONFIG.ENABLE_AI_FIXES || !CONFIG.GROQ_API_KEY) {
        console.log('⚠️ AI fixes disabled or API key not set');
        return cssCode;
    }

    console.log('🤖 Applying AI-powered CSS fixes...');

    try {
        // Extract problematic CSS sections around error lines
        const cssLines = cssCode.split('\n');
        const problemSections = [];

        for (const error of errors.slice(0, CONFIG.AI_MAX_ERRORS_TO_PROCESS)) { // Process configurable number of errors
            const lineNum = error.line - 1; // Convert to 0-based index
            const startLine = Math.max(0, lineNum - 3); // Reduced context
            const endLine = Math.min(cssLines.length, lineNum + 5); // Reduced context

            const contextLines = cssLines.slice(startLine, endLine);
            const context = contextLines.join('\n');

            // Skip if context is too large (> 500 chars)
            if (context.length > 500) {
                console.log(`   ⚠️ Skipping ${error.rule} - context too large (${context.length} chars)`);
                continue;
            }

            const section = {
                error: error,
                context: context,
                startLine: startLine + 1,
                endLine: endLine
            };
            problemSections.push(section);
        }

        let fixedCode = cssCode;
        let aiFixCount = 0;
        const aiFixedIssues = new Map(); // Track types of issues fixed

        for (const section of problemSections) {
            try {
                const fixedSection = await fixWithGroq(section);
                if (fixedSection && fixedSection !== section.context) {
                    // Replace the problematic section with the fixed version
                    fixedCode = fixedCode.replace(section.context, fixedSection);
                    aiFixCount++;

                    // Track the type of issue fixed
                    const issueType = section.error.rule;
                    aiFixedIssues.set(issueType, (aiFixedIssues.get(issueType) || 0) + 1);

                    // Show actual before/after changes
                    console.log(`   ✓ AI fixed ${section.error.rule} at line ${section.error.line}`);
                    console.log(`     � Before: ${section.context.replace(/\s+/g, ' ').trim().substring(0, 80)}...`);
                    console.log(`     � After:  ${fixedSection.replace(/\s+/g, ' ').trim().substring(0, 80)}...`);
                } else {
                    console.log(`   ⚠️ AI couldn't fix ${section.error.rule} at line ${section.error.line}`);
                }
            } catch (error) {
                console.log(`   ❌ AI fix failed for ${section.error.rule} at line ${section.error.line}: ${error.message}`);
                // Continue processing other errors
            }
        }

        if (aiFixCount > 0) {
            console.log(`   🎉 AI applied ${aiFixCount} complex fixes`);
        } else {
            console.log('   ℹ️ No AI fixes applied');
        }

        return fixedCode;
    } catch (error) {
        console.log(`⚠️ AI fixes failed: ${error.message}`);

        // Check if it's a service unavailable error
        if (error.message.includes('503') || error.message.includes('Service unavailable')) {
            console.log('   💡 Groq API is temporarily unavailable. Visit https://groqstatus.com/ for status updates.');
            console.log('   🔄 CSS optimization will continue with regex-based fixes only.');
        } else if (error.message.includes('401')) {
            console.log('   🔑 Check your GROQ_API_KEY in the .env file.');
        } else if (error.message.includes('400')) {
            console.log('   ⚙️ API request format issue. This might be due to model name or parameters.');
        }

        return cssCode;
    }
}

/**
 * Send CSS section to Groq API for fixing
 */
async function fixWithGroq(section) {
    const prompt = `You are a CSS expert. Fix this CSS code that has the following error:

ERROR: ${section.error.rule} - ${section.error.text}
LINE: ${section.error.line}

CSS CODE TO FIX:
\`\`\`css
${section.context}
\`\`\`

INSTRUCTIONS:
1. Fix ONLY the specific error mentioned above
2. Keep all other CSS unchanged
3. Maintain proper formatting and structure
4. For shorthand property overrides: move shorthand properties BEFORE their longhand equivalents
5. For deprecated values: replace with modern equivalents
6. For unknown values: replace with valid CSS values
7. Return ONLY the fixed CSS code, no explanations

FIXED CSS:`;

    const requestBody = {
        model: CONFIG.GROQ_MODEL,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: CONFIG.AI_TEMPERATURE,
        max_tokens: CONFIG.AI_MAX_TOKENS_PER_REQUEST,
        stream: false
    };

    try {
        const response = await fetch(CONFIG.GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`🚨 Groq API Error Details:`);
            console.log(`   Status: ${response.status} ${response.statusText}`);
            console.log(`   Response: ${errorText}`);
            throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const fixedCss = data.choices[0]?.message?.content?.trim();

        if (fixedCss) {
            // Extract CSS from markdown code blocks if present
            const cssMatch = fixedCss.match(/```css\n([\s\S]*?)\n```/) || fixedCss.match(/```\n([\s\S]*?)\n```/);
            return cssMatch ? cssMatch[1].trim() : fixedCss;
        }

        return null;

    } catch (error) {
        // Provide specific error context for debugging
        if (error.name === 'AbortError') {
            console.log(`   ⏱️ Request timed out after 10 seconds`);
        } else if (error.message.includes('503')) {
            console.log(`   🚫 Groq service temporarily unavailable`);
        } else if (error.message.includes('fetch')) {
            console.log(`   🌐 Network connectivity issue`);
        }

        throw error;
    }
}

/**
 * Enhanced optimization function
 */
async function optimizeCss(inputPath, outputPath, options = {}) {
    const startTime = performance.now();

    try {
        console.log('🚀 Starting Ultimate CSS Optimizer (Advanced)...\n');

        // Validate configuration
        validateConfig();

        // Validate input file
        if (!(await fs.pathExists(inputPath))) {
            throw new Error(`Input file not found: ${inputPath}`);
        }

        const stats = await fs.stat(inputPath);
        const sizeInMB = stats.size / (1024 * 1024);

        if (sizeInMB > CONFIG.MAX_FILE_SIZE_MB) {
            throw new Error(`File too large: ${sizeInMB.toFixed(2)}MB (max: ${CONFIG.MAX_FILE_SIZE_MB}MB)`);
        }

        if (sizeInMB > CONFIG.WARN_SIZE_MB) {
            console.warn(`⚠️ Large file detected: ${sizeInMB.toFixed(2)}MB - processing may take longer`);
        }

        // Create backup
        if (options.createBackup !== false) {
            await fs.copy(inputPath, CONFIG.BACKUP_PATH);
            console.log(`💾 Backup created: ${path.basename(CONFIG.BACKUP_PATH)}`);
        }

        console.log('📖 Reading CSS file...');
        let css = await fs.readFile(inputPath, 'utf8');

        if (!css.trim()) {
            throw new Error('CSS file is empty');
        }

        const originalCss = css;
        const originalLines = css.split('\n').length;

        // Step 1: Lint and fix with Stylelint
        const lintResult = await lintAndFixCss(css, inputPath);
        css = lintResult.fixedCss;
        const remainingErrors = lintResult.errors;

        // Step 2: Apply additional custom fixes
        css = applyAdditionalFixes(css);

        // Step 3: Apply AI-powered fixes for complex issues
        if (remainingErrors.length > 0 && CONFIG.ENABLE_AI_FIXES) {
            css = await applyAIFixes(css, remainingErrors);
        }

        // Step 4: Process with PostCSS (progressive approach)
        console.log('🔄 Processing with PostCSS plugins...');

        let postcssResult;
        try {
            // Try with full plugins first
            const plugins = [];

            if (CONFIG.ENABLE_AUTOPREFIXER) {
                plugins.push(autoprefixer({
                    overrideBrowserslist: CONFIG.BROWSERS,
                    grid: 'autoplace'
                }));
            }

            // Add media query sorting
            plugins.push(sortMediaQueries({ sort: 'mobile-first' }));

            if (options.minify || CONFIG.ENABLE_MINIFICATION) {
                plugins.push(cssnano({
                    preset: ['default', {
                        cssDeclarationSorter: false,
                        discardComments: { removeAll: false },
                    }]
                }));
            }

            postcssResult = await postcss(plugins).process(css, {
                from: inputPath,
                to: outputPath,
                parser: safeParser,
                map: false,
            });

            console.log('✅ PostCSS processing completed successfully');
        } catch (postcssError) {
            console.warn('⚠️ PostCSS with full plugins failed, trying minimal setup...');

            // Fallback to minimal PostCSS processing
            const minimalPlugins = [];
            if (CONFIG.ENABLE_AUTOPREFIXER) {
                minimalPlugins.push(autoprefixer({
                    overrideBrowserslist: CONFIG.BROWSERS,
                    grid: 'autoplace'
                }));
            }

            postcssResult = await postcss(minimalPlugins).process(css, {
                from: inputPath,
                to: outputPath,
                parser: safeParser,
                map: false,
            });

            console.log('✅ PostCSS minimal processing completed successfully');
        }

        // Step 5: Format with Prettier
        console.log('💅 Formatting with Prettier...');
        const prettierOptions = {
            parser: 'css',
            tabWidth: CONFIG.PRETTIER_TAB_WIDTH,
            useTabs: CONFIG.PRETTIER_USE_TABS,
            semi: CONFIG.PRETTIER_SEMI,
            singleQuote: CONFIG.PRETTIER_SINGLE_QUOTE,
            printWidth: CONFIG.PRETTIER_PRINT_WIDTH,
            endOfLine: CONFIG.PRETTIER_END_OF_LINE,
            trailingComma: 'none',
        };

        const formattedCss = await prettier.format(postcssResult.css, prettierOptions);

        // Step 6: Write output file
        await fs.outputFile(outputPath, formattedCss);

        // Calculate processing time and statistics
        const endTime = performance.now();
        const processingTime = ((endTime - startTime) / 1000).toFixed(2);

        const originalSize = Buffer.byteLength(originalCss, 'utf8');
        const finalSize = Buffer.byteLength(formattedCss, 'utf8');
        const finalLines = formattedCss.split('\n').length;
        const compressionRatio = ((originalSize - finalSize) / originalSize) * 100;

        // Success report
        console.log('\n🎉 Optimization completed successfully!');
        console.log(`📁 Output saved to: ${path.basename(outputPath)}`);

        console.log('\n📊 Processing Statistics:');
        console.log(`   ⏱️  Processing time: ${processingTime}s`);
        console.log(`   📏 Lines: ${originalLines.toLocaleString()} → ${finalLines.toLocaleString()}`);
        console.log(`   💾 Size: ${(originalSize / 1024).toFixed(2)} KB → ${(finalSize / 1024).toFixed(2)} KB`);

        if (compressionRatio > 0) {
            console.log(`   🗜️  Compression: ${compressionRatio.toFixed(1)}% smaller`);
        } else if (compressionRatio < 0) {
            console.log(`   📈 Size increase: ${Math.abs(compressionRatio).toFixed(1)}% (due to formatting/fixes)`);
        } else {
            console.log(`   ➖ Size: No change`);
        }

        console.log('\n✨ Your CSS is now optimized, formatted, and ready for production!');

        return {
            success: true,
            originalSize,
            finalSize,
            compressionRatio,
            processingTime: parseFloat(processingTime),
            outputPath,
        };

    } catch (err) {
        console.error('\n❌ Optimization failed:', err.message);

        if (err.line || err.column) {
            console.error(`   Location: Line ${err.line}, Column ${err.column}`);
        }

        console.error('\n💡 Troubleshooting tips:');
        console.error('   • Check CSS syntax for any errors');
        console.error('   • Ensure all @import statements are at the top');
        console.error('   • Verify that custom properties are properly defined');

        process.exit(1);
    }
}

// CLI execution
async function main() {
    const args = process.argv.slice(2);
    const options = {
        minify: args.includes('--minify'),
        createBackup: !args.includes('--no-backup'),
    };

    if (args.includes('--help')) {
        console.log(`
🎨 Ultimate CSS Optimizer & Linter (Advanced with AI)

Usage: node css-optimizer.js [options]

Options:
  --minify      Enable minification for production builds
  --no-backup   Skip creating backup file
  --help        Show this help message

Features:
  ✅ Advanced CSS linting with Stylelint
  ✅ Comprehensive regex-based fixes
  🤖 AI-powered complex issue resolution (Groq API)
  ✅ PostCSS processing with autoprefixer
  ✅ Prettier formatting

Environment Variables:
  GROQ_API_KEY  Your Groq API key for AI-powered fixes

This is the ultimate version with AI-assisted CSS fixing capabilities.
        `);
        return;
    }

    await optimizeCss(CONFIG.INPUT_PATH, CONFIG.OUTPUT_PATH, options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
