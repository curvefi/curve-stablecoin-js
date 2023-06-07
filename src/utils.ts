import axios from "axios";
import { ethers } from "ethers";
import BigNumber from 'bignumber.js';
import { IDict } from "./interfaces";
import { _getPoolsFromApi } from "./external-api";
import { crvusd } from "./crvusd";

export const MAX_ALLOWANCE = ethers.BigNumber.from(2).pow(ethers.BigNumber.from(256)).sub(ethers.BigNumber.from(1));
export const MAX_ACTIVE_BAND = ethers.BigNumber.from(2).pow(ethers.BigNumber.from(255)).sub(ethers.BigNumber.from(1));

// bignumber.js

export const BN = (val: number | string): BigNumber => new BigNumber(val);

export const toBN = (n: ethers.BigNumber, decimals = 18): BigNumber => {
    return BN(ethers.utils.formatUnits(n, decimals));
}

export const toStringFromBN = (bn: BigNumber, decimals = 18): string => {
    return bn.toFixed(decimals);
}

export const fromBN = (bn: BigNumber, decimals = 18): ethers.BigNumber => {
    return ethers.utils.parseUnits(toStringFromBN(bn, decimals), decimals)
}

// Formatting numbers

export const _cutZeros = (strn: string): string => {
    return strn.replace(/0+$/gi, '').replace(/\.$/gi, '');
}

export const checkNumber = (n: number | string): number | string => {
    if (Number(n) !== Number(n)) throw Error(`${n} is not a number`); // NaN
    return n
}

export const formatNumber = (n: number | string, decimals = 18): string => {
    n = checkNumber(n);
    const [integer, fractional] = String(n).split(".");

    return !fractional ? integer : integer + "." + fractional.slice(0, decimals);
}

export const parseUnits = (n: number | string, decimals = 18): ethers.BigNumber => {
    return ethers.utils.parseUnits(formatNumber(n, decimals), decimals);
}

// -----------------------------------------------------------------------------------------------


export const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
export const isEth = (address: string): boolean => address.toLowerCase() === ETH_ADDRESS.toLowerCase();
export const getEthIndex = (addresses: string[]): number => addresses.map((address: string) => address.toLowerCase()).indexOf(ETH_ADDRESS.toLowerCase());


export const _getAddress = (address: string): string => {
    address = address || crvusd.signerAddress;
    if (!address) throw Error("Need to connect wallet or pass address into args");

    return address
}

// coins can be either addresses or symbols
export const _getCoinAddressesNoCheck = (coins: string[]): string[] => {
    return coins.map((c) => c.toLowerCase()).map((c) => crvusd.constants.COINS[c] || c);
}

export const _getCoinAddresses = (coins: string[]): string[] => {
    const coinAddresses = _getCoinAddressesNoCheck(coins);
    const availableAddresses = Object.keys(crvusd.constants.DECIMALS);
    for (const coinAddr of coinAddresses) {
        if (!availableAddresses.includes(coinAddr)) throw Error(`Coin with address '${coinAddr}' is not available`);
    }

    return coinAddresses
}

export const _getCoinDecimals = (coinAddresses: string[]): number[] => {
    return coinAddresses.map((coinAddr) => crvusd.constants.DECIMALS[coinAddr.toLowerCase()] ?? 18);
}


// --- BALANCES ---

export const _getBalances = async (coinAddresses: string[], address = ""): Promise<ethers.BigNumber[]> => {
    address = _getAddress(address);
    const _coinAddresses = [...coinAddresses];
    const ethIndex = getEthIndex(_coinAddresses);
    if (ethIndex !== -1) {
        _coinAddresses.splice(ethIndex, 1);
    }

    const contractCalls = [];
    for (const coinAddr of _coinAddresses) {
        contractCalls.push(crvusd.contracts[coinAddr].multicallContract.balanceOf(address));
    }
    const _balances: ethers.BigNumber[] = await crvusd.multicallProvider.all(contractCalls);

    if (ethIndex !== -1) {
        const ethBalance: ethers.BigNumber = await crvusd.provider.getBalance(address);
        _balances.splice(ethIndex, 0, ethBalance);
    }

    return _balances
}

