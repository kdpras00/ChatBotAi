document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatLog = document.getElementById('chat-log');
    const messagesContainer = document.querySelector('.messages-container');
    const chatInput = document.getElementById('chat-input');
    const chatSubmit = document.getElementById('chat-submit');
    const themeToggle = document.getElementById('theme-toggle');
    const clearChat = document.getElementById('clear-chat');
    const exportChat = document.getElementById('export-chat');
    const renameChat = document.getElementById('rename-chat');
    const voiceInput = document.getElementById('voice-input');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
    const newChat = document.getElementById('new-chat');
    const uploadImage = document.getElementById('upload-image');
    const imageInput = document.getElementById('image-input');
    const attachmentPreview = document.getElementById('attachment-preview');
    const conversationHistory = document.getElementById('conversation-history');
    const conversationSearch = document.getElementById('conversation-search');
    const chatTitle = document.getElementById('chat-title');
    const emptyState = document.getElementById('empty-state');
    const examplePrompts = document.querySelectorAll('.example-prompt');
    
    // State
    let currentConversationId = null;
    let conversations = {};
    let attachments = [];
    let isRecording = false;
    let isSidebarCollapsed = false;
    
    // Initialize the app
    initializeApp();
    
    function initializeApp() {
        loadConversations();
        setupEventListeners();
        checkThemePreference();
        
        // Initialize sidebar state based on device and stored preference
        initializeSidebarState();
        
        // Don't automatically create a new conversation on load
        // Show the empty state instead
        showEmptyState(true);
    }
    
    // Initialize sidebar state based on device and stored preference
    function initializeSidebarState() {
        const isMobile = window.innerWidth <= 768;
        const savedSidebarState = localStorage.getItem('sidebarCollapsed') === 'true';
        
        isSidebarCollapsed = savedSidebarState;
        
        if (isMobile) {
            // Always start with sidebar closed on mobile
            sidebar.classList.remove('open');
        } else {
            // On desktop, respect saved preference
            if (savedSidebarState) {
                sidebar.classList.add('collapsed');
                document.body.classList.add('sidebar-collapsed');
                
                // Update icon
                const icon = sidebarToggle.querySelector('i');
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            }
        }
    }
    
    function setupEventListeners() {
        // Chat input and submission
        chatInput.addEventListener('input', handleInputChange);
        chatInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSendMessage();
            }
        });
        chatSubmit.addEventListener('click', handleSendMessage);
        
        // Sidebar
        sidebarToggle.addEventListener('click', toggleSidebar);
        mobileSidebarToggle.addEventListener('click', toggleSidebar);
        
        // Window resize event to handle responsive behavior
        window.addEventListener('resize', handleWindowResize);
        
        // Theme
        themeToggle.addEventListener('change', toggleDarkMode);
        
        // Utility buttons
        clearChat.addEventListener('click', clearChatHistory);
        exportChat.addEventListener('click', exportChatHistory);
        renameChat.addEventListener('click', renameConversation);
        newChat.addEventListener('click', startNewConversation);
        
        // Voice input
        voiceInput.addEventListener('click', toggleVoiceInput);
        
        // Image upload
        uploadImage.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageUpload);
        
        // Conversation search
        conversationSearch.addEventListener('input', filterConversations);
        
        // Example prompts
        examplePrompts.forEach(prompt => {
            prompt.addEventListener('click', function() {
                const promptText = this.getAttribute('data-prompt');
                if (promptText) {
                    if (!currentConversationId) {
                        startNewConversation(false);
                    }
                    chatInput.value = promptText;
                    handleInputChange();
                }
            });
        });
    }
    
    // Handle window resize for responsive behavior
    function handleWindowResize() {
        const isMobile = window.innerWidth <= 768;
        
        // Reset sidebar state when switching between mobile and desktop
        if (isMobile) {
            // On mobile: Remove desktop classes
            document.body.classList.remove('sidebar-collapsed');
            
            // If sidebar was supposed to be visible in mobile
            if (!isSidebarCollapsed) {
                sidebar.classList.add('open');
            }
        } else {
            // On desktop: Remove mobile classes
            sidebar.classList.remove('open');
            
            // Apply saved sidebar state
            if (isSidebarCollapsed) {
                sidebar.classList.add('collapsed');
                document.body.classList.add('sidebar-collapsed');
            } else {
                sidebar.classList.remove('collapsed');
                document.body.classList.remove('sidebar-collapsed');
            }
        }
    }
    
    function handleInputChange() {
        // Adjust textarea height
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
        
        // Limit max height
        if (chatInput.scrollHeight > 150) {
            chatInput.style.overflowY = 'auto';
        } else {
            chatInput.style.overflowY = 'hidden';
        }
        
        // Enable/disable submit button based on content
        const hasContent = chatInput.value.trim().length > 0 || attachments.length > 0;
        chatSubmit.disabled = !hasContent;
    }
    
    function toggleSidebar() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Handle mobile sidebar toggle
            sidebar.classList.toggle('open');
            
            // No need to update isSidebarCollapsed flag on mobile
            // as this is used for desktop state persistence
        } else {
            // Handle desktop sidebar toggle
            sidebar.classList.toggle('collapsed');
            isSidebarCollapsed = sidebar.classList.contains('collapsed');
            
            // Update body class for main content margin
            document.body.classList.toggle('sidebar-collapsed', isSidebarCollapsed);
            
            // Update toggle button icon
            const icon = sidebarToggle.querySelector('i');
            if (isSidebarCollapsed) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
            
            // Store preference (only for desktop)
            localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
        }
    }
    
    // Generate unique ID for conversations
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    
    // Start a new conversation
    function startNewConversation(hideEmptyState = true) {
        currentConversationId = generateId();
        
        // Create new conversation object
        conversations[currentConversationId] = { 
            id: currentConversationId,
            title: "New Conversation",
            created: new Date().toISOString(),
            messages: [] 
        };
        
        // Reset UI
        messagesContainer.innerHTML = '';
        attachments = [];
        attachmentPreview.innerHTML = '';
        chatTitle.textContent = "New Conversation";
        
        // Hide empty state if specified
        if (hideEmptyState) {
            showEmptyState(false);
        } else {
            showEmptyState(true);
        }
        
        // Enable chat input
        chatInput.disabled = false;
        chatInput.focus();
        
        // Update conversation list
        updateConversationList();
        saveConversations();
    }
    
    // Show or hide the empty state
    function showEmptyState(show) {
        if (show) {
            emptyState.style.display = 'flex';
            chatLog.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            chatLog.style.display = 'flex';
        }
    }
    
    // Filter conversations based on search input
    function filterConversations() {
        const searchTerm = conversationSearch.value.toLowerCase().trim();
        const items = conversationHistory.querySelectorAll('.conversation-item');
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (searchTerm === '' || text.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    // Rename the current conversation
    function renameConversation() {
        if (!currentConversationId) return;
        
        const conversation = conversations[currentConversationId];
        if (!conversation) return;
        
        const newTitle = prompt("Enter a new name for this conversation:", conversation.title);
        if (newTitle && newTitle.trim()) {
            conversation.title = newTitle.trim();
            chatTitle.textContent = newTitle.trim();
            saveConversations();
            updateConversationList();
        }
    }
    
    // Load all conversations
    function loadConversations() {
        const savedConversations = localStorage.getItem('conversations');
        if (savedConversations) {
            conversations = JSON.parse(savedConversations);
        }
        
        updateConversationList();
    }
    
    // Load a specific conversation
    function loadConversation(conversationId) {
        if (!conversations[conversationId]) return;
        
        currentConversationId = conversationId;
        const conversation = conversations[conversationId];
        
        // Update UI
        messagesContainer.innerHTML = '';
        chatTitle.textContent = conversation.title || "Untitled Conversation";
        
        // If there are messages, display them
        if (conversation.messages && conversation.messages.length > 0) {
            conversation.messages.forEach(message => {
                const content = message.content;
                const isUser = message.isUser;
                const hasImage = message.image;
                
                const messageElement = createMessageElement(content, isUser, hasImage);
                messagesContainer.appendChild(messageElement);
                
                if (hasImage) {
                    const imgElement = document.createElement('img');
                    imgElement.src = message.image;
                    imgElement.alt = "Uploaded image";
                    messageElement.appendChild(imgElement);
                }
            });
            
            showEmptyState(false);
        } else {
            // Show empty state if no messages
            showEmptyState(true);
        }
        
        // Enable chat input
        chatInput.disabled = false;
        chatInput.focus();
        
        // Update conversation list UI
        updateConversationList();
        
        // Scroll to bottom
        scrollToBottom();
    }
    
    // Update conversation list in sidebar
    function updateConversationList() {
        conversationHistory.innerHTML = '';
        
        // Sort conversations by most recent first
        const sortedConversations = Object.values(conversations)
            .sort((a, b) => new Date(b.created) - new Date(a.created));
        
        sortedConversations.forEach(conversation => {
            // Only show conversation if it has messages or is the current one
            if (conversation.id === currentConversationId || 
                (conversation.messages && conversation.messages.length > 0)) {
                const conversationItem = document.createElement('div');
                conversationItem.classList.add('conversation-item');
                
                // Mark active conversation
                if (conversation.id === currentConversationId) {
                    conversationItem.classList.add('active');
                }
                
                // Add icon
                const icon = document.createElement('i');
                icon.classList.add('fas', 'fa-comment');
                conversationItem.appendChild(icon);
                
                // Add title or first message as conversation title
                let title = conversation.title || 
                            conversation.messages.find(msg => msg.isUser)?.content || 
                            "New Conversation";
                
                // Truncate if too long
                title = title.length > 25 ? title.substring(0, 25) + "..." : title;
                
                const titleSpan = document.createElement('span');
                titleSpan.textContent = title;
                conversationItem.appendChild(titleSpan);
                
                // Add action buttons
                const actions = document.createElement('div');
                actions.classList.add('conversation-actions');
                
                const editButton = document.createElement('button');
                editButton.classList.add('conversation-action-btn');
                editButton.innerHTML = '<i class="fas fa-edit"></i>';
                editButton.title = "Rename";
                editButton.onclick = (e) => {
                    e.stopPropagation();
                    const newName = prompt("Rename conversation:", title);
                    if (newName && newName.trim()) {
                        conversation.title = newName.trim();
                        if (conversation.id === currentConversationId) {
                            chatTitle.textContent = newName.trim();
                        }
                        saveConversations();
                        updateConversationList();
                    }
                };
                
                const deleteButton = document.createElement('button');
                deleteButton.classList.add('conversation-action-btn');
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteButton.title = "Delete";
                deleteButton.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this conversation?")) {
                        deleteConversation(conversation.id);
                    }
                };
                
                actions.appendChild(editButton);
                actions.appendChild(deleteButton);
                conversationItem.appendChild(actions);
                
                // Add click event to load conversation
                conversationItem.addEventListener('click', () => {
                    loadConversation(conversation.id);
                    
                    // Close sidebar on mobile
                    if (window.innerWidth <= 768) {
                        sidebar.classList.remove('open');
                    }
                });
                
                conversationHistory.appendChild(conversationItem);
            }
        });
        
        // Apply any active search filter
        if (conversationSearch.value.trim()) {
            filterConversations();
        }
    }
    
    // Delete a conversation
    function deleteConversation(conversationId) {
        // Remove from conversations object
        delete conversations[conversationId];
        saveConversations();
        
        // If the deleted conversation was the current one
        if (conversationId === currentConversationId) {
            currentConversationId = null;
            messagesContainer.innerHTML = '';
            chatTitle.textContent = "New Conversation";
            showEmptyState(true);
        }
        
        updateConversationList();
    }
    
    // Save all conversations
    function saveConversations() {
        localStorage.setItem('conversations', JSON.stringify(conversations));
    }
    
    // Create a message element
    function createMessageElement(content, isUser, hasImage = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        
        if (isUser) {
            messageDiv.classList.add('user-message');
        } else {
            messageDiv.classList.add('bot-message');
        }
        
        // Add message avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('message-avatar');
        avatarDiv.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        messageDiv.appendChild(avatarDiv);
        
        // Add message content
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        
        // Format message content
        const formattedMessage = formatMessage(content);
        contentDiv.innerHTML = formattedMessage;
        messageDiv.appendChild(contentDiv);
        
        // Add message actions
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('message-actions');
        
        const copyBtn = document.createElement('button');
        copyBtn.classList.add('message-action-btn');
        copyBtn.title = "Copy";
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(content)
                .then(() => {
                    // Show toast notification
                    showToast("Copied to clipboard");
                })
                .catch(() => {
                    console.error("Failed to copy text");
                });
        });
        
        actionsDiv.appendChild(copyBtn);
        messageDiv.appendChild(actionsDiv);
        
        // Add timestamp
        const timeSpan = document.createElement('div');
        timeSpan.classList.add('message-time');
        const now = new Date();
        timeSpan.textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        messageDiv.appendChild(timeSpan);
        
        return messageDiv;
    }
    
    // Show a toast notification
    function showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '1rem';
        toast.style.right = '1rem';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        toast.style.color = 'white';
        toast.style.padding = '0.5rem 1rem';
        toast.style.borderRadius = '4px';
        toast.style.zIndex = '1000';
        toast.style.transition = 'opacity 0.5s';
        
        document.body.appendChild(toast);
        
        // Remove after 2 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500);
        }, 2000);
    }
    
    // Add message to chat
    function addMessage(message, isUser, image = null) {
        // Create a new conversation if one doesn't exist
        if (!currentConversationId) {
            startNewConversation(false);
        }
        
        // Hide empty state if it's visible
        showEmptyState(false);
        
        // Create message element
        const messageElement = createMessageElement(message, isUser);
        messagesContainer.appendChild(messageElement);
        
        // Add image if provided
        if (image) {
            const imgElement = document.createElement('img');
            imgElement.src = image;
            imgElement.alt = "Uploaded image";
            messageElement.appendChild(imgElement);
        }
        
        // Save message to conversation
        conversations[currentConversationId].messages.push({
            content: message,
            isUser,
            timestamp: new Date().toISOString(),
            image: image
        });
        
        // If this is the first message, use it to name the conversation
        const conversation = conversations[currentConversationId];
        if (isUser && conversation.messages.length === 1) {
            // Use first 5 words for title
            const words = message.split(' ');
            const titleWords = words.slice(0, 5);
            const title = titleWords.join(' ') + (words.length > 5 ? '...' : '');
            conversation.title = title;
            chatTitle.textContent = title;
        }
        
        saveConversations();
        updateConversationList();
        scrollToBottom();
    }
    
    // Format message with markdown and links
    function formatMessage(message) {
        // Convert URLs to clickable links
        message = message.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" class="text-blue-500 hover:underline">$1</a>'
        );
        
        // Bold text
        message = message.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
        
        // Italic text
        message = message.replace(/_(.*?)_/g, '<em>$1</em>');
        
        // Code blocks (multiline)
        message = message.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Inline code
        message = message.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Headers (simple implementation)
        message = message.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        message = message.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        message = message.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        
        // Convert line breaks to <br>
        message = message.replace(/\n/g, '<br>');
        
        return message;
    }
    
    // Scroll chat to bottom
    function scrollToBottom() {
        chatLog.scrollTop = chatLog.scrollHeight;
    }
    
    // Handle image upload
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check if file is an image
        if (!file.type.match('image.*')) {
            showToast('Please select an image file');
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image file size must be less than 5MB');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imgSrc = e.target.result;
            
            // Add to attachments array
            attachments.push({
                id: generateId(),
                type: 'image',
                data: imgSrc
            });
            
            // Update attachment preview
            updateAttachmentPreview();
            
            // Enable send button
            chatSubmit.disabled = false;
        };
        
        reader.readAsDataURL(file);
    }
    
    // Update attachment preview
    function updateAttachmentPreview() {
        attachmentPreview.innerHTML = '';
        
        attachments.forEach(attachment => {
            const attachmentItem = document.createElement('div');
            attachmentItem.classList.add('attachment-item');
            
            if (attachment.type === 'image') {
                const img = document.createElement('img');
                img.src = attachment.data;
                attachmentItem.appendChild(img);
                
                const removeBtn = document.createElement('button');
                removeBtn.classList.add('remove-attachment');
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.addEventListener('click', () => removeAttachment(attachment.id));
                
                attachmentItem.appendChild(removeBtn);
            }
            
            attachmentPreview.appendChild(attachmentItem);
        });
    }
    
    // Remove attachment
    function removeAttachment(id) {
        attachments = attachments.filter(attachment => attachment.id !== id);
        updateAttachmentPreview();
        
        // Update send button state
        handleInputChange();
    }
    
    // Send message to server
    async function sendMessage(message, imageData = null) {
        try {
            // Show typing indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.classList.add('typing-indicator');
            loadingDiv.innerHTML = '<span></span><span></span><span></span>';
            messagesContainer.appendChild(loadingDiv);
            scrollToBottom();
            
            // Prepare request data
            const requestData = { message };
            
            // Add image data if available
            if (imageData) {
                requestData.image = imageData;
            }
            
            const response = await fetch('http://127.0.0.1:3000', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            // Remove typing indicator
            if (messagesContainer.contains(loadingDiv)) {
                messagesContainer.removeChild(loadingDiv);
            }
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Error sending message:', error);
            return 'Sorry, there was an error processing your request. Please check your connection and try again.';
        }
    }
    
    // Handle send message
    async function handleSendMessage() {
        const message = chatInput.value.trim();
        
        // Check if we have message text or attachments
        if (message || attachments.length > 0) {
            // Clear input
            chatInput.value = '';
            handleInputChange();
            
            // Process each attachment
            const imagesToSend = attachments.filter(att => att.type === 'image').map(att => att.data);
            
            // Add user message with attachments
            if (message) {
                addMessage(message, true, imagesToSend.length > 0 ? imagesToSend[0] : null);
            } else if (imagesToSend.length > 0) {
                // If only image with no text
                addMessage('Sent an image', true, imagesToSend[0]);
            }
            
            // Clear attachments
            attachments = [];
            updateAttachmentPreview();
            
            try {
                // Disable input while waiting for response
                chatInput.disabled = true;
                
                // Compose a prompt that includes information about the image if present
                let prompt = message;
                if (imagesToSend.length > 0) {
                    prompt += "\n\n[Note: User has uploaded an image with this message]";
                }
                
                // Send message to server
                const botResponse = await sendMessage(prompt, imagesToSend.length > 0 ? imagesToSend[0] : null);
                
                // Add bot response
                addMessage(botResponse, false);
                
                // Re-enable input
                chatInput.disabled = false;
                chatInput.focus();
            } catch (error) {
                console.error('Error in handleSendMessage:', error);
                addMessage('Sorry, there was an error processing your request.', false);
                chatInput.disabled = false;
            }
        }
    }
    
    // Toggle dark mode
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    }
    
    // Check saved theme preference
    function checkThemePreference() {
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        if (savedDarkMode) {
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
        }
    }
    
    // Toggle voice input
    function toggleVoiceInput() {
        if (!('webkitSpeechRecognition' in window)) {
            showToast('Sorry, your browser does not support speech recognition.');
            return;
        }
        
        if (isRecording) {
            // Stop recording
            isRecording = false;
            voiceInput.classList.remove('recording');
        } else {
            // Start recording
            isRecording = true;
            voiceInput.classList.add('recording');
            
            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'id-ID'; // Indonesian language
            recognition.continuous = false;
            recognition.interimResults = false;
            
            recognition.start();
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                chatInput.value = transcript;
                handleInputChange();
                
                // Create conversation if none exists
                if (!currentConversationId) {
                    startNewConversation(false);
                }
            };
            
            recognition.onend = function() {
                isRecording = false;
                voiceInput.classList.remove('recording');
            };
            
            recognition.onerror = function() {
                isRecording = false;
                voiceInput.classList.remove('recording');
                showToast('Error occurred in speech recognition');
            };
        }
    }
    
    // Clear chat history
    function clearChatHistory() {
        if (!currentConversationId) return;
        
        if (confirm('Are you sure you want to clear this conversation?')) {
            const conversation = conversations[currentConversationId];
            if (conversation) {
                conversation.messages = [];
                saveConversations();
                messagesContainer.innerHTML = '';
                showEmptyState(true);
            }
        }
    }
    
    // Export chat as text file
    function exportChatHistory() {
        if (!currentConversationId || !conversations[currentConversationId]) {
            showToast('No conversation to export');
            return;
        }
        
        const conversation = conversations[currentConversationId];
        const messages = conversation.messages;
        
        if (messages.length === 0) {
            showToast('No messages to export');
            return;
        }
        
        // Prepare export content
        let exportContent = `# ${conversation.title || "Conversation"}\n`;
        exportContent += `Exported on: ${new Date().toLocaleString()}\n\n`;
        
        exportContent += messages.map(message => {
            const sender = message.isUser ? 'You' : 'AI Assistant';
            const timestamp = new Date(message.timestamp).toLocaleString();
            return `## ${sender} (${timestamp}):\n${message.content}\n`;
        }).join('\n\n');
        
        const filename = `chat-export-${new Date().toISOString().slice(0, 10)}.md`;
        const blob = new Blob([exportContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Chat exported successfully');
    }
});