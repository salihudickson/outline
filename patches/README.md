# Patches

This directory contains patches applied to node_modules packages using [patch-package](https://github.com/ds300/patch-package).

Patches are automatically applied during `yarn install` via the postinstall script.

## Why patches?

Patches are used when:
1. A package has a bug that blocks Outline
2. A package needs a small compatibility fix
3. Waiting for upstream fixes would delay development
4. The alternative (forking) is more complex

## Current Patches

### Chat SDK Packages (ESM/CommonJS Interop)

**Files:**
- `@chat-adapter+slack+4.15.0.patch`
- `@chat-adapter+shared+4.15.0.patch`
- `chat+4.15.0.patch`

**Issue:**
These packages are ESM-only (`"type": "module"`) with only `"import"` export conditions. Outline uses CommonJS (Babel compilation), which requires a `"default"` export condition for proper module resolution.

**Fix:**
Adds `"default": "./dist/index.js"` to the main export (`"."`) in each package's package.json. This ensures Node.js can resolve the modules when imported from CommonJS code.

Note: The `chat` package also exports `./jsx-runtime` and `./jsx-dev-runtime`, but these are not used by Outline and thus not patched.

**Why not alternatives?**
- Converting Outline to ESM: Too large a breaking change
- Dynamic imports: Don't work for synchronous imports
- Babel plugin: More complex than patches
- Wait for upstream: Trend is ESM-only, may never add CommonJS support

**Upstream:**
Consider submitting PRs to chat-sdk repository to add default export conditions.

### ProseMirror Math (@benrbray/prosemirror-math)

**File:** `@benrbray+prosemirror-math+0.2.2.patch`

**Issue:**
Named import of `ParseError` from katex doesn't work with the current build setup.

**Fix:**
Changes `import { ParseError }` to access via `katex.ParseError`.

### Y-ProseMirror

**File:** `y-prosemirror+1.3.7.patch`

**Issue:**
Missing support for CellSelection and other selection types in collaborative editing.

**Fix:**
Backports code from PR https://github.com/yjs/y-prosemirror/pull/182 which adds support for complex selection types.

**Upstream:**
This fix exists in a PR. Patch can be removed once PR is merged and released.

## Creating/Updating Patches

1. Make changes to files in node_modules
2. Run: `yarn patch-package <package-name>`
3. Commit the generated .patch file
4. The patch will be automatically applied on next `yarn install`

## Resources

- [patch-package documentation](https://github.com/ds300/patch-package)
- [Node.js Packages documentation](https://nodejs.org/api/packages.html)
- [Conditional Exports](https://nodejs.org/api/packages.html#conditional-exports)
