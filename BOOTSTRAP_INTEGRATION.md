import { SimplePurgeCSS } from "./simple-purgecss.js";
import { FrameworkOptimizer } from "./framework-optimizer.js";

/\*\*

- Bootstrap-specific CSS optimizer
- Handles Bootstrap's dynamic classes and responsive utilities
  \*/
  export class BootstrapOptimizer {
  constructor(options = {}) {
  this.options = {
  bootstrapVersion: options.bootstrapVersion || '5', // 3, 4, or 5
  preserveUtilities: options.preserveUtilities !== false, // Keep utility classes
  preserveComponents: options.preserveComponents !== false, // Keep component classes
  preserveResponsive: options.preserveResponsive !== false, // Keep responsive classes
  preserveStates: options.preserveStates !== false, // Keep state classes
  customSafelist: options.customSafelist || [],
  ...options,
  };
      this.bootstrapSafelist = this.generateBootstrapSafelist();
  }

/\*\*

- Generate comprehensive Bootstrap safelist
  \*/
  generateBootstrapSafelist() {
  const safelist = [
  // CSS Variables (Bootstrap 5)
  /^--bs-/,
      // State classes (added dynamically)
      'show', 'hide', 'fade', 'showing', 'collapsing', 'collapse',
      'active', 'disabled', 'focus', 'hover', 'visited', 'checked',
      'valid', 'invalid', 'was-validated',

      // Display utilities
      /^d-/, /^d-flex/, /^d-grid/, /^d-block/,

      // Flex utilities
      /^flex-/, /^justify-content-/, /^align-items-/, /^align-self-/,

      // Text utilities
      /^text-/, /^font-/, /^fw-/, /^fst-/,

      // Color utilities
      /^text-/, /^bg-/, /^border-/,

      // Spacing utilities
      /^p-/, /^m-/, /^px-/, /^py-/, /^pt-/, /^pb-/, /^pl-/, /^pr-/,

      // Sizing utilities
      /^w-/, /^h-/, /^mw-/, /^mh-/,

      // Position utilities
      /^position-/, /^top-/, /^bottom-/, /^start-/, /^end-/,

      // Responsive utilities (all breakpoints)
      ...this.generateResponsiveSafelist(),

      // Component classes
      ...this.generateComponentSafelist(),

      // Form controls
      'form-control', 'form-select', 'form-check', 'form-switch',
      'form-label', 'form-text', 'form-floating',

      // Button classes
      /^btn-/, 'btn-group', 'btn-toolbar',

      // Navigation
      'navbar', 'navbar-nav', 'nav-link', 'nav-item',
      'breadcrumb', 'pagination',

      // Cards
      'card', 'card-body', 'card-header', 'card-footer', 'card-title', 'card-text',

      // Modals
      'modal', 'modal-dialog', 'modal-content', 'modal-header', 'modal-body', 'modal-footer',
      'modal-backdrop',

      // Alerts
      /^alert-/,

      // Tables
      'table', /^table-/,

      // Grid system
      /^container/, /^row/, /^col-/,
  ];


    return [...safelist, ...this.options.customSafelist];

}

/\*\*

- Generate responsive utility safelist
  \*/
  generateResponsiveSafelist() {
  const breakpoints = ['sm', 'md', 'lg', 'xl', 'xxl'];
  const utilities = [
  'd', 'flex', 'grid', 'block', 'inline', 'inline-block', 'none',
  'text', 'bg', 'border', 'p', 'm', 'w', 'h',
  'justify-content', 'align-items', 'align-self',
  'flex-row', 'flex-column', 'flex-wrap', 'flex-nowrap',
  ];


    const responsive = [];

    breakpoints.forEach(bp => {
      utilities.forEach(utility => {
        responsive.push(new RegExp(`^${utility}-${bp}`));
      });
    });

    return responsive;

}

/\*\*

- Generate component-specific safelist
  \*/
  generateComponentSafelist() {
  const version = this.options.bootstrapVersion;


    const components = {
      3: [
        // Bootstrap 3 specific
        'img-responsive', 'img-rounded', 'img-circle', 'img-thumbnail',
        'pull-left', 'pull-right', 'center-block',
        'text-left', 'text-right', 'text-center', 'text-justify',
        'text-muted', 'text-primary', 'text-success', 'text-info', 'text-warning', 'text-danger',
        'bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger',
        'btn-default', 'btn-primary', 'btn-success', 'btn-info', 'btn-warning', 'btn-danger',
        'btn-lg', 'btn-sm', 'btn-xs',
        'form-control', 'form-group',
        'panel', 'panel-heading', 'panel-body', 'panel-footer',
        'modal', 'modal-dialog', 'modal-content', 'modal-header', 'modal-body', 'modal-footer',
      ],
      4: [
        // Bootstrap 4 specific
        'img-fluid', 'img-thumbnail',
        'float-left', 'float-right', 'float-none',
        'text-left', 'text-right', 'text-center', 'text-justify',
        'text-muted', 'text-primary', 'text-success', 'text-info', 'text-warning', 'text-danger',
        'bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger', 'bg-light', 'bg-dark',
        'btn-primary', 'btn-secondary', 'btn-success', 'btn-info', 'btn-warning', 'btn-danger', 'btn-light', 'btn-dark',
        'btn-lg', 'btn-sm',
        'form-control', 'form-group', 'form-check', 'form-check-inline',
        'card', 'card-body', 'card-header', 'card-footer', 'card-title', 'card-text', 'card-link',
        'modal', 'modal-dialog', 'modal-content', 'modal-header', 'modal-body', 'modal-footer',
        'alert', 'alert-primary', 'alert-secondary', 'alert-success', 'alert-info', 'alert-warning', 'alert-danger',
      ],
      5: [
        // Bootstrap 5 specific
        'img-fluid', 'img-thumbnail',
        'float-start', 'float-end', 'float-none',
        'text-start', 'text-end', 'text-center', 'text-justify',
        'text-muted', 'text-primary', 'text-success', 'text-info', 'text-warning', 'text-danger',
        'bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger', 'bg-light', 'bg-dark', 'bg-white', 'bg-transparent',
        'btn-primary', 'btn-secondary', 'btn-success', 'btn-info', 'btn-warning', 'btn-danger', 'btn-light', 'btn-dark',
        'btn-lg', 'btn-sm',
        'form-control', 'form-select', 'form-check', 'form-check-inline', 'form-label', 'form-text',
        'card', 'card-body', 'card-header', 'card-footer', 'card-title', 'card-text', 'card-link', 'card-img-top',
        'modal', 'modal-dialog', 'modal-content', 'modal-header', 'modal-body', 'modal-footer', 'modal-backdrop',
        'alert', 'alert-primary', 'alert-secondary', 'alert-success', 'alert-info', 'alert-warning', 'alert-danger',
        'accordion', 'accordion-item', 'accordion-header', 'accordion-body', 'accordion-button',
        'offcanvas', 'offcanvas-header', 'offcanvas-body', 'offcanvas-title',
      ],
    };

    return components[version] || components[5];

}

/\*\*

- Optimize Bootstrap CSS with smart detection
  \*/
  async optimizeBootstrapCSS(cssFiles, contentFiles, options = {}) {
  console.log(`🎯 Optimizing Bootstrap ${this.options.bootstrapVersion} CSS...`);


    // Create enhanced PurgeCSS with Bootstrap awareness
    const purgeCSS = new SimplePurgeCSS({
      content: contentFiles,
      css: cssFiles,
      output: options.output || null,
      safelist: this.bootstrapSafelist,
      variables: true, // Preserve CSS variables
      verbose: options.verbose || false,
    });

    // Enhanced selector extraction for Bootstrap
    const originalGetUsedSelectors = purgeCSS.getUsedSelectors.bind(purgeCSS);
    purgeCSS.getUsedSelectors = async () => {
      const standardSelectors = await originalGetUsedSelectors();
      const bootstrapSelectors = await this.extractBootstrapSelectors(contentFiles);

      // Merge selectors
      const allSelectors = new Set([...standardSelectors, ...bootstrapSelectors]);
      console.log(`📊 Found ${standardSelectors.length} standard + ${bootstrapSelectors.length} Bootstrap selectors`);

      return Array.from(allSelectors);
    };

    try {
      const result = await purgeCSS.process();

      console.log(`✅ Bootstrap optimization complete:`);
      console.log(`   📏 Size reduction: ${result.compressionRatio.toFixed(1)}%`);
      console.log(`   🎯 Rules: ${result.originalRules} → ${result.usedRules}`);
      console.log(`   🗑️ Removed: ${result.removedRules} unused rules`);

      return result;
    } catch (error) {
      console.error(`❌ Bootstrap optimization failed:`, error.message);
      throw error;
    }

}

/\*\*

- Extract Bootstrap-specific selectors from content
  \*/
  async extractBootstrapSelectors(contentFiles) {
  const selectors = new Set();


    for (const pattern of contentFiles) {
      const files = await this.resolveFiles(pattern);

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const fileSelectors = this.extractBootstrapSelectorsFromContent(content);
          fileSelectors.forEach(selector => selectors.add(selector));
        } catch (error) {
          console.warn(`⚠️ Could not read ${file}: ${error.message}`);
        }
      }
    }

    return Array.from(selectors);

}

