<?php
/**
 * Giannis AI Chatbot Template
 * 
 * This template renders the chatbot interface when the [giannis_chatbot] shortcode is used.
 * 
 * @package Giannis_AI_Chatbot
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get shortcode attributes (passed from shortcode handler)
$height = isset($atts['height']) ? esc_attr($atts['height']) : '600px';
$width = isset($atts['width']) ? esc_attr($atts['width']) : '100%';
$plugin_url = GIANNIS_CHATBOT_PLUGIN_URL;
?>

<div class="giannis-chatbot-wrapper" style="height: <?php echo $height; ?>; width: <?php echo $width; ?>;">
    <div class="app-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="logo-container">
                <div class="logo-icon">
                    <img src="<?php echo esc_url($plugin_url . 'assets/images/giannis-logo-grey.png'); ?>" alt="<?php esc_attr_e('Giannis Logo', 'giannis-ai-chatbot'); ?>">
                </div>
                <h1><?php esc_html_e('Giannis AI', 'giannis-ai-chatbot'); ?></h1>
            </div>

            <!-- Primary Actions -->
            <div class="sidebar-actions">
                <button class="new-chat-btn" id="newChatBtn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <?php esc_html_e('New Chat', 'giannis-ai-chatbot'); ?>
                </button>

                <a href="https://form.typeform.com/to/rpVbmnoi" target="_blank" rel="noopener noreferrer" class="feedback-btn" id="feedbackBtn"
                    title="<?php esc_attr_e('Share your feedback', 'giannis-ai-chatbot'); ?>">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        <circle cx="9" cy="10" r="1"></circle>
                        <circle cx="15" cy="10" r="1"></circle>
                        <path d="M9 14.5s1.5 1.5 3 1.5 3-1.5 3-1.5"></path>
                    </svg>
                    <?php esc_html_e('Give Feedback', 'giannis-ai-chatbot'); ?>
                </a>
            </div>

            <div class="history-list" id="historyList">
                <!-- History items will be added dynamically via JavaScript -->
            </div>

            <!-- Sidebar Footer -->
            <div class="sidebar-footer">
                <button class="theme-toggle" id="themeToggle" aria-label="<?php esc_attr_e('Toggle theme', 'giannis-ai-chatbot'); ?>">
                    <svg id="themeIcon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                </button>

                <button class="sidebar-toggle" id="sidebarToggle" aria-label="<?php esc_attr_e('Toggle Sidebar', 'giannis-ai-chatbot'); ?>">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                </button>
            </div>
        </aside>

        <!-- Main Chat Area -->
        <main class="chat-interface" id="chatInterface">
            <header class="mobile-header">
                <div class="logo-text"><?php esc_html_e('Giannis AI', 'giannis-ai-chatbot'); ?></div>
            </header>

            <!-- Welcome Screen (Initial State) -->
            <div class="welcome-container" id="welcomeScreen">
                <div class="welcome-logo">
                    <img id="welcomeLogoImg" src="<?php echo esc_url($plugin_url . 'assets/images/giannis-logo.png'); ?>" alt="<?php esc_attr_e('Giannis Logo', 'giannis-ai-chatbot'); ?>">
                </div>
                <h2 class="welcome-text">
                    <span id="dynamicVerb" class="dynamic-verb"><?php esc_html_e('Ask', 'giannis-ai-chatbot'); ?></span>
                    <span class="static-noun"><span class="yellow-text"><?php esc_html_e('Giannis', 'giannis-ai-chatbot'); ?>,</span></span>
                    <span id="dynamicSuffix" class="dynamic-suffix"><?php esc_html_e('start by saying Hi', 'giannis-ai-chatbot'); ?></span>
                </h2>
            </div>

            <div class="chat-messages hidden" id="chatMessages">
                <!-- Messages will appear here dynamically via JavaScript -->
            </div>

            <div class="input-area-container centered" id="inputAreaContainer">
                <div class="input-area">
                    <form id="chatForm" class="chat-form">
                        <div class="input-wrapper">
                            <textarea id="userInput" placeholder="<?php esc_attr_e('Message Giannis...', 'giannis-ai-chatbot'); ?>" rows="1"></textarea>
                            <button type="submit" id="sendBtn" disabled aria-label="<?php esc_attr_e('Send message', 'giannis-ai-chatbot'); ?>">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                                    width="20" height="20">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            </button>
                        </div>
                    </form>
                    <div class="disclaimer"><?php esc_html_e('Giannis can make mistakes as it is still in a pilot phase. Check important info.', 'giannis-ai-chatbot'); ?></div>
                </div>
            </div>
        </main>
    </div>
</div>

<style>
/* CRITICAL INLINE STYLES - Ensures core layout works even if external CSS fails */
.giannis-chatbot-wrapper {
    display: block !important;
    position: relative !important;
    overflow: hidden !important;
    border-radius: 12px !important;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1) !important;
    margin: 2rem 0 !important;
    background-color: #f8f9fa !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    font-size: 16px !important;
    line-height: 1.5 !important;
    color: #1a1a1a !important;
    min-height: 600px !important;
}

.giannis-chatbot-wrapper *,
.giannis-chatbot-wrapper *::before,
.giannis-chatbot-wrapper *::after {
    box-sizing: border-box !important;
}

/* THE MOST CRITICAL LAYOUT RULES */
.giannis-chatbot-wrapper .app-container {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    height: 100% !important;
    min-height: 600px !important;
    width: 100% !important;
}

.giannis-chatbot-wrapper .sidebar {
    width: 280px !important;
    min-width: 280px !important;
    max-width: 280px !important;
    background-color: rgba(0, 0, 0, 0.95) !important;
    color: #ffffff !important;
    display: flex !important;
    flex-direction: column !important;
    flex-shrink: 0 !important;
    padding: 1.5rem !important;
}

.giannis-chatbot-wrapper .chat-interface {
    flex: 1 !important;
    min-width: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    background-color: #f8f9fa !important;
}

/* Bricks Builder specific overrides */
#brx-content .giannis-chatbot-wrapper .app-container {
    display: flex !important;
    flex-direction: row !important;
}

#brx-content .giannis-chatbot-wrapper .sidebar {
    width: 280px !important;
    flex-shrink: 0 !important;
}
</style>
