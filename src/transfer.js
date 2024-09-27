const { Web3 } = require('web3');
const BigNumber = require('bn.js');

let sendETH = async (from, to, amount, privateKey, infuraUrl) => {
    console.log('start sendEth',from,to,amount);

    const web3 = new Web3(infuraUrl);
    try {
        const balance = await web3.eth.getBalance(from);
        const balanceInEther = web3.utils.fromWei(balance, 'ether');
        console.log('Sender balance:', balanceInEther, 'ETH');
        const value = web3.utils.toWei(amount.toString(), 'ether');

        const gasPrice = await web3.eth.getGasPrice();
        const estimatedGas = await web3.eth.estimateGas({ from, to, value });
        const totalCostBN = new BigNumber(gasPrice).mul(estimatedGas).plus(value);
        //const totalCostStr = totalCostWei.toString();
        //const totalCostBN = new BigNumber(totalCostStr);
        const balanceBN = new BigNumber(balance);
        if (balanceBN.lt(totalCostBN)) {
            throw new Error('Insufficient balance to cover transaction cost');
        }
        console.log('begin signTransaction');
        const transaction = {
            from,
            to,
            value,
            gas: estimatedGas,
            gasPrice,
        };

        const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
        console.log('begin sendSignedTransaction');
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log('Transaction receipt:', receipt);
        return receipt;
    } catch (error) {
        throw new Error(`Failed to send ETH: ${error.message}`);
    }
};

module.exports = sendETH;
