require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");

const Discord = require("discord.js");
const overtimeBot = new Discord.Client();
overtimeBot.login(process.env.BOT_OVERTIME_RESOLVER);

const axios = require("axios");

const gamesQueue = require("../../contracts/GamesQueue.js");
const gamesWrapper = require("../../contracts/GamesWrapper.js");
const gamesConsumer = require("../../contracts/GamesConsumer.js");
const allowances = require("../../source/allowances.js");
const linkToken = require("../../contracts/LinkToken.js");
let ncaaSupportedTeams = require("../createGames/ncaaSupportedTeams.json");

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
    1: process.env.EXPECTED_GAME_NFL,
    2: process.env.EXPECTED_GAME_NFL,
    3: process.env.EXPECTED_GAME_MLB,
    4: process.env.EXPECTED_GAME_NBA,
    6: process.env.EXPECTED_GAME_NHL,
    7: process.env.EXPECTED_GAME_UFC,
    10: process.env.EXPECTED_GAME_FOOTBAL,
    11: process.env.EXPECTED_GAME_FOOTBAL,
    12: process.env.EXPECTED_GAME_FOOTBAL,
    13: process.env.EXPECTED_GAME_FOOTBAL,
    14: process.env.EXPECTED_GAME_FOOTBAL,
    15: process.env.EXPECTED_GAME_FOOTBAL,
    16: process.env.EXPECTED_GAME_FOOTBAL,
    18: process.env.EXPECTED_GAME_FOOTBAL,
  };

  const WAIT_FOR_RESULTS_TO_BE_UPDATED_BY_SPORT = {
    7: process.env.WAIT_FOR_RESULTS_TO_BE_UPDATED_UFC,
  };

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
      "Amount of LINK in a resolver-bot is: " + amountOfToken,
      process.env.LINK_THRESHOLD,
      wallet.address
    );
  }

  const jobId = bytes32({ input: process.env.JOB_ID_RESOLVE });

  // sportId
  let sportIds = process.env.SPORT_IDS.split(",");

  // how many days in back (day before and today is perfect because of timezone)
  const daysInBack = process.env.RESOLVE_DAYS_INBACK * -1;

  const baseUrl = process.env.RUNDOWN_BASE_URL;

  // resolve market
  const market = process.env.MARKET_RESOLVE;

  console.log("Resolving Games...");

  console.log("JOB ID =  " + jobId);
  console.log("MARKET =  " + market);

  let unproccessedGames = await queues.getLengthUnproccessedGames();
  console.log("GAMES length = " + unproccessedGames);

  let cancelStatuses = process.env.CANCEL_STATUSES.split(",");
  let resolvedStatuses = process.env.RESOLVE_STATUSES.split(",");

  let requestWasSend = false;
  let failedCounter = 0;

  // if there is no games no triggering
  if (unproccessedGames > 0) {
    // do it for all sports
    for (let j = 0; j < sportIds.length; j++) {
      let minutesToWait =
        WAIT_FOR_RESULTS_TO_BE_UPDATED_BY_SPORT[sportIds[j]] !== undefined
          ? WAIT_FOR_RESULTS_TO_BE_UPDATED_BY_SPORT[sportIds[j]]
          : process.env.WAIT_FOR_RESULTS_TO_BE_UPDATED_DEFAULT;
      for (let i = daysInBack; i <= 0; i++) {
        console.log("Processing: TODAY " + i);
        console.log("WAIT FOR RESULT (in minutes): " + minutesToWait);

        let unixDate = getSecondsToDate(i);

        console.log("Unix date in seconds: " + unixDate);
        let unixDateMiliseconds = parseInt(unixDate) * process.env.MILISECONDS;
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

        let gameIds = [];

        let sendAPIrequest = false;

        let timeInMiliseconds = new Date().getTime(); // miliseconds
        console.log("Time for proocessing:  " + timeInMiliseconds);

        // don't use API request if all games are already resolved
        for (let z = 0; z < gamesOnContract.length; z++) {
          if (sendAPIrequest) {
            break;
          }
          console.log("GAME: " + gamesOnContract[z]);

          let gameStart = await queues.gameStartPerGameId(gamesOnContract[z]);
          console.log("GAME start: " + gameStart);

          let expectedTimeToProcess =
            parseInt(gameStart) +
            parseInt(EXPECTED_GAME_DURATIN[parseInt(sportIds[j])]); // add hours  .env
          let expectedTimeToProcessInMiliseconds =
            parseInt(expectedTimeToProcess) * parseInt(process.env.MILISECONDS); // miliseconds
          console.log(
            "Time of processing (gameStart + .env): " +
              parseInt(expectedTimeToProcess)
          );
          console.log(
            "Time of processing (miliseconds): " +
              expectedTimeToProcessInMiliseconds
          );

          let isGameResultAlreadyFulfilled =
            await consumer.gameFulfilledResolved(gamesOnContract[z]);

          console.log(
            "isGameResultAlreadyFulfilled: " + isGameResultAlreadyFulfilled
          );

          let marketPerGameId = await consumer.marketPerGameId(
            gamesOnContract[z]
          );
          console.log("marketPerGameId: " + marketPerGameId);

          let marketCreated = await consumer.marketCreated(marketPerGameId);
          console.log("marketCreated: " + marketCreated);

          if (
            expectedTimeToProcessInMiliseconds < timeInMiliseconds &&
            !isGameResultAlreadyFulfilled &&
            marketCreated
          ) {
            sendAPIrequest = true;
          }
        }

        // there is games and there are games that are ready to be resolved
        if (isSportOnADate && gamesOnContract.length > 0 && sendAPIrequest) {
          console.log("Processing sport and date...");

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

          let filteredResponse = [];
          if (sportIds[j] == 1) {
            response.data.events.forEach((o) => {
              if (o.teams != undefined) {
                if (
                  ncaaSupportedTeams.includes(o.teams_normalized[0].name) &&
                  ncaaSupportedTeams.includes(o.teams_normalized[1].name)
                ) {
                  filteredResponse.push(o);
                }
              }
            });
          } else {
            filteredResponse = response.data.events;
          }

          filteredResponse.forEach((event) => {
            gamesListResponse.push({
              id: event.event_id,
              status: checkIfUndefined(event.score),
              updatedAt: checkIfUndefinedDate(event.score),
            });
          });

          // iterate over games on contract and API
          for (let n = 0; n < gamesListResponse.length; n++) {
            let gameIdContract = bytes32({ input: gamesListResponse[n].id });
            console.log("Game id (on contract): -> " + gameIdContract);
            console.log("Game id API: " + gamesListResponse[n].id);
            let isGameResultAlreadyFulfilledInner =
              await consumer.gameFulfilledResolved(gameIdContract);
            console.log("Status: " + gamesListResponse[n].status);
            console.log("UpdatedAt: " + gamesListResponse[n].updatedAt);
            console.log(
              "Result already fulfilled: " + isGameResultAlreadyFulfilledInner
            );

            let marketId = await consumer.marketPerGameId(gameIdContract);
            console.log("Market ID: " + marketId);

            let isMarketCreated = await consumer.marketCreated(marketId);
            console.log("is market created: " + isMarketCreated);

            let isMarketResolved = await consumer.marketResolved(marketId);
            console.log("is market resolved already: " + isMarketResolved);

            let isMarketCanceled = await consumer.marketCanceled(marketId);
            console.log("is market canceled already: " + isMarketCanceled);

            // see if games are in right status CANCELED or RESOLVED and passed X minutes after result is printed
            // and result is not set and market for that game exists
            if (
              (isGameInRightStatus(
                cancelStatuses,
                gamesListResponse[n].status
              ) ||
                isGameInRightStatus(
                  resolvedStatuses,
                  gamesListResponse[n].status
                )) &&
              scoreUpdatedAtCheck(
                timeInMiliseconds,
                gamesListResponse[n].updatedAt,
                minutesToWait
              ) &&
              !isGameResultAlreadyFulfilledInner &&
              isMarketCreated &&
              !isMarketResolved &&
              !isMarketCanceled
            ) {
              gameIds.push(gamesListResponse[n].id);
            }
          }

          console.log("Game to be processed....");
          console.log(gameIds);

          if (gameIds.length > 0) {
            try {
              console.log("Send request...");
              console.log("Games...");
              console.log(gameIds);
              // do it if less than batch number
              if (gameIds.length <= process.env.CL_RESOLVE_BATCH) {
                let tx = await wrapper.requestGamesResolveWithFilters(
                  jobId,
                  market,
                  sportIds[j],
                  unixDate,
                  [], // add statuses for football OPTIONAL use property statuses ?? maybe IF sportIds[j]
                  gameIds,
                  {
                    gasLimit: process.env.GAS_LIMIT,
                  }
                );

                await tx.wait().then((e) => {
                  console.log(
                    "Requested for: " + unixDate + " with game id: " + gameIds
                  );
                });
                requestWasSend = true;
              } else {
                console.log("Executing in batch...");
                let gamesInBatch = [];
                for (let i = 0; i < gameIds.length; i++) {
                  gamesInBatch.push(gameIds[i]);
                  if (
                    (gamesInBatch.length > 0 &&
                      gamesInBatch.length % process.env.CL_RESOLVE_BATCH ==
                        0) ||
                    gameIds.length - 1 == i // last one
                  ) {
                    console.log("Batch...");
                    console.log(gamesInBatch);

                    let tx = await wrapper.requestGamesResolveWithFilters(
                      jobId,
                      market,
                      sportIds[j],
                      unixDate,
                      [], // add statuses for football OPTIONAL use property statuses ?? maybe IF sportIds[j]
                      gamesInBatch,
                      {
                        gasLimit: process.env.GAS_LIMIT,
                      }
                    );

                    await tx.wait().then((e) => {
                      console.log(
                        "Requested for: " +
                          unixDate +
                          " with game id: " +
                          gamesInBatch
                      );
                    });
                    requestWasSend = true;
                    gamesInBatch = [];
                    await delay(5000);
                  }
                }
              }
            } catch (e) {
              console.log(e);
              await sendErrorMessageToDiscordRequestToCL(
                "Request to CL from resolver-bot went wrong! Please check LINK amount on bot, or kill and debug!",
                sportIds[j],
                unixDate,
                gameIds
              );
              failedCounter++;
              await delay(1 * 60 * 60 * 1000 * failedCounter); // wait X (failedCounter) hours for admin
            }
          }
        } else {
          console.log(
            "No games on date: " +
              unixDate +
              " for sport " +
              sportIds[j] +
              ", or all are resolved / waiting right time to be resolved!"
          );
        }
      }
    }
  }

  await delay(10000); // wait to be populated
  console.log("Resolving Markets...");

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
          let tx = await consumer.resolveAllMarketsForGames(gameIds, {
            gasLimit: process.env.GAS_LIMIT,
          });

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
          await sendErrorMessageToDiscordMarketResolve(
            "Market resolve went wrong! Please check ETH on bot, or kill and debug!",
            gameIds
          );
          failedCounter++;
          await delay(1 * 60 * 60 * 1000 * failedCounter); // wait X (failedCounter) hours for admin
          break;
        }
      } else {
        continue;
      }
    }
  } else {
    if (requestWasSend) {
      console.log("Nothing but request is send!!!!");
      await sendErrorMessageToDiscord(
        "Request was send, but no games resolved, please check and debug! Stoping bot is mandatory!"
      );
      failedCounter++;
      await delay(1 * 60 * 60 * 1000 * failedCounter); // wait X (failedCounter) hours for admin
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
  var numberOfExecution = 0;
  while (true) {
    try {
      console.log("---------START RESOLVE EXECUTION---------");
      console.log("Execution time: " + new Date());
      console.log("Execution number: " + numberOfExecution);
      await doResolve();
      numberOfExecution++;
      console.log("---------END RESOLVE EXECUTION---------");
      await delay(process.env.RESOLVE_FREQUENCY);
    } catch (e) {
      console.log(e);
      sendErrorMessageToDiscord(
        "Please check resolve-bot, error on execution: " +
          numberOfExecution +
          ", date: " +
          new Date()
      );
      // wait next process
      await delay(process.env.RESOLVE_FREQUENCY);
    }
  }
}

async function sendErrorMessageToDiscordRequestToCL(
  messageForPrint,
  sportId,
  timestamp,
  gameId
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on resolve bot!",
        value: "\u200b",
      },
      {
        name: ":exclamation: Error message:",
        value: messageForPrint,
      },
      {
        name: ":hammer_pick: Input params:",
        value:
          "GameId: " +
          gameId +
          ", sportId: " +
          sportId +
          ", date (unix date): " +
          timestamp,
      },
      {
        name: ":alarm_clock: Timestamp:",
        value: new Date(new Date().toUTCString()),
      }
    )
    .setColor("#0037ff");
  let overtimeResolver = await overtimeBot.channels.fetch(
    "1004360121540956200"
  );
  overtimeResolver.send(message);
}

