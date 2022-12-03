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

            const collateralAmount = 0.5;
            const N = 5;
            const maxRecv = await llamma.createLoanMaxRecv(collateralAmount, N);
            const debtAmount = (Number(maxRecv) / 2).toFixed(6);
            const createLoanPrices = await llamma.createLoanPrices(collateralAmount, debtAmount, N);
            const createLoanFullHealth = await llamma.createLoanHealth(collateralAmount, debtAmount, N);
            const createLoanHealth = await llamma.createLoanHealth(collateralAmount, debtAmount, N, false);

            await llamma.createLoan(collateralAmount, debtAmount, N);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();
            const fullHealth = await llamma.health();
            const health = await llamma.health(false);

            assert.equal(Number(createLoanPrices[0]), Number(userPrices[0]));
            assert.equal(Number(createLoanPrices[1]), Number(userPrices[1]));
            assert.approximately(Number(createLoanFullHealth), Number(fullHealth), 1e-12);
            assert.approximately(Number(createLoanHealth), Number(health), 1e-12);
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

            const collateralAmount = 0.5;
            const maxRecv = await llamma.borrowMoreMaxRecv(collateralAmount);
            const debtAmount = (Number(maxRecv) / 2).toFixed(6);
            const borrowMorePrices = await llamma.borrowMorePrices(collateralAmount, debtAmount);
            const borrowMoreFullHealth = await llamma.borrowMoreHealth(collateralAmount, debtAmount);
            const borrowMoreHealth = await llamma.borrowMoreHealth(collateralAmount, debtAmount, false);

            await llamma.borrowMore(collateralAmount, debtAmount);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();
            const fullHealth = await llamma.health();
            const health = await llamma.health(false);

            assert.equal(Number(borrowMorePrices[0]), Number(userPrices[0]));
            assert.equal(Number(borrowMorePrices[1]), Number(userPrices[1]));
            assert.approximately(Number(borrowMoreFullHealth), Number(fullHealth), 1e-12);
            assert.approximately(Number(borrowMoreHealth), Number(health), 1e-12);
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

            const collateralAmount = 1;
            const addCollateralPrices = await llamma.addCollateralPrices(collateralAmount);
            const addCollateralFullHealth = await llamma.addCollateralHealth(collateralAmount);
            const addCollateralHealth = await llamma.addCollateralHealth(collateralAmount, false);

            await llamma.addCollateral(collateralAmount);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();
            const fullHealth = await llamma.health();
            const health = await llamma.health(false);

            assert.equal(Number(addCollateralPrices[0]), Number(userPrices[0]));
            assert.equal(Number(addCollateralPrices[1]), Number(userPrices[1]));
            assert.approximately(Number(addCollateralFullHealth), Number(fullHealth), 1e-12);
            assert.approximately(Number(addCollateralHealth), Number(health), 1e-12);
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
            const removeCollateralFullHealth = await llamma.removeCollateralHealth(collateralAmount);
            const removeCollateralHealth = await llamma.removeCollateralHealth(collateralAmount, false);

            await llamma.removeCollateral(collateralAmount);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();
            const fullHealth = await llamma.health();
            const health = await llamma.health(false);

            assert.equal(Number(removeCollateralPrices[0]), Number(userPrices[0]));
            assert.equal(Number(removeCollateralPrices[1]), Number(userPrices[1]));
            assert.approximately(Number(removeCollateralFullHealth), Number(fullHealth), 1e-12);
            assert.approximately(Number(removeCollateralHealth), Number(health), 1e-12);
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) + Number(collateralAmount));
            assert.equal(Number(balances.stablecoin), Number(initialBalances.stablecoin));
            assert.equal(Number(state.collateral), Number(initialState.collateral) - Number(collateralAmount));
            assert.equal(Number(initialState.debt), Number(state.debt));
        });

        it('Partial repay', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const loanExists = await llamma.loanExists();
            const debtAmount = (Number(initialState.debt) / 4).toFixed(6);

            assert.isTrue(loanExists);
            assert.isAtLeast(Number(initialBalances.stablecoin), Number(debtAmount));

            const repayPrices = await llamma.repayPrices(debtAmount);
            const repayFullHealth = await llamma.repayHealth(debtAmount);
            const repayHealth = await llamma.repayHealth(debtAmount, false);

            await llamma.repay(debtAmount);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();
            const userPrices = await llamma.userPrices();
            const fullHealth = await llamma.health();
            const health = await llamma.health(false);

            assert.equal(Number(repayPrices[0]), Number(userPrices[0]));
            assert.equal(Number(repayPrices[1]), Number(userPrices[1]));
            assert.approximately(Number(repayFullHealth), Number(fullHealth), 1e-12);
            assert.approximately(Number(repayHealth), Number(health), 1e-12);
            assert.equal(Number(state.collateral), Number(initialState.collateral));
            assert.equal(Number(state.stablecoin), Number(initialState.stablecoin));
            assert.equal(Number(state.debt), Number(initialState.debt) - Number(debtAmount));
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral));
            assert.equal(Number(balances.stablecoin), Number(initialBalances.stablecoin) - Number(debtAmount));
        });

        it('Full repay', async function () {
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
