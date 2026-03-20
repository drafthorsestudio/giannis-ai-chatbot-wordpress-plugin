# FIX: cURL Timeout Error

## 🔴 The Error You're Seeing

```
Connection error: cURL error 28: Operation timed out after 30000 milliseconds with 0 bytes received
```

This means your WordPress server is trying to reach the Signpost AI API but it's taking longer than 30 seconds.

---

## ✅ SOLUTION (3 Steps)

### Step 1: Update the API Handler

Replace this file:
```
/wp-content/plugins/giannis-ai-chatbot/includes/class-chatbot-api.php
```

With: **[class-chatbot-api.php](computer:///home/claude/class-chatbot-api.php)**

**What this fixes:**
- ✅ Increases timeout from 30s to 45s (60s on retry)
- ✅ Adds automatic retry logic (tries twice)
- ✅ Better error messages for users
- ✅ Logs errors for debugging

---

### Step 2: Update JavaScript Error Handling

Open your `script.js` file and replace the `callSignpostAI` function with the code from:

**[script-error-handling-patch.js](computer:///home/claude/script-error-handling-patch.js)**

**What this fixes:**
- ✅ Shows user-friendly error messages (not technical errors)
- ✅ Auto-removes typing indicator after 60s
- ✅ Better error detection and handling

---

### Step 3: Check Your Server Configuration

#### A) PHP Timeout Settings

Your WordPress server might have timeout limits. Check:

**In wp-config.php**, add:
```php
define('WP_HTTP_BLOCK_EXTERNAL', false);
set_time_limit(300); // 5 minutes
```

**In .htaccess**, add:
```apache
php_value max_execution_time 300
php_value max_input_time 300
```

#### B) Check Firewall/Security

If you're using:
- **Cloudflare**: May have timeout limits (free plan = 100s)
- **Wordfence**: May be blocking API requests
- **ModSecurity**: May be blocking external requests

**Test:** Temporarily disable security plugins and test again.

#### C) Check Hosting Provider Limits

Some hosts have strict timeout limits:
- **Shared hosting**: Often 30-60s max
- **WP Engine**: 60s default
- **Kinsta**: 300s default
- **SiteGround**: 30s default

Contact your host to increase `max_execution_time`.

---

## 🔍 DIAGNOSIS

### Is it the API or Your Server?

Test the Signpost AI API directly:

```bash
curl -X POST https://signpost-ia-app.azurewebsites.net/agent \
  -H "Content-Type: application/json" \
  -d '{
    "id": YOUR_AGENT_ID,
    "team_id": "YOUR_TEAM_ID",
    "message": "test",
    "uid": "test123"
  }' \
  --max-time 60
```

**If it times out:** The Signpost AI API is slow/down.
**If it responds:** Your WordPress server has restrictions.

---

## 🎯 QUICK FIXES (While You Wait for Full Fix)

### Option 1: Show Better Error Message

Until you fix the timeout, at least show a nice message:

In your **script.js**, find the `catch` block and change to:

```javascript
catch (error) {
    removeTypingIndicator(typingId);
    appendMessage('bot', "⚠️ I'm taking longer than usual to respond. The AI service might be busy. Please try again in a moment.");
}
```

### Option 2: Add "Retry" Button

Show a retry button when timeout occurs:

```javascript
catch (error) {
    removeTypingIndicator(typingId);
    const retryMsg = `
        ⚠️ Connection timeout. 
        <button onclick="retrySendMessage('${userMessage}')" style="
            background: #FFC20E;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 8px;
        ">
            🔄 Retry
        </button>
    `;
    appendMessage('bot', retryMsg);
}

// Add this function
function retrySendMessage(message) {
    // Remove the error message
    const lastMessage = chatMessages.lastElementChild;
    if (lastMessage) lastMessage.remove();
    
    // Re-add user message and send
    callSignpostAI(message);
}
```

---

## 🛠️ DEBUGGING

### Check WordPress Error Logs

Look in:
```
/wp-content/debug.log
```

You should see entries like:
```
Giannis Chatbot API Request: {...}
Giannis Chatbot API Error: cURL error 28...
```

### Enable More Detailed Logging

In the updated `class-chatbot-api.php`, the errors are already logged. Check your debug.log for:

```
Giannis Chatbot: Retry attempt 1 due to timeout
Giannis Chatbot API Error: [error details]
```

### Test from WordPress Admin

Add this to your functions.php temporarily:

```php
add_action('admin_notices', function() {
    if (isset($_GET['test_giannis_api'])) {
        $api = Giannis_Chatbot_API::get_instance();
        $result = $api->test_connection();
        echo '<div class="notice notice-' . ($result['success'] ? 'success' : 'error') . '">';
        echo '<p>' . $result['message'] . '</p>';
        if (isset($result['technical'])) {
            echo '<p><small>' . $result['technical'] . '</small></p>';
        }
        echo '</div>';
    }
});
```

Then visit: `yoursite.com/wp-admin/?test_giannis_api=1`

---

## 📊 COMMON CAUSES & SOLUTIONS

| Cause | Solution |
|-------|----------|
| Signpost AI API is slow | Wait and retry, or contact Signpost support |
| WordPress timeout too short | Increase in wp-config.php and .htaccess |
| Hosting provider limits | Contact host to increase limits |
| Firewall blocking | Whitelist Signpost AI domain |
| SSL certificate issue | Set `sslverify => false` in API handler |
| Server under heavy load | Upgrade hosting or use caching |

---

## ✅ AFTER APPLYING FIX

You should see:
- ✅ Longer wait time before timeout (45-60s instead of 30s)
- ✅ Automatic retry on first timeout
- ✅ User-friendly error message instead of technical error
- ✅ Better logging in debug.log

**Error still happening?** The Signpost AI API might genuinely be slow or down. Contact their support.

---

## 🚨 EMERGENCY FALLBACK

If nothing works and you need the chatbot working NOW:

**Add a "Contact Form" fallback:**

```javascript
catch (error) {
    removeTypingIndicator(typingId);
    appendMessage('bot', `
        ⚠️ I'm having trouble connecting right now. 
        
        You can also reach us directly:
        📧 Email: your-email@example.com
        📞 Phone: (555) 123-4567
    `);
}
```

This way users aren't stuck when the API is down.

---

## 📞 NEED MORE HELP?

Share with me:
1. Your WordPress error log entries (look for "Giannis Chatbot")
2. Result of the cURL test above
3. Your hosting provider name
4. Any firewall/security plugins you're using

I can give more specific guidance based on your setup!
