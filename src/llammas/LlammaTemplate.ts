import { ethers } from "ethers";
import memoize from "memoizee";
import BigNumber from "bignumber.js";
import { crvusd } from "../crvusd";
import {
    _getAddress,
    parseUnits,
    BN,
    toBN,
    fromBN,
    getBalances,
    ensureAllowance,
    hasAllowance,
    ensureAllowanceEstimateGas,
    isEth,
    _cutZeros,
    MAX_ALLOWANCE,
    MAX_ACTIVE_BAND,
} from "../utils";
import { IDict } from "../interfaces";


export class LlammaTemplate {
    id: string;
    address: string;
    controller: string;
    collateral: string;
    collateralSymbol: string;
    collateralDecimals: number;
    coins: string[];
    coinAddresses: string[];
    coinDecimals: number[];
    minBands: number;
    maxBands: number;
    defaultBands: number;
    A: number;
    tickSpace: number; // %
    estimateGas: {
        createLoanApprove: (collateral: number | string) => Promise<number>,
        createLoan: (collateral: number | string, debt: number | string, range: number) => Promise<number>,
        addCollateralApprove: (collateral: number | string) => Promise<number>,
        addCollateral: (collateral: number | string, address?: string) => Promise<number>,
        borrowMoreApprove: (collateral: number | string) => Promise<number>,
        borrowMore: (collateral: number | string, debt: number | string) => Promise<number>,
        repayApprove: (debt: number | string) => Promise<number>,
        repay: (debt: number | string, address?: string) => Promise<number>,
        fullRepayApprove: (address?: string) => Promise<number>,
        fullRepay: (address?: string) => Promise<number>,
        swapApprove: (i: number, amount: number | string) => Promise<number>,
        swap: (i: number, j: number, amount: number | string, slippage?: number) => Promise<number>,
        liquidateApprove: (address: string) => Promise<number>,
        liquidate: (address: string, slippage?: number) => Promise<number>,
        selfLiquidateApprove: () => Promise<number>,
        selfLiquidate: (slippage?: number) => Promise<number>,
    };
    stats: {
        parameters: () => Promise<{
            fee: string, // %
            admin_fee: string, // %
            rate: string, // %
            liquidation_discount: string, // %
            loan_discount: string, // %
        }>,
        balances: () => Promise<[string, string]>,
        maxMinBands: () => Promise<[number, number]>,
        activeBand:() => Promise<number>,
        liquidatingBand:() => Promise<number | null>,
        bandBalances:(n: number) => Promise<{ stablecoin: string, collateral: string }>,
        bandsBalances: () => Promise<{ [index: number]: { stablecoin: string, collateral: string } }>,
        totalSupply: () => Promise<string>,
        totalDebt: () => Promise<string>,
        totalStablecoin: () => Promise<string>,
        totalCollateral: () => Promise<string>,
    };
    wallet: {
        balances: (address?: string) => Promise<{ stablecoin: string, collateral: string }>,
    };

    constructor(id: string) {
        const llammaData = crvusd.constants.LLAMMAS[id];

        this.id = id;
        this.address = llammaData.amm_address;
        this.controller = llammaData.controller_address;
        this.collateral = llammaData.collateral_address;
        this.collateralSymbol = llammaData.collateral_symbol;
        this.collateralDecimals = llammaData.collateral_decimals;
        this.coins = ["crvUSD", llammaData.collateral_symbol];
        this.coinAddresses = [crvusd.address, llammaData.collateral_address];
        this.coinDecimals = [18, llammaData.collateral_decimals];
        this.minBands = llammaData.min_bands;
        this.maxBands = llammaData.max_bands;
        this.defaultBands = llammaData.default_bands;
        this.A = llammaData.A;
        this.tickSpace = 1 / llammaData.A * 100;
        this.estimateGas = {
            createLoanApprove: this.createLoanApproveEstimateGas.bind(this),
            createLoan: this.createLoanEstimateGas.bind(this),
            addCollateralApprove: this.addCollateralApproveEstimateGas.bind(this),
            addCollateral: this.addCollateralEstimateGas.bind(this),
            borrowMoreApprove: this.borrowMoreApproveEstimateGas.bind(this),
            borrowMore: this.borrowMoreEstimateGas.bind(this),
            repayApprove: this.repayApproveEstimateGas.bind(this),
            repay: this.repayEstimateGas.bind(this),
            fullRepayApprove: this.fullRepayApproveEstimateGas.bind(this),
            fullRepay: this.fullRepayEstimateGas.bind(this),
            swapApprove: this.swapApproveEstimateGas.bind(this),
            swap: this.swapEstimateGas.bind(this),
            liquidateApprove: this.liquidateApproveEstimateGas.bind(this),
            liquidate: this.liquidateEstimateGas.bind(this),
            selfLiquidateApprove: this.selfLiquidateApproveEstimateGas.bind(this),
            selfLiquidate: this.selfLiquidateEstimateGas.bind(this),
        }
        this.stats = {
            parameters: this.statsParameters.bind(this),
            balances: this.statsBalances.bind(this),
            maxMinBands: this.statsMaxMinBands.bind(this),
            activeBand: this.statsActiveBand.bind(this),
            liquidatingBand: this.statsLiquidatingBand.bind(this),
            bandBalances: this.statsBandBalances.bind(this),
            bandsBalances: this.statsBandsBalances.bind(this),
            totalSupply: this.statsTotalSupply.bind(this),
            totalDebt: this.statsTotalDebt.bind(this),
            totalStablecoin: this.statsTotalStablecoin.bind(this),
            totalCollateral: this.statsTotalCollateral.bind(this),
        }
        this.wallet = {
            balances: this.walletBalances.bind(this),
        }
    }

    // ---------------- STATS ----------------

