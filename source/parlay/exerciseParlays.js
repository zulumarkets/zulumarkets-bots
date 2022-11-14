require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");
const linkToken = require("../../contracts/LinkToken.js");

const parlayData = require("../../contracts/ParlayData.js");
const gamesConsumer = require("../../contracts/GamesConsumer.js");

const Discord = require("discord.js");
const overtimeBot = new Discord.Client();
overtimeBot.login(process.env.BOT_OVERTIME_RESOLVER);

let parlaysToBeExercised = [];
let newResolved = [];
let firstRun = false;
let historyUnprocessed = true;
let exerciseDate;
let exerciseHistoryTime = new Date();

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

const sUSDContract = new ethers.Contract(
  process.env.SUSD_CONTRACT,
  linkToken.linkTokenContract.abi,
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
  let cancelOutcome = false;
  let numOfParlaysPerGamePosition;
  let numOfParlaysPerGamePositionArray;
  // check to exercise the already lost with the outcome or cancelled
  if (sportMarketOutcome == 0) {
    console.log("merket cancelled!");
    numOfParlaysPerGamePositionArray = [];
    cancelOutcome = true;
    let singleOutcomeNumOfParlaysPerGame;
    for (let i = 0; i < sportMarketOptionsCount; i++) {
      singleOutcomeNumOfParlaysPerGame =
        await dataParlay.numOfParlaysInGamePosition(sportMarketAddress, i);
      numOfParlaysPerGamePositionArray.push(singleOutcomeNumOfParlaysPerGame);
    }
  } else {
    sportMarketOutcome = sportMarketOutcome - 1;
    numOfParlaysPerGamePosition = await dataParlay.numOfParlaysInGamePosition(
      sportMarketAddress,
      sportMarketOutcome
    );
    console.log(
      "# of parlays with outcome",
      sportMarketOutcome + 1,
      " : ",
      parseInt(numOfParlaysPerGamePosition)
    );
  }

  if (!cancelOutcome && parseInt(numOfParlaysPerGamePosition) > 0) {
    let parlayMarket;
    let parlayMarketDetails;
    for (let j = 0; j < parseInt(numOfParlaysPerGamePosition); j++) {
      parlayMarket = await dataParlay.gameAddressPositionParlay(
        sportMarketAddress,
        sportMarketOutcome,
        j
      );
      console.log("--> ", j, " checking parlay ", parlayMarket);
      parlayMarketDetails = await dataParlay.getParlayOutcomeDetails(
        parlayMarket
      );
      console.log(
        "initialized: ",
        parlayMarketDetails.initialized,
        "| resolved: ",
        parlayMarketDetails.resolved,
        "| alreadyLost: ",
        parlayMarketDetails.alreadyLost,
        "| fundsIssued: ",
        parlayMarketDetails.fundsIssued
      );
      if (
        parlayMarketDetails.initialized &&
        parlayMarketDetails.alreadyLost &&
        !parlayMarketDetails.fundsIssued
      ) {
        // exercise parlay
        if (!parlaysToBeExercised.includes(parlayMarket)) {
          console.log(
            "parlay: ",
            parlayMarket,
            " already lost! Added for exercise..."
          );
          parlaysToBeExercised.push(parlayMarket);
        }
      }
    }
  } else if (cancelOutcome) {
    for (let n = 0; n < numOfParlaysPerGamePositionArray.length; n++) {
      console.log(
        "cancelled market has parlays with outcome",
        n + 1,
        ": ",
        parseInt(numOfParlaysPerGamePositionArray[n])
      );
      for (let j = 0; j < numOfParlaysPerGamePositionArray[n]; j++) {
        parlayMarket = await dataParlay.gameAddressPositionParlay(
          sportMarketAddress,
          n + 1,
          j
        );
        console.log("--> ", j, " checking parlay ", parlayMarket);
        parlayMarketDetails = await dataParlay.getParlayOutcomeDetails(
          parlayMarket
        );
        console.log(
          "initialized: ",
          parlayMarketDetails.initialized,
          "| resolved: ",
          parlayMarketDetails.resolved,
          "| alreadyLost: ",
          parlayMarketDetails.alreadyLost,
          "| fundsIssued: ",
          parlayMarketDetails.fundsIssued
        );
        if (
          parlayMarketDetails.initialized &&
          parlayMarketDetails.alreadyLost &&
          !parlayMarketDetails.fundsIssued
        ) {
          // exercise parlay
          if (!parlaysToBeExercised.includes(parlayMarket)) {
            console.log(
              "parlay: ",
              parlayMarket,
              " already lost! Added for exercise..."
            );
            parlaysToBeExercised.push(parlayMarket);
          }
        }
      }
    }
  }

  if (!cancelOutcome && sportMarketOptionsCount > 2) {
    console.log("CHECKING DIFFERENT OUTCOMES --->");
    console.log("--> three option sport");
    let differentOutcome;
    if (sportMarketOutcome == 0) {
      sportMarketOutcome = 1;
      differentOutcome = 2;
    } else if (sportMarketOutcome == 1) {
      sportMarketOutcome = 0;
      differentOutcome = 2;
    } else if (sportMarketOutcome == 2) {
      sportMarketOutcome = 0;
      differentOutcome = 1;
    } else {
      differentOutcome = 0;
    }

    numOfParlaysPerGamePosition = await dataParlay.numOfParlaysInGamePosition(
      sportMarketAddress,
      sportMarketOutcome
    );
    console.log(
      "# of parlays with diffrent outcome",
      sportMarketOutcome + 1,
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
        parlayMarketDetails = await dataParlay.getParlayOutcomeDetails(
          parlayMarket
        );
        console.log(
          "initialized: ",
          parlayMarketDetails.initialized,
          "| resolved: ",
          parlayMarketDetails.resolved,
          "| alreadyLost: ",
          parlayMarketDetails.alreadyLost,
          "| fundsIssued: ",
          parlayMarketDetails.fundsIssued
        );
        if (
          parlayMarketDetails.initialized &&
          !parlayMarketDetails.resolved &&
          !parlayMarketDetails.alreadyLost
        ) {
          if (!parlaysToBeExercised.includes(parlayMarket)) {
            console.log(
              "parlay: ",
              parlayMarket,
              " has not lost yet! Added for exercise..."
            );
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
      sportMarketOutcome + 1,
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
        parlayMarketDetails = await dataParlay.getParlayOutcomeDetails(
          parlayMarket
        );
        console.log(
          "initialized: ",
          parlayMarketDetails.initialized,
          "| resolved: ",
          parlayMarketDetails.resolved,
          "| alreadyLost: ",
          parlayMarketDetails.alreadyLost,
          "| fundsIssued: ",
          parlayMarketDetails.fundsIssued
        );
        if (
          parlayMarketDetails.initialized &&
          !parlayMarketDetails.resolved &&
          !parlayMarketDetails.alreadyLost
        ) {
          if (!parlaysToBeExercised.includes(parlayMarket)) {
            console.log(
              "parlay: ",
              parlayMarket,
              " has not lost yet! Added for exercise..."
            );
            parlaysToBeExercised.push(parlayMarket);
          }
        }
      }
    }
  } else if (!cancelOutcome) {
    console.log("CHECKING DIFFERENT OUTCOMES --->");
    if (sportMarketOutcome == 0) {
      sportMarketOutcome = 1;
    } else if (sportMarketOutcome == 1) {
      sportMarketOutcome = 0;
    }
    numOfParlaysPerGamePosition = await dataParlay.numOfParlaysInGamePosition(
      sportMarketAddress,
      sportMarketOutcome
    );
    console.log(
      "# of parlays with diffrent outcome",
      sportMarketOutcome + 1,
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
        parlayMarketDetails = await dataParlay.getParlayOutcomeDetails(
          parlayMarket
        );
        console.log(
          "initialized: ",
          parlayMarketDetails.initialized,
          "| resolved: ",
          parlayMarketDetails.resolved,
          "| alreadyLost: ",
          parlayMarketDetails.alreadyLost,
          "| fundsIssued: ",
          parlayMarketDetails.fundsIssued
        );
        if (
          parlayMarketDetails.initialized &&
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

async function sendInfoMessageToDiscord(
  numOfExercisedParlays,
  txID,
  balanceBefore,
  balanceAfter
) {
  var message = new Discord.MessageEmbed();

  message
    .addFields(
      {
        name: "BATCH of Parlays exercised: ",
        value: numOfExercisedParlays + "\u200b",
      },
      {
        name: "Tx:",
        value:
          "[" + txID + "](https://optimistic.etherscan.io/tx/" + txID + ")",
      },
      {
        name: ":information_source: Parlay AMM balance:",
        value:
          "before: " +
          balanceBefore +
          "\nafter ::: " +
          balanceAfter +
          "\nprofit :: " +
          (parseFloat(balanceAfter) - parseFloat(balanceBefore)) +
          " sUSD",
      },
      {
        name: ":alarm_clock: Timestamp:",
        value: new Date(new Date().toUTCString()),
      }
    )
    .setColor("#0037ff");
  let overtimeCreate = await overtimeBot.channels.fetch("1039869584372662332");
  await overtimeCreate.send(message);
}

async function sendErrorMessageToDiscord(messageForPrint) {
  var message = new Discord.MessageEmbed();

  message
    .addFields(
      {
        name: "Error on parlay exercise bot!",
        value: "\u200b",
      },
      {
        name: ":exclamation: message:",
        value: messageForPrint,
      },
      {
        name: ":alarm_clock: Timestamp:",
        value: new Date(new Date().toUTCString()),
      }
    )
    .setColor("#0037ff");
  let overtimeCreate = await overtimeBot.channels.fetch("1040194485436563486");
  await overtimeCreate.send(message);
}

async function exerciseHistory(blocksInHistory) {
  console.log("Go back ", blocksInHistory, " blocks");
  let latestBlock = await constants.etherprovider.getBlockNumber();
  console.log("Latest block:", parseInt(latestBlock));
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
  let tx;
  if (exerciseParlays.length > 0) {
    if(exerciseParlays.length > 20) {
      let batch = [];
        for(let i=0; i<exerciseParlays.length; i++ ){
          batch.push(exerciseParlays[i]);
          if(batch.length == 20) {
            tx = await dataParlay.exerciseParlays(batch, {
              gasLimit: process.env.GAS_LIMIT,
            });
        
            await tx.wait().then((e) => {
              console.log("Parlays exercised");
              console.log(batch);
            });
            batch = [];
          }
        }
        if(batch.length > 0) {
          tx = await dataParlay.exerciseParlays(batch, {
            gasLimit: process.env.GAS_LIMIT,
          });
      
          await tx.wait().then((e) => {
            console.log("Parlays exercised");
            console.log(batch);
          });
        }
      }
      else {
        tx = await dataParlay.exerciseParlays(exerciseParlays, {
          gasLimit: process.env.GAS_LIMIT,
        });
    
        await tx.wait().then((e) => {
          console.log("Parlays exercised");
          console.log(exerciseParlays);
        });
      }
  }
    // let tx = await dataParlay.exerciseParlays(exerciseParlays, {
    //   gasLimit: process.env.GAS_LIMIT,
    // });

    // await tx.wait().then((e) => {
    //   console.log("Parlays exercised");
    //   console.log(exerciseParlays);
    // });
    await delay(5000);
    return tx.hash;
}

async function doIndefinitely() {
  var numberOfExecution = 0;
  while (true) {
    try {
      console.log("\x1b[35m--------- START PARLAYS CHECK ---------\x1b[0m");
      let timeNow = new Date();
      console.log("Time: " + timeNow);
      console.log("Exercise after: " + exerciseDate);
      console.log("History after: " + exerciseHistoryTime);
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
        if (parlaysToBeExercised.length > 0) {
          console.log(
            "\n\x1b[33m::Parlays to be exercised: ",
            parlaysToBeExercised.length
          );
        }
      }
      if (timeNow >= exerciseDate && parlaysToBeExercised.length > 0) {
        console.log(
          "\x1b[33m:::::::::::::: Exercise parlays ::::::::::::::\x1b[0m"
        );
        console.log("Number of parlays: " + parlaysToBeExercised.length);
        console.log("Execution: " + numberOfExecution);
        let init_balance = await sUSDContract.balanceOf(
          process.env.PARLAY_AMM_CONTRACT
        );
        init_balance = ethers.utils.formatEther(init_balance);
        console.log("AMM balance: ", parseFloat(init_balance));
        let exerciseParlays = parlaysToBeExercised;
        parlaysToBeExercised = [];
        let txID = await doExercise(exerciseParlays);
        exerciseDate.setMilliseconds(
          timeNow.getMilliseconds() +
            parseInt(process.env.EXERCISE_PARLAYS_FREQUENCY)
        );
        let balance = await sUSDContract.balanceOf(
          process.env.PARLAY_AMM_CONTRACT
        );
        balance = ethers.utils.formatEther(balance);
        console.log("AMM balance after: ", parseFloat(balance));
        console.log(
          "AMM retrieved: ",
          parseFloat(balance) - parseFloat(init_balance)
        );
        await sendInfoMessageToDiscord(
          exerciseParlays.length,
          txID,
          parseFloat(init_balance),
          parseFloat(balance)
        );
        numberOfExecution++;
      } else if (timeNow >= exerciseHistoryTime) {
        console.log("Exercising history....");
        let currentTime = new Date();
        exerciseHistoryTime.setMilliseconds(
          currentTime.getMilliseconds() +
            parseInt(process.env.EXERCISE_PARLAY_HISTORY)
        );
        await exerciseHistory(process.env.BLOCKS_BACK_IN_HISTORY);
      } else if (timeNow >= exerciseDate) {
        console.log("[       Nothing to exercise       ]");
        exerciseDate.setMilliseconds(
          timeNow.getMilliseconds() +
            parseInt(process.env.EXERCISE_PARLAYS_FREQUENCY)
        );
      }
      console.log("\x1b[34m--------- END PARLAYS CHECK ---------\x1b[0m");
      if (firstRun) {
        firstRun = false;
        await delay(5000);
      } else {
        await delay(process.env.EXERCISE_FREQUENCY);
      }
    } catch (e) {
      console.log(e);
      // wait next process
      sendErrorMessageToDiscord(
        "Please check parlay-exerciser, error on execution: " +
          numberOfExecution +
          ", date: " +
          new Date()
      );
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
  let currentTime = new Date();
  exerciseHistoryTime.setMilliseconds(
    currentTime.getMilliseconds() +
      parseInt(process.env.EXERCISE_PARLAY_HISTORY)
  );
}
exerciseDate = new Date();
exerciseDate.setMilliseconds(
  exerciseDate.getMilliseconds() +
    parseInt(process.env.EXERCISE_PARLAYS_FREQUENCY)
);
consumer.on("ResolveSportsMarket", (_marketAddress, _id, _outcome) => {
  console.log(
    "\x1b[37m=========> New Market resolved =========> \x1b[0m\n",
    _marketAddress,
    "\nid: ",
    _id,
    "\noutcome: ",
    parseInt(_outcome)
  );
  newResolved.push({
    address: _marketAddress,
    id: _id,
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
