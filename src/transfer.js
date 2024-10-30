const { Web3 } = require('./node_modules/web3/lib/commonjs/web3.js');
const { ethers } = require("./node_modules/ethers/lib.commonjs/ethers.js");
const BigNumber = require('./node_modules/bignumber.js/bignumber.js');

// Function to send ETH
let sendETH = async (from, to, amount, privateKey, infuraUrl) => {
    console.log('start sendEth', from, to, amount);
    // Initialize a web3 instance and connect to an Ethereum node (e.g., Infura)
    const web3 = new Web3(infuraUrl);
    try {
        // Get the balance of the sender's account
        const balance = await web3.eth.getBalance(from);
        const balanceInEther = web3.utils.fromWei(balance, 'ether');
        console.log('Sender balance:', balanceInEther, 'ETH');
        
        // Convert the amount to wei (the smallest unit of ether)
        const value = web3.utils.toWei(amount.toString(), 'ether');

        // Check if the sender's account balance is sufficient to cover the amount sent and transaction fees
        const gasPrice = await web3.eth.getGasPrice();
        const estimatedGas = await web3.eth.estimateGas({ from, to, value });
        
        // Calculate the total cost
        const totalCostWei = new BigNumber(gasPrice).times(estimatedGas).plus(value);
        const totalCostStr = totalCostWei.toString();
        const totalCostBN = new BigNumber(totalCostStr);
        const balanceBN = new BigNumber(balance);
        
        if (balanceBN.lt(totalCostBN)) {
            throw new Error('Insufficient balance to cover transaction cost');
        }

        // Create a transaction object
        const transaction = {
            from,
            to,
            value,
            gas: estimatedGas,
            gasPrice,
        };

        // Sign the transaction with the sender's private key
        const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);

        // Send the signed transaction
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log('Transaction receipt:', receipt);
        return receipt;
    } catch (error) {
        throw new Error(`Failed to send ETH: ${error.message}`);
    }
};

module.exports = sendETH;
