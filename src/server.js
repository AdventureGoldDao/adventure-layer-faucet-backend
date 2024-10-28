const express = require('express');
const bodyParser = require('body-parser');
const sendETH = require('./transfer'); 
const app = express();

const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'config', 'config.json');
const data = fs.readFileSync(filePath);
const config = JSON.parse(data);

const port = config.port;
const sendAmount = config.sendAmount;
const dailyLimitNum = config.dailyLimitNum;

let lastClearTime = new Date(); // Initialize the last reset time to the current time
let receivedAmounts = {}; // Used to store the cumulative amount of ETH received by each address daily

// Set middleware to parse JSON data for POST requests
app.use(bodyParser.json());

// Set CORS headers
app.use((req, res, next) => {
    // Allow cross-origin requests from all sources
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Allow specific HTTP methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    // Allow specific request headers
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Proceed to the next middleware
    next();
});

let json_response = function(data, error=''){
    if(data){
        return {data:data,error:''}
    }
    else{
        return {data:'',error:error}
    }
}

const fetch = require('node-fetch');

// Function to verify the Turnstile CAPTCHA token
async function verifyTurnstileToken(token) {

  const secretKey = config.verifyKey;
  const url =  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `secret=${secretKey}&response=${token}`,
  });

  const data = await response.json();
  return data.success;
}

// Endpoint for the faucet service
app.post('/sendEth', async (req, res) => {
    try {
        const { token, username, password } = req.body;
        console.log(`receive req, token:${token},username:${username},password:${password}`);

        const isValid = await verifyTurnstileToken(token);

        if (!isValid) {
            res.json(json_response(null, 'CAPTCHA verification failed'));
            return;
        }

        const toAddress = req.body.toAddress; // Receiver's Ethereum address
        console.log(`receive req, toAddress:${toAddress}`);
        if(!toAddress || toAddress==''){
            res.json(json_response(null, 'toAddress error'));
            return;
        }

        // Check if the daily limit (e.g., 0.5 ETH) has been exceeded
        const now = new Date();
        const today = now.toISOString().slice(0, 10); // Get today’s date
        const receivedKey = `${toAddress}_${today}`;
        
        // Check if it's time to clear yesterday's data
        if (now.getDate() !== lastClearTime.getDate()) {
            receivedAmounts = {}; // Clear the dailyLimits object
            lastClearTime = now; // Update the last reset time to the current time
        }

        // Initialize received amount to 0
        if (!receivedAmounts[receivedKey]) {
            receivedAmounts[receivedKey] = 0;
        }

        // Check if today’s received amount exceeds the limit
        if (receivedAmounts[receivedKey] + sendAmount > dailyLimitNum) {
            res.json(json_response(null, 'Daily limit exceeded. Try again tomorrow.'));
            return;
        }

        const receipt = await sendETH(config.senderAddr, toAddress, sendAmount, config.senderPrivateKey, config.chainRpcEndpoint);

        // Return success response
        res.json(json_response(receipt.transactionHash));
    } catch (error) {
        // Return error response
        res.json(json_response(null, error.message));
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Faucet service listening at http://localhost:${port}`);
});
