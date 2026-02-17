export interface ParsedFetch {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  options: Record<string, unknown>;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedFetch;
  error?: string;
  rawFetch?: string;
}

/**
 * Preserve %%variables%% by replacing them with placeholders
 */
function preserveVariables(input: string): { cleaned: string; vars: Map<string, string> } {
  const vars = new Map<string, string>();
  let counter = 0;
  const cleaned = input.replace(/%%([^%]+)%%/g, (match) => {
    const placeholder = `__APITABLE_VAR_${counter++}__`;
    vars.set(placeholder, match); // Store original %%name%%
    return `"${placeholder}"`; // Wrap in quotes so it's valid JS
  });
  return { cleaned, vars };
}

/**
 * Restore %%variables%% from placeholders
 */
function restoreVariables(text: string, vars: Map<string, string>): string {
  let result = text;
  vars.forEach((original, placeholder) => {
    result = result.replace(new RegExp(placeholder, 'g'), original);
  });
  return result;
}

/**
 * Parse a raw fetch() call string into its components
 * Uses Function() constructor to safely evaluate valid JavaScript
 */
export function parseFetch(input: string): ParseResult {
  const trimmed = input.trim();

  // Preserve variables before parsing
  const { cleaned, vars } = preserveVariables(trimmed);

  // Remove await keyword and trailing semicolon
  const withoutAwait = cleaned
    .replace(/^\s*await\s+/, '')
    .replace(/;?\s*$/, '');

  // Check if it looks like a fetch call
  if (!withoutAwait.includes('fetch(')) {
    return {
      success: false,
      error: 'Invalid fetch format. Expected: fetch(url, options)',
    };
  }

  // Step 1: Find the fetch( call and extract everything between the outer parens
  const fetchStart = withoutAwait.indexOf('fetch(');
  if (fetchStart === -1) {
    return {
      success: false,
      error: 'Could not find fetch() call',
    };
  }

  // Step 2: Find matching closing paren using a bracket counter
  let depth = 0;
  let argsStart = -1;
  let argsEnd = -1;
  let inString: string | null = null;
  let escaped = false;

  for (let i = fetchStart + 5; i < withoutAwait.length; i++) {
    const char = withoutAwait[i];

    // Handle escape sequences
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }

    // Handle strings
    if (inString) {
      if (char === inString) {
        inString = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    // Handle parentheses
    if (char === '(') {
      if (depth === 0) {
        argsStart = i + 1;
      }
      depth++;
    } else if (char === ')') {
      depth--;
      if (depth === 0) {
        argsEnd = i;
        break;
      }
    }
  }

  if (argsStart === -1 || argsEnd === -1) {
    return {
      success: false,
      error: 'Could not parse fetch() arguments. Make sure the parentheses are balanced.',
    };
  }

  const argsString = withoutAwait.substring(argsStart, argsEnd);

  // Step 3: Use Function constructor to safely evaluate the arguments
  // This handles both single-quoted and double-quoted formats, escaped chars, etc.
  try {
    // Create a safe evaluation function
    const evalFunction = new Function(`
      'use strict';
      function fakeFetch(url, options) {
        return { url, options: options || {} };
      }
      return fakeFetch(${argsString});
    `);

    const result = evalFunction();

    // Extract method (default to GET)
    const method = (result.options.method as string)?.toUpperCase() || 'GET';

    // Extract headers
    const headers: Record<string, string> = {};
    if (result.options.headers && typeof result.options.headers === 'object') {
      Object.entries(result.options.headers).forEach(([key, value]) => {
        const headerValue = String(value);
        headers[key] = restoreVariables(headerValue, vars);
      });
    }

    // Extract body
    let body: string | undefined;
    if (result.options.body !== undefined) {
      if (typeof result.options.body === 'string') {
        body = restoreVariables(result.options.body, vars);
      } else {
        body = restoreVariables(JSON.stringify(result.options.body), vars);
      }
    }

    // Restore variables in URL
    const url = restoreVariables(result.url, vars);

    // Get remaining options (excluding method, headers, body)
    const { method: _m, headers: _h, body: _b, ...restOptions } = result.options;

    return {
      success: true,
      data: {
        url,
        method,
        headers,
        body,
        options: restOptions,
      },
      rawFetch: trimmed,
    };
  } catch (error) {
    // Fallback: try to extract URL with regex at minimum
    const urlMatch = argsString.match(/^(['"`])(.+?)\1/);
    if (urlMatch) {
      const extractedUrl = restoreVariables(urlMatch[2], vars);
      return {
        success: false,
        error: 'Could not parse fetch options. Make sure you copied it directly from Chrome DevTools (right-click request → Copy → Copy as fetch).',
        data: {
          url: extractedUrl,
          method: 'GET',
          headers: {},
          options: {},
        },
      };
    }

    return {
      success: false,
      error: error instanceof Error
        ? `Parse error: ${error.message}. Make sure you copied a valid fetch() call from Chrome DevTools.`
        : 'Could not parse fetch call. Make sure you copied it directly from Chrome DevTools (right-click request → Copy → Copy as fetch).',
    };
  }
}

/**
 * Generate a fetch call string from parsed components
 */
export function generateFetchCall(parsed: ParsedFetch): string {
  const options: Record<string, unknown> = {
    method: parsed.method,
  };

  if (Object.keys(parsed.headers).length > 0) {
    options.headers = parsed.headers;
  }

  if (parsed.body) {
    options.body = parsed.body;
  }

  Object.assign(options, parsed.options);

  const optionsStr = JSON.stringify(options, null, 2);
  return `fetch('${parsed.url}', ${optionsStr})`;
}

/**
 * Sample fetch call for demo purposes
 */
export const SAMPLE_FETCH = `await fetch('https://jsonplaceholder.typicode.com/posts', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})`;

export const SAMPLE_POST_FETCH = `await fetch('https://jsonplaceholder.typicode.com/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'My New Post',
    body: 'This is the content of the post',
    userId: 1
  })
})`;

/**
 * Sample fetch with complex escaped quotes (Chrome DevTools format)
 */
export const SAMPLE_COMPLEX_FETCH = `await fetch("https://2.rome.api.flipkart.com/api/4/product/swatch", {
  "headers": {
    "accept": "*/*",
    "content-type": "application/json",
    "sec-ch-ua": "\\"Google Chrome\\";v=\\"143\\", \\"Chromium\\";v=\\"143\\", \\"Not A(Brand\\";v=\\"24\\"",
    "sec-ch-ua-mobile": "?0",
    "x-user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
  },
  "referrer": "https://www.flipkart.com/",
  "body": "{\\"pidLidMap\\":{\\"SHRGD6UF9RGUYFUF\\":\\"LSTSHRGD6UF9RGUYFUF6QJFCG\\"},\\"pincode\\":\\"\\"}",
  "method": "POST",
  "mode": "cors",
  "credentials": "include"
})`;
