const { expect } = require("chai")
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers")
const { ethers } = require("hardhat")

describe("WillFactory Contract", function () {
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

        // Mint tokens to users for testing
        await mockToken1.mint(user1.address, ethers.parseEther("1000"))
        await mockToken2.mint(user1.address, ethers.parseUnits("1000", 6))

        // Approve tokens for factory
        await mockToken1.connect(user1).approve(willFactory.target, ethers.parseEther("1000"))
        await mockToken2.connect(user1).approve(willFactory.target, ethers.parseUnits("1000", 6))

        return {
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
            const { willFactory, willEscrow, willRegistry } = await loadFixture(deployContractFixture)

            expect(await willFactory.escrow()).to.equal(willEscrow.target)
            expect(await willFactory.registry()).to.equal(willRegistry.target)
            expect(await willFactory.lastWillImplementation()).to.not.equal(ethers.ZeroAddress)
        })
    })

    describe("Token Whitelist Management", function () {
        it("Should allow owner to add token to whitelist", async function () {
            const { willFactory, mockToken1, owner } = await loadFixture(deployContractFixture)

            await expect(willFactory.addTokenToWhiteList(mockToken1.target))
                .to.emit(willFactory, "TokenAddedToWhiteList")
                .withArgs(mockToken1.target)

            const tokenInfo = await willFactory.tokenWhiteList(mockToken1.target)
            expect(tokenInfo.allowed).to.be.true
            expect(tokenInfo.decimals).to.equal(18)
        })

        it("Should not allow adding already whitelisted token", async function () {
            const { willFactory, mockToken1, owner } = await loadFixture(deployContractFixture)

            await willFactory.addTokenToWhiteList(mockToken1.target)
            await expect(willFactory.addTokenToWhiteList(mockToken1.target)).to.be.revertedWithCustomError(
                willFactory,
                "TokenAlreadyWhitelisted"
            )
        })

        it("Should allow owner to remove token from whitelist", async function () {
            const { willFactory, mockToken1, owner } = await loadFixture(deployContractFixture)

            await willFactory.addTokenToWhiteList(mockToken1.target)
            await expect(willFactory.removeTokenFromWhiteList(mockToken1.target))
                .to.emit(willFactory, "TokenRemovedFromWhiteList")
                .withArgs(mockToken1.target)

            const tokenInfo = await willFactory.tokenWhiteList(mockToken1.target)
            expect(tokenInfo.allowed).to.be.false
        })
    })

    describe("LastWill Creation", function () {
        it("Should create LastWill with correct parameters", async function () {
            const { willFactory, mockToken1, user1, user2 } = await loadFixture(deployContractFixture)
            await willFactory.addTokenToWhiteList(mockToken1.target)

            const dueDate = (await time.latest()) + 86400 // 1 day from now

            await expect(willFactory.connect(user1).createLastWill(dueDate)).to.emit(
                willFactory,
                "WillInitialized"
            )

            const willAddress = await willFactory.creatorToWill(user1.address)
            expect(willAddress).to.not.equal(ethers.ZeroAddress)
        })

        it("Should revert when creating will with invalid due date", async function () {
            const { willFactory, mockToken1, user1, user2 } = await loadFixture(deployContractFixture)
            await willFactory.addTokenToWhiteList(mockToken1.target)

            const dueDate = (await time.latest()) - 1 // Past date

            await expect(willFactory.connect(user1).createLastWill(dueDate)).to.be.revertedWithCustomError(
                willFactory,
                "InvalidDueDate"
            )
        })
    })

    describe("Getter Functions", function () {
        it("Should return correct created will for user", async function () {
            const { willFactory, user1 } = await loadFixture(deployContractFixture)

            const dueDate = (await time.latest()) + 86400

            await willFactory.connect(user1).createLastWill(dueDate)

            const willAddress = await willFactory.connect(user1).getCreatedWill()
            expect(willAddress).to.not.equal(ethers.ZeroAddress)
        })

        it("Should revert when getting will for non-existent user ", async function () {
            const { willFactory, user2 } = await loadFixture(deployContractFixture)

            const willAddress = await willFactory.connect(user2).getCreatedWill()
            expect(willAddress).to.equal(ethers.ZeroAddress)
        })
    })
})
