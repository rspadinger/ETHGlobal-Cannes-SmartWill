"use client"

// @ts-expect-error working fine
import { useChainId, useSwitchChain, useWriteContract, useReadContract } from "wagmi"
import { readContract } from "@wagmi/core"
import { wagmiConfig } from "./privyProviders"

import WillFactoryABI from "@/abi/WillFactory.json"
import WillRegistryABI from "@/abi/WillRegistry.json"
import WillEscrowABI from "@/abi/WillEscrow.json"
import LastWillABI from "@/abi/LastWill.json"

import { parseEther } from "viem"

const willFactoryAddress = process.env.NEXT_PUBLIC_WILLFACTORY_ADDRESS as `0x${string}`
const willRegistryAddress = process.env.NEXT_PUBLIC_WILLREGISTRY_ADDRESS as `0x${string}`
const willEscrowAddress = process.env.NEXT_PUBLIC_WILLESCROW_ADDRESS as `0x${string}`

const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAINID)

export type ContractType = "WillFactory" | "WillEscrow" | "WillRegistry" | "LastWill"

const getContractAddress = (type: ContractType): `0x${string}` => {
    switch (type) {
        case "WillFactory":
            return willFactoryAddress
        case "WillEscrow":
            return willEscrowAddress
        case "WillRegistry":
            return willRegistryAddress
        default:
            throw new Error("Unknown contract type")
    }
}

const getContractABI = (type: ContractType) => {
    switch (type) {
        case "WillFactory":
            return WillFactoryABI.abi
        case "WillEscrow":
            return WillEscrowABI.abi
        case "WillRegistry":
            return WillRegistryABI.abi
        case "LastWill":
            return LastWillABI.abi
        default:
            throw new Error("Unknown contract type")
    }
}

export const useSmartContractRead = ({
    contract,
    functionName,
    args = [],
    enabled = true,
    overrideAddress,
    caller,
}: {
    contract: ContractType
    functionName: string
    args?: readonly unknown[]
    enabled?: boolean
    overrideAddress?: `0x${string}`
    caller?: `0x${string}`
}) => {
    const chainId = useChainId()
    let address: `0x${string}` | undefined = undefined

    if (overrideAddress) {
        address = overrideAddress
    } else if (enabled && chainId === TARGET_CHAIN_ID) {
        address = getContractAddress(contract)
    }

    let account: `0x${string}` | undefined = undefined
    if (caller) {
        account = caller
    }

    const shouldRun = !!address && enabled && chainId === TARGET_CHAIN_ID

    return useReadContract({
        address,
        abi: getContractABI(contract),
        functionName,
        args,
        account,
        query: {
            enabled: shouldRun,
            staleTime: 10_000,
            gcTime: 30_000,
        },
    })
}

export const useSmartContractWrite = () => {
    const { writeContractAsync } = useWriteContract()
    const chainId = useChainId()
    const { switchChainAsync } = useSwitchChain()

    const executeWrite = async ({
        contract,
        functionName,
        args = [],
        value,
        overrideAddress,
    }: {
        contract: ContractType
        functionName: string
        args?: readonly unknown[]
        value?: bigint
        overrideAddress?: `0x${string}`
    }): Promise<{ result: any; status: string }> => {
        if (chainId !== TARGET_CHAIN_ID) {
            try {
                await switchChainAsync({ chainId: TARGET_CHAIN_ID })
            } catch {
                return {
                    result: null,
                    status: "Wrong network. Please switch manually.",
                }
            }
        }

        let address: `0x${string}` | undefined = undefined

        if (overrideAddress) {
            address = overrideAddress
        } else if (chainId === TARGET_CHAIN_ID) {
            address = getContractAddress(contract)
        }

        if (!address) {
            return {
                result: null,
                status: "Contract address could not be determined.",
            }
        }

        try {
            const result = await writeContractAsync({
                address,
                abi: getContractABI(contract),
                functionName,
                args,
                value: value ?? 0n,
            })

            return { result, status: "" }
        } catch (err: any) {
            if (err.message?.includes("User denied transaction signature")) {
                return {
                    result: null,
                    status: "User denied the transaction.",
                }
            }

            return {
                result: null,
                status: err.message || "An unknown error occurred during write",
            }
        }
    }

    return { executeWrite }
}
