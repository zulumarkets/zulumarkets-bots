require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");

const Discord = require("discord.js");
const overtimeBot = new Discord.Client();
overtimeBot.login(process.env.BOT_OVERTIME_DATA_CHECKER);

const axios = require("axios");

const gamesQueue = require("../../contracts/GamesQueue.js");
const gamesWrapper = require("../../contracts/GamesWrapper.js");
const gamesConsumer = require("../../contracts/GamesConsumer.js");
const allowances = require("../allowances.js");
const linkToken = require("../../contracts/LinkToken.js");
const gamesVerifier = require("../../contracts/RundownVerifier.js");
let supportedGender = require("../createGames/supportedGender.json"); // leagues/tour types etc.
let supportedLeaguesTennis = require("../createGames/supportedLeaguesTennis.json"); // leagues/tour types etc.
let supportedLeaguesFootball = require("../createGames/supportedLeaguesFootball.json"); // leagues/tour types etc.
let tennisTournaments = require("../createGames/tennisSupportTournament.json"); // supported tennis tournamens
let footballTournament = require("../createGames/footballSupportTournament.json"); // supported tennis tournamens
let supportedLeaguesCsGo = require("../createGames/supportedLeaguesCsGo.json"); // leagues/tour types etc.
let supportedLeaguesDota = require("../createGames/supportedLeaguesDota.json"); // leagues/tour types etc.
let supportedLeaguesLol = require("../createGames/supportedLeaguesLol.json"); // leagues/tour types etc.
let csGoSupportedTournaments = require("../createGames/supportTournamentCsGo.json"); // supported CSGO
let dotaSupportedTournaments = require("../createGames/supportTournamentDota.json"); // supported Dota
let lolSupportedTournaments = require("../createGames/supportTournamentLol.json"); // supported Lol

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

const verifier = new ethers.Contract(
  process.env.CONSUMER_VERIFIER_CONTRACT,
  gamesVerifier.rundownVerifier.abi,
  wallet
);

let requestIdList = [];

