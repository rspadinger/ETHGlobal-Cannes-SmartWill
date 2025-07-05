"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
// @ts-expect-error working fine
import { useAccount } from "wagmi"
import { DollarSign, LinkIcon, Coins } from "lucide-react"
import { toast } from "sonner"

import TokenOverview from "@/components/inheritance/token-overview"
import PlanForm from "@/components/inheritance/plan-form"
import HeirsTable from "@/components/inheritance/heirs-table"

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

    // State management
    const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
    const [isLoadingBalances, setIsLoadingBalances] = useState(false)
    const [hasPlan, setHasPlan] = useState(false)
    const [planDueDate, setPlanDueDate] = useState("")
    const [heirs, setHeirs] = useState<Heir[]>([])
    const [isCreatingPlan, setIsCreatingPlan] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isPlanReadOnly, setIsPlanReadOnly] = useState(false)

    // Mock token data - replace with actual blockchain calls
    const mockTokenBalances: TokenBalance[] = [
        {
            symbol: "USDC",
            name: "USD Coin",
            balance: 1234.56,
            icon: <DollarSign className="h-6 w-6" />,
        },
        {
            symbol: "POLS",
            name: "Polkastarter",
            balance: 500.0,
            icon: <Coins className="h-6 w-6" />,
        },
        {
            symbol: "LINK",
            name: "Chainlink",
            balance: 25.75,
            icon: <LinkIcon className="h-6 w-6" />,
        },
    ]

    // Load user data when wallet connects
    useEffect(() => {
        if (authenticated && address) {
            loadUserData()
        }
    }, [authenticated, address])

    const loadUserData = async () => {
        setIsLoadingBalances(true)

        try {
            // Simulate API call delay
            await new Promise((resolve) => setTimeout(resolve, 1500))

            // Mock: Load token balances from blockchain
            setTokenBalances(mockTokenBalances)

            // Mock: Check if user has existing plan
            const existingPlan = false // Replace with actual contract call
            if (existingPlan) {
                setHasPlan(true)
                setPlanDueDate("2026-05-31")
                // Load existing heirs data
                setHeirs([
                    {
                        id: "1",
                        address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1",
                        tokenAmounts: { USDC: 617.28, POLS: 250.0, LINK: 12.88 },
                    },
                ])
                setIsPlanReadOnly(true)
            }
        } catch (error) {
            console.error("Error loading user data:", error)
            toast.error("Failed to load wallet data")
        } finally {
            setIsLoadingBalances(false)
        }
    }

    const handleCreatePlan = async (dueDate: string) => {
        setIsCreatingPlan(true)

        try {
            // Simulate contract interaction
            await new Promise((resolve) => setTimeout(resolve, 2000))

            setPlanDueDate(dueDate)
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

            // Smooth scroll to heirs section
            setTimeout(() => {
                const heirsSection = document.getElementById("heirs-section")
                if (heirsSection) {
                    heirsSection.scrollIntoView({ behavior: "smooth" })
                }
            }, 100)
        } catch (error) {
            console.error("Error creating plan:", error)
            toast.error("Failed to create inheritance plan")
        } finally {
            setIsCreatingPlan(false)
        }
    }

    const handleDueDateChange = (date: string) => {
        setPlanDueDate(date)
    }

    const handleSaveAndApprove = async () => {
        setIsSaving(true)

        try {
            // Simulate approval process
            await new Promise((resolve) => setTimeout(resolve, 3000))

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
