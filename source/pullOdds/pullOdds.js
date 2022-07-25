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

const oddslib = require("oddslib");

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

  const jobId = bytes32({ input: process.env.JOB_ID_ODDS });
  const jobIdResolve = bytes32({ input: process.env.JOB_ID_RESOLVE });

  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  // sportId
  let sportIds = process.env.SPORT_IDS.split(",");

  let cancelStatuses = process.env.CANCEL_STATUSES.split(",");

  // resolve market
  const market = process.env.MARKET_RESOLVE;

  const baseUrl = process.env.RUNDOWN_BASE_URL;

  console.log("Pulling Odds...");

  let processed = false;
  while (!processed) {
    processed = true;

    console.log("JOB ID =  " + jobId);

    let unproccessedGames = await queues.getLengthUnproccessedGames();
    console.log("GAMES length =  " + unproccessedGames);

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
          let unixDateMiliseconds =
            parseInt(unixDate) * process.env.MILISECONDS;
          console.log("Unix date in miliseconds: " + unixDateMiliseconds);

          let isSportOnADate = await consumer.isSportOnADate(
            unixDate,
            sportIds[j]
          );
          console.log("Having sport on a date:  " + isSportOnADate);

          let gamesOnContract = await consumer.getGamesPerDatePerSport(
            sportIds[j],
            unixDate
          );
          console.log("Count games on a date: " + gamesOnContract.length);

          // that day have games inside
          if (isSportOnADate && gamesOnContract.length > 0) {
            console.log("Processing sport and date...");

            let sendRequestForOdds = false;

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
                status: event.score.event_status,
                homeOdd: getOdds(event.lines, 1),
                awayOdd: getOdds(event.lines, 2),
                drawOdd: getOdds(event.lines, 0),
              });
            });

            // check if odd changed more then ODDS_PERCENRAGE_CHANGE
            for (let n = 0; n < gamesListResponse.length; n++) {
              if (sendRequestForOdds) {
                break;
              }
              console.log("Game status -> " + gamesListResponse[n].status);
              console.log(
                "Obtaining game id (as string): -> " + gamesListResponse[n].id
              );
              for (let m = 0; m < gamesOnContract.length; m++) {
                if (sendRequestForOdds) {
                  break;
                }
                // when game is found and status and status is STATUS_SCHEDULED
                if (
                  gamesListResponse[n].id ==
                    bytes32({ input: gamesOnContract[m] }) &&
                  gamesListResponse[n].status == "STATUS_SCHEDULED"
                ) {
                  console.log("Odds, checking...");

                  let marketAddress = await consumer.marketPerGameId(
                    gamesOnContract[m]
                  );

                  let isMarketResolved = await consumer.marketResolved(
                    marketAddress
                  );
                  console.log("Market resolved: " + isMarketResolved);

                  let isMarketCanceled = await consumer.marketCanceled(
                    marketAddress
                  );
                  console.log("Market canceled: " + isMarketCanceled);

                  // only ongoing games not resolved or already canceled
                  if (!isMarketResolved && !isMarketCanceled) {
                    let homeOddPinnacle = gamesListResponse[n].homeOdd;
                    console.log(
                      "homeOdd Pinnacle: " +
                        homeOddPinnacle +
                        " id: " +
                        gamesListResponse[n].id
                    );
                    let oddsForGame = await consumer.getOddsForGame(
                      gamesOnContract[m]
                    );
                    console.log(
                      "homeOdd contract: " +
                        oddsForGame[0] +
                        " id: " +
                        gamesOnContract[m]
                    );

                    let awayOddPinnacle = gamesListResponse[n].awayOdd;
                    console.log(
                      "awayOdd Pinnacle: " +
                        awayOddPinnacle +
                        " id: " +
                        gamesListResponse[n].id
                    );
                    console.log(
                      "awayOdd contract: " +
                        oddsForGame[1] +
                        " id: " +
                        gamesOnContract[m]
                    );

                    let drawOddPinnacle = gamesListResponse[n].drawOdd;
                    console.log(
                      "drawOdd Pinnacle: " +
                        drawOddPinnacle +
                        " id: " +
                        gamesListResponse[n].id
                    );
                    console.log(
                      "drawOdd contract: " +
                        oddsForGame[2] +
                        " id: " +
                        gamesOnContract[m]
                    );

                    let invalidOdds = await consumer.invalidOdds(marketAddress);
                    console.log(
                      "Is game paused by invalid odds: " + invalidOdds
                    );
                    let isPausedByCanceledStatus =
                      await consumer.isPausedByCanceledStatus(marketAddress);
                    console.log(
                      "Is game paused by status: " + isPausedByCanceledStatus
                    );

                    let isSportTwoPositionsSport =
                      await consumer.isSportTwoPositionsSport(sportIds[j]);

                    if (
                      oddsForGame[0] === undefined ||
                      homeOddPinnacle === undefined ||
                      oddsForGame[1] === undefined ||
                      awayOddPinnacle === undefined
                    ) {
                      continue;
                    }

                    // percentage change >= ODDS_PERCENRAGE_CHANGE send request
                    if (
                      getPercentageChange(oddsForGame[0], homeOddPinnacle) >=
                        process.env.ODDS_PERCENRAGE_CHANGE ||
                      getPercentageChange(oddsForGame[1], awayOddPinnacle) >=
                        process.env.ODDS_PERCENRAGE_CHANGE ||
                      getPercentageChange(oddsForGame[2], drawOddPinnacle) >=
                        process.env.ODDS_PERCENRAGE_CHANGE
                    ) {
                      console.log("Setting sendRequestForOdds to true");
                      console.log(
                        getPercentageChange(oddsForGame[0], homeOddPinnacle)
                      );
                      console.log(
                        getPercentageChange(oddsForGame[1], awayOddPinnacle)
                      );
                      console.log(
                        getPercentageChange(oddsForGame[2], drawOddPinnacle)
                      );
                      sendRequestForOdds = true;
                    } else if (
                      // odds appear and game was paused by invalid odds or cancel status send request
                      homeOddPinnacle != 0.01 &&
                      awayOddPinnacle != 0.01 &&
                      homeOddPinnacle != 0 &&
                      awayOddPinnacle != 0 &&
                      (isSportTwoPositionsSport ||
                        (drawOddPinnacle != 0.01 && drawOddPinnacle != 0)) &&
                      (invalidOdds || isPausedByCanceledStatus)
                    ) {
                      console.log(
                        "Receiving valid odds or unpause by wrong cancel status!"
                      );
                      sendRequestForOdds = true;
                    }
                  } else {
                    console.log("Market for game already resolved!");
                  }
                // game is in cancel/resolved status on API
                } else if (
                  gamesListResponse[n].id ==
                    bytes32({ input: gamesOnContract[m] }) &&
                  isGameInRightStatus(
                    cancelStatuses,
                    gamesListResponse[n].status
                  )
                ) {
                  let marketAddress = await consumer.marketPerGameId(
                    gamesOnContract[m]
                  );

                  let isPausedByCanceledStatus =
                    await consumer.isPausedByCanceledStatus(marketAddress);
                  console.log(
                    "Is game paused by status: " + isPausedByCanceledStatus
                  );

                  console.log(
                    "MARKET:  " +
                      marketAddress +
                      " paused: " +
                      isPausedByCanceledStatus
                  );
                  
                  // checking if it is already paused by cancel/resolved status
                  // if not pause it
                  if (!isPausedByCanceledStatus) {
                    let gameStart = await queues.gameStartPerGameId(
                      gamesOnContract[m]
                    );
                    console.log("GAME start:  " + gameStart);

                    try {
                      console.log("Send request...");

                      let tx = await wrapper.requestGamesResolveWithFilters(
                        jobIdResolve,
                        market,
                        sportIds[j],
                        gameStart,
                        [], // add statuses for football OPTIONAL use property statuses ?? maybe IF sportId
                        [gamesListResponse[n].id]
                      );

                      await tx.wait().then((e) => {
                        console.log(
                          "Requested for: " +
                            gameStart +
                            " with game id: " +
                            gamesListResponse[n].id
                        );
                      });

                      await delay(10000); // wait to be populated

                      let tx_resolve = await consumer.resolveMarketForGame(
                        gamesOnContract[m]
                      );

                      await tx_resolve.wait().then((e) => {
                        console.log(
                          "Market resolved for game: " + gamesOnContract[m]
                        );
                      });
                    } catch (e) {
                      console.log(e);
                    }
                  } else {
                    console.log("Market already paused!");
                  }
                }
              }
            }

            // odds changed
            if (sendRequestForOdds) {
              console.log("Sending request, odds changed...");
              try {
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
  await allowances.checkAllowanceAndAllow(
    process.env.LINK_CONTRACT,
    process.env.WRAPPER_CONTRACT
  );
  while (true) {
    await doPull();
    await delay(process.env.ODDS_FREQUENCY);
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

function getPercentageChange(oldNumber, newNumber) {
  if (oldNumber === newNumber) {
    return 0;
  }
  if (oldNumber == 0 && (newNumber == 0 || newNumber == 0.01)) {
    return 0;
  } else if (oldNumber == 0 && (newNumber != 0 || newNumber != 0.01)) {
    return 100;
  } else {
    let oldNumberImplied = oddslib
      .from("moneyline", oldNumber / 100)
      .to("impliedProbability");
    let newNumberImplied = oddslib
      .from("moneyline", newNumber / 100)
      .to("impliedProbability");
    var decreaseValue = oldNumberImplied - newNumberImplied;
    let percentageChange = Math.abs((decreaseValue / oldNumberImplied) * 100);
    if (percentageChange > process.env.ODDS_PERCENRAGE_CHANGE) {
      console.log("Odds changed more than threshold!");
    }
    return percentageChange;
  }
}

function isGameInRightStatus(statuses, status) {
  console.log("Game is in status: " + status);
  for (let j = 0; j < statuses.length; j++) {
    if (statuses[j] == status) {
      return true;
    }
  }
  return false;
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
