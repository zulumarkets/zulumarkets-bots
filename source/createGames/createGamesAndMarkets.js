require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");

const Discord = require("discord.js");
const overtimeBot = new Discord.Client();
overtimeBot.login(process.env.BOT_OVERTIME_CREATOR);

const axios = require("axios");

const gamesQueue = require("../../contracts/GamesQueue.js");
const gamesWrapper = require("../../contracts/GamesWrapper.js");
const gamesConsumer = require("../../contracts/GamesConsumer.js");
const allowances = require("../../source/allowances.js");
const linkToken = require("../../contracts/LinkToken.js");
let ncaaSupportedTeams = require("./ncaaSupportedTeams.json");
let fifaWCSupportedTeams = require("./fifaWCSupportedTeams.json");

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

async function doCreate() {
  let amountOfToken = await erc20Instance.balanceOf(wallet.address);
  console.log("Amount token in wallet: " + parseInt(amountOfToken));
  console.log("Threshold: " + parseInt(process.env.LINK_THRESHOLD));

  if (parseInt(amountOfToken) < parseInt(process.env.LINK_THRESHOLD)) {
    await sendWarningMessageToDiscordAmountOfLinkInBotLessThenThreshold(
      "Amount of LINK in a creator-bot is: " + amountOfToken,
      process.env.LINK_THRESHOLD,
      wallet.address
    );
  }

  const jobId = bytes32({ input: process.env.JOB_ID_CREATION });

  const baseUrl = process.env.RUNDOWN_BASE_URL;

  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  const market = process.env.MARKET_CREATION;

  // sportId
  let sportIds = process.env.SPORT_IDS.split(",");

  let americanSports = [1, 2, 3, 4, 6, 10];
  let invalidNames = process.env.INVALID_NAMES.split(",");

  console.log("Number of invalid names" + invalidNames.length);
  console.log("---------------");
  console.log(invalidNames);
  console.log("---------------");

  let primaryBookmaker;
  let useBackupBookmaker;
  let backupBookmaker;

  console.log("Create Games...");

  let processed = false;
  let requestWasSend = false;
  let failedCounter = 0;
  while (!processed) {
    processed = true;

    console.log("JOB ID =  " + jobId);
    console.log("MARKET =  " + market);

    // do for all sportIds
    for (let j = 0; j < sportIds.length; j++) {
      let oddsBookmakers = await wrapper.getBookmakerIdsBySportId(sportIds[j]);
      useBackupBookmaker = oddsBookmakers.length > 1;
      primaryBookmaker = oddsBookmakers[0];
      console.log("Primary bookmaker is (id): " + primaryBookmaker);
      console.log("Use Backup Bookmaker is set to: " + useBackupBookmaker);

      if (useBackupBookmaker) {
        backupBookmaker = oddsBookmakers[1];
        console.log("Backup bookmaker is (id): " + backupBookmaker);
      }

      // do for next X days in front
      for (let i = 0; i <= daysInFront; i++) {
        console.log("------------------------");
        console.log("SPORT ID =  " + sportIds[j]);
        console.log("TODAY +  " + i);

        let unixDate = await getSecondsToDate(i);
        console.log("Unix date in seconds: " + unixDate);
        let unixDateMiliseconds = parseInt(unixDate) * process.env.MILISECONDS;
        console.log("Unix date in miliseconds: " + unixDateMiliseconds);

        const dayOfWeekDigit = new Date(parseInt(unixDateMiliseconds)).getDay();
        console.log("Day of week: " + dayOfWeekDigit);

        if (sportIds[j] == 7 && dayOfWeekDigit != 0 && dayOfWeekDigit != 6) {
          console.log("Skiping UFC fights if not weekend fights!");
          continue;
        }

        let sendRequestForCreate = false;

        let isSportTwoPositionsSport = await consumer.isSportTwoPositionsSport(
          sportIds[j]
        );

        const urlBuild =
          baseUrl +
          "/sports/" +
          sportIds[j] +
          "/events/" +
          dateConverter(unixDateMiliseconds);
        let response = await axios.get(urlBuild, {
          params: { key: process.env.REQUEST_KEY },
        });

        const gamesListResponse = [];

        let filteredResponse = [];
        if (sportIds[j] == 1) {
          response.data.events.forEach((o) => {
            if (o.teams_normalized != undefined) {
              if (
                ncaaSupportedTeams.includes(o.teams_normalized[0].name) &&
                ncaaSupportedTeams.includes(o.teams_normalized[1].name)
              ) {
                filteredResponse.push(o);
              }
            }
          });
        } else if (sportIds[j] == 7) {
          console.log("Filter out UFC fights only!");
          const scheduleListResponse = [];

          const urlBuildSchedule =
            baseUrl + "/sports/" + sportIds[j] + "/schedule";
          let responseSchedule = await axios.get(urlBuildSchedule, {
            params: { key: process.env.REQUEST_KEY },
          });

          responseSchedule.data.schedules.forEach((schedule) => {
            scheduleListResponse.push({
              id: schedule.event_id,
              leagueName: checkIfUndefinedLeague(schedule),
              broadcast: checkIfUndefinedBroadcast(schedule),
            });
          });

          console.log(
            "Schedule endpoint fetch number of elements: " +
              scheduleListResponse.length
          );

          response.data.events.forEach((o) => {
            for (let n = 0; n < scheduleListResponse.length; n++) {
              if (
                scheduleListResponse[n].id == o.event_id &&
                scheduleListResponse[n].leagueName ==
                  "Ultimate Fighting Championship" &&
                scheduleListResponse[n].broadcast == "PPV" &&
                o.score.event_status == "STATUS_SCHEDULED" &&
                o.teams_normalized != undefined &&
                !isNameInalid(invalidNames, o.teams_normalized[0].name) &&
                !isNameInalid(invalidNames, o.teams_normalized[1].name)
              ) {
                filteredResponse.push(o);
              }
            }
          });
        } else if (sportIds[j] == 18) {
          response.data.events.forEach((o) => {
            if (o.teams_normalized != undefined) {
              if (
                fifaWCSupportedTeams.includes(o.teams_normalized[0].name) &&
                fifaWCSupportedTeams.includes(o.teams_normalized[1].name)
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

        console.log(
          "Number of games: " +
            gamesListResponse.length +
            " in a date " +
            dateConverter(unixDateMiliseconds)
        );

        console.log(gamesListResponse);

        for (let n = 0; n < gamesListResponse.length; n++) {
          let isGameAlreadyFullFilled = await consumer.gameFulfilledCreated(
            bytes32({ input: gamesListResponse[n].id })
          );
          // if game is not fullfilled and not TBD awayTeam and homeTeam send request

          console.log(
            "Game: " +
              gamesListResponse[n].homeTeam +
              " vs " +
              gamesListResponse[n].awayTeam
          );
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

          if (
            !isGameAlreadyFullFilled &&
            !isNameInalid(invalidNames, gamesListResponse[n].awayTeam) &&
            !isNameInalid(invalidNames, gamesListResponse[n].homeTeam) &&
            isOddValid(gamesListResponse[n].homeOdd) &&
            isOddValid(gamesListResponse[n].awayOdd) &&
            (isSportTwoPositionsSport ||
              isOddValid(gamesListResponse[n].drawOdd))
          ) {
            sendRequestForCreate = true;
            break;
          }
        }

        if (sendRequestForCreate) {
          let gamesInBatch = [];
          if (sportIds[j] == 1 || sportIds[j] == 7 || sportIds[j] == 18) {
            filteredResponse.forEach((o) => {
              gamesInBatch.push(o.event_id);
            });
          }
          try {
            console.log("Send request...");

            console.log("Requesting games: " + gamesInBatch.length);
            console.log(gamesInBatch);
            if (gamesInBatch.length > process.env.CL_CREATE_BATCH) {
              let gamesInBatchforCL = [];
              for (let i = 0; i < gamesInBatch.length; i++) {
                gamesInBatchforCL.push(gamesInBatch[i]);
                if (
                  (gamesInBatchforCL.length > 0 &&
                    gamesInBatchforCL.length % process.env.CL_CREATE_BATCH ==
                      0) ||
                  gamesInBatch.length - 1 == i // last one
                ) {
                  console.log("Batch...");
                  console.log(gamesInBatchforCL);

                  let tx = await wrapper.requestGamesResolveWithFilters(
                    jobId,
                    market,
                    sportIds[j],
                    unixDate,
                    [], // add statuses for football OPTIONAL use property statuses ?? maybe IF sportIds[j]
                    gamesInBatchforCL,
                    {
                      gasLimit: process.env.GAS_LIMIT,
                    }
                  );
                  await tx.wait().then((e) => {
                    console.log(
                      "Requested for: " +
                        unixDate +
                        " with game id: " +
                        gamesInBatchforCL
                    );
                  });
                  requestWasSend = true;
                  gamesInBatchforCL = [];
                  await delay(5000);
                }
              }
            } else {
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
                console.log("Requested for: " + unixDate);
              });
              requestWasSend = true;
            }
          } catch (e) {
            console.log(e);
            await sendErrorMessageToDiscordRequestCL(
              "Request to CL creator-bot went wrong! Please check LINK amount on bot, or kill and debug!" +
                " EXCEPTION MESSAGE: " +
                e.message.slice(0, 200),
              sportIds[j],
              unixDate
            );
            failedCounter++;
            await delay(1 * 60 * 60 * 1000 * failedCounter); // wait X (failedCounter) hours for admin
          }
        }
      }
    }
  }

  console.log("waiting for queue to populate before Create Markets...");
  await delay(1000 * 60); // wait to be populated
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
          let tx = await consumer.createAllMarketsForGames(gameIds, {
            gasLimit: process.env.GAS_LIMIT,
          });

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
          await sendErrorMessageToDiscordCreateMarkets(
            "Market creation went wrong! Please check ETH on bot, or kill and debug!" +
              " EXCEPTION MESSAGE: " +
              e.message.slice(0, 200),
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
        "Request was send, but no games created, please check and debug! Stoping bot is mandatory!"
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
      console.log("---------START CREATION EXECUTION---------");
      console.log("Execution time: " + new Date());
      console.log("Execution number: " + numberOfExecution);
      await doCreate();
      numberOfExecution++;
      console.log("---------END CREATION EXECUTION---------");
      await delay(process.env.CREATION_FREQUENCY);
    } catch (e) {
      console.log(e);
      sendErrorMessageToDiscord(
        "Please check creation-bot, error on execution: " +
          numberOfExecution +
          ", EXCEPTION MESSAGE: " +
          e.message.slice(0, 200)
      );
      // wait next process
      await delay(process.env.CREATION_FREQUENCY);
    }
  }
}

doIndefinitely();

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

function isAmericanSport(americanSports, sport) {
  for (let j = 0; j < americanSports.length; j++) {
    if (americanSports[j] == sport) {
      return true;
    }
  }
  return false;
}

function isNameInalid(invalidNames, name) {
  for (let j = 0; j < invalidNames.length; j++) {
    if (invalidNames[j] == name) {
      console.log("Invalid name! Name: " + name);
      return true;
    }
  }
  return false;
}

function isOddValid(odd) {
  return odd != 0.01 && odd != 0;
}

function returnIndex(team, isHome) {
  if (team[1].is_home === isHome) {
    return 1;
  }
  return 0;
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

async function sendErrorMessageToDiscordRequestCL(
  messageForPrint,
  sportId,
  dateTimestamp
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on creation bot!",
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
  let overtimeCreate = await overtimeBot.channels.fetch("1004360039005442058");
  overtimeCreate.send(message);
}

async function sendErrorMessageToDiscordCreateMarkets(
  messageForPrint,
  gameIds
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on creation bot!",
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
  let overtimeCreate = await overtimeBot.channels.fetch("1004360039005442058");
  overtimeCreate.send(message);
}

async function sendErrorMessageToDiscord(messageForPrint) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on creation bot!",
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
  let overtimeCreate = await overtimeBot.channels.fetch("1004360039005442058");
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
        name: "Amount of LINK in creator-bot less then threshold!",
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
  let overtimeCreate = await overtimeBot.channels.fetch("1004753662859550790");
  overtimeCreate.send(message);
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

function checkIfUndefinedBroadcast(eventBroadcast) {
  if (eventBroadcast && eventBroadcast.broadcast) {
    return eventBroadcast.broadcast;
  }
  return "unknown";
}

function checkIfUndefinedLeague(eventLeague) {
  if (eventLeague && eventLeague.league_name) {
    return eventLeague.league_name;
  }
  return "unknown";
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
