import { IDict, ILlamma } from "../interfaces";
import { lowerCaseLlammasAddresses } from "./utils";

export const LLAMMAS: IDict<ILlamma> = lowerCaseLlammasAddresses({
    sfrxeth: {
        amm_address: '0x77fCFB78151c676f390a6236A78b5d3152e43384',
        controller_address: '0xCdEdbd0AD036C046eDB19576ee65ea96b26075b1',
        collateral_address: '0xac3E018457B222d93114458476f3E3416Abbe38F',
        collateral_symbol: 'sfrxETH',
        collateral_decimals: 18,
        peg_keepers: [
            '0xb8A3f8E783D52CfB9E632276714234661dB698e6',
            '0x8AeB58603eFB7a9F63712A2506df01b685ba1c4C',
            '0x89AC9A0B48fc66875De710aB7EE53027970064DC',
            '0xE38dAA41bE7CA22f724B9cF6D13CD920Bf18a3D2',
        ],
        min_bands: 5,
        max_bands: 50,
        default_bands: 20,
        A: 100,
    },
});