async function sendErrorMessageToDiscordMarketResolve(
  messageForPrint,
  gameIds
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on resolve bot!",
        value: "\u200b",
      },
      {
        name: ":exclamation: Error message:",
        value: messageForPrint,
      },
      {
        name: ":hammer_pick: Input params:",
        value: gameIds,
      },
      {
        name: ":alarm_clock: Timestamp:",
        value: new Date(new Date().toUTCString()),
      }
    )
    .setColor("#0037ff");
  let overtimeResolver = await overtimeBot.channels.fetch(
    "1004360121540956200"
  );
  overtimeResolver.send(message);
}

async function sendErrorMessageToDiscord(messageForPrint) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on resolve bot!",
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
  let overtimeCreate = await overtimeBot.channels.fetch("1004360121540956200");
  overtimeCreate.send(message);
}

async function sendWarningMessageToDiscordAmountOfLinkInBotLessThenThreshold(
  messageForPrint,
  threshold,
  wallet
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Amount of LINK in resolver-bot less then threshold!",
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
  let overtimeCreate = await overtimeBot.channels.fetch("1004756643977900062");
  overtimeCreate.send(message);
}

function dateConverter(UNIXTimestamp) {
  var date = new Date(UNIXTimestamp);
  var month = date.getUTCMonth() + 1; // starts from zero (0) -> January
  return date.getUTCFullYear() + "-" + month + "-" + date.getUTCDate();
}

