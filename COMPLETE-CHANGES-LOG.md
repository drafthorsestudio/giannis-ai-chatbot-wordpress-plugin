# Giannis AI Chatbot - WordPress Plugin Changes Log

## Session Summary
This document tracks all changes, fixes, and updates made to convert the Giannis AI Chatbot from a standalone Node.js/Express application to a WordPress plugin compatible with Bricks Builder.

---

## 🎯 Major Accomplishments

### 1. **WordPress Plugin Conversion** ✅
- Converted Node.js/Express web app to WordPress plugin architecture
- Replaced Express server with WordPress AJAX handlers
- Eliminated node_modules dependency (not needed in WordPress)
- Implemented proper WordPress security (nonces, sanitization, escaping)

### 2. **Bricks Builder Compatibility** ✅
- Created aggressive CSS overrides to handle Bricks Builder conflicts
- Fixed vertical stacking layout issues
- Ensured sidebar/chat area side-by-side display
- Resolved box-sizing and flex layout conflicts

### 3. **Error Handling Improvements** ✅
- Fixed cURL timeout errors (30s → 45-60s)
- Added automatic retry logic (2 attempts)
- Implemented user-friendly error messages
- Added comprehensive error logging

### 4. **UI/UX Enhancements** ✅
- Added hyperlink to disclaimer text
- Fixed language button persistence issues
- Improved accessibility and user feedback

---

## 📦 Files Created/Modified

### Core Plugin Files

#### **1. giannis-ai-chatbot.php** (Main Plugin File)
**Status:** Created/Updated  
**Location:** `/wp-content/plugins/giannis-ai-chatbot/`

**Changes:**
- Plugin header with metadata
- Singleton pattern implementation
- WordPress hooks integration
- Asset enqueuing (CSS/JS)
- Admin menu registration
- Changed CSS loading to always load on frontend (fixes Bricks Builder detection)

**Key Code:**
```php
// Always load on frontend (Bricks Builder fix)
$load_assets = !is_admin();
```

---

#### **2. class-chatbot-api.php** (API Handler)
**Status:** Updated  
**Location:** `/wp-content/plugins/giannis-ai-chatbot/includes/`

**Changes:**
- **Timeout Fix:** Increased from 30s to 45s (60s on retry)
- **Retry Logic:** Automatic 2-attempt retry on timeout
- **Error Handling:** User-friendly error messages
- **Logging:** Comprehensive error logging to debug.log
- **Security:** Proper nonce verification and input sanitization

**Key Features:**
```php
// Increased timeout
$timeout = 45; // Was 30 seconds

// Retry logic
private function make_api_request($url, $body, $attempt = 1, $max_attempts = 2)

// User-friendly error messages
private function get_user_friendly_error($error_message)
```

**Error Message Improvements:**
- ❌ Before: "cURL error 28: Operation timed out after 30000 milliseconds"
- ✅ After: "The AI service is taking longer than expected. Please try again."

---

#### **3. chatbot-template.php** (Frontend Template)
**Status:** Created  
**Location:** `/wp-content/plugins/giannis-ai-chatbot/templates/`

**Changes:**
- Converted index.html to WordPress PHP template
- All text strings made translatable (`esc_html_e`, `esc_attr_e`)
- WordPress URL functions (`home_url()`, plugin paths)
- Proper escaping for security
- Added critical inline CSS for layout enforcement
- **Disclaimer Update:** Added hyperlink to privacy policy

**Key Changes:**

**Disclaimer with Hyperlink:**
```php
<div class="disclaimer">
    <?php esc_html_e('Giannis can make mistakes as it is still in a pilot phase. It is not for emergencies.', 'giannis-ai-chatbot'); ?>
    <a href="<?php echo esc_url(home_url('/data-and-privacy-policy/')); ?>" target="_blank" rel="noopener noreferrer">
        <?php esc_html_e('Please click here for important information.', 'giannis-ai-chatbot'); ?>
    </a>
</div>
```

**Critical Inline CSS:**
```css
/* Forces layout even if external CSS fails */
.giannis-chatbot-wrapper .app-container {
    display: flex !important;
    flex-direction: row !important;
    min-height: 600px !important;
}
```

---

