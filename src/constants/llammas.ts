import { IDict, ILlamma } from "../interfaces";
import { lowerCaseLlammasAddresses } from "./utils";


export const LLAMMAS: IDict<ILlamma> = lowerCaseLlammasAddresses({
    eth: {
        amm_address: '0x3897810a334833184Ef7D6B419ba4d78EC2bBF80',
        controller_address: '0x1eF9f7C2abD0E351a8966f00565e1b04765d3f0C',
        collateral_address: '0xa3B53dDCd2E3fC28e8E130288F2aBD8d5EE37472',
        collateral_decimals: 18,
        min_ticks: 5,
        max_ticks: 50,
    },
});
