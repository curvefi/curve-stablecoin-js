import { assert } from "chai";
import { crvusd } from "../src/crvusd";
import { getLlamma, LlammaTemplate } from "../src/llammas";
import { BN } from "../src/utils";

const LLAMMAS = ['eth'];

const swapTest = (id: string) => {
    let llamma: LlammaTemplate;

    before(async function () {
        llamma = getLlamma(id);
        await llamma.createLoan(0.3, 500, 10)
    });

    after(async function () {
        const state = await llamma.userState();
        await llamma.repay(state.debt);
    });

    describe(`${id} llamma swap test`, function () {
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                if (i === j) continue;

                it(`${i} --> ${j}`, async function () {
                    const initialBalances = await llamma.wallet.balances();
                    const swapAmount = Math.min(
                        Number(await llamma.maxSwappable(i, j)),
                        Number(Object.values(initialBalances)[i])
                    ) / 2;
                    const expected = await llamma.swapExpected(i, j, swapAmount);

                    await llamma.swap(i, j, swapAmount, 0.05);

                    const balances = await llamma.wallet.balances();

                    assert.deepStrictEqual(BN(Object.values(balances)[i]), BN(Object.values(initialBalances)[i]).minus(BN(swapAmount)));
                    assert.equal(Number(Object.values(balances)[j]), BN(Object.values(initialBalances)[j]).plus(BN(expected)).toNumber());
                });
            }
        }
    });
}

describe('Swap test', async function () {
    this.timeout(120000);

    before(async function () {
        await crvusd.init('JsonRpc', {},{ gasPrice: 0 });
    });

    for (const llammaId of LLAMMAS) {
        swapTest(llammaId);
    }
})
