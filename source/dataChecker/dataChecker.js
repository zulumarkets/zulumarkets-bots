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
const allowances = require("../../source/allowances.js");
const linkToken = require("../../contracts/LinkToken.js");
const gamesVerifier = require("../../contracts/RundownVerifier.js");

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

  const baseUrl = process.env.RUNDOWN_BASE_URL;

  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  const market = process.env.MARKET_CREATION;
  let failedCounter = 0;

  // sportId
  let sportIds = process.env.SPORT_IDS.split(",");
  let americanSports = [1, 2, 3, 4, 5, 6, 10];

  console.log("Checking Games...");

  let requestWasSend = false;

  console.log("JOB ID =  " + jobId);

  // foreach sport
  for (let j = 0; j < sportIds.length; j++) {
    // foreach day starting from current date
    for (let i = 0; i <= daysInFront; i++) {
      console.log("------------------------");
      console.log("SPORT ID =>  " + sportIds[j]);
      console.log("Processing: TODAY +  " + i);

      let unixDate = await getSecondsToDate(i);
      console.log("Unix date in seconds: " + unixDate);
      let unixDateMiliseconds = parseInt(unixDate) * process.env.MILISECONDS;
      console.log("Unix date in miliseconds: " + unixDateMiliseconds);

      console.log("Processing sport and date...");

      let sendRequestNewMarketCreated = false;

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

      response.data.events.forEach((event) => {
        gamesListResponse.push({
          id: event.event_id,
          status: checkIfUndefined(event.score),
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
          gameStartTime: Math.floor(
            new Date(event.event_date).getTime() / 1000
          ),
        });
      });

      let gamesToBeProcessed = [];

      // go over games (contract vs API) and check data
      for (let n = 0; n < gamesListResponse.length; n++) {
        console.log("Game status -> " + gamesListResponse[n].status);
        console.log("Game id (as string): -> " + gamesListResponse[n].id);
        let gameIdContract = bytes32({ input: gamesListResponse[n].id });
        console.log("Game id (on contract): -> " + gameIdContract);

        let gameProp = await verifier.getGameProperties(gameIdContract);

        let marketAddress = gameProp[0];
        console.log("Market:  " + marketAddress);
        let isMarketCreated = await consumer.marketCreated(marketAddress);
        console.log("Is market created:  " + isMarketCreated);

        let isMarketCanceled = gameProp[2];
        console.log("Is market canceled:  " + isMarketCanceled);

        // get by ID and only STATUS_SCHEDULED events
        if (
          !isMarketCanceled &&
          isMarketCreated &&
          gamesListResponse[n].status == "STATUS_SCHEDULED"
        ) {
          console.log("Team home API: " + gamesListResponse[n].homeTeam);
          console.log("Team away API: " + gamesListResponse[n].awayTeam);
          console.log("Game time API: " + gamesListResponse[n].gameStartTime);

          let gameStartContract = await queues.gameStartPerGameId(
            gameIdContract
          );
          let gameCreatedOnContract = await consumer.getGameCreatedById(
            gameIdContract
          );

          console.log("Game time Contract: " + gameStartContract);
          console.log("Game on Contract: " + gameCreatedOnContract);
          console.log("Home team on Contract: " + gameCreatedOnContract[5]);
          console.log("Away team on Contract: " + gameCreatedOnContract[6]);
          // name has changed and market can be updated, so only new markets
          // ONLY UFC
          if (
            gameCreatedOnContract[5] != gamesListResponse[n].homeTeam ||
            gameCreatedOnContract[6] != gamesListResponse[n].awayTeam
          ) {
            console.log("TEAMS not the same!!!");
            console.log("Afected game: " + gamesListResponse[n].id);
            if (sportIds[j] == 7) {
              gamesToBeProcessed.push(gamesListResponse[n].id);
              sendRequestNewMarketCreated = true;

              await sendMessageToDiscordTeamsNotTheSame(
                "Fighters are not the same!!! Bot will cancel market, and create new one!",
                gamesListResponse[n].id,
                gameIdContract,
                gameCreatedOnContract[5],
                gamesListResponse[n].homeTeam,
                gameCreatedOnContract[6],
                gamesListResponse[n].awayTeam,
                parseInt(gameStartContract),
                network
              );
              // need to know if some other sport is having this issue so only print to discord
            } else {
              gamesToBeProcessed.push(gamesListResponse[n].id);
              sendRequestNewMarketCreated = true;
              await sendMessageToDiscordTeamsNotTheSame(
                "Game/Fight are not the same!",
                gamesListResponse[n].id,
                gameIdContract,
                gameCreatedOnContract[5],
                gamesListResponse[n].homeTeam,
                gameCreatedOnContract[6],
                gamesListResponse[n].awayTeam,
                parseInt(gameStartContract),
                network
              );
            }

            // start of a game has changed
          } else if (
            parseInt(gameStartContract) !=
            parseInt(gamesListResponse[n].gameStartTime)
          ) {
            let cuerrentTimeInMili = new Date().getTime(); // miliseconds
            console.log("Time for proocessing:  " + cuerrentTimeInMili);

            if (
              parseInt(gamesListResponse[n].gameStartTime) * 1000 >
                cuerrentTimeInMili ||
              parseInt(gameStartContract) * 1000 > cuerrentTimeInMili
            ) {
              console.log("Time of a game UPDATED!!!");
              console.log("Afected game: " + gamesListResponse[n].id);
              gamesToBeProcessed.push(gamesListResponse[n].id);
              await sendMessageToDiscordTimeOfAGameHasChanged(
                "Time of a game/fight has changed!!!",
                gamesListResponse[n].id,
                gameIdContract,
                gameCreatedOnContract[5],
                gameCreatedOnContract[6],
                parseInt(gameStartContract),
                parseInt(gamesListResponse[n].gameStartTime),
                network
              );
            }
          }
        }
      }

      console.log(gamesToBeProcessed);

      if (gamesToBeProcessed.length > 0) {
        try {
          console.log("Send request to CL...");

          let tx_request = await wrapper.requestGamesResolveWithFilters(
            jobId,
            market,
            sportIds[j],
            unixDate,
            [], // add statuses for football OPTIONAL use property statuses ?? maybe IF sportIds[j]
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
                sportIds[j] +
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

          // this needs to create market -> flag for discord
          if (sendRequestNewMarketCreated) {
            requestWasSend = true;
          }
        } catch (e) {
          console.log(e);
          await sendErrorMessageToDiscordRequestCL(
            "Request to CL from " +
              botName +
              " went wrong! Please check LINK amount on bot, or kill and debug!" +
              " EXCEPTION MESSAGE: " +
              e.message.slice(0, 180),
            sportIds[j],
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

  await delay(20000); // wait to be populated

  console.log("Create New Markets...");

  if (requestWasSend) {
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
    console.log("Nothing to process...");
  }

  requestIdList = [];
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

function returnIndex(team, isHome) {
  if (team[1].is_home === isHome) {
    return 1;
  }
  return 0;
}

function isAmericanSport(americanSports, sport) {
  for (let j = 0; j < americanSports.length; j++) {
    if (americanSports[j] == sport) {
      return true;
    }
  }
  return false;
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

async function sendMessageToDiscordTeamsNotTheSame(
  messageForPrint,
  idAPI,
  idContract,
  homeTeamContract,
  homeTeamAPI,
  awayTeamContract,
  awayTeamAPI,
  gameTime,
  network
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Warning! Changing team/fighter names!",
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
        name: ":classical_building: Game/fight on a contract (homeTeam vs awayTeam):",
        value: homeTeamContract + " vs " + awayTeamContract,
      },
      {
        name: ":classical_building: Game/fight on a API (homeTeam vs awayTeam):",
        value: homeTeamAPI + " vs " + awayTeamAPI,
      },
      {
        name: ":alarm_clock: Date on contract:",
        value: new Date(gameTime * 1000),
      }
    )
    .setColor("#0037ff");
  let overtimeCreate = await overtimeBot.channels.fetch("1019223647958880377");
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
