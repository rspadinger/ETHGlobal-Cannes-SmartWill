"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, ExternalLink, AlertTriangle, Calendar, Info, CheckCircle2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import HeirRow from "./heir-row"
import { isValidFutureDate } from "@/lib/validators"

interface TokenBalance {
    symbol: string
    balance: number
}

interface Heir {
    id: string
    address: string
    tokenAmounts: { [symbol: string]: number }
    readonly?: boolean
}

interface HeirsTableProps {
    dueDate: string
    tokenBalances: TokenBalance[]
    heirs: Heir[]
    onHeirsChange: (heirs: Heir[]) => void
    onSaveAndApprove: () => void
    isSaving?: boolean
    onDueDateChange?: (date: string) => void
    status?: string
}

export default function HeirsTable({
    dueDate,
    tokenBalances,
    heirs,
    onHeirsChange,
    onSaveAndApprove,
    isSaving = false,
    onDueDateChange,
    status,
}: HeirsTableProps) {
    const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null)
    const [localDueDate, setLocalDueDate] = useState(dueDate)
    const [dateError, setDateError] = useState("")

    function hasReadOnlyHeirs(heirs: Heir[]): boolean {
        return heirs.some((heir) => heir.readonly !== false)
    }

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value
        setLocalDueDate(newDate)

        if (!isValidFutureDate(newDate)) {
            setDateError("Inheritance date must be at least 24 hours in the future")
        } else {
            setDateError("")
            // Notify parent component only if validation passes
            if (onDueDateChange) {
                onDueDateChange(newDate)
            }
        }
    }

    const addHeir = () => {
        const newHeir: Heir = {
            id: Date.now().toString(),
            address: "",
            tokenAmounts: tokenBalances.reduce((acc, token) => {
                acc[token.symbol] = 0
                return acc
            }, {} as { [symbol: string]: number }),
            readonly: false,
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

    const isFormValid = useCallback(() => {
        if (!isValidFutureDate(localDueDate)) return false
        if (heirs.length === 0) return true

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

        const uniqueAddresses = new Set(heirs.map((heir) => heir.address.toLowerCase()))
        const hasDuplicateAddresses = uniqueAddresses.size !== heirs.length
        if (hasDuplicateAddresses) return false

        return hasValidHeir && noOverAllocation && !hasDuplicateAddresses
    }, [heirs, localDueDate, tokenBalances])

    const getOverAllocatedTokens = () => {
        return tokenBalances.filter((token) => {
            const totalAllocated = heirs.reduce(
                (sum, heir) => sum + (heir.tokenAmounts[token.symbol] || 0),
                0
            )
            return totalAllocated > token.balance
        })
    }

    const overAllocatedTokens = getOverAllocatedTokens()

    return (
        <Card className="card-light">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Your Inheritance Plan</CardTitle>

                {/* Editable Due Date */}
                <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="inheritance-date" className="text-base font-medium">
                            Inheritance Date
                        </Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>You can modify when your inheritance plan should activate</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="relative">
                        <Input
                            id="inheritance-date"
                            type="date"
                            value={localDueDate}
                            onChange={handleDateChange}
                            className="text-lg py-3 pl-10"
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                    {dateError && <p className="text-destructive text-sm">{dateError}</p>}
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-muted/30 rounded-lg font-medium text-sm">
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
                        heirs.map((heir, index) => (
                            <HeirRow
                                key={heir.id}
                                heirNumber={index + 1}
                                address={heir.address}
                                tokenAmounts={tokenBalances.map((token) => ({
                                    symbol: token.symbol,
                                    amount: heir.tokenAmounts[token.symbol] || 0,
                                    maxAmount: token.balance,
                                }))}
                                onAddressChange={(address) => updateHeirAddress(heir.id, address)}
                                onTokenAmountChange={(symbol, amount) =>
                                    updateHeirTokenAmount(heir.id, symbol, amount)
                                }
                                onRemove={() => {
                                    const hasData =
                                        heir.address ||
                                        Object.values(heir.tokenAmounts).some((amount) => amount > 0)
                                    if (hasData) {
                                        setShowConfirmDialog(heir.id)
                                    } else {
                                        removeHeir(heir.id)
                                    }
                                }}
                                canRemove={true}
                                isReadOnly={heir.readonly ?? true}
                            />
                        ))
                    )}
                </div>

                {/* Add Heir Button */}
                {heirs.length > 0 && (
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
                {heirs.length > 0 && !hasReadOnlyHeirs(heirs) && (
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

                {/* Status Message */}
                {status && (
                    <div className="bg-muted/30 p-4 rounded-lg border border-border">
                        <div className="flex items-start space-x-3">
                            <Info className="h-5 w-5 text-cyan-500 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-foreground">{status}</h4>
                            </div>
                        </div>
                    </div>
                )}

                {/* Save and Approve Button - Always enabled for date changes */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={onSaveAndApprove}
                                disabled={!isFormValid() || isSaving}
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
                            <p>Update your inheritance plan with the new settings</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Confirmation Dialog */}
                {showConfirmDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <Card className="w-full max-w-md mx-4 border border-border bg-card">
                            <CardHeader className="bg-muted/30">
                                <CardTitle className="text-foreground">Remove Heir</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <p className="text-foreground">
                                    Are you sure you want to remove this heir? This action cannot be undone.
                                </p>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="destructive"
                                        onClick={() => removeHeir(showConfirmDialog)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1"
                                    >
                                        Remove
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowConfirmDialog(null)}
                                        className="border-border text-foreground hover:bg-muted flex-1"
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
