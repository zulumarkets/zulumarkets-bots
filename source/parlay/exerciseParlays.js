require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");
const linkToken = require("../../contracts/LinkToken.js");

const parlayData = require("../../contracts/ParlayData.js");
const gamesConsumer = require("../../contracts/GamesConsumer.js");
const sportManagerABI = require("../../contracts/SportManager.js");
const gamesOddsObtainer = require("../../contracts/GamesOddsObtainer.js");

const Discord = require("discord.js");
const { parse } = require("dotenv");
const overtimeBot = new Discord.Client();
overtimeBot.login(process.env.BOT_OVERTIME_RESOLVER);

let parlaysToBeExercised = [];
let newResolved = [];
let firstRun = false;
let historyUnprocessed = true;
let exerciseDate;
let exerciseHistoryTime = new Date();
let newMaturedMarkets;
let lastMaturedMarkets;

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
const sportManager = new ethers.Contract(
  process.env.SPORT_MANAGER_CONTRACT,
  sportManagerABI.sportManagerContract.abi,
  wallet
);

const sUSDContract = new ethers.Contract(
  process.env.SUSD_CONTRACT,
  linkToken.linkTokenContract.abi,
  wallet
);

const obtainer = new ethers.Contract(
  process.env.ODDS_OBTAINER_CONTRACT,
  gamesOddsObtainer.gamesOddsObtainerContract.abi,
  wallet
);

async function filterParlays(allParlays, filteredParlays) {
  console.log("Already filtered parlays: ", filteredParlays.length);
  let initialLength = filteredParlays.length;
  console.log("Total obtained parlays from contract: ", allParlays.length);
  allParlays.forEach((c) => {
    if (
      !filteredParlays.includes(c) &&
      c !== "0x0000000000000000000000000000000000000000"
    ) {
      filteredParlays.push(c);
    }
  });
  console.log("Added parlays: ", filteredParlays.length - initialLength);
  console.log("Total filtered parlays: ", filteredParlays.length);
  return filteredParlays;
}

async function sendInfoMessageToDiscord(
  numOfExercisedParlays,
  tx_batch,
  balanceBefore,
  balanceAfter
) {
  if (tx_batch.length > 0) {
    let tx_message;
    let info_message;
    var message = new Discord.MessageEmbed();
    if (tx_batch.length == 1) {
      if (process.env.NETWORK == "arbitrum") {
        tx_message =
          "[" + tx_batch[0] + "](https://arbiscan.io/tx/" + tx_batch[0] + ")";
      } else {
        tx_message =
          "[" +
          tx_batch[0] +
          "](https://optimistic.etherscan.io/tx/" +
          tx_batch[0] +
          ")";
      }
    } else {
      if (process.env.NETWORK == "arbitrum") {
        tx_message =
          "[" + tx_batch[0] + "](https://arbiscan.io/tx/" + tx_batch[0] + ")";
        tx_message +=
          "\n[" +
          tx_batch[tx_batch.length - 1] +
          "](https://arbiscan.io/tx/" +
          tx_batch[tx_batch.length - 1] +
          ")";
      } else {
        tx_message =
          "[" +
          tx_batch[0] +
          "](https://optimistic.etherscan.io/tx/" +
          tx_batch[0] +
          ")";
        tx_message +=
          "\n[" +
          tx_batch[tx_batch.length - 1] +
          "](https://optimistic.etherscan.io/tx/" +
          tx_batch[tx_batch.length - 1] +
          ")";
      }
    }
    if (parseFloat(balanceAfter) - parseFloat(balanceBefore) > 0) {
      if (process.env.NETWORK == "arbitrum") {
        info_message =
          "before: " +
          balanceBefore +
          "\nafter ::: " +
          balanceAfter +
          "\nprofit :: " +
          (parseFloat(balanceAfter) - parseFloat(balanceBefore)) +
          " USDC";
      } else {
        info_message =
          "before: " +
          balanceBefore +
          "\nafter ::: " +
          balanceAfter +
          "\nprofit :: " +
          (parseFloat(balanceAfter) - parseFloat(balanceBefore)) +
          " sUSD";
      }
    } else {
      info_message = "Parlays markets marked as lost: " + numOfExercisedParlays;
    }
    message
      .addFields(
        {
          name: "BATCH of Parlays exercised: ",
          value: numOfExercisedParlays + "\u200b",
        },
        {
          name: "Tx:",
          value: tx_message,
        },
        {
          name: ":information_source: Parlay AMM balance:",
          value: info_message,
        },
        {
          name: ":alarm_clock: Timestamp:",
          value: new Date(new Date().toUTCString()),
        }
      )
      .setColor("#0037ff");
    let overtimeCreate = await overtimeBot.channels.fetch(
      // "1039869584372662332"
      process.env.DISCORD_CHANNEL
    );
    await overtimeCreate.send(message);
  }
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
  let overtimeCreate = await overtimeBot.channels.fetch(
    process.env.DISCORD_CHANNEL_ERROR
  );
  await overtimeCreate.send(message);
}

async function exerciseHistory(startIndex, lastIndex) {
  if (startIndex < lastIndex) {
    console.log("Check ", lastIndex - startIndex, " markets");
    let sportMarketAddress = await sportManager.maturedMarkets(
      startIndex,
      lastIndex - startIndex
    );
    console.log("Markets batch: [", startIndex, ", ", lastIndex, "]");
    newResolved = sportMarketAddress;
  }
}

