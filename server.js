const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_KEY = "AIzaSyC-if6ei1E11uPPPs2JOAmfquSXCHPMtCo";
const genAI = new GoogleGenerativeAI(API_KEY);

const hostname = '127.0.0.1';
const port = 3000;

async function run(prompt) {
  try {
    console.log('Sending prompt to Gemini API:', prompt);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = result.response;
    console.log('Received response from Gemini API');
    return response.text();
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return 'Sorry, I encountered an error while processing your request.';
  }
}

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} request received for ${req.url}`);

  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request (preflight for CORS)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        console.log('Received POST data:', body);
        const data = JSON.parse(body);
        const message = data.message;

        console.log('Processing message:', message);

        // Process the message and generate a response
        const botResponse = await run(message);
        const response = { response: botResponse };

        console.log('Sending response:', response);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error('Error processing message:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response: 'Internal Server Error', error: error.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) {
        console.error('Error reading index.html:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  } else if (req.method === 'GET' && req.url === '/script.js') {
    fs.readFile(path.join(__dirname, 'script.js'), (err, data) => {
      if (err) {
        console.error('Error reading script.js:', err);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
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
});