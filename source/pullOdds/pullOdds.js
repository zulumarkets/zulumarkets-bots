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

async function doPull() {

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

  const jobId = bytes32({ input: process.env.JOB_ID_ODDS});
  
  // number of days in front for calculation
  const daysInFront = process.env.CREATION_DAYS_INFRONT;

  // sportId
  let sportIds =  process.env.SPORT_IDS.split(",");

  console.log("Pulling Odds...");

  let processed = false;
  while (!processed) {
    processed = true;

    console.log("JOB ID =  " + jobId);

    let unproccessedGames = await queues.getLengthUnproccessedGames();
    console.log("GAMES length =  " + unproccessedGames);

    let linkAmountForApprove = await wrapper.payment();
    console.log("Link amount to approve:  " + linkAmountForApprove);

    if(unproccessedGames > 0){

      // do for all sportIds
      for (let j = 0; j < sportIds.length; j++) {
        // from today!!! maybe some games still running
        for (let i = 0; i <= daysInFront; i++) {
          console.log("------------------------");
          console.log("SPORT ID =  " + sportIds[j]);
          console.log("TODAY +  " + i);

          let unixDate = await getSecondsToDate(i);
          console.log("Unix date in seconds: " + unixDate);
          let unixDateMiliseconds = parseInt(unixDate) * process.env.MILISECONDS;
          console.log("Unix date in miliseconds: " + unixDateMiliseconds);

          let isSportOnADate = await consumer.isSportOnADate(unixDate, sportIds[j]);
          console.log("having Sport On A Date:  " + isSportOnADate);

          let timeInMiliseconds = new Date().getTime(); // miliseconds
          console.log("Time is:  " + timeInMiliseconds);

          let oddsLastPulledForDate = await consumer.oddsLastPulledForDate(unixDate);
          console.log("Last pulled time:  " + oddsLastPulledForDate);
          let oddsLastPulledForDateMili = parseInt(oddsLastPulledForDate) * process.env.MILISECONDS;
          console.log("Last pulled time mili:  " + oddsLastPulledForDateMili);

          // that day have games inside
          if(isSportOnADate){
            console.log("Processing sport and date...");
            // if it is less then 24h or time for pulling odds on that date more then slow porcessing hours
            if(parseInt(unixDateMiliseconds) - parseInt(timeInMiliseconds) < process.env.ONE_DAY_IN_MILISECONDS || 
            (oddsLastPulledForDateMili + (process.env.ONE_HOUR_IN_SECONDS * process.env.SLOW_PROCCES_HOURS) * process.env.MILISECONDS) <= timeInMiliseconds){
              console.log("Sending request, it is time to do it...");
              try {

                console.log("Approve link amount...");
            
                let approveTx = await link.approve(
                  process.env.WRAPPER_CONTRACT,
                  linkAmountForApprove,
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

                let tx = await wrapper.requestOddsWithFilters(
                  jobId,
                  sportIds[j],
                  unixDate,
                  [] //ids
                );
      
                await tx.wait().then((e) => {
                  console.log(
                    "Requested for: " + unixDate + " for sport: " + sportIds[j]
                  );
                });
                await delay(5000); // wait to be populated
              } catch (e) {
                console.log(e);
              }
            }else{
              console.log("Not still for processing...");
            }
          }else{
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
  while (true) {
    await doPull();
    await delay(3600 * 1000); // each hour
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
