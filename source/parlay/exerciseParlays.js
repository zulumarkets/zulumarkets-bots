require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");

const parlayData = require("../../contracts/ParlayData.js");

async function doExercise() {
  const dataParlay = new ethers.Contract(
    process.env.PARLAY_DATA_CONTRACT,
    parlayData.parlayDataContract.abi,
    wallet
  );
  let processed = false;
  // parlayId
  // let parlayIds = process.env.SPORT_IDS.split(",");

  while (!processed) {
    processed = true;
    console.log("ParlayData script...");

    // do for all parlayIds
    // for (let j = 0; j < parlayIds.length; j++) {
    //   // do for next X days in front
    // }
  }

  // there is new elements in queue

}

async function doIndefinitely() {
  var numberOfExecution = 0;
  while (true) {
    try {
      console.log("---------START EXERCISE EXECUTION---------");
      console.log("Execution time: " + new Date());
      console.log("Execution number: " + numberOfExecution);
      await doExercise();
      numberOfExecution++;
      console.log("---------END CREATION EXECUTION---------");
      await delay(process.env.CREATION_FREQUENCY);
    } catch (e) {
      console.log(e);
      // wait next process
      await delay(process.env.CREATION_FREQUENCY);
    }
  }
}

doIndefinitely();

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
