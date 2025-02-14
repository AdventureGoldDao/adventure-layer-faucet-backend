const express = require('express');
const bodyParser = require('body-parser');
const sendETH = require('./transfer');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const filePath = path.join(__dirname, '..', 'config', 'config.json');
const config = JSON.parse(fs.readFileSync(filePath));

// Destructure configuration values for easy access
const { port, sendAmount, dailyLimitNum, verifyKey, senderAddr, senderPrivateKey, chainRpcEndpoint } = config;

let lastClearTime = new Date(); // Track the last time daily limits were reset
let receivedAmounts = {}; // Store the amount of ETH received by each address daily

app.use(bodyParser.json()); // Middleware to parse JSON bodies

// Middleware to set CORS headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Helper function to format JSON responses
const jsonResponse = (data, error = '') => ({ data: data || '', error: error || '' });

// Function to verify CAPTCHA token using Cloudflare's Turnstile
async function verifyTurnstileToken(token) {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${verifyKey}&response=${token}`,
    });
    const data = await response.json();
    return data.success; // Return whether the CAPTCHA verification was successful
}

// Endpoint to handle ETH sending requests
app.post('/sendEth', async (req, res) => {
    try {
        const { token, toAddress } = req.body;
        console.log(`Received request with token: ${token}, toAddress: ${toAddress}`);

        // Verify CAPTCHA token
        if (!await verifyTurnstileToken(token)) {
            return res.json(jsonResponse(null, 'CAPTCHA verification failed'));
        }

        // Validate the recipient address
        if (!toAddress) {
            return res.json(jsonResponse(null, 'toAddress error'));
        }

        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const receivedKey = `${toAddress}_${today}`;

        // Reset daily limits if a new day has started
        if (now.getDate() !== lastClearTime.getDate()) {
            receivedAmounts = {};
            lastClearTime = now;
        }

        // Initialize the received amount for the address if not already set
        if (!receivedAmounts[receivedKey]) {
            receivedAmounts[receivedKey] = 0;
        }

        // Check if the daily limit has been exceeded
        if (receivedAmounts[receivedKey] + sendAmount > dailyLimitNum) {
            return res.json(jsonResponse(null, 'Daily limit exceeded. Try again tomorrow.'));
        }

        // Send ETH and update the received amount
        const receipt = await sendETH(senderAddr, toAddress, sendAmount, senderPrivateKey, chainRpcEndpoint);
        receivedAmounts[receivedKey] += sendAmount;
        res.json(jsonResponse(receipt.transactionHash)); // Return the transaction hash
    } catch (error) {
        res.json(jsonResponse(null, error.message)); // Handle errors
    }
});

// Start the server and listen on the configured port
app.listen(port, () => {
    console.log(`Faucet service listening at http://localhost:${port}`);
});
