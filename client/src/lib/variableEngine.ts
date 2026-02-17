/**
 * Variable detection and replacement for %%variableName%% patterns
 * Used for Warp scraping platform variable syntax
 */

// Pattern to match %%variableName%% syntax
const VARIABLE_PATTERN = /%%([a-zA-Z_][a-zA-Z0-9_]*)%%/g;

/**
 * Detect all variables in the input text
 * Returns an array of unique variable names (without the %% delimiters)
 */
export function detectVariables(text: string): string[] {
  const variables: Set<string> = new Set();
  let match: RegExpExecArray | null;

  // Reset regex lastIndex
  VARIABLE_PATTERN.lastIndex = 0;

  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Replace all variables in the text with their values
 */
export function replaceVariables(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(VARIABLE_PATTERN, (_, varName) => {
    return values[varName] ?? `%%${varName}%%`;
  });
}

/**
 * Check if all variables in the text have been assigned values
 */
export function hasUnresolvedVariables(
  text: string,
  values: Record<string, string>
): { hasUnresolved: boolean; unresolved: string[] } {
  const allVariables = detectVariables(text);
  const unresolved = allVariables.filter(
    varName => !values[varName] || values[varName].trim() === ''
  );

  return {
    hasUnresolved: unresolved.length > 0,
    unresolved,
  };
}

/**
 * Validate variable name
 */
export function isValidVariableName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Highlight variables in text for display
 * Returns an array of segments with type information
 */
export interface TextSegment {
  type: 'text' | 'variable';
  content: string;
  variableName?: string;
}

export function highlightVariables(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  // Reset regex lastIndex
  VARIABLE_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    // Add text before the variable
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add the variable
    segments.push({
      type: 'variable',
      content: match[0],
      variableName: match[1],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}
