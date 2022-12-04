import { ethers } from "ethers";
import { Networkish } from "@ethersproject/networks";
import { LlammaTemplate, getLlamma } from "./llammas";
import { crvusd as _curve } from "./crvusd";
import { getBalances, getAllowance, hasAllowance, ensureAllowanceEstimateGas, ensureAllowance, getUsdRate } from "./utils";


async function init (
    providerType: 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy',
    providerSettings: { url?: string, privateKey?: string } | { externalProvider: ethers.providers.ExternalProvider } | { network?: Networkish, apiKey?: string },
    options: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, chainId?: number } = {}
): Promise<void> {
    await _curve.init(providerType, providerSettings, options);
    // @ts-ignore
    this.signerAddress = _curve.signerAddress;
    // @ts-ignore
    this.chainId = _curve.chainId;
}

function setCustomFeeData (customFeeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number }): void {
    _curve.setCustomFeeData(customFeeData);
}

const crvusd = {
    init,
    chainId: 0,
    signerAddress: '',
    LlammaTemplate,
    getLlamma,
    setCustomFeeData,
    getBalances,
    getAllowance,
    hasAllowance,
    ensureAllowance,
    getUsdRate,
    estimateGas: {
        ensureAllowance: ensureAllowanceEstimateGas,
    },
}

export default crvusd;
