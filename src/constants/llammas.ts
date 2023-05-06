import { IDict, ILlamma } from "../interfaces";
import { lowerCaseLlammasAddresses } from "./utils";


export const LLAMMAS: IDict<ILlamma> = lowerCaseLlammasAddresses({
    sfrxeth: {
        amm_address: '0x803f3D9cD755ea914B9a1A06bA5AdF39055A42DF',
        controller_address: '0x60C7dA1d9Bb55219897af4a19271BF80655ab2BF',
        collateral_address: '0xac3E018457B222d93114458476f3E3416Abbe38F',
        collateral_symbol: 'sfrxETH',
        collateral_decimals: 18,
        min_bands: 5,
        max_bands: 50,
        default_bands: 20,
        A: 100,
    },
});
