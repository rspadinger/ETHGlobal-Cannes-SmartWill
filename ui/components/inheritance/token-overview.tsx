"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins } from "lucide-react"

interface TokenBalance {
    symbol: string
    name: string
    balance: number
    icon: React.ReactNode
}

interface TokenOverviewProps {
    balances: TokenBalance[]
    isLoading?: boolean
}

export default function TokenOverview({ balances, isLoading }: TokenOverviewProps) {
    const hasBalances = balances.some((token) => token.balance > 0)

    if (isLoading) {
        return (
            <Card className="card-dark">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl font-bold">Your Wallet Balances</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                        <span className="ml-3 text-muted-foreground">Loading balances...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="card-dark">
            <CardHeader className="text-center">
                <CardTitle className="text-xl font-bold">Your Wallet Balances</CardTitle>
            </CardHeader>
            <CardContent>
                {!hasBalances ? (
                    <div className="text-center py-8">
                        <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                            You don't have any of the supported tokens right now. Once you acquire tokens,
                            they will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                        {balances
                            .filter((token) => token.balance > 0)
                            .map((token) => (
                                <div
                                    key={token.symbol}
                                    className="flex items-center space-x-3 p-4 rounded-lg border border-border bg-muted/20"
                                >
                                    <div className="text-cyan-500">{token.icon}</div>
                                    <div>
                                        <p className="font-medium">{token.name}</p>
                                        <p className="text-lg font-bold">
                                            {token.balance.toLocaleString()} {token.symbol}
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
