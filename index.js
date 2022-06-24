require("dotenv").config();
const ONE_INCH_CONTRACTS = {
  1: "0x3ef51736315f52d568d6d2cf289419b9cfffe782",
  10: "0xb707d89d29c189421163515c59e42147371d6857",
  3: "",
  4: "",
  5: "",
  42: "",
  69: "",
};

const { synthetix } = require("@synthetixio/js");
const snxjs = synthetix({ networkId: process.env.NETWORK_ID });

const allowances = require("./source/allowances.js");
const marketchecker = require("./source/marketschecker.js");

async function doLoop() {
  await allowances.checkAllowanceAndAllow(
    "0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9",
    ONE_INCH_CONTRACTS[process.env.NETWORK_ID]
  );
  await allowances.checkAllowanceAndAllow(
    "0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9",
    process.env.MARKET_MANAGER
  );
  while (true) {
    try {
      await doMain();
    } catch (e) {
      console.log(e);
    }
  }
}

async function doMain() {
  console.log("----------------------------");
  console.log("Started checking all markets");

  await marketchecker.processOpenMarkets();
  console.log("Finished checking all markets");
  console.log("----------------------------");
}

if (process.env.DO_RESOLVING == "true") {
  doMaturedLoop();
}

if (process.env.DO_ORDERS == "true") {
  doLoop();
}

async function doMaturedLoop() {
  while (true) {
    try {
      await marketchecker.processMaturedMarkets();
      await delay(1000 * 120);
    } catch (e) {
      console.log(e);
    }
  }
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
