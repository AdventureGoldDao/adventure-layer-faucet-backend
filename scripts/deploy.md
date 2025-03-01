# How to deploy the backend server for faucet

# start server

## Step1: configure by config/config.json
You need set the praram "chainRpcEndpoint" by the l2 rpc endpoint url.
You need set the prarm "senderAddr" by the public address for the official account who can send money out.
You need set the prarm "senderPrivateKey" by the private key for the official account who can send money out.

## Step2: install node and pm2 install node modules
```
cd scriptis
sh deploy.sh
```

## Step3: start server
```
cd ..
pm2 start src/server.js --name faucet-backend
```

# stop server
```
pm2 stop faucet-backend
```
# restart server
```
pm2 restart faucet-backend
```