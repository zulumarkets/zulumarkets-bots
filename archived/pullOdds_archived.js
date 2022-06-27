require("dotenv").config();

const constants = require("../constants.js");
const thalesData = require("thales-data");
const ethers = require("ethers");
const privateKeyBuffer = Buffer.from(constants.privateKey, "hex");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const fetch = require("node-fetch");
const w3utils = require("web3-utils");
const bytes32 = require("bytes32");

const gamesQueue = require("../../scripts/GamesQueue.js");
const gamesWrapper = require("../../scripts/GamesWrapper.js");
const gamesConsumer = require("../../scripts/GamesConsumer.js");
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

  console.log("Pulling Odds...");

  let processed = false;
  while (!processed) {
    processed = true;

    console.log("JOB ID =  " + jobId);
    console.log("LINK AMOUNT =  " + linkAmountPerRequest);

    let unproccessedGames = await queues.getLengthUnproccessedGames();
    console.log("GAMES length =  " + unproccessedGames);

    let linkAmountForApprove = await wrapper.payment();
    console.log("Link amount to approve:  " + linkAmountForApprove);

    // do for all games
    for (let j = 0; j < unproccessedGames; j++) {
      let gameID = await queues.unproccessedGames(j);
      console.log("GAME ID:  " + gameID);

      let stringId = bytes32({ input: gameID });
      console.log("Game id as string:  " + stringId);

      let sportId = await queues.sportPerGameId(gameID);
      console.log("Sport ID:  " + sportId);

      let gameStart = await queues.gameStartPerGameId(gameID);
      console.log("GAME start:  " + gameStart);
      let gameTimeMilliseconds = parseInt(gameStart) * process.env.MILISECONDS; // miliseconds
      console.log("Game time (miliseconds): " + gameTimeMilliseconds);

      let gameLastTimePullOdds = await consumer.oddsLastPulledForGame(gameID);
      console.log("Last pulled time:  " + gameLastTimePullOdds);
      let gameLastTimePullOddsMili = parseInt(gameLastTimePullOdds) * process.env.MILISECONDS;
      console.log("Last pulled time mili:  " + gameLastTimePullOddsMili);

      let timeForMoreOftenPullOdds = parseInt(gameStart) - process.env.FASTER_PROCESSING_TIME; // three days before start game more often pull odds
      let timeForMoreOftenPullOddsMiliseconds = parseInt(timeForMoreOftenPullOdds) * process.env.MILISECONDS; // miliseconds
      console.log("Time for more offten pull odds: " + parseInt(timeForMoreOftenPullOdds));
      console.log("Time for more offten pull odds(miliseconds):  " + timeForMoreOftenPullOddsMiliseconds);

      let timeInMiliseconds = new Date().getTime(); // miliseconds
      console.log("Time is:  " + timeInMiliseconds);

      //let ids = [stringId];

      // slow processing, current time is in the distant past
      if (parseInt(timeInMiliseconds) < parseInt(gameTimeMilliseconds) && 
            parseInt(timeInMiliseconds) < parseInt(timeForMoreOftenPullOddsMiliseconds)) {
        console.log("Slow process...");
        // is already pulled odds in the recent period
        if((gameLastTimePullOddsMili + (process.env.ONE_HOUR_IN_SECONDS * process.env.SLOW_PROCCES_HOURS) * process.env.MILISECONDS) < timeInMiliseconds){
          // pull odds
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
              let tx = await wrapper.requestOddsWithFilters(
                jobId,
                sportId,
                gameStart,
                [] //ids
              );
  
            await tx.wait().then((e) => {
              console.log(
                "Requested for: " + gameStart + " with game id: " + stringId
              );
            });
            await delay(5000); // wait to be populated
          } catch (e) {
            console.log(e);
          }
        }else{
          continue;
        }
      // fast processing, current time is closer to game time   
      }else if(parseInt(timeInMiliseconds) < parseInt(gameTimeMilliseconds) && 
          parseInt(timeInMiliseconds) > parseInt(timeForMoreOftenPullOddsMiliseconds)){
        console.log("Fast process...");
        // is already pulled odds in the recent period
        if((gameLastTimePullOddsMili + (process.env.ONE_HOUR_IN_SECONDS * process.env.FAST_PROCESS_HOURS) * process.env.MILISECONDS) < timeInMiliseconds){

          // pull odds
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

            let tx = await wrapper.requestOddsWithFilters(
              jobId,
              sportId,
              gameStart,
              [] //ids
            );
  
            await tx.wait().then((e) => {
              console.log(
                "Requested for: " + gameStart + " with game id: " + stringId
              );
            });
            await delay(5000); // wait to be populated
          } catch (e) {
            console.log(e);
          }
        }else{
          continue;
        }
      }else {
        console.log("On to the next, less then expected time");
        continue;
      }
    }
  }

  console.log("Ended batch...");

}

async function doIndefinitely() {
  while (true) {
    await doPull();
    await delay(3600 * 1000); // each hour
  }
}

doIndefinitely();

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
