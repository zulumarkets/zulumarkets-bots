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
const linkToken = require("../../contracts/LinkToken.js");
const verifierConsumer = require("../../contracts/RundownVerifier.js");

const oddslib = require("oddslib");

async function doPull(numberOfExecution) {
  const verifier = new ethers.Contract(
    process.env.CONSUMER_VERIFIER_CONTRACT,
    verifierConsumer.rundownVerifier.abi,
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

  const erc20Instance = new ethers.Contract(
    process.env.LINK_CONTRACT,
    linkToken.linkTokenContract.abi,
    wallet
  );

  let amountOfToken = await erc20Instance.balanceOf(wallet.address);
  console.log("Amount token in wallet: " + parseInt(amountOfToken));
  console.log("Threshold: " + parseInt(process.env.LINK_THRESHOLD));

  if (parseInt(amountOfToken) < parseInt(process.env.LINK_THRESHOLD)) {
    await sendWarningMessageToDiscordAmountOfLinkInBotLessThenThreshold(
      "Amount of LINK in a odds-bot is: " + amountOfToken,
      process.env.LINK_THRESHOLD,
      wallet.address
    );
  }

  const jobId = bytes32({ input: process.env.JOB_ID_ODDS });
  const jobIdResolve = bytes32({ input: process.env.JOB_ID_RESOLVE });

  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  const primaryBookmaker = process.env.PRIMARY_ODDS_BOOKMAKER;
  const useBackupBookmaker = process.env.USE_BACKUP_ODDS_BOOKMAKER === "true";
  const backupBookmaker = process.env.BACKUP_ODDS_BOOKMAKER;

  // sportId
  let sportIds = process.env.SPORT_IDS.split(",");
  let riskySports = process.env.RISKY_SPORT_IDS.split(",");

  console.log("sportIds -> " + sportIds.length);
  console.log("riskySports" + riskySports.length);

  let cancelStatuses = process.env.CANCEL_STATUSES.split(",");

  // resolve market
  const market = process.env.MARKET_RESOLVE;

  const baseUrl = process.env.RUNDOWN_BASE_URL;

  const ODDS_PERCENTAGE_CHANGE_BY_SPORT = {
    3: process.env.ODDS_PERCENTAGE_CHANGE_MLB,
    7: process.env.ODDS_PERCENTAGE_CHANGE_UFC,
    10: process.env.ODDS_PERCENTAGE_CHANGE_MLS,
  };

  let americanSports = [1, 2, 3, 4, 6, 10];
  let failedCounter = 0;

  console.log("Pulling Odds...");

  let processed = false;
  while (!processed) {
    processed = true;

    console.log("JOB ID =  " + jobId);
    console.log("Primary bookmaker is (id): " + primaryBookmaker);
    console.log("USE_BACKUP_ODDS_BOOKMAKER is set to: " + useBackupBookmaker);
    console.log("Backup bookmaker is: " + backupBookmaker);

    let unproccessedGames = await queues.getLengthUnproccessedGames();
    console.log("GAMES length =  " + unproccessedGames);

    if (unproccessedGames > 0) {
      // do for all sportIds
      for (let j = 0; j < sportIds.length; j++) {
        let percentageChangePerSport =
          ODDS_PERCENTAGE_CHANGE_BY_SPORT[sportIds[j]] !== undefined
            ? ODDS_PERCENTAGE_CHANGE_BY_SPORT[sportIds[j]]
            : process.env.ODDS_PERCENTAGE_CHANGE_DEFAULT;

        // each second execution for non risky sports
        if (
          !isTheSportRisky(riskySports, sportIds[j]) &&
          numberOfExecution % 2 == 0
        ) {
          console.log(
            "Sport " +
              sportIds[j] +
              " is not risky and number of execution was: " +
              numberOfExecution +
              ", skiping!"
          );
          continue;
        }

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

          let isSportTwoPositionsSport =
            await consumer.isSportTwoPositionsSport(sportIds[j]);

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
                  true,
                  americanSports,
                  sportIds[j]
                ),
                awayTeam: getTeam(
                  event.teams,
                  event.teams_normalized,
                  false,
                  americanSports,
                  sportIds[j]
                ),
                status: checkIfUndefined(event.score),
                homeOdd: getOdds(
                  event.lines,
                  1,
                  primaryBookmaker,
                  useBackupBookmaker,
                  backupBookmaker,
                  isSportTwoPositionsSport
                ),
                awayOdd: getOdds(
                  event.lines,
                  2,
                  primaryBookmaker,
                  useBackupBookmaker,
                  backupBookmaker,
                  isSportTwoPositionsSport
                ),
                drawOdd: getOdds(
                  event.lines,
                  0,
                  primaryBookmaker,
                  useBackupBookmaker,
                  backupBookmaker,
                  isSportTwoPositionsSport
                ),
              });
            });

            // check if odd changed more then ODDS_PERCENTAGE_CHANGE_BY_SPORT
            for (let n = 0; n < gamesListResponse.length; n++) {
              /*if (sendRequestForOdds) {
                break;
              }*/
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
                /*if (sendRequestForOdds) {
                  break;
                }*/
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
                      "homeOdd API: " +
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
                      "awayOdd API: " +
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
                      "drawOdd API: " +
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
                      (getPercentageChange(
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
                        ) >= percentageChangePerSport) &&
                      !invalidOdds &&
                      !isPausedByCanceledStatus
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
                        percentageChangePerSport,
                        "1002145721543311370"
                      );

                      let normalizedOddsOld =
                        await verifier.calculateAndNormalizeOdds(oddsForGame);

                      let normalizedOddsNew =
                        await verifier.calculateAndNormalizeOdds(
                          packOddsFromAPI(
                            isSportTwoPositionsSport,
                            homeOddPinnacle,
                            awayOddPinnacle,
                            drawOddPinnacle
                          )
                        );

                      console.log("OLD normalized odds: ");
                      console.log(
                        normalizedOddsOld[0] +
                          ", " +
                          normalizedOddsOld[1] +
                          ", " +
                          normalizedOddsOld[2]
                      );
                      console.log("NEW normalized odds: ");
                      console.log(
                        normalizedOddsNew[0] +
                          ", " +
                          normalizedOddsNew[1] +
                          ", " +
                          normalizedOddsNew[2]
                      );

                      let circuitBreakerExpected =
                        await verifier.areOddsArrayInThreshold(
                          sportIds[j],
                          normalizedOddsOld,
                          normalizedOddsNew,
                          isSportTwoPositionsSport
                        );
                      console.log(
                        "Circuit Breaker: " + !circuitBreakerExpected
                      );

                      // odds are not in threshold
                      // and odds from API are valid
                      if (
                        !circuitBreakerExpected &&
                        homeOddPinnacle != 0.01 &&
                        awayOddPinnacle != 0.01 &&
                        homeOddPinnacle != 0 &&
                        awayOddPinnacle != 0
                      ) {
                        console.log("Circuit Breaker for odd!!!!");
                        console.log(
                          "Game id (contract): " + gamesOnContract[m]
                        );
                        console.log(
                          "Game id (API): " + gamesListResponse[n].id
                        );
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
                          percentageChangePerSport,
                          "1025081916141096961"
                        );
                      }
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
                        0,
                        homeOddPinnacle,
                        0,
                        awayOddPinnacle,
                        0,
                        drawOddPinnacle,
                        gameStart,
                        100,
                        100,
                        isSportTwoPositionsSport ? 0 : 100,
                        percentageChangePerSport,
                        "1002145721543311370"
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
                      await sendErrorMessageToDiscordStatusCancel(
                        "Request to CL odds-bot went wrong, can not pause game by cancel status! Please check LINK amount on bot, or kill and debug!",
                        sportIds[j],
                        gameStart,
                        gamesListResponse[n].id
                      );
                      failedCounter++;
                      await delay(1 * 60 * 60 * 1000 * failedCounter); // wait X (failedCounter) hours for admin
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

                let gameIds = [];
                if (sportIds[j] == 1) {
                  gamesOnContract.forEach((g) => {
                    gameIds.push(bytes32({ input: g }));
                  });
                }

                let tx = await wrapper.requestOddsWithFilters(
                  jobId,
                  sportIds[j],
                  unixDate,
                  gameIds //ids
                );

                await tx.wait().then((e) => {
                  console.log(
                    "Requested for: " + unixDate + " for sport: " + sportIds[j]
                  );
                });
              } catch (e) {
                console.log(e);
                await sendErrorMessageToDiscordRequestOddsfromCL(
                  "Request to CL odds-bot went wrong, can not pull odds! Please check LINK amount on bot, or kill and debug!",
                  sportIds[j],
                  unixDate
                );
                failedCounter++;
                await delay(1 * 60 * 60 * 1000 * failedCounter); // wait X (failedCounter) hours for admin
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
  var numberOfExecution = 0;
  while (true) {
    try {
      console.log("---------START ODDS EXECUTION---------");
      console.log("Execution time: " + new Date());
      console.log("Execution number: " + numberOfExecution);
      await doPull(numberOfExecution);
      numberOfExecution++;
      console.log("---------END ODDS EXECUTION---------");
      await delay(process.env.ODDS_FREQUENCY);
    } catch (e) {
      console.log(e);
      sendErrorMessageToDiscord(
        "Please check odds-bot, error on execution: " +
          numberOfExecution +
          ", date: " +
          new Date()
      );
      // wait next process
      await delay(process.env.ODDS_FREQUENCY);
    }
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
  percentageChangePerSport,
  discordID
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
  homeOddContractImp == 1 ? 0 : homeOddContractImp;
  let awayOddContractImp = oddslib
    .from("moneyline", awayOddContract)
    .to("impliedProbability");
  awayOddContractImp == 1 ? 0 : awayOddContractImp;
  let drawOddContractImp = oddslib
    .from("moneyline", drawOddContract)
    .to("impliedProbability");
  drawOddContractImp == 1 ? 0 : drawOddContractImp;

  let homeOddPinnacleImpl = oddslib
    .from("moneyline", homeOddPinnacle)
    .to("impliedProbability");
  homeOddPinnacleImpl == 1 ? 0 : homeOddPinnacleImpl;
  let awayOddPinnacleImp = oddslib
    .from("moneyline", awayOddPinnacle)
    .to("impliedProbability");
  awayOddPinnacleImp == 1 ? 0 : awayOddPinnacleImp;
  let drawOddPinnacleImp = oddslib
    .from("moneyline", drawOddPinnacle)
    .to("impliedProbability");
  drawOddPinnacleImp == 1 ? 0 : drawOddPinnacleImp;

  var messageHomeChange;
  var messageAwayChange;
  var messageDrawChange;

  if (percentageChangeHome === 100) {
    messageHomeChange =
      "Odds appear, " + "New odd API: " + homeOddPinnacleImpl.toFixed(3);
  } else if (percentageChangeAway === 0) {
    messageHomeChange = "No change of homeodds";
  } else if (homeOddPinnacleImpl === 1) {
    messageHomeChange = "Odd removed from API, pausing game, invalid odds";
  } else {
    messageHomeChange =
      "Old odd: " +
      homeOddContractImp.toFixed(3) +
      ", New odd API: " +
      homeOddPinnacleImpl.toFixed(3) +
      ", change = " +
      percentageChangeHome.toFixed(3) +
      "%";
  }

  if (percentageChangeAway == 100) {
    messageAwayChange =
      "Odds appear, " + "New odd API: " + awayOddPinnacleImp.toFixed(3);
  } else if (percentageChangeAway === 0) {
    messageAwayChange = "No change of awayodds";
  } else if (awayOddPinnacleImp === 1) {
    messageAwayChange = "Odd removed from API, pausing game, invalid odds";
  } else {
    messageAwayChange =
      "Old odd: " +
      awayOddContractImp.toFixed(3) +
      ", New odd API: " +
      awayOddPinnacleImp.toFixed(3) +
      ", change = " +
      percentageChangeAway.toFixed(3) +
      "%";
  }

  if (percentageChangeDraw === 100) {
    messageDrawChange =
      "Odds appear, " + "New odd API: " + drawOddPinnacleImp.toFixed(3);
  } else if (percentageChangeAway === 0) {
    messageDrawChange = "No change of drawodds";
  } else if (awayOddPinnacleImp === 1) {
    messageDrawChange =
      "There is no odd for draw! If two positional sport ignoring this odd, if three pausing game, invalid odds";
  } else {
    messageDrawChange =
      "Old odd: " +
      drawOddContractImp.toFixed(3) +
      ", New odd API: " +
      drawOddPinnacleImp.toFixed(3) +
      ", change = " +
      percentageChangeDraw.toFixed(3) +
      "%";
  }

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
        value: messageHomeChange,
      },
      {
        name: ":arrow_up_down: Away odds changed (implied probability):",
        value: messageAwayChange,
      },
      {
        name: ":arrow_up_down: Draw odds changed (implied probability):",
        value: messageDrawChange,
      },
      {
        name: ":alarm_clock: Game time:",
        value: new Date(gameTime * 1000),
      }
    )
    .setColor("#0037ff");
  let overtimeOdds = await overtimeBot.channels.fetch(discordID);
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

