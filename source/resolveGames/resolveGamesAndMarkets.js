require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
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

  const EXPECTED_GAME_DURATIN = {
    3: process.env.EXPECTED_GAME_MLB,
    10: process.env.EXPECTED_GAME_FOOTBAL,
  };

  const jobId = bytes32({ input: process.env.JOB_ID_RESOLVE });

  const baseUrl = process.env.RUNDOWN_BASE_URL;

  // resolve market
  const market = process.env.MARKET_RESOLVE;

  console.log("Resolving Games...");

  console.log("JOB ID =  " + jobId);
  console.log("MARKET =  " + market);

  let unproccessedGames = await queues.getLengthUnproccessedGames();
  console.log("GAMES length = " + unproccessedGames);

  // do for all games
  for (let j = 0; j < unproccessedGames; j++) {
    let gameID = await queues.unproccessedGames(j);
    console.log("GAME ID: " + gameID);

    let stringId = bytes32({ input: gameID });
    console.log("Game id as string: " + stringId);

    let sportId = await consumer.sportsIdPerGame(gameID);
    console.log("Sport ID: " + sportId);

    let gameStart = await queues.gameStartPerGameId(gameID);
    console.log("GAME start: " + gameStart);

    console.log(
      "Time for sport ending: " +
        parseInt(EXPECTED_GAME_DURATIN[parseInt(sportId)])
    );

    let expectedTimeToProcess =
      parseInt(gameStart) + parseInt(EXPECTED_GAME_DURATIN[parseInt(sportId)]); // add hours  .env
    let expectedTimeToProcessInMiliseconds =
      parseInt(expectedTimeToProcess) * parseInt(process.env.MILISECONDS); // miliseconds
    console.log(
      "Time of processing (gameStart + .env): " +
        parseInt(expectedTimeToProcess)
    );
    console.log(
      "Time of processing (miliseconds): " + expectedTimeToProcessInMiliseconds
    );

    let timeInMiliseconds = new Date().getTime(); // miliseconds
    console.log("Time is:  " + timeInMiliseconds);

    let isGameResultAlreadyFulfilled = await consumer.gameFulfilledResolved(
      gameID
    );
    console.log(
      "Result already in a contract: " + isGameResultAlreadyFulfilled
    );

    // check if expected time
    if (
      expectedTimeToProcessInMiliseconds < timeInMiliseconds &&
      !isGameResultAlreadyFulfilled
    ) {
      console.log(
        "Date in request: " +
          dateConverter(gameStart * parseInt(process.env.MILISECONDS))
      );

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
      console.log(
        "On to the next, less then expected time, or result already set in a contract"
      );
      continue;
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
      let gameIds = [];
      for (let i = parseInt(firstResolved); i <= parseInt(lastResolved); i++) {
        console.log("Process game from queue:  " + i);

        let gameId = await queues.gamesResolvedQueue(i);
        console.log("GameID: " + gameId);

        let marketAddress = await consumer.marketPerGameId(gameId);
        console.log("Market resolved address: " + marketAddress);

        gameIds.push(gameId);

        if (
          (gameIds.length > 0 &&
            gameIds.length % process.env.RESOLVE_BATCH == 0) ||
          parseInt(lastResolved) == i
        ) {
          try {
            // send all ids
            let tx = await consumer.resolveAllMarketsForGames(gameIds);

            await tx.wait().then((e) => {
              console.log(
                "Market resolve for number of games: " + gameIds.length
              );
              console.log(gameIds);
            });

            await delay(1000); // wait to be populated

            gameIds = [];
          } catch (e) {
            console.log(e);
            break;
          }
        } else {
          continue;
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
    await delay(process.env.RESOLVE_FREQUENCY);
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
