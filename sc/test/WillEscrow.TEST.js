const { expect } = require("chai")
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers")
const { ethers } = require("hardhat")

describe("WillEscrow Contract", function () {
    // Deploy all required contracts and set up the environment
    async function deployContractFixture() {
        const [owner, user1, user2, user3] = await ethers.getSigners()

        // Deploy mock ERC20 tokens for testing
        const MockToken = await ethers.getContractFactory("MockERC20")
        const mockToken1 = await MockToken.deploy("Mock Token 1", "MTK1", 18, ethers.parseEther("100000"))
        const mockToken2 = await MockToken.deploy("Mock Token 2", "MTK2", 6, ethers.parseEther("100000"))

        // Deploy WillEscrow with factory address
        const WillEscrow = await ethers.getContractFactory("WillEscrow")
        const willEscrow = await WillEscrow.deploy()

        // Deploy WillRegistry first
        const WillRegistry = await ethers.getContractFactory("WillRegistry")
        const willRegistry = await WillRegistry.deploy()

        // Deploy WillFactory
        const WillFactory = await ethers.getContractFactory("WillFactory")
        const willFactory = await WillFactory.deploy(willRegistry.target, willEscrow.target)

        // Set factory in escrow
        await willEscrow.setFactory(willFactory.target)

        // Add tokens to whitelist
        await willFactory.addTokenToWhiteList(mockToken1.target)
        await willFactory.addTokenToWhiteList(mockToken2.target)

        // Create a LastWill contract for testing
        const dueDate = (await time.latest()) + 86400 // 1 day from now
        await willFactory.connect(user1).createLastWill(dueDate)
        const lastWillAddress = await willFactory.connect(user1).getCreatedWill()
        const lastWill = await ethers.getContractAt("LastWill", lastWillAddress)

        // Mint tokens to users for testing
        await mockToken1.mint(user1.address, ethers.parseEther("1000"))
        await mockToken2.mint(user1.address, ethers.parseUnits("1000", 6))

        // Approve tokens for LastWill
        await mockToken1.connect(user1).approve(lastWill.target, ethers.parseEther("1000"))
        await mockToken2.connect(user1).approve(lastWill.target, ethers.parseUnits("1000", 6))

        return {
            lastWill,
            willFactory,
            willEscrow,
            willRegistry,
            mockToken1,
            mockToken2,
            owner,
            user1,
            user2,
            user3,
        }
    }

    describe("Deployment and Initialization", function () {
        it("Should deploy with correct initial state", async function () {
            const { willEscrow, willFactory } = await loadFixture(deployContractFixture)

            expect(await willEscrow.factory()).to.equal(willFactory.target)
            expect(await willEscrow.authorizedCallers(willFactory.target)).to.be.true
        })

        it("Should allow only owner to set factory", async function () {
            const { willEscrow, user1 } = await loadFixture(deployContractFixture)

            await expect(willEscrow.connect(user1).setFactory(user1.address)).to.be.revertedWithCustomError(
                willEscrow,
                "OwnableUnauthorizedAccount"
            )
        })
    })

    describe("Authorization Management", function () {
        it("Should allow factory to authorize callers", async function () {
            const { lastWill, willEscrow, willFactory, user1 } = await loadFixture(deployContractFixture)

            expect(await willEscrow.authorizedCallers(lastWill.target)).to.be.true
        })

        it("Should not allow non-factory to authorize callers", async function () {
            const { willEscrow, user1, user2 } = await loadFixture(deployContractFixture)

            await expect(willEscrow.connect(user1).authorize(user2.address)).to.be.revertedWithCustomError(
                willEscrow,
                "UnauthorizedCaller"
            )
        })
    })

    describe("Will Registration", function () {
        it("Should allow authorized caller to register will", async function () {
            const { willEscrow, willFactory, lastWill } = await loadFixture(deployContractFixture)

            expect(await willEscrow.registeredWills(lastWill.target)).to.be.true
        })

        it("Should not allow unauthorized caller to register will", async function () {
            const { willEscrow, user1 } = await loadFixture(deployContractFixture)

            await expect(willEscrow.connect(user1).registerWill(user1.address)).to.be.revertedWithCustomError(
                willEscrow,
                "UnauthorizedCaller"
            )
        })
    })

    describe("Token Deposits", function () {
        it("Should allow authorized caller to register ERC20 deposit", async function () {
            const { willEscrow, lastWill, mockToken1, user1, user2 } = await loadFixture(
                deployContractFixture
            )
            const amount = ethers.parseEther("100")

            const tokens = [mockToken1.target]
            const amounts = [ethers.parseEther("100")]
            await lastWill.connect(user1).addHeir(user2.address, tokens, amounts)

            //after adding a heir, a deposit should have been registered
            const balance = await willEscrow.tokenBalances(lastWill.target, mockToken1.target)
            expect(balance.amount).to.equal(amount)

            expect(balance.owner).to.equal(lastWill.target)
        })

        it("Should allow authorized caller to register ETH deposit", async function () {
            const { willEscrow, lastWill, user1, user2 } = await loadFixture(deployContractFixture)
            const amount = ethers.parseEther("1")

            const tokens = [ethers.ZeroAddress]
            const amounts = [ethers.parseEther("1")]
            await lastWill.connect(user1).addHeir(user2.address, tokens, amounts, { value: amount })

            // After adding a heir, a deposit should have been registered
            const balance = await willEscrow.tokenBalances(lastWill.target, ethers.ZeroAddress)
            expect(balance.amount).to.equal(amount)
            expect(balance.owner).to.equal(lastWill.target)
            expect(await willEscrow.nativeBalances(lastWill.target)).to.equal(amount)
        })

        it("Should not allow unauthorized caller to register deposit", async function () {
            const { willEscrow, user1, mockToken1 } = await loadFixture(deployContractFixture)

            await expect(
                willEscrow.connect(user1).registerDeposit(user1.address, mockToken1.target, 100)
            ).to.be.revertedWithCustomError(willEscrow, "WillNotRegistered")
        })
    })
})