async function sendErrorMessageToDiscordStatusCancel(
  messageForPrint,
  sportId,
  dateTimestamp,
  gameId
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on odds bot!",
        value: "\u200b",
      },
      {
        name: ":exclamation: Error message:",
        value: messageForPrint,
      },
      {
        name: ":hammer_pick: Input params:",
        value:
          "SportId: " +
          sportId +
          ", date (unix date): " +
          dateTimestamp +
          ", for a gameId: " +
          gameId,
      },
      {
        name: ":alarm_clock: Timestamp:",
        value: new Date(new Date().toUTCString()),
      }
    )
    .setColor("#0037ff");
  let overtimeOdds = await overtimeBot.channels.fetch("1004388531319353425");
  overtimeOdds.send(message);
}

async function sendErrorMessageToDiscordRequestOddsfromCL(
  messageForPrint,
  sportId,
  dateTimestamp
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on odds bot!",
        value: "\u200b",
      },
      {
        name: ":exclamation: Error message:",
        value: messageForPrint,
      },
      {
        name: ":hammer_pick: Input params:",
        value: "SportId: " + sportId + ", date (unix date): " + dateTimestamp,
      },
      {
        name: ":alarm_clock: Timestamp:",
        value: new Date(new Date().toUTCString()),
      }
    )
    .setColor("#0037ff");
  let overtimeOdds = await overtimeBot.channels.fetch("1004388531319353425");
  overtimeOdds.send(message);
}

