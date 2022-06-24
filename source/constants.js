const ethers = require("ethers");
require("dotenv").config();
const privateKey = process.env.PRIVATE_KEY;
const etherprovider = new ethers.providers.InfuraProvider(
  { chainId: Number(process.env.NETWORK_ID), name: process.env.NETWORK },
  process.env.INFURA
);
let baseUrl = process.env.BASE_URL;

module.exports = {
  privateKey,
  etherprovider,
  baseUrl,
};
