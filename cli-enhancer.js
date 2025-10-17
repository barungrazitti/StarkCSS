import chalk from "chalk";
import { createInterface } from "readline";
import { performance } from "perf_hooks";

/**
 * Enhanced CLI utilities with progress indicators and interactive configuration
 */

export class CLIEnhancer {
  constructor(options = {}) {
    this.options = {
      enableProgress: options.enableProgress !== false,
      enableSpinner: options.enableSpinner !== false,
      enableInteractive: options.enableInteractive !== false,
      showETA: options.showETA !== false,
      ...options,
    };

    this.spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    this.currentSpinnerIndex = 0;
    this.progressBars = new Map();
  }

  /**
   * Create an interactive progress bar
   */
  createProgressBar(total, options = {}) {
    const {
      width = 40,
      label = "Progress",
      showPercentage = true,
      showETA = this.options.showETA,
      showSpinner = this.options.enableSpinner,
    } = options;

    const progressBar = {
      total,
      current: 0,
      startTime: performance.now(),
      label,
      width,
      showPercentage,
      showETA,
      showSpinner,

      update(current, message = "") {
        this.current = Math.min(current, this.total);
        this.render(message);
      },

      increment(amount = 1, message = "") {
        this.update(this.current + amount, message);
      },

      render(message) {
        const percentage = this.total > 0 ? this.current / this.total : 0;
        const filledWidth = Math.floor(percentage * this.width);
        const emptyWidth = this.width - filledWidth;

        const filled = "█".repeat(filledWidth);
        const empty = "░".repeat(emptyWidth);

        let output = "";

        // Spinner
        if (
          this.showSpinner &&
          this.spinnerFrames &&
          this.spinnerFrames.length > 0
        ) {
          const spinner =
            this.spinnerFrames[
              Math.floor(Date.now() / 100) % this.spinnerFrames.length
            ];
          output += `${spinner} `;
        }

        // Label
        output += `${chalk.blue(this.label)} `;

        // Progress bar
        output += `[${chalk.green(filled)}${chalk.gray(empty)}]`;

        // Percentage
        if (this.showPercentage) {
          output += ` ${chalk.yellow((percentage * 100).toFixed(1))}%`;
        }

        // Current/Total
        output += ` (${this.current}/${this.total})`;

        // ETA
        if (this.showETA && this.current > 0) {
          const elapsed = performance.now() - this.startTime;
          const rate = this.current / elapsed;
          const remaining = this.total - this.current;
          const eta = remaining / rate;

          if (eta < 1000) {
            output += ` ${chalk.gray(`${Math.round(eta)}ms remaining`)}`;
          } else if (eta < 60000) {
            output += ` ${chalk.gray(`${(eta / 1000).toFixed(1)}s remaining`)}`;
          } else {
            output += ` ${chalk.gray(`${(eta / 60000).toFixed(1)}m remaining`)}`;
          }
        }

        // Message
        if (message) {
          output += ` ${chalk.cyan(message)}`;
        }

        // Clear line and redraw
        const columns = process.stdout.columns || 80;
        process.stdout.write("\r" + " ".repeat(columns) + "\r");
        process.stdout.write(output);
      },

      complete(message = "Complete!") {
        this.update(this.total, message);
        process.stdout.write("\n");
      },
    };

    return progressBar;
  }

  /**
   * Create a multi-step progress indicator
   */
  createMultiStepProgress(steps, options = {}) {
    const { label = "Processing", showStepNames = true } = options;

    let currentStep = 0;

    const multiStep = {
      steps,
      currentStep,
      label,
      showStepNames,

      nextStep(message = "") {
        if (currentStep > 0) {
          console.log(chalk.green(`   ✅ ${steps[currentStep - 1]}`));
        }

        currentStep++;

        if (currentStep <= steps.length) {
          const stepName = steps[currentStep - 1];
          console.log(
            chalk.blue(`🔄 ${stepName}...${message ? " " + message : ""}`),
          );
        }
      },

      complete() {
        if (currentStep > 0 && currentStep <= steps.length) {
          console.log(chalk.green(`   ✅ ${steps[currentStep - 1]}`));
        }
        console.log(chalk.green.bold(`🎉 ${label} completed!`));
      },

      getCurrentStep() {
        return currentStep;
      },

      getProgress() {
        return currentStep / steps.length;
      },
    };

    return multiStep;
  }

