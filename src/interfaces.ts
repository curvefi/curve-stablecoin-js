import { Contract, ethers } from "ethers";
import { Contract as MulticallContract, Provider as MulticallProvider } from "ethcall";

export interface IDict<T> {
    [index: string]: T,
}

export interface ILlamma {
    amm_address: string,
    controller_address: string,
    monetary_policy_address: string,
    collateral_address: string,
    leverage_zap: string,
    deleverage_zap: string,
    health_calculator_zap?: string,
    collateral_symbol: string,
    collateral_decimals: number,
    min_bands: number,
    max_bands: number,
    default_bands: number,
    A: number,
    monetary_policy_abi: any
    isNewMarket?: boolean
}

export interface Icrvusd {
    provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider,
    multicallProvider: MulticallProvider,
    signer: ethers.Signer | null,
    signerAddress: string,
    contracts: { [index: string]: { contract: Contract, multicallContract: MulticallContract } },
    feeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number },
    constantOptions: { gasLimit: number },
    options: { gasPrice?: number | ethers.BigNumber, maxFeePerGas?: number | ethers.BigNumber, maxPriorityFeePerGas?: number | ethers.BigNumber },
    constants: {
        LLAMMAS: IDict<ILlamma>,
    };
}

export type INetworkName = "ethereum";

export interface ICoinFromPoolDataApi {
    address: string,
    symbol: string,
    decimals: string,
    usdPrice: number | string,
}

export interface IReward {
    gaugeAddress: string,
    tokenAddress: string,
    tokenPrice?: number,
    name?: string,
    symbol: string,
    decimals?: number,
    apy: number
}

export interface IPoolDataFromApi {
    id: string,
    name: string,
    symbol: string,
    assetTypeName: string,
    address: string,
    lpTokenAddress?: string,
    gaugeAddress?: string,
    implementation: string,
    implementationAddress: string,
    coins: ICoinFromPoolDataApi[],
    gaugeRewards?: IReward[],
    usdTotal: number,
    totalSupply: number,
    amplificationCoefficient: string,
}

export interface IExtendedPoolDataFromApi {
    poolData: IPoolDataFromApi[],
    tvl?: number,
    tvlAll: number,
}
