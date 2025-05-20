const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const API_KEY = "AIzaSyC-if6ei1E11uPPPs2JOAmfquSXCHPMtCo";
const genAI = new GoogleGenerativeAI(API_KEY);

const hostname = '127.0.0.1';
const port = 3000;

// Store conversation history for better context
const chatHistory = {};

// Function to process requests with images
async function runWithImage(prompt, image, sessionId) {
  try {
    console.log('Sending prompt with image to Gemini API');
    
    if (!chatHistory[sessionId]) {
      chatHistory[sessionId] = [];
    }
    
    // Use Gemini Pro Vision for image processing
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    // Prepare image data
    const imageData = processImageData(image);
    
    // Create message parts with text and image
    const parts = [
      { text: prompt },
      { inlineData: { data: imageData, mimeType: "image/jpeg" } }
    ];
    
    // Generate content with the image
    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const response = result.response;
    
    // Store interaction in history
    chatHistory[sessionId].push({ role: "user", parts: [{ text: prompt + " [Image attached]" }] });
    chatHistory[sessionId].push({ role: "model", parts: [{ text: response.text() }] });
    
    // Limit history length
    if (chatHistory[sessionId].length > 20) {
      chatHistory[sessionId] = chatHistory[sessionId].slice(-20);
    }
    
    console.log('Received response from Gemini API for image prompt');
    return response.text();
  } catch (error) {
    console.error('Error calling Gemini API with image:', error);
    return 'Sorry, I had trouble analyzing that image. Could you try again or describe what you see?';
  }
}

// Process base64 image data
function processImageData(imageData) {
  // Remove data URL prefix if present
  if (imageData.startsWith('data:image')) {
    imageData = imageData.split(',')[1];
  }
  return imageData;
}

// Function to process text-only requests
async function run(prompt, sessionId) {
  try {
    console.log('Sending prompt to Gemini API:', prompt);
    
    // Get or create chat history for this session
    if (!chatHistory[sessionId]) {
      chatHistory[sessionId] = [];
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create chat with conversation history
    const chat = model.startChat({
      history: chatHistory[sessionId],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });
    
    // Send message and get response
    const result = await chat.sendMessage(prompt);
    const response = result.response;
    
    // Store interaction in history
    chatHistory[sessionId].push({ role: "user", parts: [{ text: prompt }] });
    chatHistory[sessionId].push({ role: "model", parts: [{ text: response.text() }] });
    
    // Limit history length
    if (chatHistory[sessionId].length > 20) {
      chatHistory[sessionId] = chatHistory[sessionId].slice(-20);
    }
    
    console.log('Received response from Gemini API');
    return response.text();
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return 'Sorry, I encountered an error processing your request.';
  }
}

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} request received for ${req.url}`);

  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS requests (preflight for CORS)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL to get path
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (req.method === 'POST' && pathname === '/') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        console.log('Received POST data');
        const data = JSON.parse(body);
        const message = data.message;
        const imageData = data.image; // Get image data if available
        
        // Use client IP as simple session ID
        const sessionId = req.socket.remoteAddress || 'default';

        console.log('Processing message:', message);
        console.log('Image data present:', !!imageData);

        let botResponse;
        
        // Use image processing if image is provided
        if (imageData) {
          botResponse = await runWithImage(message, imageData, sessionId);
        } else {
          // Use text-only processing
          botResponse = await run(message, sessionId);
        }

        const response = { response: botResponse };

        console.log('Sending response');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error('Error processing message:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response: 'Internal Server Error', error: error.message }));
      }
    });
  } else if (req.method === 'GET') {
    // Handle static file requests
    let filePath;
    
    if (pathname === '/') {
      filePath = path.join(__dirname, 'index.html');
    } else {
      // Remove leading slash and use as relative path
      filePath = path.join(__dirname, pathname.substring(1));
    }
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.woff': 'application/font-woff',
      '.ttf': 'application/font-ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.otf': 'application/font-otf',
      '.wasm': 'application/wasm'
    }[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // File not found
          console.error('File not found:', filePath);
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        } else {
          // Server error
          console.error('Server error:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      } else {
        // Success
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  } else {
    console.error('Error: Not Found -', req.url);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
  console.log('Press Ctrl+C to stop the server');
});