# CRVUSD JS

## Setup

Install from npm:

`npm install @curvefi/stablecoin-api`

## Init
```ts
import crvusd from "@curvefi/stablecoin-api";

(async () => {
    // 1. Dev
    await crvusd.init('JsonRpc', {url: 'http://localhost:8545/', privateKey: ''}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 });
    // OR
    await crvusd.init('JsonRpc', {}, {}); // In this case JsonRpc url, privateKey, fee data and chainId will be specified automatically

    // 2. Infura
    crvusd.init("Infura", { network: "homestead", apiKey: <INFURA_KEY> }, { chainId: 1 });
    
    // 3. Web3 provider
    crvusd.init('Web3', { externalProvider: <WEB3_PROVIDER> }, { chainId: 1 });
})()
```
**Note 1.** ```chainId``` parameter is optional, but you must specify it in the case you use Metamask on localhost network, because Metamask has that [bug](https://hardhat.org/metamask-issue.html)

**Note 2.** Web3 init requires the address. Therefore, it can be initialized only after receiving the address.

**Wrong ❌️**
```tsx
import type { FunctionComponent } from 'react'
import { useState, useMemo } from 'react'
import { providers } from 'ethers'
import Onboard from 'bnc-onboard'
import type { Wallet } from 'bnc-onboard/dist/src/interfaces'
import crvusd from '@curvefi/stablecoin-api'

    ...

const WalletProvider: FunctionComponent = ({ children }) => {
    const [wallet, setWallet] = useState<Wallet>()
    const [provider, setProvider] = useState<providers.Web3Provider>()
    const [address, setAddress] = useState<string>()

    const networkId = 1

    const onboard = useMemo(
        () =>
            Onboard({
                dappId: DAPP_ID,
                networkId,

                subscriptions: {
                    address: (address) => {
                        setAddress(address)
                    },

                    wallet: (wallet) => {
                        setWallet(wallet)
                        if (wallet.provider) {
                            crvusd.init("Web3", { externalProvider: wallet.provider }, { chainId: networkId })
                        }
                    },
                },
                walletSelect: {
                    wallets: wallets,
                },
            }),
        []
    )

    ...
```

**Right ✔️**
```tsx
import type { FunctionComponent } from 'react'
import { useState, useMemo, useEffect } from 'react'
import { providers } from 'ethers'
import Onboard from 'bnc-onboard'
import type { Wallet } from 'bnc-onboard/dist/src/interfaces'
import crvusd from '@curvefi/stablecoin-api'

    ...

const WalletProvider: FunctionComponent = ({ children }) => {
    const [wallet, setWallet] = useState<Wallet>()
    const [provider, setProvider] = useState<providers.Web3Provider>()
    const [address, setAddress] = useState<string>()

    const networkId = 1

    const onboard = useMemo(
        () =>
            Onboard({
                dappId: DAPP_ID,
                networkId,

                subscriptions: {
                    address: (address) => {
                        setAddress(address)
                    },

                    wallet: (wallet) => {
                        setWallet(wallet)
                    },
                },
                walletSelect: {
                    wallets: wallets,
                },
            }),
        []
    )

    useEffect(() => {
        if (address && wallet?.provider) {
            crvusd.init("Web3", { externalProvider: wallet.provider }, { chainId: networkId })
        }
    }, [address, wallet?.provider]);

    ...
```

## Notes
- 1 Amounts can be passed in args either as numbers or strings.
- 2 llamma.swap**PriceImpact** method returns %, e. g. 0 < priceImpact <= 100.
- 3 Slippage arg should be passed as %, e. g. 0 < slippage <= 100.



## General methods
```ts
import crvusd from "@curvefi/stablecoin-api";

(async () => {
    await crvusd.init('JsonRpc', {});
    
    const balances1 = await crvusd.getBalances(['crvusd', 'weth']);
    // OR const balances1 = await crvusd.getBalances(['0x3194cBDC3dbcd3E11a07892e7bA5c3394048Cc87', '0xa3B53dDCd2E3fC28e8E130288F2aBD8d5EE37472']);
    console.log(balances1);
    // [ '10000.0', '0.0' ]

    // You can specify the address
    const balances2 = await crvusd.getBalances(['crvusd', 'weth'], "0x0063046686E46Dc6F15918b61AE2B121458534a5");
    // OR const balances2 = await crvusd.getBalances(['0x3194cBDC3dbcd3E11a07892e7bA5c3394048Cc87', '0xa3B53dDCd2E3fC28e8E130288F2aBD8d5EE37472'], '0x0063046686E46Dc6F15918b61AE2B121458534a5');
    console.log(balances2);
    // [ '0.0', '0.0' ]

    
    const spender = "0x3897810a334833184Ef7D6B419ba4d78EC2bBF80";

    await crvusd.getAllowance(["crvusd", "weth"], crvusd.signerAddress, spender);
    // [ '0.0', '0.0' ]
    await crvusd.hasAllowance(["crvusd", "weth"], ['1000', '1000'], crvusd.signerAddress, spender);
    // false
    await crvusd.ensureAllowance(["crvusd", "weth"], ['1000', '1000'], spender);
    // [
    //     '0xb0cada2a2983dc0ed85a26916d32b9caefe45fecde47640bd7d0e214ff22aed3',
    //     '0x00ea7d827b3ad50ce933e96c579810cd7e70d66a034a86ec4e1e10005634d041'
    // ]

    await crvusd.getUsdRate('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
    // 1257.43
})()
```

## Llammas

### Llamma fields
```ts
import crvusd from "@curvefi/stablecoin-api";

(async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('eth');

    llamma.id;
    // eth
    llamma.address;
    // 0x3897810a334833184Ef7D6B419ba4d78EC2bBF80
    llamma.controller;
    // 0x1eF9f7C2abD0E351a8966f00565e1b04765d3f0C
    llamma.collateralSymbol;
    // WETH
    llamma.collateralDecimals;
    // 18
    llamma.coins;
    // [ 'crvUSD', 'WETH' ]
    llamma.coinAddresses;
    // [
    //     '0x3194cBDC3dbcd3E11a07892e7bA5c3394048Cc87',
    //     '0xa3B53dDCd2E3fC28e8E130288F2aBD8d5EE37472'
    // ]
    llamma.coinDecimals;
    // [ 18, 18 ]
    llamma.minBands;
    // 5
    llamma.maxBands;
    // 50
    llamma.defaultBands;
    // 20
    llamma.A;
    // 100
    llamma.tickSpace;
    // 1 %
})()
````

### Wallet balances for llamma
```ts
import crvusd from "@curvefi/stablecoin-api";

(async () => {
    await crvusd.init('JsonRpc', {});
    
    const llamma = crvusd.getLlamma('eth');
    
    // 1. Current address (signer) balances

    await llamma.wallet.balances();
    // { stablecoin: '0.0', collateral: '1.0' }

    
    // 2. You can specify the address
    
    await llamma.wallet.balances("0x0063046686E46Dc6F15918b61AE2B121458534a5");
    // { stablecoin: '0.0', collateral: '0.0' }
})()
```

### Stats
```ts
import crvusd from "@curvefi/stablecoin-api";

(async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('eth');

    await llamma.stats.parameters();
    // {
    //     fee: '0.0',
    //     admin_fee: '0.0',
    //     rate: '0.0',
    //     monetary_policy_rate: '0.0',
    //     liquidation_discount: '2.0',
    //     loan_discount: '5.0'
    // }
    await llamma.stats.balances();
    // [ '300.0', '0.402268776965776345' ]
    await llamma.stats.maxMinBands();
    // [ 15, 0 ]
    await llamma.stats.activeBand();
    // 11
    const liquidatingBand = await llamma.stats.liquidatingBand();  // null when there is no liquidation
    // 11
    await llamma.stats.bandBalances(liquidatingBand);
    // { stablecoin: '300.0', collateral: '0.002268776965776345' }
    await llamma.stats.bandsBalances();
    // {
    //     '0': { stablecoin: '0.0', collateral: '0.0' },
    //     '1': { stablecoin: '0.0', collateral: '0.0' },
    //     '2': { stablecoin: '0.0', collateral: '0.0' },
    //     '3': { stablecoin: '0.0', collateral: '0.0' },
    //     '4': { stablecoin: '0.0', collateral: '0.0' },
    //     '5': { stablecoin: '0.0', collateral: '0.0' },
    //     '6': { stablecoin: '0.0', collateral: '0.0' },
    //     '7': { stablecoin: '0.0', collateral: '0.0' },
    //     '8': { stablecoin: '0.0', collateral: '0.0' },
    //     '9': { stablecoin: '0.0', collateral: '0.0' },
    //     '10': { stablecoin: '0.0', collateral: '0.0' },
    //     '11': { stablecoin: '300.0', collateral: '0.002268776965776345' },
    //     '12': { stablecoin: '0.0', collateral: '0.1' },
    //     '13': { stablecoin: '0.0', collateral: '0.1' },
    //     '14': { stablecoin: '0.0', collateral: '0.1' },
    //     '15': { stablecoin: '0.0', collateral: '0.1' }
    // }
    await llamma.stats.totalSupply();
    // 1375.74 
    await llamma.stats.totalDebt();
    // 1375.74
    await llamma.stats.totalStablecoin();
    // 300.0 
    await llamma.stats.totalCollateral();
    // 0.402268776965776345
})()
````

