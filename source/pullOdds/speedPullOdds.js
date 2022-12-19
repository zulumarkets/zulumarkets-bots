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
const gamesVerifier = require("../../contracts/RundownVerifier.js");
const gamesOddsObtainer = require("../../contracts/GamesOddsObtainer.js");
const allowances = require("../allowances.js");

const oddslib = require("oddslib");

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

const verifier = new ethers.Contract(
  process.env.CONSUMER_VERIFIER_CONTRACT,
  gamesVerifier.rundownVerifier.abi,
  wallet
);

const obtainer = new ethers.Contract(
  process.env.ODDS_OBTAINER_CONTRACT,
  gamesOddsObtainer.gamesOddsObtainerContract.abi,
  wallet
);

async function doPull(numberOfExecution, lastStartDate) {
  const jobId = bytes32({ input: process.env.JOB_ID_ODDS });
  const jobIdResolve = bytes32({ input: process.env.JOB_ID_RESOLVE });

  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  let primaryBookmaker;
  let useBackupBookmaker;
  let backupBookmaker;

  // sportId
  let sportIds = process.env.SPORT_IDS;
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
    console.log("sportId: " + sportIds);

    let oddsBookmakers = await wrapper.getBookmakerIdsBySportId(sportIds);
    useBackupBookmaker = oddsBookmakers.length > 1;
    primaryBookmaker = oddsBookmakers[0];
    console.log("Primary bookmaker is (id): " + primaryBookmaker);
    console.log("Use Backup Bookmaker is set to: " + useBackupBookmaker);

    if (useBackupBookmaker) {
      backupBookmaker = oddsBookmakers[1];
      console.log("Backup bookmaker is (id): " + backupBookmaker);
    }

    let doesSportSupportSpreadAndTotal =
      await obtainer.doesSportSupportSpreadAndTotal(sportIds);
    console.log("Support total and spred: " + doesSportSupportSpreadAndTotal);

    // do for all sportIds

    let percentageChangePerSport =
      ODDS_PERCENTAGE_CHANGE_BY_SPORT[sportIds] !== undefined
        ? ODDS_PERCENTAGE_CHANGE_BY_SPORT[sportIds]
        : process.env.ODDS_PERCENTAGE_CHANGE_DEFAULT;

    // from today!!! maybe some games still running
    for (let i = 0; i <= daysInFront; i++) {
      console.log("------------------------");
      console.log("CHANGE: " + percentageChangePerSport);
      console.log("Processing: TODAY +  " + i);

      let unixDate = getSecondsToDate(i);
      let unixDateMiliseconds = parseInt(unixDate) * process.env.MILISECONDS;
      console.log("Unix date in miliseconds: " + unixDateMiliseconds);
      let timeInMiliseconds = new Date().getTime(); // miliseconds
      console.log("Time for proocessing:  " + timeInMiliseconds);

      let dateSport = unixDate + "_" + sportIds;

      let sportProps = await verifier.getSportProperties(sportIds, unixDate);

      let isSportOnADate = sportProps[0];
      console.log("Having sport on a date:  " + isSportOnADate);

      let gamesOnContract = sportProps[2];
      console.log("Count games on a date: " + gamesOnContract);

      let isSportTwoPositionsSport = sportProps[1];

      if (
        gamesOnContract.length > 0 &&
        lastStartDate[dateSport] === undefined
      ) {
        lastStartDate[dateSport] = 1;
      }

      // that day have games inside or in that day all games are in a past
      if (
        isSportOnADate &&
        gamesOnContract.length > 0 &&
        (numberOfExecution == 0 ||
          lastGameHasPassed(lastStartDate[dateSport], timeInMiliseconds))
      ) {
        console.log("Processing sport and date...");

        let oddsForGames = await verifier.getOddsForGames(gamesOnContract);
        console.log("Odds count: " + oddsForGames.length);

        let spreadLinesForGames = [];
        let totalLinesForGames = [];
        let spreadTotalsOddsForGames = [];

        if (doesSportSupportSpreadAndTotal) {
          spreadLinesForGames = await verifier.getSpreadLinesForGames(
            gamesOnContract
          );
          totalLinesForGames = await verifier.getTotalLinesForGames(
            gamesOnContract
          );
          spreadTotalsOddsForGames = await verifier.getSpreadTotalsOddsForGames(
            gamesOnContract
          );
        }
        console.log("spread lines count: " + spreadLinesForGames.length);
        console.log("total lines count: " + totalLinesForGames.length);
        console.log(
          "spread/totals odds count: " + spreadTotalsOddsForGames.length
        );

        let sendRequestForOdds = false;

        const urlBuild =
          baseUrl +
          "/sports/" +
          sportIds +
          "/events/" +
          dateConverter(unixDateMiliseconds);
        let response = await axios.get(urlBuild, {
          headers: {
            "X-RapidAPI-Key": process.env.REQUEST_KEY,
          },
        });

        const gamesListResponse = [];

        response.data.events.forEach((event) => {
          let status = checkIfUndefined(event.score);
          // look only for scheduled or canceled games
          if (
            status == "STATUS_SCHEDULED" ||
            isGameInRightStatus(cancelStatuses, status)
          ) {
            gamesListResponse.push({
              id: event.event_id,
              homeTeam: getTeam(
                event.teams,
                event.teams_normalized,
                true,
                americanSports,
                sportIds
              ),
              awayTeam: getTeam(
                event.teams,
                event.teams_normalized,
                false,
                americanSports,
                sportIds
              ),
              status: status,
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
              spreadHome: getSpreadAndTotalLines(
                event.lines,
                1,
                primaryBookmaker,
                useBackupBookmaker,
                backupBookmaker
              ),
              spreadAway: getSpreadAndTotalLines(
                event.lines,
                2,
                primaryBookmaker,
                useBackupBookmaker,
                backupBookmaker
              ),
              spreadHomeOdds: getSpreadAndTotalOdds(
                event.lines,
                1,
                primaryBookmaker,
                useBackupBookmaker,
                backupBookmaker
              ),
              spreadAwayOdds: getSpreadAndTotalOdds(
                event.lines,
                2,
                primaryBookmaker,
                useBackupBookmaker,
                backupBookmaker
              ),
              totalOver: getSpreadAndTotalLines(
                event.lines,
                3,
                primaryBookmaker,
                useBackupBookmaker,
                backupBookmaker
              ),
              totalUnder: getSpreadAndTotalLines(
                event.lines,
                4,
                primaryBookmaker,
                useBackupBookmaker,
                backupBookmaker
              ),
              totalOverOdds: getSpreadAndTotalOdds(
                event.lines,
                3,
                primaryBookmaker,
                useBackupBookmaker,
                backupBookmaker
              ),
              totalUnderOdds: getSpreadAndTotalOdds(
                event.lines,
                4,
                primaryBookmaker,
                useBackupBookmaker,
                backupBookmaker
              ),
            });
          }
        });

        if (gamesListResponse.length == 0) {
          lastStartDate[dateSport] = 0;
        }

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

              let gameProps = await verifier.getGameProperties(
                gamesOnContract[m]
              );

              let marketAddress = gameProps[0];
              console.log("Market: " + marketAddress);

              let isMarketResolved = gameProps[1];
              console.log("Market resolved: " + isMarketResolved);

              let isMarketCanceled = gameProps[2];
              console.log("Market canceled: " + isMarketCanceled);

              let gameStart = await queues.gameStartPerGameId(
                gamesOnContract[m]
              );

              console.log(
                "Last game on that date is (before): " +
                  lastStartDate[dateSport]
              );

              if (lastStartDate[dateSport] < gameStart) {
                console.log("Last start date changed");
                lastStartDate[dateSport] = gameStart;
              }

              console.log(
                "Last game on that date is (after): " + lastStartDate[dateSport]
              );

              // only ongoing games not resolved or already canceled
              if (!isMarketResolved && !isMarketCanceled) {
                let homeOddPinnacle = gamesListResponse[n].homeOdd;
                console.log("Contract ID: " + gamesOnContract[m]);
                console.log("API ID: " + gamesListResponse[n].id);
                console.log(
                  "Home Odds API: " +
                    homeOddPinnacle +
                    ", Home Odds contract: " +
                    oddsForGames[m * 3]
                );

                let awayOddPinnacle = gamesListResponse[n].awayOdd;
                console.log(
                  "Away Odds API: " +
                    awayOddPinnacle +
                    ", Away Odds contract: " +
                    oddsForGames[m * 3 + 1]
                );

                let drawOddPinnacle = gamesListResponse[n].drawOdd;
                if (isSportTwoPositionsSport) {
                  console.log(
                    "Draw Odds API: " +
                      drawOddPinnacle +
                      ", Draw Odds contract: " +
                      oddsForGames[m * 3 + 2]
                  );
                }

                let spreadHomePinnacle;
                let spreadAwayPinnacle;
                let totalOverPinnacle;
                let totalUnderPinnacle;
                let spreadHomeOddsPinnacle;
                let spreadAwayOddsPinnacle;
                let totalOverOddsPinnacle;
                let totalUnderOddsPinnacle;

                if (doesSportSupportSpreadAndTotal) {
                  spreadHomePinnacle = gamesListResponse[n].spreadHome;
                  console.log(
                    "Spread home LINE API: " +
                      spreadHomePinnacle +
                      ", Spread home LINE contract: " +
                      spreadLinesForGames[m * 2]
                  );
                  spreadAwayPinnacle = gamesListResponse[n].spreadAway;
                  console.log(
                    "Spread away LINE API: " +
                      spreadAwayPinnacle +
                      ", Spread away LINE contract: " +
                      spreadLinesForGames[m * 2 + 1]
                  );

                  totalOverPinnacle = gamesListResponse[n].totalOver;
                  console.log(
                    "Total over LINE API: " +
                      totalOverPinnacle +
                      ", Total over LINE contract: " +
                      totalLinesForGames[m * 2]
                  );

                  totalUnderPinnacle = gamesListResponse[n].totalUnder;
                  console.log(
                    "Total under LINE API: " +
                      totalUnderPinnacle +
                      ", Total under LINE contract: " +
                      totalLinesForGames[m * 2 + 1]
                  );
                  spreadHomeOddsPinnacle = gamesListResponse[n].spreadHomeOdds;
                  console.log(
                    "Spread home ODDS API: " +
                      spreadHomeOddsPinnacle +
                      ", Spread home ODDS contract: " +
                      spreadTotalsOddsForGames[m * 4]
                  );

                  spreadAwayOddsPinnacle = gamesListResponse[n].spreadAwayOdds;
                  console.log(
                    "Spread away ODDS API: " +
                      spreadAwayOddsPinnacle +
                      ", Spread away ODDS contract: " +
                      spreadTotalsOddsForGames[m * 4 + 1]
                  );

                  totalOverOddsPinnacle = gamesListResponse[n].totalOverOdds;
                  console.log(
                    "Total over ODDS API: " +
                      totalOverOddsPinnacle +
                      ", Total over ODDS contract: " +
                      spreadTotalsOddsForGames[m * 4 + 2]
                  );

                  totalUnderOddsPinnacle = gamesListResponse[n].totalUnderOdds;
                  console.log(
                    "Total under ODDS API: " +
                      totalUnderOddsPinnacle +
                      ", Total under ODDS contract: " +
                      spreadTotalsOddsForGames[m * 4 + 3]
                  );
                }

                let invalidOdds = gameProps[3];
                console.log("Is game paused by invalid odds: " + invalidOdds);
                let isPausedByCanceledStatus = gameProps[4];
                console.log(
                  "Is game paused by status: " + isPausedByCanceledStatus
                );

                if (
                  oddsForGames[m * 3] === undefined ||
                  homeOddPinnacle === undefined ||
                  oddsForGames[m * 3 + 1] === undefined ||
                  awayOddPinnacle === undefined
                ) {
                  continue;
                }

                console.log("--------------");

                // percentage change >= percentageChangePerSport send request
                // if doesSportSupportSpreadAndTotal is FALSE not check total/spread
                if (
                  ((homeOddPinnacle != 0.01 &&
                    awayOddPinnacle != 0.01 &&
                    homeOddPinnacle != 0 &&
                    awayOddPinnacle != 0 &&
                    (isSportTwoPositionsSport ||
                      (drawOddPinnacle != 0.01 && drawOddPinnacle != 0)) &&
                    checkSpreadAndTotal(
                      doesSportSupportSpreadAndTotal,
                      spreadLinesForGames,
                      m,
                      spreadHomePinnacle,
                      spreadAwayPinnacle,
                      totalLinesForGames,
                      totalOverPinnacle,
                      totalUnderPinnacle,
                      spreadTotalsOddsForGames,
                      spreadHomeOddsPinnacle,
                      percentageChangePerSport,
                      spreadAwayOddsPinnacle,
                      totalOverOddsPinnacle,
                      totalUnderOddsPinnacle
                    )) ||
                    getPercentageChange(
                      oddsForGames[m * 3],
                      homeOddPinnacle,
                      percentageChangePerSport
                    ) >= percentageChangePerSport ||
                    getPercentageChange(
                      oddsForGames[m * 3 + 1],
                      awayOddPinnacle,
                      percentageChangePerSport
                    ) >= percentageChangePerSport ||
                    getPercentageChange(
                      oddsForGames[m * 3 + 2],
                      drawOddPinnacle,
                      percentageChangePerSport
                    ) >= percentageChangePerSport) &&
                  !invalidOdds &&
                  !isPausedByCanceledStatus
                ) {
                  let percentageChangeHome = getPercentageChange(
                    oddsForGames[m * 3],
                    homeOddPinnacle,
                    percentageChangePerSport
                  );
                  let percentageChangeAway = getPercentageChange(
                    oddsForGames[m * 3 + 1],
                    awayOddPinnacle,
                    percentageChangePerSport
                  );
                  let percentageChangeDraw = getPercentageChange(
                    oddsForGames[m * 3 + 2],
                    drawOddPinnacle,
                    percentageChangePerSport
                  );

                  console.log("Home change odd: " + percentageChangeHome);
                  console.log("Away change odd: " + percentageChangeAway);
                  console.log("Draw change odd: " + percentageChangeDraw);

                  if (doesSportSupportSpreadAndTotal) {
                    let percentageChangeSpreadHome = getPercentageChange(
                      spreadTotalsOddsForGames[m * 4],
                      spreadHomeOddsPinnacle,
                      percentageChangePerSport
                    );

                    let percentageChangeSpreadAway = getPercentageChange(
                      spreadTotalsOddsForGames[m * 4 + 1],
                      spreadAwayOddsPinnacle,
                      percentageChangePerSport
                    );

                    let percentageChangeTotalOver = getPercentageChange(
                      spreadTotalsOddsForGames[m * 4 + 2],
                      totalOverOddsPinnacle,
                      percentageChangePerSport
                    );

                    let percentageChangeTotalUnder = getPercentageChange(
                      spreadTotalsOddsForGames[m * 4 + 3],
                      totalUnderOddsPinnacle,
                      percentageChangePerSport
                    );
                    console.log(
                      "Spread HOME change odd: " + percentageChangeSpreadHome
                    );
                    console.log(
                      "Spread AWAY change odd: " + percentageChangeSpreadAway
                    );
                    console.log(
                      "Total OVER change odd: " + percentageChangeTotalOver
                    );
                    console.log(
                      "Total UNDER change odd: " + percentageChangeTotalUnder
                    );
                    console.log(
                      "Spread HOME before: " +
                        spreadLinesForGames[m * 2] +
                        ", spread HOME now: " +
                        spreadHomePinnacle
                    );
                    console.log(
                      "Spread AWAY before: " +
                        spreadLinesForGames[m * 2 + 1] +
                        ", spread AWAY now: " +
                        spreadAwayPinnacle
                    );
                    console.log(
                      "Total OVER before: " +
                        totalLinesForGames[m * 2] +
                        ", total OVER now: " +
                        totalOverPinnacle
                    );
                    console.log(
                      "Total UNDER before: " +
                        totalLinesForGames[m * 2 + 1] +
                        ", total UNDER now: " +
                        totalUnderPinnacle
                    );
                  }

                  console.log("Setting sendRequestForOdds to true");

                  sendRequestForOdds = true;

                  await sendMessageToDiscordOddsChanged(
                    gamesListResponse[n].homeTeam,
                    gamesListResponse[n].awayTeam,
                    oddsForGames[m * 3],
                    homeOddPinnacle,
                    oddsForGames[m * 3 + 1],
                    awayOddPinnacle,
                    oddsForGames[m * 3 + 2],
                    drawOddPinnacle,
                    gameStart,
                    percentageChangeHome,
                    percentageChangeAway,
                    percentageChangeDraw,
                    percentageChangePerSport,
                    "1002145721543311370"
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
              isGameInRightStatus(cancelStatuses, gamesListResponse[n].status)
            ) {
              let gameProps = await verifier.getGameProperties(
                gamesOnContract[m]
              );

              let marketAddress = gameProps[0];
              console.log("Market: " + marketAddress);

              let isPausedByCanceledStatus = gameProps[4];
              console.log(
                "Is game paused by status: " + isPausedByCanceledStatus
              );

              let isMarketCanceledAlready = gameProps[2];
              console.log("Canceled already: " + isMarketCanceledAlready);

              console.log(
                "MARKET:  " +
                  marketAddress +
                  " paused: " +
                  isPausedByCanceledStatus
              );

              // checking if it is already paused by cancel/resolved status
              // if not pause it
              if (!isPausedByCanceledStatus && !isMarketCanceledAlready) {
                let gameStart = await queues.gameStartPerGameId(
                  gamesOnContract[m]
                );
                console.log("GAME start:  " + gameStart);

                try {
                  console.log("Send request...");

                  let tx = await wrapper.requestGamesResolveWithFilters(
                    jobIdResolve,
                    market,
                    sportIds,
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
                    sportIds,
                    gameStart,
                    gamesListResponse[n].id
                  );
                  failedCounter++;
                  await delay(1 * 60 * 10 * 1000 * failedCounter); // wait X (failedCounter) 10 min
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
            gamesOnContract.forEach((g) => {
              gameIds.push(bytes32({ input: g }));
            });

            console.log("Requesting games: " + gameIds.length);
            if (gameIds.length > process.env.CL_ODDS_BATCH) {
              let gamesInBatchforCL = [];
              for (let i = 0; i < gameIds.length; i++) {
                gamesInBatchforCL.push(gameIds[i]);
                if (
                  (gamesInBatchforCL.length > 0 &&
                    gamesInBatchforCL.length % process.env.CL_ODDS_BATCH ==
                      0) ||
                  gameIds.length - 1 == i // last one
                ) {
                  console.log("Batch...");
                  console.log(gamesInBatchforCL);

                  let tx = await wrapper.requestOddsWithFilters(
                    jobId,
                    sportIds,
                    unixDate,
                    gamesInBatchforCL, //ids,
                    {
                      gasLimit: process.env.GAS_LIMIT,
                    }
                  );

                  await tx.wait().then((e) => {
                    console.log(
                      "Requested for: " + unixDate + " for sport: " + sportIds
                    );
                  });

                  gamesInBatchforCL = [];
                }
              }
            } else {
              let tx = await wrapper.requestOddsWithFilters(
                jobId,
                sportIds,
                unixDate,
                gameIds, //ids,
                {
                  gasLimit: process.env.GAS_LIMIT,
                }
              );

              await tx.wait().then((e) => {
                console.log(
                  "Requested for: " + unixDate + " for sport: " + sportIds
                );
              });
            }
          } catch (e) {
            console.log(e);
            await sendErrorMessageToDiscordRequestOddsfromCL(
              "Request to CL odds-bot went wrong, can not pull odds! Please check LINK amount on bot, or kill and debug!",
              sportIds,
              unixDate
            );
            failedCounter++;
            await delay(1 * 60 * 10 * 1000 * failedCounter); // wait X (failedCounter) hours for admin
          }
        } else {
          console.log("Not still for processing...");
        }
      } else {
        console.log("Next date...");
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
  var lastStartDate = {};
  while (true) {
    try {
      console.log("---------START ODDS EXECUTION---------");
      console.log("Execution time: " + new Date());
      console.log("Execution number: " + numberOfExecution);
      await doPull(numberOfExecution, lastStartDate);
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
      numberOfExecution++;
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

function lastGameHasPassed(lastGameTime, currentTime) {
  if (lastGameTime === undefined) {
    return false;
  }
  if (lastGameTime === 1) {
    return true;
  }
  return (
    parseInt(lastGameTime) * process.env.MILISECONDS > parseInt(currentTime)
  );
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

function getSpreadAndTotalLines(
  lines,
  oddNumber,
  primaryBookmaker,
  useBackupBookmaker,
  backupBookmaker
) {
  var linesResult = [];
  for (key in lines) {
    linesResult.push(Object.assign(lines[key], { name: key }));
  }

  let oddPrimary = linesResult.filter(function (bookmaker) {
    return bookmaker.name == primaryBookmaker; // primary example 3 - Pinnacle
  });

  let oddBackup = linesResult.filter(function (bookmaker) {
    return bookmaker.name == backupBookmaker; // bck example 11 - Luwvig
  });

  if (oddPrimary.length == 0) {
    return useBackupBookmaker
      ? getSpreadAndTotalLinesFromBackupBookmaker(oddBackup, oddNumber)
      : 0;
  } else if (oddNumber == 1) {
    if (
      useBackupBookmaker &&
      oddPrimary[0].spread.point_spread_home === 0.0001
    ) {
      return getSpreadAndTotalLinesFromBackupBookmaker(oddBackup, oddNumber);
    } else {
      return oddPrimary[0].spread.point_spread_home * 100;
    }
  } else if (oddNumber == 2) {
    if (
      useBackupBookmaker &&
      oddPrimary[0].spread.point_spread_away === 0.0001
    ) {
      return getSpreadAndTotalLinesFromBackupBookmaker(oddBackup, oddNumber);
    } else {
      return oddPrimary[0].spread.point_spread_away * 100;
    }
  } else if (oddNumber == 3) {
    if (useBackupBookmaker && oddPrimary[0].total.total_over === 0.0001) {
      return getSpreadAndTotalLinesFromBackupBookmaker(oddBackup, oddNumber);
    } else {
      return oddPrimary[0].total.total_over * 100;
    }
  } else if (oddNumber == 4) {
    if (useBackupBookmaker && oddPrimary[0].total.total_under === 0.0001) {
      return getSpreadAndTotalLinesFromBackupBookmaker(oddBackup, oddNumber);
    } else {
      return oddPrimary[0].total.total_under * 100;
    }
  }
}

function getSpreadAndTotalLinesFromBackupBookmaker(oddBackup, oddNumber) {
  if (oddBackup.length == 0) {
    return 0;
  } else if (oddNumber == 1) {
    return oddBackup[0].spread.point_spread_home * 100;
  } else if (oddNumber == 2) {
    return oddBackup[0].spread.point_spread_away * 100;
  } else if (oddNumber == 3) {
    return oddBackup[0].total.total_over * 100;
  } else if (oddNumber == 4) {
    return oddBackup[0].total.total_under * 100;
  }
}

function getSpreadAndTotalOdds(
  lines,
  oddNumber,
  primaryBookmaker,
  useBackupBookmaker,
  backupBookmaker
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
      ? getSpreadAndTotalOddsFromBackupBookmaker(oddBackup, oddNumber)
      : 0;
  } else if (oddNumber == 1) {
    if (
      useBackupBookmaker &&
      oddPrimary[0].spread.point_spread_home_money === 0.0001
    ) {
      return getSpreadAndTotalOddsFromBackupBookmaker(oddBackup, oddNumber);
    } else {
      return oddPrimary[0].spread.point_spread_home_money * 100;
    }
  } else if (oddNumber == 2) {
    if (
      useBackupBookmaker &&
      oddPrimary[0].spread.point_spread_away_money === 0.0001
    ) {
      return getSpreadAndTotalOddsFromBackupBookmaker(oddBackup, oddNumber);
    } else {
      return oddPrimary[0].spread.point_spread_away_money * 100;
    }
  } else if (oddNumber == 3) {
    if (useBackupBookmaker && oddPrimary[0].total.total_over_money === 0.0001) {
      return getSpreadAndTotalOddsFromBackupBookmaker(oddBackup, oddNumber);
    } else {
      return oddPrimary[0].total.total_over_money * 100;
    }
  } else if (oddNumber == 4) {
    if (
      useBackupBookmaker &&
      oddPrimary[0].total.total_under_money === 0.0001
    ) {
      return getSpreadAndTotalOddsFromBackupBookmaker(oddBackup, oddNumber);
    } else {
      return oddPrimary[0].total.total_under_money * 100;
    }
  }
}

function getSpreadAndTotalOddsFromBackupBookmaker(oddBackup, oddNumber) {
  if (oddBackup.length == 0) {
    return 0;
  } else if (oddNumber == 1) {
    return oddBackup[0].spread.point_spread_home_money * 100;
  } else if (oddNumber == 2) {
    return oddBackup[0].spread.point_spread_away_money * 100;
  } else if (oddNumber == 3) {
    return oddBackup[0].total.total_over_money * 100;
  } else if (oddNumber == 4) {
    return oddBackup[0].total.total_under_money * 100;
  }
}

function checkSpreadAndTotal(
  doesSportSupportSpreadAndTotal,
  spreadLinesForGames,
  m,
  spreadHomePinnacle,
  spreadAwayPinnacle,
  totalLinesForGames,
  totalOverPinnacle,
  totalUnderPinnacle,
  spreadTotalsOddsForGames,
  spreadHomeOddsPinnacle,
  percentageChangePerSport,
  spreadAwayOddsPinnacle,
  totalOverOddsPinnacle,
  totalUnderOddsPinnacle
) {
  return (
    doesSportSupportSpreadAndTotal &&
    (checkSpreadAndTotalThreshold(
      spreadLinesForGames[m * 2],
      spreadHomePinnacle
    ) ||
      checkSpreadAndTotalThreshold(
        spreadLinesForGames[m * 2 + 1],
        spreadAwayPinnacle
      ) ||
      checkSpreadAndTotalThreshold(
        totalLinesForGames[m * 2],
        totalOverPinnacle
      ) ||
      checkSpreadAndTotalThreshold(
        totalLinesForGames[m * 2 + 1],
        totalUnderPinnacle
      ) ||
      getPercentageChange(
        spreadTotalsOddsForGames[m * 4],
        spreadHomeOddsPinnacle,
        percentageChangePerSport
      ) >= percentageChangePerSport ||
      getPercentageChange(
        spreadTotalsOddsForGames[m * 4 + 1],
        spreadAwayOddsPinnacle,
        percentageChangePerSport
      ) >= percentageChangePerSport ||
      getPercentageChange(
        spreadTotalsOddsForGames[m * 4 + 2],
        totalOverOddsPinnacle,
        percentageChangePerSport
      ) >= percentageChangePerSport ||
      getPercentageChange(
        spreadTotalsOddsForGames[m * 4 + 3],
        totalUnderOddsPinnacle,
        percentageChangePerSport
      ) >= percentageChangePerSport)
  );
}

function checkSpreadAndTotalThreshold(spreadOrTotalContract, spreadOrTotalAPI) {
  // todo add threshold
  // new line 0 200
  // remove line 200 0
  // change line 200 100
  // same line 200 200
  if (
    (spreadOrTotalContract == 0 && spreadOrTotalAPI != 0.01) ||
    (spreadOrTotalContract != 0 && spreadOrTotalAPI == 0.01) ||
    (spreadOrTotalContract != 0 &&
      spreadOrTotalAPI != 0.01 &&
      spreadOrTotalContract != spreadOrTotalAPI)
  ) {
    return true;
  }
  return false;
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