function isGameInRightStatus(statuses, status) {
  for (let j = 0; j < statuses.length; j++) {
    if (statuses[j] == status) {
      console.log("Game is in status: " + status);
      return true;
    }
  }
  return false;
}

function scoreUpdatedAtCheck(currentTime, updatedAt, minutesToWait) {
  console.log(Date.parse(updatedAt));
  console.log(currentTime);
  console.log(
    "Ready for processing " +
      (parseInt(Date.parse(updatedAt)) + parseInt(minutesToWait * 60 * 1000) <
        parseInt(currentTime))
  );
  return (
    parseInt(Date.parse(updatedAt)) > 0 &&
    parseInt(Date.parse(updatedAt)) + parseInt(minutesToWait * 60 * 1000) <
      parseInt(currentTime)
  );
}

function checkIfUndefined(eventScore) {
  if (eventScore && eventScore.event_status) {
    return eventScore.event_status;
  }
  return "STATUS_UNKNOWN";
}

function checkIfUndefinedDate(eventUpdatedAt) {
  if (eventUpdatedAt && eventUpdatedAt.updated_at) {
    return eventUpdatedAt.updated_at;
  }
  return "0001-01-01T00:00:00Z";
}

function getSecondsToDate(dateFrom) {
  const date = new Date(Date.now() + dateFrom * 3600 * 1000 * 24);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

doIndefinitely();

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
