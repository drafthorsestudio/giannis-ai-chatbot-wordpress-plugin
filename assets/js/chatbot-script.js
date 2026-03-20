let hasChatStarted = false;

/**
 * Giannis AI Chatbot - WordPress Plugin JavaScript
 * Version: 1.3.0 - Complete Edition
 * 
 * Includes ALL fixes:
 * - Firefox NS_BINDING_ABORTED fix (type="button")
 * - Language button persistence fix (hidden-starters class)
 * - Nonce refresh for Pantheon cache compatibility
 * - XHR fallback for fetch() failures
 * - Extended timeout (45-60s) with retry logic
 * - User-friendly error messages
 */

// Configuration - will be loaded from server
let SIGNPOST_API_URL;
let TEAM_ID;
let AGENT_ID;
let configLoaded = false;

// RTL Detection Function
function isRTL(text) {
    const rtlPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    return rtlPattern.test(text);
}

/**
 * XMLHttpRequest-based AJAX call (Firefox fallback)
 */
function xhrPost(url, data) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject(new Error('Invalid JSON response: ' + xhr.responseText.substring(0, 100)));
                    }
                } else {
                    reject(new Error('XHR failed with status: ' + xhr.status));
                }
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('XHR network error'));
        };
        
        xhr.ontimeout = function() {
            reject(new Error('XHR timeout'));
        };
        
        xhr.timeout = 30000;
        xhr.send(data);
    });
}

/**
 * Universal POST function - tries fetch first, falls back to XHR
 */
