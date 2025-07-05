"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TokenAmount {
    symbol: string
    amount: number
    maxAmount: number
}

interface HeirRowProps {
    heirNumber: number
    address: string
    tokenAmounts: TokenAmount[]
    onAddressChange: (address: string) => void
    onTokenAmountChange: (symbol: string, amount: number) => void
    onRemove: () => void
    canRemove: boolean
    isReadOnly?: boolean
}

export default function HeirRow({
    heirNumber,
    address,
    tokenAmounts,
    onAddressChange,
    onTokenAmountChange,
    onRemove,
    canRemove,
    isReadOnly = false,
}: HeirRowProps) {
    const [addressError, setAddressError] = useState("")

    const validateAddress = (addr: string) => {
        if (!addr) {
            setAddressError("")
            return true
        }

        const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/
        if (!ethAddressRegex.test(addr)) {
            setAddressError("Invalid wallet address")
            return false
        }

        setAddressError("")
        return true
    }

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAddress = e.target.value
        onAddressChange(newAddress)
        validateAddress(newAddress)
    }

    const hasData = address || tokenAmounts.some((token) => token.amount > 0)

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-border rounded-lg bg-muted/10">
            {/* Heir Number */}
            <div className="md:col-span-1 flex items-center">
                <span className="font-medium text-sm">Heir {heirNumber}</span>
            </div>

            {/* Wallet Address */}
            <div className="md:col-span-4 space-y-1">
                <div className="flex items-center space-x-1">
                    <span className="text-xs font-medium">Wallet Address</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Enter the Ethereum wallet address of the heir</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <Input
                    placeholder="Enter wallet address"
                    value={address}
                    onChange={handleAddressChange}
                    disabled={isReadOnly}
                    className={addressError ? "border-destructive" : ""}
                />
                {addressError && <p className="text-destructive text-xs">{addressError}</p>}
            </div>

            {/* Token Amounts */}
            <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {tokenAmounts.map((token) => (
                    <div key={token.symbol} className="space-y-1">
                        <div className="flex items-center space-x-1">
                            <span className="text-xs font-medium">{token.symbol}</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Amount of {token.symbol} to leave for this heir</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={token.amount || ""}
                            onChange={(e) =>
                                onTokenAmountChange(token.symbol, Number.parseFloat(e.target.value) || 0)
                            }
                            disabled={isReadOnly}
                            min="0"
                            max={token.maxAmount}
                            step="0.01"
                            className="text-sm"
                        />
                        {token.amount > token.maxAmount && (
                            <p className="text-destructive text-xs">Exceeds balance</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Remove  Button */}
            <div className="md:col-span-1 flex items-center justify-end">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    disabled={!canRemove}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