async function doCheck(network, botName) {
  const LEAGUES_BY_SPORT = {
    1: supportedLeaguesFootball,
    2: supportedLeaguesTennis,
    84: supportedLeaguesCsGo,
    85: supportedLeaguesDota,
    92: supportedLeaguesLol,
  };

  const TOURNAMENTS_BY_SPORT = {
    1: footballTournament,
    2: tennisTournaments,
    84: csGoSupportedTournaments,
    85: dotaSupportedTournaments,
    92: lolSupportedTournaments,
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

  const baseUrl_template = process.env.TOURNAMENT_TAMPLATE_BASE_URL;
  const baseURL_tournament = process.env.TOURNAMENT_BASE_URL;
  const baseURL_stage = process.env.TOURNAMENT_STAGE_BASE_URL;
  const baseUrl_events = process.env.TOURNAMENT_EVENTS_BASE_URL;

  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  const market = process.env.MARKET_CREATION;
  let failedCounter = 0;

  // sportId
  let sportIds = process.env.SPORT_IDS.split(",");
  let yearOfCalculation = process.env.YEAR_OF_CALCULATION.split(",");

  console.log("Checking Games...");

  let requestWasSend = false;

  console.log("JOB ID =  " + jobId);

  // foreach sport
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
    let responseTournament = await axios.get(baseUrl_template, {
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
      tournaments = tournaments.filter((item) =>
        isNameInYear(item.name, yearOfCalculation)
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
      for (let a = 0; a < events.length; a++) {
        console.log("Game id (as string): -> " + events[a].id);
        let gameIdContract = bytes32({ input: events[a].id });
        console.log("Game id (on contract): -> " + gameIdContract);
        console.log("Game status -> " + events[a].status_type);

        let gameProp = await verifier.getGameProperties(gameIdContract);

        let marketAddress = gameProp[0];
        console.log("Market:  " + marketAddress);
        let isMarketCreated = await consumer.marketCreated(marketAddress);
        console.log("Is market created:  " + isMarketCreated);

        let isMarketCanceled = gameProp[2];
        console.log("Is market canceled:  " + isMarketCanceled);

        // get by ID and only notstarted events
        if (
          !isMarketCanceled &&
          isMarketCreated &&
          events[a].status_type == "notstarted"
        ) {
          console.log("Game time API: " + events[a].startdate);
          let newDateOnAPI = convertStartGameIntoUnix(events, a);
          console.log("Game time API (unix): " + newDateOnAPI);

          let gameStartContract = await queues.gameStartPerGameId(
            gameIdContract
          );
          let gameCreatedOnContract = await consumer.getGameCreatedById(
            gameIdContract
          );

          let canMarketBeUpdated = await consumer.canMarketBeUpdated(
            marketAddress
          );
          console.log("Can market be updated: " + canMarketBeUpdated);

          console.log("Game time Contract: " + gameStartContract);
          console.log("Game on Contract: " + gameCreatedOnContract);
          console.log("Home team on Contract: " + gameCreatedOnContract[5]);
          console.log("Away team on Contract: " + gameCreatedOnContract[6]);
          if (parseInt(gameStartContract) != parseInt(newDateOnAPI)) {
            let cuerrentTimeInMili = new Date().getTime(); // miliseconds
            console.log("Time for proocessing:  " + cuerrentTimeInMili);

            if (
              parseInt(newDateOnAPI) * 1000 >
                parseInt(gameStartContract) * 1000 &&
              parseInt(newDateOnAPI) * 1000 >
                cuerrentTimeInMili + 10 * 60 * 1000
            ) {
              console.log("Ignore!");
            } else {
              console.log("Time of a game UPDATED!!!");
              console.log("Afected game: " + events[a].id);
              if (canMarketBeUpdated) {
                let arrayOfGames = [];
                var dateOfAGameAsUnixFormat = getUnixDateFromString(
                  events[a].startdate
                );

                if (
                  typeof mapDaysAndEvents.get(dateOfAGameAsUnixFormat) !=
                  "undefined"
                ) {
                  arrayOfGames = mapDaysAndEvents.get(dateOfAGameAsUnixFormat);
                  arrayOfGames.push(events[a].id);
                } else {
                  arrayOfGames.push(events[a].id);
                }

                mapDaysAndEvents.set(dateOfAGameAsUnixFormat, arrayOfGames); // to set the value using key

                await sendMessageToDiscordTimeOfAGameHasChanged(
                  "Time of a game has changed!!!",
                  events[a].id,
                  gameIdContract,
                  gameCreatedOnContract[5],
                  gameCreatedOnContract[6],
                  parseInt(gameStartContract),
                  parseInt(newDateOnAPI),
                  network
                );
              }
            }
          }
        }
      }

      for (let i = 0; i <= daysInFront; i++) {
        console.log("------------------------");
        console.log("SPORT ID =  " + tournamentType[z].id);
        console.log("TODAY +  " + i);

        let unixDate = getSecondsToDate(i);
        console.log("Unix date in seconds: " + unixDate);

        let gamesToBeProcessed = mapDaysAndEvents.get(unixDate);

        if (typeof gamesToBeProcessed != "undefined") {
          console.log("*** processing games ids ***");
          console.log("Count games: " + gamesToBeProcessed.length);
          console.log(gamesToBeProcessed);
          if (gamesToBeProcessed.length > 0) {
            try {
              console.log("Send request to CL...");

              let tx_request = await wrapper.requestGamesResolveWithFilters(
                jobId,
                market,
                tournamentType[z].id,
                unixDate,
                [], // add statuses for football OPTIONAL use property statuses ?? maybe IF tournamentType[z].id
                gamesToBeProcessed,
                {
                  gasLimit: process.env.GAS_LIMIT,
                }
              );

              await tx_request.wait().then((e) => {
                console.log(
                  "Requested for date: " +
                    unixDate +
                    ", sportID: " +
                    tournamentType[z].id +
                    ", and games: " +
                    gamesToBeProcessed
                );

                let events = e.events.filter(
                  (evn) => evn.event === "ChainlinkRequested"
                );
                if (events.length > 0) {
                  const requestId = events[0].args.id;
                  console.log("Chainlink request id is: " + requestId);
                  requestIdList.push(requestId);
                }
              });
            } catch (e) {
              console.log(e);
              await sendErrorMessageToDiscordRequestCL(
                "Request to CL from " +
                  botName +
                  " went wrong! Please check LINK amount on bot, or kill and debug!" +
                  " EXCEPTION MESSAGE: " +
                  e.message.slice(0, 180),
                tournamentType[z].id,
                unixDate,
                gamesToBeProcessed,
                network,
                botName
              );
              failedCounter++;
              await delay(1 * 60 * 60 * 1000 * failedCounter); // wait X (failedCounter) hours for admin
            }
          }
        }
      }
    }
  }

  console.log("End of checking part...");

  if (requestWasSend) {
    await delay(30 * 1000); // wait to be populated

    console.log("Create New Markets...");
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
              "Market creation went wrong, on " +
                botName +
                " bot! Please check ETH on bot, or kill and debug!" +
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
      console.log("Nothing but request is send!!!!");
      await delay(1 * 60 * 1000); // wait minute
      if (requestIdList.length > 0) {
        let isFulfilled = await wrapper.areCreatedRequestIdsFulFilled(
          requestIdList
        );
        if (!isFulfilled) {
          await sendErrorMessageToDiscord(
            "Request was send, team names was changed, but no games created, please check and debug! Stoping bot is mandatory!",
            network,
            botName
          );
          failedCounter++;
          await delay(1 * 60 * 60 * 1000 * failedCounter); // wait X (failedCounter) hours for admin
        } else {
          requestIdList = [];
        }
      }
    }
  } else {
    console.log("Nothing to recreate...");
  }

  requestIdList = [];
  console.log("Ended batch...");
}

function convertStartGameIntoUnix(events, a) {
  return Math.floor(new Date(events[a].startdate).getTime() / 1000);
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
      console.log("---------START CHECK EXECUTION---------");
      console.log("Execution time: " + new Date());
      console.log("Execution number: " + numberOfExecution);
      await doCheck(network, botName);
      numberOfExecution++;
      console.log("---------END CHECK EXECUTION---------");
      await delay(process.env.DATA_CHECKER_FREQUENCY);
    } catch (e) {
      console.log(e);
      await sendErrorMessageToDiscord(
        "Please check " +
          botName +
          ", error on execution: " +
          numberOfExecution +
          ", sports: " +
          process.env.SPORT_IDS +
          ", EXCEPTION MESSAGE: " +
          e.message.slice(0, 200),
        network,
        botName
      );
      // wait next process
      await delay(process.env.DATA_CHECKER_FREQUENCY);
    }
  }
}

