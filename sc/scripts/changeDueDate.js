const { ethers } = require("hardhat")

const owner = "0xB1b504848e1a5e90aEAA1D03A06ECEee55562803"
const willFactoryAddress = "0x8d0D85b136d1605A57D336522B0c6d9db7d3B5EF"

let tx

async function passDueDate() {
    const [signer] = await ethers.getSigners()
    const willFactory = await ethers.getContractAt("WillFactory", willFactoryAddress, signer)

    const willAddress = await willFactory.creatorToWill(owner)
    console.log("LastWill Address: ", willAddress)

    const LastWill = await ethers.getContractAt("LastWill", willAddress, signer)

    const block = await signer.provider.getBlock("latest")
    const timestamp = block.timestamp

    tx = await LastWill.updateDueDate(timestamp + 20)
    await tx.wait()
    console.log("DueDate has been updated to Now + 20 seconds!")
}

async function main() {
    await passDueDate()
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})

//const alice = "0xAEC14A3779A969D770DaB7e78313aF9F6E652e2B"
//const bob = "0x2F1F12C62cE761803bED46Ef89BD5Fe386032688"
//npx hardhat run scripts/changeDueDate.js --network sepolia
