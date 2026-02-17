import { Request, Response, NextFunction } from 'express';
import dns from 'dns/promises';

// Rate limiter for proxy endpoint
const proxyRateLimitMap = new Map<string, { count: number; windowStart: number }>();
const PROXY_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const PROXY_RATE_LIMIT_MAX = 60;

export function proxyRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const entry = proxyRateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > PROXY_RATE_LIMIT_WINDOW) {
    proxyRateLimitMap.set(ip, { count: 1, windowStart: now });
    next();
    return;
  }

  if (entry.count >= PROXY_RATE_LIMIT_MAX) {
    res.status(429).json({ error: 'Rate limit exceeded. Maximum 60 requests per minute.' });
    return;
  }

  entry.count++;
  next();
}

// SSRF protection - check if IP is private/internal
function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  const privateIPv4Patterns = [
    /^127\./, // 127.0.0.0/8 (loopback)
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^0\.0\.0\.0$/, // 0.0.0.0
  ];

  // IPv6 private/local
  const privateIPv6Patterns = [
    /^::1$/, // loopback
    /^fe80::/i, // link-local
    /^fc00::/i, // unique local
    /^fd00::/i, // unique local
  ];

  return privateIPv4Patterns.some(pattern => pattern.test(ip)) ||
         privateIPv6Patterns.some(pattern => pattern.test(ip));
}

// Check if hostname is blocked
function isBlockedHostname(hostname: string): boolean {
  const blockedHostnames = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
  const lowerHostname = hostname.toLowerCase();

  return blockedHostnames.some(blocked => lowerHostname === blocked || lowerHostname.endsWith('.' + blocked));
}

// Headers to strip (browser-only)
const HEADERS_TO_STRIP = new Set([
  'cookie',
  'origin',
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
]);

function shouldStripHeader(headerName: string): boolean {
  const lowerName = headerName.toLowerCase();

  // Strip sec- headers
  if (lowerName.startsWith('sec-')) {
    return true;
  }

  return HEADERS_TO_STRIP.has(lowerName);
}

// Sanitize headers
function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (!shouldStripHeader(key)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

interface ProxyRequestBody {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export async function proxyHandler(req: Request, res: Response): Promise<void> {
  const { url, method = 'GET', headers = {}, body } = req.body as ProxyRequestBody;

  // Validate URL
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    res.status(400).json({ error: 'Invalid URL format' });
    return;
  }

  // Only allow HTTP and HTTPS
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    res.status(400).json({ error: 'Only HTTP and HTTPS protocols are allowed' });
    return;
  }

  // Check for blocked hostnames
  if (isBlockedHostname(parsedUrl.hostname)) {
    res.status(403).json({ error: 'Access to this URL is blocked (SSRF protection)' });
    return;
  }

  // SSRF protection: DNS lookup to check resolved IP
  try {
    const addresses = await dns.resolve4(parsedUrl.hostname).catch(() => [] as string[]);
    const addresses6 = await dns.resolve6(parsedUrl.hostname).catch(() => [] as string[]);

    const allAddresses = [...addresses, ...addresses6];

    if (allAddresses.some(isPrivateIP)) {
      res.status(403).json({ error: 'Access to private/internal IPs is blocked (SSRF protection)' });
      return;
    }
  } catch (error) {
    // If DNS lookup fails, we'll still try the request but log it
    console.warn(`DNS lookup failed for ${parsedUrl.hostname}:`, error);
  }

  // Sanitize headers
  const sanitizedHeaders = sanitizeHeaders(headers);

  // Prepare fetch options
  const fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers: sanitizedHeaders,
    signal: AbortSignal.timeout(30000), // 30 second timeout
  };

  // Add body for methods that support it
  if (body && method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD') {
    fetchOptions.body = body;
  }

  try {
    // Make the request
    const response = await fetch(url, fetchOptions);

    // Check response size (limit to 10MB)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      res.status(413).json({ error: 'Response too large (max 10MB)' });
      return;
    }

    // Get response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Get response body
    const contentType = response.headers.get('content-type') || '';
    let responseBody: unknown;

    const text = await response.text();

    // Check actual size after reading
    if (text.length > 10 * 1024 * 1024) {
      res.status(413).json({ error: 'Response too large (max 10MB)' });
      return;
    }

    // Try to parse as JSON
    if (contentType.includes('application/json')) {
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = text;
      }
    } else {
      // Try to parse anyway
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = text;
      }
    }

    // Return proxy response
    const proxyResponse: ProxyResponse = {
      status: response.status,
      headers: responseHeaders,
      body: responseBody,
    };

    res.json(proxyResponse);
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        res.status(504).json({ error: 'Request timeout (30 seconds exceeded)' });
        return;
      }

      if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
        res.status(502).json({ error: 'Failed to connect to target URL' });
        return;
      }

      res.status(500).json({ error: `Proxy error: ${error.message}` });
      return;
    }

    res.status(500).json({ error: 'Unknown proxy error' });
  }
}
