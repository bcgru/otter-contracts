const { ethers, timeAndMine } = require('hardhat')
const { expect } = require('chai')
const { BigNumber } = require('@ethersproject/bignumber')

describe('Pearl', function () {
  // Large number for approval for DAI
  const largeApproval = '100000000000000000000000000000000'

  // What epoch will be first epoch
  const firstEpochNumber = '1'

  // How many seconds are in each epoch
  const epochLength = 86400 / 3

  // Initial reward rate for epoch
  const initialRewardRate = '3000'

  // Ethereum 0 address, used when toggling changes in treasury
  const zeroAddress = '0x0000000000000000000000000000000000000000'

  // Initial staking index
  const initialIndex = '1000000000'

  let // Used as default deployer for contracts, asks as owner of contracts.
    deployer,
    // Used as the default user for deposits and trade. Intended to be the default regular user.
    clam,
    sClam,
    pearl,
    dai,
    treasury,
    stakingDistributor,
    staking,
    stakingHelper,
    firstEpochTime

  beforeEach(async function () {
    deployer = await ethers.getSigner()

    firstEpochTime = (await deployer.provider.getBlock()).timestamp - 100

    const CLAM = await ethers.getContractFactory('OtterClamERC20V2')
    clam = await CLAM.deploy()
    await clam.setVault(deployer.address)

    const DAI = await ethers.getContractFactory('DAI')
    dai = await DAI.deploy(0)

    const StakedCLAM = await ethers.getContractFactory('StakedOtterClamERC20V2')
    sClam = await StakedCLAM.deploy()

    const PEARL = await ethers.getContractFactory('OtterPearlERC20')
    pearl = await PEARL.deploy(sClam.address)

    const Treasury = await ethers.getContractFactory('OtterTreasury')
    treasury = await Treasury.deploy(
      clam.address,
      dai.address,
      zeroAddress,
      zeroAddress,
      0
    )

    const StakingDistributor = await ethers.getContractFactory(
      'OtterStakingDistributor'
    )
    stakingDistributor = await StakingDistributor.deploy(
      treasury.address,
      clam.address,
      epochLength,
      firstEpochTime
    )

    const Staking = await ethers.getContractFactory('OtterStaking')
    staking = await Staking.deploy(
      clam.address,
      sClam.address,
      epochLength,
      firstEpochNumber,
      firstEpochTime
    )

    // Deploy staking helper
    const StakingHelper = await ethers.getContractFactory('OtterStakingHelper')
    stakingHelper = await StakingHelper.deploy(staking.address, clam.address)

    const StakingWarmup = await ethers.getContractFactory('OtterStakingWarmup')
    const stakingWarmup = await StakingWarmup.deploy(
      staking.address,
      sClam.address
    )

    await sClam.initialize(staking.address)
    await sClam.setIndex(initialIndex)

    await staking.setContract('0', stakingDistributor.address)
    await staking.setContract('1', stakingWarmup.address)

    await stakingDistributor.addRecipient(staking.address, initialRewardRate)

    await clam.setVault(treasury.address)

    // queue and toggle reward manager
    await treasury.queue('8', stakingDistributor.address)
    await treasury.toggle('8', stakingDistributor.address, zeroAddress)

    // queue and toggle deployer reserve depositor
    await treasury.queue('0', deployer.address)
    await treasury.toggle('0', deployer.address, zeroAddress)

    await clam.approve(stakingHelper.address, largeApproval)
    await dai.approve(treasury.address, largeApproval)

    // mint 1,000,000 DAI for testing
    await dai.mint(
      deployer.address,
      BigNumber.from(100 * 10000).mul(BigNumber.from(10).pow(18))
    )
  })

  it('should able wrap and unwrap', async function () {
    await expect(() =>
      treasury.deposit(
        BigNumber.from(100 * 10000).mul(BigNumber.from(10).pow(18)),
        dai.address,
        BigNumber.from(750000).mul(BigNumber.from(10).pow(9))
      )
    ).to.changeTokenBalance(
      clam,
      deployer,
      BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(9))
    )

    await expect(() =>
      stakingHelper.stake(
        BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(9)),
        deployer.address
      )
    ).to.changeTokenBalance(
      sClam,
      deployer,
      BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(9))
    )

    await sClam.approve(
      pearl.address,
      BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(9))
    )

    await expect(() =>
      pearl.wrap(BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(9)))
    ).to.changeTokenBalance(
      pearl,
      deployer,
      BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(18))
    )

    await expect(() =>
      pearl.unwrap(BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(18)))
    ).to.changeTokenBalance(
      sClam,
      deployer,
      BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(9))
    )
  })

  it('should able wrap and unwrap after rebase', async function () {
    await expect(() =>
      treasury.deposit(
        BigNumber.from(100 * 10000).mul(BigNumber.from(10).pow(18)),
        dai.address,
        BigNumber.from(750000).mul(BigNumber.from(10).pow(9))
      )
    ).to.changeTokenBalance(
      clam,
      deployer,
      BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(9))
    )

    await expect(() =>
      stakingHelper.stake(
        BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(9)),
        deployer.address
      )
    ).to.changeTokenBalance(
      sClam,
      deployer,
      BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(9))
    )

    await sClam.approve(
      pearl.address,
      BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(9))
    )

    await expect(() =>
      pearl.wrap(BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(9)))
    ).to.changeTokenBalance(
      pearl,
      deployer,
      BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(18))
    )
    expect(await sClam.balanceOf(deployer.address)).to.equal(0)

    // 0 -> 1 no reward
    await staking.rebase()
    expect(await sClam.index()).to.equal(initialIndex)

    // 1 -> 2
    await timeAndMine.setTimeIncrease(86400 / 3 + 1)
    await staking.rebase()
    const currentIndex = await sClam.index()
    expect(currentIndex).to.equal(1003000000)

    await expect(() =>
      pearl.unwrap(BigNumber.from(25 * 10000).mul(BigNumber.from(10).pow(18)))
    ).to.changeTokenBalance(
      sClam,
      deployer,
      BigNumber.from(250750).mul(BigNumber.from(10).pow(9))
    )
  })
})
