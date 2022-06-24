require("dotenv").config();

const constants = require("../constants.js");
const thalesData = require("thales-data");
const ethers = require("ethers");
const privateKeyBuffer = Buffer.from(constants.privateKey, "hex");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const fetch = require("node-fetch");
const w3utils = require("web3-utils");
const bytes32 = require("bytes32");

const gamesQueue = require("../../scripts/GamesQueue.js");
const gamesWrapper = require("../../scripts/GamesWrapper.js");
const gamesConsumer = require("../../scripts/GamesConsumer.js");

async function doResolve() {
  const queues = new ethers.Contract(
    "0x952Af77e13e121A648Ff2aDe0b65779f45a1f496",
    gamesQueue.gamesQueueContract.abi,
    wallet
  );

  const wrapper = new ethers.Contract(
    "0xae4fB5Dc9b2371Ef994D09DB1b4F341CdED0b1d6",
    gamesWrapper.gamesWraperContract.abi,
    wallet
  );

  const consumer = new ethers.Contract(
    "0xd03f473caC24767134A86A298FeC38294986EcE6",
    gamesConsumer.gamesConsumerContract.abi,
    wallet
  );

  const jobId = bytes32({ input: process.env.JOB_ID_RESOLVE });

  const linkAmountPerRequest = w3utils.toWei(process.env.LINK_AMOUNT);

  // resolve market
  const market = process.env.MARKET_RESOLVE;

  let statuses = process.env.RESOLVE_STATUSES.split(",");

  console.log("Resolving Games...");

  let processed = false;
  while (!processed) {
    processed = true;

    console.log("JOB ID =  " + jobId);
    console.log("LINK AMOUNT =  " + linkAmountPerRequest);
    console.log("MARKET =  " + market);

    let unproccessedGames = await queues.getLengthUnproccessedGames();
    console.log("GAMES length =  " + unproccessedGames);

    // do for all games
    for (let j = 0; j < unproccessedGames; j++) {
      let gameID = await queues.unproccessedGames(j);
      console.log("GAME ID:  " + gameID);

      let stringId = bytes32({ input: gameID });
      console.log("Game id as string:  " + stringId);

      let sportId = await queues.sportPerGameId(gameID);
      console.log("Sport ID:  " + sportId);

      let gameStart = await queues.gameStartPerGameId(gameID);
      console.log("GAME start:  " + gameStart);

      let expectedTimeToProcess =
        parseInt(gameStart) + parseInt(process.env.EXPECTED_GAME_DURATIN); // add hours  .env
      let expectedTimeToProcessInMiliseconds =
        parseInt(expectedTimeToProcess) * parseInt(process.env.MILISECONDS); // miliseconds
      console.log(
        "Time of processing (gameStart + .env):  " +
          parseInt(expectedTimeToProcess)
      );
      console.log(
        "Time of processing (miliseconds):  " +
          expectedTimeToProcessInMiliseconds
      );

      let timeInMiliseconds = new Date().getTime(); // miliseconds
      console.log("Time is:  " + timeInMiliseconds);

      // check if expected time
      if (expectedTimeToProcessInMiliseconds < timeInMiliseconds) {
        let ids = [stringId];

        try {
          let tx = await wrapper.requestGamesResolveWithFilters(
            jobId,
            linkAmountPerRequest,
            market,
            sportId,
            gameStart,
            [], // add statuses for football OPTIONAL use property statuses ?? maybe IF sportId
            ids
          );

          await tx.wait().then((e) => {
            console.log(
              "Requested for: " + gameStart + " with game id: " + stringId
            );
          });
        } catch (e) {
          console.log(e);
        }
      } else {
        console.log("On to the next, less then expected time");
        continue;
      }
    }
  }

  await delay(20000); // wait to be populated
  console.log("Resolving Markets...");

  processed = false;
  while (!processed) {
    processed = true;
    let firstResolved = await queues.firstResolved();
    console.log("Start:  " + firstResolved);
    let lastResolved = await queues.lastResolved();
    console.log("End:  " + lastResolved);

    // there is new elements in queue
    if (parseInt(firstResolved) <= parseInt(lastResolved)) {
      console.log("Processing...");
      for (let i = parseInt(firstResolved); i <= parseInt(lastResolved); i++) {
        console.log("Process game from queue:  " + i);

        let gameId = await queues.gamesResolvedQueue(i);
        console.log("GameID: " + gameId);

        try {
          let tx = await consumer.resolveMarketForGame(gameId);

          await tx.wait().then((e) => {
            console.log("Market resolve for game: " + gameId);
          });

          let marketAddress = await consumer.marketPerGameId(gameId);
          console.log("Market resolved address: " + marketAddress);
        } catch (e) {
          i--;
          console.log(e);
        }
      }
    } else {
      console.log("Nothing to process...");
    }
  }

  console.log("Ended batch...");
}

async function doIndefinitely() {
  while (true) {
    await doResolve();
    await delay(3600 * 1000); // each hour
  }
}

doIndefinitely();

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
