import { assert } from "chai";
import { crvusd } from "../src/crvusd";
import { getLlamma, LlammaTemplate } from "../src/llammas";

const LLAMMAS = ['eth'];

const selfLiquidationTest = (id: string) => {
    describe(`${id} self-liquidation test`, function () {
        let ethLlamma: LlammaTemplate;

        before(async function () {
            ethLlamma = getLlamma(id);
        });

        it('Self-liquidations', async function () {
            const initialBalances = await ethLlamma.wallet.balances();
            const initialState = await ethLlamma.userState();
            const initialTokensToLiquidate = await ethLlamma.tokensToLiquidate();

            assert.isAbove(Number(initialState.collateral), 0);
            assert.isAbove(Number(initialState.stablecoin), 0);
            assert.isAbove(Number(initialState.debt), 0);
            assert.isAtLeast(Number(initialBalances.stablecoin), Number(initialTokensToLiquidate));

            await ethLlamma.selfLiquidate(0.1);

            const balances = await ethLlamma.wallet.balances();
            const state = await ethLlamma.userState();

            const tokensToLiquidate = await ethLlamma.tokensToLiquidate();
            assert.equal(Number(tokensToLiquidate), 0);
            assert.equal(Number(state.collateral), 0);
            assert.equal(Number(state.stablecoin), 0);
            assert.equal(Number(state.debt), 0);
            assert.equal(Number(balances.collateral), Number(initialBalances.collateral) + Number(initialState.collateral));
            assert.equal(Number(balances.stablecoin), Number(initialBalances.stablecoin) - Number(initialTokensToLiquidate));
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