export const getBalances = async (coins: string[], address = ""): Promise<string[]> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);
    const _balances = await _getBalances(coinAddresses, address);

    return _balances.map((_b, i: number ) => ethers.utils.formatUnits(_b, decimals[i]));
}

// --- ALLOWANCE ---

export const _getAllowance = async (coins: string[], address: string, spender: string): Promise<ethers.BigNumber[]> => {
    const _coins = [...coins]
    const ethIndex = getEthIndex(_coins);
    if (ethIndex !== -1) {
        _coins.splice(ethIndex, 1);

    }

    let allowance: ethers.BigNumber[];
    if (_coins.length === 1) {
        allowance = [await crvusd.contracts[_coins[0]].contract.allowance(address, spender, crvusd.constantOptions)];
    } else {
        const contractCalls = _coins.map((coinAddr) => crvusd.contracts[coinAddr].multicallContract.allowance(address, spender));
        allowance = await crvusd.multicallProvider.all(contractCalls);
    }


    if (ethIndex !== -1) {
        allowance.splice(ethIndex, 0, MAX_ALLOWANCE);
    }

    return allowance;
}

// coins can be either addresses or symbols
export const getAllowance = async (coins: string[], address: string, spender: string): Promise<string[]> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);
    const _allowance = await _getAllowance(coinAddresses, address, spender);

    return _allowance.map((a, i) => ethers.utils.formatUnits(a, decimals[i]))
}

// coins can be either addresses or symbols
export const hasAllowance = async (coins: string[], amounts: (number | string)[], address: string, spender: string): Promise<boolean> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);
    const _allowance = await _getAllowance(coinAddresses, address, spender);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));

    return _allowance.map((a, i) => a.gte(_amounts[i])).reduce((a, b) => a && b);
}

export const _ensureAllowance = async (coins: string[], amounts: ethers.BigNumber[], spender: string): Promise<string[]> => {
    const address = crvusd.signerAddress;
    const allowance: ethers.BigNumber[] = await _getAllowance(coins, address, spender);

    const txHashes: string[] = []
    for (let i = 0; i < allowance.length; i++) {
        if (allowance[i].lt(amounts[i])) {
            const contract = crvusd.contracts[coins[i]].contract;
            await crvusd.updateFeeData();
            if (allowance[i].gt(ethers.BigNumber.from(0))) {
                const gasLimit = (await contract.estimateGas.approve(spender, ethers.BigNumber.from(0), crvusd.constantOptions)).mul(130).div(100);
                txHashes.push((await contract.approve(spender, ethers.BigNumber.from(0), { ...crvusd.options, gasLimit })).hash);
            }
            const gasLimit = (await contract.estimateGas.approve(spender, MAX_ALLOWANCE, crvusd.constantOptions)).mul(130).div(100);
            txHashes.push((await contract.approve(spender, MAX_ALLOWANCE, { ...crvusd.options, gasLimit })).hash);
        }
    }

    return txHashes;
}

// coins can be either addresses or symbols
export const ensureAllowanceEstimateGas = async (coins: string[], amounts: (number | string)[], spender: string): Promise<number> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));
    const address = crvusd.signerAddress;
    const allowance: ethers.BigNumber[] = await _getAllowance(coinAddresses, address, spender);

    let gas = 0;
    for (let i = 0; i < allowance.length; i++) {
        if (allowance[i].lt(_amounts[i])) {
            const contract = crvusd.contracts[coinAddresses[i]].contract;
            if (allowance[i].gt(ethers.BigNumber.from(0))) {
                gas += (await contract.estimateGas.approve(spender, ethers.BigNumber.from(0), crvusd.constantOptions)).toNumber();
            }
            gas += (await contract.estimateGas.approve(spender, MAX_ALLOWANCE, crvusd.constantOptions)).toNumber();
        }
    }

    return gas
}

