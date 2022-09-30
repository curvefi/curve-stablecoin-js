import { ethers } from "ethers";
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
} from "../utils";


export class LlammaTemplate {
    id: string;
    address: string;
    controller: string;
    collateral: string;
    collateralDecimals: number;
    coinAddresses: string[];
    coinDecimals: number[];
    minTicks: number;
    maxTicks: number;
    estimateGas: {
        createLoanApprove: (collateral: number | string) => Promise<number>,
        createLoan: (collateral: number | string, debt: number | string,  N: number) => Promise<number>,
        addCollateralApprove: (collateral: number | string) => Promise<number>,
        addCollateral: (collateral: number | string, address?: string) => Promise<number>,
        borrowMoreApprove: (collateral: number | string) => Promise<number>,
        borrowMore: (collateral: number | string, debt: number | string) => Promise<number>,
        repayApprove: (debt: number | string) => Promise<number>,
        repay: (debt: number | string, address?: string) => Promise<number>,
        swapApprove: (i: number, amount: number | string) => Promise<number>,
        swap: (i: number, j: number, amount: number | string, slippage?: number) => Promise<number>,
        liquidateApprove: (address: string) => Promise<number>,
        liquidate: (address: string, slippage?: number) => Promise<number>,
        selfLiquidateApprove: () => Promise<number>,
        selfLiquidate: (slippage?: number) => Promise<number>,
    };
    stats: {
        parameters: () => Promise<{
            A: string,
            fee: string, // %
            admin_fee: string, // %
            rate: string, // %
            min_band: string,
            max_band: string,
            active_band: string,
            minted: string,
            redeemed: string,
            liquidation_discount: string, // %
            loan_discount: string, // %
        }>,
        balances: () => Promise<[string, string]>,
        bandsBalances: () => Promise<{ [index: number]: { stablecoin: string, collateral: string } }>,
        totalDebt: () => Promise<string>,
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
        this.collateralDecimals = llammaData.collateral_decimals;
        this.coinAddresses = [crvusd.address, llammaData.collateral_address];
        this.coinDecimals = [18, llammaData.collateral_decimals];
        this.minTicks = llammaData.min_ticks;
        this.maxTicks = llammaData.max_ticks;
        this.estimateGas = {
            createLoanApprove: this.createLoanApproveEstimateGas.bind(this),
            createLoan: this.createLoanEstimateGas.bind(this),
            addCollateralApprove: this.addCollateralApproveEstimateGas.bind(this),
            addCollateral: this.addCollateralEstimateGas.bind(this),
            borrowMoreApprove: this.borrowMoreApproveEstimateGas.bind(this),
            borrowMore: this.borrowMoreEstimateGas.bind(this),
            repayApprove: this.repayApproveEstimateGas.bind(this),
            repay: this.repayEstimateGas.bind(this),
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
            bandsBalances: this.statsBandsBalances.bind(this),
            totalDebt: this.statsTotalDebt.bind(this),
        }
        this.wallet = {
            balances: this.walletBalances.bind(this),
        }
    }

    // ---------------- STATS ----------------

