import { IDict, ILlamma } from "../interfaces";
import { lowerCaseLlammasAddresses } from "./utils";


export const LLAMMAS: IDict<ILlamma> = lowerCaseLlammasAddresses({
    eth: {
        amm_address: '0x725dfaf0E481653Ab86b2B071027e5DAA05cE8b4',
        controller_address: '0x23cB95f7AeF76c73fC189051400917eB3D764fF0',
        collateral_address: '0xb6286fAFd0451320ad6A8143089b216C2152c025',
        collateral_symbol: 'WETH',
        collateral_decimals: 18,
        min_bands: 5,
        max_bands: 50,
        default_bands: 20,
        A: 100,
    },
});
