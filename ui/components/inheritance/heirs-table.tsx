"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, ExternalLink, AlertTriangle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TokenBalance {
    symbol: string
    balance: number
}

interface Heir {
    id: string
    address: string
    tokenAmounts: { [symbol: string]: number }
}

interface HeirsTableProps {
    dueDate: string
    tokenBalances: TokenBalance[]
    heirs: Heir[]
    onHeirsChange: (heirs: Heir[]) => void
    onSaveAndApprove: () => void
    isReadOnly?: boolean
    isSaving?: boolean
}

export default function HeirsTable({
    dueDate,
    tokenBalances,
    heirs,
    onHeirsChange,
    onSaveAndApprove,
    isReadOnly = false,
    isSaving = false,
}: HeirsTableProps) {
    const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null)

    const addHeir = () => {
        const newHeir: Heir = {
            id: Date.now().toString(),
            address: "",
            tokenAmounts: tokenBalances.reduce((acc, token) => {
                acc[token.symbol] = 0
                return acc
            }, {} as { [symbol: string]: number }),
        }
        onHeirsChange([...heirs, newHeir])
    }

    const removeHeir = (heirId: string) => {
        onHeirsChange(heirs.filter((heir) => heir.id !== heirId))
        setShowConfirmDialog(null)
    }

    const updateHeirAddress = (heirId: string, address: string) => {
        onHeirsChange(heirs.map((heir) => (heir.id === heirId ? { ...heir, address } : heir)))
    }

    const updateHeirTokenAmount = (heirId: string, symbol: string, amount: number) => {
        onHeirsChange(
            heirs.map((heir) =>
                heir.id === heirId
                    ? { ...heir, tokenAmounts: { ...heir.tokenAmounts, [symbol]: amount } }
                    : heir
            )
        )
    }

    const distributeEqually = () => {
        if (heirs.length === 0) {
            return
        }

        const updatedHeirs = heirs.map((heir) => {
            const newTokenAmounts = { ...heir.tokenAmounts }
            tokenBalances.forEach((token) => {
                const sharePerHeir = Math.floor((token.balance / heirs.length) * 100) / 100
                newTokenAmounts[token.symbol] = sharePerHeir
            })
            return { ...heir, tokenAmounts: newTokenAmounts }
        })

        onHeirsChange(updatedHeirs)
    }

    const validateForm = () => {
        if (heirs.length === 0) return false

        const hasValidHeir = heirs.some((heir) => {
            const hasValidAddress = /^0x[a-fA-F0-9]{40}$/.test(heir.address)
            const hasTokenAmount = Object.values(heir.tokenAmounts).some((amount) => amount > 0)
            return hasValidAddress && hasTokenAmount
        })

        const noOverAllocation = tokenBalances.every((token) => {
            const totalAllocated = heirs.reduce(
                (sum, heir) => sum + (heir.tokenAmounts[token.symbol] || 0),
                0
            )
            return totalAllocated <= token.balance
        })

        return hasValidHeir && noOverAllocation
    }

    const getOverAllocatedTokens = () => {
        return tokenBalances.filter((token) => {
            const totalAllocated = heirs.reduce(
                (sum, heir) => sum + (heir.tokenAmounts[token.symbol] || 0),
                0
            )
            return totalAllocated > token.balance
        })
    }

    const isFormValid = validateForm()
    const overAllocatedTokens = getOverAllocatedTokens()

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    return (
        <Card className="card-dark">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Your Inheritance Plan</CardTitle>
                <p className="text-muted-foreground">Due Date: {formatDate(dueDate)}</p>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-muted/30 rounded-lg font-medium text-sm mb-2">
                    <div className="md:col-span-1">Heir #</div>
                    <div className="md:col-span-4">Wallet Address</div>
                    <div className="md:col-span-6 grid grid-cols-3 gap-2">
                        {tokenBalances.map((token) => (
                            <div key={token.symbol}>{token.symbol} Amount</div>
                        ))}
                    </div>
                    <div className="md:col-span-1 text-center">Remove</div>
                </div>

                {/* Heirs List */}
                <div className="space-y-4">
                    {heirs.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">No heirs added yet</p>
                            <Button
                                onClick={addHeir}
                                variant="outline"
                                className="border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-white"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Heir
                            </Button>
                        </div>
                    ) : (
                        <div>
                            Hair 1 ... 0x9A2Aa18bBAAA7CA86EAE3B8edDd8090Ab6D0b123 ... 250 USDC ... 12 POLS ...
                            23 LINK ...{" "}
                        </div>
                    )}
                </div>

                {/* Add Heir Button */}
                {heirs.length > 0 && !isReadOnly && (
                    <Button
                        onClick={addHeir}
                        variant="outline"
                        className="border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Heir
                    </Button>
                )}

                {/* Distribute Equally Button */}
                {heirs.length > 0 && !isReadOnly && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={distributeEqually}
                                    variant="secondary"
                                    size="lg"
                                    className="w-full"
                                    disabled={heirs.length === 0}
                                >
                                    Distribute Tokens Equally
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    Automatically set amounts so each heir receives an equal share of each
                                    token
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                {/* Validation Errors */}
                {overAllocatedTokens.length > 0 && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Total allocation exceeds balance for:{" "}
                            {overAllocatedTokens.map((t) => t.symbol).join(", ")}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Save and Approve Button */}
                {!isReadOnly && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={onSaveAndApprove}
                                    disabled={!isFormValid || isSaving}
                                    size="lg"
                                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Waiting for your approval...
                                        </>
                                    ) : (
                                        "Save and Approve Inheritance"
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>You'll need to approve token transfers for these amounts</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                {/* Post-Save State */}
                {isReadOnly && (
                    <div className="text-center space-y-4">
                        <Alert>
                            <AlertDescription>
                                Inheritance plan successfully created! Funds will be locked until{" "}
                                {formatDate(dueDate)}.
                            </AlertDescription>
                        </Alert>
                        <Button
                            variant="outline"
                            className="border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-white"
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Your Will on Block Explorer
                        </Button>
                    </div>
                )}

                {/* Confirmation  Dialog */}
                {showConfirmDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <Card className="w-full max-w-md mx-4">
                            <CardHeader>
                                <CardTitle>Remove Heir</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p>
                                    Are you sure you want to remove this heir? This action cannot be undone.
                                </p>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="destructive"
                                        onClick={() => removeHeir(showConfirmDialog)}
                                        className="bg-destructive flex-1"
                                    >
                                        Remove
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowConfirmDialog(null)}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
