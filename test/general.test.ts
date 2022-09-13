import { assert } from "chai";
import { crvusd } from "../src/crvusd";
import { getLlamma, LlammaTemplate } from "../src/llammas";

const LLAMMAS = ['eth'];

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

            const collateralAmount = (Number(initialBalances.collateral) / 2).toFixed(6);
            const N = 10;
            const maxRecv = await llamma.createLoanMaxRecv(collateralAmount, N);
            const debtAmount = (Number(maxRecv) / 2).toFixed(6);
            const createLoanPrices = await llamma.createLoanPrices(collateralAmount, debtAmount, N);

            await llamma.createLoan(collateralAmount, debtAmount, N);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();

            assert.equal(Number(createLoanPrices[0]), Number(userPrices[0]));
            assert.equal(Number(createLoanPrices[1]), Number(userPrices[1]));
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) - Number(collateralAmount));
            assert.equal(Number(balances.stablecoin), Number(initialBalances.stablecoin) + Number(debtAmount));
            assert.equal(Number(state.collateral), Number(collateralAmount));
            assert.equal(Number(state.debt), Number(debtAmount));
        });

        it('Borrow more', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const loanExists = await llamma.loanExists();

            assert.isTrue(loanExists);
            assert.isAbove(Number(initialBalances.collateral), 0);

            const collateralAmount = (Number(initialBalances.collateral) / 2).toFixed(6);
            const maxRecv = await llamma.borrowMoreMaxRecv(collateralAmount);
            const debtAmount = (Number(maxRecv) / 2).toFixed(6);
            const borrowMorePrices = await llamma.borrowMorePrices(collateralAmount, debtAmount);

            await llamma.borrowMore(collateralAmount, debtAmount);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();

            assert.equal(Number(borrowMorePrices[0]), Number(userPrices[0]));
            assert.equal(Number(borrowMorePrices[1]), Number(userPrices[1]));
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) - Number(collateralAmount));
            assert.approximately(Number(balances.stablecoin), Number(initialBalances.stablecoin) + Number(debtAmount), 1e-10);
            assert.equal(Number(state.collateral), Number(initialState.collateral) + Number(collateralAmount));
            assert.approximately(Number(state.debt), Number(initialState.debt) + Number(debtAmount), 1e-10);
        });

        it('Add collateral', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const loanExists = await llamma.loanExists();

            assert.isTrue(loanExists);
            assert.isAbove(Number(initialBalances.collateral), 0);

            const collateralAmount = (Number(initialBalances.collateral) / 2).toFixed(6);
            const addCollateralPrices = await llamma.addCollateralPrices(collateralAmount);

            await llamma.addCollateral(collateralAmount);
            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();

            assert.equal(Number(addCollateralPrices[0]), Number(userPrices[0]));
            assert.equal(Number(addCollateralPrices[1]), Number(userPrices[1]));
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) - Number(collateralAmount));
            assert.equal(Number(balances.stablecoin), Number(initialBalances.stablecoin));
            assert.equal(Number(state.collateral), Number(initialState.collateral) + Number(collateralAmount));
            assert.equal(Number(initialState.debt), Number(state.debt));
        });

        it('Remove collateral', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const loanExists = await llamma.loanExists();

            assert.isTrue(loanExists);
            assert.isAbove(Number(initialState.collateral), 0);

            const maxRemovable = await llamma.maxRemovable();
            const collateralAmount = (Number(maxRemovable) / 2).toFixed(6);
            const removeCollateralPrices = await llamma.removeCollateralPrices(collateralAmount);

            await llamma.removeCollateral(collateralAmount);
            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();

            assert.equal(Number(removeCollateralPrices[0]), Number(userPrices[0]));
            assert.equal(Number(removeCollateralPrices[1]), Number(userPrices[1]));
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) + Number(collateralAmount));
            assert.equal(Number(balances.stablecoin), Number(initialBalances.stablecoin));
            assert.equal(Number(state.collateral), Number(initialState.collateral) - Number(collateralAmount));
            assert.equal(Number(initialState.debt), Number(state.debt));
        });

        it('Repay', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const loanExists = await llamma.loanExists();

            assert.isTrue(loanExists);
            assert.isAtLeast(Number(initialBalances.stablecoin), Number(initialState.debt));

            await llamma.repay(initialState.debt);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();

            assert.equal(Number(state.collateral), 0);
            assert.equal(Number(state.stablecoin), 0);
            assert.equal(Number(state.debt), 0);
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) + Number(initialState.collateral));
            assert.equal(Number(balances.stablecoin), Number(initialBalances.stablecoin) - Number(initialState.debt));
        });
    })
}

describe('General test', async function () {
    this.timeout(120000);

    before(async function () {
        await crvusd.init('JsonRpc', {},{ gasPrice: 0 });
    });

    for (const llammaId of LLAMMAS) {
        generalTest(llammaId);
    }
})
