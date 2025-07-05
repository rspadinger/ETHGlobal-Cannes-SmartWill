const { expect } = require("chai")
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers")
const { ethers } = require("hardhat")

describe("LastWill Contract", function () {
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

        // Set factory in escrow and registry
        await willEscrow.setFactory(willFactory.target)
        await willRegistry.setFactory(willFactory.target)

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
            const { lastWill, willFactory, willEscrow, willRegistry, user1 } = await loadFixture(
                deployContractFixture
            )

            expect(await lastWill.factory()).to.equal(willFactory.target)
            expect(await lastWill.escrow()).to.equal(willEscrow.target)
            expect(await lastWill.registry()).to.equal(willRegistry.target)
            expect(await lastWill.owner()).to.equal(user1.address)
        })

        it("Should allow initialization only by WillFactory", async function () {
            const { lastWill, user1 } = await loadFixture(deployContractFixture)
            const dueDate = (await time.latest()) + 86400

            await expect(
                lastWill.connect(user1).initialize(user1.address, dueDate)
            ).to.be.revertedWithCustomError(lastWill, "NotFactory")
        })
    })

    describe("Due Date Management", function () {
        it("Should allow owner to update due date", async function () {
            const { lastWill, user1 } = await loadFixture(deployContractFixture)
            const newDueDate = (await time.latest()) + 172800 // 2 days from now

            await expect(lastWill.connect(user1).updateDueDate(newDueDate))
                .to.emit(lastWill, "DueDateUpdated")
                .withArgs(newDueDate)

            expect(await lastWill.dueDate()).to.equal(newDueDate)
        })

        it("Should not allow non-owner to update due date", async function () {
            const { lastWill, user2 } = await loadFixture(deployContractFixture)
            const newDueDate = (await time.latest()) + 172800

            await expect(lastWill.connect(user2).updateDueDate(newDueDate)).to.be.revertedWithCustomError(
                lastWill,
                "NotOwner"
            )
        })

        it("Should not allow setting past due date", async function () {
            const { lastWill, user1 } = await loadFixture(deployContractFixture)
            const pastDate = (await time.latest()) - 1

            await expect(lastWill.connect(user1).updateDueDate(pastDate)).to.be.revertedWithCustomError(
                lastWill,
                "InvalidDueDate"
            )
        })
    })

    describe("Heir Management", function () {
        it("Should allow owner to add heir with tokens", async function () {
            const { lastWill, user1, user2, mockToken1 } = await loadFixture(deployContractFixture)
            const tokens = [mockToken1.target]
            const amounts = [ethers.parseEther("100")]

            await expect(lastWill.connect(user1).addHeir(user2.address, tokens, amounts))
                .to.emit(lastWill, "HeirAdded")
                .withArgs(user2.address, tokens, amounts)

            const [heir] = await lastWill.getHeirByAddress(user2.address)
            expect(heir.wallet).to.equal(user2.address)
            expect(heir.tokens[0]).to.equal(mockToken1.target)
            expect(heir.amounts[0]).to.equal(ethers.parseEther("100"))
        })

        it("Should not allow adding same heir twice", async function () {
            const { lastWill, user1, user2, mockToken1 } = await loadFixture(deployContractFixture)
            const tokens = [mockToken1.target]
            const amounts = [ethers.parseEther("100")]

            await lastWill.connect(user1).addHeir(user2.address, tokens, amounts)

            await expect(
                lastWill.connect(user1).addHeir(user2.address, tokens, amounts)
            ).to.be.revertedWithCustomError(lastWill, "HeirAlreadyExists")
        })

        it("Should allow owner to remove heir", async function () {
            const { lastWill, user1, user2, mockToken1 } = await loadFixture(deployContractFixture)
            const tokens = [mockToken1.target]
            const amounts = [ethers.parseEther("100")]

            await lastWill.connect(user1).addHeir(user2.address, tokens, amounts)

            const [, , , found1] = await lastWill.getHeirByAddress(user2.address)
            expect(found1).to.equal(true)

            await expect(lastWill.connect(user1).removeHeir(user2.address))
                .to.emit(lastWill, "HeirRemoved")
                .withArgs(user2.address)

            const [, , , found2] = await lastWill.getHeirByAddress(user2.address)
            expect(found2).to.equal(false)
        })

        it("Should not allow non-owner to remove heir", async function () {
            const { lastWill, user1, user2, user3, mockToken1 } = await loadFixture(deployContractFixture)
            const tokens = [mockToken1.target]
            const amounts = [ethers.parseEther("100")]

            await lastWill.connect(user1).addHeir(user2.address, tokens, amounts)
            await expect(lastWill.connect(user3).removeHeir(user2.address)).to.be.revertedWithCustomError(
                lastWill,
                "NotOwner"
            )
        })
    })

    describe("Will Execution", function () {
        it("Should allow heir to execute will after due date", async function () {
            const { lastWill, user1, user2, mockToken1 } = await loadFixture(deployContractFixture)
            const tokens = [mockToken1.target]
            const amounts = [ethers.parseEther("100")]

            await lastWill.connect(user1).addHeir(user2.address, tokens, amounts)

            // Move time forward past due date
            await time.increase(86401) // 1 day + 1 second

            await expect(lastWill.connect(user2).executeLastWill(user2.address)).to.not.be.reverted

            const [heir] = await lastWill.getHeirByAddress(user2.address)
            expect(heir.executed).to.be.true
        })

        it("Should not allow execution before due date", async function () {
            const { lastWill, user1, user2, mockToken1 } = await loadFixture(deployContractFixture)
            const tokens = [mockToken1.target]
            const amounts = [ethers.parseEther("100")]

            await lastWill.connect(user1).addHeir(user2.address, tokens, amounts)

            await expect(
                lastWill.connect(user2).executeLastWill(user2.address)
            ).to.be.revertedWithCustomError(lastWill, "NotDueYet")
        })

        it("Should not allow double execution", async function () {
            const { lastWill, user1, user2, mockToken1 } = await loadFixture(deployContractFixture)
            const tokens = [mockToken1.target]
            const amounts = [ethers.parseEther("100")]

            await lastWill.connect(user1).addHeir(user2.address, tokens, amounts)

            // Move time forward past due date
            await time.increase(86401)

            await lastWill.connect(user2).executeLastWill(user2.address)
            await expect(
                lastWill.connect(user2).executeLastWill(user2.address)
            ).to.be.revertedWithCustomError(lastWill, "AlreadyExecuted")
        })
    })

    describe("Getter Functions", function () {
        it("Should return correct heir information", async function () {
            const { lastWill, user1, user2, mockToken1 } = await loadFixture(deployContractFixture)
            const tokens = [mockToken1.target]
            const amounts = [ethers.parseEther("100")]

            await lastWill.connect(user1).addHeir(user2.address, tokens, amounts)

            const [heir, index, dueDate] = await lastWill.getHeirByAddress(user2.address)
            expect(heir.wallet).to.equal(user2.address)
            expect(heir.tokens[0]).to.equal(mockToken1.target)
            expect(heir.amounts[0]).to.equal(ethers.parseEther("100"))
            expect(heir.executed).to.be.false
            expect(index).to.equal(0)
            expect(dueDate).to.equal(await lastWill.dueDate())
        })

        it("Should return correct total token amounts ", async function () {
            const { lastWill, user1, user2, mockToken1, mockToken2 } = await loadFixture(
                deployContractFixture
            )
            const tokens = [mockToken1.target, mockToken2.target]
            const amounts = [ethers.parseEther("100"), ethers.parseUnits("100", 6)]

            await lastWill.connect(user1).addHeir(user2.address, tokens, amounts)

            const [uniqueTokens, tokenAmounts, totalNativeAmount] = await lastWill
                .connect(user1)
                .getTotalTokenAmounts()
            expect(uniqueTokens[0]).to.equal(mockToken1.target)
            expect(uniqueTokens[1]).to.equal(mockToken2.target)
            expect(tokenAmounts[0]).to.equal(ethers.parseEther("100"))
            expect(tokenAmounts[1]).to.equal(ethers.parseUnits("100", 6))
            expect(totalNativeAmount).to.equal(0)
        })
    })
})
