import { ethers, Contract } from "ethers";
import { Networkish } from "@ethersproject/networks";
import { Provider as MulticallProvider, Contract as MulticallContract } from 'ethcall';
import { Icrvusd, IDict, ILlamma } from "./interfaces";
import ERC20ABI from "./constants/abis/ERC20.json";
import MonetaryPolicy2ABI from "./constants/abis/MonetaryPolicy2.json";
import FactoryABI from "./constants/abis/Factory.json";
import controllerABI from "./constants/abis/controller.json";
import controllerV2ABI from "./constants/abis/controller_v2.json";
import llammaABI from "./constants/abis/llamma.json";
import HealthCalculatorZapABI from "./constants/abis/HealthCalculatorZap.json";
import LeverageZapABI from "./constants/abis/LeverageZap.json";
import DeleverageZapABI from "./constants/abis/DeleverageZap.json";
import PegKeeper from "./constants/abis/PegKeeper.json";
import { LLAMMAS } from "./constants/llammas";
import { COINS } from "./constants/coins";
import { extractDecimals } from "./constants/utils";


class Crvusd implements Icrvusd {
    address: string;
    provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider;
    multicallProvider: MulticallProvider;
    signer: ethers.Signer | null;
    signerAddress: string;
    chainId: number;
    contracts: { [index: string]: { contract: Contract, multicallContract: MulticallContract } };
    feeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number };
    constantOptions: { gasLimit: number };
    options: { gasPrice?: number | ethers.BigNumber, maxFeePerGas?: number | ethers.BigNumber, maxPriorityFeePerGas?: number | ethers.BigNumber };
    constants: {
        LLAMMAS: IDict<ILlamma>,
        COINS: IDict<string>,
        DECIMALS: IDict<number>,
        NETWORK_NAME: "ethereum",
        FACTORY: string,
        PEG_KEEPERS: string[],
        WETH: string,
    };

    constructor() {
        this.address = COINS.crvusd.toLowerCase();
        // @ts-ignore
        this.provider = null;
        // @ts-ignore
        this.signer = null;
        this.signerAddress = "";
        this.chainId = 0;
        // @ts-ignore
        this.multicallProvider = null;
        this.contracts = {};
        this.feeData = {}
        this.constantOptions = { gasLimit: 35000000 }
        this.options = {};
        this.constants = {
            LLAMMAS: {},
            COINS: {},
            DECIMALS: {},
            NETWORK_NAME: "ethereum",
            FACTORY: "0xC9332fdCB1C491Dcc683bAe86Fe3cb70360738BC".toLowerCase(),
            PEG_KEEPERS: [
                '0x9201da0d97caaaff53f01b2fb56767c7072de340'.toLowerCase(),
                '0xfb726f57d251ab5c731e5c64ed4f5f94351ef9f3'.toLowerCase(),
                '0x3fa20eaa107de08b38a8734063d605d5842fe09c'.toLowerCase(),
                '0x0a05ff644878b908ef8eb29542aa88c07d9797d3'.toLowerCase(),
                '0x503E1Bf274e7a6c64152395aE8eB57ec391F91F8'.toLowerCase(),
            ],
            WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toLowerCase(),
        };
    }

    async init(
        providerType: 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy',
        providerSettings: { url?: string, privateKey?: string } | { externalProvider: ethers.providers.ExternalProvider } | { network?: Networkish, apiKey?: string },
        options: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, chainId?: number } = {} // gasPrice in Gwei
    ): Promise<void> {
        // @ts-ignore
        this.provider = null;
        // @ts-ignore
        this.signer = null;
        this.signerAddress = "";
        this.chainId = 0;
        // @ts-ignore
        this.multicallProvider = null;
        this.contracts = {};
        this.feeData = {}
        this.constantOptions = { gasLimit: 12000000 }
        this.options = {};
        this.constants.LLAMMAS = {...LLAMMAS}

        // JsonRpc provider
        if (providerType.toLowerCase() === 'JsonRpc'.toLowerCase()) {
            providerSettings = providerSettings as { url: string, privateKey: string };

            if (providerSettings.url) {
                this.provider = this.provider = new ethers.providers.JsonRpcProvider(providerSettings.url);
            } else {
                this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
            }

            if (providerSettings.privateKey) {
                this.signer = new ethers.Wallet(providerSettings.privateKey, this.provider);
            } else {
                this.signer = this.provider.getSigner();
            }
            // Web3 provider
        } else if (providerType.toLowerCase() === 'Web3'.toLowerCase()) {
            providerSettings = providerSettings as { externalProvider: ethers.providers.ExternalProvider };
            this.provider = new ethers.providers.Web3Provider(providerSettings.externalProvider);
            this.signer = this.provider.getSigner();
            // Infura provider
        } else if (providerType.toLowerCase() === 'Infura'.toLowerCase()) {
            providerSettings = providerSettings as { network?: Networkish, apiKey?: string };
            this.provider = new ethers.providers.InfuraProvider(providerSettings.network, providerSettings.apiKey);
            this.signer = null;
            // Alchemy provider
        } else if (providerType.toLowerCase() === 'Alchemy'.toLowerCase()) {
            providerSettings = providerSettings as { network?: Networkish, apiKey?: string };
            this.provider = new ethers.providers.AlchemyProvider(providerSettings.network, providerSettings.apiKey);
            this.signer = null;
        } else {
            throw Error('Wrong providerType');
        }

        this.multicallProvider = new MulticallProvider();
        await this.multicallProvider.init(this.provider);

        if (this.signer) {
            try {
                this.signerAddress = await this.signer.getAddress();
            } catch (err) {
                this.signer = null;
            }
        } else {
            this.signerAddress = '';
        }

        this.feeData = { gasPrice: options.gasPrice, maxFeePerGas: options.maxFeePerGas, maxPriorityFeePerGas: options.maxPriorityFeePerGas };
        await this.updateFeeData();

        this.setContract(this.address, ERC20ABI);
        for (const llamma of Object.values(this.constants.LLAMMAS)) {
            this.setContract(llamma.amm_address, llammaABI);
            this.setContract(llamma.controller_address, controllerABI);
            const monetary_policy_address = await this.contracts[llamma.controller_address].contract.monetary_policy(this.constantOptions);
            llamma.monetary_policy_address = monetary_policy_address.toLowerCase();
            this.setContract(llamma.monetary_policy_address, llamma.monetary_policy_abi);
            if (llamma.collateral_address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
                this.setContract(this.constants.WETH, ERC20ABI);
            } else {
                this.setContract(llamma.collateral_address, ERC20ABI);
            }
            this.setContract(llamma.leverage_zap, LeverageZapABI);
            this.setContract(llamma.deleverage_zap, DeleverageZapABI);
            if (llamma.health_calculator_zap) this.setContract(llamma.health_calculator_zap, HealthCalculatorZapABI);
        }
        for (const pegKeeper of this.constants.PEG_KEEPERS) {
            this.setContract(pegKeeper, PegKeeper);
        }

        // Fetch new llammas

        this.setContract(this.constants.FACTORY, FactoryABI);
        const factoryContract = this.contracts[this.constants.FACTORY].contract;
        const factoryMulticallContract = this.contracts[this.constants.FACTORY].multicallContract;

        const N1 = Object.keys(this.constants.LLAMMAS).length;
        const N2 = await factoryContract.n_collaterals(this.constantOptions);
        let calls = [];
        for (let i = N1; i < N2; i++) {
            calls.push(
                factoryMulticallContract.collaterals(i),
                factoryMulticallContract.amms(i),
                factoryMulticallContract.controllers(i)
            );
        }
        const res: string[] = (await this.multicallProvider.all(calls) as string[]).map((c) => c.toLowerCase());
        const collaterals = res.filter((a, i) => i % 3 == 0) as string[];
        const amms = res.filter((a, i) => i % 3 == 1) as string[];
        const controllers = res.filter((a, i) => i % 3 == 2) as string[];

        if (collaterals.length > 0) {
            for (const collateral of collaterals) this.setContract(collateral, ERC20ABI);

            calls = [];
            for (const collateral of collaterals) {
                calls.push(
                    this.contracts[collateral].multicallContract.symbol(),
                    this.contracts[collateral].multicallContract.decimals()
                )
            }
            const res = (await this.multicallProvider.all(calls)).map((x) => {
                if (typeof x === "string") return x.toLowerCase();
                return x;
            });

            calls = [];

            for(const amm of amms) {
                this.setContract(amm, llammaABI);
                calls.push(
                    this.contracts[amm].multicallContract.A()
                )
            }

            const AParams = (await this.multicallProvider.all(calls)).map((x) => {
                return (x as ethers.BigNumber).toNumber();
            });

            for (let i = 0; i < collaterals.length; i++) {
                const is_eth = collaterals[i] === this.constants.WETH;
                const [collateral_symbol, collateral_decimals] = res.splice(0, 2) as [string, number];
                // TODO Should be refactor later
                if (i >= collaterals.length - 3) {
                    console.log('new market',collateral_symbol)
                    this.setContract(controllers[i], controllerV2ABI);
                } else {
                    console.log('old market',collateral_symbol)
                    this.setContract(controllers[i], controllerABI);
                }

                const monetary_policy_address = (await this.contracts[controllers[i]].contract.monetary_policy(this.constantOptions)).toLowerCase();
                this.setContract(monetary_policy_address, MonetaryPolicy2ABI);
                const _llammaId: string = is_eth ? "eth" : collateral_symbol.toLowerCase();
                let llammaId = _llammaId;
                let j = 2;
                while (llammaId in this.constants.LLAMMAS) llammaId = _llammaId + j++;
                this.constants.LLAMMAS[llammaId] = {
                    amm_address: amms[i],
                    controller_address: controllers[i],
                    monetary_policy_address,
                    collateral_address: is_eth ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" : collaterals[i],
                    leverage_zap: "0x0000000000000000000000000000000000000000",
                    deleverage_zap: "0x0000000000000000000000000000000000000000",
                    collateral_symbol: is_eth ? "ETH" : collateral_symbol,
                    collateral_decimals,
                    min_bands: 4,
                    max_bands: 50,
                    default_bands: 10,
                    A: AParams[i],
                    monetary_policy_abi: MonetaryPolicy2ABI,
                    isNewMarket: i >= collaterals.length - 3,
                }
            }
        }

        this.constants.DECIMALS = extractDecimals(this.constants.LLAMMAS);
        this.constants.DECIMALS[this.address] = 18;
        this.constants.COINS = COINS;
    }

    setContract(address: string, abi: any): void {
        this.contracts[address] = {
            contract: new Contract(address, abi, this.signer || this.provider),
            multicallContract: new MulticallContract(address, abi),
        }
    }

    setCustomFeeData(customFeeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number }): void {
        this.feeData = { ...this.feeData, ...customFeeData };
    }

    getLlammaList = () => Object.keys(this.constants.LLAMMAS);

    formatUnits(value: ethers.BigNumberish, unit?: string | ethers.BigNumberish): string {
        return ethers.utils.formatUnits(value, unit);
    }

    parseUnits(value: string, unit?: string | ethers.BigNumberish): ethers.BigNumber {
        return ethers.utils.parseUnits(value, unit);
    }

    async updateFeeData(): Promise<void> {
        const feeData = await this.provider.getFeeData();
        if (feeData.maxFeePerGas === null || feeData.maxPriorityFeePerGas === null) {
            delete this.options.maxFeePerGas;
            delete this.options.maxPriorityFeePerGas;

            this.options.gasPrice = this.feeData.gasPrice !== undefined ?
                ethers.utils.parseUnits(this.feeData.gasPrice.toString(), "gwei") :
                (feeData.gasPrice || await this.provider.getGasPrice());
        } else {
            delete this.options.gasPrice;

            this.options.maxFeePerGas = this.feeData.maxFeePerGas !== undefined ?
                ethers.utils.parseUnits(this.feeData.maxFeePerGas.toString(), "gwei") :
                feeData.maxFeePerGas;
            this.options.maxPriorityFeePerGas = this.feeData.maxPriorityFeePerGas !== undefined ?
                ethers.utils.parseUnits(this.feeData.maxPriorityFeePerGas.toString(), "gwei") :
                feeData.maxPriorityFeePerGas;
        }
    }
}

export const crvusd = new Crvusd();
