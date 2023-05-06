import { assert } from "chai";
import { crvusd } from "../src/crvusd";
import { getLlamma, LlammaTemplate } from "../src/llammas";

const LLAMMAS = ['sfrxeth'];

const selfLiquidationTest = (id: string) => {
    describe(`${id} self-liquidation test`, function () {
        let llamma: LlammaTemplate;

        before(async function () {
            llamma = getLlamma(id);
            const maxDebt = await llamma.createLoanMaxRecv(0.3, 10);
            await llamma.createLoan(0.3, maxDebt, 10);

            const balances = await llamma.wallet.balances();
            const swapAmount = Math.min(
                Number(await llamma.maxSwappable(0, 1)),
                Number(Object.values(balances)[0])
            ) / 2;
            await llamma.swap(0, 1, swapAmount, 0.05);
        });

        it('Self-liquidations', async function () {
            const initialBalances = await llamma.wallet.balances();
            const initialState = await llamma.userState();
            const initialTokensToLiquidate = await llamma.tokensToLiquidate();

            assert.isAbove(Number(initialState.collateral), 0);
            assert.isAbove(Number(initialState.stablecoin), 0);
            assert.isAbove(Number(initialState.debt), 0);
            assert.isAtLeast(Number(initialBalances.stablecoin), Number(initialTokensToLiquidate));

            await llamma.selfLiquidate(0.1);

            const balances = await llamma.wallet.balances();
            const state = await llamma.userState();

            const tokensToLiquidate = await llamma.tokensToLiquidate();
            assert.equal(Number(tokensToLiquidate), 0, 'tokens to liquidate');
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) + Number(initialState.collateral), 'wallet collateral');
            assert.approximately(Number(balances.stablecoin), Number(initialBalances.stablecoin) - Number(initialTokensToLiquidate), 1e-4, 'wallet stablecoin');
            assert.equal(Number(state.collateral), 0, 'state callateral');
            assert.equal(Number(state.stablecoin), 0, 'state stablecoin');
            assert.equal(Number(state.debt), 0, 'state debt');
        });
    })
}

describe('Self-liquidation test', async function () {
    this.timeout(120000);

    before(async function () {
        await crvusd.init('JsonRpc', {},{ gasPrice: 0 });
    });

    for (const llammaId of LLAMMAS) {
        selfLiquidationTest(llammaId);
    }
})
