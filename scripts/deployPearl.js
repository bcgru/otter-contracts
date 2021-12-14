const { ethers } = require('hardhat')

async function main() {
  const StakedCLAM = await ethers.getContractFactory('StakedOtterClamERC20V2')
  const sCLAM = StakedCLAM.attach('0xAAc144Dc08cE39Ed92182dd85ded60E5000C9e67')

  const PEARL = await ethers.getContractFactory('PEARL')
  const pearl = await PEARL.deploy(sCLAM.address)
  console.log(`done, pearl address: ${pearl.address}`)
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
