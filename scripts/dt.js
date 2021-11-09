// @dev. This script will deploy this V1.1 of Otter. It will deploy the whole ecosystem.

const { ethers } = require('hardhat')
const { BigNumber } = ethers
const UniswapV2ABI = require('./IUniswapV2Factory.json').abi
const IUniswapV2Pair = require('./IUniswapV2Pair.json').abi

async function main() {
  const [deployer] = await ethers.getSigners()
  const daoAddr = '0x176311b81309240a8700BCC6129D5dF85087358D'
  console.log('Deploying contracts with the account: ' + deployer.address)

  // Initial staking index
  const initialIndex = '1000000000'

  const { provider } = deployer
  // TODO: set this to launch date
  const firstEpochTime = (await provider.getBlock()).timestamp + 30 * 60
  console.log('First epoch timestamp: ' + firstEpochTime)

  // What epoch will be first epoch
  const firstEpochNumber = '1'

  // How many seconds are in each epoch
  const epochLengthInSeconds = 60 * 10

  // Initial reward rate for epoch
  const initialRewardRate = '5000'

  // Ethereum 0 address, used when toggling changes in treasury
  const zeroAddress = '0x0000000000000000000000000000000000000000'

  // Large number for approval for DAI
  const largeApproval = '100000000000000000000000000000000'

  // Initial mint for DAI (10,000,000)
  const initialMint = '10000000000000000000000000'

  // DAI bond BCV
  const daiBondBCV = '300'

  // Bond vesting length in seconds.
  const bondVestingLength = 5 * 24 * 3600

  // Min bond price
  const minBondPrice = '1000'

  // Max bond payout, 1000 = 1% of CLAM total supply
  const maxBondPayout = '1000'

  // DAO fee for bond
  const bondFee = '10000'

  // Max debt bond can take on
  const maxBondDebt = '8000000000000000'

  // Initial Bond debt
  const initialBondDebt = '0'

  const warmupPeriod = '3'

  const chainId = (await provider.getNetwork()).chainId

  // Deploy DAI
  const DAI = await ethers.getContractFactory('DAI')
  const dai = await DAI.deploy(chainId);
  await dai.mint(deployer.address, initialMint)
  console.log('DAI addr: ' + dai.address)

  const daiAddress = dai.address;
  // const daiAddress = '0x19f5cD3b383D20E2e7c0652a1f751b6d55823be1';

  // Deploy CLAM
  const CLAM = await ethers.getContractFactory('OtterClamERC20')
  const clam = await CLAM.deploy()
  console.log('CLAM deployed: ' + clam.address)
  const clamAddress = clam.address;
  // const clamAddress = '0xaBa205A73D46c1Db12d0e67Fc79d1deC3eFCccD3';

  // Deploy Uniswap
  const UNISWAP_V2_FACTORY = await ethers.getContractFactory('UniswapV2Factory');
  uniswapV2Factory = await UNISWAP_V2_FACTORY.deploy(deployer.address); 
  console.log('uniswapV2Factory address: ', uniswapV2Factory.address)
  const uniswapV2FactoryAddress = uniswapV2Factory.address;
  // const uniswapV2FactoryAddress = '0xB09D5Ef162557e8c5666c947a60D49419D848317';
  // Create Pair
  await (await uniswapV2Factory.createPair(clamAddress, daiAddress)).wait()
  const lpAddress = await uniswapV2Factory.getPair(clamAddress, daiAddress)
  console.log('LP created: ' + lpAddress)
  // const lpAddress = '0xbbBF7bc401A11d08Ba58Aa7b2F25bBc98D2c4203';

  // Deploy bonding calc
  const BondingCalculator = await ethers.getContractFactory(
    'OtterBondingCalculator'
  )
  const bondingCalculator = await BondingCalculator.deploy(clamAddress)
  const bondingCalculatorAddress = bondingCalculator.address;
  console.log('bondingCalculatorAddress: ', bondingCalculatorAddress);
  // const bondingCalculatorAddress = '0x00bF4F34f8F0faa1d718E174Ecc5Ab314aC15c8d';

  // Deploy treasury
  const Treasury = await ethers.getContractFactory('OtterTreasury')
  const treasury = await Treasury.deploy(
    clamAddress,
    daiAddress,
    lpAddress,
    bondingCalculatorAddress,
    0
  )
  console.log('treasury deployed: ' + treasury.address)
  const treasuryAddress = treasury.address;
  // const treasuryAddress = '0x47D78a661D2Ec9b20cf7929C3A9B49df70882995'

  // Deploy staking distributor
  const StakingDistributor = await ethers.getContractFactory(
    'OtterStakingDistributor'
  )
  const stakingDistributor = await StakingDistributor.deploy(
    treasuryAddress,
    clamAddress,
    epochLengthInSeconds,
    firstEpochTime
  )

  const stakingDistributorAddress = stakingDistributor.address;
  console.log('stakingDistributorAddress: ', stakingDistributorAddress)
  // const stakingDistributorAddress = '0xdC4a06db654DbbE318D29f31f702da7a7F946576';

  // Deploy sCLAM
  const StakedCLAM = await ethers.getContractFactory('StakedOtterClamERC20')
  const sCLAM = await StakedCLAM.deploy()
  const sCLAMAddress = sCLAM.address;
  console.log('sCLAMAddress: ',sCLAMAddress);
  // const sCLAMAddress = '0xFf9326101A8332Fc12b19617214a6bac2e922bA4'


  // Deploy Staking
  const Staking = await ethers.getContractFactory('OtterStaking')
  const staking = await Staking.deploy(
    clamAddress,
    sCLAMAddress,
    epochLengthInSeconds,
    firstEpochNumber,
    firstEpochTime
  )
  const stakingAddress = staking.address;
  console.log("stakingAddress: ", stakingAddress);
  // const stakingAddress = '0xbE8c4A9A84D15947CB1349A39898F69041049A17';

  // Deploy staking warmpup
  const StakingWarmup = await ethers.getContractFactory('OtterStakingWarmup')
  const stakingWarmup = await StakingWarmup.deploy(
    stakingAddress,
    sCLAMAddress
  )

  const stakingWarmupAddress = stakingWarmup.address;
  console.log('stakingWarmupAddress: ',stakingWarmupAddress);
  // const stakingWarmupAddress = '0x6E27313dA43c13b8b77714DB963Ed639D896BA7F'

  // Deploy staking helper
  const StakingHelper = await ethers.getContractFactory('OtterStakingHelper')
  const stakingHelper = await StakingHelper.deploy(
    stakingAddress,
    clamAddress
  )
  const stakingHelperAddress = stakingHelper.address;
  console.log('stakingHelperAddress: ',stakingHelperAddress);
  // const stakingHelperAddress = '0x5C142eAfc9426eEfA678E366f8BE02A96272c733'

  // Deploy DAI bond
  const DAIBond = await ethers.getContractFactory('OtterBondDepository')
  const daiBond = await DAIBond.deploy(
    clamAddress,
    daiAddress,
    treasuryAddress,
    daoAddr,
    zeroAddress
  )
  const daiBondAdress = daiBond.address;
  console.log('daiBondAdress: ', daiBondAdress);
  // const daiBondAdress = '0x58FeD862df2f00832Cb1Df83765Fa5FCE3ae01FD'

  const DaiClamBond = await ethers.getContractFactory('OtterBondDepository')
  const daiClamBond = await DaiClamBond.deploy(
    clamAddress,
    lpAddress,
    treasuryAddress,
    daoAddr,
    bondingCalculatorAddress
  )
  const daiClamBondAddress = daiClamBond.address;
  console.log('daiClamBondAddress: ', daiClamBondAddress);
  // const daiClamBondAddress = '0xB89E180831cCc540F9C4Cff41523d9972c608938';

  const IDO = await ethers.getContractFactory('OtterClamIDO')
  const ido = await IDO.deploy(
    clamAddress,
    daiAddress,
    treasuryAddress,
    stakingAddress,
    lpAddress
  )
  const idoAddress = ido.address;
  console.log('idoAddress: ',idoAddress);
  // const idoAddress = '0x9B7988a5b53bB158e3E2Ae9faA74Fd782d8eE63E';

  console.log(
    JSON.stringify({
      sCLAM_ADDRESS: sCLAMAddress,
      CLAM_ADDRESS: clamAddress,
      MAI_ADDRESS: daiAddress,
      TREASURY_ADDRESS: treasuryAddress,
      CLAM_BONDING_CALC_ADDRESS: bondingCalculatorAddress,
      STAKING_ADDRESS: stakingAddress,
      STAKING_HELPER_ADDRESS: stakingHelperAddress,
      RESERVES: {
        MAI: daiAddress,
        MAI_CLAM: lpAddress,
      },
      BONDS: {
        MAI: daiBondAdress,
        MAI_CLAM: daiClamBondAddress,
      },
      IDO: idoAddress,
    })
  )

  // queue and toggle DAI reserve depositor
  let tx = await treasury.queue('0', daiBondAdress)
  await tx.wait(1)
  await treasury.toggle('0', daiBondAdress, zeroAddress)

  tx = await treasury.queue('0', deployer.address)
  await tx.wait(1)
  await treasury.toggle('0', deployer.address, zeroAddress)

  // queue and toggle DAI-CLAM liquidity depositor
  await (await treasury.queue('4', daiClamBondAddress)).wait()
  await treasury.toggle('4', daiClamBondAddress, zeroAddress)

  tx = await treasury.queue('4', deployer.address)
  await tx.wait(1)
  await treasury.toggle('4', deployer.address, zeroAddress)

  // Set bond terms
  await daiBond.initializeBondTerms(
    daiBondBCV,
    bondVestingLength,
    minBondPrice,
    maxBondPayout,
    bondFee,
    maxBondDebt,
    initialBondDebt
  )
  await daiClamBond.initializeBondTerms(
    '100',
    bondVestingLength,
    minBondPrice,
    maxBondPayout,
    bondFee,
    maxBondDebt,
    initialBondDebt
  )

  // Set staking for bonds
  await daiBond.setStaking(stakingAddress, stakingHelperAddress)
  await daiClamBond.setStaking(stakingAddress, stakingHelperAddress)

  // Initialize sCLAM and set the index
  await sCLAM.initialize(stakingAddress)
  await sCLAM.setIndex(initialIndex)

  // set distributor contract and warmup contract
  await staking.setContract('0', stakingDistributorAddress)
  await staking.setContract('1', stakingWarmupAddress)
  await staking.setWarmup(warmupPeriod)

  // Set treasury for CLAM token
  await clam.setVault(treasuryAddress)

  // Add staking contract as distributor recipient
  await stakingDistributor.addRecipient(stakingAddress, initialRewardRate)

  // queue and toggle reward manager
  await (await treasury.queue('8', stakingDistributorAddress)).wait(1)
  await treasury.toggle('8', stakingDistributorAddress, zeroAddress)

  const lp = new ethers.Contract(lpAddress, IUniswapV2Pair, deployer)
  // Approve the treasury to spend DAI
  await Promise.all([
    (await dai.approve(treasuryAddress, largeApproval)).wait(),
    (await dai.approve(daiBondAdress, largeApproval)).wait(),
    (await clam.approve(stakingAddress, largeApproval)).wait(),
    (await clam.approve(stakingHelperAddress, largeApproval)).wait(),
    (await lp.approve(treasuryAddress, largeApproval)).wait(),
  ])

  const totalIDODaiAmount = 100 * 10000
  const clamMinted = 200000
  const lpClamAmount = 50000
  const initialClamPriceInLP = 15
  const daiInTreasury = totalIDODaiAmount - initialClamPriceInLP * lpClamAmount
  const profit = daiInTreasury - clamMinted - lpClamAmount
  console.log({ daiInTreasury, profit })

  await (
    await treasury.deposit(
      BigNumber.from(daiInTreasury).mul(BigNumber.from(10).pow(18)),
      daiAddress,
      BigNumber.from(profit).mul(BigNumber.from(10).pow(9))
    )
  ).wait()

  // mint lp
  tx = await clam.transfer(
    lpAddress,
    BigNumber.from(lpClamAmount).mul(BigNumber.from(10).pow(9))
  )
  tx1 = await dai.transfer(
    lpAddress,
    BigNumber.from(lpClamAmount * initialClamPriceInLP).mul(
      BigNumber.from(10).pow(18)
    )
  )
  await Promise.all([tx.wait(), tx1.wait()])
  await (await lp.mint(deployer.address)).wait()

  // deposit lp bond with full profit
  const lpBalance = await lp.balanceOf(deployer.address)
  const valueOfLPToken = await treasury.valueOfToken(lpAddress, lpBalance)
  await treasury.deposit(lpBalance, lpAddress, valueOfLPToken)

}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