async function universalPost(url, formData) {
    const urlEncodedData = new URLSearchParams(formData).toString();
    
    try {
        console.log('🔄 Attempting fetch to:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: urlEncodedData,
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Fetch succeeded');
        return result;
    } catch (fetchError) {
        console.warn('⚠️ Fetch failed, trying XHR fallback:', fetchError.message);
        
        try {
            const result = await xhrPost(url, urlEncodedData);
            console.log('✅ XHR fallback succeeded');
            return result;
        } catch (xhrError) {
            console.error('❌ Both fetch and XHR failed');
            throw new Error(`Network request failed: ${fetchError.message} / XHR: ${xhrError.message}`);
        }
    }
}

/**
 * NEW: Dynamic Nonce Refresh (Pantheon Cache Fix)
 * Fetches a fresh nonce from server to bypass cached page nonces
 */
async function refreshNonce() {
    try {
        console.log('🔑 Refreshing nonce...');
        const response = await universalPost(giannisConfig.apiUrl, {
            action: 'giannis_refresh_nonce'
        });

        if (response.success && response.data.nonce) {
            giannisConfig.nonce = response.data.nonce;
            console.log('✅ Nonce refreshed successfully');
            return true;
        } else {
            console.warn('⚠️ Nonce refresh response was not successful');
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to refresh nonce:', error);
        return false;
    }
}

// Load configuration from WordPress
async function loadConfig() {
    try {
        console.log('🔧 Loading configuration from:', giannisConfig.apiUrl);
        
        // Refresh nonce first (Pantheon cache fix)
        await refreshNonce();
        
        const result = await universalPost(giannisConfig.apiUrl, {
            action: 'giannis_get_config',
            nonce: giannisConfig.nonce
        });

        if (result.success) {
            SIGNPOST_API_URL = result.data.SIGNPOST_API_URL;
            TEAM_ID = result.data.TEAM_ID;
            AGENT_ID = result.data.AGENT_ID;
            configLoaded = true;
            console.log('✅ Configuration loaded successfully');
        } else {
            throw new Error(result.data?.message || 'Failed to load config');
        }
    } catch (error) {
        console.error('❌ Failed to load configuration:', error);
    }
}

// State Management
let chats = JSON.parse(localStorage.getItem('giannis_chats')) || [];
let currentChatId = null;
let messageAnimationIndex = 0;

// Emoji fix function
function fixEmojiRendering(element, originalText) {
    const problematicEmojis = ['⚠️', '⚠', '⚡', '🚨', '❗', '❌', '✅', '⭐', '🔴', '🟡', '🟢'];
    const hasProblematicEmoji = problematicEmojis.some(emoji => element.textContent.includes(emoji));

    if (hasProblematicEmoji) {
        element.style.display = 'none';
        element.offsetHeight;
        element.style.display = '';
        element.classList.add('emoji-content-fixed');

        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            let text = textNode.nodeValue;
            problematicEmojis.forEach(emoji => {
                text = text.replace(new RegExp(`(${emoji})(?!\\u200B)`, 'g'), '$1\u200B');
            });
            if (text !== textNode.nodeValue) {
                textNode.nodeValue = text;
            }
        });
    }
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();

    if (!configLoaded) {
        console.error('Failed to load configuration. App may not work correctly.');
    }

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
    const languageStarters = document.getElementById('languageStarters');
    const starterChips = document.querySelectorAll('.starter-chip');

    let isFirstMessage = true;
    let dynamicTextInterval = null;
    let isProcessingMessage = false; // Prevent double submissions

    function updateStartersVisibility() {
        if (!languageStarters) return;
        if (isFirstMessage && chatMessages.children.length === 0) {
            languageStarters.classList.remove('hidden-starters');
        } else {
            languageStarters.classList.add('hidden-starters');
        }
    }

    // Initialize UI
    initializeTheme();
    renderSidebar();
    startNewChat();

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
                chats = [];
                localStorage.removeItem('giannis_chats');
                renderSidebar();
                startNewChat();
                console.log('✅ Tutte le chat sono state cancellate');
            }
        });
    }

    updateStartersVisibility();

    // Starter chips
    starterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const message = chip.getAttribute('data-message');
            if (message && !isProcessingMessage) {
                userInput.value = message;
                sendBtn.removeAttribute('disabled');
                if (languageStarters) {
                    languageStarters.classList.add('hidden-starters');
                }
                handleSendMessage();
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

    // Handle Enter key - PREVENT DEFAULT MORE AGGRESSIVELY
    userInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            if (this.value.trim().length > 0 && !isProcessingMessage) {
                handleSendMessage();
            }
            return false;
        }
    });

    // CRITICAL FIX: Prevent form submission entirely
    // The form should NEVER actually submit - all handling is via AJAX
    chatForm.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        console.log('🛑 Form submit intercepted');
        
        if (!isProcessingMessage && userInput.value.trim().length > 0) {
            handleSendMessage();
        }
        
        return false;
    });

    // Also prevent the button from submitting the form
    sendBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🖱️ Send button clicked');
        
        if (!isProcessingMessage && userInput.value.trim().length > 0) {
            handleSendMessage();
        }
        
        return false;
    });

    /**
     * Main message sending function - extracted to avoid duplication
     */
    async function handleSendMessage() {
        if (isProcessingMessage) {
            console.log('⏳ Already processing a message, ignoring');
            return;
        }

        const message = userInput.value.trim();
        if (!message) return;

        isProcessingMessage = true;
        console.log('📝 Processing message:', message);

        let chat = null;

        if (isFirstMessage) {
            transitionToChatMode();
            isFirstMessage = false;

            if (languageStarters) {
                languageStarters.classList.add('hidden-starters');
            }

            if (!currentChatId) {
                currentChatId = Date.now().toString();
                const isTemp = message.length < 25;
                const newChat = {
                    id: currentChatId,
                    title: message.substring(0, 35) + (message.length > 35 ? '...' : ''),
                    messages: [],
                    isTempTitle: isTemp
                };
                chats.unshift(newChat);
                saveChats();
                renderSidebar();
                chat = newChat;
            }
        } else {
            chat = chats.find(c => c.id === currentChatId);

            if (chat && chat.isTempTitle) {
                if (message.length > chat.title.length || message.length > 10) {
                    chat.title = message.substring(0, 35) + (message.length > 35 ? '...' : '');
                    if (message.length >= 25) {
                        chat.isTempTitle = false;
                    }
                    saveChats();
                    renderSidebar();
                }
            }
        }

        appendMessage('user', message);
        saveMessageToState('user', message);

        // Clear input
        userInput.value = '';
        userInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        // GA4 tracking
        if (typeof gtag === 'function') {
            gtag('event', 'giannis_message_sent', {
                'event_category': 'Chatbot',
                'event_label': 'User Query'
            });

            if (!hasChatStarted) {
                gtag('event', 'giannis_chat_start', {
                    'event_category': 'Chatbot',
                    'event_label': 'First Interaction'
                });
                hasChatStarted = true;
            }
        }

        // Call API
        await callSignpostAI(message);
        
        isProcessingMessage = false;
    }

    function startNewChat() {
        currentChatId = null;
        isFirstMessage = true;

        welcomeScreen.classList.remove('hidden');
        chatMessages.classList.add('hidden');
        chatMessages.innerHTML = '';
        inputAreaContainer.classList.add('centered');

        document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));

        startDynamicTextAnimation();
        updateStartersVisibility();

        document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent.includes('👋')) {
            btn.style.display = '';
        }
    });
    }

    function loadChat(chatId) {
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;

        currentChatId = chatId;
        isFirstMessage = false;

        welcomeScreen.classList.add('hidden');
        chatMessages.classList.remove('hidden');
        inputAreaContainer.classList.remove('centered');
        stopDynamicTextAnimation();

        chatMessages.innerHTML = '';
        chat.messages.forEach(msg => {
            appendMessage(msg.role, msg.content, false, true);
        });
        scrollToBottom();

        renderSidebar();
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

            const titleSpan = document.createElement('span');
            titleSpan.className = 'chat-title';
            titleSpan.textContent = chat.title;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'chat-actions';

            const renameBtn = document.createElement('button');
            renameBtn.className = 'action-btn rename-btn';
            renameBtn.type = 'button'; // Prevent form submission
            renameBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
            renameBtn.title = "Rename";
            renameBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                startRenaming(chat.id, item, titleSpan);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete-btn';
            deleteBtn.type = 'button'; // Prevent form submission
            deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
            deleteBtn.title = "Delete";
            deleteBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteChat(chat.id);
            };

            actionsDiv.appendChild(renameBtn);
            actionsDiv.appendChild(deleteBtn);

            item.appendChild(titleSpan);
            item.appendChild(actionsDiv);

            item.addEventListener('click', (e) => {
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

        itemElement.replaceChild(input, titleElement);
        input.focus();

        const save = () => {
            const newTitle = input.value.trim();
            if (newTitle) {
                const chat = chats.find(c => c.id === chatId);
                if (chat) {
                    chat.title = newTitle;
                    chat.isTempTitle = false;
                    saveChats();
                }
            }
            renderSidebar();
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            } else if (e.key === 'Escape') {
                renderSidebar();
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

        if (dynamicVerb && dynamicSuffix) {
            dynamicVerb.textContent = phrases[0].verb;
            dynamicSuffix.textContent = phrases[0].suffix;

            dynamicVerb.style.opacity = '1';
            dynamicVerb.style.transform = 'translateY(0)';
            dynamicSuffix.style.opacity = '1';
            dynamicSuffix.style.transform = 'translateY(0)';

            dynamicTextInterval = setInterval(() => {
                dynamicVerb.style.opacity = '0';
                dynamicVerb.style.transform = 'translateY(10px)';
                dynamicSuffix.style.opacity = '0';
                dynamicSuffix.style.transform = 'translateY(10px)';

                setTimeout(() => {
                    index = (index + 1) % phrases.length;
                    dynamicVerb.textContent = phrases[index].verb;
                    dynamicSuffix.textContent = phrases[index].suffix;

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

    function typewriterEffect(element, htmlContent, speed = 5) {
        const hasProblematicEmoji = /[⚠⚡❗❌✅⭐🔴🟡🟢☢☣]/.test(htmlContent);

        if (hasProblematicEmoji) {
            element.innerHTML = htmlContent;
            fixEmojiRendering(element, htmlContent);
            element.style.opacity = '0';
            element.style.transition = 'opacity 0.5s ease-in';
            setTimeout(() => {
                element.style.opacity = '1';
                scrollToBottom();
            }, 10);
            return Promise.resolve();
        }

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
        const formattedContent = parseContent(text);

        const copyButton = role === 'bot' ? `
            <button type="button" class="copy-btn" onclick="copyToClipboard(this)" title="Copy message">
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

        const delay = messageAnimationIndex * 100;
        messageDiv.style.animationDelay = `${delay}ms`;
        messageAnimationIndex++;

        clearTimeout(window.messageAnimationTimeout);
        window.messageAnimationTimeout = setTimeout(() => {
            messageAnimationIndex = 0;
        }, 2000);

        chatMessages.appendChild(messageDiv);
        if (scroll) scrollToBottom();

        const messageContent = messageDiv.querySelector('.message-content');
        const copyBtn = messageContent.querySelector('.copy-btn');

        if (copyBtn && !skipTypewriter) {
            copyBtn.style.display = 'none';
        }

        const contentWrapper = document.createElement('div');
        contentWrapper.setAttribute('data-raw-markdown', text);

        if (isRTL(text)) {
            contentWrapper.classList.add('rtl-message');
        }

        const hasEmoji = text && (text.includes('⚠') || text.includes('⚡') || text.includes('❗'));

        messageContent.insertBefore(contentWrapper, copyBtn);

        if (role === 'bot' && !skipTypewriter) {
            typewriterEffect(contentWrapper, formattedContent, 5).then(() => {
                if (hasEmoji) {
                    fixEmojiRendering(contentWrapper, text);
                }
                if (copyBtn) {
                    copyBtn.style.display = 'flex';
                }
            });
        } else {
            contentWrapper.innerHTML = formattedContent;
            if (hasEmoji) {
                setTimeout(() => fixEmojiRendering(contentWrapper, text), 10);
            }
        }
    }

    /**
     * Call Signpost AI through WordPress AJAX proxy
     */
    async function callSignpostAI(userMessage) {
        const typingId = showTypingIndicator();

        try {
            // Refresh nonce before each message (Pantheon cache fix)
            await refreshNonce();
            
            // Generate a session ID based on chat ID or random if needed
            const apiSessionId = currentChatId ? `chat-${currentChatId}` : `user-${Date.now()}`;

            console.log('📤 Sending request to API...');

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

            console.log('📥 API Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ API Response data:', data);
            
            removeTypingIndicator(typingId);

            // Check if the API returned an error
            if (!data.success) {
                const errorMsg = data.data?.message || "I'm having trouble connecting right now. Please try again.";
                appendMessage('bot', `⚠️ ${errorMsg}`);
                saveMessageToState('bot', `⚠️ ${errorMsg}`);
                
                // Log technical error for debugging (not shown to user)
                if (data.data?.technical_error) {
                    console.error('Technical error:', data.data.technical_error);
                }
                return;
            }

            // Success - extract the bot's reply
            const botReply = data.data?.message || 
                            data.data?.response || 
                            "I received your message but couldn't generate a response.";

            appendMessage('bot', botReply);
            saveMessageToState('bot', botReply);

        } catch (error) {
            console.error("🔴 API Error:", error);
            removeTypingIndicator(typingId);
            
            // User-friendly error messages based on error type
            let errorMsg = "⚠️ ";
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMsg += "Connection lost. Please check your internet and try again.";
            } else if (error.message.includes('timeout')) {
                errorMsg += "The response is taking too long. Please try again.";
            } else if (error.message.includes('status: 500')) {
                errorMsg += "The AI service encountered an error. Please try again in a moment.";
            } else if (error.message.includes('status: 403')) {
                errorMsg += "Access denied. Please check your API credentials.";
            } else {
                errorMsg += "Something went wrong. Please try again.";
            }
            
            appendMessage('bot', errorMsg);
            saveMessageToState('bot', errorMsg);
        }
    }

    // ALSO ADD: Better typing indicator with timeout protection
    let typingTimeout = null;

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message bot-message`;
        messageDiv.id = id;

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
        
        // Auto-remove after 60 seconds if not manually removed (safety measure)
        typingTimeout = setTimeout(() => {
            removeTypingIndicator(id);
            appendMessage('bot', "⚠️ The response is taking too long. Please try again.");
        }, 60000);
        
        return id;
    }

    function removeTypingIndicator(id) {
        clearTimeout(typingTimeout);
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const headerOffset = getHeaderOffset();
        const chatBottom = chatMessages.getBoundingClientRect().bottom;

        if (chatBottom > window.innerHeight) {
            const scrollTarget = window.pageYOffset + (chatBottom - window.innerHeight) + 20;
            window.scrollTo({
                top: scrollTarget - headerOffset,
                behavior: 'smooth'
            });
        }
    }

    function getHeaderOffset() {
        const width = window.innerWidth;
        if (width <= 768) return 120;
        if (width <= 1024) return 60;
        return 100;
    }

    function parseContent(text) {
        if (!text) return "";

        const sourceRegex = /(\n\s*(?:Sources?|Fonti):[\s\S]*)$/i;
        const match = text.match(sourceRegex);

        let mainText = text;
        let sourcesText = "";

        if (match) {
            sourcesText = match[1];
            mainText = text.substring(0, match.index);
        }

        let html = formatMarkdown(mainText);

        if (sourcesText) {
            const cleanSources = sourcesText.trim();
            const formattedSources = formatMarkdown(cleanSources);

            html += `<div class="message-sources">${formattedSources}</div>`;
        }

        return html;
    }

    function formatMarkdown(text) {
        if (!text) return "";

        const temp = document.createElement('div');
        temp.textContent = text;
        let html = temp.innerHTML;

        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/\n/g, '<br>');

        return html;
    }

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

        if (isDark) {
            if (themeIcon) {
                themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
            }
            if (welcomeLogoImg && welcomeLogoImg.src.includes('giannis-logo.png')) {
                welcomeLogoImg.src = welcomeLogoImg.src.replace('giannis-logo.png', 'giannis-logo-grey.png');
            }
            if (chatInterface) {
                chatInterface.style.backgroundColor = '#0a0b0b';
            }
        } else {
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
            if (welcomeLogoImg && welcomeLogoImg.src.includes('giannis-logo-grey.png')) {
                welcomeLogoImg.src = welcomeLogoImg.src.replace('giannis-logo-grey.png', 'giannis-logo.png');
            }
            if (chatInterface) {
                chatInterface.style.backgroundColor = '#f8f9fa';
            }
        }
    }
});

// Global Copy to Clipboard Function
window.copyToClipboard = function (button) {
    const messageElement = button.closest('.message');
    const messageContent = button.parentElement;
    let textToCopy = '';

    const rawMarkdownElement = messageContent.querySelector('[data-raw-markdown]');

    if (rawMarkdownElement && rawMarkdownElement.getAttribute('data-raw-markdown')) {
        textToCopy = rawMarkdownElement.getAttribute('data-raw-markdown');
    } else if (messageElement && messageElement.dataset.rawMarkdown) {
        textToCopy = messageElement.dataset.rawMarkdown;
    } else {
        const clone = messageContent.cloneNode(true);
        const copyBtn = clone.querySelector('.copy-btn');
        if (copyBtn) copyBtn.remove();
        clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
        clone.querySelectorAll('p, div, li').forEach(el => {
            el.prepend(document.createTextNode('\n'));
        });
        textToCopy = clone.textContent.trim();
    }

    const originalIcon = button.innerHTML;
    const checkmarkIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    `;

    navigator.clipboard.writeText(textToCopy).then(() => {
        button.innerHTML = checkmarkIcon;
        button.classList.add('copied');
        setTimeout(() => {
            button.innerHTML = originalIcon;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
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
            console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textArea);
    });
};

// GA4 Button Tracking
document.addEventListener('DOMContentLoaded', function () {
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
