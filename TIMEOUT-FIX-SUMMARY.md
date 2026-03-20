# QUICK ACTION: Fix Timeout Error

## The Error
```
cURL error 28: Operation timed out after 30000 milliseconds
```

## The Fix (2 Files to Update)

### 1. Update API Handler ⏱️

**File:** `/wp-content/plugins/giannis-ai-chatbot/includes/class-chatbot-api.php`

**Download:** [class-chatbot-api.php](computer:///home/claude/class-chatbot-api.php)

**Changes:**
- Timeout increased: 30s → 45s (60s on retry)
- Automatic retry (tries twice)
- User-friendly error messages
- Better logging

### 2. Update JavaScript 💬

**File:** `/wp-content/plugins/giannis-ai-chatbot/assets/js/script.js`

**Patch:** [script-error-handling-patch.js](computer:///home/claude/script-error-handling-patch.js)

**Replace the `callSignpostAI` function** with the improved version.

**Changes:**
- Shows friendly errors (not technical jargon)
- Auto-removes typing indicator after 60s
- Better error detection

---

## After Updating

Users will see better messages like:
- ✅ "The AI service is taking longer than expected. Please try again."
- ✅ "Connection lost. Please check your internet."

Instead of:
- ❌ "Connection error: cURL error 28: Operation timed out..."

---

## Still Getting Timeouts?

### Check Your Server

**Option A:** Add to `wp-config.php`:
```php
set_time_limit(300);
```

**Option B:** Contact your hosting provider to increase timeout limits.

**Option C:** The Signpost AI API might actually be slow/down. Test it directly:
```bash
curl -X POST https://signpost-ia-app.azurewebsites.net/agent \
  -H "Content-Type: application/json" \
  -d '{"id": YOUR_AGENT_ID, "team_id": "YOUR_TEAM_ID", "message": "test"}' \
  --max-time 60
```

---

## Display Issues?

For the layout/styling issues you mentioned, see:
- [QUICK-FIX-CHECKLIST.md](computer:///home/claude/QUICK-FIX-CHECKLIST.md)
- [COMPLETE-TROUBLESHOOTING-GUIDE.md](computer:///home/claude/COMPLETE-TROUBLESHOOTING-GUIDE.md)

---

## Complete Guide

Full details: [FIX-CURL-TIMEOUT-ERROR.md](computer:///home/claude/FIX-CURL-TIMEOUT-ERROR.md)
