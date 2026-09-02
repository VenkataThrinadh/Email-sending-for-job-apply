// services/personalizationService.js - Replace template variables with recipient data
/**
 * Replaces {{variable}} placeholders in a template string with values from data object.
 * Example:  "Hi {{name}}, your order {{orderId}} is ready"
 *           + { name: "John", orderId: "123" }
 *        => "Hi John, your order 123 is ready"
 */
const personalize = (template, data = {}) => {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key] !== undefined ? data[key] : match;
    return value;
  });
};

/**
 * Extract all {{variable}} tags from a template string
 */
const extractVariables = (template) => {
  const regex = /\{\{(\w+)\}\}/g;
  const vars = new Set();
  let match;
  while ((match = regex.exec(template)) !== null) {
    vars.add(match[1]);
  }
  return Array.from(vars);
};

/**
 * Preview personalization by applying sample data
 */
const previewTemplate = (template, sampleData = {}) => {
  const variables = extractVariables(template);
  const filled = personalize(template, sampleData);
  const missing = variables.filter((v) => !(v in sampleData));
  return { preview: filled, variables, missing };
};

module.exports = { personalize, extractVariables, previewTemplate };