### Create loan, add collateral, borrow more, repay
```ts
(async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('eth');
    
    
    // --- CREATE LOAN ---

    await llamma.oraclePrice();
    // 3000.0
    await llamma.price();
    // 3045.569137149127502965
    await llamma.basePrice();
    // '3000.0'
    await llamma.wallet.balances();
    // { stablecoin: '0.0', collateral: '1.0' }
    await llamma.createLoanMaxRecv(0.5, 5);
    // 1375.74670276529114147
    await llamma.createLoanBands(0.5, 1000, 5);
    // [ 36, 32 ]
    await llamma.createLoanPrices(0.5, 1000, 5);
    // [ '2068.347257607234777', '2174.941007873561634' ]
    await llamma.createLoanHealth(0.5, 1000, 5);  // FULL
    // 45.191203147616155
    await llamma.createLoanHealth(0.5, 1000, 5, false);  // NOT FULL
    // 3.9382535412942367
    
    await llamma.createLoanIsApproved(0.5);
    // false
    await llamma.createLoanApprove(0.5);
    // [
    //     '0xc111e471715ae6f5437e12d3b94868a5b6542cd7304efca18b5782d315760ae5'
    // ]
    await llamma.createLoan(0.5, 1000, 5);

    await llamma.debt();  // OR await llamma.debt(address);
    // 1000.0
    await llamma.loanExists();
    // true
    await llamma.userHealth();  // FULL
    // 45.1912031476161562 %
    await llamma.userHealth(false);  // NOT FULL
    // 3.9382535412942379
    await llamma.userRange()
    // 5
    await llamma.userBands();
    // [ 36, 32 ]
    await llamma.userPrices();
    // [ '2068.347257607234777', '2174.941007873561634' ]
    await llamma.userState();
    // { collateral: '0.5', stablecoin: '0.0', debt: '1000.0' }
    await llamma.userBandsBalances();
    // {
    //     '32': { stablecoin: '0.0', collateral: '0.1' },
    //     '33': { stablecoin: '0.0', collateral: '0.1' },
    //     '34': { stablecoin: '0.0', collateral: '0.1' },
    //     '35': { stablecoin: '0.0', collateral: '0.1' },
    //     '36': { stablecoin: '0.0', collateral: '0.1' }
    // }

    // --- BORROW MORE ---

    await llamma.borrowMoreMaxRecv(0.1);
    // 650.896043318349376298
    await llamma.borrowMoreBands(0.1, 500);
    // [ 14, 10 ]
    await llamma.borrowMorePrices(0.1, 500);
    // [ '2580.175063923865968', '2713.146225026413746' ]
    await llamma.borrowMoreHealth(0.1, 500);  // FULL
    // 15.200984677843693 %
    await llamma.borrowMoreHealth(0.1, 500, false);  // NOT FULL
    // 3.7268336789002429 %
    
    await llamma.borrowMoreIsApproved(0.1);
    // true
    await llamma.borrowMoreApprove(0.1);
    // []
    
    await llamma.borrowMore(0.1, 500);

    // Full health: 15.200984677843694 %
    // Not full health: 3.7268336789002439 %
    // Bands: [ 14, 10 ]
    // Prices: [ '2580.175063923865968', '2713.146225026413746' ]
    // State: { collateral: '0.6', stablecoin: '0.0', debt: '1500.0' }

    // --- ADD COLLATERAL ---

    await llamma.addCollateralBands(0.2);
    // [ 43, 39 ]
    await llamma.addCollateralPrices(0.2);
    // [ '1927.834806254156043', '2027.187147180850842' ]
    await llamma.addCollateralHealth(0.2);  // FULL
    // 55.2190795613534006
    await llamma.addCollateralHealth(0.2, false);  // NOT FULL
    // 3.3357274109987789
    
    await llamma.addCollateralIsApproved(0.2);
    // true
    await llamma.addCollateralApprove(0.2);
    // []
    
    await llamma.addCollateral(0.2);  // OR await llamma.addCollateral(0.2, forAddress);

    // Full health: 55.2190795613534014 %
    // Not full health: 3.3357274109987797 %
    // Bands: [ 43, 39 ]
    // Prices: [ '1927.834806254156043', '2027.187147180850842' ]
    // State: { collateral: '0.8', stablecoin: '0.0', debt: '1500.0' }

    // --- REMOVE COLLATERAL ---

    await llamma.maxRemovable()
    // 0.254841506439755199
    await llamma.removeCollateralBands(0.1);
    // [ 29, 25 ]
    await llamma.removeCollateralPrices(0.1);
    // [ '2219.101120164841944', '2333.46407819744091' ]
    await llamma.removeCollateralHealth(0.1);  // FULL
    // 35.1846612411492316
    await llamma.removeCollateralHealth(0.1, false);  // NOT FULL
    // 4.0796515570298074
    
    await llamma.removeCollateral(0.1);

    // Full health: 35.1846612411492326 %
    // Not full health: 4.0796515570298084 %
    // Bands: [ 29, 25 ]
    // Prices: [ '2219.101120164841944', '2333.46407819744091', ]
    // State: { collateral: '0.7', stablecoin: '0.0', debt: '1500.0' }

    // --- REPAY ---

    await llamma.wallet.balances();
    // { stablecoin: '1500.0', collateral: '0.3' }

    await llamma.repayBands(1000);
    // [ 139, 135 ]
    await llamma.repayPrices(1000);
    // [ '734.595897104762463', '772.453820291837448' ]
    await llamma.repayHealth(1000);  // FULL
    // 315.2178906180373138
    await llamma.repayHealth(1000, false);  // NOT FULL
    // 3.3614254588945566
    
    await llamma.repayIsApproved(1000);
    // true
    await llamma.repayApprove(1000);
    // []
    await llamma.repay(1000);

    // Full health: 315.2178906180373149 %
    // Not full health: 3.3614254588945577 %
    // Bands: [ 139, 135 ]
    // Prices: [ '734.595897104762463', '772.453820291837448' ]
    // State: { collateral: '0.7', stablecoin: '0.0', debt: '500.0' }

    // --- FULL REPAY ---

    await llamma.fullRepayIsApproved();
    // true
    await llamma.fullRepayApprove();
    // []
    await llamma.fullRepay();

    // Loan exists: false
    // State: { collateral: '0.0', stablecoin: '0.0', debt: '0.0' }
})()
```

