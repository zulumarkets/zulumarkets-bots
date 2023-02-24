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
const allowances = require("../allowances.js");
const linkToken = require("../../contracts/LinkToken.js");
let supportedGender = require("./supportedGender.json"); // leagues/tour types etc.
let supportedLeaguesTennis = require("./supportedLeaguesTennis.json"); // leagues/tour types etc.
let supportedLeaguesFootball = require("./supportedLeaguesFootball.json"); // leagues/tour types etc.
let tennisTournaments = require("./tennisSupportTournament.json"); // supported tennis tournamens
let footballTournament = require("./footballSupportTournament.json"); // supported tennis tournamens
// todo add suported other leagues

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

async function doCreate(network, botName) {
  const LEAGUES_BY_SPORT = {
    1: supportedLeaguesFootball,
    2: supportedLeaguesTennis,
  };

  const TOURNAMENTS_BY_SPORT = {
    1: footballTournament,
    2: tennisTournaments,
  };
  let amountOfToken = await erc20Instance.balanceOf(wallet.address);
  console.log("Amount token in wallet: " + parseInt(amountOfToken));
  console.log("Threshold: " + parseInt(process.env.LINK_THRESHOLD));

  if (parseInt(amountOfToken) < parseInt(process.env.LINK_THRESHOLD)) {
    await sendWarningMessageToDiscordAmountOfLinkInBotLessThenThreshold(
      "Amount of LINK in a " + botName + " is: " + amountOfToken,
      process.env.LINK_THRESHOLD,
      wallet.address,
      network
    );
  }

  const jobId = bytes32({ input: process.env.JOB_ID_CREATION });

  const baseUrl_temlate = process.env.TOURNAMENT_TAMPLATE_BASE_URL;
  const baseURL_tournament = process.env.TOURNAMENT_BASE_URL;
  const baseURL_stage = process.env.TOURNAMENT_STAGE_BASE_URL;
  const baseUrl_events = process.env.TOURNAMENT_EVENTS_BASE_URL;
  const baseUrl_odds = process.env.TOURNAMENT_EVENT_ODDS_BASE_URL;

  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  const market = process.env.MARKET_CREATION;

  // sportId
  let sportIds = process.env.SPORT_IDS.split(",");

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
      let leaguesbySport = [];
      if (LEAGUES_BY_SPORT[sportIds[j]] !== undefined) {
        leaguesbySport = LEAGUES_BY_SPORT[sportIds[j]];
      } else {
        // move to the next!!!
        console.log("Not supported (league)!");
        continue;
      }

      console.log("Leagues count: " + leaguesbySport.length);

      let tournamentsbySport = [];
      if (TOURNAMENTS_BY_SPORT[sportIds[j]] !== undefined) {
        tournamentsbySport = TOURNAMENTS_BY_SPORT[sportIds[j]];
      } else {
        console.log("Not supported (tournaments)!");
        // move to the next!!!
        continue;
      }

      console.log("Tournaments count: " + tournamentsbySport.length);

      // get turnament types (Example GS, ATP event etc.) for given sport
      let responseTournament = await axios.get(baseUrl_temlate, {
        params: {
          username: process.env.USERNAME_ENETPULS,
          token: process.env.REQUEST_KEY_ENETPULS,
          sportFK: sportIds[j],
        },
      });

      var tournamentType = [];
      for (key in responseTournament.data.tournament_templates) {
        tournamentType.push(
          Object.assign(responseTournament.data.tournament_templates[key], {
            id: key,
          })
        );
      }

      console.log("Tournament type count: " + tournamentType.length);

      // filter only supported turnaments by name
      tournamentType = tournamentType.filter((tournamnet) =>
        leaguesbySport.includes(tournamnet.id)
      );
      console.log("Tournament type count (filtered): " + tournamentType.length);

      var tournaments = [];
      // get tournamet by tournament types
      for (let z = 0; z < tournamentType.length; z++) {
        console.log("Tournament type: " + tournamentType[z].id);

        let oddsBookmakers = await wrapper.getBookmakerIdsBySportId(
          tournamentType[z].id
        );
        useBackupBookmaker = oddsBookmakers.length > 1;
        primaryBookmaker = "" + oddsBookmakers[0];
        console.log("Primary bookmaker is (id): " + primaryBookmaker);
        console.log("Use Backup Bookmaker is set to: " + useBackupBookmaker);

        if (useBackupBookmaker) {
          backupBookmaker = "" + oddsBookmakers[1];
          console.log("Backup bookmaker is (id): " + backupBookmaker);
        }

        let responseTournaments = await axios.get(baseURL_tournament, {
          params: {
            username: process.env.USERNAME_ENETPULS,
            token: process.env.REQUEST_KEY_ENETPULS,
            tournament_templateFK: tournamentType[z].id,
          },
        });

        for (key in responseTournaments.data.tournaments) {
          tournaments.push(
            Object.assign(responseTournaments.data.tournaments[key], {
              id: key,
            })
          );
        }

        console.log("Tournaments count: " + tournaments.length);

        // filter out only current year
        tournaments = tournaments.filter(
          (item) => item.name === process.env.YEAR_OF_CALCULATION
        );
        console.log("Tournaments count (filtered): " + tournaments.length);

        var stages = [];
        // get tournamet tages by tournament ID's
        for (let z = 0; z < tournaments.length; z++) {
          console.log("Tournament ids: " + tournaments[z].id);

          let stagesTournaments = await axios.get(baseURL_stage, {
            params: {
              username: process.env.USERNAME_ENETPULS,
              token: process.env.REQUEST_KEY_ENETPULS,
              tournamentFK: tournaments[z].id,
            },
          });

          for (key in stagesTournaments.data.tournament_stages) {
            stages.push(
              Object.assign(stagesTournaments.data.tournament_stages[key], {
                id: key,
              })
            );
          }
        }

        console.log("Stages count: " + stages.length);

        // filter only supported turnaments by name
        stages = stages.filter(
          (stage) =>
            tournamentsbySport.includes(stage.name) &&
            supportedGender.includes(stage.gender)
        );
        console.log("Stages count (filtered): " + stages.length);

        var events = [];
        // get tournamet tages by tournament ID's
        for (let z = 0; z < stages.length; z++) {
          console.log("Stages ids: " + stages[z].id);

          let eventsResponse = await axios.get(baseUrl_events, {
            params: {
              username: process.env.USERNAME_ENETPULS,
              token: process.env.REQUEST_KEY_ENETPULS,
              tournament_stageFK: stages[z].id,
              includeEventProperties: "yes", //add `EventTypeName` -> "Male Single"
            },
          });

          for (key in eventsResponse.data.events) {
            events.push(
              Object.assign(eventsResponse.data.events[key], {
                id: key,
              })
            );
          }
        }

        console.log("Events count: " + events.length);
        var isNotTennis = sportIds[j] == 2 ? false : true;
        console.log("Is not tennis: " + isNotTennis);

        // filter only events that are not started and event which start after daysInFront and if tennis only male singles
        events = events.filter((event) => {
          return (
            event.status_type === "notstarted" &&
            getUnixDateFromString(event.startdate) <=
              getSecondsToDate(daysInFront) &&
            (isNotTennis ||
              Object.values(event.property).filter(
                (props) => props.name === "EventTypeName"
              )[0].value === "Male Single")
          );
        });
        console.log("Events count (filtered): " + events.length);

        var mapDaysAndEvents = new Map();
        events.forEach((o) => {
          console.log(o.id);
          let arrayOfGames = [];
          var dateAsUnixFormat = getUnixDateFromString(o.startdate);

          if (typeof mapDaysAndEvents.get(dateAsUnixFormat) != "undefined") {
            arrayOfGames = mapDaysAndEvents.get(dateAsUnixFormat);
            arrayOfGames.push(o.id);
          } else {
            arrayOfGames.push(o.id);
          }

          mapDaysAndEvents.set(dateAsUnixFormat, arrayOfGames); // to set the value using key
        });

        // do for next X days in front
        for (let i = 0; i <= daysInFront; i++) {
          console.log("------------------------");
          console.log("SPORT ID =  " + sportIds[j]);
          console.log("TODAY +  " + i);

          let unixDate = getSecondsToDate(i);
          console.log("Unix date in seconds: " + unixDate);

          let sendRequestForCreate = false;

          let isSportTwoPositionsSport =
            await consumer.isSportTwoPositionsSport(sportIds[j]);

          let gamesOnADate = mapDaysAndEvents.get(unixDate);

          if (typeof gamesOnADate != "undefined") {
            console.log("*** processing games ids ***");
            console.log("Count games: " + gamesOnADate.length);
            console.log(gamesOnADate);
            console.log("*** processing games ids***");
            for (let n = 0; n < gamesOnADate.length; n++) {
              let isGameAlreadyFullFilled = await consumer.gameFulfilledCreated(
                bytes32({ input: gamesOnADate[n] })
              );
              console.log("Checking Game (id api): " + gamesOnADate[n]);
              console.log(
                "Checking Game (id bytes): " +
                  bytes32({ input: gamesOnADate[n] })
              );
              console.log("Fulfilled: " + isGameAlreadyFullFilled);

              // if game is not fulfiled check if odds are there
              if (!isGameAlreadyFullFilled) {
                let odds = [];
                let oddsPerGameResponse = await axios.get(baseUrl_odds, {
                  params: {
                    username: process.env.USERNAME_ENETPULS,
                    token: process.env.REQUEST_KEY_ENETPULS,
                    objectFK: gamesOnADate[n],
                    odds_providerFK: primaryBookmaker,
                    outcome_typeFK: process.env.OUTCOME_FK,
                  },
                });

                for (key in oddsPerGameResponse.data.preodds) {
                  odds.push(
                    Object.assign(oddsPerGameResponse.data.preodds[key], {
                      id: key,
                    })
                  );
                }

                console.log("Odds count: " + odds.length);

                odds = odds.filter((checkingOdds) => {
                  return (
                    Object.values(checkingOdds.preodds_bettingoffers).filter(
                      (props) => props.odds_providerFK === primaryBookmaker
                    )[0].odds > 0
                  );
                });

                console.log("Odds count (filtered): " + odds.length);

                // there is odds for both participant
                if (odds.length > 1) {
                  sendRequestForCreate = true;
                  break;
                }
              }
            }

            console.log(
              "For date " +
                unixDate +
                ", request is sending: " +
                sendRequestForCreate +
                ", sport id: " +
                tournamentType[z].id
            );

            if (sendRequestForCreate) {
              let gamesInBatch = []; // only collect ID's

              gamesOnADate.forEach((o) => {
                gamesInBatch.push(o);
              });

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
                        gamesInBatchforCL.length %
                          process.env.CL_CREATE_BATCH ==
                          0) ||
                      gamesInBatch.length - 1 == i // last one
                    ) {
                      console.log("Batch...");
                      console.log(gamesInBatchforCL);

                      let tx = await wrapper.requestGamesResolveWithFilters(
                        jobId,
                        market,
                        tournamentType[z].id, // todo add 100000
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
                    tournamentType[z].id, // todo add 100000
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
                  "Request to CL " +
                    botName +
                    " went wrong! Please check LINK amount on bot, or kill and debug!" +
                    " EXCEPTION MESSAGE: " +
                    e.message.slice(0, 180),
                  tournamentType[z].id,
                  unixDate,
                  network,
                  botName
                );
                failedCounter++;
                await delay(1 * 60 * 60 * 1000 * failedCounter); // wait X (failedCounter) hours for admin*/
              }
            }
          } else {
            console.log("No games on that date for processing!");
            console.log("-------------------------------------");
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
              e.message.slice(0, 180),
            gameIds,
            network,
            botName
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
        "Request was send, but no games created, please check and debug! Stoping bot is mandatory!",
        network,
        botName
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
  let network = process.env.NETWORK;
  let botName = process.env.BOT_NAME;
  console.log("Bot name: " + botName);
  var numberOfExecution = 0;
  while (true) {
    try {
      console.log("---------START CREATION EXECUTION---------");
      console.log("Execution time: " + new Date());
      console.log("Execution number: " + numberOfExecution);
      await doCreate(network, botName);
      numberOfExecution++;
      console.log("---------END CREATION EXECUTION---------");
      await delay(process.env.CREATION_FREQUENCY);
    } catch (e) {
      console.log(e);
      await sendErrorMessageToDiscord(
        "Please check " +
          botName +
          ", error on execution: " +
          numberOfExecution +
          ", EXCEPTION MESSAGE: " +
          e.message.slice(0, 200),
        network,
        botName
      );
      // wait next process
      await delay(process.env.CREATION_FREQUENCY);
    }
  }
}

doIndefinitely();

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
  dateTimestamp,
  network,
  botName
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on creation bot!",
        value: "\u200b",
      },
      {
        name: ":chains: Network:",
        value: network,
      },
      {
        name: ":robot: Bot:",
        value: botName,
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
  gameIds,
  network,
  botName
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on creation bot!",
        value: "\u200b",
      },
      {
        name: ":chains: Network:",
        value: network,
      },
      {
        name: ":robot: Bot:",
        value: botName,
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

async function sendErrorMessageToDiscord(messageForPrint, network, botName) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on creation bot!",
        value: "\u200b",
      },
      {
        name: ":chains: Network:",
        value: network,
      },
      {
        name: ":robot: Bot:",
        value: botName,
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
  wallet,
  network
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
        name: ":chains: Network:",
        value: network,
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

function getUnixDateFromString(stringDate) {
  const date = new Date(stringDate);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}