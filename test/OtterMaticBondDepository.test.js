const { ethers, timeAndMine } = require('hardhat')
const { expect } = require('chai')
const { formatUnits, parseEther, parseUnits } = require('@ethersproject/units')

describe('OtterMaticBondDepository', function () {
  // Large number for approval for DAI
  const largeApproval = '100000000000000000000000000000000'

  // What epoch will be first epoch
  const firstEpochNumber = '0'

  // How many seconds are in each epoch
  const epochLength = 86400 / 3

  // Ethereum 0 address, used when toggling changes in treasury
  const zeroAddress = '0x0000000000000000000000000000000000000000'

  // Initial staking index
  const initialIndex = '1737186817'

  const initialRewardRate = '5000'

  let // Used as default deployer for contracts, asks as owner of contracts.
    deployer,
    // Used as the default user for deposits and trade. Intended to be the default regular user.
    depositor,
    dao,
    clam,
    sClam,
    dai,
    treasury,
    staking,
    bond,
    firstEpochTime,
    oracle

  beforeEach(async function () {
    ;[deployer, depositor, dao] = await ethers.getSigners()

    firstEpochTime = (await deployer.provider.getBlock()).timestamp - 100

    const Oracle = await ethers.getContractFactory('AggregatorV3Mock')
    oracle = await Oracle.deploy()

    const CLAM = await ethers.getContractFactory('OtterClamERC20')
    clam = await CLAM.deploy()
    await clam.setVault(deployer.address)

    const DAI = await ethers.getContractFactory('DAI')
    dai = await DAI.deploy(0)

    const StakedCLAM = await ethers.getContractFactory('StakedOtterClamERC20')
    sClam = await StakedCLAM.deploy()

    const Treasury = await ethers.getContractFactory('OtterTreasury')
    treasury = await Treasury.deploy(
      clam.address,
      dai.address,
      zeroAddress,
      zeroAddress,
      0
    )

    const Staking = await ethers.getContractFactory('OtterStaking')
    staking = await Staking.deploy(
      clam.address,
      sClam.address,
      epochLength,
      firstEpochNumber,
      firstEpochTime
    )

    const StakingWarmup = await ethers.getContractFactory('OtterStakingWarmup')
    const stakingWarmup = await StakingWarmup.deploy(
      staking.address,
      sClam.address
    )

    const StakingDistributor = await ethers.getContractFactory(
      'OtterStakingDistributor'
    )
    const stakingDistributor = await StakingDistributor.deploy(
      treasury.address,
      clam.address,
      epochLength,
      firstEpochTime
    )
    await stakingDistributor.addRecipient(staking.address, initialRewardRate)

    const Bond = await ethers.getContractFactory('OtterMaticBondDepository')
    bond = await Bond.deploy(
      clam.address,
      sClam.address,
      dai.address,
      treasury.address,
      dao.address,
      staking.address,
      oracle.address
    )

    await sClam.initialize(staking.address)
    await sClam.setIndex(initialIndex)

    await staking.setContract('0', stakingDistributor.address)
    await staking.setContract('1', stakingWarmup.address)

    await clam.setVault(treasury.address)

    // queue and toggle deployer reserve depositor
    await treasury.queue('0', deployer.address)
    await treasury.toggle('0', deployer.address, zeroAddress)

    await treasury.queue('8', bond.address)
    await treasury.toggle('8', bond.address, zeroAddress)

    await treasury.queue('8', stakingDistributor.address)
    await treasury.toggle('8', stakingDistributor.address, zeroAddress)

    await bond.setStaking(staking.address)

    // await clam.approve(stakingHelper.address, largeApproval)
    await dai.approve(treasury.address, largeApproval)
    await dai.approve(bond.address, largeApproval)
    await dai.connect(depositor).approve(bond.address, largeApproval)

    // mint 1,000,000 DAI for testing
    await dai.mint(deployer.address, parseEther(String(100 * 10000)))
    await dai.transfer(depositor.address, parseEther('10000'))
  })

  describe('adjust', function () {
    it('should able to adjust with bcv <= 40', async function () {
      const bcv = 38
      const bondVestingLength = 10
      const minBondPrice = 400 // bond price = $4
      const maxBondPayout = 1000 // 1000 = 1% of CLAM total supply
      const maxBondDebt = '8000000000000000'
      const initialBondDebt = 0
      await bond.initializeBondTerms(
        bcv,
        bondVestingLength,
        minBondPrice,
        maxBondPayout, // Max bond payout,
        maxBondDebt,
        initialBondDebt
      )

      await bond.setAdjustment(true, 1, 50, 0)
      const adjustment = await bond.adjustment()
      expect(adjustment[0]).to.be.true
      expect(adjustment[1]).to.eq(1)
      expect(adjustment[2]).to.eq(50)
      expect(adjustment[3]).to.eq(0)
    })

    it('should failed to adjust with too large increment', async function () {
      const bcv = 100
      const bondVestingLength = 10
      const minBondPrice = 400 // bond price = $4
      const maxBondPayout = 1000 // 1000 = 1% of CLAM total supply
      const maxBondDebt = '8000000000000000'
      const initialBondDebt = 0
      await bond.initializeBondTerms(
        bcv,
        bondVestingLength,
        minBondPrice,
        maxBondPayout, // Max bond payout,
        maxBondDebt,
        initialBondDebt
      )

      await expect(bond.setAdjustment(true, 3, 50, 0)).to.be.revertedWith(
        'Increment too large'
      )
    })

    it('should be able to adjust with normal increment', async function () {
      const bcv = 100
      const bondVestingLength = 10
      const minBondPrice = 400 // bond price = $4
      const maxBondPayout = 1000 // 1000 = 1% of CLAM total supply
      const maxBondDebt = '8000000000000000'
      const initialBondDebt = 0
      await bond.initializeBondTerms(
        bcv,
        bondVestingLength,
        minBondPrice,
        maxBondPayout, // Max bond payout,
        maxBondDebt,
        initialBondDebt
      )

      await bond.setAdjustment(false, 2, 80, 3)
      const adjustment = await bond.adjustment()
      expect(adjustment[0]).to.be.false
      expect(adjustment[1]).to.eq(2)
      expect(adjustment[2]).to.eq(80)
      expect(adjustment[3]).to.eq(3)
    })
  })

  describe('deposit', function () {
    it('failed to redeem not fully vested bond', async function () {
      await treasury.deposit(
        parseEther('10000'),
        dai.address,
        parseUnits('7500', 9)
      )

      const bcv = 300
      const bondVestingLength = 10
      const minBondPrice = 400 // bond price = $4
      const maxBondPayout = 1000 // 1000 = 1% of CLAM total supply
      const maxBondDebt = '1000000000000000000'
      const initialBondDebt = 0
      await bond.initializeBondTerms(
        bcv,
        bondVestingLength,
        minBondPrice,
        maxBondPayout, // Max bond payout,
        maxBondDebt,
        initialBondDebt
      )

      await bond.deposit(parseEther('100'), largeApproval, deployer.address)

      const prevDAOReserve = await clam.balanceOf(dao.address)
      expect(prevDAOReserve).to.eq(0)
      console.log('dao balance: ' + formatUnits(prevDAOReserve, 9))

      await timeAndMine.setTimeIncrease(2)

      await expect(bond.redeem(deployer.address, false)).to.be.revertedWith(
        'not fully vested'
      )
    })

    it('should redeem sCLAM when vested fully', async function () {
      await treasury.deposit(
        parseEther('10000'),
        dai.address,
        parseUnits('7500', 9)
      )

      const bcv = 300
      const bondVestingLength = 15
      const minBondPrice = 400 // bond price = 4 MATIC
      const maxBondPayout = 10000 // 1000 = 1% of CLAM total supply
      const maxBondDebt = '8000000000000000'
      const initialBondDebt = 0
      await bond.initializeBondTerms(
        bcv,
        bondVestingLength,
        minBondPrice,
        maxBondPayout, // Max bond payout,
        maxBondDebt,
        initialBondDebt
      )

      await oracle.setRoundData(0, parseUnits('2.2', 8), 0, 1, 0)

      expect(await bond.bondPriceInUSD()).to.eq(parseEther('8.8'))

      await expect(() =>
        bond.deposit(parseEther('1000'), largeApproval, deployer.address)
      ).to.changeTokenBalance(clam, dao, 0)

      await timeAndMine.setTimeIncrease(432001)
      await staking.rebase()

      await expect(() =>
        bond.redeem(deployer.address, false)
      ).to.changeTokenBalance(sClam, deployer, parseUnits('263.75', 9))
    })

    it('should deploy twice and redeem sCLAM when vested fully', async function () {
      await treasury.deposit(
        parseEther('100000'),
        dai.address,
        parseUnits('75000', 9)
      )

      const bcv = 300
      const bondVestingLength = 15
      const minBondPrice = 5000 // bond price = $50
      const maxBondPayout = 10000 // 1000 = 1% of CLAM total supply
      const maxBondDebt = '8000000000000000'
      const initialBondDebt = 0
      await bond.initializeBondTerms(
        bcv,
        bondVestingLength,
        minBondPrice,
        maxBondPayout, // Max bond payout,
        maxBondDebt,
        initialBondDebt
      )

      await expect(() =>
        bond.deposit(parseEther('50'), largeApproval, deployer.address)
      ).to.changeTokenBalance(clam, dao, 0)
      await expect(() =>
        bond
          .connect(depositor)
          .deposit(parseEther('500'), largeApproval, depositor.address)
      ).to.changeTokenBalance(clam, dao, 0)

      await timeAndMine.setTimeIncrease(86400)
      await staking.rebase()

      await expect(() =>
        bond.deposit(parseEther('3000'), largeApproval, deployer.address)
      ).to.changeTokenBalance(clam, dao, 0)

      await timeAndMine.setTimeIncrease(432001)
      await staking.rebase()

      await expect(() =>
        bond.redeem(deployer.address, false)
      ).to.changeTokenBalance(sClam, deployer, '116767342325')

      await expect(() =>
        bond.redeem(depositor.address, false)
      ).to.changeTokenBalance(sClam, depositor, '331526107799')
    })
  })
})