    private statsParameters = async (): Promise<{
        A: string,
        fee: string, // %
        admin_fee: string, // %
        rate: string, // %
        min_band: string,
        max_band: string,
        active_band: string,
        minted: string,
        redeemed: string,
        liquidation_discount: string, // %
        loan_discount: string, // %
    }> => {
        const llammaContract = crvusd.contracts[this.address].contract;
        const controllerContract = crvusd.contracts[this.controller].contract;

        const calls = [
            llammaContract.A(),
            llammaContract.fee(),
            llammaContract.admin_fee(),
            llammaContract.rate(),
            llammaContract.min_band(),
            llammaContract.max_band(),
            llammaContract.active_band(),
            controllerContract.minted(),
            controllerContract.redeemed(),
            controllerContract.liquidation_discount(),
            controllerContract.loan_discount(),
        ]

        const [_A, _fee, _admin_fee, _rate, _min_band, _max_band, _active_band,
            _minted, _redeemed, _liquidation_discount, _loan_discount]: ethers.BigNumber[] = await Promise.all(calls);

        // TODO switch to multicall
        // const llammaContract = crvusd.contracts[this.address].multicallContract;
        // const controllerContract = crvusd.contracts[this.controller].multicallContract;

        // const calls = [
        //     llammaContract.A(),
        //     llammaContract.fee(),
        //     llammaContract.admin_fee(),
        //     llammaContract.rate(),
        //     llammaContract.min_band(),
        //     llammaContract.max_band(),
        //     llammaContract.active_band(),
        //     controllerContract.minted(),
        //     controllerContract.redeemed(),
        //     controllerContract.liquidation_discount(),
        //     controllerContract.loan_discount(),
        // ]

        // const [_A, _fee, _admin_fee, _rate, _min_band, _max_band,
        //     _active_band, _minted, _redeemed, _liquidation_discount, _loan_discount]: ethers.BigNumber[] = await crvusd.multicallProvider.all(calls);

        return {
            A: ethers.utils.formatUnits(_A, 0),
            fee: ethers.utils.formatUnits(_fee.mul(100)),
            admin_fee: ethers.utils.formatUnits(_admin_fee.mul(100)),
            rate: ethers.utils.formatUnits(_rate.mul(100)),
            min_band: ethers.utils.formatUnits(_min_band, 0),
            max_band: ethers.utils.formatUnits(_max_band, 0),
            active_band: ethers.utils.formatUnits(_active_band, 0),
            minted: ethers.utils.formatUnits(_minted),
            redeemed: ethers.utils.formatUnits(_redeemed),
            liquidation_discount: ethers.utils.formatUnits(_liquidation_discount.mul(100)),
            loan_discount: ethers.utils.formatUnits(_loan_discount.mul(100)),
        }
    }

    private async statsBalances(): Promise<[string, string]> {
        const crvusdContract = crvusd.contracts[crvusd.address].contract;
        const collateralContract = crvusd.contracts[this.collateral].contract;
        const contract = crvusd.contracts[this.address].contract;
        const calls = [
            crvusdContract.balanceOf(this.address, crvusd.constantOptions),
            collateralContract.balanceOf(this.address, crvusd.constantOptions),
            contract.admin_fees_x(crvusd.constantOptions),
            contract.admin_fees_y(crvusd.constantOptions),
        ]
        const [_crvusdBalance, _collateralBalance, _crvusdAdminFees, _collateralAdminFees] = await Promise.all(calls);

        // TODO switch to multicall
        // const crvusdContract = crvusd.contracts[crvusd.address].multicallContract;
        // const collateralContract = crvusd.contracts[this.collateral].multicallContract;
        // const contract = crvusd.contracts[this.address].multicallContract;
        // const calls = [
        //     crvusdContract.balanceOf(this.address),
        //     collateralContract.balanceOf(this.address),
        //     contract.admin_fees_x(),
        //     contract.admin_fees_y(),
        // ]
        // const [_crvusdBalance, _collateralBalance, _crvusdAdminFees, _collateralAdminFees] = await crvusd.multicallProvider.all(calls);

        return [
            ethers.utils.formatUnits(_crvusdBalance.sub(_crvusdAdminFees)),
            ethers.utils.formatUnits(_collateralBalance.sub(_collateralAdminFees), this.collateralDecimals),
        ];
    }

    private async statsBandsBalances(): Promise<{ [index: number]: { stablecoin: string, collateral: string } }> {
        const llammaContract = crvusd.contracts[this.address].contract;

        const calls1 = [
            llammaContract.min_band(crvusd.constantOptions),
            llammaContract.max_band(crvusd.constantOptions),
        ]

        const [min_band, max_band]: number[] = (await Promise.all(calls1)).map((_b: ethers.BigNumber) => _b.toNumber());

        // TODO switch to multicall
        // const llammaContract = crvusd.contracts[this.address].multicallContract;

        // const calls1 = [
        //     llammaContract.min_band(),
        //     llammaContract.max_band(),
        // ]

        // const [min_band, max_band]: number = (await crvusd.multicallProvider.all(calls1)).map((_b: ethers.BigNumber) => _b.toNumber());

        const calls2 = [];
        for (let i = min_band; i <= max_band; i++) {
            calls2.push(llammaContract.bands_x(i, crvusd.constantOptions), llammaContract.bands_y(i, crvusd.constantOptions));
        }

        const _bands: ethers.BigNumber[] = await Promise.all(calls2);

        // TODO switch to multicall
        // const calls2 = [];
        // for (let i = min_band; i <= max_band; i++) {
        //     calls2.push(llammaContract.bands_x(i), llammaContract.bands_y(i));
        // }
        //
        // const _bands = await crvusd.multicallProvider.all(calls2);

        const bands: { [index: number]: { stablecoin: string, collateral: string } } = {};
        for (let i = 0; i < max_band - min_band + 1; i++) {
            bands[i] = {
                stablecoin: ethers.utils.formatUnits(_bands[2 * i]),
                collateral: ethers.utils.formatUnits(_bands[2 * i + 1], this.collateralDecimals),
            }
        }

        return bands
    }

