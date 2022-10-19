require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");

async function doExercise() {
  const dataParlay = new ethers.Contract(
    process.env.PARLAY_DATA_CONTRACT,
    parlayData.parlayDataContract.abi,
    wallet
  );

  // parlayId
  let parlayIds = process.env.SPORT_IDS.split(",");

  while (!processed) {
    processed = true;

    // do for all parlayIds
    for (let j = 0; j < parlayIds.length; j++) {
      // do for next X days in front
    }
  }

  console.log("waiting for queue to populate before Create Markets...");
  await delay(1000 * 60); // wait to be populated
  console.log("Create Markets...");

  let firstCreated = await queues.firstCreated();
  console.log("Start:  " + firstCreated);
  let lastCreated = await queues.lastCreated();
  console.log("End:  " + lastCreated);

  // there is new elements in queue

  console.log("Ended batch...");
}

async function doIndefinitely() {
  await allowances.checkAllowanceAndAllow(
    process.env.LINK_CONTRACT,
    process.env.WRAPPER_CONTRACT
  );
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
      sendErrorMessageToDiscord(
        "Please check creation-bot, error on execution: " +
          numberOfExecution +
          ", date: " +
          new Date()
      );
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
