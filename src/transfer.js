const { Web3 } = require('./node_modules/web3/lib/commonjs/web3.js');
const BigNumber = require('./node_modules/bignumber.js/bignumber.js');

/**
 * Sends ETH from one address to another.
 *
 * @param {string} from - The sender's address.
 * @param {string} to - The recipient's address.
 * @param {number|string} amount - The amount of ETH to send.
 * @param {string} privateKey - The private key of the sender's address.
 * @param {string} infuraUrl - The Infura URL for connecting to the Ethereum network.
 * @returns {Promise<Object>} - The transaction receipt.
 * @throws {Error} - If there is an error during the transaction.
 */
let sendETH = async (from, to, amount, privateKey, infuraUrl) => {
    console.log('Start sending ETH:', from, to, amount);
    
    const web3 = new Web3(infuraUrl);

    try {
        // Get the sender's balance and convert it to ether
        const balanceWei = await web3.eth.getBalance(from);
        const balanceInEther = web3.utils.fromWei(balanceWei, 'ether');
        console.log('Sender balance:', balanceInEther, 'ETH');

        // Convert the amount to wei
        const valueWei = web3.utils.toWei(amount.toString(), 'ether');

        // Check if the sender has enough balance
        const valueBN = new BigNumber(valueWei);
        const balanceBN = new BigNumber(balanceWei);
        if (balanceBN.lt(valueBN)) {
            throw new Error('Insufficient ETH balance for transfer');
        }

        // Get gas price and estimate gas usage
        const [gasPrice, estimatedGas] = await Promise.all([
            web3.eth.getGasPrice(),
            web3.eth.estimateGas({ from, to, value: valueWei })
        ]);

        // Calculate total transaction cost (value + gas)
        const totalCostWei = new BigNumber(gasPrice).times(estimatedGas).plus(valueBN);
        
        if (balanceBN.lt(totalCostWei)) {
            throw new Error('Insufficient balance to cover transaction cost');
        }

        // Create the transaction object
        const transaction = {
            from,
            to,
            value: valueWei,
            gas: estimatedGas,
            gasPrice
        };

        // Sign and send the transaction
        const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        
        console.log('Transaction receipt:', receipt);
        return receipt;

    } catch (error) {
        console.error('Error sending ETH:', error.message);
        throw new Error(`Failed to send ETH: ${error.message}`);
    }
};

module.exports = sendETH;
