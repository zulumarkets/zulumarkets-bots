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
const linkToken = require("../../contracts/LinkToken.js");

async function doPull() {
  const link = new ethers.Contract(
    process.env.LINK_CONTRACT,
    linkToken.linkTokenContract.abi,
    wallet
  );

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

  const jobId = bytes32({ input: process.env.JOB_ID_ODDS });

  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  // sportId
  let sportIds = process.env.SPORT_IDS.split(",");

  const baseUrl = process.env.RUNDOWN_BASE_URL;

  console.log("Pulling Odds...");

  let processed = false;
  while (!processed) {
    processed = true;

    console.log("JOB ID =  " + jobId);

    let unproccessedGames = await queues.getLengthUnproccessedGames();
    console.log("GAMES length =  " + unproccessedGames);

    let linkAmountForApprove = await wrapper.payment();
    console.log("Link amount to approve:  " + linkAmountForApprove);

    if (unproccessedGames > 0) {
      // do for all sportIds
      for (let j = 0; j < sportIds.length; j++) {
        // from today!!! maybe some games still running
        for (let i = 0; i <= daysInFront; i++) {
          console.log("------------------------");
          console.log("SPORT ID =>  " + sportIds[j]);
          console.log("Processing: TODAY +  " + i);

          let unixDate = await getSecondsToDate(i);
          console.log("Unix date in seconds: " + unixDate);
          let unixDateMiliseconds = parseInt(unixDate) * process.env.MILISECONDS;
          console.log("Unix date in miliseconds: " + unixDateMiliseconds);

          let isSportOnADate = await consumer.isSportOnADate(unixDate,sportIds[j]);
          console.log("Having sport on a date:  " + isSportOnADate);

          let gamesOnContract = await consumer.getGamesPerdate(unixDate);
          console.log("Count games on a date: " + gamesOnContract.length);

          // that day have games inside
          if (isSportOnADate && gamesOnContract.length > 0) {
            console.log("Processing sport and date...");

            let sendRequest = false;

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

            // check if odd changed more then ODDS_PERCENRAGE_CHANGE
            for (let n = 0; n < gamesListResponse.length; n++) {
              for (let m = 0; m < gamesOnContract.length; m++) {
                if ( gamesListResponse[n].id == bytes32({ input: gamesOnContract[m] })) {
                  console.log("Odds, checking...");

                  let homeOddPinnacle = gamesListResponse[n].homeOdd;
                  console.log("homeOdd Pinnacle: " + homeOddPinnacle + " id: " + gamesListResponse[n].id);
                  let homeOdd = await consumer.getOddsHomeTeam(gamesOnContract[m]);
                  console.log("homeOdd contract: " + homeOdd + " id: " + gamesOnContract[m]);

                  let awayOddPinnacle = gamesListResponse[n].awayOdd;
                  console.log("awayOdd Pinnacle: " + awayOddPinnacle + " id: " + gamesListResponse[n].id);
                  let awayOdd = await consumer.getOddsAwayTeam(gamesOnContract[m]);
                  console.log("awayOdd contract: " + awayOdd + " id: " + gamesOnContract[m]);

                  let drawOddPinnacle = gamesListResponse[n].drawOdd;
                  console.log("drawOdd Pinnacle: " + drawOddPinnacle + " id: " + gamesListResponse[n].id);
                  let drawOdd = await consumer.getOddsDraw(gamesOnContract[m]);
                  console.log("drawOdd contract: " + drawOdd + " id: " + gamesOnContract[m]);

                  if (
                    getPercentageChange(homeOdd, homeOddPinnacle) >= process.env.ODDS_PERCENRAGE_CHANGE ||
                    getPercentageChange(awayOdd, awayOddPinnacle) >= process.env.ODDS_PERCENRAGE_CHANGE ||
                    getPercentageChange(drawOdd, drawOddPinnacle) >= process.env.ODDS_PERCENRAGE_CHANGE
                  ) {
                    sendRequest = true;
                  }
                }
              }
            }

            // if it is less then 24h or time for pulling odds on that date more then slow porcessing hours
            if (sendRequest) {
              console.log("Sending request, odds changed...");
              try {
                console.log("Approve link amount...");

                let approveTx = await link.approve(
                  process.env.WRAPPER_CONTRACT,
                  linkAmountForApprove
                );

                await approveTx.wait().then((e) => {
                  console.log(
                    "approved " +
                      process.env.WRAPPER_CONTRACT +
                      " on " +
                      wallet.address +
                      " amount: " +
                      linkAmountForApprove
                  );
                });

                console.log("------------------------");
                console.log("Send request...");

                let tx = await wrapper.requestOddsWithFilters(
                  jobId,
                  sportIds[j],
                  unixDate,
                  [] //ids
                );

                await tx.wait().then((e) => {
                  console.log(
                    "Requested for: " + unixDate + " for sport: " + sportIds[j]
                  );
                });
              } catch (e) {
                console.log(e);
              }
            } else {
              console.log("Not still for processing...");
            }
          } else {
            console.log("Next date...");
          }
        }
      }
    }
    console.log("------------------------");
    console.log("Ended batch...");
  }
}

async function doIndefinitely() {
  while (true) {
    await doPull();
    await delay(600 * 1000); // 10 minutes
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
    console.log("Odds not found!");
    return 0;
  } else if (oddNumber == 1) {
    return odd[0].moneyline.moneyline_home * 100;
  } else if (oddNumber == 2) {
    return odd[0].moneyline.moneyline_away * 100;
  } else {
    return odd[0].moneyline.moneyline_draw * 100;
  }
}

function getPercentageChange(oldNumber, newNumber) {
  var decreaseValue = oldNumber - newNumber;
  return Math.abs((decreaseValue / oldNumber) * 100);
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
