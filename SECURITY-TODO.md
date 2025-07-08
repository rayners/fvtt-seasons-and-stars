# Security Improvements TODO

## XSS Vulnerabilities (Not flagged by CodeQL but should be addressed)

### Tag Highlighting HTML Injection

**Risk Level**: High  
**Files Affected**:

- `src/ui/note-editing-dialog.ts` lines 380-385
- `src/ui/calendar-grid-widget.ts` lines 1303-1308

**Issue**: Direct HTML string concatenation without escaping in tag autocomplete highlighting

```typescript
// UNSAFE - allows XSS if malicious content in tag names
const highlighted =
  tagToMatch.substring(0, index) +
  '<span class="tag-match">' +
  tagToMatch.substring(index, index + search.length) +
  '</span>' +
  tagToMatch.substring(index + search.length);
```

**Recommended Fix**:

1. Add HTML escaping utility function
2. Escape all user input before building HTML
3. Consider using DOM methods instead of string concatenation

```typescript
// SAFE approach
private escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const highlighted =
  this.escapeHTML(tagToMatch.substring(0, index)) +
  '<span class="tag-match">' +
  this.escapeHTML(tagToMatch.substring(index, index + search.length)) +
  '</span>' +
  this.escapeHTML(tagToMatch.substring(index + search.length));
```

**Alternative**: Use Foundry's `TextEditor.cleanHTML()` if available

## Code Quality Improvements

### Regex Fallback Consolidation

**Risk Level**: Medium  
**File**: `src/core/calendar-loader.ts` lines 617-632

**Issue**: Multiple regex-based fallback patterns could be simplified or consolidated now that we have proper Foundry method definitions.

**Status**: To be addressed in current session

---

_This file tracks security improvements not currently flagged by CodeQL but identified through manual code review._