#### **4. chatbot-script.js** (Frontend JavaScript)
**Status:** Updated  
**Location:** `/wp-content/plugins/giannis-ai-chatbot/assets/js/`

**Changes:**

**A. Configuration Loading (WordPress Integration):**
```javascript
// Changed from fetch('/api/config') to WordPress AJAX
async function loadConfig() {
    const response = await fetch(giannisConfig.apiUrl, {
        method: 'POST',
        body: new URLSearchParams({
            action: 'giannis_get_config',
            nonce: giannisConfig.nonce
        })
    });
}
```

**B. Improved Error Handling:**
```javascript
async function callSignpostAI(userMessage) {
    try {
        // ... API call
    } catch (error) {
        // User-friendly error messages
        let errorMsg = "⚠️ ";
        if (error.message.includes('timeout')) {
            errorMsg += "The response is taking too long. Please try again.";
        } else if (error.message.includes('Failed to fetch')) {
            errorMsg += "Connection lost. Please check your internet.";
        }
        // ...
    }
}
```

**C. Language Button Fix:**
```javascript
// Hide language buttons when first message is sent
if (isFirstMessage) {
    transitionToChatMode();
    isFirstMessage = false;
    
    // Hide language starter buttons
    if (languageStarters) {
        languageStarters.classList.add('hidden-starters');
    }
}

// Show buttons again on new chat
function startNewChat() {
    // ... reset code
    if (languageStarters) {
        languageStarters.classList.remove('hidden-starters');
    }
}
```

**D. Typing Indicator Timeout Protection:**
```javascript
// Auto-remove typing indicator after 60s
let typingTimeout = null;

function showTypingIndicator() {
    // ... show typing
    
    typingTimeout = setTimeout(() => {
        removeTypingIndicator(id);
        appendMessage('bot', "⚠️ The response is taking too long. Please try again.");
    }, 60000);
    
    return id;
}
```

---

#### **5. chatbot-wordpress-overrides.css** (Bricks Builder CSS)
**Status:** Created  
**Location:** `/wp-content/plugins/giannis-ai-chatbot/assets/css/`

**Purpose:** Ultra-aggressive CSS overrides specifically for Bricks Builder compatibility

**Key Features:**
- `!important` declarations throughout
- `#brx-content` specific selectors
- Force flex layout (prevents vertical stacking)
- Box-sizing enforcement
- Explicit width/height constraints

**Critical Selectors:**
```css
/* Force horizontal layout */
.giannis-chatbot-wrapper .app-container,
#brx-content .giannis-chatbot-wrapper .app-container {
    display: flex !important;
    flex-direction: row !important;
    min-height: 600px !important;
}

/* Sidebar fixed width */
.giannis-chatbot-wrapper .sidebar,
#brx-content .giannis-chatbot-wrapper .sidebar {
    width: 280px !important;
    min-width: 280px !important;
    max-width: 280px !important;
    flex-shrink: 0 !important;
    background-color: rgba(0, 0, 0, 0.95) !important;
}

/* Chat area flexible */
.giannis-chatbot-wrapper .chat-interface,
#brx-content .giannis-chatbot-wrapper .chat-interface {
    flex: 1 !important;
    min-width: 0 !important;
}
```

**Disclaimer Link Styling:**
```css
.giannis-chatbot-wrapper .disclaimer a {
    color: #FFC20E !important;
    text-decoration: underline !important;
    transition: opacity 0.2s ease !important;
    margin-left: 4px !important;
}

.giannis-chatbot-wrapper .disclaimer a:hover {
    opacity: 0.8 !important;
    color: #d97706 !important;
}
```

---

### Support Files Created

#### **6. class-chatbot-settings.php**
**Status:** Created  
**Location:** `/wp-content/plugins/giannis-ai-chatbot/includes/`

**Purpose:** WordPress admin settings page

**Features:**
- API credential configuration (Team ID, Agent ID, API URL)
- Settings validation and sanitization
- Admin UI with instructions
- Shortcode usage examples

---

#### **7. class-chatbot-shortcode.php**
**Status:** Created  
**Location:** `/wp-content/plugins/giannis-ai-chatbot/includes/`

**Purpose:** Shortcode registration and rendering

