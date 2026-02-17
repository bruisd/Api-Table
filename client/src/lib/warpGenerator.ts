/**
 * Warp Config Generator
 * Generates the Warp scraping platform action config from a fetch input
 */

export interface WarpAction {
  actionType: 'javascript' | 'wait';
  ms: number;
  block: boolean;
  code?: string;
}

// The parse function code template (provided verbatim in the spec)
const PARSE_FUNCTION_CODE = `function parse(object, node){for (x in object){var tr = document.createElement('TR');tr.setAttribute('type',typeof object[x]);tr.setAttribute('class',x);var td1 = document.createElement('TD');td1.setAttribute('class','name');td1.setAttribute('style','white-space: pre-wrap;');td1.textContent = x;tr.appendChild(td1);node.appendChild(tr);if (typeof object[x] == 'object'){var table = document.createElement('TABLE');var tbody = document.createElement('TBODY');table.appendChild(tbody);table.setAttribute('type','object');table.setAttribute('class',x);parse(object[x],tbody);if (table.getElementsByTagName('tr')[0]) {tr.appendChild(table);}else{var td2 = document.createElement('TD');td2.setAttribute('class','value');tr.appendChild(td2);}}else{tr.setAttribute('value',object[x]);var td2 = document.createElement('TD');td2.setAttribute('class','value');td2.innerHTML = object[x];tr.appendChild(td2);node.appendChild(tr);}}}var fileText = document.getElementById('intactCA').textContent;document.open();document.close();var object = JSON.parse(fileText);var table = document.createElement('TABLE');var tbody = document.createElement('TBODY');table.appendChild(tbody);document.body.appendChild(table);parse(object,tbody);var css = document.createElement('style');css.setAttribute('type', 'text/css');css.innerHTML = 'tr {border: 0px} .name {width:10%; border: 1px solid rgba(139, 139, 139, .22); padding-right: 5px; padding-left: 5px;} .value {width:90%; border: 1px solid rgba(139, 139, 139, .22); padding-right: 5px; padding-left: 5px;} table {width: 100%; border: solid rgba(139, 139, 139, .22); border-width: 10px 5px 10px 10px}';document.head.appendChild(css);`;

/**
 * Generate the fetch wrapper code that stores response in #intactCA div
 */
function generateFetchWrapperCode(fetchInput: string): string {
  // Extract just the fetch call (removing await if present)
  const fetchCall = fetchInput.trim().replace(/^\s*await\s+/, '');

  // Wrap the fetch call with the required logging and storage
  const wrappedCode = `console.log('calling api');document.body.innerHTML = '';const response = await ${fetchCall};response_text = await response.text();let div = document.createElement('div');div.id = 'intactCA';div.innerText = response_text;document.body.appendChild(div);console.log('end api');`;

  return wrappedCode;
}

/**
 * Generate the Warp config from a fetch input
 * Returns the JSON array as a formatted string
 */
export function generateWarpConfig(fetchInput: string): string {
  const actions: WarpAction[] = [
    {
      actionType: 'javascript',
      ms: 200,
      block: true,
      code: generateFetchWrapperCode(fetchInput),
    },
    {
      actionType: 'wait',
      ms: 200,
      block: true,
    },
    {
      actionType: 'javascript',
      ms: 100,
      block: true,
      code: PARSE_FUNCTION_CODE,
    },
  ];

  return JSON.stringify(actions, null, 2);
}

/**
 * Validate that a string looks like a valid fetch call
 */
export function isValidFetchInput(input: string): boolean {
  const trimmed = input.trim();
  // Remove await if present
  const withoutAwait = trimmed.replace(/^\s*await\s+/, '');
  // Check if it starts with fetch(
  return withoutAwait.startsWith('fetch(');
}

/**
 * Extract the URL from a fetch input for display
 */
export function extractUrlFromFetch(fetchInput: string): string | null {
  const trimmed = fetchInput.trim().replace(/^\s*await\s+/, '');

  // Match fetch('url' or fetch("url"
  const match = trimmed.match(/fetch\s*\(\s*(['"`])(.+?)\1/);

  return match ? match[2] : null;
}
