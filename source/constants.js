const ethers = require("ethers");
require("dotenv").config();
const privateKey = process.env.PRIVATE_KEY;
let etherprovider;
if (process.env.NETWORK_ID == 420) {
  etherprovider = new ethers.providers.JsonRpcProvider(
    "https://goerli.optimism.io",
    { chainId: Number(process.env.NETWORK_ID), name: process.env.NETWORK }
  );
} else {
  etherprovider = new ethers.providers.InfuraProvider(
    { chainId: Number(process.env.NETWORK_ID), name: process.env.NETWORK },
    process.env.INFURA
  );
}
let baseUrl = process.env.BASE_URL;

module.exports = {
  privateKey,
  etherprovider,
  baseUrl,
};
