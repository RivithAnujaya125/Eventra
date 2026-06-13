/**
 * Helper to proxy Firebase Storage asset URLs to bypass CORS/iframe restrictions
 * by route-tunneling them through our Express /api/image-proxy server endpoint.
 */
export function getProxyUrl(url?: string): string | undefined {
  if (!url) return undefined;
  
  // Return base64 or relative URLs as is
  if (url.startsWith("data:") || url.startsWith("/")) {
    return url;
  }

  // Parse out storage object name if it matches Firebase Storage pattern
  const match = url.match(/\/o\/([^?]+)/);
  if (match && match[1]) {
    const name = decodeURIComponent(match[1]);
    return `/api/image-proxy?name=${encodeURIComponent(name)}`;
  }
  
  return url;
}
