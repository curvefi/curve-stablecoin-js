import crvusd from "../src";

const generalMethodsTest = async () => {
    await crvusd.init('JsonRpc', {});

    const balances1 = await crvusd.getBalances(['crvusd', 'sfrxeth']);
    // OR const balances1 = await crvusd.getBalances(['0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E', '0xac3E018457B222d93114458476f3E3416Abbe38F']);
    console.log(balances1);
    // [ '0.0', '1.0' ]

    // You can specify address
    const balances2 = await crvusd.getBalances(['crvusd', 'sfrxeth'], "0x0063046686E46Dc6F15918b61AE2B121458534a5");
    // OR const balances2 = await crvusd.getBalances(['0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E', '0xac3E018457B222d93114458476f3E3416Abbe38F'], '0x0063046686E46Dc6F15918b61AE2B121458534a5');
    console.log(balances2);
    // [ '0.0', '0.0' ]

    const spender = "0x136e783846ef68C8Bd00a3369F787dF8d683a696" // sfrxeth llamma address

    await crvusd.getAllowance(["crvusd", "sfrxeth"], crvusd.signerAddress, spender);
    // [ '0.0', '0.0' ]
    await crvusd.hasAllowance(["crvusd", "sfrxeth"], ['1000', '1000'], crvusd.signerAddress, spender);
    // false
    await crvusd.ensureAllowance(["crvusd", "sfrxeth"], ['1000', '1000'], spender);
    // [
    //     '0xb0cada2a2983dc0ed85a26916d32b9caefe45fecde47640bd7d0e214ff22aed3',
    //     '0x00ea7d827b3ad50ce933e96c579810cd7e70d66a034a86ec4e1e10005634d041'
    // ]

    await crvusd.getUsdRate('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
    // 1257.43

    console.log(await crvusd.totalSupply());
}

const llammaFieldsTest = async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('sfrxeth');

    console.log(llamma.id);
    console.log(llamma.address);
    console.log(llamma.controller);
    console.log(llamma.monetaryPolicy);
    console.log(llamma.collateral);
    console.log(llamma.collateralSymbol);
    console.log(llamma.collateralDecimals);
    console.log(llamma.coins);
    console.log(llamma.coinAddresses);
    console.log(llamma.coinDecimals);
    console.log(llamma.minBands);
    console.log(llamma.maxBands);
    console.log(llamma.defaultBands);
    console.log(llamma.A);
    console.log(llamma.tickSpace);
}

const walletBalancesTest = async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('sfrxeth');

    // 1. Current address (signer) balances

    console.log(await llamma.wallet.balances());
    // { stablecoin: '0.0', collateral: '1.0' }

    // 2. You can specify the address

    console.log(await llamma.wallet.balances("0x0063046686E46Dc6F15918b61AE2B121458534a5"));
    // { stablecoin: '0.0', collateral: '0.0' }
}

const statsTest = async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('sfrxeth');

    console.log(await llamma.stats.parameters());
    console.log(await llamma.stats.balances());
    console.log(await llamma.stats.maxMinBands());
    console.log(await llamma.stats.activeBand());
    const liquidatingBand = await llamma.stats.liquidatingBand();
    console.log(liquidatingBand);
    console.log(await llamma.stats.bandBalances(liquidatingBand ?? 0));
    console.log(await llamma.stats.bandsBalances());
    console.log(await llamma.stats.totalSupply());
    console.log(await llamma.stats.totalDebt());
    console.log(await llamma.stats.totalStablecoin());
    console.log(await llamma.stats.totalCollateral());
    console.log(await llamma.stats.capAndAvailable());
}

