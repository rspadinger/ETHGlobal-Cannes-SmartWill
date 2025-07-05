import { useMemo } from "react"
import { useReadContracts } from "wagmi"
import { useSmartContractRead } from "@/lib/web3/wagmiHelper"
import { erc20Abi, zeroAddress, isAddress, formatUnits, parseUnits } from "viem"
import { useAccount } from "wagmi"

export function useERC20TokenData() {
    const { address } = useAccount()

    const { data: whitelistedTokens } = useSmartContractRead({
        contract: "WillFactory",
        functionName: "getWhiteListedTokens",
    })

    const tokenAddresses = useMemo(() => {
        if (!whitelistedTokens) return []
        const [addresses] = whitelistedTokens
        return addresses
    }, [whitelistedTokens])

    const ERC20Contracts = useMemo(() => {
        if (!whitelistedTokens || !address) return []

        const [tokenAddresses] = whitelistedTokens

        return tokenAddresses.flatMap((tokenAddr: string) => [
            {
                address: tokenAddr,
                abi: erc20Abi,
                functionName: "symbol",
            },
            {
                address: tokenAddr,
                abi: erc20Abi,
                functionName: "name",
            },
            {
                address: tokenAddr,
                abi: erc20Abi,
                functionName: "decimals",
            },
            {
                address: tokenAddr,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            },
        ])
    }, [whitelistedTokens, address])

    const { data: tokenData, refetch: refetchTokenData } = useReadContracts({
        allowFailure: false,
        contracts: ERC20Contracts,
    })

    return { tokenAddresses, tokenData, refetchTokenData }
}

//helper function to get native token amount
export function getNativeTokenAmount(heirs: { tokens: string[]; amounts: bigint[] }[]): bigint {
    for (const heir of heirs) {
        for (let i = 0; i < heir.tokens.length; i++) {
            if (heir.tokens[i].toLowerCase() === zeroAddress) {
                return heir.amounts[i]
            }
        }
    }
    return 0n
}