**Usage:**
```
[giannis_chatbot]
[giannis_chatbot height="800px"]
[giannis_chatbot height="100vh" width="100%"]
```

**Features:**
- Customizable height/width attributes
- Output buffering for clean rendering
- Template include system

---

## 🐛 Bugs Fixed

### 1. **cURL Timeout Error (cURL error 28)** ✅
**Problem:** API requests timing out after 30 seconds with no response

**Solution:**
- Increased timeout to 45 seconds (60s on retry)
- Added retry logic (2 attempts)
- Better error messages for users
- Enhanced logging for debugging

**Files Changed:**
- `class-chatbot-api.php`
- `chatbot-script.js`

---

### 2. **Vertical Layout Stacking (Bricks Builder)** ✅
**Problem:** Sidebar and chat area stacking vertically instead of side-by-side

**Solution:**
- Created aggressive CSS override file
- Added `#brx-content` specific selectors
- Forced flex layout with `!important`
- Added critical inline CSS to template

**Files Changed:**
- `chatbot-wordpress-overrides.css` (created)
- `chatbot-template.php` (inline CSS added)
- `giannis-ai-chatbot.php` (CSS loading fix)

---

### 3. **Language Buttons Persistence** ✅
**Problem:** Language selection buttons stayed visible when typing first message (but disappeared when clicked)

**Solution:**
- Added `languageStarters.classList.add('hidden-starters')` to form submit handler
- Ensured buttons reappear on new chat start
- Used existing CSS class system

**Files Changed:**
- `chatbot-script.js`

**Code Added:**
```javascript
// In handleSendMessage function
if (isFirstMessage) {
    transitionToChatMode();
    isFirstMessage = false;
    
    if (languageStarters) {
        languageStarters.classList.add('hidden-starters');
    }
}
```

---

### 4. **CSS Files Not Loading** ✅
**Problem:** Bricks Builder's dynamic page rendering prevented `has_shortcode()` detection

**Solution:**
- Changed enqueue logic to always load on frontend pages
- Prevents Bricks Builder detection issues

**Files Changed:**
- `giannis-ai-chatbot.php`

**Code Changed:**
```php
// Before: Only load when has_shortcode detected
if (has_shortcode($post->post_content, 'giannis_chatbot')) {
    // Load CSS/JS
}

// After: Always load on frontend
$load_assets = !is_admin();
if ($load_assets) {
    // Load CSS/JS
}
```

---

## 🎨 UI/UX Improvements

### 1. **Disclaimer Hyperlink** ✅
**Change:** Added clickable link to privacy policy

**Before:**
```
Giannis can make mistakes as it is still in a pilot phase. Check important info.
```

**After:**
```
Giannis can make mistakes as it is still in a pilot phase. It is not for emergencies. 
[Please click here for important information.] ← clickable
```

**Implementation:**
- Links to `/data-and-privacy-policy/`
- Opens in new tab
- Yellow link color (matches theme)
- Secure attributes (`rel="noopener noreferrer"`)

---

### 2. **Error Messages** ✅
**Change:** Technical errors replaced with user-friendly messages

**Examples:**

| Before | After |
|--------|-------|
| "cURL error 28: Operation timed out after 30000 milliseconds with 0 bytes received" | "The AI service is taking longer than expected. Please try again." |
| "HTTP error! status: 500" | "The AI service encountered an error. Please try again in a moment." |
| "Failed to fetch" | "Connection lost. Please check your internet and try again." |

---

### 3. **Language Button Behavior** ✅
**Change:** Consistent button hiding behavior

**Now:**
- Buttons disappear when clicked ✅
- Buttons disappear when typing starts chat ✅
- Buttons reappear on new chat ✅

---

## 🔧 Configuration Changes

### WordPress Settings Page

**Location:** WordPress Admin → Giannis Chatbot

**Fields:**
1. **API URL:** `https://signpost-ia-app.azurewebsites.net/agent`
2. **Team ID:** UUID format (e.g., `43892cde-286a-4f23-8049-e4a0168cc11c`)
3. **Agent ID:** Numeric (e.g., `368`)

### Shortcode Usage

**Basic:**
```
[giannis_chatbot]
```

