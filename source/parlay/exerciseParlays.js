require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
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
  
  let processed = false;
  // parlayId
  // let parlayIds = process.env.SPORT_IDS.split(",");

  // let AMMaddress = await parlayData.parlayMarketsAMM(); 
  let parlaysForUser = await dataParlay.userNumOfParlays("0x150029d991468588FC059e3cE0C94EB5D898F40A");
  let parlayOfUser = await dataParlay.userParlays("0x150029d991468588FC059e3cE0C94EB5D898F40A", "1");
  let parlayDetails = await dataParlay.getParlayDetails(parlayOfUser);
  let latestBlock = await constants.etherprovider.getBlockNumber();
  let startBlock = latestBlock - 40000;
  // let numberOfEvents = await consumerContract.getPastEvents('ResolveSportsMarket', {fromBlock: startBlock, toBlock: 'latest',});
  let parlaysToBeExercised = [];
  if(startBlock != 0) {
    let eventFilter = consumer.filters.ResolveSportsMarket();
    let events = await consumer.queryFilter(eventFilter, startBlock, latestBlock);
    if(events.length > 0) {
      let sportMarketAddress;
      let sportMarketId;
      let sportMarketOutcome;
      let sportMarketOptionsCount;
      for(let i=0; i<events.length;i++) {
        sportMarketAddress = events[i].args._marketAddress;
        sportMarketId = events[i].args._id;
        sportMarketOutcome = parseInt(events[i].args._outcome);
        sportMarketOptionsCount = await consumer.isSportTwoPositionsSport(sportMarketId) ? 2 : 3;
        console.log("\n ", i," market: ", sportMarketAddress, " | optionsCount: ", sportMarketOptionsCount, " | outcome: ", sportMarketOutcome);
        
        // check to exercise the already lost with the outcome or cancelled
        
        let numOfParlaysPerGamePosition = await dataParlay.numOfParlaysInGamePosition(sportMarketAddress, sportMarketOutcome);
        console.log("# of parlays with outcome",sportMarketOutcome ," : ", parseInt(numOfParlaysPerGamePosition));
        if(parseInt(numOfParlaysPerGamePosition) > 0) {
          let parlayMarket;
          let parlayMarketDetails;
          for(let j=0; j<parseInt(numOfParlaysPerGamePosition);j++) {
            parlayMarket = await dataParlay.gameAddressPositionParlay(sportMarketAddress, sportMarketOutcome, j);
            console.log("--> ",j, " checking parlay ", parlayMarket);
            parlayMarketDetails = await dataParlay.parlayDetails(parlayMarket);
            if(parlayMarketDetails.alreadyLost){  
              // exercise parlay
              if(!parlaysToBeExercised.includes(parlayMarket)) {
                console.log("parlay: ", parlayMarket, " already lost!");
                parlaysToBeExercised.push(parlayMarket);
              }
            }

          }
        }
        console.log("CHECKING DIFFERENT OUTCOMES --->")
        if(sportMarketOptionsCount > 2) {
          console.log("--> three option sport")
          let differentOutcome;
          if(sportMarketOutcome == 1) {
            sportMarketOutcome = 2;
            differentOutcome = 3; 
          }
          else if(sportMarketOutcome == 2){
            sportMarketOutcome = 1;
            differentOutcome = 3;
          }
          else if(sportMarketOutcome == 3){
            sportMarketOutcome = 1;
            differentOutcome = 2;
          }
          else {
            differentOutcome = 0;
          }
          numOfParlaysPerGamePosition = await dataParlay.numOfParlaysInGamePosition(sportMarketAddress, sportMarketOutcome);
          console.log("# of parlays with diffrent outcome",sportMarketOutcome ," : ", parseInt(numOfParlaysPerGamePosition));
          if(parseInt(numOfParlaysPerGamePosition) > 0) {
            let parlayMarket;
            let parlayMarketDetails;
            for(let j=0; j<parseInt(numOfParlaysPerGamePosition);j++) {
              parlayMarket = await dataParlay.gameAddressPositionParlay(sportMarketAddress, sportMarketOutcome, j);
              console.log("--> ",j, " checking parlay ", parlayMarket);
              parlayMarketDetails = await dataParlay.parlayDetails(parlayMarket);
              if(!parlayMarketDetails.resolved && !parlayMarketDetails.alreadyLost){
                // exercise parlay
                if(!parlaysToBeExercised.includes(parlayMarket)) {
                  console.log("parlay: ", parlayMarket, " has not lost yet!");
                  parlaysToBeExercised.push(parlayMarket);
                }
              }

            }
          }
          sportMarketOutcome = differentOutcome;
          numOfParlaysPerGamePosition = await dataParlay.numOfParlaysInGamePosition(sportMarketAddress, sportMarketOutcome);
          console.log("# of parlays with diffrent outcome",sportMarketOutcome ," : ", parseInt(numOfParlaysPerGamePosition));
          if(parseInt(numOfParlaysPerGamePosition) > 0) {
            let parlayMarket;
            let parlayMarketDetails;
            for(let j=0; j<parseInt(numOfParlaysPerGamePosition);j++) {
              parlayMarket = await dataParlay.gameAddressPositionParlay(sportMarketAddress, sportMarketOutcome, j);
              console.log("--> ",j, " checking parlay ", parlayMarket);
              parlayMarketDetails = await dataParlay.parlayDetails(parlayMarket);
              if(!parlayMarketDetails.resolved && !parlayMarketDetails.alreadyLost){
                if(!parlaysToBeExercised.includes(parlayMarket)) {
                  console.log("parlay: ", parlayMarket, " has not lost yet!");
                  parlaysToBeExercised.push(parlayMarket);
                }
                // exercise parlay
              }

            }
          }
        }
        else {
          if(sportMarketOutcome == 1) {
            sportMarketOutcome = 2;
          }
          else if(sportMarketOutcome == 2){
            sportMarketOutcome = 1;
          }
          numOfParlaysPerGamePosition = await dataParlay.numOfParlaysInGamePosition(sportMarketAddress, sportMarketOutcome);
          console.log("# of parlays with diffrent outcome",sportMarketOutcome ," : ", parseInt(numOfParlaysPerGamePosition));
          if(parseInt(numOfParlaysPerGamePosition) > 0) {
            let parlayMarket;
            let parlayMarketDetails;
            for(let j=0; j<parseInt(numOfParlaysPerGamePosition);j++) {
              parlayMarket = await dataParlay.gameAddressPositionParlay(sportMarketAddress, sportMarketOutcome, j);
              console.log("--> ",j, " checking parlay ", parlayMarket);
              parlayMarketDetails = await dataParlay.parlayDetails(parlayMarket);
              if(!parlayMarketDetails.resolved && !parlayMarketDetails.alreadyLost){
                if(!parlaysToBeExercised.includes(parlayMarket)) {
                  parlaysToBeExercised.push(parlayMarket);
                }
                // exercise parlay
              }

            }
          }
        }
       
      }
      if(parlaysToBeExercised.length > 0) {
        console.log("Parlays to be exercised: ", parlaysToBeExercised);
      }
    }
  }
  // constants.etherprovider.on("block", (blockNumber) => {
  //   // Emitted on every block change
  //   console.log("new block:", blockNumber);
  // });
  // await constants.etherprovider.resetEventsBlock(startBlock);

  // consumer.on("ResolveSportsMarket", (_marketAddress, _id, _outcome) => {
  //   console.log("New Market resolved", _marketAddress, _id, _outcome);
  // });

    // let eventFilter = consumer.filters.ResolveSportsMarket();
    // let events = await consumer.queryFilter(eventFilter, startBlock, latestBlock);
    // console.log("events #: ", events.length);
    // console.log("Event 1: ", events[0]);
    // console.log("Event 1 | block: ", events[0].blockNumber);
    // console.log("Event 1 | market: ", events[0].args._marketAddress);
    // console.log("Event 1 | outcome: ", parseInt(events[0].args._outcome));
  while (!processed) {
    processed = true;
    // console.log("ParlayData script...");
    // console.log("Latest block: ", await constants.etherprovider.getBlockNumber());
    // console.log("Start block: ", startBlock);
    // console.log("Wallet address: ", wallet.address);
    // console.log("Parlay address: ", dataParlay.address);
    // console.log("Parlays for user: ", parseInt(parlaysForUser));
    // console.log("Parlay address", parlayOfUser);
    // console.log("Consumer address", consumer.address);
    // let numOfParlaysGamePosition  = await dataParlay.numOfParlaysInGamePosition( events[0].args._marketAddress, parseInt(events[0].args._outcome));
    // let numOfParlaysOppositeGamePosition  = await dataParlay.numOfParlaysInGamePosition( events[0].args._marketAddress, 2);
    // // console.log("consumer events: ", consumer.interface.events);
    // // console.log("consumer events: ", consumer.interface.getEvent("ResolveSportsMarket"));
    // // console.log("Number of events:", numberOfEvents.length);
    // console.log("Num of parlays for winning position", parseInt(numOfParlaysGamePosition));
    // console.log("Num of parlays for winning position", parseInt(numOfParlaysGamePosition));


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