doIndefinitely();

function getSecondsToDate(dateFrom) {
  const date = new Date(Date.now() + dateFrom * 3600 * 1000 * 24);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function isNameInYear(itemName, yearsOfCalculation) {
  for (let j = 0; j < yearsOfCalculation.length; j++) {
    if (yearsOfCalculation[j] == itemName) {
      console.log("Year: " + itemName);
      return true;
    }
  }
  return false;
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

async function sendErrorMessageToDiscord(messageForPrint, network, botName) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on checker bot!",
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
  let overtimeCreate = await overtimeBot.channels.fetch("1019222287699951656");
  if (overtimeCreate) {
    overtimeCreate.send(message);
  } else {
    console.log("channel not found");
  }
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
        name: "Amount of LINK in checker-bot less then threshold!",
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
  let overtimeCreate = await overtimeBot.channels.fetch("1019222825791397908");
  if (overtimeCreate) {
    overtimeCreate.send(message);
  } else {
    console.log("channel not found");
  }
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
        name: "Uuups! Something went wrong on data-checker bot!",
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
  let overtimeCreate = await overtimeBot.channels.fetch("1019222287699951656");
  if (overtimeCreate) {
    overtimeCreate.send(message);
  } else {
    console.log("channel not found");
  }
}

async function sendMessageToDiscordTimeOfAGameHasChanged(
  messageForPrint,
  idAPI,
  idContract,
  homeTeam,
  awayTeam,
  gameTimeContract,
  gameTimeAPI,
  network
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Warning! New Time on a game!",
        value: "\u200b",
      },
      {
        name: ":chains: Network:",
        value: network,
      },
      {
        name: ":warning: Warning message:",
        value: messageForPrint,
      },
      {
        name: ":id: Game id:",
        value: "API id: " + idAPI + ", contract id: " + idContract,
      },
      {
        name: ":classical_building: Game (homeTeam vs awayTeam):",
        value: homeTeam + " vs " + awayTeam,
      },
      {
        name: ":alarm_clock: Original date on contract:",
        value: new Date(gameTimeContract * 1000),
      },
      {
        name: ":alarm_clock: New date on API:",
        value: new Date(gameTimeAPI * 1000),
      }
    )
    .setColor("#0037ff");
  let overtimeCreate = await overtimeBot.channels.fetch("1019223296736239745");
  if (overtimeCreate) {
    overtimeCreate.send(message);
  } else {
    console.log("channel not found");
  }
}

async function sendErrorMessageToDiscordRequestCL(
  messageForPrint,
  sportId,
  dateTimestamp,
  games,
  network,
  botName
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on data-checker bot!",
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
        value:
          "SportId: " +
          sportId +
          ", date (unix date): " +
          dateTimestamp +
          ", and gameIds: " +
          games,
      },
      {
        name: ":alarm_clock: Timestamp:",
        value: new Date(new Date().toUTCString()),
      }
    )
    .setColor("#0037ff");
  let overtimeCreate = await overtimeBot.channels.fetch("1019222287699951656");
  if (overtimeCreate) {
    overtimeCreate.send(message);
  } else {
    console.log("channel not found");
  }
}
