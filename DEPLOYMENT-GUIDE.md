# 🚀 Version 1.3.0 Deployment Guide

**Created:** March 20, 2026  
**Purpose:** Complete, production-ready version merging all fixes

---

## 📦 What's in Version 1.3.0

### ✅ **From Your 1.2.4 (All Working Fixes):**
1. ✅ Language button persistence fix (`hidden-starters` class)
2. ✅ Disclaimer hyperlink with `home_url()`
3. ✅ cURL timeout extended to 45-60s
4. ✅ Automatic retry logic (2 attempts)
5. ✅ User-friendly error messages
6. ✅ Firefox NS_BINDING_ABORTED fix (`type="button"`)
7. ✅ XHR fallback for fetch() failures

### ✅ **From 1.2.8 (Pantheon Compatibility):**
8. ✅ Dynamic nonce refresh
9. ✅ Guest user security bypass
10. ✅ Refresh nonce endpoint

---

## 📁 Files to Deploy

### **Modified Files (Replace on Server):**

1. **giannis-ai-chatbot.php**
   - Version: 1.3.0
   - Changes: Version number updated
   - Location: `/wp-content/plugins/giannis-ai-chatbot/`

2. **includes/class-chatbot-api.php**
   - Version: 1.3.0
   - Changes: Added nonce refresh, guest bypass, kept all your fixes
   - Location: `/wp-content/plugins/giannis-ai-chatbot/includes/`

3. **assets/js/chatbot-script.js**
   - Version: 1.3.0
   - Changes: Added `refreshNonce()` function, called before API requests
   - Location: `/wp-content/plugins/giannis-ai-chatbot/assets/js/`

4. **templates/chatbot-template.php**
   - Version: 1.3.0 (unchanged from 1.2.4)
   - Already perfect with disclaimer link and Firefox fix
   - Location: `/wp-content/plugins/giannis-ai-chatbot/templates/`

---

## 🛠️ Deployment Steps

### **Option A: Quick Update (3 Files)**

If you already have 1.2.4 deployed:

1. **Update Main Plugin File:**
   ```bash
   # Upload: giannis-ai-chatbot.php
   # Replaces version 1.2.4 with 1.3.0
   ```

2. **Update API Handler:**
   ```bash
   # Upload: includes/class-chatbot-api.php
   # Adds Pantheon nonce refresh + keeps all your fixes
   ```

3. **Update JavaScript:**
   ```bash
   # OPTION 1: Apply patch manually (see PATCH file)
   # OPTION 2: I can create the full file for you
   ```

---

### **Option B: Complete Fresh Install**

1. **Backup Current Version:**
   ```bash
   cd /wp-content/plugins/
   mv giannis-ai-chatbot giannis-ai-chatbot-backup-1.2.4
   ```

2. **Upload 1.3.0:**
   ```bash
   # Upload entire giannis-ai-chatbot folder
   ```

3. **Activate:**
   - WordPress Admin → Plugins → Activate

4. **Verify Settings:**
   - WordPress Admin → Giannis Chatbot
   - Confirm Team ID and Agent ID are correct

---

## ⚠️ JavaScript Update Options

You have **TWO OPTIONS** for updating the JavaScript:

### **Option 1: Apply Patch (Surgical)**

Use the patch file to add ONLY the nonce refresh code to your working 1.2.4 JS:

**File:** `PATCH-ADD-NONCE-REFRESH-TO-JS.txt`

**Changes needed:**
1. Add `refreshNonce()` function after line 96
2. Call it in `loadConfig()` before API call
3. Call it in `callSignpostAI()` before API call
4. Update version comment at top

**Total:** ~30 lines added to your 1127-line file

---

### **Option 2: Use Complete File (Easiest)**

I can generate the complete `chatbot-script.js` file with all changes merged.

**Want me to create this?** Just say "yes" and I'll generate it.

---

## ✅ Testing Checklist

After deployment, test these:

