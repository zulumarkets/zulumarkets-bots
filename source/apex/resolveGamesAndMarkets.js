require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);
const bytes32 = require("bytes32");

const apexConsumerWrapper = require("../../contracts/ApexConsumerWrapper.js");
const apexConsumer = require("../../contracts/ApexConsumer.js");
const allowances = require("../allowances.js");
const linkToken = require("../../contracts/LinkToken.js");

const ZERO_ADDRESS = "0x" + "0".repeat(40);

async function doResolve() {
    const wrapper = new ethers.Contract(
        process.env.APEX_CONSUMER_WRAPPER_CONTRACT,
        apexConsumerWrapper.apexConsumerWrapperContract.abi,
        wallet
    );

    const consumer = new ethers.Contract(
        process.env.APEX_CONSUMER_CONTRACT,
        apexConsumer.apexConsumerContract.abi,
        wallet
    );

    const erc20Instance = new ethers.Contract(process.env.LINK_CONTRACT, linkToken.linkTokenContract.abi, wallet);

    const amountOfToken = await erc20Instance.balanceOf(wallet.address);
    console.log(`Network: ${process.env.NETWORK}`);
    console.log(`Wallet: ${process.env.WALLET}`);
    console.log(`LINK amount in wallet: ${ethers.utils.formatEther(amountOfToken)}`);
    console.log(`LINK threshold: ${ethers.utils.formatEther(process.env.LINK_THRESHOLD)}`);
    if (
        parseFloat(ethers.utils.formatEther(amountOfToken)) <
        parseFloat(ethers.utils.formatEther(process.env.LINK_THRESHOLD))
    ) {
        console.log(
            `WARNING!!! Amount of LINK in a creator wallet (${ethers.utils.formatEther(
                amountOfToken
            )}) is below threshold (${ethers.utils.formatEther(process.env.LINK_THRESHOLD)}). Refill creator wallet.`
        );
    }

    const numberOfGames = process.env.APEX_NUMBER_OF_GAMES;
    const waitTime = parseInt(process.env.APEX_WAIT_TIME);
    const sport = process.argv[2];

    console.log("*************************************************");
    console.log("Resolving games...");
    console.log(`SPORT: ${sport}`);

    const latestRaceId = await consumer.latestRaceIdPerSport(sport);
    console.log(`The latest event ID for sport ${sport} is: ${latestRaceId}`);

    const raceFulfilledCreated = await consumer.raceFulfilledCreated(latestRaceId);
    console.log("-------------------------------------------------");
    if (raceFulfilledCreated) {
        const raceCreated = await consumer.raceCreated(latestRaceId);
        console.log(`RACE INFO:`);
        console.log(`* sport: ${sport}`);
        console.log(`* event ID: ${raceCreated.raceId}`);
        console.log(`* event name: ${raceCreated.eventName}`);
        console.log(`* qualifying start time: ${dateConverter(raceCreated.qualifyingStartTime * 1000)} (UTC)`);
        console.log(`* start time: ${dateConverter(raceCreated.startTime * 1000)} (UTC)`);

        const today = new Date().getTime();
        if (raceCreated.startTime * 1000 > today) {
            console.log(
                `ERROR - WRONG DATA!!! The race hasn't started yet, start time: ${dateConverter(
                    raceCreated.startTime * 1000
                )} (UTC)! Check race data and try again.`
            );
            process.exit(1);
        }

        const gameIdsForMarketResolve = [];

        for (let i = 1; i <= numberOfGames; i++) {
            console.log(`==================== GAME #${i} ====================`);
            const gameIdString = `${raceCreated.raceId}_h2h_${i}`;
            const gameId = bytes32({ input: gameIdString });

            let gameFulfilledCreated = await consumer.gameFulfilledCreated(gameId);
            if (!gameFulfilledCreated) {
                console.log(`Game ${gameId} not created! Stopping script... Check data and try again.`);
                process.exit(1);
            }
            let marketAddress = await consumer.marketPerGameId(gameId);
            if (marketAddress === ZERO_ADDRESS) {
                console.log(`Market for game ${gameId} not created! Stopping script... Check data and try again.`);
                process.exit(1);
            }

            let skipResultsRequest = false;
            let gameFulfilledResolved = await consumer.gameFulfilledResolved(gameId);
            if (gameFulfilledResolved) {
                console.log(`Game ${gameId} already resolved! Skipping results request for this game...`);
                skipResultsRequest = true;
            }

            if (!skipResultsRequest) {
                console.log(`Sending results request for game #${i}...`);
                const tx = await wrapper.requestResults(raceCreated.raceId, i.toString());
                await tx.wait().then((e) => {
                    console.log(`Requested results data for game #${i}`);
                });

                console.log("Waiting for game results to populate...");
                await delay(waitTime * 1000); // wait to be populated
            }

            gameFulfilledResolved = await consumer.gameFulfilledResolved(gameId);
            console.log("-------------------------------------------------");
            if (gameFulfilledResolved) {
                const gameCreated = await consumer.gameCreated(gameId);
                const gameResolved = await consumer.gameResolved(gameId);
                const gameResults = await consumer.gameResults(gameId);
                console.log(`GAME RESULTS: `);
                console.log(`* matchup: ${gameCreated.homeTeam} vs ${gameCreated.awayTeam}`);
                console.log(`* status: ${gameResolved.statusId.toString() === "1" ? "RESOLVED" : "CANCELLED"}`);
                console.log(`* score: ${gameResolved.homeScore} vs ${gameResolved.awayScore}`);
                console.log(`* result: ${gameResults.result}`);
                console.log(`* result details: ${gameResults.resultDetails}`);

                gameIdsForMarketResolve.push(gameId);
            } else {
                console.log(`Game ${gameId} not resolved! Stopping script... Check data and try again.`);
                process.exit(1);
            }
        }

        console.log("*************************************************");
        console.log("Resolving markets...");
        console.log(`NUMBER OF MARKETS TO RESOLVE: ${gameIdsForMarketResolve.length}`);

        for (let i = 0; i < gameIdsForMarketResolve.length; i++) {
            console.log(`==================== GAME #${i + 1} ====================`);

            let marketAddress = await consumer.marketPerGameId(gameIdsForMarketResolve[i]);
            let marketResolved = await consumer.marketResolved(marketAddress);
            if (marketResolved) {
                console.log(
                    `Market for game ${gameIdsForMarketResolve[i]} and address ${marketAddress} already resolved! Skipping market resolve for this game...`
                );
                continue;
            }
            let marketCanceled = await consumer.marketCanceled(marketAddress);
            if (marketCanceled) {
                console.log(
                    `Market for game ${gameIdsForMarketResolve[i]} and address ${marketAddress} cancelled! Skipping market resolve for this game...`
                );
                continue;
            }

            console.log(`Resolving market for game ${gameIdsForMarketResolve[i]}...`);
            const tx = await consumer.resolveMarketForGame(gameIdsForMarketResolve[i]);
            await tx.wait().then((e) => {
                console.log(`Market resolved for game ${gameIdsForMarketResolve[i]}`);
            });

            console.log("Waiting for market data to populate...");
            await delay(5 * 1000); // wait to be populated

            marketResolved = await consumer.marketResolved(marketAddress);
            marketCanceled = await consumer.marketCanceled(marketAddress);
            if (marketResolved) {
                console.log(`Market with address ${marketAddress} resolved`);
            } else if (marketCanceled) {
                console.log(`Market with address ${marketAddress} cancelled`);
            } else {
                console.log(`ERROR!!! Market with address ${marketAddress} not resolved! Check data and try again.`);
            }
        }
    } else {
        console.log(`ERROR - MISSING RACE DATA!!! The race info is missing! Check race data and try again.`);
    }
}

async function resolveGamesAndMarkets() {
    await allowances.checkAllowanceAndAllow(process.env.LINK_CONTRACT, process.env.APEX_CONSUMER_WRAPPER_CONTRACT);
    try {
        if (process.argv[2] !== "formula1" && process.argv[2] !== "motogp") {
            console.log("ERROR!!! Please pass right sport ('formula1' or 'motogp') as script first parameter!");
        } else {
            await doResolve();
        }
        process.exit(0);
    } catch (e) {
        console.log(e);
        console.log("Please check script, error on execution");
        process.exit(1);
    }
}

resolveGamesAndMarkets();

function dateConverter(UNIXTimestamp) {
    var date = new Date(UNIXTimestamp);
    var month = date.getUTCMonth() + 1; // starts from zero (0) -> January
    return `${date.getUTCFullYear()}-${month}-${date.getUTCDate()} | ${date.getUTCHours()}:${date.getUTCMinutes()}`;
}

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}
