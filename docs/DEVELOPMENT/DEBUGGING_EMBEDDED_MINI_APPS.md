# Debugging Embedded Mini-Apps

This guide helps you debug issues when mini-apps (like noice) fail to load in Nounspace spaces.

## Quick Debug Checklist

1. ✅ **Context Debugger** - Check if context is being provided
2. ✅ **Browser Console** - Look for JavaScript errors
3. ✅ **Network Tab** - Check if resources are loading
4. ✅ **Iframe Inspection** - Verify iframe is created correctly
5. ✅ **CSP Violations** - Check Content Security Policy errors
6. ✅ **SDK Injection** - Verify SDK is being injected

## Step-by-Step Debugging Process

### 1. Use the Context Debugger

The `ContextDebugger` component shows all available context information:

1. Navigate to the space containing the mini-app
2. Look for the debug panel (top-right in development mode)
3. Click "Copy All" to get complete debug information
4. Check:
   - **Context Being Sent to Embedded Apps**: Should show the context object (not null)
   - **Embedded Mini-Apps**: Should list the mini-app with:
     - URL: `https://app.noice.so/`
     - Bootstrap Doc: Should show "Present (bootstrap doc)" if context is available
     - Context Method: Should show "SDK API (sdk.context via Comlink)"

**Common Issues:**
- `Context Being Sent to Embedded Apps: ❌ NULL` → Context transformation is failing
- `Bootstrap Doc: ❌ No` → Bootstrap document isn't being created
- `Context Detected: ❌ Could not extract` → This is expected (context is via SDK)

### 2. Check Browser Console

Open DevTools (F12 or Cmd+Option+I) and check the Console tab:

**Look for:**
- JavaScript errors from the mini-app
- SDK initialization errors
- PostMessage errors
- CSP violations (see step 5)

**Common Errors:**
```
Failed to inject SDK for embedded mini-app
```
→ SDK injection failed in bootstrap script

```
Refused to frame 'https://app.noice.so/' because it violates the following Content Security Policy
```
→ CSP blocking the iframe

```
Uncaught TypeError: Cannot read property 'context' of undefined
```
→ SDK not available in mini-app

### 3. Check Network Tab

In DevTools → Network tab:

