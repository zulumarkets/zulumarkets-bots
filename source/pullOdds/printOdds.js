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
const allowances = require("../allowances.js");

async function doPull() {
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

  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  // sportId
  let sportIds = process.env.SPORT_IDS.split(",");

  const baseUrl = process.env.RUNDOWN_BASE_URL;

  let processed = false;
  while (!processed) {
    processed = true;

    for (let j = 0; j < sportIds.length; j++) {
      for (let i = 0; i < daysInFront; i++) {
        let unixDate = await getSecondsToDate(i);
        let unixDateMiliseconds = parseInt(unixDate) * process.env.MILISECONDS;

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
            homeOdd: getOdds(event.lines, 1),
            awayOdd: getOdds(event.lines, 2),
            drawOdd: getOdds(event.lines, 0),
          });
        });

        console.log(gamesListResponse); // print odds
      }
    }
  }
}

async function doIndefinitely() {
  while (true) {
    await doPull();
    await delay(300 * 1000); // 5 minutes
  }
}

doIndefinitely();

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

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