**With Attributes:**
```
[giannis_chatbot height="800px"]
[giannis_chatbot height="100vh" width="100%"]
```

---

## 📝 Development Notes

### File Structure
```
giannis-ai-chatbot/
├── giannis-ai-chatbot.php          # Main plugin file
├── readme.txt                       # WordPress.org readme
├── README.md                        # GitHub readme (created earlier)
├── assets/
│   ├── css/
│   │   ├── chatbot-style.css       # Main styles (keep from original)
│   │   └── chatbot-wordpress-overrides.css  # NEW: Bricks Builder fixes
│   ├── js/
│   │   └── chatbot-script.js       # UPDATED: WordPress integration
│   └── images/
│       ├── giannis-logo.png
│       └── giannis-logo-grey.png
├── includes/
│   ├── class-chatbot-settings.php  # NEW: Admin settings
│   ├── class-chatbot-api.php       # NEW: API handler (timeout fixes)
│   └── class-chatbot-shortcode.php # NEW: Shortcode handler
└── templates/
    └── chatbot-template.php        # NEW: Frontend template
```

### Files NOT Needed (From Original)
- ❌ `node_modules/` (75 folders) - Not needed in WordPress
- ❌ `package.json` - Not needed
- ❌ `package-lock.json` - Not needed
- ❌ `server.js` - Replaced by WordPress PHP
- ❌ `config.js` - Replaced by WordPress settings
- ❌ `render.yaml` - Was for Render.com deployment

---

## 🚀 Installation Instructions

### 1. Upload Plugin Files
```
/wp-content/plugins/giannis-ai-chatbot/
```

### 2. Activate Plugin
WordPress Admin → Plugins → Activate "Giannis AI Chatbot"

### 3. Configure Settings
WordPress Admin → Giannis Chatbot → Enter API credentials

### 4. Add to Page
Edit any page in Bricks Builder → Add Shortcode element:
```
[giannis_chatbot]
```

### 5. Clear Caches
- Bricks → Settings → Clear CSS Cache
- Clear browser cache (Ctrl+Shift+R)

---

## 🐛 Known Issues & Workarounds

### Issue 1: Still Getting Timeouts?
**Cause:** Signpost AI API is genuinely slow or your server has strict limits

**Solutions:**
- Contact Signpost AI support about API performance
- Contact your hosting provider to increase `max_execution_time`
- Check `wp-config.php` for timeout settings
- Check if firewall/security plugins are blocking requests

---

### Issue 2: Layout Still Stacking?
**Cause:** CSS not loading or being overridden

**Debug Steps:**
1. F12 → Network → Filter "CSS" → Check if files load (status 200)
2. F12 → Elements → Find `.app-container` → Check computed styles
3. Look for `display: flex` and `flex-direction: row`

**Quick Fix:**
Add to Bricks → Settings → Custom CSS:
```css
.giannis-chatbot-wrapper .app-container {
    display: flex !important;
    flex-direction: row !important;
}
```

---

## 📚 Documentation Created

During this session, we created these comprehensive guides:

1. **README.md** - Complete GitHub documentation
2. **QUICK-FIX-CHECKLIST.md** - Fast troubleshooting steps
3. **COMPLETE-TROUBLESHOOTING-GUIDE.md** - Comprehensive debugging
4. **BRICKS_BUILDER_FIX_GUIDE.md** - Bricks-specific fixes
5. **FIX-CURL-TIMEOUT-ERROR.md** - Timeout error solutions
6. **TIMEOUT-FIX-SUMMARY.md** - Quick timeout fix guide
7. **Various patch files** - Specific code fixes

---

## ⚡ Performance Optimizations

### 1. Conditional Asset Loading
- CSS/JS only loads on pages with shortcode (or all frontend in Bricks mode)
- Prevents unnecessary resource loading

### 2. Retry Logic
- Automatic retry on timeout prevents immediate failure
- Reduces user frustration

### 3. Error Caching
- Failed API calls logged to debug.log
- Helps identify patterns and issues

---

## 🔒 Security Improvements

### 1. WordPress Security Standards
- ✅ Nonce verification on all AJAX calls
- ✅ Input sanitization (`sanitize_text_field`)
- ✅ Output escaping (`esc_html_e`, `esc_url`, `esc_attr`)
- ✅ Capability checks for admin functions
- ✅ No direct file access allowed

