import memoize from "memoizee";
import { IExtendedPoolDataFromApi, INetworkName } from "./interfaces";

export const _getPoolsFromApi = memoize(
    async (network: INetworkName, poolType: "main" | "crypto" | "factory" | "factory-crvusd" | "factory-crypto"): Promise<IExtendedPoolDataFromApi> => {
        const url = `https://api.curve.finance/api/getPools/${network}/${poolType}`;
        const response = await fetch(url);
        const {data} = await response.json() as { data: IExtendedPoolDataFromApi };
        return data ?? { poolData: [], tvl: 0, tvlAll: 0 };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getUserCollateral = memoize(
    async (network: INetworkName, controller: string, user: string): Promise<string> => {
        const url = `https://prices.curve.finance/v1/crvusd/collateral_events/${network}/${controller}/${user}`;
        const response = await fetch(url);
        const {total_deposit} = await response.json() as { total_deposit: string };
        return total_deposit;
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    }
)