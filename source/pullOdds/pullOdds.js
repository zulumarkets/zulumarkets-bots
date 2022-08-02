require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");

const Discord = require("discord.js");
const overtimeBot = new Discord.Client();
overtimeBot.login(process.env.BOT_OVERTIME_ODDS);

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

  const ODDS_PERCENTAGE_CHANGE_BY_SPORT = {
    3: process.env.ODDS_PERCENTAGE_CHANGE_MLB,
    10: process.env.ODDS_PERCENTAGE_CHANGE_MLS,
  };

  let americanSports = [3, 4, 10];

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
        let percentageChangePerSport =
          ODDS_PERCENTAGE_CHANGE_BY_SPORT[sportIds[j]] !== undefined
            ? ODDS_PERCENTAGE_CHANGE_BY_SPORT[sportIds[j]]
            : process.env.ODDS_PERCENTAGE_CHANGE_DEFAULT;
        // from today!!! maybe some games still running
        for (let i = 0; i <= daysInFront; i++) {
          console.log("------------------------");
          console.log("SPORT ID =>  " + sportIds[j]);
          console.log("CHANGE: " + percentageChangePerSport);
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
                homeTeam: getTeam(
                  event.teams,
                  event.teams_normalized,
                  1,
                  americanSports,
                  sportIds[j]
                ),
                awayTeam: getTeam(
                  event.teams,
                  event.teams_normalized,
                  0,
                  americanSports,
                  sportIds[j]
                ),
                status: event.score.event_status,
                homeOdd: getOdds(event.lines, 1),
                awayOdd: getOdds(event.lines, 2),
                drawOdd: getOdds(event.lines, 0),
              });
            });

            // check if odd changed more then ODDS_PERCENTAGE_CHANGE_BY_SPORT
            for (let n = 0; n < gamesListResponse.length; n++) {
              if (sendRequestForOdds) {
                break;
              }
              console.log("Game status -> " + gamesListResponse[n].status);
              console.log(
                "Obtaining game id (as string): -> " + gamesListResponse[n].id
              );
              console.log(
                "Game: " +
                  gamesListResponse[n].homeTeam +
                  " " +
                  gamesListResponse[n].awayTeam
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

                  let gameStart = await queues.gameStartPerGameId(
                    gamesOnContract[m]
                  );

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

                    // percentage change >= percentageChangePerSport send request
                    if (
                      getPercentageChange(
                        oddsForGame[0],
                        homeOddPinnacle,
                        percentageChangePerSport
                      ) >= percentageChangePerSport ||
                      getPercentageChange(
                        oddsForGame[1],
                        awayOddPinnacle,
                        percentageChangePerSport
                      ) >= percentageChangePerSport ||
                      getPercentageChange(
                        oddsForGame[2],
                        drawOddPinnacle,
                        percentageChangePerSport
                      ) >= percentageChangePerSport
                    ) {
                      let percentageChangeHome = getPercentageChange(
                        oddsForGame[0],
                        homeOddPinnacle,
                        percentageChangePerSport
                      );
                      let percentageChangeAway = getPercentageChange(
                        oddsForGame[1],
                        awayOddPinnacle,
                        percentageChangePerSport
                      );
                      let percentageChangeDraw = getPercentageChange(
                        oddsForGame[2],
                        drawOddPinnacle,
                        percentageChangePerSport
                      );

                      console.log("Home change odd: " + percentageChangeHome);
                      console.log("Away change odd: " + percentageChangeAway);
                      console.log("Draw change odd: " + percentageChangeDraw);

                      console.log("Setting sendRequestForOdds to true");

                      sendRequestForOdds = true;

                      await sendMessageToDiscordOddsChanged(
                        gamesListResponse[n].homeTeam,
                        gamesListResponse[n].awayTeam,
                        oddsForGame[0],
                        homeOddPinnacle,
                        oddsForGame[1],
                        awayOddPinnacle,
                        oddsForGame[2],
                        drawOddPinnacle,
                        gameStart,
                        percentageChangeHome,
                        percentageChangeAway,
                        percentageChangeDraw,
                        percentageChangePerSport
                      );
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
                      await sendMessageToDiscordOddsChanged(
                        gamesListResponse[n].homeTeam,
                        gamesListResponse[n].awayTeam,
                        oddsForGame[0],
                        homeOddPinnacle,
                        oddsForGame[1],
                        awayOddPinnacle,
                        oddsForGame[2],
                        drawOddPinnacle,
                        gameStart,
                        100,
                        100,
                        isSportTwoPositionsSport ? 0 : 100,
                        percentageChangePerSport
                      );
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
                      await sendMessageToDiscordGameCanceled(
                        gamesListResponse[n].homeTeam,
                        gamesListResponse[n].awayTeam,
                        gameStart
                      );
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

async function sendMessageToDiscordOddsChanged(
  homeTeam,
  awayTeam,
  homeOddContract,
  homeOddPinnacle,
  awayOddContract,
  awayOddPinnacle,
  drawOddContract,
  drawOddPinnacle,
  gameTime,
  percentageChangeHome,
  percentageChangeAway,
  percentageChangeDraw,
  percentageChangePerSport
) {
  homeOddPinnacle = homeOddPinnacle == 0.01 ? 0 : homeOddPinnacle / 100;
  awayOddPinnacle = awayOddPinnacle == 0.01 ? 0 : awayOddPinnacle / 100;
  drawOddPinnacle = drawOddPinnacle == 0.01 ? 0 : drawOddPinnacle / 100;

  homeOddContract = homeOddContract == 0 ? 0 : homeOddContract / 100;
  awayOddContract = awayOddContract == 0 ? 0 : awayOddContract / 100;
  drawOddContract = drawOddContract == 0 ? 0 : drawOddContract / 100;

  let homeOddContractImp = oddslib
    .from("moneyline", homeOddContract)
    .to("impliedProbability");
  let awayOddContractImp = oddslib
    .from("moneyline", awayOddContract)
    .to("impliedProbability");
  let drawOddContractImp = oddslib
    .from("moneyline", drawOddContract)
    .to("impliedProbability");

  let homeOddPinnacleImpl = oddslib
    .from("moneyline", homeOddPinnacle)
    .to("impliedProbability");
  let awayOddPinnacleImp = oddslib
    .from("moneyline", awayOddPinnacle)
    .to("impliedProbability");
  let drawOddPinnacleImp = oddslib
    .from("moneyline", drawOddPinnacle)
    .to("impliedProbability");

  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Odds changed more than threshold!",
        value: "\u200b",
      },
      {
        name: ":abacus: Value of threshold: ",
        value: percentageChangePerSport + "%",
      },
      {
        name: ":stadium: Overtime game:",
        value: homeTeam + " - " + awayTeam,
      },
      {
        name: ":arrow_up_down: Home odds changed (implied probability):",
        value:
          "Old odd: " +
          homeOddContractImp.toFixed(3) +
          ", New odd Pinnacle: " +
          homeOddPinnacleImpl.toFixed(3) +
          ", change = " +
          percentageChangeHome.toFixed(3) +
          "%",
      },
      {
        name: ":arrow_up_down: Away odds changed (implied probability):",
        value:
          "Old odd: " +
          awayOddContractImp.toFixed(3) +
          ", New odd Pinnacle: " +
          awayOddPinnacleImp.toFixed(3) +
          ", change = " +
          percentageChangeAway.toFixed(3) +
          "%",
      },
      {
        name: ":arrow_up_down: Draw odds changed (implied probability):",
        value:
          "Old odd: " +
          drawOddContractImp.toFixed(3) +
          ", New odd Pinnacle: " +
          drawOddPinnacleImp.toFixed(3) +
          ", change = " +
          percentageChangeDraw.toFixed(3) +
          "%",
      },
      {
        name: ":alarm_clock: Game time:",
        value: new Date(gameTime * 1000),
      }
    )
    .setColor("#0037ff");
  let overtimeOdds = await overtimeBot.channels.fetch("1002145721543311370");
  overtimeOdds.send(message);
}

async function sendMessageToDiscordGameCanceled(homeTeam, awayTeam, gameTime) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Game paused by cancel status!",
        value: "\u200b",
      },
      {
        name: ":classical_building: Overtime game:",
        value: homeTeam + " - " + awayTeam,
      },
      {
        name: ":alarm_clock: Game time:",
        value: new Date(gameTime * 1000),
      }
    )
    .setColor("#0037ff");
  let overtimeOdds = await overtimeBot.channels.fetch("1002507873198293012");
  overtimeOdds.send(message);
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

function getPercentageChange(oldNumber, newNumber, percentage) {
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
    if (percentageChange > percentage) {
      console.log("Odds changed more than threshold!");
    }
    return percentageChange;
  }
}

function getTeam(teams, teamsN, number, americanSports, sport) {
  if (typeof teamsN != "undefined" && teamsN.length > 1) {
    if (isAmericanSport(americanSports, sport)) {
      return teamsN[number].name + " " + teamsN[number].mascot;
    } else {
      return teamsN[number].name;
    }
  } else if (typeof teams != "undefined" && teams.length > 1) {
    return teams[number].name;
  }
  return "TBD TBD"; // count as TBD
}

function isAmericanSport(americanSports, sport) {
  for (let j = 0; j < americanSports.length; j++) {
    if (americanSports[j] == sport) {
      return true;
    }
  }
  return false;
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
