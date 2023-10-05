import { assert } from "chai";
import { crvusd } from "../src/crvusd";
import { getLlamma, LlammaTemplate } from "../src/llammas";
import { BN } from "../src/utils";


const LLAMMAS = ['sfrxeth', 'wsteth', 'wbtc', 'eth', 'sfrxeth2', 'tbtc'];

const generalTest = (id: string) => {
    describe(`${id} llamma general test`, function () {
        let llamma: LlammaTemplate;

        before(async function () {
            llamma = getLlamma(id);
        });

        it('Create loan', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();

            assert.equal(Number(initialState.collateral), 0);
            assert.equal(Number(initialState.stablecoin), 0);
            assert.equal(Number(initialState.debt), 0);
            assert.isAbove(Number(initialBalances.collateral), 0);

            const collateralAmount = 0.5;
            const N = 5;
            const maxRecv = await llamma.createLoanMaxRecv(collateralAmount, N);
            const debtAmount = (Number(maxRecv) / 2).toFixed(18);
            const createLoanPrices = await llamma.createLoanPrices(collateralAmount, debtAmount, N);
            const createLoanFullHealth = await llamma.createLoanHealth(collateralAmount, debtAmount, N);
            const createLoanHealth = await llamma.createLoanHealth(collateralAmount, debtAmount, N, false);

            await llamma.createLoan(collateralAmount, debtAmount, N);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();
            const fullHealth = await llamma.userHealth();
            const health = await llamma.userHealth(false);

            assert.approximately(Number(createLoanPrices[0]), Number(userPrices[0]), 1e-2, 'price 0');
            assert.approximately(Number(createLoanPrices[1]), Number(userPrices[1]), 1e-2, 'price 1');
            assert.approximately(Number(createLoanFullHealth), Number(fullHealth), 0.1, 'full health');
            assert.approximately(Number(createLoanHealth), Number(health), 1e-4, 'health');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) - Number(collateralAmount), 'wallet collateral');
            assert.approximately(Number(balances.stablecoin), BN(initialBalances.stablecoin).plus(Number(debtAmount)).toNumber(), 1e-12, 'wallet stablecoin');
            assert.equal(Number(state.collateral), Number(collateralAmount), 'state collateral');
            assert.equal(Number(state.debt), Number(debtAmount), 'state debt');
        });

        it('Borrow more', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const loanExists = await llamma.loanExists();

            assert.isTrue(loanExists);
            assert.isAbove(Number(initialBalances.collateral), 0);

            const collateralAmount = 0.5;
            const maxRecv = await llamma.borrowMoreMaxRecv(collateralAmount);
            const debtAmount = (Number(maxRecv) / 2).toFixed(18);
            const borrowMorePrices = await llamma.borrowMorePrices(collateralAmount, debtAmount);
            const borrowMoreFullHealth = await llamma.borrowMoreHealth(collateralAmount, debtAmount);
            const borrowMoreHealth = await llamma.borrowMoreHealth(collateralAmount, debtAmount, false);

            await llamma.borrowMore(collateralAmount, debtAmount);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();
            const fullHealth = await llamma.userHealth();
            const health = await llamma.userHealth(false);

            assert.approximately(Number(borrowMorePrices[0]), Number(userPrices[0]), 1e-2, 'price 0');
            assert.approximately(Number(borrowMorePrices[1]), Number(userPrices[1]), 1e-2, 'price 1');
            assert.approximately(Number(borrowMoreFullHealth), Number(fullHealth), 1e-2, 'full health');
            assert.approximately(Number(borrowMoreHealth), Number(health), 1e-4, 'health');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) - Number(collateralAmount), 'wallet collateral');
            assert.equal(balances.stablecoin, BN(initialBalances.stablecoin).plus(BN(debtAmount)).toString(), 'wallet stablecoin');
            assert.equal(Number(state.collateral), Number(initialState.collateral) + Number(collateralAmount), 'state collateral');
            assert.approximately(Number(state.debt), Number(initialState.debt) + Number(debtAmount), 1e-4, 'state debt');
        });

        it('Add collateral', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const loanExists = await llamma.loanExists();

            assert.isTrue(loanExists);
            assert.isAbove(Number(initialBalances.collateral), 0);

            const collateralAmount = 1;
            const addCollateralPrices = await llamma.addCollateralPrices(collateralAmount);
            const addCollateralFullHealth = await llamma.addCollateralHealth(collateralAmount);
            const addCollateralHealth = await llamma.addCollateralHealth(collateralAmount, false);

            await llamma.addCollateral(collateralAmount);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();
            const fullHealth = await llamma.userHealth();
            const health = await llamma.userHealth(false);

            assert.approximately(Number(addCollateralPrices[0]), Number(userPrices[0]), 1e-2, 'price 0');
            assert.approximately(Number(addCollateralPrices[1]), Number(userPrices[1]), 1e-2, 'price 1');
            assert.approximately(Number(addCollateralFullHealth), Number(fullHealth), 1e-2, 'full health');
            assert.approximately(Number(addCollateralHealth), Number(health), 1e-4, 'health');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) - Number(collateralAmount), 'wallet collateral');
            assert.equal(Number(balances.stablecoin), Number(initialBalances.stablecoin), 'wallet stablecoin');
            assert.equal(Number(state.collateral), Number(initialState.collateral) + Number(collateralAmount), 'state collateral');
            assert.approximately(Number(initialState.debt), Number(state.debt), 1e-4, 'state debt');
        });

        it('Remove collateral', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const loanExists = await llamma.loanExists();

            assert.isTrue(loanExists);
            assert.isAbove(Number(initialState.collateral), 0);

            const maxRemovable = await llamma.maxRemovable();
            const collateralAmount = (Number(maxRemovable) / 2).toFixed(llamma.collateralDecimals);
            const removeCollateralPrices = await llamma.removeCollateralPrices(collateralAmount);
            const removeCollateralFullHealth = await llamma.removeCollateralHealth(collateralAmount);
            const removeCollateralHealth = await llamma.removeCollateralHealth(collateralAmount, false);

            await llamma.removeCollateral(collateralAmount);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();
            const fullHealth = await llamma.userHealth();
            const health = await llamma.userHealth(false);

            assert.approximately(Number(removeCollateralPrices[0]), Number(userPrices[0]), 1e-2, 'price 0');
            assert.approximately(Number(removeCollateralPrices[1]), Number(userPrices[1]), 1e-2, 'price 1');
            assert.approximately(Number(removeCollateralFullHealth), Number(fullHealth), 1e-2, 'full health');
            assert.approximately(Number(removeCollateralHealth), Number(health), 1e-4, 'health');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) + Number(collateralAmount), 'wallet collateral');
            assert.equal(Number(balances.stablecoin), Number(initialBalances.stablecoin), 'wallet stablecoin');
            assert.equal(state.collateral, BN(initialState.collateral).minus(BN(collateralAmount)).toString(), 'state collateral');
            assert.approximately(Number(initialState.debt), Number(state.debt), 1e-4, 'state debt');
        });

        it('Partial repay', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const loanExists = await llamma.loanExists();
            const debtAmount = (Number(initialState.debt) / 4).toFixed(18);

            assert.isTrue(loanExists);
            assert.isAtLeast(Number(initialBalances.stablecoin), Number(debtAmount));

            const repayPrices = await llamma.repayPrices(debtAmount);
            const repayFullHealth = await llamma.repayHealth(debtAmount);
            const repayHealth = await llamma.repayHealth(debtAmount, false);

            await llamma.repay(debtAmount);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();
            const fullHealth = await llamma.userHealth();
            const health = await llamma.userHealth(false);

            assert.approximately(Number(repayPrices[0]), Number(userPrices[0]), 1e-2, 'price 0');
            assert.approximately(Number(repayPrices[1]), Number(userPrices[1]), 1e-2, 'price 1');
            assert.approximately(Number(repayFullHealth), Number(fullHealth), 1e-2, 'full health');
            assert.approximately(Number(repayHealth), Number(health), 1e-4, 'health');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral), 'wallet collateral');
            assert.equal(balances.stablecoin, BN(initialBalances.stablecoin).minus(BN(debtAmount)).toString(), 'wallet stablecoin');
            assert.equal(Number(state.collateral), Number(initialState.collateral), 'state collateral');
            assert.equal(Number(state.stablecoin), Number(initialState.stablecoin), 'state stablecoin');
            assert.approximately(Number(state.debt), Number(initialState.debt) - Number(debtAmount), 1e-4, 'state debt');
        });

        it('Full repay', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const loanExists = await llamma.loanExists();

            assert.isTrue(loanExists);
            assert.isAtLeast(Number(initialBalances.stablecoin), Number(initialState.debt));

            await llamma.fullRepay();

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();


            assert.approximately(Number(balances.collateral), Number(initialBalances.collateral) + Number(initialState.collateral), 10**(-llamma.collateralDecimals), 'wallet collateral');
            assert.approximately(Number(balances.stablecoin), Number(initialBalances.stablecoin) - Number(initialState.debt), 1e-3, 'wallet stablecoin');
            assert.equal(Number(state.collateral), 0, 'state collateral');
            assert.equal(Number(state.stablecoin), 0, 'state stablecoin');
            assert.equal(Number(state.debt), 0, 'state debt');
        });

        it('Leverage', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const loanExists = await llamma.loanExists();

            assert.isFalse(loanExists);
            assert.isAbove(Number(initialBalances.collateral), 0);

            const collateralAmount = 0.5;
            const N = 10;
            const maxRecv = await llamma.leverage.createLoanMaxRecv(collateralAmount, N);
            const debtAmount = (Number(maxRecv.maxBorrowable) / 2).toFixed(18);
            const createLoanPrices = await llamma.leverage.createLoanPrices(collateralAmount, debtAmount, N);
            const createLoanFullHealth = await llamma.leverage.createLoanHealth(collateralAmount, debtAmount, N);
            const createLoanHealth = await llamma.leverage.createLoanHealth(collateralAmount, debtAmount, N, false);
            const { collateral } = await llamma.leverage.createLoanCollateral(collateralAmount, debtAmount);

            await llamma.leverage.createLoan(collateralAmount, debtAmount, N);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();
            const fullHealth = await llamma.userHealth();
            const health = await llamma.userHealth(false);

            assert.approximately(Number(createLoanPrices[0]), Number(userPrices[0]), 1e-2, 'price 0');
            assert.approximately(Number(createLoanPrices[1]), Number(userPrices[1]), 1e-2, 'price 1');
            assert.approximately(Number(createLoanFullHealth), Number(fullHealth), 0.1, 'full health');
            assert.approximately(Number(createLoanHealth), Number(health), 1e-3, 'health');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) - Number(collateralAmount), 'wallet collateral');
            assert.equal(Number(balances.stablecoin), Number(initialBalances.stablecoin), 'wallet stablecoin');
            assert.approximately(Number(state.collateral), Number(collateral), 1e-6, 'state collateral');
            assert.equal(Number(state.debt), Number(debtAmount), 'state debt');
        });

        it('Deleverage', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const loanExists = await llamma.loanExists();
            const collateralAmount = Number(initialState.collateral) / 10;
            const deleverageIsAvailable = await llamma.deleverage.isAvailable(collateralAmount);
            const isFullRepayment = await llamma.deleverage.isFullRepayment(collateralAmount);

            assert.isTrue(loanExists);
            assert.isTrue(deleverageIsAvailable);
            assert.isFalse(isFullRepayment);

            const deleverageBands = await llamma.deleverage.repayBands(collateralAmount);
            const deleveragePrices = await llamma.deleverage.repayPrices(collateralAmount);
            const deleverageFullHealth = await llamma.deleverage.repayHealth(collateralAmount);
            const deleverageHealth = await llamma.deleverage.repayHealth(collateralAmount, false);
            const { stablecoins } = await llamma.deleverage.repayStablecoins(collateralAmount);

            await llamma.deleverage.repay(collateralAmount);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userBands = await llamma.userBands();
            const userPrices = await llamma.userPrices();
            const fullHealth = await llamma.userHealth();
            const health = await llamma.userHealth(false);


            assert.equal(deleverageBands[0], userBands[0], 'band 0');
            assert.equal(deleverageBands[1], userBands[1], 'band 1');
            assert.approximately(Number(deleveragePrices[0]), Number(userPrices[0]), 0.1, 'price 0');
            assert.approximately(Number(deleveragePrices[1]), Number(userPrices[1]), 0.1, 'price 1');
            assert.approximately(Number(deleverageFullHealth), Number(fullHealth), 0.1, 'full health');
            assert.approximately(Number(deleverageHealth), Number(health), 1e-4, 'health');
            assert.equal(balances.collateral, initialBalances.collateral, 'wallet collateral');
            assert.equal(balances.stablecoin, initialBalances.stablecoin, 'wallet stablecoin');
            assert.approximately(Number(state.collateral), Number(initialState.collateral) - collateralAmount, 1e-5, 'state collateral');
            assert.approximately(Number(state.debt), Number(initialState.debt) - Number(stablecoins), 1e-2, 'state debt');
        });

        it('Full deleverage', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const initialLoanExists = await llamma.loanExists();
            const collateralAmount = Number(initialState.collateral) * 0.95;
            const deleverageIsAvailable = await llamma.deleverage.isAvailable(collateralAmount);
            const isFullRepayment = await llamma.deleverage.isFullRepayment(collateralAmount);

            assert.isTrue(initialLoanExists);
            assert.isTrue(deleverageIsAvailable);
            assert.isTrue(isFullRepayment);

            const { stablecoins } = await llamma.deleverage.repayStablecoins(collateralAmount);

            await llamma.deleverage.repay(collateralAmount);

            const balances = await llamma.wallet.balances();
            const loanExists = await llamma.loanExists();


            if (llamma.id !== "eth") {
                assert.approximately(Number(balances.collateral), Number(initialBalances.collateral) + Number(initialState.collateral) - collateralAmount,
                    1e-5, 'wallet collateral');
            }
            assert.approximately(Number(balances.stablecoin), Number(initialBalances.stablecoin) + Number(stablecoins) - Number(initialState.debt),
                1e-3, 'wallet stablecoin');
            assert.isFalse(loanExists, 'loan exists');
        });
    })
}

describe('General test', async function () {
    this.timeout(120000);

    before(async function () {
        await crvusd.init('JsonRpc', {},{ gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    });

    for (const llammaId of LLAMMAS) {
        generalTest(llammaId);
    }
})
