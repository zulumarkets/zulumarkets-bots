require("dotenv").config();

const constants = require("../constants.js");
const thalesData = require("thales-data");
const ethers = require("ethers");
const privateKeyBuffer = Buffer.from(constants.privateKey, "hex");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const fetch = require("node-fetch");
const w3utils = require("web3-utils");
const bytes32 = require("bytes32");

const gamesQueue = require("../../contracts/GamesQueue.js");
const gamesWrapper = require("../../contracts/GamesWrapper.js");
const gamesConsumer = require("../../contracts/GamesConsumer.js");
const linkToken = require("../../contracts/LinkToken.js");

async function doCreate() {
  const link = new ethers.Contract(
    process.env.LINK_CONTRACT,
    linkToken.linkTokenContract.abi,
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

  const jobId = bytes32({ input: process.env.JOB_ID_CREATION });

  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  const market = process.env.MARKET_CREATION;

  // sportId
  let sportIds = process.env.SPORT_IDS.split(",");

  console.log("Create Games...");

  let processed = false;
  while (!processed) {
    processed = true;

    console.log("JOB ID =  " + jobId);
    console.log("MARKET =  " + market);

    let linkAmountForApprove = await wrapper.payment();
    console.log("Link amount to approve:  " + linkAmountForApprove);

    // do for all sportIds
    for (let j = 0; j < sportIds.length; j++) {
      // do for next X days in front
      for (let i = 1; i <= daysInFront; i++) {
        console.log("------------------------");
        console.log("SPORT ID =  " + sportIds[j]);
        console.log("TODAY +  " + i);

        let unixDate = await getSecondsToDate(i);
        console.log("Unix date in seconds: " + unixDate);

        const dayOfWeekDigit = new Date(parseInt(unixDate) * 1000).getDay();
        console.log("Day of week: " + dayOfWeekDigit);

        // NBA, EPL fetch game every day
        // Champions Leaugue only Tuesday, Wednesday (Final game is on Saturday!! TODO!)
        if (sportIds[j] == 16 && dayOfWeekDigit != 2 && dayOfWeekDigit != 3) {
          console.log("Skiping date for sport: " + sportIds[j] + " on a date: " + unixDate);
        } else {
          try {
            console.log("Approve link amount...");

            let approveTx = await link.approve(
              process.env.WRAPPER_CONTRACT,
              linkAmountForApprove
            );

            await approveTx.wait().then((e) => {
              console.log(
                "approved " +
                  process.env.WRAPPER_CONTRACT +
                  " on " +
                  wallet.address +
                  " amount: " +
                  linkAmountForApprove
              );
            });

            console.log("------------------------");
            console.log("Send request...");

            let tx_request = await wrapper.requestGames(
              jobId,
              market,
              sportIds[j],
              unixDate
            );

            await tx_request.wait().then((e) => {
              console.log("Requested for: " + unixDate);
            });
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  await delay(20000); // wait to be populated
  console.log("Create Markets...");

  processed = false;
  while (!processed) {
    processed = true;
    let firstCreated = await queues.firstCreated();
    console.log("Start:  " + firstCreated);
    let lastCreated = await queues.lastCreated();
    console.log("End:  " + lastCreated);

    // there is new elements in queue
    if (parseInt(firstCreated) <= parseInt(lastCreated)) {
      console.log("Processing...");
      for (let i = parseInt(firstCreated); i <= parseInt(lastCreated); i++) {
        console.log("Process game from queue:  " + i);

        let gameId = await queues.gamesCreateQueue(i);
        console.log("GameID: " + gameId);

        try {
          let tx = await consumer.createMarketForGame(gameId);

          await tx.wait().then((e) => {
            console.log("Market created for game: " + gameId);
          });

          let marketAddress = await consumer.marketPerGameId(gameId);
          console.log("Market address: " + marketAddress);
        } catch (e) {
          i--;
          console.log(e);
        }
      }
    } else {
      console.log("Nothing to process...");
    }
  }

  console.log("Ended batch...");
}

async function doIndefinitely() {
  while (true) {
    await doCreate();
    await delay(3600 * 1000 * 24); // each day
  }
}

doIndefinitely();

function getSecondsToDate(dateFrom) {
  const date = new Date(Date.now() + dateFrom * 3600 * 1000 * 24);
  date.setHours(0);
  date.setMinutes(0);
  date.setMilliseconds(0);
  date.setSeconds(0);
  return Math.floor(date.getTime() / 1000);
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
