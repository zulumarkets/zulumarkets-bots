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

async function doCreate() {
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

  const jobId = bytes32({ input: process.env.JOB_ID_CREATION });

  const baseUrl = process.env.RUNDOWN_BASE_URL;

  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  const market = process.env.MARKET_CREATION;

  // sportId
  let sportIds = process.env.SPORT_IDS.split(",");

  console.log("Create Games...");

  let processed = false;
  while (!processed) {
    processed = true;

    console.log("JOB ID =  " + jobId);
    console.log("MARKET =  " + market);

    // do for all sportIds
    for (let j = 0; j < sportIds.length; j++) {
      // do for next X days in front
      for (let i = 1; i <= daysInFront; i++) {
        console.log("------------------------");
        console.log("SPORT ID =  " + sportIds[j]);
        console.log("TODAY +  " + i);

        let unixDate = await getSecondsToDate(i);
        console.log("Unix date in seconds: " + unixDate);
        let unixDateMiliseconds = parseInt(unixDate) * process.env.MILISECONDS;
        console.log("Unix date in miliseconds: " + unixDateMiliseconds);

        const dayOfWeekDigit = new Date(parseInt(unixDate) * 1000).getDay();
        console.log("Day of week: " + dayOfWeekDigit);

        let sendRequestForCreate = false;

        const urlBuild =
          baseUrl +
          "/sports/" +
          sportIds[j] +
          "/events/" +
          dateConverter(unixDateMiliseconds);
        let response = await axios.get(urlBuild, {
          headers: {
            "X-RapidAPI-Key": process.env.REQUEST_KEY,
          },
        });

        const gamesListResponse = [];

        response.data.events.forEach((event) => {
          gamesListResponse.push({
            id: event.event_id,
            homeTeam: getTeam(event.teams, event.teams_normalized, 1),
            awayTeam: getTeam(event.teams, event.teams_normalized, 0),
            homeOdd: getOdds(event.lines, 1),
            awayOdd: getOdds(event.lines, 2),
            drawOdd: getOdds(event.lines, 0),
          });
        });

        console.log(
          "Number of games: " +
            gamesListResponse.length +
            " in a date " +
            dateConverter(unixDateMiliseconds)
        );

        let isSportTwoPositionsSport = await consumer.isSportTwoPositionsSport(
          sportIds[j]
        );

        for (let n = 0; n < gamesListResponse.length; n++) {
          let isGameAlreadyFullFilled = await consumer.gameFulfilledCreated(
            bytes32({ input: gamesListResponse[n].id })
          );
          // if game is not fullfilled and not TBD awayTeam and homeTeam send request
          if (
            !isGameAlreadyFullFilled &&
            gamesListResponse[n].awayTeam != "TBD TBD" &&
            gamesListResponse[n].homeTeam != "TBD TBD" &&
            gamesListResponse[n].homeOdd != 0.01 &&
            gamesListResponse[n].awayOdd != 0.01 &&
            gamesListResponse[n].homeOdd != 0 &&
            gamesListResponse[n].awayOdd != 0 &&
            (isSportTwoPositionsSport ||
              (gamesListResponse[n].drawOdd != 0.01 &&
                gamesListResponse[n].drawOdd != 0))
          ) {
            console.log(
              "Game: " +
                bytes32({ input: gamesListResponse[n].id }) +
                " fullfilled: " +
                isGameAlreadyFullFilled
            );
            console.log(
              "homeOdd Pinnacle: " +
                gamesListResponse[n].homeOdd +
                " id: " +
                gamesListResponse[n].id
            );
            console.log(
              "awayOdd Pinnacle: " +
                gamesListResponse[n].awayOdd +
                " id: " +
                gamesListResponse[n].id
            );
            console.log(
              "drawOdd Pinnacle: " +
                gamesListResponse[n].drawOdd +
                " id: " +
                gamesListResponse[n].id
            );

            sendRequestForCreate = true;
            break;
          }
        }

        if (sendRequestForCreate) {
          try {
            console.log("Send request...");

            let tx_request = await wrapper.requestGames(
              jobId,
              market,
              sportIds[j],
              unixDate
            );

            await tx_request.wait().then((e) => {
              console.log("Requested for: " + unixDate);
            });
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  await delay(10000); // wait to be populated
  console.log("Create Markets...");

  let firstCreated = await queues.firstCreated();
  console.log("Start:  " + firstCreated);
  let lastCreated = await queues.lastCreated();
  console.log("End:  " + lastCreated);

  // there is new elements in queue
  if (parseInt(firstCreated) <= parseInt(lastCreated)) {
    console.log("Processing...");
    let gameIds = [];
    for (let i = parseInt(firstCreated); i <= parseInt(lastCreated); i++) {
      console.log("Process game from queue:  " + i);

      let gameId = await queues.gamesCreateQueue(i);
      console.log("GameID: " + gameId);

      gameIds.push(gameId);

      if (
        (gameIds.length > 0 &&
          gameIds.length % process.env.CREATE_BATCH == 0) ||
        parseInt(lastCreated) == i
      ) {
        try {
          console.log(gameIds);
          // send all ids
          let tx = await consumer.createAllMarketsForGames(gameIds);

          await tx.wait().then((e) => {
            console.log(
              "Market created for number of games: " + gameIds.length
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

  console.log("Ended batch...");
}

async function doIndefinitely() {
  await allowances.checkAllowanceAndAllow(
    process.env.LINK_CONTRACT,
    process.env.WRAPPER_CONTRACT
  );
  while (true) {
    await doCreate();
    await delay(process.env.CREATION_FREQUENCY);
  }
}

doIndefinitely();

function getTeam(teams, teamsN, number) {
  if (typeof teamsN != "undefined" && teamsN.length > 1) {
    return teamsN[number].name + " " + teamsN[number].mascot;
  } else if (typeof teams != "undefined" && teams.length > 1) {
    return teams[number].name;
  }
  return "TBD TBD"; // count as TBD
}

function getOdds(lines, oddNumber) {
  var odds = [];
  for (key in lines) {
    odds.push(Object.assign(lines[key], { name: key }));
  }

  let odd = odds.filter(function (bookmaker) {
    return bookmaker.name == "3"; // Pinnacle
  });

  if (odd.length == 0) {
    return 0;
  } else if (oddNumber == 1) {
    return odd[0].moneyline.moneyline_home * 100;
  } else if (oddNumber == 2) {
    return odd[0].moneyline.moneyline_away * 100;
  } else {
    return odd[0].moneyline.moneyline_draw * 100;
  }
}

function getSecondsToDate(dateFrom) {
  const date = new Date(Date.now() + dateFrom * 3600 * 1000 * 24);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function dateConverter(UNIXTimestamp) {
  var date = new Date(UNIXTimestamp);
  var month = date.getUTCMonth() + 1; // starts from zero (0) -> January
  return date.getUTCFullYear() + "-" + month + "-" + date.getUTCDate();
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