### Create loan all ranges methods
```ts
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('eth');

    await llamma.createLoanMaxRecvAllRanges(1);
    // {
    //     '5': '2751.493405530582454486',
    //     '6': '2737.828112577888632315',
    //     '7': '2724.253615257658154585',
    //     '8': '2710.76923397831492797',
    //     '9': '2697.374294577689210021',
    //     '10': '2684.068128277815937982',
    //     '11': '2670.850071640120547429',
    //     '12': '2657.719466520988458715',
    //     '13': '2644.675660027714709155',
    //     '14': '2631.718004474831209682',
    //     '15': '2618.845857340807263461',
    //     '16': '2606.058581225120973696',
    //     '17': '2593.355543805697908653',
    //     '18': '2580.736117796713531552',
    //     '19': '2568.199680906757040338',
    //     '20': '2555.745615797352299399',
    //      
    //      ...
    //
    //     '50': '2217.556229455652339229'
    // }

    await llamma.createLoanBandsAllRanges(1, 2600);
    // {
    //     '5': [ 10, 6 ],
    //     '6': [ 11, 6 ],
    //     '7': [ 11, 5 ],
    //     '8': [ 12, 5 ],
    //     '9': [ 12, 4 ],
    //     '10': [ 13, 4 ],
    //     '11': [ 13, 3 ],
    //     '12': [ 14, 3 ],
    //     '13': [ 14, 2 ],
    //     '14': [ 15, 2 ],
    //     '15': [ 15, 1 ],
    //     '16': [ 16, 1 ],
    //     '17': null,
    //     '18': null,
    //     '19': null,
    //     '20': null,
    //
    //      ...
    //
    //     '50': null
    // }

    await llamma.createLoanPricesAllRanges(1, 2600);
    // {
    //     '5': [ '2686.01476277614933533', '2824.440448203' ],
    //     '6': [ '2659.154615148387841976', '2824.440448203' ],
    //     '7': [ '2659.154615148387841976', '2852.9701497' ],
    //     '8': [ '2632.563068996903963557', '2852.9701497' ],
    //     '9': [ '2632.563068996903963557', '2881.78803' ],
    //     '10': [ '2606.237438306934923921', '2881.78803' ],
    //     '11': [ '2606.237438306934923921', '2910.897' ],
    //     '12': [ '2580.175063923865574682', '2910.897' ],
    //     '13': [ '2580.175063923865574682', '2940.3' ],
    //     '14': [ '2554.373313284626918935', '2940.3' ],
    //     '15': [ '2554.373313284626918935', '2970' ],
    //     '16': [ '2528.829580151780649746', '2970' ],
    //     '17': null,
    //     '18': null,
    //     '19': null,
    //     '20': null,
    //
    //      ...
    //
    //     '50': null
    // }
```

