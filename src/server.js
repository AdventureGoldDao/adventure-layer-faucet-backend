const express = require('express');
const bodyParser = require('body-parser');
const sendETH = require('./transfer');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const filePath = path.join(__dirname, '..', 'config', 'config.json');
const config = JSON.parse(fs.readFileSync(filePath));

const { port, sendAmount, dailyLimitNum, verifyKey, senderAddr, senderPrivateKey, chainRpcEndpoint } = config;

let lastClearTime = new Date();
let receivedAmounts = {};

app.use(bodyParser.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

const jsonResponse = (data, error = '') => ({ data: data || '', error: error || '' });

async function verifyTurnstileToken(token) {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${verifyKey}&response=${token}`,
    });
    const data = await response.json();
    return data.success;
}

app.post('/sendEth', async (req, res) => {
    try {
        const { token, toAddress } = req.body;
        console.log(`Received request with token: ${token}, toAddress: ${toAddress}`);

        if (!await verifyTurnstileToken(token)) {
            return res.json(jsonResponse(null, 'CAPTCHA verification failed'));
        }

        if (!toAddress) {
            return res.json(jsonResponse(null, 'toAddress error'));
        }

        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const receivedKey = `${toAddress}_${today}`;

        if (now.getDate() !== lastClearTime.getDate()) {
            receivedAmounts = {};
            lastClearTime = now;
        }

        if (!receivedAmounts[receivedKey]) {
            receivedAmounts[receivedKey] = 0;
        }

        if (receivedAmounts[receivedKey] + sendAmount > dailyLimitNum) {
            return res.json(jsonResponse(null, 'Daily limit exceeded. Try again tomorrow.'));
        }

        const receipt = await sendETH(senderAddr, toAddress, sendAmount, senderPrivateKey, chainRpcEndpoint);
        receivedAmounts[receivedKey] += sendAmount;
        res.json(jsonResponse(receipt.transactionHash));
    } catch (error) {
        res.json(jsonResponse(null, error.message));
    }
});

app.listen(port, () => {
    console.log(`Faucet service listening at http://localhost:${port}`);
});
