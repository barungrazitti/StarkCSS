/**
 * Enhanced error handling utilities for CSS optimizer
 */
export class ErrorHandler {
  /**
   * Wrap async functions with error handling
   */
  static async withErrorHandling(fn, context = "Operation") {
    try {
      return await fn();
    } catch (error) {
      return ErrorHandler.handleError(error, context);
    }
  }

  /**
   * Handle and categorize errors
   */
  static handleError(error, context = "Operation") {
    const errorInfo = {
      success: false,
      context,
      message: error.message || "Unknown error occurred",
      type: this.categorizeError(error),
      timestamp: new Date().toISOString(),
      recoverable: this.isRecoverable(error),
    };

    // Log appropriate error message
    this.logError(errorInfo);

    // Return structured error response
    return errorInfo;
  }

  /**
   * Categorize error types
   */
  static categorizeError(error) {
    if (error.code === "ENOENT") return "FILE_NOT_FOUND";
    if (error.code === "EACCES") return "PERMISSION_DENIED";
    if (error.code === "ENOSPC") return "DISK_FULL";
    if (error.name === "AbortError") return "TIMEOUT";
    if (error.message.includes("503")) return "SERVICE_UNAVAILABLE";
    if (error.message.includes("401")) return "AUTHENTICATION_ERROR";
    if (error.message.includes("400")) return "BAD_REQUEST";
    if (error.message.includes("network") || error.message.includes("fetch"))
      return "NETWORK_ERROR";
    if (error.message.includes("CSS") || error.message.includes("parse"))
      return "CSS_PARSE_ERROR";
    if (error.message.includes("size") || error.message.includes("large"))
      return "SIZE_ERROR";
    if (
      error.message.includes("security") ||
      error.message.includes("traversal")
    )
      return "SECURITY_ERROR";

    return "UNKNOWN_ERROR";
  }

  /**
   * Determine if error is recoverable
   */
  static isRecoverable(error) {
    const recoverableTypes = [
      "NETWORK_ERROR",
      "SERVICE_UNAVAILABLE",
      "TIMEOUT",
      "AUTHENTICATION_ERROR",
    ];

    const errorType = this.categorizeError(error);
    return recoverableTypes.includes(errorType);
  }

  /**
   * Log errors with appropriate level
   */
  static logError(errorInfo) {
    const { context, message, type, recoverable } = errorInfo;

    switch (type) {
      case "FILE_NOT_FOUND":
        console.error(`❌ ${context}: File not found - ${message}`);
        console.log(
          "   💡 Check if the file path is correct and the file exists.",
        );
        break;

      case "PERMISSION_DENIED":
        console.error(`❌ ${context}: Permission denied - ${message}`);
        console.log(
          "   💡 Check file permissions and try running with appropriate access rights.",
        );
        break;

      case "DISK_FULL":
        console.error(`❌ ${context}: Disk full - ${message}`);
        console.log("   💡 Free up disk space and try again.");
        break;

      case "TIMEOUT":
        console.warn(`⏱️ ${context}: Operation timed out - ${message}`);
        if (recoverable) {
          console.log("   🔄 This is a temporary issue. You can try again.");
        }
        break;

      case "SERVICE_UNAVAILABLE":
        console.warn(
          `🚫 ${context}: Service temporarily unavailable - ${message}`,
        );
        console.log(
          "   💡 The service is temporarily down. Please try again later.",
        );
        break;

      case "AUTHENTICATION_ERROR":
        console.error(`🔑 ${context}: Authentication failed - ${message}`);
        console.log("   💡 Check your API key configuration.");
        break;

      case "NETWORK_ERROR":
        console.warn(`🌐 ${context}: Network error - ${message}`);
        console.log("   💡 Check your internet connection and try again.");
        break;

      case "CSS_PARSE_ERROR":
        console.error(`🔧 ${context}: CSS parsing error - ${message}`);
        console.log("   💡 Check your CSS syntax for any errors.");
        break;

      case "SIZE_ERROR":
        console.error(`📏 ${context}: Size error - ${message}`);
        console.log(
          "   💡 The file may be too large. Consider splitting it into smaller files.",
        );
        break;

      case "SECURITY_ERROR":
        console.error(`🛡️ ${context}: Security error - ${message}`);
        console.log("   💡 This operation was blocked for security reasons.");
        break;

      default:
        console.error(`❌ ${context}: ${message}`);
        if (recoverable) {
          console.log(
            "   🔄 This error might be temporary. You can try again.",
          );
        }
    }
  }

  /**
   * Create a retry mechanism for recoverable errors
   */
  static async withRetry(
    fn,
    maxRetries = 3,
    delay = 1000,
    context = "Operation",
  ) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const errorType = this.categorizeError(error);

        if (!this.isRecoverable(error) || attempt === maxRetries) {
          break;
        }

        console.warn(
          `⚠️ ${context} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }

    return this.handleError(lastError, context);
  }

  /**
   * Graceful degradation for non-critical features
   */
  static async withFallback(primaryFn, fallbackFn, context = "Operation") {
    try {
      return await primaryFn();
    } catch (error) {
      console.warn(
        `⚠️ ${context} primary method failed, using fallback: ${error.message}`,
      );
      try {
        return await fallbackFn();
      } catch (fallbackError) {
        console.error(
          `❌ ${context} fallback also failed: ${fallbackError.message}`,
        );
        throw fallbackError;
      }
    }
  }

  /**
   * Validate operation prerequisites
   */
  static validatePrerequisites(prerequisites, context = "Operation") {
    const missing = prerequisites.filter((prereq) => !prereq.condition);

    if (missing.length > 0) {
      const message = missing.map((prereq) => prereq.message).join(", ");
      const error = new Error(
        `Prerequisites not met for ${context}: ${message}`,
      );
      error.code = "PREREQUISITE_ERROR";
      throw error;
    }
  }

  /**
   * Create progress tracker for long operations
   */
  static createProgressTracker(totalSteps, context = "Operation") {
    let currentStep = 0;

    return {
      step(description) {
        currentStep++;
        const percentage = Math.round((currentStep / totalSteps) * 100);
        console.log(
          `📊 ${context}: ${description} (${currentStep}/${totalSteps} - ${percentage}%)`,
        );
      },

      complete(message) {
        console.log(`✅ ${context}: ${message}`);
      },
    };
  }
}
