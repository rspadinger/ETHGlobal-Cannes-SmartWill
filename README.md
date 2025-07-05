# App Description

This project is a decentralized application (dApp) that allows users to create secure, on-chain inheritance plans for their crypto assets. After connecting a wallet (either a regular MetaMask wallet or a smart wallet via email/social login using Privy), users can view their current token balances and select from a list of whitelisted tokens (like ETH, USDC, LINK) to distribute to selected heirs.

The user defines how much of each token each heir will receive and sets a due date - the moment from which the plan becomes executable. This means: if the user hasn’t extended the due date (in case they’re still alive), the smart contract considers the user possibly deceased, and the inheritance plan can be executed.

Heirs can log into the dApp with their own wallet to view all the inheritance plans they are part of. For each plan, they can see the due date and the exact amounts of each token they are eligible to inherit. Once the due date is reached, the plan is automatically executed via Chainlink Automation to distribute the tokens to the heirs. However, manual execution by any heir is also possible via the dApp interface.

The dApp offers flexibility for users to extend the due date (e.g., if they’re still alive) or adjust heirs and token distribution at any time before the plan becomes executable.

# Getting Started

## 1. Clone the Repository

## 2. Install Dependencies

Install for both the frontend (`ui`) and smart contracts (`sc`) folders:

```bash
cd ui
npm install

cd ../sc
npm install
```

## 3. Set Environment Variables

Update the `.env.example` files in both folders and rename them to `.env`.

You’ll need:

-   Your **Privy app ID**
-   Any RPC URLs or chain-specific configs

### 4. Deploy Smart Contracts

Use Hardhat to deploy the contracts in the `sc` folder:

```bash
cd sc
npx hardhat run scripts/deployVerify.js --network <your_network>
```

Ensure the contract addresses are updated in your frontend config.

### 5. Run the Frontend

```bash
cd ../ui
npm run dev
```

Visit `http://localhost:3000` to access the dApp.
