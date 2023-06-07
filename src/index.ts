import { ethers } from "ethers";
import { Networkish } from "@ethersproject/networks";
import { LlammaTemplate, getLlamma } from "./llammas";
import { crvusd as _crvusd } from "./crvusd";
import { getBalances, getAllowance, hasAllowance, ensureAllowanceEstimateGas, ensureAllowance, getUsdRate } from "./utils";


async function init (
    providerType: 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy',
    providerSettings: { url?: string, privateKey?: string } | { externalProvider: ethers.providers.ExternalProvider } | { network?: Networkish, apiKey?: string },
    options: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, chainId?: number } = {}
): Promise<void> {
    await _crvusd.init(providerType, providerSettings, options);
    // @ts-ignore
    this.signerAddress = _crvusd.signerAddress;
    // @ts-ignore
    this.chainId = _crvusd.chainId;
}

function setCustomFeeData (customFeeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number }): void {
    _crvusd.setCustomFeeData(customFeeData);
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
    getLlammaList: _crvusd.getLlammaList,
    estimateGas: {
        ensureAllowance: ensureAllowanceEstimateGas,
    },
}

export default crvusd;