1. **Filter by "Doc" or "XHR"** to see document requests
2. **Look for the mini-app URL** (`https://app.noice.so/`)
3. **Check the response:**
   - Status code (200 = success, 404 = not found, etc.)
   - Response headers (especially CSP headers)
   - Response body (if it's HTML, check for errors)

**Common Issues:**
- **404 Not Found** → URL is incorrect or mini-app is down
- **CORS errors** → Cross-origin restrictions
- **Timeout** → Mini-app server is slow or unresponsive

### 4. Inspect the Iframe Element

1. Right-click on the iframe area → "Inspect Element"
2. Find the `<iframe>` element in the DOM
3. Check the attributes:

```html
<iframe
  data-nounspace-context
  src="..." or srcDoc="..."
  sandbox="allow-forms allow-scripts allow-same-origin ..."
  ...
/>
```

**Check:**
- `src` vs `srcDoc`: If using bootstrap doc, should have `srcDoc` attribute
- `sandbox` attribute: Should include necessary permissions
- `data-nounspace-context`: Should be present (used by debugger)

**Common Issues:**
- Missing `srcDoc` → Bootstrap document not being created
- Restrictive `sandbox` → Missing required permissions
- `src` pointing to wrong URL → URL transformation issue

### 5. Check Content Security Policy (CSP)

CSP violations can prevent iframes from loading:

1. Open DevTools → Console tab
2. Look for messages like:
   ```
   Refused to frame 'https://app.noice.so/' because it violates the following Content Security Policy directive: "frame-src ..."
   ```

2. Check `next.config.mjs` for CSP configuration:
   ```javascript
   cspHeader: {
     'frame-src': ["'self'", "https://app.noice.so", ...]
   }
   ```

**Fix:** Add the mini-app domain to `frame-src` in CSP configuration.

### 6. Verify SDK Injection

The SDK should be injected via the bootstrap document. To verify:

1. Inspect the iframe element
2. Check if `srcDoc` attribute exists
3. If present, the bootstrap script should inject `window.__farcasterMiniappSdk`

**To test SDK injection:**
1. Open the iframe's console (if possible) or use:
   ```javascript
   // In parent window console
   const iframe = document.querySelector('iframe[data-nounspace-context]');
   iframe.contentWindow.__farcasterMiniappSdk
   ```

2. Should return an object with:
   - `context`: Promise resolving to context
   - `actions`: Object with SDK actions
   - `wallet`: Wallet provider object

**Common Issues:**
- `undefined` → SDK not injected
- `context` Promise rejects → Context transformation failed

### 7. Test Context Access

If the mini-app is loading but can't access context:

1. Check if mini-app uses `@farcaster/miniapp-sdk`
2. Verify it's trying to access `sdk.context`
3. Check if Comlink communication is working

**In mini-app console (if accessible):**
```javascript
import { sdk } from '@farcaster/miniapp-sdk';
const context = await sdk.context;
console.log('Context:', context);
```

### 8. Check URL and Embeddability

1. **Verify URL is correct:**
   - Should be `https://app.noice.so/` (with trailing slash)
   - Check for typos or incorrect protocol (http vs https)

2. **Check if URL is embeddable:**
   - Some sites block iframe embedding with `X-Frame-Options: DENY`
   - Check Network tab → Response Headers for `X-Frame-Options`

3. **Check URL transformation:**
   - The URL might be transformed by `transformUrl()` function
   - Check what the final URL is in the iframe `src` attribute

### 9. Check Sandbox Permissions

The iframe uses sandbox restrictions. Check if all required permissions are present:

**Required permissions for mini-apps:**
- `allow-scripts` - Allow JavaScript execution
- `allow-same-origin` - Allow same-origin access
- `allow-forms` - Allow form submission
- `allow-popups` - Allow popups
- `allow-popups-to-escape-sandbox` - Allow popups to escape sandbox

**Check in iframe element:**
```html
<iframe sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" ...>
```

### 10. Test in Different Environments

Test the mini-app in different scenarios:

1. **Standalone mode** (not in Farcaster client):
   - Should use fallback user/client context
   - Check if context is still provided

2. **Embedded in Farcaster client**:
   - Should use host-provided context
   - Check if context is passed through correctly

3. **Different browsers**:
   - Some browsers have stricter CSP or iframe policies
   - Test in Chrome, Firefox, Safari

## Debugging Tools

### Context Debugger Component

Located at: `src/components/debug/ContextDebugger.tsx`

Shows:
- SDK status
- Host context
- Nounspace context
- Combined context
- Context being sent to embedded apps
- List of embedded mini-apps

### Browser DevTools

**Console Tab:**
- JavaScript errors
- Console logs from mini-app (if accessible)
- PostMessage communication

**Network Tab:**
- Resource loading
- Failed requests
- Response headers (CSP, X-Frame-Options)

**Elements Tab:**
- Iframe DOM structure
- Attributes (src, srcDoc, sandbox)
- Computed styles

**Application Tab:**
- Local Storage
- Session Storage
- Cookies (if accessible)

## Common Issues and Solutions

### Issue: Mini-app shows blank/white screen

**Possible causes:**
1. CSP blocking resources
2. SDK not injected
3. Context not available
4. JavaScript errors in mini-app

**Debug:**
1. Check Console for errors
2. Check Network tab for failed requests
3. Verify SDK injection
4. Check Context Debugger for context availability

### Issue: Mini-app loads but can't access context

**Possible causes:**
1. SDK not injected correctly
2. Context transformation failed
3. Comlink communication broken

**Debug:**
1. Check if `window.__farcasterMiniappSdk` exists in iframe
2. Verify context object structure
3. Check PostMessage communication

### Issue: CSP violations blocking iframe

**Solution:**
Add mini-app domain to `frame-src` in `next.config.mjs`:

```javascript
cspHeader: {
  'frame-src': [
    "'self'",
    "https://app.noice.so",
    // ... other domains
  ]
}
```

### Issue: Bootstrap document not created

**Possible causes:**
1. `transformedContext` is null
2. Context transformation failing
3. `isMiniAppEnvironment` check failing (shouldn't matter now)

**Debug:**
1. Check Context Debugger → "Context Being Sent to Embedded Apps"
2. Verify `transformForEmbedded()` returns valid context
3. Check fallback user/client context is available

## Getting Help

When reporting issues, include:

1. **Context Debugger output** (use "Copy All" button)
2. **Browser console errors** (screenshot or copy)
3. **Network tab** (failed requests)
4. **Iframe element** (HTML from Elements tab)
5. **Browser and version** (Chrome 120, Firefox 121, etc.)
6. **Environment** (standalone vs embedded in Farcaster client)

## Example Debug Session

```bash
# 1. Open space with noice mini-app
# 2. Open DevTools (F12)
# 3. Check Context Debugger:
#    - Context Being Sent: ✅ (shows context object)
#    - Bootstrap Doc: ✅ Present
#    - Embedded Mini-Apps: 1 detected

# 4. Check Console:
#    - No errors ✅

# 5. Check Network:
#    - https://app.noice.so/ → 200 OK ✅

# 6. Inspect iframe:
#    - Has srcDoc attribute ✅
#    - Has data-nounspace-context ✅
#    - Sandbox permissions look good ✅

# 7. If still not working:
#    - Check iframe console (if accessible)
#    - Verify SDK is injected
#    - Test context access in mini-app
```

