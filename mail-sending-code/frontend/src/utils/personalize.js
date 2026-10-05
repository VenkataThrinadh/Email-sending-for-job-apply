// src/utils/personalize.js — reusable on the frontend
export const personalize = (template, data = {}) => {
  if (!template) return ''
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    data[key] !== undefined ? data[key] : match
  )
}
