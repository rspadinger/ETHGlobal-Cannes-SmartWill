"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { usePrivy } from "@privy-io/react-auth"
// @ts-expect-error working fine
import { useAccount, useBalance, useReadContracts, useConfig } from "wagmi"
import { waitForTransactionReceipt } from "wagmi/actions"
import { erc20Abi, zeroAddress, isAddress } from "viem"

import { Coins, HandCoins } from "lucide-react"
import { toast } from "sonner"

import TokenOverview from "@/components/inheritance/token-overview"
import PlanForm from "@/components/inheritance/plan-form"
import HeirsTable from "@/components/inheritance/heirs-table"

import { useSmartContractRead, useSmartContractWrite } from "@/lib/web3/wagmiHelper"
import { isValidFutureDate, getIsoDateFromTimestamp, getTimestampFromIsoDate } from "@/lib/validators"

interface TokenBalance {
    symbol: string
    name: string
    balance: number
    icon: React.ReactNode
}

interface Heir {
    id: string
    address: string
    tokenAmounts: { [symbol: string]: number }
}

export default function Home() {
    const { user, ready, authenticated } = usePrivy()
    const { address } = useAccount()
    const { data: nativeBalance, isLoading: loadingNativeBalance } = useBalance({ address })
    const wagmiConfig = useConfig()
    const { executeWrite } = useSmartContractWrite()

    // State management
    const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
    const [isLoadingBalances, setIsLoadingBalances] = useState(false)
    const [hasPlan, setHasPlan] = useState(false)
    const [planAddress, setPlanAddress] = useState<string | undefined>()
    const [planDueDate, setPlanDueDate] = useState("")
    const [heirs, setHeirs] = useState<Heir[]>([])
    const [isCreatingPlan, setIsCreatingPlan] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isPlanReadOnly, setIsPlanReadOnly] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)

    // get whitelisted token addresses => get balances & names
    const { data: whitelistedTokens } = useSmartContractRead({
        contract: "WillFactory",
        functionName: "getWhiteListedTokens",
    })

    // create the ERC20 contracts
    const ERC20Contracts = useMemo(() => {
        if (!whitelistedTokens) return
        const [tokenAddresses] = whitelistedTokens

        return tokenAddresses.flatMap((tokenAddr) => [
            {
                address: tokenAddr,
                abi: erc20Abi,
                functionName: "symbol",
            },
            {
                address: tokenAddr,
                abi: erc20Abi,
                functionName: "name",
            },
            {
                address: tokenAddr,
                abi: erc20Abi,
                functionName: "decimals",
            },
            {
                address: tokenAddr,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            },
        ])
    }, [address])

    // call useReadContracts with all ERC20 contracts
    const { data: tokenData } = useReadContracts({
        allowFailure: false,
        contracts: ERC20Contracts,
    })

    // call creatorToWill to get the address of the will
    const { data: createdWill } = useSmartContractRead({
        contract: "WillFactory",
        functionName: "creatorToWill",
        args: [address],
    })

    const createdWillReady = !!createdWill && createdWill !== zeroAddress && isAddress(createdWill)

    // call dueDate on LastWill
    const { data: dueDate } = useSmartContractRead({
        contract: "LastWill",
        functionName: "dueDate",
        args: [],
        enabled: createdWillReady,
        overrideAddress: createdWillReady ? createdWill : undefined,
    })

    // Load user data when wallet connects
    useEffect(() => {
        if (authenticated && address) {
            loadUserData()
        }
    }, [authenticated, address, tokenData, nativeBalance, createdWill, dueDate])

    const loadUserData = async () => {
        setIsLoadingBalances(true)

        try {
            if (!address || !ready || !authenticated || !tokenData) return

            // iterate all returned ERC20 token data and set tokenBalances
            const tokens: TokenBalance[] = []

            for (let i = 0; i < tokenData.length; i += 4) {
                const symbol = tokenData[i] as string
                const name = tokenData[i + 1] as string
                const decimals = tokenData[i + 2] as number
                const rawBalance = tokenData[i + 3] as bigint

                tokens.push({
                    symbol,
                    name,
                    balance: Number(rawBalance) / 10 ** decimals,
                    icon: <Coins className="h-6 w-6" />,
                })
            }

            // add native token at the start
            if (nativeBalance) {
                tokens.unshift({
                    symbol: nativeBalance.symbol || "POL",
                    name: nativeBalance.symbol === "ETH" ? "Ether" : nativeBalance.symbol || "Polygon",
                    balance: Number(nativeBalance.value) / 10 ** nativeBalance.decimals,
                    icon: <HandCoins className="h-6 w-6" />,
                })
            }

            setTokenBalances(tokens)

            if (createdWill && createdWill !== zeroAddress && dueDate !== undefined) {
                const formattedDate = getIsoDateFromTimestamp(dueDate)

                setHasPlan(true)
                setPlanAddress(createdWill)
                setPlanDueDate(formattedDate)

                //@todo Load existing heirs data
                // setHeirs([
                //     {
                //         id: "1",
                //         address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1",
                //         tokenAmounts: { USDC: 617.28, POLS: 250.0, LINK: 12.88 },
                //     },
                // ])
                //setIsPlanReadOnly(true)
            }
        } catch (error) {
            console.error("Error loading user data:", error)
            toast.error("Failed to load user data")
        } finally {
            setIsLoadingBalances(false)
        }
    }

    const handleCreatePlan = async (formattedDueDate: string) => {
        if (!address || isCreatingPlan) return

        if (!isValidFutureDate(formattedDueDate)) {
            alert("Please select a date at least 1 day in the future.")
            return
        }

        // call createLastWill
        const { result: hash, status } = await executeWrite({
            contract: "WillFactory",
            functionName: "createLastWill",
            args: [dueDateTimestamp],
        })

        if (!hash) {
            if (status && status.includes("User denied the transaction.")) {
                return
            }

            toast.error(status || "Transaction failed")
            return
        }

        try {
            setIsCreatingPlan(true)

            // wait for the txn to complete
            const transactionReceipt = await waitForTransactionReceipt(wagmiConfig, { hash })

            setPlanDueDate(formattedDueDate)
            setHasPlan(true)

            // Initialize with one empty heir
            setHeirs([
                {
                    id: Date.now().toString(),
                    address: "",
                    tokenAmounts: tokenBalances.reduce((acc, token) => {
                        acc[token.symbol] = 0
                        return acc
                    }, {} as { [symbol: string]: number }),
                },
            ])

            toast.success("Inheritance plan created successfully!")
            setTxHash(hash)

            // Smooth scroll to heirs section
            setTimeout(() => {
                const heirsSection = document.getElementById("heirs-section")
                if (heirsSection) {
                    heirsSection.scrollIntoView({ behavior: "smooth" })
                }
            }, 100)
        } catch (err) {
            console.error("Error creating plan:", err)
            toast.error("Failed to create inheritance plan")
        } finally {
            setIsCreatingPlan(false)
        }
    }

    const handleDueDateChange = (formattedDueDate: string) => {
        setPlanDueDate(formattedDueDate)
    }

    const handleSaveAndApprove = async () => {
        if (!isValidFutureDate(planDueDate)) {
            alert("Please select a date at least 1 day in the future.")
            return
        }

        setIsSaving(true)

        try {
            // Simulate approval process
            await new Promise((resolve) => setTimeout(resolve, 1000))

            //@todo LW::updateDueDate => if date has changed
            const changedTS = getTimestampFromIsoDate(planDueDate)
            console.log("Date change: ", dueDate, changedTS)

            //@todo iterate all heirs => LW::addHeir (if new heir was added)
            // Mock: Call smart contract createLastWill
            console.log("Creating/updating will with:", {
                dueDate: planDueDate,
                heirs: heirs.map((h) => h.address),
                tokenAmounts: heirs.map((h) => h.tokenAmounts),
            })

            setIsPlanReadOnly(true)
            toast.success(
                `Inheritance plan successfully created! Funds will be locked until ${new Date(
                    planDueDate
                ).toLocaleDateString()}`
            )
        } catch (error) {
            console.error("Error saving plan:", error)
            toast.error("Transaction failed. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    // Show connection prompt if not authenticated
    if (!authenticated || !address) {
        return (
            <div className="app-background container mx-auto px-4 py-8 md:py-12">
                <div className="text-center max-w-2xl mx-auto">
                    <h1 className="hero-title">Secure Your Digital Legacy</h1>
                    <p className="hero-subtitle max-w-3xl">
                        Create an inheritance plan for your cryptocurrency tokens. Set up automatic transfers
                        to your heirs with our secure smart contract system.
                    </p>
                    <p className="hero-subtitle max-w-3xl mt-2">
                        Connect your wallet to get started and protect your family's financial future.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="app-background container mx-auto px-4 py-8 md:py-12 space-y-8">
            {/* Section 1: Wallet Overview */}
            <TokenOverview balances={tokenBalances} isLoading={isLoadingBalances} />

            {/* Section 2: Plan Setup (only if no plan exists) */}
            {!hasPlan && !isLoadingBalances && (
                <PlanForm onCreatePlan={handleCreatePlan} isCreating={isCreatingPlan} />
            )}

            {/* Section 3: Heirs & Distribution (once plan is created) */}
            {hasPlan && (
                <div id="heirs-section">
                    <HeirsTable
                        dueDate={planDueDate}
                        tokenBalances={tokenBalances.map((token) => ({
                            symbol: token.symbol,
                            balance: token.balance,
                        }))}
                        heirs={heirs}
                        onHeirsChange={setHeirs}
                        onSaveAndApprove={handleSaveAndApprove}
                        onDueDateChange={handleDueDateChange}
                        isReadOnly={isPlanReadOnly}
                        isSaving={isSaving}
                    />
                </div>
            )}
        </div>
    )
}
