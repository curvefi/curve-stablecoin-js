import { IDict, ILlamma } from "../interfaces";
import { lowerCaseLlammasAddresses } from "./utils";


export const LLAMMAS: IDict<ILlamma> = lowerCaseLlammasAddresses({
    eth: {
        amm_address: '0x431e47D68ED6F82534d3af78cC175a54B3fCA89b',
        controller_address: '0x8fcc5562719f201220FeE35A874867627d653f45',
        collateral_address: '0xE7eD6747FaC5360f88a2EFC03E00d25789F69291',
        collateral_decimals: 18,
        min_ticks: 5,
        max_ticks: 50,
    }
});


