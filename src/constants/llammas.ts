import { IDict, ILlamma } from "../interfaces";
import { lowerCaseLlammasAddresses } from "./utils";

export const LLAMMAS: IDict<ILlamma> = lowerCaseLlammasAddresses({
    sfrxeth: {
        amm_address: '0x77fCFB78151c676f390a6236A78b5d3152e43384',
        controller_address: '0xCdEdbd0AD036C046eDB19576ee65ea96b26075b1',
        collateral_address: '0xac3E018457B222d93114458476f3E3416Abbe38F',
        collateral_symbol: 'sfrxETH',
        collateral_decimals: 18,
        min_bands: 5,
        max_bands: 50,
        default_bands: 20,
        A: 100,
    },
});
