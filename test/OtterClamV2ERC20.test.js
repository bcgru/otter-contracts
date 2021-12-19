const { ethers } = require('hardhat')
const { expect } = require('chai')

describe('OtterClamERC20V2', function () {
  let clam2

  beforeEach(async function () {
    const CLAM2 = await ethers.getContractFactory('OtterClamERC20V2')
    clam2 = await CLAM2.deploy()
  })

  describe('complete migration', function () {
    it('should update symbol to CLAM', async function () {
      expect(await clam2.symbol()).to.eq('CLAM2')
      await clam2.completeMigration()
      expect(await clam2.symbol()).to.eq('CLAM')
    })
  })
})