async function doExercise(exerciseParlays) {
  // exercise parlays
  let tx;
  let tx_batch = [];
  if (exerciseParlays.length > 0) {
    if (exerciseParlays.length > process.env.EXERCISE_BATCH) {
      let batch = [];
      for (let i = 0; i < exerciseParlays.length; i++) {
        batch.push(exerciseParlays[i]);
        if (batch.length == process.env.EXERCISE_BATCH) {
          try {
            tx = await dataParlay.exerciseParlays(batch, {
              gasLimit: process.env.GAS_LIMIT,
            });

            await tx.wait().then((e) => {
              console.log("Parlays exercised");
              console.log(batch);
            });
            await delay(5000);
            batch = [];
            tx_batch.push(tx.hash);
          } catch (e) {
            console.log(
              "ERROR IN 20 BATCH EXERCISE!\n\n>>>>>>> exercise manually:"
            );
            console.log(batch);
            batch = [];
          }
        }
      }
      if (batch.length > 0) {
        try {
          tx = await dataParlay.exerciseParlays(batch, {
            gasLimit: process.env.GAS_LIMIT,
          });
          await tx.wait().then((e) => {
            console.log("Parlays exercised");
            console.log(batch);
          });
          await delay(5000);
          tx_batch.push(tx.hash);
        } catch (e) {
          console.log("ERROR IN BATCH (<20 tx) EXERCISE!\n\n");
          console.log(batch);
          batch = [];
        }
      }
    } else {
      try {
        tx = await dataParlay.exerciseParlays(exerciseParlays, {
          gasLimit: process.env.GAS_LIMIT,
        });

        await tx.wait().then((e) => {
          console.log("Parlays exercised");
          console.log(exerciseParlays);
        });
        await delay(5000);
        tx_batch.push(tx.hash);
      } catch (e) {
        console.log("ERROR IN EXERCISE!\n\n");
      }
    }
  }
  await delay(5000);
  return tx_batch;
}

async function doIndefinitely() {
  var numberOfExecution = 0;
  while (true) {
    try {
      console.log("\x1b[35m--------- START PARLAYS CHECK ---------\x1b[0m");
      let timeNow = new Date();
      console.log("NETWORK: " + process.env.NETWORK);
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
        let allParlays = [];
        let checkSlice = [];
        let numOfMarkets = process.env.CHUNKS_OF_MARKETS_TO_CHECK;
        for (let i = 0; i <= checkResolved.length / numOfMarkets; i++) {
          console.log(
            "Checking markets [",
            i * numOfMarkets,
            ", ",
            (i + 1) * numOfMarkets,
            "]"
          );
          checkSlice = [];
          allParlays = [];
          if (i == checkResolved.length / numOfMarkets) {
            checkSlice = checkResolved.slice(
              i * numOfMarkets,
              checkResolved.length
            );
          } else {
            checkSlice = checkResolved.slice(
              i * numOfMarkets,
              (i + 1) * numOfMarkets
            );
          }
          allParlays = await dataParlay.getAllParlaysForGames(checkSlice);
          parlaysToBeExercised = await filterParlays(
            allParlays[0],
            parlaysToBeExercised
          );
          await delay(2000);
        }
        if (parlaysToBeExercised.length > 0) {
          console.log(
            "\n\x1b[33m::Parlays to be exercised: ",
            parlaysToBeExercised.length
          );
        }
      }
      if (parlaysToBeExercised.length > 0) {
        console.log(
          "\x1b[33m:::::::::::::: Exercise parlays ::::::::::::::\x1b[0m"
        );
        console.log("Number of parlays: " + parlaysToBeExercised.length);
        console.log("Execution: " + numberOfExecution);
        let init_balance = await sUSDContract.balanceOf(
          process.env.PARLAY_AMM_CONTRACT
        );
        if (process.env.NETWORK === "arbitrum") {
          init_balance = parseFloat(init_balance.toString()) / 1e6;
        } else {
          init_balance = ethers.utils.formatEther(init_balance);
        }
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
        if (process.env.NETWORK === "arbitrum") {
          balance = parseFloat(balance.toString()) / 1e6;
        } else {
          balance = ethers.utils.formatEther(balance);
        }
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
      } else if (timeNow >= exerciseHistoryTime || firstRun) {
        console.log("Exercising history....");
        let currentTime = new Date();
        exerciseHistoryTime.setMilliseconds(
          currentTime.getMilliseconds() +
            parseInt(process.env.EXERCISE_PARLAY_HISTORY)
        );
        newMaturedMarkets = await sportManager.numMaturedMarkets();
        await exerciseHistory(
          parseInt(newMaturedMarkets) - process.env.NUM_OF_MARKETS_IN_HISTORY,
          parseInt(newMaturedMarkets)
        );
        lastMaturedMarkets = parseInt(newMaturedMarkets);
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
        newMaturedMarkets = await sportManager.numMaturedMarkets();
        if (parseInt(newMaturedMarkets) > lastMaturedMarkets) {
          console.log(
            "New matured markets: ",
            parseInt(newMaturedMarkets) - lastMaturedMarkets
          );
          await exerciseHistory(
            lastMaturedMarkets,
            parseInt(newMaturedMarkets)
          );
          lastMaturedMarkets = parseInt(newMaturedMarkets);
        } else {
          console.log(
            "No new resolved markets. Matured markets so far: ",
            newMaturedMarkets.toString()
          );
        }
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

firstRun = true;
lastMaturedMarkets = 0;
exerciseDate = new Date();
exerciseDate.setMilliseconds(
  exerciseDate.getMilliseconds() +
    parseInt(process.env.EXERCISE_PARLAYS_FREQUENCY)
);
console.log("Start:\n");
console.log("Conumer contract: ", consumer.address);
console.log("GameOdds contract: ", obtainer.address);
console.log("ParlayData contract: ", dataParlay.address);
doIndefinitely();

//end MAIN __________________________________________________________________________________

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
