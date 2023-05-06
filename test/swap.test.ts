import { assert } from "chai";
import { crvusd } from "../src/crvusd";
import { getLlamma, LlammaTemplate } from "../src/llammas";
import { BN } from "../src/utils";

const LLAMMAS = ['sfrxeth'];

const swapTest = (id: string) => {
    let llamma: LlammaTemplate;
    let maxDebt: string;

    before(async function () {
        llamma = getLlamma(id);
        maxDebt = await llamma.createLoanMaxRecv(0.3, 10);
        await llamma.createLoan(0.3, maxDebt, 10)
    });

    after(async function () {
        await llamma.fullRepay();
    });


    describe(`${id} llamma swap test`, function () {
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                if (i === j) continue;

                it(`${i} --> ${j}`, async function () {
                    const initialBalances = await llamma.wallet.balances();
                    const swapAmount = i === 0 ? Number(maxDebt) / 10 : 0.003;
                    const expected = Number(await llamma.swapExpected(i, j, swapAmount));

                    await llamma.swap(i, j, swapAmount, 0.05);

                    const balances = await llamma.wallet.balances();
                    const out = Number(Object.values(balances)[j]) - Number(Object.values(initialBalances)[j]);

                    assert.deepStrictEqual(BN(Object.values(balances)[i]).toString(), BN(Object.values(initialBalances)[i]).minus(BN(swapAmount)).toString(), 'in');
                    assert.isAtMost(Math.abs(out - expected) / expected, 5 * 1e-3, 'out');
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