/\*\*

- Extract Bootstrap selectors from file content
  \*/
  extractBootstrapSelectorsFromContent(content) {
  const selectors = new Set();


    // Standard class extraction
    const classMatches = content.match(/class=["']([^"']+)["']/g) || [];
    classMatches.forEach(match => {
      const classes = match.match(/class=["']([^"']+)["']/)[1].split(' ');
      classes.forEach(cls => {
        if (cls.trim()) {
          selectors.add(`.${cls.trim()}`);
        }
      });
    });

    // Bootstrap data attributes (often used for JavaScript components)
    const dataAttributes = content.match(/data-bs-[\w-]+=["']([^"']+)["']/g) || [];
    dataAttributes.forEach(match => {
      const value = match.match(/data-bs-[\w-]+=["']([^"']+)["']/)[1];
      if (value && value !== 'false') {
        selectors.add(`.${value}`);
      }
    });

    // Bootstrap JavaScript component initialization
    const jsMatches = content.match(/new bootstrap\.[A-Za-z]+\(["']([^"']+)["']/g) || [];
    jsMatches.forEach(match => {
      const selector = match.match(/new bootstrap\.[A-Za-z]+\(["']([^"']+)["']/)[1];
      if (selector) {
        selectors.add(selector);
      }
    });

    // jQuery Bootstrap initialization (legacy)
    const jqueryMatches = content.match(/\$(["']([^"']+)["']\)\.bootstrap\(/g) || [];
    jqueryMatches.forEach(match => {
      const selector = match.match(/\$(["']([^"']+)["']\)/)[1];
      if (selector) {
        selectors.add(selector);
      }
    });

    return Array.from(selectors);

}

/\*\*

- Create Bootstrap-aware configuration for build tools
  _/
  createViteConfig(contentPaths = []) {
  return {
  enablePurgeCSS: true,
  purgeCSS: {
  content: [
  'index.html',
  'src/\*\*/_.{js,jsx,ts,tsx,vue}',
  ...contentPaths,
  ],
  safelist: this.bootstrapSafelist,
  variables: true,
  },
  enableFrameworkOptimization: true,
  framework: {
  type: 'bootstrap',
  detect: false,
  },
  };
  }

/\*\*

- Create Bootstrap-aware Webpack configuration
  _/
  createWebpackConfig(contentPaths = []) {
  return {
  enablePurgeCSS: true,
  purgeCSS: {
  content: [
  'src/\*\*/_.{html,js,jsx,ts,tsx}',
  'public/index.html',
  ...contentPaths,
  ],
  safelist: this.bootstrapSafelist,
  variables: true,
  },
  enableFrameworkOptimization: true,
  framework: {
  type: 'bootstrap',
  detect: false,
  },
  test: /\.(css|scss)$/,
  include: /bootstrap/,
  };
  }
  }

export default BootstrapOptimizer;