    private statsParameters = memoize(async (): Promise<{
        fee: string, // %
        admin_fee: string, // %
        rate: string, // %
        future_rate: string, // %
        liquidation_discount: string, // %
        loan_discount: string, // %
    }> => {
        const llammaContract = crvusd.contracts[this.address].multicallContract;
        const controllerContract = crvusd.contracts[this.controller].multicallContract;
        const monetaryPolicycontract = crvusd.contracts[crvusd.monetary_policy].multicallContract;

        const calls = [
            llammaContract.fee(),
            llammaContract.admin_fee(),
            llammaContract.rate(),
            monetaryPolicycontract.rate(),
            controllerContract.liquidation_discount(),
            controllerContract.loan_discount(),
        ]

        const [_fee, _admin_fee, _rate, _mp_rate, _liquidation_discount, _loan_discount]: ethers.BigNumber[] = await crvusd.multicallProvider.all(calls) as ethers.BigNumber[];
        const [fee, admin_fee, liquidation_discount, loan_discount] = [_fee, _admin_fee, _liquidation_discount, _loan_discount]
            .map((x) => ethers.utils.formatUnits(x.mul(100)));

        // (1+rate)**(365*86400)-1 ~= (e**(rate*365*86400))-1
        const rate = String(((2.718281828459 ** (toBN(_rate).times(365).times(86400)).toNumber()) - 1) * 100);
        const future_rate = String(((2.718281828459 ** (toBN(_mp_rate).times(365).times(86400)).toNumber()) - 1) * 100);

        return { fee, admin_fee, rate, future_rate, liquidation_discount, loan_discount }
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

    private async statsBalances(): Promise<[string, string]> {
        const crvusdContract = crvusd.contracts[crvusd.address].multicallContract;
        const collateralContract = crvusd.contracts[this.collateral].multicallContract;
        const contract = crvusd.contracts[this.address].multicallContract;
        const calls = [
            crvusdContract.balanceOf(this.address),
            collateralContract.balanceOf(this.address),
            contract.admin_fees_x(),
            contract.admin_fees_y(),
        ]
        const [_crvusdBalance, _collateralBalance, _crvusdAdminFees, _collateralAdminFees]: ethers.BigNumber[] = await crvusd.multicallProvider.all(calls);

        return [
            ethers.utils.formatUnits(_crvusdBalance.sub(_crvusdAdminFees)),
            ethers.utils.formatUnits(_collateralBalance.sub(_collateralAdminFees), this.collateralDecimals),
        ];
    }

    private statsMaxMinBands = memoize(async (): Promise<[number, number]> => {
        const llammaContract = crvusd.contracts[this.address].multicallContract;

        const calls1 = [
            llammaContract.max_band(),
            llammaContract.min_band(),
        ]

        return (await crvusd.multicallProvider.all(calls1) as ethers.BigNumber[]).map((_b) => _b.toNumber()) as [number, number];
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private statsActiveBand = memoize(async (): Promise<number> => {
        return (await crvusd.contracts[this.address].contract.active_band()).toNumber()
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private async statsLiquidatingBand(): Promise<number | null> {
        const activeBand = await this.statsActiveBand();
        const { stablecoin, collateral } = await this.statsBandBalances(activeBand);
        if (Number(stablecoin) > 0 && Number(collateral) > 0) return activeBand;
        return null
    }

    private async statsBandBalances(n: number): Promise<{ stablecoin: string, collateral: string }> {
        const llammaContract = crvusd.contracts[this.address].multicallContract;
        const calls = [];
        calls.push(llammaContract.bands_x(n), llammaContract.bands_y(n));

        const _balances: ethers.BigNumber[] = await crvusd.multicallProvider.all(calls);

        return {
            stablecoin: ethers.utils.formatUnits(_balances[0]),
            collateral: ethers.utils.formatUnits(_balances[1], this.collateralDecimals),
        }
    }

    private async statsBandsBalances(): Promise<{ [index: number]: { stablecoin: string, collateral: string } }> {
        const [max_band, min_band]: number[] = await this.statsMaxMinBands();

        const llammaContract = crvusd.contracts[this.address].multicallContract;
        const calls = [];
        for (let i = min_band; i <= max_band; i++) {
            calls.push(llammaContract.bands_x(i), llammaContract.bands_y(i));
        }

        const _bands: ethers.BigNumber[] = await crvusd.multicallProvider.all(calls);

        const bands: { [index: number]: { stablecoin: string, collateral: string } } = {};
        for (let i = min_band; i <= max_band; i++) {
            const _i = i - min_band
            bands[i] = {
                stablecoin: ethers.utils.formatUnits(_bands[2 * _i]),
                collateral: ethers.utils.formatUnits(_bands[(2 * _i) + 1], this.collateralDecimals),
            }
        }

        return bands
    }

    private statsTotalSupply = memoize(async (): Promise<string> => {
        const controllerContract = crvusd.contracts[this.controller].multicallContract;
        const calls = [controllerContract.minted(), controllerContract.redeemed()]
        const [_minted, _redeemed]: ethers.BigNumber[] = await crvusd.multicallProvider.all(calls);

        return toBN(_minted).minus(toBN(_redeemed)).toString();
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private statsTotalDebt = memoize(async (): Promise<string> => {
        const debt = await crvusd.contracts[this.controller].contract.total_debt(crvusd.constantOptions);

        return ethers.utils.formatUnits(debt);
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private statsTotalStablecoin = memoize(async (): Promise<string> => {
        const stablecoinContract = crvusd.contracts[crvusd.address].multicallContract;
        const ammContract = crvusd.contracts[this.address].multicallContract;

        const [_balance, _fee]: ethers.BigNumber[] = await crvusd.multicallProvider.all([
            stablecoinContract.balanceOf(this.address),
            ammContract.admin_fees_x(),
        ]);

        return toBN(_balance).minus(toBN(_fee)).toString()
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private statsTotalCollateral = memoize(async (): Promise<string> => {
        const collateralContract = crvusd.contracts[this.collateral].multicallContract;
        const ammContract = crvusd.contracts[this.address].multicallContract;

        const [_balance, _fee]: ethers.BigNumber[] = await crvusd.multicallProvider.all([
            collateralContract.balanceOf(this.address),
            ammContract.admin_fees_y(),
        ]);

        return toBN(_balance, this.collateralDecimals).minus(toBN(_fee, this.collateralDecimals)).toString()
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    // ---------------------------------------

    public async loanExists(address = ""): Promise<boolean> {
        address = _getAddress(address);
        return  await crvusd.contracts[this.controller].contract.loan_exists(address, crvusd.constantOptions);
    }

    public async userDebt(address = ""): Promise<string> {
        address = _getAddress(address);
        const debt = await crvusd.contracts[this.controller].contract.debt(address, crvusd.constantOptions);

        return ethers.utils.formatUnits(debt);
    }

    public async userHealth(full = true, address = ""): Promise<string> {
        address = _getAddress(address);
        let _health = await crvusd.contracts[this.controller].contract.health(address, full, crvusd.constantOptions) as ethers.BigNumber;
        _health = _health.mul(100);

        return ethers.utils.formatUnits(_health);
    }

    public async userBands(address = ""): Promise<number[]> {
        address = _getAddress(address);
        const _bands = await crvusd.contracts[this.address].contract.read_user_tick_numbers(address, crvusd.constantOptions) as ethers.BigNumber[];

        return _bands.map((_t) => _t.toNumber()).reverse();
    }

    public async userRange(address = ""): Promise<number> {
        const [n2, n1] = await this.userBands(address);
        if (n1 == n2) return 0;
        return n2 - n1 + 1;
    }

    public async userPrices(address = ""): Promise<string[]> {
        address = _getAddress(address);
        const _prices = await crvusd.contracts[this.controller].contract.user_prices(address, crvusd.constantOptions) as ethers.BigNumber[];

        return _prices.map((_p) =>ethers.utils.formatUnits(_p)).reverse();
    }

    public async _userState(address = ""): Promise<{ _collateral: ethers.BigNumber, _stablecoin: ethers.BigNumber, _debt: ethers.BigNumber }> {
        address = _getAddress(address);
        const contract = crvusd.contracts[this.controller].contract;
        const [_collateral, _stablecoin, _debt] = await contract.user_state(address, crvusd.constantOptions) as ethers.BigNumber[];

        return { _collateral, _stablecoin, _debt }
    }

    public async userState(address = ""): Promise<{ collateral: string, stablecoin: string, debt: string }> {
        const { _collateral, _stablecoin, _debt } = await this._userState(address);

        return {
            collateral: ethers.utils.formatUnits(_collateral, this.collateralDecimals),
            stablecoin: ethers.utils.formatUnits(_stablecoin),
            debt: ethers.utils.formatUnits(_debt),
        };
    }

    public async userBandsBalances(address = ""): Promise<IDict<{ stablecoin: string, collateral: string }>> {
        const [n2, n1] = await this.userBands(address);
        if (n1 == 0 && n2 == 0) return {};

        address = _getAddress(address);
        const contract = crvusd.contracts[this.address].contract;
        const [_stablecoins, _collaterals] = await contract.get_xy(address, crvusd.constantOptions) as [ethers.BigNumber[], ethers.BigNumber[]];

        const res: IDict<{ stablecoin: string, collateral: string }> = {};
        for (let i = n1; i <= n2; i++) {
            res[i] = {
                stablecoin: ethers.utils.formatUnits(_stablecoins[i - n1], 18),
                collateral: ethers.utils.formatUnits(_collaterals[i - n1], this.collateralDecimals),
            };
        }

        return res
    }

    public async oraclePrice(): Promise<string> {
        const _price = await crvusd.contracts[this.address].contract.price_oracle(crvusd.constantOptions) as ethers.BigNumber;
        return ethers.utils.formatUnits(_price);
    }

    public async oraclePriceBand(): Promise<number> {
        const oraclePriceBN = BN(await this.oraclePrice());
        const basePriceBN = BN(await this.basePrice());
        const A_BN = BN(this.A);
        const multiplier = oraclePriceBN.lte(basePriceBN) ? A_BN.minus(1).div(A_BN) : A_BN.div(A_BN.minus(1));
        const term = oraclePriceBN.lte(basePriceBN) ? 1 : -1;
        const compareFunc = oraclePriceBN.lte(basePriceBN) ?
            (oraclePriceBN: BigNumber, currentTickPriceBN: BigNumber) => oraclePriceBN.lte(currentTickPriceBN) :
            (oraclePriceBN: BigNumber, currentTickPriceBN: BigNumber) => oraclePriceBN.gt(currentTickPriceBN);

        let band = 0;
        let currentTickPriceBN = oraclePriceBN.lte(basePriceBN) ? basePriceBN.times(multiplier) : basePriceBN;
        while (compareFunc(oraclePriceBN, currentTickPriceBN)) {
            currentTickPriceBN = currentTickPriceBN.times(multiplier);
            band += term;
        }

        return band;
    }

    public async price(): Promise<string> {
        const _price = await crvusd.contracts[this.address].contract.get_p(crvusd.constantOptions) as ethers.BigNumber;
        return ethers.utils.formatUnits(_price);
    }

    public basePrice = memoize(async(): Promise<string> => {
        const _price = await crvusd.contracts[this.address].contract.get_base_price(crvusd.constantOptions) as ethers.BigNumber;
        return ethers.utils.formatUnits(_price);
    },
    {
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    public async calcTickPrice(n: number): Promise<string> {
        const basePrice = await this.basePrice();
        const basePriceBN = BN(basePrice);
        const A_BN = BN(this.A);

        return _cutZeros(basePriceBN.times(A_BN.minus(1).div(A_BN).pow(n)).toFixed(18))
    }

    public async calcBandPrices(n: number): Promise<[string, string]> {
        return [await this.calcTickPrice(n + 1), await this.calcTickPrice(n)]
    }

    public calcRangePct(range: number): string {
        /**
         * Calculates range in terms of price difference %
         * @param  {number} range Number of bands in range
         * @return {string}       Range in %
         */
        const A_BN = BN(this.A);
        const startBN = BN(1);
        const endBN = A_BN.minus(1).div(A_BN).pow(range);

        return startBN.minus(endBN).times(100).toString()
    }

    // ---------------- WALLET BALANCES ----------------

    private async walletBalances(address = ""): Promise<{ collateral: string, stablecoin: string }> {
        const [collateral, stablecoin] = await getBalances([this.collateral, crvusd.address], address);
        return { stablecoin, collateral }
    }

    // ---------------- CREATE LOAN ----------------

    private _checkRange(range: number): void {
        if (range < this.minBands) throw Error(`range must be >= ${this.minBands}`);
        if (range > this.maxBands) throw Error(`range must be <= ${this.maxBands}`);
    }

    public async createLoanMaxRecv(collateral: number | string, range: number): Promise<string> {
        this._checkRange(range);
        const _collateral = parseUnits(collateral, this.collateralDecimals);

        return ethers.utils.formatUnits(await crvusd.contracts[this.controller].contract.max_borrowable(_collateral, range, crvusd.constantOptions));
    }

    public createLoanMaxRecvAllRanges = memoize(async (collateral: number | string): Promise<{ [index: number]: string }> => {
        const _collateral = parseUnits(collateral, this.collateralDecimals);

        const calls = [];
        for (let N = this.minBands; N <= this.maxBands; N++) {
            calls.push(crvusd.contracts[this.controller].multicallContract.max_borrowable(_collateral, N));
        }
        const _amounts = await crvusd.multicallProvider.all(calls) as ethers.BigNumber[];

        const res: { [index: number]: string } = {};
        for (let N = this.minBands; N <= this.maxBands; N++) {
            res[N] = ethers.utils.formatUnits(_amounts[N - this.minBands]);
        }

        return res;
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

    public async getMaxRange(collateral: number | string, debt: number | string): Promise<number> {
        const maxRecv = await this.createLoanMaxRecvAllRanges(collateral);
        for (let N = this.minBands; N <= this.maxBands; N++) {
            if (BN(debt).gt(BN(maxRecv[N]))) return N - 1;
        }

        return this.maxBands;
    }

    private async _calcN1(_collateral: ethers.BigNumber, _debt: ethers.BigNumber, range: number): Promise<ethers.BigNumber> {
        this._checkRange(range);
        return await crvusd.contracts[this.controller].contract.calculate_debt_n1(_collateral, _debt, range, crvusd.constantOptions);
    }

    private async _calcN1AllRanges(_collateral: ethers.BigNumber, _debt: ethers.BigNumber, maxN: number): Promise<ethers.BigNumber[]> {
        const calls = [];
        for (let N = this.minBands; N <= maxN; N++) {
            calls.push(crvusd.contracts[this.controller].multicallContract.calculate_debt_n1(_collateral, _debt, N));
        }
        return await crvusd.multicallProvider.all(calls) as ethers.BigNumber[];
    }

    private async _getPrices(_n2: ethers.BigNumber, _n1: ethers.BigNumber): Promise<string[]> {
        const contract = crvusd.contracts[this.address].multicallContract;
        return (await crvusd.multicallProvider.all([
            contract.p_oracle_down(_n2),
            contract.p_oracle_up(_n1),
        ]) as ethers.BigNumber[]).map((_p) => ethers.utils.formatUnits(_p));
    }

    private async _calcPrices(_n2: ethers.BigNumber, _n1: ethers.BigNumber): Promise<[string, string]> {
        return [await this.calcTickPrice(_n2.toNumber() + 1), await this.calcTickPrice(_n1.toNumber())];
    }

    private async _createLoanBands(collateral: number | string, debt: number | string, range: number): Promise<[ethers.BigNumber, ethers.BigNumber]> {
        const _n1 = await this._calcN1(parseUnits(collateral, this.collateralDecimals), parseUnits(debt), range);
        const _n2 = _n1.add(ethers.BigNumber.from(range - 1));

        return [_n2, _n1];
    }

    private async _createLoanBandsAllRanges(collateral: number | string, debt: number | string): Promise<{ [index: number]: [ethers.BigNumber, ethers.BigNumber] }> {
        const maxN = await this.getMaxRange(collateral, debt);
        const _n1_arr = await this._calcN1AllRanges(parseUnits(collateral, this.collateralDecimals), parseUnits(debt), maxN);
        const _n2_arr: ethers.BigNumber[] = [];
        for (let N = this.minBands; N <= maxN; N++) {
            _n2_arr.push(_n1_arr[N - this.minBands].add(ethers.BigNumber.from(N - 1)));
        }

        const res: { [index: number]: [ethers.BigNumber, ethers.BigNumber] } = {};
        for (let N = this.minBands; N <= maxN; N++) {
            res[N] = [_n2_arr[N - this.minBands], _n1_arr[N - this.minBands]];
        }

        return res;
    }

    public async createLoanBands(collateral: number | string, debt: number | string, range: number): Promise<[number, number]> {
        const [_n2, _n1] = await this._createLoanBands(collateral, debt, range);

        return [_n2.toNumber(), _n1.toNumber()];
    }

    public async createLoanBandsAllRanges(collateral: number | string, debt: number | string): Promise<{ [index: number]: [number, number] | null }> {
        const _bandsAllRanges = await this._createLoanBandsAllRanges(collateral, debt);

        const bandsAllRanges: { [index: number]: [number, number] | null } = {};
        for (let N = this.minBands; N <= this.maxBands; N++) {
            if (_bandsAllRanges[N]) {
                bandsAllRanges[N] = _bandsAllRanges[N].map(Number) as [number, number];
            } else {
                bandsAllRanges[N] = null
            }
        }

        return bandsAllRanges;
    }

    public async createLoanPrices(collateral: number | string, debt: number | string, range: number): Promise<string[]> {
        const [_n2, _n1] = await this._createLoanBands(collateral, debt, range);

        return await this._getPrices(_n2, _n1);
    }

    public async createLoanPricesAllRanges(collateral: number | string, debt: number | string): Promise<{ [index: number]: [string, string] | null }> {
        const _bandsAllRanges = await this._createLoanBandsAllRanges(collateral, debt);

        const pricesAllRanges: { [index: number]: [string, string] | null } = {};
        for (let N = this.minBands; N <= this.maxBands; N++) {
            if (_bandsAllRanges[N]) {
                pricesAllRanges[N] = await this._calcPrices(..._bandsAllRanges[N]);
            } else {
                pricesAllRanges[N] = null
            }
        }

        return pricesAllRanges;
    }

    public async createLoanHealth(collateral: number | string, debt: number | string, range: number, full = true, address = ""): Promise<string> {
        address = _getAddress(address);
        const _collateral = parseUnits(collateral, this.collateralDecimals);
        const _debt = parseUnits(debt);

        const contract = crvusd.contracts[this.controller].contract;
        let _health = await contract.health_calculator(address, _collateral, _debt, full, range, crvusd.constantOptions) as ethers.BigNumber;
        _health = _health.mul(100);

        return ethers.utils.formatUnits(_health);
    }


    private async _monetaryPolicyRate(): Promise<string> {
        const contract = crvusd.contracts[crvusd.monetary_policy].contract;
        const _rate = await contract.rate(crvusd.constantOptions) as ethers.BigNumber;
        // (1+rate)**(365*86400)-1 ~= (e**(rate*365*86400))-1
        return String(((2.718281828459 ** (toBN(_rate).times(365).times(86400)).toNumber()) - 1) * 100);
    }

    public async createLoanIsApproved(collateral: number | string): Promise<boolean> {
        return await hasAllowance([this.collateral], [collateral], crvusd.signerAddress, this.controller);
    }

    private async createLoanApproveEstimateGas (collateral: number | string): Promise<number> {
        return await ensureAllowanceEstimateGas([this.collateral], [collateral], this.controller);
    }

    public async createLoanApprove(collateral: number | string): Promise<string[]> {
        return await ensureAllowance([this.collateral], [collateral], this.controller);
    }

    private async _createLoan(collateral: number | string, debt: number | string, range: number, estimateGas: boolean): Promise<string | number> {
        if (await this.loanExists()) throw Error("Loan already created");
        this._checkRange(range);

        const _collateral = parseUnits(collateral, this.collateralDecimals);
        const _debt = parseUnits(debt);
        const contract = crvusd.contracts[this.controller].contract;
        const gas = await contract.estimateGas.create_loan(_collateral, _debt, range, crvusd.constantOptions);
        if (estimateGas) return gas.toNumber();

        await crvusd.updateFeeData();
        const gasLimit = gas.mul(130).div(100);
        return (await contract.create_loan(_collateral, _debt, range, { ...crvusd.options, gasLimit })).hash
    }

    public async createLoanEstimateGas(collateral: number | string, debt: number | string, range: number): Promise<number> {
        if (!(await this.createLoanIsApproved(collateral))) throw Error("Approval is needed for gas estimation");
        return await this._createLoan(collateral, debt,  range, true) as number;
    }

    public async createLoan(collateral: number | string, debt: number | string, range: number): Promise<string> {
        await this.createLoanApprove(collateral);
        return await this._createLoan(collateral, debt, range, false) as string;
    }

    // ---------------- BORROW MORE ----------------

    public async borrowMoreMaxRecv(collateralAmount: number | string): Promise<string> {
        const { _collateral: _currentCollateral, _debt: _currentDebt } = await this._userState();
        const N = await this.userRange();
        const _collateral = _currentCollateral.add(parseUnits(collateralAmount, this.collateralDecimals));

        const contract = crvusd.contracts[this.controller].contract;
        const _debt: ethers.BigNumber = await contract.max_borrowable(_collateral, N, crvusd.constantOptions);

        return ethers.utils.formatUnits(_debt.sub(_currentDebt));
    }

    private async _borrowMoreBands(collateral: number | string, debt: number | string): Promise<[ethers.BigNumber, ethers.BigNumber]> {
        const { _collateral: _currentCollateral, _debt: _currentDebt } = await this._userState();
        if (_currentDebt.eq(0)) throw Error(`Loan for ${crvusd.signerAddress} does not exist`);

        const N = await this.userRange();
        const _collateral = _currentCollateral.add(parseUnits(collateral, this.collateralDecimals));
        const _debt = _currentDebt.add(parseUnits(debt, this.collateralDecimals));

        const _n1 = await this._calcN1(_collateral, _debt, N);
        const _n2 = _n1.add(N - 1);

        return [_n2, _n1];
    }

    public async borrowMoreBands(collateral: number | string, debt: number | string): Promise<[number, number]> {
        const [_n2, _n1] = await this._borrowMoreBands(collateral, debt);

        return [_n2.toNumber(), _n1.toNumber()];
    }

    public async borrowMorePrices(collateral: number | string, debt: number | string): Promise<string[]> {
        const [_n2, _n1] = await this._borrowMoreBands(collateral, debt);

        return await this._getPrices(_n2, _n1);
    }

    public async borrowMoreHealth(collateral: number | string, debt: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress(address);
        const _collateral = parseUnits(collateral, this.collateralDecimals);
        const _debt = parseUnits(debt);

        const contract = crvusd.contracts[this.controller].contract;
        let _health = await contract.health_calculator(address, _collateral, _debt, full, 0, crvusd.constantOptions) as ethers.BigNumber;
        _health = _health.mul(100);

        return ethers.utils.formatUnits(_health);
    }

    public async borrowMoreIsApproved(collateral: number | string): Promise<boolean> {
        return await hasAllowance([this.collateral], [collateral], crvusd.signerAddress, this.controller);
    }

    private async borrowMoreApproveEstimateGas (collateral: number | string): Promise<number> {
        return await ensureAllowanceEstimateGas([this.collateral], [collateral], this.controller);
    }

    public async borrowMoreApprove(collateral: number | string): Promise<string[]> {
        return await ensureAllowance([this.collateral], [collateral], this.controller);
    }

    private async _borrowMore(collateral: number | string, debt: number | string, estimateGas: boolean): Promise<string | number> {
        const { stablecoin, debt: currentDebt } = await this.userState();
        if (Number(currentDebt) === 0) throw Error(`Loan for ${crvusd.signerAddress} does not exist`);
        if (Number(stablecoin) > 0) throw Error(`User ${crvusd.signerAddress} is already in liquidation mode`);

        const _collateral = parseUnits(collateral, this.collateralDecimals);
        const _debt = parseUnits(debt);
        const contract = crvusd.contracts[this.controller].contract;
        const gas = await contract.estimateGas.borrow_more(_collateral, _debt, crvusd.constantOptions);
        if (estimateGas) return gas.toNumber();

        await crvusd.updateFeeData();
        const gasLimit = gas.mul(130).div(100);
        return (await contract.borrow_more(_collateral, _debt, { ...crvusd.options, gasLimit })).hash
    }

    public async borrowMoreEstimateGas(collateral: number | string, debt: number | string): Promise<number> {
        if (!(await this.borrowMoreIsApproved(collateral))) throw Error("Approval is needed for gas estimation");
        return await this._borrowMore(collateral, debt, true) as number;
    }

    public async borrowMore(collateral: number | string, debt: number | string): Promise<string> {
        await this.borrowMoreApprove(collateral);
        return await this._borrowMore(collateral, debt, false) as string;
    }

    // ---------------- ADD COLLATERAL ----------------

    private async _addCollateralBands(collateral: number | string, address = ""): Promise<[ethers.BigNumber, ethers.BigNumber]> {
        address = _getAddress(address);
        const { _collateral: _currentCollateral, _debt: _currentDebt } = await this._userState(address);
        if (_currentDebt.eq(0)) throw Error(`Loan for ${address} does not exist`);

        const N = await this.userRange(address);
        const _collateral = _currentCollateral.add(parseUnits(collateral, this.collateralDecimals));
        const _n1 = await this._calcN1(_collateral, _currentDebt, N);
        const _n2 = _n1.add(N - 1);

        return [_n2, _n1];
    }

    public async addCollateralBands(collateral: number | string, address = ""): Promise<[number, number]> {
        const [_n2, _n1] = await this._addCollateralBands(collateral, address);

        return [_n2.toNumber(), _n1.toNumber()];
    }

    public async addCollateralPrices(collateral: number | string, address = ""): Promise<string[]> {
        const [_n2, _n1] = await this._addCollateralBands(collateral, address);

        return await this._getPrices(_n2, _n1);
    }

    public async addCollateralHealth(collateral: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress(address);
        const _collateral = parseUnits(collateral, this.collateralDecimals);

        const contract = crvusd.contracts[this.controller].contract;
        let _health = await contract.health_calculator(address, _collateral, 0, full, 0, crvusd.constantOptions) as ethers.BigNumber;
        _health = _health.mul(100);

        return ethers.utils.formatUnits(_health);
    }

    public async addCollateralIsApproved(collateral: number | string): Promise<boolean> {
        return await hasAllowance([this.collateral], [collateral], crvusd.signerAddress, this.controller);
    }

    private async addCollateralApproveEstimateGas (collateral: number | string): Promise<number> {
        return await ensureAllowanceEstimateGas([this.collateral], [collateral], this.controller);
    }

    public async addCollateralApprove(collateral: number | string): Promise<string[]> {
        return await ensureAllowance([this.collateral], [collateral], this.controller);
    }

    private async _addCollateral(collateral: number | string, address: string, estimateGas: boolean): Promise<string | number> {
        const { stablecoin, debt: currentDebt } = await this.userState(address);
        if (Number(currentDebt) === 0) throw Error(`Loan for ${address} does not exist`);
        if (Number(stablecoin) > 0) throw Error(`User ${address} is already in liquidation mode`);

        const _collateral = parseUnits(collateral, this.collateralDecimals);
        const contract = crvusd.contracts[this.controller].contract;
        const gas = await contract.estimateGas.add_collateral(_collateral, address, crvusd.constantOptions);
        if (estimateGas) return gas.toNumber();

        await crvusd.updateFeeData();
        const gasLimit = gas.mul(130).div(100);
        return (await contract.add_collateral(_collateral, address, { ...crvusd.options, gasLimit })).hash
    }

    public async addCollateralEstimateGas(collateral: number | string, address = ""): Promise<number> {
        address = _getAddress(address);
        if (!(await this.addCollateralIsApproved(collateral))) throw Error("Approval is needed for gas estimation");
        return await this._addCollateral(collateral, address, true) as number;
    }

    public async addCollateral(collateral: number | string, address = ""): Promise<string> {
        address = _getAddress(address);
        await this.addCollateralApprove(collateral);
        return await this._addCollateral(collateral, address, false) as string;
    }

    // ---------------- REMOVE COLLATERAL ----------------

    public async maxRemovable(): Promise<string> {
        const { _collateral: _currentCollateral, _debt: _currentDebt } = await this._userState();
        const N = await this.userRange();
        const _requiredCollateral = await crvusd.contracts[this.controller].contract.min_collateral(_currentDebt, N, crvusd.constantOptions)

        return ethers.utils.formatUnits(_currentCollateral.sub(_requiredCollateral), this.collateralDecimals);
    }

    private async _removeCollateralBands(collateral: number | string): Promise<[ethers.BigNumber, ethers.BigNumber]> {
        const { _collateral: _currentCollateral, _debt: _currentDebt } = await this._userState();
        if (_currentDebt.eq(0)) throw Error(`Loan for ${crvusd.signerAddress} does not exist`);

        const N = await this.userRange();
        const _collateral = _currentCollateral.sub(parseUnits(collateral, this.collateralDecimals));
        const _n1 = await this._calcN1(_collateral, _currentDebt, N);
        const _n2 = _n1.add(N - 1);

        return [_n2, _n1];
    }

    public async removeCollateralBands(collateral: number | string): Promise<[number, number]> {
        const [_n2, _n1] = await this._removeCollateralBands(collateral);

        return [_n2.toNumber(), _n1.toNumber()];
    }

    public async removeCollateralPrices(collateral: number | string): Promise<string[]> {
        const [_n2, _n1] = await this._removeCollateralBands(collateral);

        return await this._getPrices(_n2, _n1);
    }

    public async removeCollateralHealth(collateral: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress(address);
        const _collateral = parseUnits(collateral, this.collateralDecimals).mul(-1);

        const contract = crvusd.contracts[this.controller].contract;
        let _health = await contract.health_calculator(address, _collateral, 0, full, 0, crvusd.constantOptions) as ethers.BigNumber;
        _health = _health.mul(100);

        return ethers.utils.formatUnits(_health);
    }

    private async _removeCollateral(collateral: number | string, estimateGas: boolean): Promise<string | number> {
        const { stablecoin, debt: currentDebt } = await this.userState();
        if (Number(currentDebt) === 0) throw Error(`Loan for ${crvusd.signerAddress} does not exist`);
        if (Number(stablecoin) > 0) throw Error(`User ${crvusd.signerAddress} is already in liquidation mode`);

        const _collateral = parseUnits(collateral, this.collateralDecimals);
        const contract = crvusd.contracts[this.controller].contract;
        const gas = await contract.estimateGas.remove_collateral(_collateral, false, crvusd.constantOptions);
        if (estimateGas) return gas.toNumber();

        await crvusd.updateFeeData();
        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_collateral(_collateral, false, { ...crvusd.options, gasLimit })).hash
    }

    public async removeCollateralEstimateGas(collateral: number | string): Promise<number> {
        return await this._removeCollateral(collateral, true) as number;
    }

    public async removeCollateral(collateral: number | string): Promise<string> {
        return await this._removeCollateral(collateral, false) as string;
    }

    // ---------------- REPAY ----------------

    private async _repayBands(debt: number | string, address: string): Promise<[ethers.BigNumber, ethers.BigNumber]> {
        const { _collateral: _currentCollateral, _debt: _currentDebt } = await this._userState(address);
        if (_currentDebt.eq(0)) throw Error(`Loan for ${address} does not exist`);

        const N = await this.userRange(address);
        const _debt = _currentDebt.sub(parseUnits(debt, this.collateralDecimals));
        const _n1 = await this._calcN1(_currentCollateral, _debt, N);
        const _n2 = _n1.add(N - 1);

        return [_n2, _n1];
    }

    public async repayBands(debt: number | string, address = ""): Promise<[number, number]> {
        const [_n2, _n1] = await this._repayBands(debt, address);

        return [_n2.toNumber(), _n1.toNumber()];
    }

    public async repayPrices(debt: number | string, address = ""): Promise<string[]> {
        const [_n2, _n1] = await this._repayBands(debt, address);

        return await this._getPrices(_n2, _n1);
    }

    public async repayIsApproved(debt: number | string): Promise<boolean> {
        return await hasAllowance([crvusd.address], [debt], crvusd.signerAddress, this.controller);
    }

    private async repayApproveEstimateGas (debt: number | string): Promise<number> {
        return await ensureAllowanceEstimateGas([crvusd.address], [debt], this.controller);
    }

    public async repayApprove(debt: number | string): Promise<string[]> {
        return await ensureAllowance([crvusd.address], [debt], this.controller);
    }

    public async repayHealth(debt: number | string, full = true, address = ""): Promise<string> {
        address = _getAddress(address);
        const _debt = parseUnits(debt).mul(-1);

        const contract = crvusd.contracts[this.controller].contract;
        let _health = await contract.health_calculator(address, 0, _debt, full, 0, crvusd.constantOptions) as ethers.BigNumber;
        _health = _health.mul(100);

        return ethers.utils.formatUnits(_health);
    }

    private async _repay(debt: number | string, address: string, estimateGas: boolean): Promise<string | number> {
        address = _getAddress(address);
        const { debt: currentDebt } = await this.userState(address);
        if (Number(currentDebt) === 0) throw Error(`Loan for ${address} does not exist`);

        const _debt = parseUnits(debt);
        const contract = crvusd.contracts[this.controller].contract;
        const [_, n1] = await this.userBands(address);
        const { stablecoin } = await this.userState(address);
        const n = (BN(stablecoin).gt(0)) ? MAX_ACTIVE_BAND : n1 - 1;  // In liquidation mode it doesn't matter if active band moves
        const gas = await contract.estimateGas.repay(_debt, address, n, false, crvusd.constantOptions);
        if (estimateGas) return gas.toNumber();

        await crvusd.updateFeeData();
        const gasLimit = gas.mul(130).div(100);
        return (await contract.repay(_debt, address, n, false, { ...crvusd.options, gasLimit })).hash
    }

    public async repayEstimateGas(debt: number | string, address = ""): Promise<number> {
        if (!(await this.repayIsApproved(debt))) throw Error("Approval is needed for gas estimation");
        return await this._repay(debt, address, true) as number;
    }

    public async repay(debt: number | string, address = ""): Promise<string> {
        await this.repayApprove(debt);
        return await this._repay(debt, address, false) as string;
    }

    // ---------------- FULL REPAY ----------------

    private async _fullRepayAmount(address = ""): Promise<string> {
        address = _getAddress(address);
        const debt = await this.userDebt(address);
        return BN(debt).times(1.0001).toString();
    }

    public async fullRepayIsApproved(address = ""): Promise<boolean> {
        address = _getAddress(address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        return await this.repayIsApproved(fullRepayAmount);
    }

    private async fullRepayApproveEstimateGas (address = ""): Promise<number> {
        address = _getAddress(address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        return await this.repayApproveEstimateGas(fullRepayAmount);
    }

    public async fullRepayApprove(address = ""): Promise<string[]> {
        address = _getAddress(address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        return await this.repayApprove(fullRepayAmount);
    }

    public async fullRepayEstimateGas(address = ""): Promise<number> {
        address = _getAddress(address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        if (!(await this.repayIsApproved(fullRepayAmount))) throw Error("Approval is needed for gas estimation");
        return await this._repay(fullRepayAmount, address, true) as number;
    }

    public async fullRepay(address = ""): Promise<string> {
        address = _getAddress(address);
        const fullRepayAmount = await this._fullRepayAmount(address);
        await this.repayApprove(fullRepayAmount);
        return await this._repay(fullRepayAmount, address, false) as string;
    }

    // ---------------- SWAP ----------------

    public async maxSwappable(i: number, j: number): Promise<string> {
        if (!(i === 0 && j === 1) && !(i === 1 && j === 0)) throw Error("Wrong index");
        const inDecimals = this.coinDecimals[i];
        const contract = crvusd.contracts[this.address].contract;
        const [_inAmount, _outAmount] = await contract.get_dxdy(i, j, MAX_ALLOWANCE, crvusd.constantOptions) as ethers.BigNumber[];
        if (_outAmount.eq(0)) return "0";

        return ethers.utils.formatUnits(_inAmount, inDecimals)
    }

    private async _swapExpected(i: number, j: number, _amount: ethers.BigNumber): Promise<ethers.BigNumber> {
        return await crvusd.contracts[this.address].contract.get_dy(i, j, _amount, crvusd.constantOptions) as ethers.BigNumber;
    }

    public async swapExpected(i: number, j: number, amount: number | string): Promise<string> {
        if (!(i === 0 && j === 1) && !(i === 1 && j === 0)) throw Error("Wrong index");
        const [inDecimals, outDecimals] = this.coinDecimals;
        const _amount = parseUnits(amount, inDecimals);
        const _expected = await this._swapExpected(i, j, _amount);

        return ethers.utils.formatUnits(_expected, outDecimals)
    }

    public async swapRequired(i: number, j: number, outAmount: number | string): Promise<string> {
        if (!(i === 0 && j === 1) && !(i === 1 && j === 0)) throw Error("Wrong index");
        const [inDecimals, outDecimals] = this.coinDecimals;
        const _amount = parseUnits(outAmount, outDecimals);
        const _expected = await crvusd.contracts[this.address].contract.get_dx(i, j, _amount, crvusd.constantOptions) as ethers.BigNumber;

        return ethers.utils.formatUnits(_expected, inDecimals)
    }

    public async swapPriceImpact(i: number, j: number, amount: number | string): Promise<string> {
        if (!(i === 0 && j === 1) && !(i === 1 && j === 0)) throw Error("Wrong index");
        const [inDecimals, outDecimals] = this.coinDecimals;
        const _amount = parseUnits(amount, inDecimals);
        const _output = await this._swapExpected(i, j, _amount);

        // Find k for which x * k = 10^15 or y * k = 10^15: k = max(10^15 / x, 10^15 / y)
        // For coins with d (decimals) <= 15: k = min(k, 0.2), and x0 = min(x * k, 10^d)
        // x0 = min(x * min(max(10^15 / x, 10^15 / y), 0.2), 10^d), if x0 == 0 then priceImpact = 0
        const target = BN(10 ** 15);
        const amountIntBN = BN(amount).times(10 ** inDecimals);
        const outputIntBN = toBN(_output, 0);
        const k = BigNumber.min(BigNumber.max(target.div(amountIntBN), target.div(outputIntBN)), 0.2);
        const smallAmountIntBN = BigNumber.min(amountIntBN.times(k), BN(10 ** inDecimals));
        if (smallAmountIntBN.toFixed(0) === '0') return '0';

        const _smallAmount = fromBN(smallAmountIntBN.div(10 ** inDecimals), inDecimals);
        const _smallOutput = await this._swapExpected(i, j, _smallAmount);

        const amountBN = BN(amount);
        const outputBN = toBN(_output, outDecimals);
        const smallAmountBN = toBN(_smallAmount, inDecimals);
        const smallOutputBN = toBN(_smallOutput, outDecimals);

        const rateBN = outputBN.div(amountBN);
        const smallRateBN = smallOutputBN.div(smallAmountBN);
        if (rateBN.gt(smallRateBN)) return "0";

        const slippageBN = BN(1).minus(rateBN.div(smallRateBN)).times(100);

        return _cutZeros(slippageBN.toFixed(6));
    }

    public async swapIsApproved(i: number, amount: number | string): Promise<boolean> {
        if (i !== 0 && i !== 1) throw Error("Wrong index");

        return await hasAllowance([this.coinAddresses[i]], [amount], crvusd.signerAddress, this.address);
    }

    private async swapApproveEstimateGas (i: number, amount: number | string): Promise<number> {
        if (i !== 0 && i !== 1) throw Error("Wrong index");

        return await ensureAllowanceEstimateGas([this.coinAddresses[i]], [amount], this.address);
    }

    public async swapApprove(i: number, amount: number | string): Promise<string[]> {
        if (i !== 0 && i !== 1) throw Error("Wrong index");

        return await ensureAllowance([this.coinAddresses[i]], [amount], this.address);
    }

    private async _swap(i: number, j: number, amount: number | string, slippage: number, estimateGas: boolean): Promise<string | number> {
        if (!(i === 0 && j === 1) && !(i === 1 && j === 0)) throw Error("Wrong index");

        const inCoinAddress = this.coinAddresses[i];
        const [inDecimals, outDecimals] = [this.coinDecimals[i], this.coinDecimals[j]];
        const _amount = parseUnits(amount, inDecimals);
        const _expected = await this._swapExpected(i, j, _amount);
        const minRecvAmountBN: BigNumber = toBN(_expected, outDecimals).times(100 - slippage).div(100);
        const _minRecvAmount = fromBN(minRecvAmountBN);
        const value = isEth(inCoinAddress) ? _amount : ethers.BigNumber.from(0);
        const contract = crvusd.contracts[this.address].contract;
        const gas = await contract.estimateGas.exchange(i, j, _amount, _minRecvAmount, { ...crvusd.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        await crvusd.updateFeeData();
        const gasLimit = gas.mul(130).div(100);
        return (await contract.exchange(i, j, _amount, _minRecvAmount, { ...crvusd.options, value, gasLimit })).hash
    }

    public async swapEstimateGas(i: number, j: number, amount: number | string, slippage = 0.5): Promise<number> {
        if (!(await this.swapIsApproved(i, amount))) throw Error("Approval is needed for gas estimation");
        return await this._swap(i, j, amount, slippage, true) as number;
    }

    public async swap(i: number, j: number, amount: number | string, slippage = 0.5): Promise<string> {
        await this.swapApprove(i, amount);
        return await this._swap(i, j, amount, slippage, false) as string;
    }

    // ---------------- LIQUIDATE ----------------

    public async tokensToLiquidate(address = ""): Promise<string> {
        address = _getAddress(address);
        const _tokens = await crvusd.contracts[this.controller].contract.tokens_to_liquidate(address, crvusd.constantOptions) as ethers.BigNumber;

        return ethers.utils.formatUnits(_tokens)
    }

    public async liquidateIsApproved(address = ""): Promise<boolean> {
        const tokensToLiquidate = await this.tokensToLiquidate(address);
        return await hasAllowance([crvusd.address], [tokensToLiquidate], crvusd.signerAddress, this.controller);
    }

    private async liquidateApproveEstimateGas (address = ""): Promise<number> {
        const tokensToLiquidate = await this.tokensToLiquidate(address);
        return await ensureAllowanceEstimateGas([crvusd.address], [tokensToLiquidate], this.controller);
    }

    public async liquidateApprove(address = ""): Promise<string[]> {
        const tokensToLiquidate = await this.tokensToLiquidate(address);
        return await ensureAllowance([crvusd.address], [tokensToLiquidate], this.controller);
    }

    private async _liquidate(address: string, slippage: number, estimateGas: boolean): Promise<string | number> {
        const { stablecoin, debt: currentDebt } = await this.userState(address);
        if (slippage <= 0) throw Error("Slippage must be > 0");
        if (slippage > 100) throw Error("Slippage must be <= 100");
        if (Number(currentDebt) === 0) throw Error(`Loan for ${address} does not exist`);
        if (Number(stablecoin) === 0) throw Error(`User ${address} is not in liquidation mode`);

        const minAmountBN: BigNumber = BN(stablecoin).times(100 - slippage).div(100);
        const _minAmount = fromBN(minAmountBN);
        const contract = crvusd.contracts[this.controller].contract;
        const gas = (await contract.estimateGas.liquidate(address, _minAmount, false, crvusd.constantOptions))
        if (estimateGas) return gas.toNumber();

        await crvusd.updateFeeData();
        const gasLimit = gas.mul(130).div(100);
        return (await contract.liquidate(address, _minAmount, false, { ...crvusd.options, gasLimit })).hash
    }

    public async liquidateEstimateGas(address: string, slippage = 0.5): Promise<number> {
        if (!(await this.liquidateIsApproved(address))) throw Error("Approval is needed for gas estimation");
        return await this._liquidate(address, slippage, true) as number;
    }

    public async liquidate(address: string, slippage = 0.5): Promise<string> {
        await this.liquidateApprove(address);
        return await this._liquidate(address, slippage, false) as string;
    }

    // ---------------- SELF-LIQUIDATE ----------------

    public async selfLiquidateIsApproved(): Promise<boolean> {
        return await this.liquidateIsApproved()
    }

    private async selfLiquidateApproveEstimateGas (): Promise<number> {
        return this.liquidateApproveEstimateGas()
    }

    public async selfLiquidateApprove(): Promise<string[]> {
        return await this.liquidateApprove()
    }

    public async selfLiquidateEstimateGas(slippage = 0.5): Promise<number> {
        if (!(await this.selfLiquidateIsApproved())) throw Error("Approval is needed for gas estimation");
        return await this._liquidate(crvusd.signerAddress, slippage, true) as number;
    }

    public async selfLiquidate(slippage = 0.5): Promise<string> {
        await this.selfLiquidateApprove();
        return await this._liquidate(crvusd.signerAddress, slippage, false) as string;
    }
}