// coins can be either addresses or symbols
export const ensureAllowance = async (coins: string[], amounts: (number | string)[], spender: string): Promise<string[]> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));

    return await _ensureAllowance(coinAddresses, _amounts, spender)
}

export const _getUsdPricesFromApi = async (): Promise<IDict<number>> => {
    const network = crvusd.constants.NETWORK_NAME;
    const promises = [
        _getPoolsFromApi(network, "main"),
        _getPoolsFromApi(network, "factory"),
        _getPoolsFromApi(network, "factory-crvusd"),
    ];
    const allTypesExtendedPoolData = await Promise.all(promises);
    const priceDict: IDict<number> = {};

    for (const extendedPoolData of allTypesExtendedPoolData) {
        for (const pool of extendedPoolData.poolData) {
            const lpTokenAddress = pool.lpTokenAddress ?? pool.address;
            const totalSupply = pool.totalSupply / (10 ** 18);
            priceDict[lpTokenAddress.toLowerCase()] = pool.usdTotal && totalSupply ? pool.usdTotal / totalSupply : 0;

            for (const coin of pool.coins) {
                if (typeof coin.usdPrice === "number") priceDict[coin.address.toLowerCase()] = coin.usdPrice;
            }

            for (const coin of pool.gaugeRewards ?? []) {
                if (typeof coin.tokenPrice === "number") priceDict[coin.tokenAddress.toLowerCase()] = coin.tokenPrice;
            }
        }
    }

    return priceDict
}

const _usdRatesCache: IDict<{ rate: number, time: number }> = {}
export const getUsdRate = async (coin: string): Promise<number> => {
    let [coinAddress] = _getCoinAddressesNoCheck([coin]);
    const pricesFromApi = await _getUsdPricesFromApi()
    if (coinAddress.toLowerCase() in pricesFromApi) return pricesFromApi[coinAddress.toLowerCase()];

    const chainName = 'ethereum';
    const nativeTokenName = 'ethereum';
    coinAddress = isEth(coinAddress) ? nativeTokenName : coinAddress.toLowerCase();


    if ((_usdRatesCache[coinAddress]?.time || 0) + 600000 < Date.now()) {
        const url = coinAddress === nativeTokenName ?
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinAddress}&vs_currencies=usd` :
            `https://api.coingecko.com/api/v3/simple/token_price/${chainName}?contract_addresses=${coinAddress}&vs_currencies=usd`
        const response = await axios.get(url);
        try {
            _usdRatesCache[coinAddress] = {'rate': response.data[coinAddress]['usd'] ?? 0, 'time': Date.now()};
        } catch (err) { // TODO pay attention!
            _usdRatesCache[coinAddress] = {'rate': 0, 'time': Date.now()};
        }
    }

    return _usdRatesCache[coinAddress]['rate']
}

export const totalSupply = async (): Promise<string> => {
    const calls = [];
    for (const llammaId of crvusd.getLlammaList()) {
        const controllerAddress = crvusd.constants.LLAMMAS[llammaId].controller_address;
        const controllerContract = crvusd.contracts[controllerAddress].multicallContract;
        calls.push(controllerContract.minted(), controllerContract.redeemed());
    }
    for (const pegKeeper of crvusd.constants.PEG_KEEPERS) {
        calls.push(crvusd.contracts[pegKeeper].multicallContract.debt());
    }
    const res: ethers.BigNumber[] = await crvusd.multicallProvider.all(calls);

    let totalSupplyBN = BN(0);
    for (let i = 0; i < crvusd.getLlammaList().length; i++) {
        const [_minted, _redeemed] = res.splice(0, 2);
        totalSupplyBN = toBN(_minted).minus(toBN(_redeemed)).plus(totalSupplyBN);
    }
    for (const _pegKeeperDebt of res) {
        totalSupplyBN = totalSupplyBN.plus(toBN(_pegKeeperDebt));
    }

    return totalSupplyBN.toString();
}