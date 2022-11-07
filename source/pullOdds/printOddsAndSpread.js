require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);

const Discord = require("discord.js");
const overtimeBot = new Discord.Client();
overtimeBot.login(process.env.BOT_OVERTIME_ODDS);

const axios = require("axios");

const gamesQueue = require("../../contracts/GamesQueue.js");
const gamesConsumer = require("../../contracts/GamesConsumer.js");
const allowances = require("../allowances.js");

const consumer = new ethers.Contract(
  process.env.CONSUMER_CONTRACT,
  gamesConsumer.gamesConsumerContract.abi,
  wallet
);

async function doPull(numberOfExecution) {
  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  const primaryBookmaker = process.env.PRIMARY_ODDS_BOOKMAKER;
  const useBackupBookmaker = process.env.USE_BACKUP_ODDS_BOOKMAKER === "true";
  const backupBookmaker = process.env.BACKUP_ODDS_BOOKMAKER;

  // sportId
  let sportIds = process.env.SPORT_IDS.split(",");

  const baseUrl = process.env.RUNDOWN_BASE_URL;

  let americanSports = [1, 2, 3, 4, 6, 10];

  let processed = false;
  while (!processed) {
    processed = true;
    // do for all sportIds
    for (let j = 0; j < sportIds.length; j++) {
      // from today!!! maybe some games still running
      for (let i = 0; i <= daysInFront; i++) {
        let unixDate = getSecondsToDate(i);
        let unixDateMiliseconds = parseInt(unixDate) * process.env.MILISECONDS;

        let isSportOnADate = await consumer.isSportOnADate(
          unixDate,
          sportIds[j]
        );

        let gamesOnContract = await consumer.getGamesPerDatePerSport(
          sportIds[j],
          unixDate
        );

        let isSportTwoPositionsSport = await consumer.isSportTwoPositionsSport(
          sportIds[j]
        );

        // that day have games inside
        if (isSportOnADate && gamesOnContract.length > 0) {
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
              spreadHome: getOddsForPrinting(event.lines, 1, primaryBookmaker),
              spreadAway: getOddsForPrinting(event.lines, 2, primaryBookmaker),
              spreadHomeOdds: getOddsForPrinting(
                event.lines,
                3,
                primaryBookmaker
              ),
              spreadAwayOdds: getOddsForPrinting(
                event.lines,
                4,
                primaryBookmaker
              ),
              totalOver: getOddsForPrinting(event.lines, 5, primaryBookmaker),
              totalUnder: getOddsForPrinting(event.lines, 6, primaryBookmaker),
              totalOverOdds: getOddsForPrinting(
                event.lines,
                7,
                primaryBookmaker
              ),
              totalUnderOdds: getOddsForPrinting(
                event.lines,
                8,
                primaryBookmaker
              ),
            });
          });

          console.log(gamesListResponse);
        } else {
        }
      }
    }
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
      await doPull(numberOfExecution);
      numberOfExecution++;
      await delay(process.env.ODDS_FREQUENCY);
    } catch (e) {
      await delay(process.env.ODDS_FREQUENCY);
    }
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
    if (isSportTwoPositionsSport) {
      return 0.01; // default
    }
    return oddBackup[0].moneyline.moneyline_draw * 100;
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

function getOddsForPrinting(lines, oddNumber, primaryBookmaker) {
  var odds = [];
  for (key in lines) {
    odds.push(Object.assign(lines[key], { name: key }));
  }

  let oddPrimary = odds.filter(function (bookmaker) {
    return bookmaker.name == primaryBookmaker; // primary example 3 - Pinnacle
  });

  if (oddPrimary.length == 0) {
    return 0;
  } else if (oddNumber == 1) {
    return oddPrimary[0].spread.point_spread_home;
  } else if (oddNumber == 2) {
    return oddPrimary[0].spread.point_spread_away;
  } else if (oddNumber == 3) {
    return oddPrimary[0].spread.point_spread_home_money;
  } else if (oddNumber == 4) {
    return oddPrimary[0].spread.point_spread_away_money;
  } else if (oddNumber == 5) {
    return oddPrimary[0].total.total_over;
  } else if (oddNumber == 6) {
    return oddPrimary[0].total.total_under;
  } else if (oddNumber == 7) {
    return oddPrimary[0].total.total_over_money;
  } else if (oddNumber == 8) {
    return oddPrimary[0].total.total_under_money;
  }
}
