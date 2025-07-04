# App Description

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