const generalTest = async () => {
    await crvusd.init('JsonRpc', {});

    console.log(crvusd.getLlammaList());

    const llamma = crvusd.getLlamma('sfrxeth');


    console.log("\n--- CREATE LOAN ---\n");

    console.log(await llamma.oraclePrice());
    console.log(await llamma.price());
    console.log(await llamma.basePrice());
    console.log(await llamma.wallet.balances());
    console.log(await llamma.createLoanMaxRecv(1, 5));
    console.log(await llamma.createLoanBands(1, 1000, 5));
    console.log(await llamma.createLoanPrices(1, 1000, 5));
    console.log(await llamma.createLoanHealth(1, 1000, 5));  // FULL
    console.log(await llamma.createLoanHealth(1, 1000, 5, false));  // NOT FULL

    console.log(await llamma.createLoanIsApproved(1));
    // false
    console.log(await llamma.createLoanApprove(1));
    // [
    //     '0xc111e471715ae6f5437e12d3b94868a5b6542cd7304efca18b5782d315760ae5'
    // ]
    console.log(await llamma.createLoan(1, 1000, 5));

    console.log(await llamma.userDebt());  // OR await llamma.userDebt(address);
    console.log(await llamma.loanExists());
    console.log(await llamma.userHealth());  // FULL
    console.log(await llamma.userHealth(false));  // NOT FULL
    console.log(await llamma.userRange());
    console.log(await llamma.userBands());
    console.log(await llamma.userPrices());
    console.log(await llamma.userState());
    console.log(await llamma.userBandsBalances());

    console.log("\n--- BORROW MORE ---\n");

    console.log(await llamma.borrowMoreMaxRecv(0.5));
    console.log(await llamma.borrowMoreBands(0.5, 500));
    console.log(await llamma.borrowMorePrices(0.5, 500));
    console.log(await llamma.borrowMoreHealth(0.5, 500));  // FULL
    console.log(await llamma.borrowMoreHealth(0.5, 500, false));  // NOT FULL

    console.log(await llamma.borrowMoreIsApproved(0.5));
    console.log(await llamma.borrowMoreApprove(0.5));

    console.log(await llamma.borrowMore(0.5, 500));

    console.log(await llamma.userHealth());  // FULL
    console.log(await llamma.userHealth(false));  // NOT FULL
    console.log(await llamma.userBands());
    console.log(await llamma.userPrices());
    console.log(await llamma.userState());

    console.log("\n--- ADD COLLATERAL ---\n");

    console.log(await llamma.addCollateralBands(0.2));
    console.log(await llamma.addCollateralPrices(0.2));
    console.log(await llamma.addCollateralHealth(0.2));  // FULL
    console.log(await llamma.addCollateralHealth(0.2, false));  // NOT FULL

    console.log(await llamma.addCollateralIsApproved(0.2));
    console.log(await llamma.addCollateralApprove(0.2));

    console.log(await llamma.addCollateral(0.2));  // OR await llamma.addCollateral(0.2, forAddress);

    console.log(await llamma.userHealth());  // FULL
    console.log(await llamma.userHealth(false));  // NOT FULL
    console.log(await llamma.userBands());
    console.log(await llamma.userPrices());
    console.log(await llamma.userState());

    console.log("\n--- REMOVE COLLATERAL ---\n")

    console.log(await llamma.maxRemovable());
    console.log(await llamma.removeCollateralBands(0.1));
    console.log(await llamma.removeCollateralPrices(0.1));
    console.log(await llamma.removeCollateralHealth(0.1));  // FULL
    console.log(await llamma.removeCollateralHealth(0.1, false));  // NOT FULL

    console.log(await llamma.removeCollateral(0.1));

    console.log(await llamma.userHealth());  // FULL
    console.log(await llamma.userHealth(false));  // NOT FULL
    console.log(await llamma.userBands());
    console.log(await llamma.userPrices());
    console.log(await llamma.userState());

    console.log("\n--- REPAY ---\n");

    console.log(await llamma.wallet.balances());

    console.log(await llamma.repayBands(1000));
    console.log(await llamma.repayPrices(1000));
    console.log(await llamma.repayHealth(1000));  // FULL
    console.log(await llamma.repayHealth(1000, false));  // NOT FULL

    console.log(await llamma.repayIsApproved(1000));
    console.log(await llamma.repayApprove(1000));

    console.log(await llamma.repay(1000));

    console.log(await llamma.userDebt());
    console.log(await llamma.loanExists());
    console.log(await llamma.userHealth());  // FULL
    console.log(await llamma.userHealth(false));  // NOT FULL
    console.log(await llamma.userBands());
    console.log(await llamma.userPrices());
    console.log(await llamma.userState());

    console.log("\n--- FULL REPAY ---\n");

    console.log(await llamma.fullRepayIsApproved());
    console.log(await llamma.fullRepayApprove());

    console.log(await llamma.fullRepay());

    console.log(await llamma.loanExists());
    console.log(await llamma.userState());
}

const createLoanAllRangesTest = async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('sfrxeth');

    console.log(await llamma.createLoanMaxRecvAllRanges(1));
    console.log(await llamma.createLoanBandsAllRanges(1, 1600));
    console.log(await llamma.createLoanPricesAllRanges(1, 1600));
}

const swapTest = async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('sfrxeth');

    console.log(await llamma.wallet.balances());

    console.log(await llamma.maxSwappable(0, 1));
    console.log(await llamma.swapExpected(0, 1, 100));
    console.log(await llamma.swapRequired(0, 1, 100));
    console.log(await llamma.swapPriceImpact(0, 1, 100));
    console.log(await llamma.swapIsApproved(0, 100));
    console.log(await llamma.swapApprove(0, 100));
    console.log(await llamma.swap(0, 1, 100, 0.1));

    console.log(await llamma.wallet.balances());
}

const selfLiquidationTest = async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('sfrxeth');

    const maxDebt = await llamma.createLoanMaxRecv(0.3, 10);
    await llamma.createLoan(0.3, maxDebt, 10);
    await llamma.swap(0, 1, Number(maxDebt) * 10, 0.05);

    console.log(await llamma.wallet.balances());
    console.log(await llamma.userState());

    console.log(await llamma.tokensToLiquidate());
    console.log(await llamma.selfLiquidateIsApproved());
    console.log(await llamma.selfLiquidateApprove());
    console.log(await llamma.selfLiquidate(0.1));

    console.log(await llamma.wallet.balances());
    console.log(await llamma.userState());
}

const userLossTest = async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('sfrxeth');

    console.log(await llamma.userLoss("0x0063046686E46Dc6F15918b61AE2B121458534a5"));
    // {
    //     deposited_collateral: '929.933909709140155529',
    //     current_collateral_estimation: '883.035865972092328038',
    //     loss: '46.898043737047827491',
    //     loss_pct: '5.043158793049750311'
    // }
}

(async () => {
    console.log("\n--- generalMethodsTest ---\n")
    await generalMethodsTest();
    console.log("\n--- llammaFieldsTest ---\n")
    await llammaFieldsTest();
    console.log("\n--- walletBalancesTest ---\n")
    await walletBalancesTest();
    console.log("\n--- statsTest ---\n")
    await statsTest();
    console.log("\n--- generalTest ---\n")
    await generalTest();
    console.log("\n--- createLoanAllRangesTest ---\n")
    await createLoanAllRangesTest();
    console.log("\n--- swapTest ---\n")
    await swapTest();
    console.log("\n--- selfLiquidationTest ---\n")
    await selfLiquidationTest();
    console.log("\n--- userLossTest ---\n")
    await userLossTest();
})()
