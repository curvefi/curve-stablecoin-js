import { Contract, ethers } from "ethers";
import { Contract as MulticallContract, Provider as MulticallProvider } from "ethcall";

export interface IDict<T> {
    [index: string]: T,
}

export interface ILlamma {
    amm_address: string,
    controller_address: string,
    collateral_address: string,
    collateral_decimals: number,
    min_ticks: number,
    max_ticks: number,
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
