const express = require('express');
const bodyParser = require('body-parser');
const sendETH = require('./transfer'); 
const app = express();

const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../config/config.json');
const data = fs.readFileSync(filePath);
const config = JSON.parse(data);

const port = config.port;
const sendAmount = config.sendAmount;
const dailyLimitNum = config.dailyLimitNum;

let lastClearTime = new Date(); 
let receivedAmounts = {}; 

app.use(bodyParser.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
app.post('/sendEth', async (req, res) => {
    try {
        const toAddress = req.body.toAddress; 
        console.log(`receive req, toAddress:${toAddress}`);
        if(!toAddress || toAddress==''){
            res.json(json_response(null,'toAddress error'));
            return 
        }

        const now = new Date();
        const today = now.toISOString().slice(0, 10); 
        const receivedKey = `${toAddress}_${today}`;
        if (now.getDate() !== lastClearTime.getDate()) {
            receivedAmounts = {}; 
            lastClearTime = now; 
            console.log('reset receivedAmounts');
        }

        if (!receivedAmounts[receivedKey]) {
            receivedAmounts[receivedKey] = 0;
        }
        if (receivedAmounts[receivedKey] + sendAmount > dailyLimitNum) {
            res.json(json_response(null, 'Daily limit exceeded. Try again tomorrow.'));
            return;
        }
        const receipt = await sendETH(config.senderAddr, toAddress, sendAmount, config.senderPrivateKey, config.chainRpcEndpoint);
        receivedAmounts[receivedKey] += sendAmount;
        res.json(json_response(receipt.transactionHash));
    } catch (error) {
        res.json(json_response(null,error.message));
    }
});

// start server
app.listen(port, () => {
    console.log(`Faucet service listening at http://localhost:${port}`);
});
