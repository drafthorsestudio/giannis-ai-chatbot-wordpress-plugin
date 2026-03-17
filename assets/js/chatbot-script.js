let hasChatStarted = false;

/**
 * Giannis AI Chatbot - WordPress Plugin JavaScript
 * Version: 1.2.0 - CACHE-PROOF NONCE REFRESH
 * 
 * This version includes:
 * - Dynamic nonce refresh to survive Pantheon page caching
 * - All API calls routed through admin-ajax.php
 * - Comprehensive emoji text visibility fixes
 */

// Configuration - will be loaded from server

let SIGNPOST_API_URL;
let TEAM_ID;
let AGENT_ID;
let configLoaded = false;

// RTL Detection Function - Detects Arabic script characters
function isRTL(text) {
    // Check for Arabic script characters (Arabic, Arabic Supplement, Arabic Extended-A)
    const rtlPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    return rtlPattern.test(text);
}

/**
 * DYNAMIC NONCE REFRESH
 * Fetches a fresh nonce from a public (nopriv) endpoint.
 * This bypasses Pantheon's page cache, which may serve a stale nonce
 * embedded in the HTML for up to 1 week.
 */
async function refreshNonce() {
    try {
        const response = await fetch(giannisConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'giannis_refresh_nonce'
            })
        });

        const result = await response.json();

        if (result.success && result.data.nonce) {
            giannisConfig.nonce = result.data.nonce;
            console.log('🔑 Nonce refreshed successfully');
        } else {
            console.warn('⚠️ Nonce refresh response was not successful');
        }
    } catch (error) {
        console.error('❌ Failed to refresh nonce:', error);
    }
}

// Load configuration from WordPress
async function loadConfig() {
    try {
        // Always refresh the nonce first (the cached one may be expired)
        await refreshNonce();

        const response = await fetch(giannisConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'giannis_get_config',
                nonce: giannisConfig.nonce
            })
        });

        const result = await response.json();

        if (result.success) {
            SIGNPOST_API_URL = result.data.SIGNPOST_API_URL;
            TEAM_ID = result.data.TEAM_ID;
            AGENT_ID = result.data.AGENT_ID;
            configLoaded = true;
            console.log('✅ Configuration loaded successfully');
        } else {
            throw new Error('Failed to load config');
        }
    } catch (error) {
        console.error('❌ Failed to load configuration:', error);
    }
}

// State Management
let chats = JSON.parse(localStorage.getItem('giannis_chats')) || [];
let currentChatId = null;
let messageAnimationIndex = 0;

// Simplified emoji fix function that doesn't break HTML
function fixEmojiRendering(element, originalText) {
    // List of problematic emojis that cause rendering issues
    const problematicEmojis = ['⚠️', '⚠', '⚡', '🚨', '❗', '❌', '✅', '⭐', '🔴', '🟡', '🟢'];

    // Check if content has problematic emojis
    const hasProblematicEmoji = problematicEmojis.some(emoji => element.textContent.includes(emoji));

    if (hasProblematicEmoji) {
        // Method 1: Force a repaint
        element.style.display = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.display = '';

        // Method 2: Add a class for CSS targeting
        element.classList.add('emoji-content-fixed');

        // Method 3: Add zero-width space after emojis in text nodes only
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            let text = textNode.nodeValue;
            // Add zero-width space after emojis to prevent text hiding
            problematicEmojis.forEach(emoji => {
                text = text.replace(new RegExp(`(${emoji})(?!\\u200B)`, 'g'), '$1\u200B');
            });
            if (text !== textNode.nodeValue) {
                textNode.nodeValue = text;
            }
        });
    }
}

