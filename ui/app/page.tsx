"use client"

import { useState, useEffect } from "react"
import { Clock, Gift } from "lucide-react"
import { toast } from "sonner"

interface InheritancePlan {
    id: string
    dueDate: string
    tokenAmounts: { [symbol: string]: number }
    testatorAddress: string // Address of the person who created the will
}

export default function HeirPage() {
    // Mock authentication state - replace with your actual auth logic
    const authenticated = true
    const address = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1"

    // State management
    const [inheritancePlans, setInheritancePlans] = useState<InheritancePlan[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Mock inheritance plans data
    const mockInheritancePlans: InheritancePlan[] = [
        {
            id: "will_1",
            dueDate: "2026-05-31",
            tokenAmounts: { ETH: 1.5, USDC: 617.28, LINK: 12.88 },
            testatorAddress: "0x46f98920c5896eff11bb90d784d6d6001d74c073",
        },
        {
            id: "will_2",
            dueDate: "2027-02-28",
            tokenAmounts: { ETH: 0.75, USDC: 100.0, LINK: 55.0 },
            testatorAddress: "0x123d35Cc6634C0532925a3b8D4C9db96C4b4d456",
        },
    ]

    // Load inheritance plans when wallet connects
    useEffect(() => {
        if (authenticated && address) {
            loadInheritancePlans()
        }
    }, [authenticated, address])

    const loadInheritancePlans = async () => {
        setIsLoading(true)

        try {
            // Simulate API call delay
            await new Promise((resolve) => setTimeout(resolve, 1500))

            // Mock: Fetch inheritance plans where user is a beneficiary
            setInheritancePlans(mockInheritancePlans)

            toast.success(
                `Found ${mockInheritancePlans.length} inheritance plan${
                    mockInheritancePlans.length !== 1 ? "s" : ""
                } for your address`
            )
        } catch (error) {
            console.error("Error loading inheritance plans:", error)
            toast.error("Failed to load inheritance plans")
        } finally {
            setIsLoading(false)
        }
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
                    <div>"Plan Card Comp"</div>
                ))}
            </div>
        </div>
    )
}
