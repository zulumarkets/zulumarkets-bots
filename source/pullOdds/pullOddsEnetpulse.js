require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");

const Discord = require("discord.js");
const overtimeBot = new Discord.Client();
overtimeBot.login(process.env.BOT_OVERTIME_ODDS);

const axios = require("axios");

const gamesWrapper = require("../../contracts/GamesWrapper.js");
const gamesVerifier = require("../../contracts/RundownVerifier.js");
const gamesOddsObtainer = require("../../contracts/GamesOddsObtainer.js");
const allowances = require("../allowances.js");
const linkToken = require("../../contracts/LinkToken.js");
const gamesOddsReciever = require("../../contracts/GameOddsReciever.js");
let supportedGender = require("../createGames/supportedGender.json"); // leagues/tour types etc.
let supportedLeaguesTennis = require("../createGames/supportedLeaguesTennis.json"); // leagues/tour types etc.
let supportedLeaguesFootball = require("../createGames/supportedLeaguesFootball.json"); // leagues/tour types etc.
let tennisTournaments = require("../createGames/tennisSupportTournament.json"); // supported tennis tournamens
let footballTournament = require("../createGames/footballSupportTournament.json"); // supported tennis tournamens

const oddslib = require("oddslib");

const reciever = new ethers.Contract(
  process.env.ODDS_RECIEVER_CONTRACT,
  gamesOddsReciever.gamesOddsRecieverContract.abi,
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

const erc20Instance = new ethers.Contract(
  process.env.LINK_CONTRACT,
  linkToken.linkTokenContract.abi,
  wallet
);

const obtainer = new ethers.Contract(
  process.env.ODDS_OBTAINER_CONTRACT,
  gamesOddsObtainer.gamesOddsObtainerContract.abi,
  wallet
);

let requestIdList = [];

async function doPull(numberOfExecution, lastStartDate, botName, network) {
  const LEAGUES_BY_SPORT = {
    1: supportedLeaguesFootball,
    2: supportedLeaguesTennis,
  };

  const TOURNAMENTS_BY_SPORT = {
    1: footballTournament,
    2: tennisTournaments,
  };

  // check every 10th execution if LINK is enough
  if (numberOfExecution % 10 == 0) {
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
  }

  console.log("Request ids list: ");
  console.log(requestIdList);
  console.log("---------");

  if (requestIdList.length > 0) {
    let faildRequsts = 0;
    let isFulfilled = await wrapper.areOddsRequestIdsFulFilled(requestIdList);

    if (!isFulfilled) {
      await sendErrorMessageToDiscordRequestNotFulfilled(
        network,
        botName,
        requestIdList,
        faildRequsts
      );
    } else {
      requestIdList = [];
    }

    while (!isFulfilled) {
      await delay(faildRequsts > 0 ? 10 * 60 * 1000 * faildRequsts : 60 * 1000);
      isFulfilled = await wrapper.areOddsRequestIdsFulFilled(requestIdList);
      if (isFulfilled || faildRequsts > 0) {
        requestIdList = [];
        if (isFulfilled) {
          console.log(
            "All good! Previous execution was executed with success!"
          );
        } else {
          console.log("Nothing changed, lets try again, with new req!!!");
        }
        break;
      } else {
        faildRequsts++; //1
        await sendErrorMessageToDiscordRequestNotFulfilled(
          network,
          botName,
          requestIdList,
          faildRequsts
        );
      }
    }
  }

  const jobId = bytes32({ input: process.env.JOB_ID_ODDS });
  const jobIdResolve = bytes32({ input: process.env.JOB_ID_RESOLVE });

  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  let primaryBookmaker;
  let useBackupBookmaker;
  let backupBookmaker;

  // sportId
  let sportIdsArray = process.env.SPORT_IDS.split(",");
  let cancelStatuses = process.env.CANCEL_STATUSES.split(",");
  let yearOfCalculation = process.env.YEAR_OF_CALCULATION.split(",");

  // resolve market
  const market = process.env.MARKET_RESOLVE;

  const baseUrl_template = process.env.TOURNAMENT_TAMPLATE_BASE_URL;
  const baseURL_tournament = process.env.TOURNAMENT_BASE_URL;
  const baseURL_stage = process.env.TOURNAMENT_STAGE_BASE_URL;
  const baseUrl_odds = process.env.TOURNAMENT_EVENT_ODDS_BASE_URL;
  const baseUrl_events_daily = process.env.TOURNAMENT_EVENTS_DAILY_BASE_URL;

  const ODDS_PERCENTAGE_CHANGE_BY_SPORT = {
    3: process.env.ODDS_PERCENTAGE_CHANGE_MLB,
    7: process.env.ODDS_PERCENTAGE_CHANGE_UFC,
    10: process.env.ODDS_PERCENTAGE_CHANGE_MLS,
  };

  const ODDS_PERCENTAGE_CHANGE_BY_SPORT_SPREAD_TOTAL = {};

  const PRICE_AMOUNT_CHANGE_BY_SPORT = {
    3: process.env.PRICE_AMOUNT_CHANGE_DEFAULT,
  };

  const LINE_CHANGE_BY_SPORT_SPREAD = {
    4: process.env.LINE_CHANGE_DEFAULT_SPREAD,
  };

  const LINE_CHANGE_BY_SPORT_TOTAL = {
    4: process.env.LINE_CHANGE_DEFAULT_TOTAL,
  };

  let americanSports = [1, 2, 3, 4, 5, 6, 10];
  let failedCounter = 0;
  const ZERO_ADDRESS = "0x" + "0".repeat(40);

  console.log("Pulling Odds...");

  for (let j = 0; j < sportIdsArray.length; j++) {
    let sportIds = sportIdsArray[j];
    console.log("JOB ID =  " + jobId);
    console.log("sportId: " + sportIds);
    // do for all sportIds

    let percentageChangePerSport =
      ODDS_PERCENTAGE_CHANGE_BY_SPORT[sportIds] !== undefined
        ? ODDS_PERCENTAGE_CHANGE_BY_SPORT[sportIds]
        : process.env.ODDS_PERCENTAGE_CHANGE_DEFAULT;

    let percentageChangePerSportSpreadTotal =
      ODDS_PERCENTAGE_CHANGE_BY_SPORT_SPREAD_TOTAL[sportIds] !== undefined
        ? ODDS_PERCENTAGE_CHANGE_BY_SPORT_SPREAD_TOTAL[sportIds]
        : process.env.ODDS_PERCENTAGE_CHANGE_SPREAD_TOTAL_DEFAULT;

    let priceChangePerSport =
      PRICE_AMOUNT_CHANGE_BY_SPORT[sportIds] !== undefined
        ? PRICE_AMOUNT_CHANGE_BY_SPORT[sportIds]
        : process.env.PRICE_AMOUNT_CHANGE_DEFAULT;

    let lineChangePerSportSpread =
      LINE_CHANGE_BY_SPORT_SPREAD[sportIds] !== undefined
        ? LINE_CHANGE_BY_SPORT_SPREAD[sportIds]
        : process.env.LINE_CHANGE_DEFAULT_SPREAD;

    let lineChangePerSportTotal =
      LINE_CHANGE_BY_SPORT_TOTAL[sportIds] !== undefined
        ? LINE_CHANGE_BY_SPORT_TOTAL[sportIds]
        : process.env.LINE_CHANGE_DEFAULT_TOTAL;

    let leaguesbySport = [];
    if (LEAGUES_BY_SPORT[sportIds] !== undefined) {
      leaguesbySport = LEAGUES_BY_SPORT[sportIds];
    } else {
      // move to the next!!!
      console.log("Not supported (league)!");
      continue;
    }

    console.log("Leagues count: " + leaguesbySport.length);

    let tournamentsbySport = [];
    if (TOURNAMENTS_BY_SPORT[sportIds] !== undefined) {
      tournamentsbySport = TOURNAMENTS_BY_SPORT[sportIds];
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
        sportFK: sportIds,
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
    for (let r = 0; r < tournamentType.length; r++) {
      console.log("Tournament type: " + tournamentType[r].id);

      let oddsBookmakers = await wrapper.getBookmakerIdsBySportId(
        tournamentType[r].id
      );
      useBackupBookmaker = oddsBookmakers.length > 1;
      primaryBookmaker = "" + oddsBookmakers[0];
      console.log("Primary bookmaker is (id): " + primaryBookmaker);
      console.log("Use Backup Bookmaker is set to: " + useBackupBookmaker);

      if (useBackupBookmaker) {
        backupBookmaker = "" + oddsBookmakers[1];
        console.log("Backup bookmaker is (id): " + backupBookmaker);
      }

      let doesSportSupportSpreadAndTotal =
        await obtainer.doesSportSupportSpreadAndTotal(tournamentType[r].id);
      console.log("Support total and spred: " + doesSportSupportSpreadAndTotal);

      let responseTournaments = await axios.get(baseURL_tournament, {
        params: {
          username: process.env.USERNAME_ENETPULS,
          token: process.env.REQUEST_KEY_ENETPULS,
          tournament_templateFK: tournamentType[r].id,
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
          supportedGender.includes(stage.gender) &&
          // filter only stages that are currentlly playing or playing in next daysInFront
          ((getUnixDateFromString(stage.enddate) >= getSecondsToDate(0) &&
            getUnixDateFromString(stage.startdate) <= getSecondsToDate(0)) ||
            (getUnixDateFromString(stage.startdate) <=
              getSecondsToDate(daysInFront) &&
              getUnixDateFromString(stage.enddate) >=
                getSecondsToDate(daysInFront)))
      );
      console.log("Stages count (filtered): " + stages.length);

      // get tournamet tages by tournament ID's
      // from today!!! maybe some games still running
      console.log("Tournament type: " + tournamentType[r].id);
      for (let i = 0; i <= daysInFront; i++) {
        console.log("------------------------");
        console.log("Processing: TODAY +  " + i);
        console.log("CHANGE ODDS % : " + percentageChangePerSport);
        console.log(
          "CHANGE ODDS t/s % : " + percentageChangePerSportSpreadTotal
        );
        console.log("PRICE ODDS CHANGING (in cents) : " + priceChangePerSport);
        console.log("CHANGE LINE SPREAD AMOUNT: " + lineChangePerSportSpread);
        console.log("CHANGE LINE TOTAL AMOUNT: " + lineChangePerSportTotal);

        let unixDate = getSecondsToDate(i);
        let unixDateMiliseconds = parseInt(unixDate) * process.env.MILISECONDS;
        console.log("Unix date in miliseconds: " + unixDateMiliseconds);
        let timeInMiliseconds = new Date().getTime(); // miliseconds
        console.log("Time for proocessing:  " + timeInMiliseconds);
        for (let z = 0; z < stages.length; z++) {
          var events = [];
          console.log("Stages ids: " + stages[z].id);
          let dateSport = unixDate + "_" + tournamentType[r].id;
          let eventsResponse = await axios.get(baseUrl_events_daily, {
            params: {
              username: process.env.USERNAME_ENETPULS,
              token: process.env.REQUEST_KEY_ENETPULS,
              tournament_stageFK: stages[z].id,
              includeEventProperties: "yes", //add `EventTypeName` -> "Male Single"
              date: dateConverter(unixDateMiliseconds),
            },
          });

          for (key in eventsResponse.data.events) {
            events.push(
              Object.assign(eventsResponse.data.events[key], {
                id: key,
              })
            );
          }

          console.log("Events count: " + events.length);
          var isNotTennis = sportIds == 2 ? false : true;
          console.log("Is not tennis: " + isNotTennis);

          // filter only events that are not started and event which start after daysInFront and if tennis only male singles
          events = events.filter((event) => {
            return (
              (event.status_type === "notstarted" ||
                isGameInRightStatus(cancelStatuses, event.status_type)) &&
              getUnixDateFromString(event.startdate) <=
                getSecondsToDate(daysInFront) &&
              (isNotTennis ||
                Object.values(event.property).filter(
                  (props) => props.name === "EventTypeName"
                )[0].value === "Male Single")
            );
          });
          console.log("Events count (filtered): " + events.length);

          let sportProps = await verifier.getSportProperties(
            tournamentType[r].id,
            unixDate
          );

          let isSportOnADate = sportProps[0];
          console.log("Having sport on a date:  " + isSportOnADate);

          let gamesOnContract = sportProps[2];
          console.log("Count games on a date: " + gamesOnContract.length);

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

            let oddsForGames = [];
            let spreadLinesForGames = [];
            let totalLinesForGames = [];
            let spreadTotalsOddsForGames = [];

            if (doesSportSupportSpreadAndTotal) {
              let allGamesPropertiesProperties =
                await verifier.getAllPropertiesForGivenGames(gamesOnContract);

              oddsForGames = allGamesPropertiesProperties[0];
              spreadLinesForGames = allGamesPropertiesProperties[1];
              totalLinesForGames = allGamesPropertiesProperties[2];
              spreadTotalsOddsForGames = allGamesPropertiesProperties[3];
            } else {
              oddsForGames = await verifier.getOddsForGames(gamesOnContract);
            }
            console.log("Odds count: " + oddsForGames.length);
            console.log("spread lines count: " + spreadLinesForGames.length);
            console.log("total lines count: " + totalLinesForGames.length);
            console.log(
              "spread/totals odds count: " + spreadTotalsOddsForGames.length
            );

            let sendRequestForOdds = false;
            const gamesListResponse = [];

            for (let e = 0; e < events.length; e++) {
              let odds = [];
              let oddsPerGameResponse = await axios.get(baseUrl_odds, {
                params: {
                  username: process.env.USERNAME_ENETPULS,
                  token: process.env.REQUEST_KEY_ENETPULS,
                  objectFK: events[e].id,
                  odds_providerFK: primaryBookmaker,
                  outcome_typeFK: process.env.OUTCOME_TYPE_FK,
                  outcome_scopeFK: process.env.OUTCOME_SCOPE_FK,
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

              let status = events[e].status_type;
              // look only for scheduled or canceled games
              if (
                status == "notstarted" ||
                isGameInRightStatus(cancelStatuses, status)
              ) {
                gamesListResponse.push({
                  id: events[e].id,
                  homeTeam: getTeam(events[e], 0),
                  awayTeam: getTeam(events[e], 1),
                  status: status,
                  homeOdd: calculateOdds(
                    events[e],
                    0,
                    odds,
                    isSportTwoPositionsSport
                  ),
                  awayOdd: calculateOdds(
                    events[e],
                    1,
                    odds,
                    isSportTwoPositionsSport
                  ),
                  drawOdd: calculateOdds(
                    events[e],
                    2,
                    odds,
                    isSportTwoPositionsSport
                  ),
                  spreadHome: 0,
                  spreadAway: 0,
                  spreadHomeOdds: 0,
                  spreadAwayOdds: 0,
                  totalOver: 0,
                  totalUnder: 0,
                  totalOverOdds: 0,
                  totalUnderOdds: 0,
                });
              }
            }

            if (gamesListResponse.length == 0) {
              lastStartDate[dateSport] = 0;
            }

            let gamesWhichOddsChanged = [];
            let gameIdsForRequest = [];
            let mainOddsForRequest = [];
            let spreadLinesForRequest = [];
            let totalLinesForRequest = [];
            let spreadOddsForRequest = [];
            let totalOddsForRequest = [];

            console.log(gamesListResponse);

            let getAllPropertiesForGivenGames =
              await verifier.getAllGameProperties(gamesOnContract);

            let marketAddressArray = getAllPropertiesForGivenGames[0];
            let isMarketResolvedArray = getAllPropertiesForGivenGames[1];
            let isMarketCanceledArray = getAllPropertiesForGivenGames[2];
            let invalidOddsArray = getAllPropertiesForGivenGames[3];
            let isPausedByCanceledStatusArray =
              getAllPropertiesForGivenGames[4];
            let isMarketPausedArray = getAllPropertiesForGivenGames[5];
            let gameStartedArray = getAllPropertiesForGivenGames[6];

            // check if odd changed more then ODDS_PERCENTAGE_CHANGE_BY_SPORT
            for (let m = 0; m < gamesOnContract.length; m++) {
              /*if (sendRequestForOdds) {
                    break;
                  }*/
              for (let n = 0; n < gamesListResponse.length; n++) {
                /*if (sendRequestForOdds) {
                  break;
                }*/
                // when game is found and status and status is STATUS_SCHEDULED
                if (
                  gamesOnContract[m] ==
                    bytes32({ input: gamesListResponse[n].id }) &&
                  gamesListResponse[n].status == "notstarted"
                ) {
                  console.log("Game status -> " + gamesListResponse[n].status);
                  console.log(
                    "Obtaining game id (as string): -> " +
                      gamesListResponse[n].id
                  );
                  console.log(
                    "Game: " +
                      gamesListResponse[n].homeTeam +
                      " " +
                      gamesListResponse[n].awayTeam
                  );

                  console.log("Odds, checking...");

                  let marketAddress = marketAddressArray[m];
                  console.log("Market: " + marketAddress);

                  let isMarketResolved = isMarketResolvedArray[m];
                  console.log("Market resolved: " + isMarketResolved);

                  let isMarketCanceled = isMarketCanceledArray[m];
                  console.log("Market canceled: " + isMarketCanceled);

                  let gameStart = gameStartedArray[m];
                  console.log("GAME start:  " + gameStart);

                  console.log(
                    "Last game on that date is (before): " +
                      lastStartDate[dateSport]
                  );

                  if (lastStartDate[dateSport] < gameStart) {
                    console.log("Last start date changed");
                    lastStartDate[dateSport] = gameStart;
                  }

                  console.log(
                    "Last game on that date is (after): " +
                      lastStartDate[dateSport]
                  );

                  // only ongoing games not resolved or already canceled
                  if (
                    !isMarketResolved &&
                    !isMarketCanceled &&
                    marketAddress != ZERO_ADDRESS
                  ) {
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
                    if (!isSportTwoPositionsSport) {
                      console.log(
                        "Draw Odds API: " +
                          drawOddPinnacle +
                          ", Draw Odds contract: " +
                          oddsForGames[m * 3 + 2]
                      );
                    }

                    let spreadHomePinnacle = 0;
                    let spreadAwayPinnacle = 0;
                    let totalOverPinnacle = 0;
                    let totalUnderPinnacle = 0;
                    let spreadHomeOddsPinnacle = 0;
                    let spreadAwayOddsPinnacle = 0;
                    let totalOverOddsPinnacle = 0;
                    let totalUnderOddsPinnacle = 0;

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
                      spreadHomeOddsPinnacle =
                        gamesListResponse[n].spreadHomeOdds;
                      console.log(
                        "Spread home ODDS API: " +
                          spreadHomeOddsPinnacle +
                          ", Spread home ODDS contract: " +
                          spreadTotalsOddsForGames[m * 4]
                      );

                      spreadAwayOddsPinnacle =
                        gamesListResponse[n].spreadAwayOdds;
                      console.log(
                        "Spread away ODDS API: " +
                          spreadAwayOddsPinnacle +
                          ", Spread away ODDS contract: " +
                          spreadTotalsOddsForGames[m * 4 + 1]
                      );

                      totalOverOddsPinnacle =
                        gamesListResponse[n].totalOverOdds;
                      console.log(
                        "Total over ODDS API: " +
                          totalOverOddsPinnacle +
                          ", Total over ODDS contract: " +
                          spreadTotalsOddsForGames[m * 4 + 2]
                      );

                      totalUnderOddsPinnacle =
                        gamesListResponse[n].totalUnderOdds;
                      console.log(
                        "Total under ODDS API: " +
                          totalUnderOddsPinnacle +
                          ", Total under ODDS contract: " +
                          spreadTotalsOddsForGames[m * 4 + 3]
                      );
                    }
                    let invalidOdds = invalidOddsArray[m];
                    console.log(
                      "Is game paused by invalid odds: " + invalidOdds
                    );
                    let isPausedByCanceledStatus =
                      isPausedByCanceledStatusArray[m];
                    console.log(
                      "Is game paused by status: " + isPausedByCanceledStatus
                    );

                    let isMarketPaused = isMarketPausedArray[m];
                    console.log("Market paused: " + isMarketPaused);

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
                          percentageChangePerSportSpreadTotal,
                          spreadAwayOddsPinnacle,
                          totalOverOddsPinnacle,
                          totalUnderOddsPinnacle,
                          lineChangePerSportSpread,
                          lineChangePerSportTotal,
                          priceChangePerSport
                        )) ||
                        isPercentageOrPriceChanged(
                          oddsForGames[m * 3],
                          homeOddPinnacle,
                          percentageChangePerSport,
                          priceChangePerSport
                        ) ||
                        isPercentageOrPriceChanged(
                          oddsForGames[m * 3 + 1],
                          awayOddPinnacle,
                          percentageChangePerSport,
                          priceChangePerSport
                        ) ||
                        isPercentageOrPriceChanged(
                          oddsForGames[m * 3 + 2],
                          drawOddPinnacle,
                          percentageChangePerSport,
                          priceChangePerSport
                        )) &&
                      !invalidOdds &&
                      !isPausedByCanceledStatus &&
                      !isMarketPaused
                    ) {
                      let percentageChangeHome = getPercentageOrPriceChange(
                        oddsForGames[m * 3],
                        homeOddPinnacle,
                        percentageChangePerSport,
                        1
                      );
                      let percentageChangeAway = getPercentageOrPriceChange(
                        oddsForGames[m * 3 + 1],
                        awayOddPinnacle,
                        percentageChangePerSport,
                        1
                      );
                      let percentageChangeDraw = getPercentageOrPriceChange(
                        oddsForGames[m * 3 + 2],
                        drawOddPinnacle,
                        percentageChangePerSport,
                        1
                      );

                      console.log("Home change odd: " + percentageChangeHome);
                      console.log("Away change odd: " + percentageChangeAway);
                      console.log("Draw change odd: " + percentageChangeDraw);

                      gameIdsForRequest.push(gamesOnContract[m]);

                      mainOddsForRequest.push(homeOddPinnacle);
                      mainOddsForRequest.push(awayOddPinnacle);
                      mainOddsForRequest.push(drawOddPinnacle);

                      if (doesSportSupportSpreadAndTotal) {
                        let percentageChangeSpreadHome =
                          getPercentageOrPriceChange(
                            spreadTotalsOddsForGames[m * 4],
                            spreadHomeOddsPinnacle,
                            percentageChangePerSportSpreadTotal,
                            1
                          );

                        let percentageChangeSpreadAway =
                          getPercentageOrPriceChange(
                            spreadTotalsOddsForGames[m * 4 + 1],
                            spreadAwayOddsPinnacle,
                            percentageChangePerSportSpreadTotal,
                            1
                          );

                        let percentageChangeTotalOver =
                          getPercentageOrPriceChange(
                            spreadTotalsOddsForGames[m * 4 + 2],
                            totalOverOddsPinnacle,
                            percentageChangePerSportSpreadTotal,
                            1
                          );

                        let percentageChangeTotalUnder =
                          getPercentageOrPriceChange(
                            spreadTotalsOddsForGames[m * 4 + 3],
                            totalUnderOddsPinnacle,
                            percentageChangePerSportSpreadTotal,
                            1
                          );
                        console.log(
                          "Spread HOME change odd: " +
                            percentageChangeSpreadHome
                        );
                        console.log(
                          "Spread AWAY change odd: " +
                            percentageChangeSpreadAway
                        );
                        console.log(
                          "Total OVER change odd: " + percentageChangeTotalOver
                        );
                        console.log(
                          "Total UNDER change odd: " +
                            percentageChangeTotalUnder
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

                        await sendMessageSpreadTotalChangedDiscord(
                          gamesListResponse[n].homeTeam,
                          gamesListResponse[n].awayTeam,
                          spreadLinesForGames[m * 2],
                          spreadHomePinnacle,
                          spreadLinesForGames[m * 2 + 1],
                          spreadAwayPinnacle,
                          totalLinesForGames[m * 2],
                          totalOverPinnacle,
                          totalLinesForGames[m * 2 + 1],
                          totalUnderPinnacle,
                          lineChangePerSportSpread,
                          lineChangePerSportTotal,
                          gameStart,
                          "1054737348170092644",
                          network
                        );
                        spreadLinesForRequest.push(spreadHomePinnacle);
                        spreadLinesForRequest.push(spreadAwayPinnacle);
                        spreadOddsForRequest.push(spreadHomeOddsPinnacle);
                        spreadOddsForRequest.push(spreadAwayOddsPinnacle);

                        totalLinesForRequest.push(totalOverPinnacle);
                        totalLinesForRequest.push(totalUnderPinnacle);
                        totalOddsForRequest.push(totalOverOddsPinnacle);
                        totalOddsForRequest.push(totalUnderOddsPinnacle);
                      } else {
                        spreadLinesForRequest.push(0);
                        spreadLinesForRequest.push(0);
                        spreadOddsForRequest.push(0);
                        spreadOddsForRequest.push(0);

                        totalLinesForRequest.push(0);
                        totalLinesForRequest.push(0);
                        totalOddsForRequest.push(0);
                        totalOddsForRequest.push(0);
                      }

                      console.log("Setting sendRequestForOdds to true");

                      sendRequestForOdds = true;

                      gamesWhichOddsChanged.push(gamesListResponse[n].id);

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
                        "1002145721543311370",
                        network
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
                      gamesWhichOddsChanged.push(gamesListResponse[n].id);

                      gameIdsForRequest.push(gamesOnContract[m]);

                      mainOddsForRequest.push(homeOddPinnacle);
                      mainOddsForRequest.push(awayOddPinnacle);
                      mainOddsForRequest.push(drawOddPinnacle);

                      if (doesSportSupportSpreadAndTotal) {
                        spreadLinesForRequest.push(spreadHomePinnacle);
                        spreadLinesForRequest.push(spreadAwayPinnacle);
                        spreadOddsForRequest.push(spreadHomeOddsPinnacle);
                        spreadOddsForRequest.push(spreadAwayOddsPinnacle);

                        totalLinesForRequest.push(totalOverPinnacle);
                        totalLinesForRequest.push(totalUnderPinnacle);
                        totalOddsForRequest.push(totalOverOddsPinnacle);
                        totalOddsForRequest.push(totalUnderOddsPinnacle);
                      } else {
                        spreadLinesForRequest.push(0);
                        spreadLinesForRequest.push(0);
                        spreadOddsForRequest.push(0);
                        spreadOddsForRequest.push(0);

                        totalLinesForRequest.push(0);
                        totalLinesForRequest.push(0);
                        totalOddsForRequest.push(0);
                        totalOddsForRequest.push(0);
                      }
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
                        "1002145721543311370",
                        network
                      );
                    }
                  } else {
                    console.log(
                      "Market for game already resolved, or market created!"
                    );
                  }
                  // game is in cancel/resolved status on API
                } else if (
                  gamesOnContract[m] ==
                    bytes32({ input: gamesListResponse[n].id }) &&
                  isGameInRightStatus(
                    cancelStatuses,
                    gamesListResponse[n].status
                  )
                ) {
                  let marketAddress = marketAddressArray[m];
                  console.log("Market: " + marketAddress);

                  let isPausedByCanceledStatus =
                    isPausedByCanceledStatusArray[m];
                  console.log(
                    "Is game paused by status: " + isPausedByCanceledStatus
                  );

                  let isMarketCanceledAlready = isMarketCanceledArray[m];
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
                    let gameStart = gameStartedArray[m];
                    console.log("GAME start:  " + gameStart);

                    try {
                      console.log("Send request...");

                      let tx = await wrapper.requestGamesResolveWithFilters(
                        jobIdResolve,
                        market,
                        tournamentType[r].id,
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
                        gameStart,
                        network
                      );
                    } catch (e) {
                      console.log(e);
                      await sendErrorMessageToDiscordStatusCancel(
                        "Request to CL " +
                          botName +
                          " went wrong, see: " +
                          botName +
                          ", EXCEPTION MESSAGE: " +
                          e.message.slice(0, 180),
                        tournamentType[r].id,
                        gameStart,
                        gamesListResponse[n].id,
                        network,
                        botName
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

            console.log("Games to be send: ");
            console.log("------");
            console.log(gamesWhichOddsChanged);
            console.log(gameIdsForRequest);
            console.log(mainOddsForRequest);
            console.log(spreadLinesForRequest);
            console.log(spreadOddsForRequest);
            console.log(totalLinesForRequest);
            console.log(totalOddsForRequest);
            console.log("------");

            // odds changed
            if (sendRequestForOdds && gameIdsForRequest.length > 0) {
              console.log("Sending request, odds changed...");
              try {
                console.log("Send request...");

                console.log(
                  "Requesting games count: " + gameIdsForRequest.length
                );
                if (gameIdsForRequest.length > process.env.CL_ODDS_BATCH) {
                  let gamesInBatch = [];
                  let mainOddsForRequestBatch = [];
                  let spreadLinesForRequestBatch = [];
                  let totalLinesForRequestBatch = [];
                  let spreadOddsForRequestBatch = [];
                  let totalOddsForRequestBatch = [];
                  for (let i = 0; i < gameIdsForRequest.length; i++) {
                    gamesInBatch.push(gameIdsForRequest[i]);
                    mainOddsForRequestBatch.push(mainOddsForRequest[i * 3]);
                    mainOddsForRequestBatch.push(mainOddsForRequest[i * 3 + 1]);
                    mainOddsForRequestBatch.push(mainOddsForRequest[i * 3 + 2]);

                    spreadLinesForRequestBatch.push(
                      spreadLinesForRequest[i * 2]
                    );
                    spreadLinesForRequestBatch.push(
                      spreadLinesForRequest[i * 2 + 1]
                    );

                    totalLinesForRequestBatch.push(totalLinesForRequest[i * 2]);
                    totalLinesForRequestBatch.push(
                      totalLinesForRequest[i * 2 + 1]
                    );

                    spreadOddsForRequestBatch.push(spreadOddsForRequest[i * 2]);
                    spreadOddsForRequestBatch.push(
                      spreadOddsForRequest[i * 2 + 1]
                    );

                    totalOddsForRequestBatch.push(totalOddsForRequest[i * 2]);
                    totalOddsForRequestBatch.push(
                      totalOddsForRequest[i * 2 + 1]
                    );

                    if (
                      (gamesInBatch.length > 0 &&
                        gamesInBatch.length % process.env.CL_ODDS_BATCH == 0) ||
                      gamesWhichOddsChanged.length - 1 == i // last one
                    ) {
                      console.log("Batch...");
                      console.log(gamesInBatch);

                      let tx = await reciever.fulfillGamesOdds(
                        gamesInBatch,
                        mainOddsForRequestBatch,
                        spreadLinesForRequestBatch,
                        spreadOddsForRequestBatch,
                        totalLinesForRequestBatch,
                        totalOddsForRequestBatch,
                        {
                          gasLimit: process.env.GAS_LIMIT,
                        }
                      );

                      await tx.wait().then((e) => {
                        console.log(
                          "Requested for: " +
                            unixDate +
                            " for sport: " +
                            tournamentType[r].id
                        );
                      });

                      gamesInBatch = [];
                      mainOddsForRequestBatch = [];
                      spreadLinesForRequestBatch = [];
                      totalLinesForRequestBatch = [];
                      spreadOddsForRequestBatch = [];
                      totalOddsForRequestBatch = [];
                    }
                  }
                } else {
                  let tx = await reciever.fulfillGamesOdds(
                    gameIdsForRequest,
                    mainOddsForRequest,
                    spreadLinesForRequest,
                    spreadOddsForRequest,
                    totalLinesForRequest,
                    totalOddsForRequest,
                    {
                      gasLimit: process.env.GAS_LIMIT,
                    }
                  );

                  await tx.wait().then((e) => {
                    console.log(
                      "Requested for: " +
                        unixDate +
                        " for sport: " +
                        tournamentType[r].id
                    );
                  });
                }
              } catch (e) {
                console.log(e);
                await sendErrorMessageToDiscordRequestOddsfromCL(
                  "Request to changing odds from " +
                    botName +
                    " went wrong, see: " +
                    botName +
                    ", EXCEPTION MESSAGE: " +
                    e.message.slice(0, 180),
                  tournamentType[r].id,
                  unixDate,
                  network,
                  botName
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
      }
    }

    console.log("------------------------");
    console.log("Ended batch...");
  }
}

async function doIndefinitely() {
  var botName = process.env.BOT_NAME;
  let network = process.env.NETWORK;
  console.log("Bot name: " + botName);
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
      await doPull(numberOfExecution, lastStartDate, botName, network);
      numberOfExecution++;
      console.log("---------END ODDS EXECUTION---------");
      await delay(process.env.ODDS_FREQUENCY);
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
  discordID,
  network
) {
  if (
    percentageChangeHome === 0 &&
    percentageChangeAway === 0 &&
    percentageChangeDraw === 0
  ) {
    console.log("No printing needed, main odds not changed!");
  } else {
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
          name: ":chains: Network:",
          value: network,
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
    if (overtimeOdds) {
      overtimeOdds.send(message);
    } else {
      console.log("channel not found");
    }
  }
}

async function sendMessageSpreadTotalChangedDiscord(
  homeTeam,
  awayTeam,
  spreadHomeContract,
  spreadHomeAPI,
  spreadAwayContract,
  spreadAwayAPI,
  totalOverContract,
  totalOverAPI,
  totalUnderContract,
  totalUnderAPI,
  lineChangePerSportSpread,
  lineChangePerSportTotal,
  gameTime,
  discordID,
  network
) {
  if (
    spreadHomeContract == 0 &&
    (spreadHomeAPI == 0 || spreadHomeAPI == 0.01) &&
    spreadAwayContract == 0 &&
    (spreadAwayAPI == 0 || spreadAwayAPI == 0.01) &&
    totalOverContract == 0 &&
    (totalOverAPI == 0 || totalOverAPI == 0.01) &&
    totalUnderContract == 0 &&
    (totalUnderAPI == 0 || totalUnderAPI == 0.01)
  ) {
    console.log("No spread and total yet available!");
  } else if (
    spreadHomeContract == spreadHomeAPI &&
    spreadAwayContract == spreadAwayAPI &&
    totalOverContract == totalOverAPI &&
    totalUnderContract == totalUnderAPI
  ) {
    console.log("Line not changed, skip printing!");
  } else {
    var message = new Discord.MessageEmbed()
      .addFields(
        {
          name: "Spread/Total changed more than threshold!",
          value: "\u200b",
        },
        {
          name: ":chains: Network:",
          value: network,
        },
        {
          name: ":abacus: Value of threshold: ",
          value:
            "Spread line threshold: " +
            lineChangePerSportSpread / 100 +
            ", Total line threshold: " +
            lineChangePerSportTotal / 100,
        },
        {
          name: ":stadium: Overtime game:",
          value: homeTeam + " - " + awayTeam,
        },
        {
          name: ":arrow_up_down: Spread HOME line:",
          value:
            "Line was: " +
            spreadHomeContract / 100 +
            ", now it is: " +
            spreadHomeAPI / 100,
        },
        {
          name: ":arrow_up_down: Spread AWAY line:",
          value:
            "Line was: " +
            spreadAwayContract / 100 +
            ", now it is: " +
            spreadAwayAPI / 100,
        },
        {
          name: ":arrow_up_down: Total OVER line:",
          value:
            "Line was: " +
            totalOverContract / 100 +
            ", now it is: " +
            totalOverAPI / 100,
        },
        {
          name: ":arrow_up_down: Total UNDER line:",
          value:
            "Line was: " +
            totalUnderContract / 100 +
            ", now it is: " +
            totalUnderAPI / 100,
        },
        {
          name: ":alarm_clock: Game time:",
          value: new Date(gameTime * 1000),
        }
      )
      .setColor("#0037ff");
    let overtimeOdds = await overtimeBot.channels.fetch(discordID);
    if (overtimeOdds) {
      overtimeOdds.send(message);
    } else {
      console.log("channel not found");
    }
  }
}

async function sendMessageToDiscordGameCanceled(
  homeTeam,
  awayTeam,
  gameTime,
  network
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Game paused by cancel status!",
        value: "\u200b",
      },
      {
        name: ":chains: Network:",
        value: network,
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
  if (overtimeOdds) {
    overtimeOdds.send(message);
  } else {
    console.log("channel not found");
  }
}

async function sendErrorMessageToDiscordStatusCancel(
  messageForPrint,
  sportId,
  dateTimestamp,
  gameId,
  network,
  botName
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on odds bot!",
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
  if (overtimeOdds) {
    overtimeOdds.send(message);
  } else {
    console.log("channel not found");
  }
}

async function sendErrorMessageToDiscordRequestOddsfromCL(
  messageForPrint,
  sportId,
  dateTimestamp,
  network,
  botName
) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on odds bot!",
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
  let overtimeOdds = await overtimeBot.channels.fetch("1004388531319353425");
  if (overtimeOdds) {
    overtimeOdds.send(message);
  } else {
    console.log("channel not found");
  }
}

async function sendErrorMessageToDiscord(messageForPrint, network, botName) {
  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on odds bot!",
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
  let overtimeOdds = await overtimeBot.channels.fetch("1004388531319353425");
  if (overtimeOdds) {
    overtimeOdds.send(message);
  } else {
    console.log("channel not found");
  }
}

async function sendErrorMessageToDiscordRequestNotFulfilled(
  network,
  botName,
  requestIds,
  faildNumber
) {
  let messageForPrint = "";
  if (faildNumber > 0) {
    messageForPrint = "Waited, not populated stil";
  } else {
    messageForPrint =
      "First check on request id list returned NOT POPULATED, wait more!";
  }

  var message = new Discord.MessageEmbed()
    .addFields(
      {
        name: "Uuups! Something went wrong on odds bot!",
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
        name: ":hammer_pick: Request ids:",
        value: requestIds,
      },
      {
        name: ":alarm_clock: Timestamp:",
        value: new Date(new Date().toUTCString()),
      }
    )
    .setColor("#0037ff");
  let overtimeOdds = await overtimeBot.channels.fetch("1004388531319353425");
  if (overtimeOdds) {
    overtimeOdds.send(message);
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
        name: "Amount of LINK in odds-bot less then threshold!",
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
  let overtimeCreate = await overtimeBot.channels.fetch("1004756729378131998");
  if (overtimeCreate) {
    overtimeCreate.send(message);
  } else {
    console.log("channel not found");
  }
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
  percentageChangePerSportSpreadTotal,
  spreadAwayOddsPinnacle,
  totalOverOddsPinnacle,
  totalUnderOddsPinnacle,
  lineChangePerSportSpread,
  lineChangePerSportTotal,
  priceChangePerSport
) {
  return (
    doesSportSupportSpreadAndTotal &&
    (checkSpreadAndTotalThreshold(
      spreadLinesForGames[m * 2],
      spreadHomePinnacle,
      lineChangePerSportSpread
    ) ||
      checkSpreadAndTotalThreshold(
        spreadLinesForGames[m * 2 + 1],
        spreadAwayPinnacle,
        lineChangePerSportSpread
      ) ||
      checkSpreadAndTotalThreshold(
        totalLinesForGames[m * 2],
        totalOverPinnacle,
        lineChangePerSportTotal
      ) ||
      checkSpreadAndTotalThreshold(
        totalLinesForGames[m * 2 + 1],
        totalUnderPinnacle,
        lineChangePerSportTotal
      ) ||
      isPercentageOrPriceChanged(
        spreadTotalsOddsForGames[m * 4],
        spreadHomeOddsPinnacle,
        percentageChangePerSportSpreadTotal,
        priceChangePerSport
      ) ||
      isPercentageOrPriceChanged(
        spreadTotalsOddsForGames[m * 4 + 1],
        spreadAwayOddsPinnacle,
        percentageChangePerSportSpreadTotal
      ) ||
      isPercentageOrPriceChanged(
        spreadTotalsOddsForGames[m * 4 + 2],
        totalOverOddsPinnacle,
        percentageChangePerSportSpreadTotal,
        priceChangePerSport
      ) ||
      isPercentageOrPriceChanged(
        spreadTotalsOddsForGames[m * 4 + 3],
        totalUnderOddsPinnacle,
        percentageChangePerSportSpreadTotal,
        priceChangePerSport
      ))
  );
}

function checkSpreadAndTotalThreshold(
  spreadOrTotalContract,
  spreadOrTotalAPI,
  lineChangePerSport
) {
  if (
    (spreadOrTotalContract == 0 && spreadOrTotalAPI != 0.01) ||
    (spreadOrTotalContract != 0 && spreadOrTotalAPI == 0.01) ||
    (spreadOrTotalContract != 0 &&
      spreadOrTotalAPI != 0.01 &&
      spreadOrTotalContract != spreadOrTotalAPI)
  ) {
    console.log("CHANGED LINE");
    console.log("DIFF: ");
    if (spreadOrTotalContract > spreadOrTotalAPI) {
      console.log(spreadOrTotalContract - spreadOrTotalAPI);
      return spreadOrTotalContract - spreadOrTotalAPI > lineChangePerSport;
    }
    console.log(spreadOrTotalAPI - spreadOrTotalContract);
    return spreadOrTotalAPI - spreadOrTotalContract > lineChangePerSport;
  }
  return false;
}

function isPercentageOrPriceChanged(oldNumber, newNumber, percentage, price) {
  return (
    getPercentageOrPriceChange(oldNumber, newNumber, percentage, 1) >
      percentage &&
    getPercentageOrPriceChange(oldNumber, newNumber, percentage, 2) > price
  );
}

function getPercentageOrPriceChange(
  oldNumber,
  newNumber,
  percentage,
  typeOfChecking
) {
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
    if (typeOfChecking === 1) {
      let percentageChange = Math.abs((decreaseValue / oldNumberImplied) * 100);
      if (percentageChange > percentage) {
        console.log("Odds changed more than threshold!");
      }
      return percentageChange;
    } else {
      console.log("Difference in odds: " + oldNumberImplied);
      console.log("Difference in odds: " + newNumberImplied);
      let amountChanged = Math.abs(decreaseValue) * 100;
      console.log("Difference in odds: " + amountChanged);
      return amountChanged;
    }
  }
}

function getTeam(event, participantNumber) {
  let participants = [];
  for (key in event.event_participants) {
    participants.push(
      Object.assign(event.event_participants[key].participant, {
        id: key,
      })
    );
  }
  if (participants.length > 0) {
    return participants[participantNumber].name; // return name
  }
  return "TBD TBD"; // count as TBD
}

function calculateOdds(
  event,
  participantNumber,
  odds,
  isSportTwoPositionsSport
) {
  let participants = [];
  for (key in event.event_participants) {
    participants.push(
      Object.assign(event.event_participants[key].participant, {
        id: event.event_participants[key].participantFK,
      })
    );
  }

  if (
    participants[participantNumber] === undefined &&
    isSportTwoPositionsSport
  ) {
    return 0;
  }

  if (
    odds.length == 0 ||
    (odds.length < 3 && !isSportTwoPositionsSport) ||
    (odds.length < 2 && isSportTwoPositionsSport)
  ) {
    return 0;
  }

  let calcOdds = [];
  calcOdds = odds.filter((checkingOdds) => {
    if (participantNumber == 2 && checkingOdds.iparam == 0) {
      return Object.values(checkingOdds.preodds_bettingoffers);
    } else if (
      participantNumber != 2 &&
      checkingOdds.iparam == participants[participantNumber].id
    ) {
      return Object.values(checkingOdds.preodds_bettingoffers);
    }
  });
  return (
    Math.round(
      oddslib
        .from(
          "decimal",
          Object.values(calcOdds[0].preodds_bettingoffers)[0].odds
        )
        .to("moneyline")
    ) * 100
  );
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

function dateConverter(UNIXTimestamp) {
  var date = new Date(UNIXTimestamp);
  var month = date.getUTCMonth() + 1; // starts from zero (0) -> January
  return (
    date.getUTCFullYear() +
    "-" +
    month.toString().padStart(2, "0") +
    "-" +
    date.getUTCDate().toString().padStart(2, "0")
  );
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
