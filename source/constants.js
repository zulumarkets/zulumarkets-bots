const ethers = require("ethers");
require("dotenv").config();
const privateKey = process.env.PRIVATE_KEY;
let etherprovider;

var usingBlast =
  process.env.USING_BLAST !== undefined
    ? process.env.USING_BLAST === "true"
    : false;

if (usingBlast) {
  console.log("BLAST!");
  etherprovider = new ethers.providers.JsonRpcProvider(process.env.BLAST_URL, {
    chainId: Number(process.env.NETWORK_ID),
    name: process.env.NETWORK,
  });
} else {
  if (process.env.NETWORK_ID == 420) {
    etherprovider = new ethers.providers.JsonRpcProvider(
      "https://goerli.optimism.io",
      { chainId: Number(process.env.NETWORK_ID), name: process.env.NETWORK }
    );
  } else {
    console.log("chainnodes!");
    if (
      process.env.INFURA_URL.includes("chainnodes") ||
      process.env.INFURA_URL.includes("alchemy")
    ) {
      etherprovider = new ethers.providers.JsonRpcProvider(
        process.env.INFURA_URL
      );
    } else {
      console.log("INFURA!");
      etherprovider = new ethers.providers.InfuraProvider(
        { chainId: Number(process.env.NETWORK_ID), name: process.env.NETWORK },
        process.env.INFURA
      );
    }
  }
}

let baseUrl = process.env.BASE_URL;

module.exports = {
  privateKey,
  etherprovider,
  baseUrl,
};