async function sendErrorMessageToDiscord(messageForPrint) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on odds bot!",
        value: "\u200b",
      },
      {
        name: ":exclamation: Error message:",
        value: messageForPrint,
      },
      {
        name: ":alarm_clock: Timestamp:",
        value: new Date(new Date().toUTCString()),
      }
    )
    .setColor("#0037ff");
  let overtimeOdds = await overtimeBot.channels.fetch("1004388531319353425");
  overtimeOdds.send(message);
}

async function sendWarningMessageToDiscordAmountOfLinkInBotLessThenThreshold(
  messageForPrint,
  threshold,
  wallet
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Amount of LINK in odds-bot less then threshold!",
        value: "\u200b",
      },
      {
        name: ":coin: Threshold:",
        value: threshold,
      },
      {
        name: ":credit_card: Bot wallet address:",
        value: wallet,
      },
      {
        name: ":warning: Warning message:",
        value: messageForPrint,
      },
      {
        name: ":alarm_clock: Timestamp:",
        value: new Date(new Date().toUTCString()),
      }
    )
    .setColor("#0037ff");
  let overtimeCreate = await overtimeBot.channels.fetch("1004756729378131998");
  overtimeCreate.send(message);
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

function getOdds(
  lines,
  oddNumber,
  primaryBookmaker,
  useBackupBookmaker,
  backupBookmaker,
  isSportTwoPositionsSport
) {
  var odds = [];
  for (key in lines) {
    odds.push(Object.assign(lines[key], { name: key }));
  }

  let oddPrimary = odds.filter(function (bookmaker) {
    return bookmaker.name == primaryBookmaker; // primary example 3 - Pinnacle
  });

  let oddBackup = odds.filter(function (bookmaker) {
    return bookmaker.name == backupBookmaker; // bck example 11 - Luwvig
  });

  if (oddPrimary.length == 0) {
    return useBackupBookmaker
      ? getOddsFromBackupBookmaker(
          oddBackup,
          oddNumber,
          isSportTwoPositionsSport
        )
      : 0;
  } else if (oddNumber == 1) {
    if (
      useBackupBookmaker &&
      oddPrimary[0].moneyline.moneyline_home === 0.0001
    ) {
      return getOddsFromBackupBookmaker(
        oddBackup,
        oddNumber,
        isSportTwoPositionsSport
      );
    } else {
      return oddPrimary[0].moneyline.moneyline_home * 100;
    }
  } else if (oddNumber == 2) {
    if (
      useBackupBookmaker &&
      oddPrimary[0].moneyline.moneyline_away === 0.0001
    ) {
      return getOddsFromBackupBookmaker(
        oddBackup,
        oddNumber,
        isSportTwoPositionsSport
      );
    } else {
      return oddPrimary[0].moneyline.moneyline_away * 100;
    }
  } else {
    if (
      useBackupBookmaker &&
      oddPrimary[0].moneyline.moneyline_draw === 0.0001 &&
      !isSportTwoPositionsSport
    ) {
      return getOddsFromBackupBookmaker(
        oddBackup,
        oddNumber,
        isSportTwoPositionsSport
      );
    } else {
      if (isSportTwoPositionsSport) {
        return 0.01; // default
      }
      return oddPrimary[0].moneyline.moneyline_draw * 100;
    }
  }
}

