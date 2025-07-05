"use client"

import { useState, useEffect, useMemo } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { zeroAddress, isAddress, formatUnits } from "viem"
// @ts-expect-error working fine
import { useAccount, useWriteContract, useConfig } from "wagmi"
import { readContract } from "@wagmi/core"
import { Clock, Gift } from "lucide-react"
import { toast } from "sonner"

import HeirPlanCard from "@/components/inheritance/heir-plan-card"
import { useSmartContractRead, useSmartContractWrite } from "@/lib/web3/wagmiHelper"
import { useERC20TokenData, getNativeTokenAmount } from "@/lib/web3/tokenHelper"
import { getIsoDateFromTimestamp } from "@/lib/validators"
import lastWillAbi from "@/abi/LastWill.json"

interface InheritancePlan {
    id: string
    dueDate: string
    tokenAmounts: { [symbol: string]: number }
    testatorAddress: string
    executed: boolean
}

export default function HeirPage() {
    const { user, ready, authenticated } = usePrivy()
    const { address } = useAccount()
    const wagmiConfig = useConfig()
    const nativeSymbol = process.env.NEXT_PUBLIC_NATIVE_SYMBOL //@note use chainId to get native token symbol

    // State management
    const [inheritancePlans, setInheritancePlans] = useState<InheritancePlan[]>([])
    const [isLoading, setIsLoading] = useState(false)

    //get all wills for the heir
    const { data: heirWills } = useSmartContractRead({
        contract: "WillFactory",
        functionName: "getInheritedWills",
        args: [],
        caller: address,
    })

    //create token - symbol map
    const { tokenData, tokenAddresses } = useERC20TokenData()
    const tokenSymbolMap = useMemo(() => {
        if (!tokenData || tokenData.length === 0) return {}

        const map: Record<string, string> = {}
        for (let i = 0; i < tokenData.length; i += 4) {
            const tokenAddress = tokenAddresses[i / 4]
            const symbol = tokenData[i]
            map[tokenAddress.toLowerCase()] = symbol
        }
        return map
    }, [tokenData, tokenAddresses])

    useEffect(() => {
        if (!authenticated || !address || !heirWills || !Array.isArray(heirWills)) return
        loadPlans()
    }, [heirWills, tokenSymbolMap, address])

    const loadPlans = async () => {
        setIsLoading(true)

        const newPlans: InheritancePlan[] = []

        for (let i = 0; i < heirWills.length; i++) {
            const will = heirWills[i]

            if (!will || will === zeroAddress) continue

            try {
                const [dueDate, owner, heirDataRaw] = await Promise.all([
                    readContract(wagmiConfig, {
                        address: will,
                        abi: lastWillAbi.abi,
                        functionName: "dueDate",
                    }),
                    readContract(wagmiConfig, {
                        address: will,
                        abi: lastWillAbi.abi,
                        functionName: "owner",
                    }),
                    readContract(wagmiConfig, {
                        address: will,
                        abi: lastWillAbi.abi,
                        functionName: "getHeirByAddress",
                        args: [address],
                    }),
                ])

                const heirData = heirDataRaw[0]

                if (!heirData || !dueDate || !owner) continue

                const tokenAmounts: { [symbol: string]: number } = {}
                const tokens: string[] = heirData.tokens
                const amounts: bigint[] = heirData.amounts

                tokens.forEach((tokenAddr, idx) => {
                    const symbol = tokenSymbolMap[tokenAddr.toLowerCase()] ?? nativeSymbol
                    const tokenIdx = tokenAddresses.findIndex(
                        (addr) => addr.toLowerCase() === tokenAddr.toLowerCase()
                    )
                    const decimals = Number(tokenData?.[tokenIdx * 4 + 2] || 18) // "decimals" is third in group of 4
                    const amount = parseFloat(formatUnits(amounts[idx], decimals))
                    tokenAmounts[symbol] = amount
                })

                //console.log("Data: ", dueDate, owner, tokenAmounts)

                newPlans.push({
                    id: `will_${i + 1}`,
                    dueDate: getIsoDateFromTimestamp(dueDate),
                    tokenAmounts,
                    testatorAddress: owner,
                    executed: heirData.executed,
                })
            } catch (err) {
                console.warn(`Failed to load data for will ${will}:`, err)
            }
        }

        setInheritancePlans(newPlans)
        toast.success(
            `Found ${newPlans.length} inheritance plan${newPlans.length !== 1 ? "s" : ""} for your address`
        )
        setIsLoading(false)
    }

    const handleExecutePlan = async (planId: string) => {
        try {
            // Simulate contract interaction
            await new Promise((resolve) => setTimeout(resolve, 2000))

            // Mock: Call smart contract to execute inheritance
            console.log("Executing inheritance plan:", planId)

            toast.success(
                "Inheritance plan executed successfully! Tokens have been transferred to your wallet."
            )

            // Remove executed plan from the list
            setInheritancePlans((plans) => plans.filter((plan) => plan.id !== planId))
        } catch (error) {
            console.error("Error executing plan:", error)
            toast.error("Failed to execute inheritance plan. Please try again.")
        }
    }

    // Show connection prompt if not authenticated
    if (!authenticated || !address) {
        return (
            <div className="app-background container mx-auto px-4 py-8 md:py-12">
                <div className="text-center max-w-2xl mx-auto">
                    <Gift className="h-16 w-16 text-cyan-500 mx-auto mb-6" />
                    <h1 className="hero-title">View Your Inheritance Plans</h1>
                    <p className="hero-subtitle max-w-3xl">
                        Connect your wallet to view inheritance plans where you are listed as a beneficiary.
                    </p>
                    <p className="hero-subtitle max-w-3xl mt-2">
                        Once the due date is reached, you'll be able to execute the plans and claim your
                        tokens.
                    </p>
                </div>
            </div>
        )
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="app-background container mx-auto px-4 py-8 md:py-12">
                <div className="text-center max-w-2xl mx-auto">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-6"></div>
                    <h1 className="text-3xl font-bold mb-4">Loading Your Inheritance Plans</h1>
                    <p className="text-muted-foreground">
                        Searching the blockchain for inheritance plans where you are a beneficiary...
                    </p>
                </div>
            </div>
        )
    }

    // No plans found
    if (inheritancePlans.length === 0) {
        return (
            <div className="app-background container mx-auto px-4 py-8 md:py-12">
                <div className="text-center max-w-2xl mx-auto">
                    <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                    <h1 className="text-3xl font-bold mb-4">No Inheritance Plans Found</h1>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        You are not currently listed as a beneficiary in any inheritance plans. If you believe
                        this is an error, please contact the person who created the will.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="app-background container mx-auto px-4 py-8 md:py-12 space-y-8">
            {/* Page Header */}
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">
                    {inheritancePlans.length === 1 ? "Your Inheritance Plan" : "Your Inheritance Plans"}
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Below are the inheritance plans where you are listed as a beneficiary. You can execute
                    each plan once its due date has been reached.
                </p>
            </div>

            {/* Inheritance Plans */}
            <div className="grid gap-6 max-w-4xl mx-auto">
                {inheritancePlans.map((plan, index) => (
                    <HeirPlanCard
                        key={plan.id}
                        plan={plan}
                        planNumber={inheritancePlans.length > 1 ? index + 1 : undefined}
                        onExecute={() => handleExecutePlan(plan.id)}
                    />
                ))}
            </div>
        </div>
    )
}
