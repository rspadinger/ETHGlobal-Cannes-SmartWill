"use client"

import { useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
// @ts-expect-error working fine
import { useAccount, useBalance } from "wagmi"

export default function Home() {
    //****************** hooks //******************
    const { user, ready } = usePrivy()
    const { address } = useAccount()
    const { data: ethBalance, isLoading: loadingEthBalance } = useBalance({ address })

    return (
        <div className="force-dark container mx-auto px-4 py-8 md:py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="hero-title">Title!</h1>
                    <p className="hero-subtitle max-w-3xl">Short description...!</p>
                    <p className="hero-subtitle max-w-3xl mt-2">... continued....</p>
                </div>
            </div>
        </div>
    )
}