    private async statsTotalDebt(): Promise<string> {
        const debt = await crvusd.contracts[this.controller].contract.total_debt(crvusd.constantOptions);

        return ethers.utils.formatUnits(debt);
    }

    // ---------------------------------------

    public async debt(address = ""): Promise<string> {
        address = _getAddress(address);
        const debt = await crvusd.contracts[this.controller].contract.debt(address, crvusd.constantOptions);

        return ethers.utils.formatUnits(debt);
    }

    public async loanExists(address = ""): Promise<string> {
        address = _getAddress(address);
        return  await crvusd.contracts[this.controller].contract.loan_exists(address, crvusd.constantOptions);
    }

    public async health(address = "", full = false): Promise<string> {
        address = _getAddress(address);
        let _health = await crvusd.contracts[this.controller].contract.health(address, crvusd.constantOptions) as ethers.BigNumber;
        _health = _health.mul(100);

        return ethers.utils.formatUnits(_health);
    }

    public async userTicks(address = ""): Promise<number[]> {
        address = _getAddress(address);
        const _ticks = await crvusd.contracts[this.address].contract.read_user_tick_numbers(address, crvusd.constantOptions) as ethers.BigNumber[];

        return _ticks.map((_t) => _t.toNumber());
    }

    public async userPrices(address = ""): Promise<string[]> {
        address = _getAddress(address);
        const _prices = await crvusd.contracts[this.controller].contract.user_prices(address, crvusd.constantOptions) as ethers.BigNumber[];

        return _prices.map((_p) =>ethers.utils.formatUnits(_p));
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

    public async oraclePrice(): Promise<string> {
        const _price = await crvusd.contracts[this.address].contract.price_oracle(crvusd.constantOptions) as ethers.BigNumber;
        return ethers.utils.formatUnits(_price);
    }

    public async basePrice(): Promise<string> {
        const _price = await crvusd.contracts[this.address].contract.get_base_price(crvusd.constantOptions) as ethers.BigNumber;
        return ethers.utils.formatUnits(_price);
    }

    public async price(): Promise<string> {
        const _price = await crvusd.contracts[this.address].contract.get_p(crvusd.constantOptions) as ethers.BigNumber;
        return ethers.utils.formatUnits(_price);
    }

    // ---------------- WALLET BALANCES ----------------

    private async walletBalances(address = ""): Promise<{ collateral: string, stablecoin: string }> {
        const [collateral, stablecoin] = await getBalances([this.collateral, crvusd.address], address);
        return { stablecoin, collateral }
    }

    // ---------------- CREATE LOAN ----------------

    private async _calcN1(_collateral: ethers.BigNumber, _debt: ethers.BigNumber, N: number): Promise<ethers.BigNumber> {
        if (N < this.minTicks) throw Error(`N must be >= ${this.minTicks}`);
        if (N > this.maxTicks) throw Error(`N must be <= ${this.maxTicks}`);

        return await crvusd.contracts[this.controller].contract.calculate_debt_n1(_collateral, _debt, N, crvusd.constantOptions);
    }

    public async createLoanMaxRecv(collateral: number | string, N: number): Promise<string> {
        if (N < this.minTicks) throw Error(`N must be >= ${this.minTicks}`);
        if (N > this.maxTicks) throw Error(`N must be <= ${this.maxTicks}`);
        const _collateral = parseUnits(collateral, this.collateralDecimals);

        return ethers.utils.formatUnits(await crvusd.contracts[this.controller].contract.max_borrowable(_collateral, N, crvusd.constantOptions));
    }

    private async _createLoanTicks(collateral: number | string, debt: number | string, N: number): Promise<[ethers.BigNumber, ethers.BigNumber]> {
        const _n1 = await this._calcN1(parseUnits(collateral, this.collateralDecimals), parseUnits(debt), N);
        const _n2 = _n1.add(ethers.BigNumber.from(N - 1));

        return [_n1, _n2];
    }

    public async createLoanTicks(collateral: number | string, debt: number | string, N: number): Promise<[number, number]> {
        const [_n1, _n2] = await this._createLoanTicks(collateral, debt, N);

        return [_n1.toNumber(), _n2.toNumber()];
    }

    public async createLoanPrices(collateral: number | string, debt: number | string, N: number): Promise<string[]> {
        const [_n1, _n2] = await this._createLoanTicks(collateral, debt, N);

        const contract = crvusd.contracts[this.address].contract
        return (await Promise.all([
            contract.p_oracle_up(_n1, crvusd.constantOptions),
            contract.p_oracle_down(_n2, crvusd.constantOptions),
        ]) as ethers.BigNumber[]).map((_p) => ethers.utils.formatUnits(_p));

        // TODO switch to multicall
        // const contract = crvusd.contracts[this.address].multicallContract;
        // const [_price1, _price2] = await crvusd.multicallProvider.all([
        //     contract.price_oracle_up(_n1),
        //     contract.price_oracle_down(_n2),
        // ]);
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

    private async _createLoan(collateral: number | string, debt: number | string,  N: number, estimateGas: boolean): Promise<string | number> {
        if (await this.loanExists()) throw Error("Loan already created");
        if (N < this.minTicks) throw Error(`N must be >= ${this.minTicks}`);
        if (N > this.maxTicks) throw Error(`N must be <= ${this.maxTicks}`);

        const _collateral = parseUnits(collateral, this.collateralDecimals);
        const _debt = parseUnits(debt);
        const contract = crvusd.contracts[this.controller].contract;
        const gas = await contract.estimateGas.create_loan(_collateral, _debt, N, crvusd.constantOptions);
        if (estimateGas) return gas.toNumber();

        await crvusd.updateFeeData();
        const gasLimit = gas.mul(130).div(100);
        return (await contract.create_loan(_collateral, _debt, N, { ...crvusd.options, gasLimit })).hash
    }

    public async createLoanEstimateGas(collateral: number | string, debt: number | string,  N: number): Promise<number> {
        if (!(await this.createLoanIsApproved(collateral))) throw Error("Approval is needed for gas estimation");
        return await this._createLoan(collateral, debt,  N, true) as number;
    }

    public async createLoan(collateral: number | string, debt: number | string,  N: number): Promise<string> {
        await this.createLoanApprove(collateral);
        return await this._createLoan(collateral, debt,  N, false) as string;
    }

    // ---------------- BORROW MORE ----------------

    public async borrowMoreMaxRecv(collateralAmount: number | string): Promise<string> {
        const { _collateral: _currentCollateral, _debt: _currentDebt } = await this._userState();
        const _N = await this._getCurrentN();
        const _collateral = _currentCollateral.add(parseUnits(collateralAmount, this.collateralDecimals));

        const contract = crvusd.contracts[this.controller].contract;
        const _debt: ethers.BigNumber = await contract.max_borrowable(_collateral, _N, crvusd.constantOptions);

        return ethers.utils.formatUnits(_debt.sub(_currentDebt));
    }

    private async _borrowMoreTicks(collateral: number | string, debt: number | string): Promise<[ethers.BigNumber, ethers.BigNumber]> {
        const { _collateral: _currentCollateral, _debt: _currentDebt } = await this._userState();
        if (_currentDebt.eq(0)) throw Error(`Loan for ${crvusd.signerAddress} is not created`);

        const N = (await this._getCurrentN()).toNumber();
        const _collateral = _currentCollateral.add(parseUnits(collateral, this.collateralDecimals));
        const _debt = _currentDebt.add(parseUnits(debt, this.collateralDecimals));

        const _n1 = await this._calcN1(_collateral, _debt, N);
        const _n2 = _n1.add(N - 1);

        return [_n1, _n2];
    }

    public async borrowMoreTicks(collateral: number | string, debt: number | string): Promise<[number, number]> {
        const [_n1, _n2] = await this._borrowMoreTicks(collateral, debt);

        return [_n1.toNumber(), _n2.toNumber()];
    }

    public async borrowMorePrices(collateral: number | string, debt: number | string): Promise<string[]> {
        const [_n1, _n2] = await this._borrowMoreTicks(collateral, debt);

        const contract = crvusd.contracts[this.address].contract
        return (await Promise.all([
            contract.p_oracle_up(_n1, crvusd.constantOptions),
            contract.p_oracle_down(_n2, crvusd.constantOptions),
        ]) as ethers.BigNumber[]).map((_p) => ethers.utils.formatUnits(_p));

        // TODO switch to multicall
        // const contract = crvusd.contracts[this.address].multicallContract;
        // const [_price1, _price2] = await crvusd.multicallProvider.all([
        //     contract.price_oracle_up(_n1),
        //     contract.price_oracle_down(_n2),
        // ]);
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
        if (Number(currentDebt) === 0) throw Error(`Loan for ${crvusd.signerAddress} is not created`);
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

    private async _getCurrentN(address = ""): Promise<ethers.BigNumber> {
        address = _getAddress(address);
        const _ns: ethers.BigNumber[] = await crvusd.contracts[this.address].contract.read_user_tick_numbers(address, crvusd.constantOptions);
        return _ns[1].sub(_ns[0]).add(1);
    }

    private async _addCollateralTicks(collateral: number | string, address = ""): Promise<[ethers.BigNumber, ethers.BigNumber]> {
        address = _getAddress(address);
        const { _collateral: _currentCollateral, _debt: _currentDebt } = await this._userState(address);
        if (_currentDebt.eq(0)) throw Error(`Loan for ${address} is not created`);

        const N = (await this._getCurrentN(address)).toNumber();
        const _collateral = _currentCollateral.add(parseUnits(collateral, this.collateralDecimals));
        const _n1 = await this._calcN1(_collateral, _currentDebt, N);
        const _n2 = _n1.add(N - 1);

        return [_n1, _n2];
    }

    public async addCollateralTicks(collateral: number | string, address = ""): Promise<[number, number]> {
        const [_n1, _n2] = await this._addCollateralTicks(collateral, address);

        return [_n1.toNumber(), _n2.toNumber()];
    }

    public async addCollateralPrices(collateral: number | string, address = ""): Promise<string[]> {
        const [_n1, _n2] = await this._addCollateralTicks(collateral, address);

        const contract = crvusd.contracts[this.address].contract
        return (await Promise.all([
            contract.p_oracle_up(_n1, crvusd.constantOptions),
            contract.p_oracle_down(_n2, crvusd.constantOptions),
        ]) as ethers.BigNumber[]).map((_p) => ethers.utils.formatUnits(_p));

        // TODO switch to multicall
        // const contract = crvusd.contracts[this.address].multicallContract;
        // const [_price1, _price2] = await crvusd.multicallProvider.all([
        //     contract.price_oracle_up(_n1),
        //     contract.price_oracle_down(_n2),
        // ]);
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
        if (Number(currentDebt) === 0) throw Error(`Loan for ${address} is not created`);
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
        const _N = await this._getCurrentN();
        const _requiredCollateral = await crvusd.contracts[this.controller].contract.min_collateral(_currentDebt, _N, crvusd.constantOptions)

        return ethers.utils.formatUnits(_currentCollateral.sub(_requiredCollateral), this.collateralDecimals);
    }

    private async _removeCollateralTicks(collateral: number | string): Promise<[ethers.BigNumber, ethers.BigNumber]> {
        const { _collateral: _currentCollateral, _debt: _currentDebt } = await this._userState();
        if (_currentDebt.eq(0)) throw Error(`Loan for ${crvusd.signerAddress} is not created`);

        const N = (await this._getCurrentN()).toNumber();
        const _collateral = _currentCollateral.sub(parseUnits(collateral, this.collateralDecimals));
        const _n1 = await this._calcN1(_collateral, _currentDebt, N);
        const _n2 = _n1.add(N - 1);

        return [_n1, _n2];
    }

    public async removeCollateralTicks(collateral: number | string): Promise<[number, number]> {
        const [_n1, _n2] = await this._removeCollateralTicks(collateral);

        return [_n1.toNumber(), _n2.toNumber()];
    }

    public async removeCollateralPrices(collateral: number | string): Promise<string[]> {
        const [_n1, _n2] = await this._removeCollateralTicks(collateral);

        const contract = crvusd.contracts[this.address].contract
        return (await Promise.all([
            contract.p_oracle_up(_n1, crvusd.constantOptions),
            contract.p_oracle_down(_n2, crvusd.constantOptions),
        ]) as ethers.BigNumber[]).map((_p) => ethers.utils.formatUnits(_p));

        // TODO switch to multicall
        // const contract = crvusd.contracts[this.address].multicallContract;
        // const [_price1, _price2] = await crvusd.multicallProvider.all([
        //     contract.price_oracle_up(_n1),
        //     contract.price_oracle_down(_n2),
        // ]);
    }

    private async _removeCollateral(collateral: number | string, estimateGas: boolean): Promise<string | number> {
        const { stablecoin, debt: currentDebt } = await this.userState();
        if (Number(currentDebt) === 0) throw Error(`Loan for ${crvusd.signerAddress} is not created`);
        if (Number(stablecoin) > 0) throw Error(`User ${crvusd.signerAddress} is already in liquidation mode`);

        const _collateral = parseUnits(collateral, this.collateralDecimals);
        const contract = crvusd.contracts[this.controller].contract;
        const gas = await contract.estimateGas.remove_collateral(_collateral, crvusd.constantOptions);
        if (estimateGas) return gas.toNumber();

        await crvusd.updateFeeData();
        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_collateral(_collateral, { ...crvusd.options, gasLimit })).hash
    }

    public async removeCollateralEstimateGas(collateral: number | string): Promise<number> {
        return await this._removeCollateral(collateral, true) as number;
    }

    public async removeCollateral(collateral: number | string): Promise<string> {
        return await this._removeCollateral(collateral, false) as string;
    }

    // ---------------- REPAY ----------------

    public async repayIsApproved(debt: number | string): Promise<boolean> {
        return await hasAllowance([crvusd.address], [debt], crvusd.signerAddress, this.controller);
    }

    private async repayApproveEstimateGas (debt: number | string): Promise<number> {
        return await ensureAllowanceEstimateGas([crvusd.address], [debt], this.controller);
    }

    public async repayApprove(debt: number | string): Promise<string[]> {
        return await ensureAllowance([crvusd.address], [debt], this.controller);
    }

    private async _repay(debt: number | string, address: string, estimateGas: boolean): Promise<string | number> {
        const { debt: currentDebt } = await this.userState();
        if (Number(currentDebt) === 0) throw Error(`Loan for ${crvusd.signerAddress} is not created`);

        const _debt = parseUnits(debt);
        const contract = crvusd.contracts[this.controller].contract;
        const gas = await contract.estimateGas.repay(_debt, address, crvusd.constantOptions);
        if (estimateGas) return gas.toNumber();

        await crvusd.updateFeeData();
        const gasLimit = gas.mul(130).div(100);
        return (await contract.repay(_debt, address, { ...crvusd.options, gasLimit })).hash
    }

    public async repayEstimateGas(debt: number | string, address = ""): Promise<number> {
        address = _getAddress(address);
        if (!(await this.repayIsApproved(debt))) throw Error("Approval is needed for gas estimation");
        return await this._repay(debt, address, true) as number;
    }

    public async repay(debt: number | string, address = ""): Promise<string> {
        address = _getAddress(address);
        await this.repayApprove(debt);
        return await this._repay(debt, address, false) as string;
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
        const slippageBN = BN(1).minus(rateBN.div(smallRateBN)).times(100);

        return _cutZeros(slippageBN.toFixed(6)).replace('-', '')
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

    public async liquidateIsApproved(address: string): Promise<boolean> {
        const tokensToLiquidate = await this.tokensToLiquidate(address);
        return await hasAllowance([crvusd.address], [tokensToLiquidate], crvusd.signerAddress, this.controller);
    }

    private async liquidateApproveEstimateGas (address: string): Promise<number> {
        const tokensToLiquidate = await this.tokensToLiquidate(address);
        return await ensureAllowanceEstimateGas([crvusd.address], [tokensToLiquidate], this.controller);
    }

    public async liquidateApprove(address: string): Promise<string[]> {
        const tokensToLiquidate = await this.tokensToLiquidate(address);
        return await ensureAllowance([crvusd.address], [tokensToLiquidate], this.controller);
    }

    private async _liquidate(address: string, slippage: number, estimateGas: boolean): Promise<string | number> {
        const { stablecoin, debt: currentDebt } = await this.userState();
        if (slippage <= 0) throw Error("Slippage must be > 0");
        if (slippage > 100) throw Error("Slippage must be <= 100");
        if (Number(currentDebt) === 0) throw Error(`Loan for ${crvusd.signerAddress} is not created`);
        if (Number(stablecoin) === 0) throw Error(`User ${crvusd.signerAddress} is not in liquidation mode`);

        const minAmountBN: BigNumber = BN(stablecoin).times(100 - slippage).div(100);
        const _minAmount = fromBN(minAmountBN);
        const contract = crvusd.contracts[this.controller].contract;
        const gas = (await contract.estimateGas.liquidate(address, _minAmount, crvusd.constantOptions))
        if (estimateGas) return gas.toNumber();

        await crvusd.updateFeeData();
        const gasLimit = gas.mul(130).div(100);
        return (await contract.repay(address, _minAmount, { ...crvusd.options, gasLimit })).hash
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
        const tokensToLiquidate = await this.tokensToLiquidate();
        return await hasAllowance([crvusd.address], [tokensToLiquidate], crvusd.signerAddress, this.controller);
    }

    private async selfLiquidateApproveEstimateGas (): Promise<number> {
        const tokensToLiquidate = await this.tokensToLiquidate();
        return await ensureAllowanceEstimateGas([crvusd.address], [tokensToLiquidate], this.controller);
    }

    public async selfLiquidateApprove(): Promise<string[]> {
        const tokensToLiquidate = await this.tokensToLiquidate();
        return await ensureAllowance([crvusd.address], [tokensToLiquidate], this.controller);
    }

    private async _selfLiquidate(slippage: number, estimateGas: boolean): Promise<string | number> {
        const { stablecoin, debt: currentDebt } = await this.userState();
        if (slippage <= 0) throw Error("Slippage must be > 0");
        if (slippage > 100) throw Error("Slippage must be <= 100");
        if (Number(currentDebt) === 0) throw Error(`Loan for ${crvusd.signerAddress} is not created`);
        if (Number(stablecoin) === 0) throw Error(`User ${crvusd.signerAddress} is not in liquidation mode`);

        const minAmountBN: BigNumber = BN(stablecoin).times(100 - slippage).div(100);
        const _minAmount = fromBN(minAmountBN);
        const contract = crvusd.contracts[this.controller].contract;
        const gas = (await contract.estimateGas.self_liquidate(_minAmount, crvusd.constantOptions))
        if (estimateGas) return gas.toNumber();

        await crvusd.updateFeeData();
        const gasLimit = gas.mul(130).div(100);
        return (await contract.self_liquidate(_minAmount, { ...crvusd.options, gasLimit })).hash
    }

    public async selfLiquidateEstimateGas(slippage = 0.5): Promise<number> {
        if (!(await this.selfLiquidateIsApproved())) throw Error("Approval is needed for gas estimation");
        return await this._selfLiquidate(slippage, true) as number;
    }

    public async selfLiquidate(slippage = 0.5): Promise<string> {
        await this.selfLiquidateApprove();
        return await this._selfLiquidate(slippage, false) as string;
    }
}
