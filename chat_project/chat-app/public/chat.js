const socket = io();
let username = '';
let selectedMessageId = null;

// Initialize messages Map
const messages = new Map();

function setUsername() {
    const usernameInput = document.getElementById('usernameInput');
    username = usernameInput.value.trim();
    
    if (username) {
        document.getElementById('usernameModal').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
        document.getElementById('displayUsername').textContent = username;
        socket.emit('join', username);
    }
}

function generateMessageId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

function toggleEmojiPicker(messageId = null) {
    const picker = document.getElementById('emojiPicker');
    const currentDisplay = picker.style.display;
    selectedMessageId = messageId;
    
    if (messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            const rect = messageElement.getBoundingClientRect();
            picker.style.position = 'fixed';
            picker.style.top = `${rect.top - 50}px`;
            picker.style.left = `${rect.left}px`;
        }
    } else {
        picker.style.position = 'absolute';
        picker.style.bottom = '80px';
        picker.style.left = '20px';
    }
    
    picker.style.display = currentDisplay === 'none' ? 'block' : 'none';
}

function addReaction(emoji) {
    if (selectedMessageId) {
        socket.emit('add reaction', {
            messageId: selectedMessageId,
            emoji: emoji,
            username: username
        });
    } else {
        const messageInput = document.getElementById('messageInput');
        messageInput.value += emoji;
    }
    toggleEmojiPicker();
}

function displayMessage(msg) {
    const messageArea = document.getElementById('messageArea');
    const messageDiv = document.createElement('div');
    const messageId = msg.id || generateMessageId();
    
    messageDiv.className = `message ${msg.username === username ? 'sent' : 'received'}`;
    messageDiv.setAttribute('data-message-id', messageId);
    
    const time = new Date(msg.created_at).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="username">${msg.username}</div>
        <div class="message-content">${msg.message}</div>
        <div class="message-time">${time}</div>
        <div class="message-reactions" id="reactions-${messageId}"></div>
        <div class="message-actions">
            <div class="action-btn" onclick="toggleEmojiPicker('${messageId}')" title="Add reaction">
                <i class="fas fa-smile"></i>
            </div>
        </div>
    `;
    
    messageArea.appendChild(messageDiv);
    messageArea.scrollTop = messageArea.scrollHeight;
    
    if (msg.reactions) {
        updateMessageReactions(messageId, msg.reactions);
    }
}

function updateMessageReactions(messageId, reactions) {
    const reactionsContainer = document.getElementById(`reactions-${messageId}`);
    if (!reactionsContainer) return;

    reactionsContainer.innerHTML = '';
    
    // Group reactions by emoji
    const reactionGroups = {};
    reactions.forEach(reaction => {
        if (!reactionGroups[reaction.emoji]) {
            reactionGroups[reaction.emoji] = {
                users: [],
                count: 0
            };
        }
        reactionGroups[reaction.emoji].users.push(reaction.username);
        reactionGroups[reaction.emoji].count++;
    });

    // Create reaction elements
    Object.entries(reactionGroups).forEach(([emoji, data]) => {
        const reactionSpan = document.createElement('span');
        reactionSpan.className = 'reaction';
        if (data.users.includes(username)) {
            reactionSpan.classList.add('my-reaction');
        }
        
        // Create tooltip with usernames
        const tooltipText = data.users.join(', ');
        
        reactionSpan.innerHTML = `
            <span class="reaction-tooltip">${tooltipText}</span>
            ${emoji} <span class="reaction-count">${data.count}</span>
        `;
        reactionSpan.onclick = () => addReaction(emoji);
        reactionsContainer.appendChild(reactionSpan);
    });
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message && username) {
        const messageData = {
            message: message,
            username: username,
            created_at: new Date(),
            id: generateMessageId(),
            reactions: []
        };
        
        socket.emit('chat message', messageData);
        messageInput.value = '';
    }
}

// Socket event listeners
socket.on('chat message', function(msg) {
    displayMessage(msg);
});

socket.on('user count', function(count) {
    document.getElementById('userCount').textContent = count;
});

socket.on('active users', function(users) {
    const usersList = document.getElementById('activeUsersList');
    usersList.innerHTML = `Active Users: ${users.join(', ')}`;
});

socket.on('reaction added', function(data) {
    const message = messages.get(data.messageId);
    if (message) {
        message.reactions = data.reactions;
        updateMessageReactions(data.messageId, data.reactions);
    }
});

// Add enter key functionality for inputs
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

document.getElementById('usernameInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        setUsername();
    }
});

// Close emoji picker when clicking outside
document.addEventListener('click', function(e) {
    const emojiPicker = document.getElementById('emojiPicker');
    const emojiBtn = e.target.closest('.emoji-btn');
    const emojiContainer = e.target.closest('.emoji-container');
    
    if (!emojiBtn && !emojiContainer && emojiPicker.style.display === 'block') {
        emojiPicker.style.display = 'none';
        selectedMessageId = null;
    }
});