  /**
   * Interactive prompt with validation
   */
  async prompt(question, options = {}) {
    const {
      defaultValue = null,
      required = false,
      validate = null,
      type = "text",
      choices = null,
    } = options;

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      let answer;

      while (true) {
        const promptText = this.formatPrompt(question, options);

        answer = await new Promise((resolve) => {
          rl.question(promptText, resolve);
        });

        // Handle default value
        if (!answer && defaultValue !== null) {
          answer = defaultValue;
        }

        // Validation
        if (required && !answer) {
          console.log(
            chalk.red("   This field is required. Please enter a value."),
          );
          continue;
        }

        if (type === "number") {
          const num = parseFloat(answer);
          if (isNaN(num)) {
            console.log(chalk.red("   Please enter a valid number."));
            continue;
          }
          answer = num;
        }

        if (type === "boolean") {
          const lower = answer.toLowerCase();
          if (["true", "yes", "y", "1"].includes(lower)) {
            answer = true;
          } else if (["false", "no", "n", "0"].includes(lower)) {
            answer = false;
          } else {
            console.log(
              chalk.red("   Please enter true/false, yes/no, or y/n."),
            );
            continue;
          }
        }

        if (choices && !choices.includes(answer)) {
          console.log(
            chalk.red(`   Please choose from: ${choices.join(", ")}`),
          );
          continue;
        }

        if (validate && !validate(answer)) {
          console.log(chalk.red("   Invalid input. Please try again."));
          continue;
        }

        break;
      }

      return answer;
    } finally {
      rl.close();
    }
  }

  /**
   * Format prompt text
   */
  formatPrompt(question, options) {
    let promptText = chalk.cyan("❓ " + question);

    if (options.defaultValue !== null) {
      promptText += chalk.gray(` (${options.defaultValue})`);
    }

    if (options.choices) {
      promptText += chalk.gray(` [${options.choices.join(", ")}]`);
    }

    promptText += ": ";

    return promptText;
  }

  /**
   * Interactive configuration wizard
   */
  async runConfigurationWizard() {
    console.log(chalk.blue.bold("🧙 CSS Optimizer Configuration Wizard"));
    console.log(chalk.blue("=".repeat(45)));
    console.log(
      chalk.gray("Let's configure your CSS optimization settings.\n"),
    );

    const config = {};

    // Basic settings
    console.log(chalk.yellow("📁 Basic Settings:"));

    config.inputFiles = await this.prompt(
      "Input files or patterns (e.g., style.css, **/*.css)",
      {
        defaultValue: "**/*.css",
        required: true,
      },
    );

    config.outputDir = await this.prompt("Output directory", {
      defaultValue: "dist",
    });

    config.createBackup = await this.prompt("Create backup files", {
      type: "boolean",
      defaultValue: true,
    });

    // Optimization settings
    console.log(chalk.yellow("\n⚡ Optimization Settings:"));

    config.enableMinification = await this.prompt("Enable minification", {
      type: "boolean",
      defaultValue: false,
    });

    config.enablePurgeCSS = await this.prompt("Remove unused CSS (PurgeCSS)", {
      type: "boolean",
      defaultValue: true,
    });

    config.enableCriticalCSS = await this.prompt("Extract critical CSS", {
      type: "boolean",
      defaultValue: false,
    });

    config.enableLightningCSS = await this.prompt(
      "Use Lightning CSS (faster processing)",
      {
        type: "boolean",
        defaultValue: false,
      },
    );

    // Advanced settings
    console.log(chalk.yellow("\n🔧 Advanced Settings:"));

    config.enableAI = await this.prompt("Enable AI-powered fixes", {
      type: "boolean",
      defaultValue: true,
    });

    config.concurrency = await this.prompt("Processing concurrency", {
      type: "number",
      defaultValue: 4,
      validate: (val) => val > 0 && val <= 16,
    });

    config.browsers = await this.prompt("Browser targets (comma-separated)", {
      defaultValue: "> 1%, last 2 versions, not dead",
    });

    // Show configuration summary
    console.log(chalk.blue.bold("\n📋 Configuration Summary:"));
    console.log(chalk.blue("=".repeat(30)));

    console.log(chalk.white(`Input Files: ${chalk.green(config.inputFiles)}`));
    console.log(
      chalk.white(`Output Directory: ${chalk.green(config.outputDir)}`),
    );
    console.log(
      chalk.white(`Create Backup: ${chalk.green(config.createBackup)}`),
    );
    console.log(
      chalk.white(`Minification: ${chalk.green(config.enableMinification)}`),
    );
    console.log(chalk.white(`PurgeCSS: ${chalk.green(config.enablePurgeCSS)}`));
    console.log(
      chalk.white(`Critical CSS: ${chalk.green(config.enableCriticalCSS)}`),
    );
    console.log(
      chalk.white(`Lightning CSS: ${chalk.green(config.enableLightningCSS)}`),
    );
    console.log(chalk.white(`AI Fixes: ${chalk.green(config.enableAI)}`));
    console.log(chalk.white(`Concurrency: ${chalk.green(config.concurrency)}`));
    console.log(chalk.white(`Browsers: ${chalk.green(config.browsers)}`));

    const confirm = await this.prompt(
      "\nDoes this configuration look correct?",
      {
        type: "boolean",
        defaultValue: true,
      },
    );

    if (!confirm) {
      console.log(
        chalk.yellow(
          "Configuration cancelled. Run the wizard again to try different settings.",
        ),
      );
      return null;
    }

    console.log(chalk.green.bold("\n✅ Configuration saved!"));

    return config;
  }

  /**
   * Create a selection menu
   */
  async createSelectionMenu(title, options, multiple = false) {
    console.log(chalk.blue.bold("📋 " + title));
    console.log(chalk.blue("=".repeat(title.length + 4)));

    const selected = multiple ? [] : null;

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const prefix = multiple
        ? `[${selected.includes(i) ? "✓" : " "}]`
        : `[${selected === i ? "✓" : " "}]`;
      console.log(
        chalk.white(`  ${prefix} ${i + 1}. ${option.title || option}`),
      );
    }

    console.log(
      chalk.gray(
        "\nEnter numbers to select (e.g., 1,3,5) or press Enter to confirm.",
      ),
    );

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      while (true) {
        const answer = await new Promise((resolve) => {
          rl.question(chalk.cyan("> "), resolve);
        });

        if (!answer) {
          break;
        }

        const numbers = answer.split(",").map((n) => parseInt(n.trim()) - 1);

        for (const num of numbers) {
          if (num >= 0 && num < options.length) {
            if (multiple) {
              const index = selected.indexOf(num);
              if (index > -1) {
                selected.splice(index, 1);
              } else {
                selected.push(num);
              }
            } else {
              selected = num;
            }
          }
        }

        // Redraw menu
        console.clear();
        console.log(chalk.blue.bold("📋 " + title));
        console.log(chalk.blue("=".repeat(title.length + 4)));

        for (let i = 0; i < options.length; i++) {
          const option = options[i];
          const isSelected = multiple ? selected.includes(i) : selected === i;
          const prefix = `[${isSelected ? "✓" : " "}]`;
          console.log(
            chalk.white(`  ${prefix} ${i + 1}. ${option.title || option}`),
          );
        }

        console.log(
          chalk.gray(
            "\nEnter numbers to select (e.g., 1,3,5) or press Enter to confirm.",
          ),
        );
      }

      const result = multiple
        ? selected.map((i) => options[i])
        : selected !== null
          ? options[selected]
          : null;
      return result;
    } finally {
      rl.close();
    }
  }

  /**
   * Show a success message with animation
   */
  showSuccess(message, duration = 2000) {
    const frames = ["⚡", "✨", "🎉", "🚀"];
    let frameIndex = 0;

    const interval = setInterval(() => {
      const frame = frames[frameIndex % frames.length];
      process.stdout.write(`\r${frame} ${chalk.green.bold(message)}`);
      frameIndex++;
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      process.stdout.write(`\r${chalk.green.bold("✅ " + message)}\n`);
    }, duration);
  }

  /**
   * Show an error message
   */
  showError(message) {
    console.error(chalk.red.bold("❌ Error: " + message));
  }

  /**
   * Show a warning message
   */
  showWarning(message) {
    console.warn(chalk.yellow.bold("⚠️ Warning: " + message));
  }

  /**
   * Show an info message
   */
  showInfo(message) {
    console.log(chalk.blue.bold("ℹ️ Info: " + message));
  }

  /**
   * Create a table display
   */
  createTable(headers, rows, options = {}) {
    const { maxWidth = 80, padding = 2 } = options;

    // Calculate column widths
    const columnWidths = headers.map((header, index) => {
      const maxContentWidth = Math.max(
        header.length,
        ...rows.map((row) => String(row[index] || "").length),
      );
      return Math.min(maxContentWidth + padding * 2, maxWidth / headers.length);
    });

    // Create separator line
    const separator =
      "+" + columnWidths.map((width) => "-".repeat(width)).join("+") + "+";

    // Format header
    const headerRow =
      "|" +
      headers
        .map((header, index) => {
          const padded = header.padEnd(columnWidths[index] - padding);
          return " ".repeat(padding) + chalk.bold(padded) + " ".repeat(padding);
        })
        .join("|") +
      "|";

    // Format data rows
    const dataRows = rows.map((row) => {
      return (
        "|" +
        row
          .map((cell, index) => {
            const content = String(cell || "");
            const truncated =
              content.length > columnWidths[index] - padding * 2
                ? content.substring(0, columnWidths[index] - padding * 2 - 3) +
                  "..."
                : content;
            const padded = truncated.padEnd(columnWidths[index] - padding);
            return " ".repeat(padding) + padded + " ".repeat(padding);
          })
          .join("|") +
        "|"
      );
    });

    return [separator, headerRow, separator, ...dataRows, separator].join("\n");
  }

  /**
   * Clear the console
   */
  clear() {
    process.stdout.write("\x1B[2J\x1B[0f");
  }

  /**
   * Create a loading animation
   */
  createLoading(message, duration = null) {
    let index = 0;
    const interval = setInterval(() => {
      const frame = this.spinnerFrames[index % this.spinnerFrames.length];
      process.stdout.write(`\r${frame} ${chalk.blue(message)}`);
      index++;
    }, 100);

    if (duration) {
      setTimeout(() => {
        clearInterval(interval);
        process.stdout.write(`\r${chalk.green("✅ " + message)}\n`);
      }, duration);
    }

    return {
      stop: (finalMessage = null) => {
        clearInterval(interval);
        if (finalMessage) {
          process.stdout.write(`\r${chalk.green("✅ " + finalMessage)}\n`);
        } else {
          const columns = process.stdout.columns || 80;
          process.stdout.write("\r" + " ".repeat(columns) + "\r");
        }
      },
    };
  }
}

/**
 * Convenience functions
 */
export async function runConfigurationWizard() {
  const enhancer = new CLIEnhancer();
  return await enhancer.runConfigurationWizard();
}

export function createProgressBar(total, options = {}) {
  const enhancer = new CLIEnhancer();
  return enhancer.createProgressBar(total, options);
}

export function createMultiStepProgress(steps, options = {}) {
  const enhancer = new CLIEnhancer();
  return enhancer.createMultiStepProgress(steps, options);
}

export default CLIEnhancer;
