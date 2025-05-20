document.addEventListener('DOMContentLoaded', function() {
    const chatLog = document.getElementById('chat-log');
    const chatInput = document.getElementById('chat-input');
    const chatSubmit = document.getElementById('chat-submit');

    // Function to add a message to the chat log
    function addMessage(message, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        
        if (isUser) {
            messageDiv.classList.add('user-message');
        } else {
            messageDiv.classList.add('bot-message');
        }
        
        messageDiv.textContent = message;
        chatLog.appendChild(messageDiv);
        
        // Scroll to the bottom of the chat log
        chatLog.scrollTop = chatLog.scrollHeight;

        // Add a clearfix div to fix floating issues
        const clearfix = document.createElement('div');
        clearfix.style.clear = 'both';
        chatLog.appendChild(clearfix);
    }

    // Function to send a message to the server
    async function sendMessage(message) {
        try {
            console.log('Sending message to server:', message);
            
            const response = await fetch('/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log('Received response:', data);
            return data.response;
        } catch (error) {
            console.error('Error sending message:', error);
            return 'Sorry, there was an error processing your request.';
        }
    }

    // Function to handle sending a message
    async function handleSendMessage() {
        const message = chatInput.value.trim();
        
        if (message) {
            console.log('Handling send message:', message);
            
            // Clear the input field
            chatInput.value = '';
            
            // Add the user message to the chat log
            addMessage(message, true);
            
            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.classList.add('message', 'bot-message');
            loadingDiv.textContent = 'Thinking...';
            chatLog.appendChild(loadingDiv);
            
            try {
                // Send the message to the server
                const botResponse = await sendMessage(message);
                
                // Remove loading indicator
                chatLog.removeChild(loadingDiv);
                
                // Add the bot response to the chat log
                addMessage(botResponse, false);
            } catch (error) {
                console.error('Error in handleSendMessage:', error);
                chatLog.removeChild(loadingDiv);
                addMessage('Sorry, there was an error processing your request.', false);
            }
        }
    }

    // Event listeners
    chatSubmit.addEventListener('click', function() {
        console.log('Send button clicked');
        handleSendMessage();
    });
    
    chatInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            console.log('Enter key pressed');
            handleSendMessage();
        }
    });

    // Add a welcome message
    addMessage('Hello!  How can I help you today?', false);
    
    console.log('Chat interface initialized');
});