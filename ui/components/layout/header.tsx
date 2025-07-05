"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Wallet, Package, Home } from "lucide-react"
import { usePrivy } from "@privy-io/react-auth"
// @ts-expect-error working fine
import { useAccount, useDisconnect, useBalance } from "wagmi"

export default function Header() {
    // Hooks
    const { user, ready, authenticated, login, logout } = usePrivy()
    const { address } = useAccount()
    const { disconnect } = useDisconnect()

    return (
        <header className="header-dark">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <Link href="/" className="flex items-center">
                    <div className="logo-text">
                        <span className="text-cyan-500 dark:text-cyan-500 font-extrabold pr-0 ">
                            Protocol
                        </span>
                        <span className="text-neutral-700 dark:text-indigo-600 font-extrabold">Name</span>
                    </div>
                </Link>

                <nav className="hidden md:flex space-x-6 mx-4">
                    <Link href="/" className="text-white hover:text-cyan-400 transition-colors">
                        <span className="flex items-center">
                            <Home className="mr-1 h-4 w-4" />
                            Home
                        </span>
                    </Link>

                    {ready && user && (
                        <Link href="/purchases" className="text-white hover:text-cyan-400 transition-colors">
                            <span className="flex items-center">
                                <Package className="mr-1 h-4 w-4" />
                                PAGE
                            </span>
                        </Link>
                    )}
                </nav>

                <div className="flex items-center space-x-3">
                    {/* <ThemeToggle /> */}
                    <Button
                        disabled={!ready}
                        onClick={() => {
                            if (!authenticated && !address) login()
                            else if (authenticated && !address) logout()
                            else if (authenticated && address) logout()
                            else if (!authenticated && address) disconnect()
                        }}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white"
                    >
                        <span className="flex items-center">
                            <Wallet className="mr-2 h-4 w-4" />
                            {!authenticated && !address && "Connect Wallet"}
                            {authenticated && !address && "Logout"}
                            {authenticated &&
                                address &&
                                `Logout ${address.substring(0, 6)}...${address.substring(
                                    address.length - 4
                                )}`}
                            {!authenticated &&
                                address &&
                                `Disconnect ${address.substring(0, 6)}...${address.substring(
                                    address.length - 4
                                )}`}
                        </span>
                    </Button>
                </div>
            </div>
        </header>
    )
}
