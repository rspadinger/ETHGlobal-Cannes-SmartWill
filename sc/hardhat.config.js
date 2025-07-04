require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config()

const {
    ALCHEMY_API_URL_SEPOLIA,
    ALCHEMY_API_URL_AMOY,
    ETHERSCAN_API_KEY,
    POLYGON_API_KEY,
    PRIVATE_KEY_ACC1,
} = process.env

module.exports = {
    solidity: {
        version: "0.8.28",
        settings: {
            optimizer: { enabled: true, runs: 200 },
        },
    },
    defaultNetwork: "hardhat",
    networks: {
        sepolia: {
            url: ALCHEMY_API_URL_SEPOLIA,
            accounts: [`0x${PRIVATE_KEY_ACC1}`],
        },
        amoy: {
            url: ALCHEMY_API_URL_AMOY,
            accounts: [`0x${PRIVATE_KEY_ACC1}`],
        },
    },
    //npx hardhat verify --network sepolia ADDR "constructor argument"
    etherscan: {
        apiKey: {
            sepolia: ETHERSCAN_API_KEY,
            polygonAmoy: POLYGON_API_KEY,
        },
    },
}
