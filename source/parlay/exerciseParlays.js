require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");

const parlayData = require("../../contracts/ParlayData.js");
const gamesConsumer = require("../../contracts/GamesConsumer.js");

let parlaysToBeExercised = [];
let newResolved = [];
let firstRun = false;
let historyUnprocessed = true;

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
  number,
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
    "\n",
    number,
    " market: ",
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
      parlayMarketDetails = await dataParlay.getParlayOutcomeDetails(parlayMarket);
      console.log("initialized: ", parlayMarketDetails.initialized, "| resolved: ", parlayMarketDetails.resolved, "| alreadyLost: ", parlayMarketDetails.alreadyLost);
      if (parlayMarketDetails.initialized && parlayMarketDetails.alreadyLost) {
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
          parlayMarketDetails = await dataParlay.getParlayOutcomeDetails(parlayMarket);
          console.log("initialized: ", parlayMarketDetails.initialized, "| resolved: ", parlayMarketDetails.resolved, "| alreadyLost: ", parlayMarketDetails.alreadyLost);
          if ( parlayMarketDetails.initialized &&
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
          parlayMarketDetails = await dataParlay.getParlayOutcomeDetails(parlayMarket);
          console.log("initialized: ", parlayMarketDetails.initialized, "| resolved: ", parlayMarketDetails.resolved, "| alreadyLost: ", parlayMarketDetails.alreadyLost);
          if ( parlayMarketDetails.initialized &&
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
          parlayMarketDetails = await dataParlay.getParlayOutcomeDetails(parlayMarket);
          console.log("initialized: ", parlayMarketDetails.initialized, "| resolved: ", parlayMarketDetails.resolved, "| alreadyLost: ", parlayMarketDetails.alreadyLost);
          if ( parlayMarketDetails.initialized &&
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
        newResolved.push({
          address: sportMarketAddress,
          id: sportMarketId,
          outcome: sportMarketOutcome,
        });
      }
      if (parlaysToBeExercised.length > 0) {
        console.log("Parlays to be exercised: ", parlaysToBeExercised);
      }
    }
  }
}

async function doExercise(exerciseParlays) {
  // exercise parlays
  if (exerciseParlays.length > 0) {
    let tx = await dataParlay.exerciseParlays(exerciseParlays, {
      gasLimit: process.env.GAS_LIMIT,
    });

    await tx.wait().then((e) => {
      console.log("Parlays exercised");
      console.log(exerciseParlays);
    });
    await delay(5000);
  }
}

async function doIndefinitely() {
  var numberOfExecution = 0;
  while (true) {
    try {
      console.log("\x1b[35m---------START EXERCISE EXECUTION---------\x1b[0m");
      console.log("Time: " + new Date());
      if (newResolved.length > 0) {
        let checkResolved = newResolved;
        newResolved = [];
        console.log(
          "\x1b[32m:::::::::::::: Collecting parlays for exercise ::::::::::::::\x1b[0m"
        );
        console.log(
          "\x1b[32m:::::::::::::: Markets:                  ",
          checkResolved.length,
          " \x1b[32m::::::::::::::\x1b[0m"
        );
        for (let i = 0; i < checkResolved.length; i++) {
          await collectExercisableParlays(
            i,
            checkResolved[i].address,
            checkResolved[i].id,
            checkResolved[i].outcome
          );
        }
      }
      if (parlaysToBeExercised.length > 0) {
        console.log(
          "\x1b[33m:::::::::::::: Exercise parlays ::::::::::::::\x1b[0m"
        );
        console.log("Number of parlays: " + parlaysToBeExercised.length);
        let exerciseParlays = parlaysToBeExercised;
        parlaysToBeExercised = [];
        await doExercise(exerciseParlays);
        numberOfExecution++;
      } else {
        console.log("[       Nothing to exercise       ]");
      }
      console.log("\x1b[34m---------END EXERCISE EXECUTION---------\x1b[0m");
      if (firstRun) {
        firstRun = false;
        await delay(5000);
      } else {
        await delay(process.env.EXERCISE_FREQUENCY);
      }
    } catch (e) {
      console.log(e);
      // wait next process
      await delay(process.env.EXERCISE_FREQUENCY);
    }
  }
}

//MAIN __________________________________________________________________________________

if (parseInt(process.env.BLOCKS_BACK_IN_HISTORY) > 0 && historyUnprocessed) {
  firstRun = true;
  historyUnprocessed = false;
  console.log("EXERCISING HISTORY......");
  exerciseHistory(process.env.BLOCKS_BACK_IN_HISTORY);
}
consumer.on("ResolveSportsMarket", (_marketAddress, _id, _outcome) => {
  console.log(
    "\x1b[37m=========> New Market resolved =========> \x1b[0m\n",
    _marketAddress,
    "\nid: ",
    parseInt(_id),
    "\noutcome: ",
    parseInt(_outcome)
  );
  newResolved.push({
    address: _marketAddress,
    id: parseInt(_id),
    outcome: parseInt(_outcome),
  });
});
console.log("Resolve listener started");
doIndefinitely();

//end MAIN __________________________________________________________________________________

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
