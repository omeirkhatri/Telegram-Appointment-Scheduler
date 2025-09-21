/**
 * ESLint rule to prevent hard-coded timezone references
 * 
 * This rule blocks hard-coded timezone strings, offsets, and abbreviations
 * to encourage the use of the timezone resolver system.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hard-coded timezone references',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noHardcodedTimezone: 'Hard-coded timezone "{{value}}" found. Use timezone resolver instead.',
      noHardcodedOffset: 'Hard-coded timezone offset "{{value}}" found. Use timezone resolver instead.',
      noHardcodedAbbreviation: 'Hard-coded timezone abbreviation "{{value}}" found. Use timezone resolver instead.',
    },
  },

  create(context) {
    // Hard-coded timezone patterns to block
    const timezonePatterns = [
      // Common timezone identifiers
      /Asia\/Dubai/i,
      /Europe\/London/i,
      /America\/New_York/i,
      /America\/Los_Angeles/i,
      /America\/Chicago/i,
      /America\/Denver/i,
      /Europe\/Paris/i,
      /Europe\/Berlin/i,
      /Europe\/Rome/i,
      /Asia\/Tokyo/i,
      /Asia\/Shanghai/i,
      /Australia\/Sydney/i,
      /Australia\/Melbourne/i,
      /Pacific\/Auckland/i,
      /Pacific\/Honolulu/i,
    ];

    // Hard-coded offset patterns to block
    const offsetPatterns = [
      /GMT[+-]\d+/i,
      /UTC[+-]\d+/i,
      /[+-]\d{2}:\d{2}/,
      /[+-]\d{4}/,
    ];

    // Hard-coded abbreviation patterns to block
    const abbreviationPatterns = [
      /GST/i,
      /GMT/i,
      /BST/i,
      /EST/i,
      /EDT/i,
      /CST/i,
      /CDT/i,
      /MST/i,
      /MDT/i,
      /PST/i,
      /PDT/i,
      /CET/i,
      /CEST/i,
      /EET/i,
      /EEST/i,
      /JST/i,
      /AEST/i,
      /AEDT/i,
      /NZST/i,
      /NZDT/i,
    ];

    // Allowed patterns (exceptions)
    const allowedPatterns = [
      // Test files are allowed to have hard-coded timezones for testing
      /\.test\.(ts|tsx|js|jsx)$/,
      /\.spec\.(ts|tsx|js|jsx)$/,
      /timezone-regression.*\.test\.(ts|tsx|js|jsx)$/,
      /timezone-cross-timezone\.test\.(ts|tsx|js|jsx)$/,
      /timezone-midnight-boundary\.test\.(ts|tsx|js|jsx)$/,
      /timezone-regression-dst-transitions\.test\.(ts|tsx|js|jsx)$/,
      /timezone-regression-data-freshness\.test\.(ts|tsx|js|jsx)$/,
    ];

    // Check if the file is allowed to have hard-coded timezones
    function isAllowedFile(filename) {
      return allowedPatterns.some(pattern => pattern.test(filename));
    }

    // Check if a string matches any of the blocked patterns
    function matchesPatterns(str, patterns) {
      return patterns.some(pattern => pattern.test(str));
    }

    // Check if a string is a hard-coded timezone
    function isHardcodedTimezone(str) {
      return matchesPatterns(str, timezonePatterns);
    }

    // Check if a string is a hard-coded offset
    function isHardcodedOffset(str) {
      return matchesPatterns(str, offsetPatterns);
    }

    // Check if a string is a hard-coded abbreviation
    function isHardcodedAbbreviation(str) {
      return matchesPatterns(str, abbreviationPatterns);
    }

    // Check string literals
    function checkStringLiteral(node) {
      if (typeof node.value !== 'string') return;

      const filename = context.getFilename();
      if (isAllowedFile(filename)) return;

      if (isHardcodedTimezone(node.value)) {
        context.report({
          node,
          messageId: 'noHardcodedTimezone',
          data: { value: node.value },
        });
      }

      if (isHardcodedOffset(node.value)) {
        context.report({
          node,
          messageId: 'noHardcodedOffset',
          data: { value: node.value },
        });
      }

      if (isHardcodedAbbreviation(node.value)) {
        context.report({
          node,
          messageId: 'noHardcodedAbbreviation',
          data: { value: node.value },
        });
      }
    }

    // Check template literals
    function checkTemplateLiteral(node) {
      const filename = context.getFilename();
      if (isAllowedFile(filename)) return;

      // Check if any quasis contain hard-coded timezone patterns
      node.quasis.forEach(quasi => {
        if (isHardcodedTimezone(quasi.value.raw)) {
          context.report({
            node: quasi,
            messageId: 'noHardcodedTimezone',
            data: { value: quasi.value.raw },
          });
        }

        if (isHardcodedOffset(quasi.value.raw)) {
          context.report({
            node: quasi,
            messageId: 'noHardcodedOffset',
            data: { value: quasi.value.raw },
          });
        }

        if (isHardcodedAbbreviation(quasi.value.raw)) {
          context.report({
            node: quasi,
            messageId: 'noHardcodedAbbreviation',
            data: { value: quasi.value.raw },
          });
        }
      });
    }

    // Check JSX attributes
    function checkJSXAttribute(node) {
      const filename = context.getFilename();
      if (isAllowedFile(filename)) return;

      if (node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
        if (isHardcodedTimezone(node.value.value)) {
          context.report({
            node: node.value,
            messageId: 'noHardcodedTimezone',
            data: { value: node.value.value },
          });
        }

        if (isHardcodedOffset(node.value.value)) {
          context.report({
            node: node.value,
            messageId: 'noHardcodedOffset',
            data: { value: node.value.value },
          });
        }

        if (isHardcodedAbbreviation(node.value.value)) {
          context.report({
            node: node.value,
            messageId: 'noHardcodedAbbreviation',
            data: { value: node.value.value },
          });
        }
      }
    }

    // Check object properties
    function checkObjectProperty(node) {
      const filename = context.getFilename();
      if (isAllowedFile(filename)) return;

      if (node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
        if (isHardcodedTimezone(node.value.value)) {
          context.report({
            node: node.value,
            messageId: 'noHardcodedTimezone',
            data: { value: node.value.value },
          });
        }

        if (isHardcodedOffset(node.value.value)) {
          context.report({
            node: node.value,
            messageId: 'noHardcodedOffset',
            data: { value: node.value.value },
          });
        }

        if (isHardcodedAbbreviation(node.value.value)) {
          context.report({
            node: node.value,
            messageId: 'noHardcodedAbbreviation',
            data: { value: node.value.value },
          });
        }
      }
    }

    // Check array elements
    function checkArrayElement(node) {
      const filename = context.getFilename();
      if (isAllowedFile(filename)) return;

      if (node.type === 'Literal' && typeof node.value === 'string') {
        if (isHardcodedTimezone(node.value)) {
          context.report({
            node,
            messageId: 'noHardcodedTimezone',
            data: { value: node.value },
          });
        }

        if (isHardcodedOffset(node.value)) {
          context.report({
            node,
            messageId: 'noHardcodedOffset',
            data: { value: node.value },
          });
        }

        if (isHardcodedAbbreviation(node.value)) {
          context.report({
            node,
            messageId: 'noHardcodedAbbreviation',
            data: { value: node.value },
          });
        }
      }
    }

    return {
      Literal: checkStringLiteral,
      TemplateLiteral: checkTemplateLiteral,
      JSXAttribute: checkJSXAttribute,
      Property: checkObjectProperty,
      ArrayExpression: {
        enter(node) {
          node.elements.forEach(element => {
            if (element) {
              checkArrayElement(element);
            }
          });
        },
      },
    };
  },
};