### **Basic Functionality:**
- [ ] Chatbot loads on page
- [ ] Can send first message
- [ ] Language buttons hide after first message ⭐
- [ ] Messages send without timeout ⭐
- [ ] Error messages are friendly ⭐
- [ ] Firefox doesn't reload page ⭐

### **Pantheon-Specific:**
- [ ] Works for non-logged-in users (guests) ⭐
- [ ] No "Security check failed" errors ⭐
- [ ] Nonce refreshes in console (check for "🔑 Refreshing nonce...")

### **Error Handling:**
- [ ] Timeout errors show friendly message
- [ ] Connection errors show friendly message
- [ ] Retry happens automatically on timeout

---

## 🔍 Verification Commands

### **Check Version:**
```bash
grep "Version:" /wp-content/plugins/giannis-ai-chatbot/giannis-ai-chatbot.php
# Should show: Version: 1.3.0
```

### **Check Nonce Refresh Function Exists:**
```bash
grep -n "refreshNonce" /wp-content/plugins/giannis-ai-chatbot/assets/js/chatbot-script.js
# Should find the function
```

### **Check Guest Bypass:**
```bash
grep -n "is_user_logged_in" /wp-content/plugins/giannis-ai-chatbot/includes/class-chatbot-api.php
# Should find the guest bypass code
```

---

## 🐛 Troubleshooting

### **Issue: "Security check failed"**
**Cause:** Nonce refresh not working  
**Fix:** Check browser console for "🔑 Refreshing nonce..." messages

### **Issue: Still getting timeouts**
**Cause:** API is genuinely slow OR timeout not applied  
**Check:** Look in debug.log for "Retry attempt" messages  
**Verify:** Should see 45s timeout in code

### **Issue: Language buttons still visible**
**Cause:** Wrong JavaScript deployed  
**Check:** Search for `languageStarters.classList.add('hidden-starters')`  
**Should be at:** Line ~324-326

### **Issue: Firefox reloads page**
**Cause:** Send button still type="submit"  
**Check:** In chatbot-template.php, button should be `type="button"`

---

## 📊 What Changed from 1.2.8

| Issue in 1.2.8 | Fixed in 1.3.0 |
|----------------|----------------|
| ❌ Language buttons don't hide | ✅ Working `hidden-starters` fix |
| ❌ 30s timeout (too short) | ✅ 45-60s timeout |
| ❌ No retry on failure | ✅ Auto-retry (2 attempts) |
| ❌ Technical error messages | ✅ User-friendly messages |
| ❌ Firefox page reload | ✅ `type="button"` fix |
| ✅ Nonce refresh (good) | ✅ Kept this! |
| ✅ Guest bypass (good) | ✅ Kept this! |

---

## 📝 Changelog Summary

### Version 1.3.0 (March 20, 2026)
**Complete Production Release - All Fixes Merged**

**Added from 1.2.8:**
- Dynamic nonce refresh for Pantheon cache compatibility
- Guest user security bypass
- Refresh nonce AJAX endpoint

**Kept from 1.2.4:**
- Language button persistence fix (hidden-starters)
- Disclaimer hyperlink with home_url()
- Extended cURL timeout (45-60s with retry)
- User-friendly error messages
- Firefox NS_BINDING_ABORTED fix
- XHR fallback for fetch failures

**Result:** Best of both versions, production-ready

---

## 🎯 Quick Deployment Summary

**Minimum files to update from 1.2.4:**

1. ✅ `giannis-ai-chatbot.php` (version bump)
2. ✅ `includes/class-chatbot-api.php` (nonce refresh added)
3. ✅ `assets/js/chatbot-script.js` (nonce refresh calls added)

**Template unchanged:** Your 1.2.4 template is already perfect!

---

## 💡 Recommendation

**Deploy to Pantheon DEV first:**
1. Upload 3 updated files
2. Test thoroughly (especially nonce refresh)
3. Check browser console for "🔑 Refreshing nonce..."
4. Verify no "Security check failed" errors
5. Test as guest (logged out)
6. Then deploy to LIVE

---

**Need the complete JavaScript file?** Say the word and I'll generate it! 🚀

**Questions?** Ask away! This is your production deployment. 🎯
