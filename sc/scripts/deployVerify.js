const fs = require("fs")
const path = require("path")
const { ethers } = require("hardhat")

const { LINK, USDC } = process.env

async function main() {
    const network = hre.network.name
    const verifyCommands = []

    // Deploy WillRegistry
    const WillRegistry = await ethers.getContractFactory("WillRegistry")
    const willRegistry = await WillRegistry.deploy()
    await willRegistry.waitForDeployment()
    console.log("WillRegistry: ", willRegistry.target)
    verifyCommands.push(`npx hardhat verify --network ${network} ${willRegistry.target}`)

    // Deploy WillEscrow
    const WillEscrow = await ethers.getContractFactory("WillEscrow")
    const willEscrow = await WillEscrow.deploy()
    await willEscrow.waitForDeployment()
    console.log("WillEscrow: ", willEscrow.target)
    verifyCommands.push(`npx hardhat verify --network ${network} ${willEscrow.target}`)

    // Deploy WillFactory
    const WillFactory = await ethers.getContractFactory("WillFactory")
    const willFactory = await WillFactory.deploy(willRegistry.target, willEscrow.target)
    await willFactory.waitForDeployment()
    console.log("WillFactory: ", willFactory.target)

    // Prepare constructor arguments for verification
    const willFactoryArgs = [`"${willRegistry.target}"`, `"${willEscrow.target}"`].join(" ")
    verifyCommands.push(`npx hardhat verify --network ${network} ${willFactory.target} ${willFactoryArgs}`)

    // Write verification commands to verify.txt
    const verifyFilePath = path.join(__dirname, "verify.txt")
    fs.writeFileSync(verifyFilePath, verifyCommands.join("\n"))
    console.log(`\n Verification commands saved to ${verifyFilePath}`)
    console.log(" You can now run:\n")
    console.log(`   bash ${verifyFilePath}\n`)

    // Set properties
    console.log("Setting Properties...")
    await willEscrow.setFactory(willFactory.target)
    await willRegistry.setFactory(willFactory.target)

    await willFactory.addTokenToWhiteList(USDC)
    await willFactory.addTokenToWhiteList(LINK)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})

//npx hardhat run scripts/deployVerify.js --network sepolia
//bash D:/_ETHGlobal/SmartWill/sc/scripts/verify.txt
