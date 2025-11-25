// Configuration - will be loaded from server
let SIGNPOST_API_URL;
let TEAM_ID;
let AGENT_ID;
let configLoaded = false;

// Load configuration from WordPress
async function loadConfig() {
    try {
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
    const dynamicVerb = document.getElementById('dynamicVerb');
    const dynamicSuffix = document.getElementById('dynamicSuffix');
    const newChatBtn = document.getElementById('newChatBtn');
    const historyList = document.getElementById('historyList');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');

    let isFirstMessage = true;
    let dynamicTextInterval = null;

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
            { verb: "اسأل", suffix: "ابدأ بقول مرحb" }
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

    function typewriterEffect(element, htmlContent, speed = 5) {
        // Create a temporary container to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // Clear the element
        element.innerHTML = '';

        let currentIndex = 0;
        const nodes = Array.from(tempDiv.childNodes);

        function typeNode(node) {
            return new Promise((resolve) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    // Text node - type character by character
                    const text = node.textContent;
                    let charIndex = 0;
                    const textNode = document.createTextNode('');
                    element.appendChild(textNode);

                    function typeChar() {
                        if (charIndex < text.length) {
                            textNode.textContent += text[charIndex];
                            charIndex++;
                            scrollToBottom(); // Scroll as we type
                            setTimeout(typeChar, speed);
                        } else {
                            resolve();
                        }
                    }
                    typeChar();
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    // Element node - clone and append, then type children
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

        // CRITICAL FIX: Return the Promise!
        return new Promise((resolve) => {
            function typeNextNode() {
                if (currentIndex < nodes.length) {
                    typeNode(nodes[currentIndex]).then(() => {
                        currentIndex++;
                        typeNextNode();
                    });
                } else {
                    resolve(); // Resolve when all nodes are typed
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

        // Use typewriter effect for NEW bot messages, instant for user messages or loaded messages
        if (role === 'bot' && !skipTypewriter) {
            // Create a wrapper for content (excluding copy button)
            const contentWrapper = document.createElement('div');
            messageContent.insertBefore(contentWrapper, copyBtn);

            // Start typewriter effect
            typewriterEffect(contentWrapper, formattedContent, 5).then(() => {
                // Show copy button after typing is complete
                if (copyBtn) {
                    copyBtn.style.display = 'flex';
                }
            });
        } else {
            // For user messages OR loaded messages, show immediately
            const contentWrapper = document.createElement('div');
            contentWrapper.innerHTML = formattedContent;
            messageContent.insertBefore(contentWrapper, copyBtn);
        }
    }

    async function callSignpostAI(userMessage) {
        const typingId = showTypingIndicator();

        try {
            // Generate a session ID based on chat ID or random if needed
            const apiSessionId = currentChatId ? `chat-${currentChatId}` : `user-${Date.now()}`;

            const payload = {
                id: AGENT_ID,
                team_id: TEAM_ID,
                message: userMessage,
                uid: apiSessionId,
                to_number: null,
                audio: null
            };

            console.log('📤 Sending request to API:', payload);

            const response = await fetch(SIGNPOST_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('📥 API Response status:', response.status);

            if (!response.ok) {
                // Try to get error details from response
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ API Response data:', data);
            removeTypingIndicator(typingId);

            const botReply = data.message || data.response || "I'm sorry, I didn't understand that.";

            appendMessage('bot', botReply);
            saveMessageToState('bot', botReply);

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
        chatMessages.scrollTop = chatMessages.scrollHeight;
        window.scrollTo(0, document.body.scrollHeight);
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

            html += `
                <div class="message-sources">
                    ${formattedSources}
                </div>
            `;
        }

        return html;
    }

    function formatMarkdown(text) {
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    // Theme Management
    function initializeTheme() {
        const savedTheme = localStorage.getItem('giannis_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.classList.add('dark-mode');
            updateThemeIcon(true);
        } else {
            updateThemeIcon(false);
        }
    }

    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('giannis_theme', isDark ? 'dark' : 'light');
        updateThemeIcon(isDark);
    }

    function updateThemeIcon(isDark) {
        const themeIcon = document.getElementById('themeIcon');
        const welcomeLogoImg = document.getElementById('welcomeLogoImg');

        if (isDark) {
            // Moon icon
            themeIcon.innerHTML = `
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            `;
            // Change welcome logo to grey version in dark mode
            if (welcomeLogoImg) {
                welcomeLogoImg.src = 'giannis-logo-grey.png';
            }
        } else {
            // Sun icon
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
            // Change welcome logo back to yellow version in light mode
            if (welcomeLogoImg) {
                welcomeLogoImg.src = 'giannis-logo.png';
            }
        }
    }
});

// Global Copy to Clipboard Function
window.copyToClipboard = function (button) {
    const messageContent = button.parentElement;
    // Get text content, excluding the copy button
    const textToCopy = messageContent.textContent.replace(/Copy message/g, '').trim();

    // Copy to clipboard using modern API
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Visual feedback
        button.classList.add('copied');

        // Reset after 2 seconds
        setTimeout(() => {
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
            button.classList.add('copied');
            setTimeout(() => {
                button.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Fallback copy failed: ', err);
        }
        document.body.removeChild(textArea);
    });
};

