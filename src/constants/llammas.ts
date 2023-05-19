import { IDict, ILlamma } from "../interfaces";
import { lowerCaseLlammasAddresses } from "./utils";


export const LLAMMAS: IDict<ILlamma> = lowerCaseLlammasAddresses({
    sfrxeth: {
        amm_address: '0x136e783846ef68C8Bd00a3369F787dF8d683a696',
        controller_address: '0x8472A9A7632b173c8Cf3a86D3afec50c35548e76',
        collateral_address: '0xac3E018457B222d93114458476f3E3416Abbe38F',
        collateral_symbol: 'sfrxETH',
        collateral_decimals: 18,
        peg_keepers: [
            '0xaA346781dDD7009caa644A4980f044C50cD2ae22',
            '0xE7cd2b4EB1d98CD6a4A48B6071D46401Ac7DC5C8',
            '0x6B765d07cf966c745B340AdCa67749fE75B5c345',
            '0x1ef89Ed0eDd93D1EC09E4c07373f69C49f4dcCae',
        ],
        min_bands: 4,
        max_bands: 50,
        default_bands: 10,
        A: 100,
    },
});
