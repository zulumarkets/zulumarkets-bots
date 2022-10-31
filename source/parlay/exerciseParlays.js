require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");

const parlayData = require("../../contracts/ParlayData.js");
const gamesConsumer = require("../../contracts/GamesConsumer.js");

let parlaysToBeExercised = [];
const dataParlay = new ethers.Contract(
  process.env.PARLAY_DATA_CONTRACT,
  parlayData.parlayDataContract.abi,
  wallet
);
const consumer = new ethers.Contract(
  process.env.CONSUMER_CONTRACT,
  gamesConsumer.gamesConsumerContract.abi,
  wallet
);

async function collectExercisableParlays(
  sportMarketAddress,
  sportMarketId,
  sportMarketOutcome
) {
  let sportMarketOptionsCount;
  sportMarketOptionsCount = (await consumer.isSportTwoPositionsSport(
    sportMarketId
  ))
    ? 2
    : 3;
  console.log(
    "\n market: ",
    sportMarketAddress,
    " | optionsCount: ",
    sportMarketOptionsCount,
    " | outcome: ",
    sportMarketOutcome
  );

  // check to exercise the already lost with the outcome or cancelled

  let numOfParlaysPerGamePosition = await dataParlay.numOfParlaysInGamePosition(
    sportMarketAddress,
    sportMarketOutcome
  );
  console.log(
    "# of parlays with outcome",
    sportMarketOutcome,
    " : ",
    parseInt(numOfParlaysPerGamePosition)
  );
  if (parseInt(numOfParlaysPerGamePosition) > 0) {
    let parlayMarket;
    let parlayMarketDetails;
    for (let j = 0; j < parseInt(numOfParlaysPerGamePosition); j++) {
      parlayMarket = await dataParlay.gameAddressPositionParlay(
        sportMarketAddress,
        sportMarketOutcome,
        j
      );
      console.log("--> ", j, " checking parlay ", parlayMarket);
      parlayMarketDetails = await dataParlay.parlayDetails(parlayMarket);
      if (parlayMarketDetails.alreadyLost) {
        // exercise parlay
        if (!parlaysToBeExercised.includes(parlayMarket)) {
          console.log("parlay: ", parlayMarket, " already lost!");
          parlaysToBeExercised.push(parlayMarket);
        }
      }
    }
  }
  console.log("CHECKING DIFFERENT OUTCOMES --->");
  if (sportMarketOptionsCount > 2) {
    console.log("--> three option sport");
    let differentOutcome;
    if (sportMarketOutcome == 1) {
      sportMarketOutcome = 2;
      differentOutcome = 3;
    } else if (sportMarketOutcome == 2) {
      sportMarketOutcome = 1;
      differentOutcome = 3;
    } else if (sportMarketOutcome == 3) {
      sportMarketOutcome = 1;
      differentOutcome = 2;
    } else {
      differentOutcome = 0;
    }
    if (sportMarketOutcome != 0) {
      numOfParlaysPerGamePosition = await dataParlay.numOfParlaysInGamePosition(
        sportMarketAddress,
        sportMarketOutcome
      );
      console.log(
        "# of parlays with diffrent outcome",
        sportMarketOutcome,
        " : ",
        parseInt(numOfParlaysPerGamePosition)
      );
      if (parseInt(numOfParlaysPerGamePosition) > 0) {
        let parlayMarket;
        let parlayMarketDetails;
        for (let j = 0; j < parseInt(numOfParlaysPerGamePosition); j++) {
          parlayMarket = await dataParlay.gameAddressPositionParlay(
            sportMarketAddress,
            sportMarketOutcome,
            j
          );
          console.log("--> ", j, " checking parlay ", parlayMarket);
          parlayMarketDetails = await dataParlay.parlayDetails(parlayMarket);
          if (
            !parlayMarketDetails.resolved &&
            !parlayMarketDetails.alreadyLost
          ) {
            if (!parlaysToBeExercised.includes(parlayMarket)) {
              console.log("parlay: ", parlayMarket, " has not lost yet!");
              parlaysToBeExercised.push(parlayMarket);
            }
          }
        }
      }
      sportMarketOutcome = differentOutcome;
      numOfParlaysPerGamePosition = await dataParlay.numOfParlaysInGamePosition(
        sportMarketAddress,
        sportMarketOutcome
      );
      console.log(
        "# of parlays with diffrent outcome",
        sportMarketOutcome,
        " : ",
        parseInt(numOfParlaysPerGamePosition)
      );
      if (parseInt(numOfParlaysPerGamePosition) > 0) {
        let parlayMarket;
        let parlayMarketDetails;
        for (let j = 0; j < parseInt(numOfParlaysPerGamePosition); j++) {
          parlayMarket = await dataParlay.gameAddressPositionParlay(
            sportMarketAddress,
            sportMarketOutcome,
            j
          );
          console.log("--> ", j, " checking parlay ", parlayMarket);
          parlayMarketDetails = await dataParlay.parlayDetails(parlayMarket);
          if (
            !parlayMarketDetails.resolved &&
            !parlayMarketDetails.alreadyLost
          ) {
            if (!parlaysToBeExercised.includes(parlayMarket)) {
              console.log("parlay: ", parlayMarket, " has not lost yet!");
              parlaysToBeExercised.push(parlayMarket);
            }
          }
        }
      }
    }
  } else {
    if (sportMarketOutcome == 1) {
      sportMarketOutcome = 2;
    } else if (sportMarketOutcome == 2) {
      sportMarketOutcome = 1;
    }
    if (sportMarketOutcome != 0) {
      numOfParlaysPerGamePosition = await dataParlay.numOfParlaysInGamePosition(
        sportMarketAddress,
        sportMarketOutcome
      );
      console.log(
        "# of parlays with diffrent outcome",
        sportMarketOutcome,
        " : ",
        parseInt(numOfParlaysPerGamePosition)
      );
      if (parseInt(numOfParlaysPerGamePosition) > 0) {
        let parlayMarket;
        let parlayMarketDetails;
        for (let j = 0; j < parseInt(numOfParlaysPerGamePosition); j++) {
          parlayMarket = await dataParlay.gameAddressPositionParlay(
            sportMarketAddress,
            sportMarketOutcome,
            j
          );
          console.log("--> ", j, " checking parlay ", parlayMarket);
          parlayMarketDetails = await dataParlay.parlayDetails(parlayMarket);
          if (
            !parlayMarketDetails.resolved &&
            !parlayMarketDetails.alreadyLost
          ) {
            if (!parlaysToBeExercised.includes(parlayMarket)) {
              parlaysToBeExercised.push(parlayMarket);
            }
            // exercise parlay
          }
        }
      }
    }
  }
}

