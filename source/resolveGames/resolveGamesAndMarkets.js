require("dotenv").config();

const constants = require("../constants.js");
const thalesData = require("thales-data");
const ethers = require("ethers");
const privateKeyBuffer = Buffer.from(constants.privateKey, "hex");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const fetch = require("node-fetch");
const w3utils = require("web3-utils");
const bytes32 = require("bytes32");

const axios = require("axios");

const gamesQueue = require("../../contracts/GamesQueue.js");
const gamesWrapper = require("../../contracts/GamesWrapper.js");
const gamesConsumer = require("../../contracts/GamesConsumer.js");
const allowances = require("../../source/allowances.js");

async function doResolve() {

  const queues = new ethers.Contract(
    process.env.GAME_QUEUE_CONTRACT,
    gamesQueue.gamesQueueContract.abi,
    wallet
  );

  const wrapper = new ethers.Contract(
    process.env.WRAPPER_CONTRACT,
    gamesWrapper.gamesWraperContract.abi,
    wallet
  );

  const consumer = new ethers.Contract(
    process.env.CONSUMER_CONTRACT,
    gamesConsumer.gamesConsumerContract.abi,
    wallet
  );

  const jobId = bytes32({ input: process.env.JOB_ID_RESOLVE });

  const baseUrl = process.env.RUNDOWN_BASE_URL;

  // resolve market
  const market = process.env.MARKET_RESOLVE;

  console.log("Resolving Games...");

  let processed = false;
  while (!processed) {
    processed = true;

    console.log("JOB ID =  " + jobId);
    console.log("MARKET =  " + market);

    let unproccessedGames = await queues.getLengthUnproccessedGames();
    console.log("GAMES length =  " + unproccessedGames);

    // do for all games
    for (let j = 0; j < unproccessedGames; j++) {
      let gameID = await queues.unproccessedGames(j);
      console.log("GAME ID:  " + gameID);

      let stringId = bytes32({ input: gameID });
      console.log("Game id as string:  " + stringId);

      let sportId = await consumer.sportsIdPerGame(gameID);
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

        console.log("Date in request: " + dateConverter(gameStart * parseInt(process.env.MILISECONDS)));

        const urlBuild =
          baseUrl +
          "/sports/" +
          sportId +
          "/events/" +
          dateConverter(gameStart * parseInt(process.env.MILISECONDS));
        let response = await axios.get(urlBuild, {
          headers: {
            "X-RapidAPI-Key": process.env.REQUEST_KEY,
          },
        });

        const gamesListResponse = [];

        response.data.events.forEach((event) => {
          gamesListResponse.push({
            id: event.event_id,
            status: event.score.event_status,
          });
        });

        for (let n = 0; n < gamesListResponse.length; n++) {
          // if the game is in right status
          if (
            gamesListResponse[n].id == stringId &&
            (gamesListResponse[n].status == "STATUS_FINAL" ||
              gamesListResponse[n].status == "STATUS_FULL_TIME")
          ) {
            try {
              console.log("Send request...");

              let tx = await wrapper.requestGamesResolveWithFilters(
                jobId,
                market,
                sportId,
                gameStart,
                [], // add statuses for football OPTIONAL use property statuses ?? maybe IF sportId
                [stringId]
              );

              await tx.wait().then((e) => {
                console.log(
                  "Requested for: " + gameStart + " with game id: " + stringId
                );
              });
            } catch (e) {
              console.log(e);
            }
          }
        }
      } else {
        console.log("On to the next, less then expected time");
        continue;
      }
    }
  }

  await delay(10000); // wait to be populated
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
  await allowances.checkAllowanceAndAllow(
    process.env.LINK_CONTRACT,
    process.env.WRAPPER_CONTRACT
  );
  while (true) {
    await doResolve();
    await delay(900 * 1000); // each 15min.
  }
}

function dateConverter(UNIXTimestamp) {
  var date = new Date(UNIXTimestamp);
  var month = date.getUTCMonth() + 1; // starts from zero (0) -> January
  return date.getUTCFullYear() + "-" + month + "-" + date.getUTCDate();
}

doIndefinitely();

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
