require("dotenv").config();
const ethers = require("ethers");
const privateKey = process.env.PRIVATE_KEY;
const etherprovider = new ethers.providers.InfuraProvider(
  process.env.NETWORK,
  process.env.INFURA
);
const web3Wrapper = require("@0x/web3-wrapper");

const contractWrapper = require("@0x/contract-wrappers");

const ammABI = require("/amm");

const wallet = new ethers.Wallet(privateKey, etherprovider);
async function dozerox() {
  const exchangeContract = new ethers.Contract(
    "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
    contractWrapper.IZeroExContract.ABI(),
    wallet
  );
  let tx = await exchangeContract.transferProtocolFeesForPools([
    "0x000000000000000000000000000000000000000000000000000000000000003d",
  ]);
  await tx.wait().then((e) => {
    console.log("done");
  });
}
 dozerox();
//doMoveStake();
async function doMoveStake() {
  const stakingContract = new ethers.Contract(
    "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
    contractWrapper.StakingContract.ABI(),
    wallet
  );
  let poolId =
    '0x000000000000000000000000000000000000000000000000000000000000003d';
  let tx = await stakingContract.moveStake(
    {
      status: 0,
      poolId:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
    },
    { status: 1, poolId },
    ethers.BigNumber.from(28000)
  );
  await tx.wait().then((e) => {
    console.log("done");
  });
}
