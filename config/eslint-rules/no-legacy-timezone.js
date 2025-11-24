import path from 'path';

const DEFAULT_RESTRICTED_VALUES = [
  'Asia/Dubai',
  'UTC+4',
  'UTC+04:00',
  'GMT+4',
  'GMT+04:00',
];

function createMatcher(patterns) {
  return (filename) => patterns.some(pattern => pattern.test(filename));
}

function normalizeFilename(filename) {
  if (!filename || filename === '<input>' || filename === '<text>') {
    return filename;
  }
  return filename.split(path.sep).join('/');
}

const noLegacyTimezoneRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hard-coded legacy timezone literals and manual offsets',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
          },
          values: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      legacyTimezone: 'Avoid hard-coded legacy timezone literal {{ literal }}. Use the shared timezone resolver instead.',
    },
  },

  create(context) {
    const options = context.options && context.options[0] ? context.options[0] : {};
    const allowedPatterns = Array.isArray(options.allow)
      ? options.allow.map(pattern => new RegExp(pattern))
      : [];
    const isAllowedFile = createMatcher(allowedPatterns);

    const restrictedValues = Array.isArray(options.values) && options.values.length > 0
      ? options.values
      : DEFAULT_RESTRICTED_VALUES;

    function isRestrictedLiteral(value) {
      if (typeof value !== 'string') {
        return false;
      }
      return restrictedValues.some(candidate => value === candidate || value.includes(candidate));
    }

    function reportLiteral(node, value) {
      const filename = normalizeFilename(context.getFilename());
      if (filename && isAllowedFile(filename)) {
        return;
      }
      context.report({
        node,
        messageId: 'legacyTimezone',
        data: { literal: JSON.stringify(value) },
      });
    }

    return {
      Literal(node) {
        if (isRestrictedLiteral(node.value)) {
          reportLiteral(node, node.value);
        }
      },
      TemplateLiteral(node) {
        if (node.expressions.length > 0) {
          return;
        }
        const raw = node.quasis.map(quasi => quasi.value.cooked).join('');
        if (isRestrictedLiteral(raw)) {
          reportLiteral(node, raw);
        }
      },
    };
  },
};

export default noLegacyTimezoneRule;