function getOddsFromBackupBookmaker(
  oddBackup,
  oddNumber,
  isSportTwoPositionsSport
) {
  if (oddBackup.length == 0) {
    return 0;
  } else if (oddNumber == 1) {
    return oddBackup[0].moneyline.moneyline_home * 100;
  } else if (oddNumber == 2) {
    return oddBackup[0].moneyline.moneyline_away * 100;
  } else {
    console.log("Sport is two positional: " + isSportTwoPositionsSport);
    if (isSportTwoPositionsSport) {
      return 0.01; // default
    }
    return oddBackup[0].moneyline.moneyline_draw * 100;
  }
}

function packOddsFromAPI(
  isSportTwoPositionsSport,
  homeOddPinnacle,
  awayOddPinnacle,
  drawOddPinnacle
) {
  var odds = [];

  odds[0] = homeOddPinnacle != 0.01 ? homeOddPinnacle : 0;
  odds[1] = awayOddPinnacle != 0.01 ? awayOddPinnacle : 0;

  if (isSportTwoPositionsSport) {
    odds[2] = 0;
  } else {
    odds[2] = drawOddPinnacle != 0.01 ? drawOddPinnacle : 0;
  }

  console.log("Packed odds for checking:");
  console.log(odds);
  return odds;
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

function getTeam(teams, teamsN, isHome, americanSports, sport) {
  if (typeof teamsN != "undefined" && teamsN.length > 1) {
    if (isAmericanSport(americanSports, sport)) {
      return (
        teamsN[returnIndex(teamsN, isHome)].name +
        " " +
        teamsN[returnIndex(teamsN, isHome)].mascot
      );
    } else {
      return teamsN[returnIndex(teamsN, isHome)].name;
    }
  } else if (typeof teams != "undefined" && teams.length > 1) {
    return teams[returnIndex(teams, isHome)].name;
  }
  return "TBD TBD"; // count as TBD
}

function checkIfUndefined(eventScore) {
  if (eventScore && eventScore.event_status) {
    return eventScore.event_status;
  }
  return "STATUS_UNKNOWN";
}

function isAmericanSport(americanSports, sport) {
  for (let j = 0; j < americanSports.length; j++) {
    if (americanSports[j] == sport) {
      return true;
    }
  }
  return false;
}

function returnIndex(team, isHome) {
  if (team[1].is_home === isHome) {
    return 1;
  }
  return 0;
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

function isTheSportRisky(listOfRiskySports, sportId) {
  for (let j = 0; j < listOfRiskySports.length; j++) {
    if (listOfRiskySports[j] == sportId) {
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
