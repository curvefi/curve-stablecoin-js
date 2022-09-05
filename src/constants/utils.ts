import {IDict, ILlamma} from "../interfaces";

export const lowerCaseLlammasAddresses = (llammas: IDict<ILlamma>): IDict<ILlamma> => {
    for (const llammaId in llammas) {
        if (!Object.prototype.hasOwnProperty.call(llammas, llammaId)) continue;
        const llamma = llammas[llammaId];
        llamma.amm_address = llamma.amm_address.toLowerCase();
        llamma.controller_address = llamma.controller_address.toLowerCase();
        llamma.collateral_address = llamma.collateral_address.toLowerCase();
    }

    return llammas
}

export const extractDecimals = (llammas: IDict<ILlamma>): IDict<number> => {
    const DECIMALS: IDict<number> = {};
    for (const llammaId in llammas) {
        if (!Object.prototype.hasOwnProperty.call(llammas, llammaId)) continue;
        const llamma = llammas[llammaId];

        // Collateral
        DECIMALS[llamma.collateral_address] = llamma.collateral_decimals;
    }

    return DECIMALS
}

export const lowerCaseValues = (dict: IDict<string>): IDict<string> => {
    // @ts-ignore
    return Object.fromEntries(Object.entries(dict).map((entry) => [entry[0], entry[1].toLowerCase()]))
}
