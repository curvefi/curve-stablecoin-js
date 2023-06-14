import { IDict, ILlamma } from "../interfaces";
import MonetaryPolicyABI from "../constants/abis/MonetaryPolicy.json";
import MonetaryPolicy2ABI from "../constants/abis/MonetaryPolicy2.json";
import { lowerCaseLlammasAddresses } from "./utils";


export const LLAMMAS: IDict<ILlamma> = lowerCaseLlammasAddresses({
    sfrxeth: {
        amm_address: '0x136e783846ef68C8Bd00a3369F787dF8d683a696',
        controller_address: '0x8472A9A7632b173c8Cf3a86D3afec50c35548e76',
        monetary_policy_address: '0xc684432FD6322c6D58b6bC5d28B18569aA0AD0A1',
        collateral_address: '0xac3E018457B222d93114458476f3E3416Abbe38F',
        collateral_symbol: 'sfrxETH',
        collateral_decimals: 18,
        min_bands: 4,
        max_bands: 50,
        default_bands: 10,
        A: 100,
        monetary_policy_abi: MonetaryPolicyABI,
    },
    wsteth: {
        amm_address: '0x37417b2238aa52d0dd2d6252d989e728e8f706e4',
        controller_address: '0x100daa78fc509db39ef7d04de0c1abd299f4c6ce',
        monetary_policy_address: '0x1E7d3bf98d3f8D8CE193236c3e0eC4b00e32DaaE',
        collateral_address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
        collateral_symbol: 'wsteth',
        collateral_decimals: 18,
        min_bands: 4,
        max_bands: 50,
        default_bands: 10,
        A: 100,
        monetary_policy_abi: MonetaryPolicy2ABI,
    },
});
