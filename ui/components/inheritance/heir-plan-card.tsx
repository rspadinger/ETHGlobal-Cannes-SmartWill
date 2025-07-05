"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Gift, AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getIsoDateFromTimestamp } from "@/lib/validators"

interface InheritancePlan {
    id: string
    address: string
    dueDate: string
    tokenAmounts: { [symbol: string]: number }
    testatorAddress: string
    executed: boolean
}

interface HeirPlanCardProps {
    plan: InheritancePlan
    planNumber?: number
    onExecute: () => void
}

export default function HeirPlanCard({ plan, planNumber, onExecute }: HeirPlanCardProps) {
    const [isExecuting, setIsExecuting] = useState(false)

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    const isExecutable = () => {
        if (!plan?.dueDate) return false

        const dueDate = new Date(plan.dueDate)
        const now = new Date()

        if (isNaN(dueDate.getTime())) return false

        return now >= dueDate && !plan.executed
    }

    const getDaysUntilExecutable = () => {
        const dueDate = new Date(plan.dueDate)
        const now = new Date()
        const diffTime = dueDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    const handleExecute = async () => {
        setIsExecuting(true)
        try {
            await onExecute()
        } finally {
            setIsExecuting(false)
        }
    }

    const executable = isExecutable()
    const daysUntil = getDaysUntilExecutable()

    return (
        <Card className="card-light">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="text-2xl font-bold">
                            {planNumber ? `Your Inheritance Plan #${planNumber}` : "Your Inheritance Plan"}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                From: {plan.testatorAddress.slice(0, 6)}...{plan.testatorAddress.slice(-4)}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2">
                        <Badge
                            variant={executable ? "default" : "secondary"}
                            className={executable ? "bg-green-500 hover:bg-green-600" : ""}
                        >
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(plan.dueDate)}
                        </Badge>
                        {!executable && (
                            <span
                                className={`text-xs ${
                                    plan.executed ? "text-red-500" : "text-muted-foreground"
                                }`}
                            >
                                {plan.executed
                                    ? "The plan has already been executed."
                                    : daysUntil > 0
                                    ? `${daysUntil} days remaining`
                                    : "Due today"}
                            </span>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Description */}
                {!plan.executed && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />

                        <AlertDescription>
                            The button below will become active once the due date is reached. At that point,
                            you can execute the plan and claim your eligible tokens.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Token List */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">
                        {plan.executed ? "Tokens You Received" : "Tokens You Will Receive"}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(plan.tokenAmounts).map(([symbol, amount]) => (
                            <div
                                key={symbol}
                                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
                            >
                                <div className="flex items-center space-x-2">
                                    <Gift className="h-5 w-5 text-cyan-500" />
                                    <span className="font-medium">{symbol}</span>
                                </div>
                                <span className="text-lg font-bold">
                                    {amount.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Total Value Summary */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-medium mb-2">Plan Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Total Tokens:</span>
                            <span className="ml-2 font-medium">{Object.keys(plan.tokenAmounts).length}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Status:</span>
                            <span
                                className={`ml-2 font-medium ${
                                    plan.executed
                                        ? "text-red-500"
                                        : executable
                                        ? "text-green-600"
                                        : "text-red-500"
                                }`}
                            >
                                {plan.executed ? "Executed" : executable ? "Ready to Execute" : "Pending"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Execute Button */}
                <div className="space-y-3">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    {" "}
                                    <Button
                                        onClick={handleExecute}
                                        disabled={!executable || isExecuting}
                                        size="lg"
                                        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
                                    >
                                        {isExecuting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Executing Plan...
                                            </>
                                        ) : (
                                            <>
                                                <Gift className="h-4 w-4 mr-2" />
                                                {executable ? "Execute Plan" : "Execute Plan (Disabled)"}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p>
                                    {executable
                                        ? "Click to execute the inheritance plan and claim your tokens"
                                        : `You can execute this plan after ${formatDate(plan.dueDate)}`}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardContent>
        </Card>
    )
}