// Wait for both DOM and config to be ready before initializing
document.addEventListener('DOMContentLoaded', async () => {
    // Load configuration first
    await loadConfig();

    if (!configLoaded) {
        console.error('Failed to load configuration. App may not work correctly.');
        alert('Error: Could not load configuration. Please refresh the page.');
        return;
    }

    // Now initialize the app
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const chatMessages = document.getElementById('chatMessages');
    const sendBtn = document.getElementById('sendBtn');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const inputAreaContainer = document.getElementById('inputAreaContainer');
    const chatInterface = document.getElementById('chatInterface');
    const dynamicVerb = document.getElementById('dynamicVerb');
    const dynamicSuffix = document.getElementById('dynamicSuffix');
    const newChatBtn = document.getElementById('newChatBtn');
    const historyList = document.getElementById('historyList');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');

    // Quick Starter Language Buttons - MUST be declared before updateStartersVisibility is called
    const languageStarters = document.getElementById('languageStarters');
    const starterChips = document.querySelectorAll('.starter-chip');

    let isFirstMessage = true;
    let dynamicTextInterval = null;

    // Function to update starters visibility - defined before startNewChat which calls it
    function updateStartersVisibility() {
        if (!languageStarters) return;

        // Show starters only if chat is empty (no messages and it's a new chat)
        if (isFirstMessage && chatMessages.children.length === 0) {
            languageStarters.classList.remove('hidden-starters');
        } else {
            languageStarters.classList.add('hidden-starters');
        }
    }

    // Initialize UI
    initializeTheme();
    renderSidebar();
    startNewChat(); // Start with a fresh state

    // Theme Toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        const sidebar = document.querySelector('.sidebar');
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // New Chat Button
    newChatBtn.addEventListener('click', () => {
        startNewChat();
    });

    // Clear All Chats Button
    const clearAllBtn = document.getElementById('chatbot-clear-all');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (confirm('Sei sicuro di voler cancellare tutte le conversazioni? Questa azione non può essere annullata.')) {
                // Clear all chats from localStorage
                chats = [];
                localStorage.removeItem('giannis_chats');

                // Re-render empty sidebar
                renderSidebar();

                // Reset to new chat state
                startNewChat();

                console.log('✅ Tutte le chat sono state cancellate');
            }
        });
    }

    // Initialize starters visibility
    updateStartersVisibility();

    // Add click listeners to starter chips
    starterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const message = chip.getAttribute('data-message');
            if (message) {
                // Set the message in the input field
                userInput.value = message;

                // Enable send button
                sendBtn.removeAttribute('disabled');

                // Hide starters immediately
                if (languageStarters) {
                    languageStarters.classList.add('hidden-starters');
                }

                // Trigger form submission
                chatForm.dispatchEvent(new Event('submit'));

                console.log(`🚀 Quick starter used: "${message}"`);
            }
        });
    });

    // Auto-resize textarea
    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';

        if (this.value.trim().length > 0) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    // Handle Enter key
    userInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim().length > 0) {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        let chat = null;

        // Handle First Message Transition
        if (isFirstMessage) {
            transitionToChatMode();
            isFirstMessage = false;

            // Create new chat if we don't have an ID yet
            if (!currentChatId) {
                currentChatId = Date.now().toString();
                const isTemp = message.length < 25; // Treat short messages as temporary titles
                const newChat = {
                    id: currentChatId,
                    title: message.substring(0, 35) + (message.length > 35 ? '...' : ''),
                    messages: [],
                    isTempTitle: isTemp
                };
                chats.unshift(newChat); // Add to beginning
                saveChats();
                renderSidebar();
                chat = newChat;
            }
        } else {
            // Retrieve existing chat
            chat = chats.find(c => c.id === currentChatId);

            // Smart Title Update: If title is temporary, try to update it with a more meaningful message
            if (chat && chat.isTempTitle) {
                // Update title if the new message is longer than the current title OR if the new message is "long enough"
                if (message.length > chat.title.length || message.length > 10) {
                    chat.title = message.substring(0, 35) + (message.length > 35 ? '...' : '');
                    // If this message is substantial, lock the title
                    if (message.length >= 25) {
                        chat.isTempTitle = false;
                    }
                    saveChats();
                    renderSidebar();
                }
            }
        }

        // Add user message to UI and State
        appendMessage('user', message);
        saveMessageToState('user', message);

        // Clear input
        userInput.value = '';
        userInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        /* --- GA4 TRACKING START --- */
        if (typeof gtag === 'function') {
            // Track every message sent
            gtag('event', 'giannis_message_sent', {
                'event_category': 'Chatbot',
                'event_label': 'User Query'
            });

            // Track chat start (only once per session)
            if (!hasChatStarted) {
                gtag('event', 'giannis_chat_start', {
                    'event_category': 'Chatbot',
                    'event_label': 'First Interaction'
                });
                hasChatStarted = true;
            }
        }
        /* --- GA4 TRACKING END --- */

        // Call API
        await callSignpostAI(message);
    });

    function startNewChat() {
        currentChatId = null;
        isFirstMessage = true;

        // Reset UI
        welcomeScreen.classList.remove('hidden');
        chatMessages.classList.add('hidden');
        chatMessages.innerHTML = ''; // Clear messages
        inputAreaContainer.classList.add('centered');

        // Reset active state in sidebar
        document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));

        // Restart animation
        startDynamicTextAnimation();

        // Show quick starters again
        updateStartersVisibility();
    }

    function loadChat(chatId) {
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;

        currentChatId = chatId;
        isFirstMessage = false;

        // Update UI for Chat Mode
        welcomeScreen.classList.add('hidden');
        chatMessages.classList.remove('hidden');
        inputAreaContainer.classList.remove('centered');
        stopDynamicTextAnimation();

        // Clear and Render Messages
        chatMessages.innerHTML = '';
        chat.messages.forEach(msg => {
            appendMessage(msg.role, msg.content, false, true); // true = skip typewriter for loaded messages
        });
        scrollToBottom();

        // Update Sidebar Active State
        renderSidebar();

        // Hide quick starters (existing chat has messages)
        updateStartersVisibility();
    }

    function saveMessageToState(role, content) {
        if (!currentChatId) return;

        const chatIndex = chats.findIndex(c => c.id === currentChatId);
        if (chatIndex !== -1) {
            chats[chatIndex].messages.push({ role, content });
            saveChats();
        }
    }

    function saveChats() {
        localStorage.setItem('giannis_chats', JSON.stringify(chats));
    }

    function renderSidebar() {
        historyList.innerHTML = '';
        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;

            // Title Span
            const titleSpan = document.createElement('span');
            titleSpan.className = 'chat-title';
            titleSpan.textContent = chat.title;

            // Actions Container
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'chat-actions';

            // Rename Button
            const renameBtn = document.createElement('button');
            renameBtn.className = 'action-btn rename-btn';
            renameBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
            renameBtn.title = "Rename";
            renameBtn.onclick = (e) => {
                e.stopPropagation();
                startRenaming(chat.id, item, titleSpan);
            };

            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete-btn';
            deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
            deleteBtn.title = "Delete";
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteChat(chat.id);
            };

            actionsDiv.appendChild(renameBtn);
            actionsDiv.appendChild(deleteBtn);

            item.appendChild(titleSpan);
            item.appendChild(actionsDiv);

            item.addEventListener('click', (e) => {
                // Don't trigger load if we are clicking inside an input (renaming)
                if (e.target.tagName === 'INPUT') return;
                loadChat(chat.id);
            });

            historyList.appendChild(item);
        });
    }

    function deleteChat(chatId) {
        if (confirm('Are you sure you want to delete this chat?')) {
            chats = chats.filter(c => c.id !== chatId);
            saveChats();

            if (currentChatId === chatId) {
                startNewChat();
            } else {
                renderSidebar();
            }
        }
    }

    function startRenaming(chatId, itemElement, titleElement) {
        const currentTitle = titleElement.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'rename-input';
        input.value = currentTitle;

        // Replace title with input
        itemElement.replaceChild(input, titleElement);
        input.focus();

        const save = () => {
            const newTitle = input.value.trim();
            if (newTitle) {
                const chat = chats.find(c => c.id === chatId);
                if (chat) {
                    chat.title = newTitle;
                    chat.isTempTitle = false; // Manual rename locks the title
                    saveChats();
                }
            }
            renderSidebar();
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                save();
            } else if (e.key === 'Escape') {
                renderSidebar(); // Revert
            }
        });

        input.addEventListener('blur', save);
        input.onclick = (e) => e.stopPropagation();
    }

    function transitionToChatMode() {
        welcomeScreen.classList.add('hidden');
        inputAreaContainer.classList.remove('centered');
        chatMessages.classList.remove('hidden');
        stopDynamicTextAnimation();
    }

    function startDynamicTextAnimation() {
        if (dynamicTextInterval) clearInterval(dynamicTextInterval);

        const phrases = [
            { verb: "Ask", suffix: "start by saying Hi" },
            { verb: "Chiedi a", suffix: "inizia dicendo Ciao" },
            { verb: "Demande à", suffix: "commence par dire Salut" },
            { verb: "Pregunta a", suffix: "empieza diciendo Hola" },
            { verb: "Fragen sie", suffix: "beginnen sie mit Hallo" },
            { verb: "اسأل", suffix: "ابدأ بقول مرحب" }
        ];

        let index = 0;

        // Initial State
        if (dynamicVerb && dynamicSuffix) {
            dynamicVerb.textContent = phrases[0].verb;
            dynamicSuffix.textContent = phrases[0].suffix;

            dynamicVerb.style.opacity = '1';
            dynamicVerb.style.transform = 'translateY(0)';
            dynamicSuffix.style.opacity = '1';
            dynamicSuffix.style.transform = 'translateY(0)';

            dynamicTextInterval = setInterval(() => {
                // Fade out
                dynamicVerb.style.opacity = '0';
                dynamicVerb.style.transform = 'translateY(10px)';
                dynamicSuffix.style.opacity = '0';
                dynamicSuffix.style.transform = 'translateY(10px)';

                setTimeout(() => {
                    // Change text
                    index = (index + 1) % phrases.length;
                    dynamicVerb.textContent = phrases[index].verb;
                    dynamicSuffix.textContent = phrases[index].suffix;

                    // Fade in
                    dynamicVerb.style.opacity = '1';
                    dynamicVerb.style.transform = 'translateY(0)';
                    dynamicSuffix.style.opacity = '1';
                    dynamicSuffix.style.transform = 'translateY(0)';
                }, 600);

            }, 3000);
        }
    }

    function stopDynamicTextAnimation() {
        if (dynamicTextInterval) {
            clearInterval(dynamicTextInterval);
            dynamicTextInterval = null;
        }
    }

    // EMOJI FIX: Modified typewriter effect function
    function typewriterEffect(element, htmlContent, speed = 5) {
        // Check if content has problematic emojis
        const hasProblematicEmoji = /[⚠⚡❗❌✅⭐🔴🟡🟢☢☣]/.test(htmlContent);

        if (hasProblematicEmoji) {
            // For messages with problematic emojis, use a different approach
            // Insert the content all at once but with a fade-in effect
            element.innerHTML = htmlContent;

            // Apply emoji fix immediately
            fixEmojiRendering(element, htmlContent);

            // Animate with fade instead of typewriter
            element.style.opacity = '0';
            element.style.transition = 'opacity 0.5s ease-in';
            setTimeout(() => {
                element.style.opacity = '1';
                scrollToBottom();
            }, 10);

            return Promise.resolve();
        }

        // Original typewriter code for non-emoji messages
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        element.innerHTML = '';

        let currentIndex = 0;
        const nodes = Array.from(tempDiv.childNodes);

        function typeNode(node) {
            return new Promise((resolve) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent;
                    let charIndex = 0;
                    const textNode = document.createTextNode('');
                    element.appendChild(textNode);

                    function typeChar() {
                        if (charIndex < text.length) {
                            textNode.textContent += text[charIndex];
                            charIndex++;
                            scrollToBottom();
                            setTimeout(typeChar, speed);
                        } else {
                            resolve();
                        }
                    }
                    typeChar();
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const clonedElement = node.cloneNode(false);
                    element.appendChild(clonedElement);

                    const childNodes = Array.from(node.childNodes);
                    let childIndex = 0;

                    function typeNextChild() {
                        if (childIndex < childNodes.length) {
                            typeNodeInto(childNodes[childIndex], clonedElement).then(() => {
                                childIndex++;
                                typeNextChild();
                            });
                        } else {
                            resolve();
                        }
                    }
                    typeNextChild();
                } else {
                    resolve();
                }
            });
        }

        function typeNodeInto(node, parentElement) {
            return new Promise((resolve) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent;
                    let charIndex = 0;
                    const textNode = document.createTextNode('');
                    parentElement.appendChild(textNode);

                    function typeChar() {
                        if (charIndex < text.length) {
                            textNode.textContent += text[charIndex];
                            charIndex++;
                            scrollToBottom();
                            setTimeout(typeChar, speed);
                        } else {
                            resolve();
                        }
                    }
                    typeChar();
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const clonedElement = node.cloneNode(false);
                    parentElement.appendChild(clonedElement);

                    const childNodes = Array.from(node.childNodes);
                    let childIndex = 0;

                    function typeNextChild() {
                        if (childIndex < childNodes.length) {
                            typeNodeInto(childNodes[childIndex], clonedElement).then(() => {
                                childIndex++;
                                typeNextChild();
                            });
                        } else {
                            resolve();
                        }
                    }
                    typeNextChild();
                } else {
                    resolve();
                }
            });
        }

        return new Promise((resolve) => {
            function typeNextNode() {
                if (currentIndex < nodes.length) {
                    typeNode(nodes[currentIndex]).then(() => {
                        currentIndex++;
                        typeNextNode();
                    });
                } else {
                    resolve();
                }
            }
            typeNextNode();
        });
    }

    function appendMessage(role, text, scroll = true, skipTypewriter = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;

        const avatar = role === 'user' ? 'U' : 'G';

        // Parse Markdown and Sources
        const formattedContent = parseContent(text);

        // Add copy button for bot messages
        const copyButton = role === 'bot' ? `
            <button class="copy-btn" onclick="copyToClipboard(this)" title="Copy message">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
        ` : '';

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                ${copyButton}
            </div>
        `;

        // Apply stagger animation delay
        const delay = messageAnimationIndex * 100; // 100ms between each message
        messageDiv.style.animationDelay = `${delay}ms`;
        messageAnimationIndex++;

        // Reset animation index after a pause (no messages for 2 seconds)
        clearTimeout(window.messageAnimationTimeout);
        window.messageAnimationTimeout = setTimeout(() => {
            messageAnimationIndex = 0;
        }, 2000);

        chatMessages.appendChild(messageDiv);
        if (scroll) scrollToBottom();

        // Get the message content div
        const messageContent = messageDiv.querySelector('.message-content');
        const copyBtn = messageContent.querySelector('.copy-btn');

        // Hide copy button during typing (only if typewriter will be used)
        if (copyBtn && !skipTypewriter) {
            copyBtn.style.display = 'none';
        }

        // Create a wrapper for content (excluding copy button)
        const contentWrapper = document.createElement('div');

        // Store raw markdown for copy functionality
        contentWrapper.setAttribute('data-raw-markdown', text);

        // Apply RTL class if Arabic text is detected
        if (isRTL(text)) {
            contentWrapper.classList.add('rtl-message');
        }

        // EMOJI FIX: Check if content has emojis before rendering
        const hasEmoji = text && (text.includes('⚠') || text.includes('⚡') || text.includes('❗'));

        messageContent.insertBefore(contentWrapper, copyBtn);

        // Use typewriter effect for NEW bot messages, instant for user messages or loaded messages
        if (role === 'bot' && !skipTypewriter) {
            // Start typewriter effect (which now handles emojis internally)
            typewriterEffect(contentWrapper, formattedContent, 5).then(() => {
                // Apply emoji fix after typewriter completes (belt and suspenders approach)
                if (hasEmoji) {
                    fixEmojiRendering(contentWrapper, text);
                }
                // Show copy button after typing is complete
                if (copyBtn) {
                    copyBtn.style.display = 'flex';
                }
            });
        } else {
            // For user messages OR loaded messages, show immediately
            contentWrapper.innerHTML = formattedContent;

            // Apply emoji fix for instant messages too
            if (hasEmoji) {
                setTimeout(() => fixEmojiRendering(contentWrapper, text), 10);
            }
        }
    }

    async function callSignpostAI(userMessage) {
        const typingId = showTypingIndicator();

        try {
            // Refresh nonce before every message send to guarantee validity
            await refreshNonce();

            // Generate a session ID based on chat ID or random if needed
            const apiSessionId = currentChatId ? `chat-${currentChatId}` : `user-${Date.now()}`;

            console.log('📤 Sending message via admin-ajax (giannis_send_message)');

            // Route through WordPress admin-ajax.php so API credentials stay server-side
            const response = await fetch(giannisConfig.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'giannis_send_message',
                    nonce: giannisConfig.nonce,
                    message: userMessage,
                    session_id: apiSessionId
                })
            });

            console.log('📥 admin-ajax response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ admin-ajax Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ admin-ajax Response data:', result);
            removeTypingIndicator(typingId);

            if (result.success) {
                const botReply = result.data.message || result.data.response || "I'm sorry, I didn't understand that.";
                appendMessage('bot', botReply);
                saveMessageToState('bot', botReply);
            } else {
                const errorMsg = result.data?.message || "Unexpected error from server.";
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error("🔴 API Error:", error);
            removeTypingIndicator(typingId);
            const errorMsg = "⚠️ Connection error: " + error.message;
            appendMessage('bot', errorMsg);
            saveMessageToState('bot', errorMsg);
        }
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message bot-message`;
        messageDiv.id = id;

        // Apply animation delay like other messages
        const delay = messageAnimationIndex * 100;
        messageDiv.style.animationDelay = `${delay}ms`;
        messageAnimationIndex++;

        messageDiv.innerHTML = `
            <div class="message-avatar">G</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        return id;
    }

    function removeTypingIndicator(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    function scrollToBottom() {
        // Scroll the chat messages container itself
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // For the window scroll, add offset for header
        const headerOffset = getHeaderOffset();
        const chatBottom = chatMessages.getBoundingClientRect().bottom;

        // Only scroll the window if needed (when chat extends beyond viewport)
        if (chatBottom > window.innerHeight) {
            const scrollTarget = window.pageYOffset + (chatBottom - window.innerHeight) + 20; // 20px buffer
            window.scrollTo({
                top: scrollTarget - headerOffset,
                behavior: 'smooth'
            });
        }
    }

    // Helper function to determine header offset based on screen size
    function getHeaderOffset() {
        const width = window.innerWidth;

        if (width <= 768) {
            // Mobile: typically larger headers
            return 120; // Adjust this value based on your mobile header height
        } else if (width <= 1024) {
            // Tablet
            return 60; // Adjust for tablet header
        } else {
            // Desktop
            return 100; // Adjust for desktop header
        }
    }

    /**
     * parseContent - V3 Source Extraction (Bulletproof)
     *
     * Two-pass extraction:
     *   Pass 1: Try regex on the raw text as-is
     *   Pass 2: If no match, normalize the text (strip markdown/HTML) and retry
     *
     * Also logs the tail of each bot response for debugging.
     */
    function parseContent(text) {
        if (!text) return "";

        // DEBUG: Log the last 200 chars so we can see exactly what the API sends
        console.log('🔍 parseContent input (last 200 chars):', JSON.stringify(text.slice(-200)));

        // The core regex: matches "Sources:", "Source:", or "Fonti:" followed by the list
        // (?:\.|\s|<br\s*\/?>)* — tolerates periods, whitespace, or <br> tags before keyword
        // [*_]{0,3} — optional markdown bold/italic around keyword
        // \s*:?\s* — colon is made optional (some formats put colon inside the bold)
        // (.+) — capture everything after
        const sourcePattern = /(?:\.|\s|<br\s*\/?>)*[*_]{0,3}(?:Sources?|Fonti)[*_]{0,3}\s*:?\s*[:]\s*(.+)$/is;

        // Pass 1: Try on raw text with a simpler, broader regex
        const simpleRegex = /(?:Sources?|Fonti)\s*:\s*(.+)$/is;
        let match = text.match(simpleRegex);

        let mainText = text;
        let extractedSourceNames = [];

        if (match) {
            console.log('✅ Source regex matched (raw text). Captured:', match[1]);
            mainText = text.substring(0, match.index).replace(/[\s\n\r.]+$/, '');

            extractedSourceNames = match[1]
                .split(',')
                .map(s => s.trim().replace(/[*_`]/g, '').replace(/<[^>]*>/g, '').trim())
                .filter(s => {
                    const lower = s.toLowerCase().replace(/\.$/, '');
                    return s.length > 0
                        && lower !== 'none used'
                        && lower !== 'none'
                        && lower !== 'n/a'
                        && lower !== 'nessuna';
                });
        } else {
            console.warn('⚠️ Source regex did NOT match raw text. Trying normalized pass...');

            // Pass 2: Normalize — strip markdown bold, HTML tags, normalize whitespace
            const normalized = text
                .replace(/\*\*/g, '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            match = normalized.match(simpleRegex);

            if (match) {
                console.log('✅ Source regex matched (normalized). Captured:', match[1]);

                // Find where to cut in the ORIGINAL text
                // Search backwards for the keyword in the original
                const keywordIdx = text.search(/(?:Sources?|Fonti)\s*:/i);
                if (keywordIdx > -1) {
                    mainText = text.substring(0, keywordIdx).replace(/[\s\n\r.*_]+$/, '');
                }

                extractedSourceNames = match[1]
                    .split(',')
                    .map(s => s.trim().replace(/[*_`]/g, '').replace(/<[^>]*>/g, '').trim())
                    .filter(s => {
                        const lower = s.toLowerCase().replace(/\.$/, '');
                        return s.length > 0
                            && lower !== 'none used'
                            && lower !== 'none'
                            && lower !== 'n/a'
                            && lower !== 'nessuna';
                    });
            } else {
                console.warn('⚠️ No sources found in this message.');
            }
        }

        let html = formatMarkdown(mainText);

        // Render the sources footer only if real file names were extracted
        if (extractedSourceNames.length > 0) {
            const temp = document.createElement('div');
            const sourceItems = extractedSourceNames.map(name => {
                temp.textContent = name;
                return `<span class="source-item">📄 ${temp.innerHTML}</span>`;
            }).join('');

            html += `
                <div class="message-sources">
                    <strong>Sources:</strong> ${sourceItems}
                </div>
            `;
        }

        return html;
    }

    // Fixed formatMarkdown function - no HTML manipulation of emojis
    function formatMarkdown(text) {
        if (!text) return "";

        // Create a temporary element to safely handle the text
        const temp = document.createElement('div');
        temp.textContent = text; // This safely escapes HTML
        let html = temp.innerHTML;

        // Now apply markdown formatting
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/\n/g, '<br>');

        // Don't manipulate emojis here - let them render naturally
        // The emoji fix happens in the fixEmojiRendering function after DOM insertion

        return html;
    }

    // Theme Management
    function initializeTheme() {
        const savedTheme = localStorage.getItem('giannis_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const wrapper = document.querySelector('.giannis-chatbot-wrapper');

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            if (wrapper) wrapper.classList.add('dark-mode');
            updateThemeIcon(true);
        } else {
            updateThemeIcon(false);
        }
    }

    function toggleTheme() {
        const wrapper = document.querySelector('.giannis-chatbot-wrapper');
        if (!wrapper) return;

        const isDark = wrapper.classList.toggle('dark-mode');
        localStorage.setItem('giannis_theme', isDark ? 'dark' : 'light');
        updateThemeIcon(isDark);
    }

    function updateThemeIcon(isDark) {
        const themeIcon = document.getElementById('themeIcon');
        const welcomeLogoImg = document.getElementById('welcomeLogoImg');
        const chatInterface = document.getElementById('chatInterface');
        const pluginUrl = giannisConfig.pluginUrl || '';

        if (isDark) {
            // Moon icon
            if (themeIcon) {
                themeIcon.innerHTML = `
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                `;
            }
            // Change logos to grey version in dark mode
            if (welcomeLogoImg && welcomeLogoImg.src.includes('giannis-logo.png')) {
                welcomeLogoImg.src = welcomeLogoImg.src.replace('giannis-logo.png', 'giannis-logo-grey.png');
            }
            // Change chat interface background in dark mode
            if (chatInterface) {
                chatInterface.style.backgroundColor = '#0a0b0b';
            }

        } else {
            // Sun icon
            if (themeIcon) {
                themeIcon.innerHTML = `
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                `;
            }
            // Change logos back to yellow version in light mode
            if (welcomeLogoImg && welcomeLogoImg.src.includes('giannis-logo-grey.png')) {
                welcomeLogoImg.src = welcomeLogoImg.src.replace('giannis-logo-grey.png', 'giannis-logo.png');
            }
            // Change chat interface background in light mode
            if (chatInterface) {
                chatInterface.style.backgroundColor = '#f8f9fa';
            }
        }
    }
});

// Global Copy to Clipboard Function - Preserves Markdown Formatting
window.copyToClipboard = function (button) {
    const messageElement = button.closest('.message');
    const messageContent = button.parentElement;
    let textToCopy = '';

    // PRIORITY 1: Find element with data-raw-markdown attribute
    const rawMarkdownElement = messageContent.querySelector('[data-raw-markdown]');

    if (rawMarkdownElement && rawMarkdownElement.getAttribute('data-raw-markdown')) {
        textToCopy = rawMarkdownElement.getAttribute('data-raw-markdown');
        console.log('✅ Copiato da data-raw-markdown (formattazione Markdown preservata)');
    } else if (messageElement && messageElement.dataset.rawMarkdown) {
        // PRIORITY 2: Fallback to messageElement dataset (legacy)
        textToCopy = messageElement.dataset.rawMarkdown;
        console.log('✅ Copiato da dataset.rawMarkdown (legacy)');
    } else {
        // PRIORITY 3: Extract text from HTML with proper line breaks
        console.log('⚠️ Fallback: estrazione da HTML');
        const clone = messageContent.cloneNode(true);

        // Remove copy button from clone
        const copyBtn = clone.querySelector('.copy-btn');
        if (copyBtn) copyBtn.remove();

        // Replace block elements with newlines
        clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
        clone.querySelectorAll('p, div, li').forEach(el => {
            el.prepend(document.createTextNode('\n'));
        });

        textToCopy = clone.textContent.trim();
    }

    // Store original icon HTML
    const originalIcon = button.innerHTML;
    const checkmarkIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    `;

    // Copy to clipboard using modern API
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Visual feedback - change to checkmark
        button.innerHTML = checkmarkIcon;
        button.classList.add('copied');

        // Reset after 2 seconds
        setTimeout(() => {
            button.innerHTML = originalIcon;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            button.innerHTML = checkmarkIcon;
            button.classList.add('copied');
            setTimeout(() => {
                button.innerHTML = originalIcon;
                button.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Fallback copy failed: ', err);
        }
        document.body.removeChild(textArea);
    });
};

/* --- GA4 BUTTON TRACKING --- */
document.addEventListener('DOMContentLoaded', function () {
    // 1. Feedback Button
    const feedbackBtn = document.getElementById('feedbackBtn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', function () {
            if (typeof gtag === 'function') {
                gtag('event', 'giannis_feedback_click', {
                    'event_category': 'Chatbot',
                    'event_label': 'Sidebar Button'
                });
            }
        });
    }

    // 2. Quick Starters (Chips)
    const starters = document.querySelectorAll('.starter-chip');
    starters.forEach(function (chip) {
        chip.addEventListener('click', function () {
            const messageType = chip.getAttribute('data-message');
            if (typeof gtag === 'function') {
                gtag('event', 'giannis_starter_click', {
                    'event_category': 'Chatbot',
                    'event_label': messageType
                });
            }
        });
    });
});