async function exerciseHistory(blocksInHistory) {
  console.log("Go back ", blocksInHistory, " blocks");
  let latestBlock = await constants.etherprovider.getBlockNumber();
  let startBlock = latestBlock - blocksInHistory;
  if (blocksInHistory != 0) {
    let eventFilter = consumer.filters.ResolveSportsMarket();
    let events = await consumer.queryFilter(
      eventFilter,
      startBlock,
      latestBlock
    );
    if (events.length > 0) {
      let sportMarketAddress;
      let sportMarketId;
      let sportMarketOutcome;
      let sportMarketOptionsCount;
      for (let i = 0; i < events.length; i++) {
        sportMarketAddress = events[i].args._marketAddress;
        sportMarketId = events[i].args._id;
        sportMarketOutcome = parseInt(events[i].args._outcome);
        await collectExercisableParlays(
          sportMarketAddress,
          sportMarketId,
          sportMarketOutcome
        );
      }
      if (parlaysToBeExercised.length > 0) {
        console.log("Parlays to be exercised: ", parlaysToBeExercised);
      }
    }
  }
}

async function doExercise() {
  // exercise parlays
}

async function doIndefinitely() {
  var numberOfExecution = 0;
  while (true) {
    try {
      console.log("---------START EXERCISE EXECUTION---------");
      console.log("Time: " + new Date());
      if (parlaysToBeExercised.length > 0) {
        console.log("Execution number: " + numberOfExecution);
        console.log("Number of parlays: " + parlaysToBeExercised.length);
        await doExercise();
        numberOfExecution++;
      } else {
        console.log("[       Nothing to exercise       ]");
      }
      console.log("---------END EXERCISE EXECUTION---------");
      await delay(process.env.EXERCISE_FREQUENCY);
    } catch (e) {
      console.log(e);
      // wait next process
      await delay(process.env.EXERCISE_FREQUENCY);
    }
  }
}

if (parseInt(process.env.BLOCKS_BACK_IN_HISTORY) > 0) {
  console.log("EXERCISING HISTORY......");
  exerciseHistory(process.env.BLOCKS_BACK_IN_HISTORY);
}
consumer.on("ResolveSportsMarket", (_marketAddress, _id, _outcome) => {
  console.log(
    "======> New Market resolved =========> ",
    _marketAddress,
    _id,
    _outcome
  );
  try {
    collectExercisableParlays(_marketAddress, _id, _outcome);
  } catch (e) {
    console.log(e);
  }
});
console.log("Resolve listener started");
doIndefinitely();

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
