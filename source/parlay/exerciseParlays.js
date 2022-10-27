require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const Web3 = require("web3");
const web3 = new Web3("https://goerli.optimism.io");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");

const parlayData = require("../../contracts/ParlayData.js");
const gamesConsumer = require("../../contracts/GamesConsumer.js");

async function doExercise() {
  const dataParlay = new ethers.Contract(
    process.env.PARLAY_DATA_CONTRACT,
    parlayData.parlayDataContract.abi,
    wallet
  );
  const consumer = new ethers.Contract(
    process.env.CONSUMER_CONTRACT,
    gamesConsumer.gamesConsumerContract.abi,
    wallet
  );
  
  const consumerContract = new web3.eth.Contract(gamesConsumer.gamesConsumerContract.abi, process.env.CONSUMER_CONTRACT);
  console.log("consumer: ", consumerContract.address);
  let processed = false;
  // parlayId
  // let parlayIds = process.env.SPORT_IDS.split(",");

  // let AMMaddress = await parlayData.parlayMarketsAMM(); 
  let parlaysForUser = await dataParlay.userNumOfParlays("0x150029d991468588FC059e3cE0C94EB5D898F40A");
  let parlayOfUser = await dataParlay.userParlays("0x150029d991468588FC059e3cE0C94EB5D898F40A", "1");
  let parlayDetails = await dataParlay.getParlayDetails(parlayOfUser);
  let latestBlock = await constants.etherprovider.getBlockNumber();
  let startBlock = latestBlock - 20000;
  // let numberOfEvents = await consumerContract.getPastEvents('ResolveSportsMarket', {fromBlock: startBlock, toBlock: 'latest',});
  
  
  // constants.etherprovider.on("block", (blockNumber) => {
  //   // Emitted on every block change
  //   console.log("new block:", blockNumber);
  // });
  // await constants.etherprovider.resetEventsBlock(startBlock);

  // consumer.on("ResolveSportsMarket", (_marketAddress, _id, _outcome) => {
  //   console.log("New Market resolved", _marketAddress, _id, _outcome);
  // });

    let eventFilter = consumer.filters.ResolveSportsMarket();
    console.log("eventFilter: ", eventFilter);
    let events = await consumer.queryFilter(eventFilter, startBlock, latestBlock);
    console.log("events #: ", events.length);
    console.log("Event 1: ", events[0]);
    console.log("Event 1 | block: ", events[0].blockNumber);
    console.log("Event 1 | market: ", events[0].args._marketAddress);
  while (!processed) {
    processed = true;
    console.log("ParlayData script...");
    console.log("Latest block: ", await constants.etherprovider.getBlockNumber());
    console.log("Start block: ", startBlock);
    console.log("Wallet address: ", wallet.address);
    console.log("Parlay address: ", dataParlay.address);
    console.log("Parlays for user: ", parseInt(parlaysForUser));
    console.log("Parlay address", parlayOfUser);
    console.log("Consumer address", consumer.address);
    // console.log("consumer events: ", consumer.interface.events);
    // console.log("consumer events: ", consumer.interface.getEvent("ResolveSportsMarket"));
    // console.log("Number of events:", numberOfEvents.length);
    // console.log("Parlay details", parlayDetails);


    // do for all parlayIds
    // for (let j = 0; j < parlayIds.length; j++) {
    //   // do for next X days in front
    // }
  }

  // there is new elements in queue

}

async function doIndefinitely() {
  var numberOfExecution = 0;
  while (true) {
    try {
      console.log("---------START EXERCISE EXECUTION---------");
      console.log("Execution time: " + new Date());
      console.log("Execution number: " + numberOfExecution);
      await doExercise();
      numberOfExecution++;
      console.log("---------END CREATION EXECUTION---------");
      await delay(process.env.CREATION_FREQUENCY);
    } catch (e) {
      console.log(e);
      // wait next process
      await delay(process.env.CREATION_FREQUENCY);
    }
  }
}

doIndefinitely();

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