### Swap
```ts
(async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('eth');

    await llamma.wallet.balances();
    // {
    //     stablecoin: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }


    await llamma.maxSwappable(0, 1);
    // 380.672763174593107707
    await llamma.swapExpected(0, 1, 100);  // 100 - in_amount
    // 0.03679356627103543 (out_amount)
    await llamma.swapRequired(0, 1, 0.03679356627103543);  // 0.03679356627103543 - out_amount
    // 100.000000000000000558 (in_amount)
    await llamma.swapPriceImpact(0, 1, 100);
    // 0.170826
    await llamma.swapIsApproved(0, 100);
    // true
    await llamma.swapApprove(0, 100);
    // []
    await llamma.swap(0, 1, 100, 0.1);

    await llamma.wallet.balances();
    // {
    //     stablecoin: '201.533523886491869218',
    //     collateral: '0.897405542895007036'
    // }
})()
```

### Self-liquidation
```ts
(async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('eth');

    // Wallet balances: {
    //     stablecoin: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }
    // State: {
    //     collateral: '0.139388023376028394',
    //     stablecoin: '2751.493405530582315609',
    //     debt: '3053.026929417074184827'
    // }
    
    await llamma.tokensToLiquidate();
    // 301.533523886491869218
    await llamma.selfLiquidateIsApproved();
    // true
    await llamma.selfLiquidateApprove();
    // []
    await llamma.selfLiquidate(0.1); // slippage = 0.1 %

    // Wallet balances: { stablecoin: '0.0', collateral: '1.0' }
    // State: { collateral: '0.0', stablecoin: '0.0', debt: '0.0' }
})()
```

