const ethers = require("ethers");
require("dotenv").config();
const constants = require("./constants.js");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const linkToken = require("../contracts/LinkToken.js");

async function isAllowed(makerToken, addressToApprove) {
  try {
    const erc20Instance = new ethers.Contract(
      makerToken,
      linkToken.linkTokenContract.abi,
      wallet
    );
    const allowance = await erc20Instance.allowance(
      wallet.address,
      addressToApprove
    );
    const allowanceNumber = allowance.toString() * 1.0;
    const isAllowed = allowanceNumber > 0;
    return isAllowed;
  } catch (e) {
    console.log(e);
  }
}

async function checkAllowanceAndAllow(makerToken, addressToApprove) {
  const isAllowedToken = await isAllowed(makerToken, addressToApprove);
  if (!isAllowedToken) {
    console.log("Approving " + makerToken + " to " + addressToApprove);
    await allowToken(makerToken, addressToApprove);
    console.log(makerToken + "approved");
  }
}

async function allowToken(makerToken, addressToApprove) {
  try {
    const erc20Instance = new ethers.Contract(
      makerToken,
      linkToken.linkTokenContract.abi,
      wallet
    );
    let approveTx = await erc20Instance.approve(
      addressToApprove,
      ethers.constants.MaxUint256
    );

    await approveTx.wait().then((e) => {
      console.log(
        "approved " +
          addressToApprove +
          " on " +
          wallet.address +
          "for token: " +
          makerToken
      );
    });
  } catch (e) {
    console.log(e);
  }
}

module.exports = {
  isAllowed,
  allowToken,
  checkAllowanceAndAllow,
};
