import { IDict, ILlamma } from "../interfaces";
import { lowerCaseLlammasAddresses } from "./utils";


export const LLAMMAS: IDict<ILlamma> = lowerCaseLlammasAddresses({
    sfrxeth: {
        amm_address: '0x136e783846ef68C8Bd00a3369F787dF8d683a696',
        controller_address: '0x8472A9A7632b173c8Cf3a86D3afec50c35548e76',
        collateral_address: '0xac3E018457B222d93114458476f3E3416Abbe38F',
        collateral_symbol: 'sfrxETH',
        collateral_decimals: 18,
        min_bands: 4,
        max_bands: 50,
        default_bands: 10,
        A: 100,
    },
});