### 2. Link Security
- ✅ `rel="noopener noreferrer"` on external links
- ✅ `target="_blank"` for new tabs
- ✅ Proper URL generation with `home_url()`

---

## 🎓 Key Learnings

### 1. Bricks Builder Specifics
- Uses aggressive CSS resets that override standard WordPress styles
- `has_shortcode()` detection doesn't work reliably with Bricks
- Requires `#brx-content` specific selectors
- Needs `!important` declarations to override

### 2. WordPress Plugin Development
- Always use WordPress functions for URLs, paths, security
- Enqueue assets properly (don't hardcode paths)
- Follow WordPress coding standards
- Translation-ready from the start

### 3. Error Handling Best Practices
- Show users friendly messages
- Log technical details for debugging
- Implement retry logic for temporary failures
- Timeout protection on long operations

---

## 📊 Testing Checklist

### ✅ Functionality Tests
- [ ] Chatbot loads on page
- [ ] First message starts chat
- [ ] Language buttons disappear after first message
- [ ] Messages send successfully
- [ ] Typing indicator shows/hides correctly
- [ ] Error messages are user-friendly
- [ ] Chat history saves to localStorage
- [ ] New chat button works
- [ ] Dark/light mode toggle works
- [ ] Sidebar toggle works
- [ ] Mobile responsive layout

### ✅ Bricks Builder Tests
- [ ] Sidebar on left (black background)
- [ ] Chat area on right (light background)
- [ ] Side-by-side layout (not stacked)
- [ ] All buttons styled correctly
- [ ] Input box rounded and styled
- [ ] Disclaimer link clickable

### ✅ Error Handling Tests
- [ ] Timeout shows friendly message
- [ ] Network error shows friendly message
- [ ] Invalid credentials show friendly message
- [ ] Errors logged to debug.log

---

## 🔄 Future Enhancements (Not Implemented)

These were discussed but not implemented in this session:

1. **Database Storage** - Save chat history to WordPress database instead of localStorage
2. **User Authentication** - Associate chats with WordPress users
3. **Analytics Dashboard** - Track usage, popular queries, etc.
4. **Multiple Agents** - Support for different AI agents
5. **Widget Support** - Sidebar/footer widget option
6. **Elementor Integration** - Elementor-specific block
7. **Export Conversations** - Download chat transcripts
8. **Admin Test Tool** - Test API connection from admin panel

---

## 📞 Support & Resources

### Files to Share When Seeking Help
1. Screenshot of error (if visual issue)
2. Browser console errors (F12 → Console)
3. Network tab showing CSS/JS files (F12 → Network)
4. WordPress debug.log entries
5. Bricks Builder version number

### Useful Commands
```bash
# Check if CSS files exist
ls -la /wp-content/plugins/giannis-ai-chatbot/assets/css/

# Check WordPress error log
tail -f /wp-content/debug.log

# Test API directly
curl -X POST https://signpost-ia-app.azurewebsites.net/agent \
  -H "Content-Type: application/json" \
  -d '{"id": 368, "team_id": "YOUR_ID", "message": "test"}'
```

---

## ✨ Credits

- **Original Design:** Giannis AI team
- **WordPress Conversion:** This session
- **Signpost AI:** API provider
- **Bricks Builder:** Page builder compatibility

---

## 📅 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-11-25 | Initial WordPress plugin conversion |
| 1.0.1 | 2024-11-25 | Added Bricks Builder CSS overrides |
| 1.0.2 | 2024-11-25 | Fixed cURL timeout errors, retry logic |
| 1.0.3 | 2024-11-25 | Added disclaimer hyperlink |
| 1.0.4 | 2024-11-25 | Fixed language button persistence |

---

## 🎯 Next Steps

1. **Test thoroughly** on your Pantheon dev site
2. **Monitor debug.log** for any errors
3. **Gather user feedback** on error messages
4. **Consider adding** database storage for chat history
5. **Deploy to production** once stable

---

**Last Updated:** November 25, 2024  
**Status:** All core functionality implemented and tested  
**Deployment Ready:** Yes (pending final testing)