### Liquidation
```ts
(async () => {
    await crvusd.init('JsonRpc', {});

    const llamma = crvusd.getLlamma('eth');
    const addressToLiquidate = "0x66aB6D9362d4F35596279692F0251Db635165871";

    await llamma.wallet.balances();
    // Liquidator wallet balances: {
    //     stablecoin: '301.533523886491869218',
    //     collateral: '0.860611976623971606'
    // }
    await llamma.userState(addressToLiquidate);
    // State of the account we are goning to liquidate: {
    //     collateral: '0.139388023376028394',
    //     stablecoin: '2751.493405530582315609',
    //     debt: '3053.026929417074184827'
    // }
    
    await llamma.tokensToLiquidate(addressToLiquidate);
    // 301.533523886491869218
    await llamma.liquidateIsApproved();
    // true
    await llamma.liquidateApprove();
    // []
    await llamma.liquidate(addressToLiquidate, 0.1); // slippage = 0.1 %

    // Liquidator wallet balances: { stablecoin: '0.0', collateral: '1.0' }
    // State of liquidated account: { collateral: '0.0', stablecoin: '0.0', debt: '0.0' }
})()
```

## Gas estimation
Every non-constant method has corresponding gas estimation method. Rule: ```obj.method -> obj.estimateGas.method```

**Examples**
```ts
import crvusd from "@curvefi/stablecoin-api";

(async () => {
    await crvusd.init('JsonRpc', {});
    
    const spender = "0x3897810a334833184Ef7D6B419ba4d78EC2bBF80";
    await crvusd.estimateGas.ensureAllowance(["weth"], [1], spender);
    // 94523
    
    const llamma = crvusd.getLlamma('eth');
    await llamma.estimateGas.createLoanApprove(0.5);
    // 186042
    await llamma.estimateGas.createLoan(0.5, 1000, 20);
    // 1306411
})()
```