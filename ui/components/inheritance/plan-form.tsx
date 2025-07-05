"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PlanFormProps {
    onCreatePlan: (date: string) => void
    isCreating?: boolean
}

export default function PlanForm({ onCreatePlan, isCreating }: PlanFormProps) {
    const [selectedDate, setSelectedDate] = useState(() => {
        const nextYear = new Date()
        nextYear.setFullYear(nextYear.getFullYear() + 1)
        return nextYear.toISOString().split("T")[0]
    })
    const [error, setError] = useState("")

    const validateDate = (dateString: string) => {
        const selected = new Date(dateString)
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)

        if (selected <= tomorrow) {
            setError("Inheritance date must be at least 24 hours in the future")
            return false
        }

        setError("")
        return true
    }

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value
        setSelectedDate(newDate)
        validateDate(newDate)
    }

    const handleCreatePlan = () => {
        if (validateDate(selectedDate)) {
            onCreatePlan(selectedDate)
        }
    }

    const isValid = selectedDate && !error

    return (
        <Card className="card-dark max-w-2xl mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">Create Your Inheritance Plan</CardTitle>
                <p className="text-muted-foreground">
                    Set a date for when your tokens should be sent to your heirs and click 'Create Plan' to
                    get started.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
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
                                    <p>Choose when your inheritance plan should activate</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="relative">
                        <Input
                            id="inheritance-date"
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="text-lg py-3 pl-10"
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                    {error && <p className="text-destructive text-sm">{error}</p>}
                </div>

                <div className="text-center">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={handleCreatePlan}
                                    disabled={!isValid || isCreating}
                                    size="lg"
                                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 text-lg"
                                >
                                    {isCreating ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Creating Plan...
                                        </>
                                    ) : (
                                        "Create Plan"
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Your plan will activate on this date</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardContent>
        </Card>
    )
}
