/**
 * Text sanitization and normalization utilities
 * Handles cleanup of agent response text
 */

/**
 * Sanitize response text from AI agent
 * Removes artifacts, normalizes whitespace, handles encoding
 */
export function sanitizeText(text: unknown): string {
  // Handle null/undefined/non-string
  if (text === null || text === undefined) return ''
  if (typeof text !== 'string') return String(text)

  let result = text

  // Remove trailing "undefined" (common artifact from JS agent concatenation)
  while (result.endsWith('undefined')) {
    result = result.slice(0, -'undefined'.length)
  }

  // Remove leading "undefined"
  while (result.startsWith('undefined')) {
    result = result.slice('undefined'.length)
  }

  // Remove "null" artifacts
  while (result.endsWith('null')) {
    result = result.slice(0, -'null'.length)
  }

  // Normalize whitespace: collapse multiple spaces into one
  result = result.replace(/  +/g, ' ')

  // Remove zero-width characters that break rendering
  result = result.replace(/[\u200B\u200C\u200D\uFEFF]/g, '')

  // Normalize Unicode combining marks (important for Indic scripts)
  try {
    result = result.normalize('NFC')
  } catch {
    // If normalization fails, keep as-is
  }

  // Trim leading/trailing whitespace
  result = result.trim()

  return result
}

/**
 * Check if text is empty or only whitespace
 */
export function isEmptyText(text: unknown): boolean {
  if (text === null || text === undefined) return true
  if (typeof text !== 'string') return false
  return text.trim().length === 0
}
