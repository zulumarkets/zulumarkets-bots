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

async function doCreate() {
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
    const qualifyingStatus = process.argv[3];
    const updateOddsOnly = process.argv[4] === "updateOddsOnly";

    console.log("*************************************************");
    console.log("Creating games...");
    console.log(`SPORT: ${sport}`);
    console.log(`QUALIFYING STATUS: ${qualifyingStatus}`);

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
        if (raceCreated.qualifyingStartTime * 1000 < today) {
            console.log(
                `ERROR - WRONG DATA!!! The race qualifying start time: ${dateConverter(
                    raceCreated.qualifyingStartTime * 1000
                )} (UTC) is in the past! Check race data and try again.`
            );
            process.exit(1);
        }
        if (raceCreated.startTime * 1000 < today) {
            console.log(
                `ERROR - WRONG DATA!!! The race start time: ${dateConverter(
                    raceCreated.startTime * 1000
                )} (UTC) is in the past! Check race data and try again.`
            );
            process.exit(1);
        }

        const gameIdsForMarketCreate = [];

        for (let i = 1; i <= numberOfGames; i++) {
            console.log(`==================== GAME #${i} ====================`);
            const gameIdString = `${raceCreated.raceId}_h2h_${i}`;
            const gameId = bytes32({ input: gameIdString });

            let skipMatchupRequest = false;
            let gameFulfilledCreated = await consumer.gameFulfilledCreated(gameId);
            if (gameFulfilledCreated && qualifyingStatus === "pre" && !updateOddsOnly) {
                console.log(
                    `Game ${gameId} already created! Skipping matchup request for 'pre' qualifying status... Call script with 'pre' qualifying status and 'updateOddsOnly' flag to update odds.`
                );
                skipMatchupRequest = true;
            }
            if (!gameFulfilledCreated && qualifyingStatus === "post") {
                console.log(
                    `Game ${gameId} not created! It is required for 'post' qualifying status. Stopping script... Check data and try again.`
                );
                process.exit(1);
            }
            let oldHomeOdds = 0;
            let oldAwayOdds = 0;
            let oldArePostQualifyingOddsFetched = false;
            if (gameFulfilledCreated) {
                const gameOdds = await consumer.gameOdds(gameId);
                oldHomeOdds = gameOdds.homeOdds;
                oldAwayOdds = gameOdds.awayOdds;
                oldArePostQualifyingOddsFetched = gameOdds.arePostQualifyingOddsFetched;
            }

            if (!skipMatchupRequest) {
                console.log(`Sending matchup request for game #${i}...`);
                const tx = await wrapper.requestMatchup(raceCreated.raceId, i.toString(), qualifyingStatus);
                await tx.wait().then((e) => {
                    console.log(`Requested matchup data for game #${i}`);
                });

                console.log("Waiting for game metadata to populate...");
                await delay(waitTime * 1000); // wait to be populated
            }

            console.log(`Game ${gameIdString} ID: ${gameId}`);

            gameFulfilledCreated = await consumer.gameFulfilledCreated(gameId);
            console.log("-------------------------------------------------");
            if (gameFulfilledCreated) {
                const gameCreated = await consumer.gameCreated(gameId);
                const gameOdds = await consumer.gameOdds(gameId);
                console.log(`GAME INFO: `);
                console.log(`* matchup: ${gameCreated.homeTeam} vs ${gameCreated.awayTeam}`);
                if ((qualifyingStatus === "pre" && updateOddsOnly) || qualifyingStatus === "post") {
                    console.log(`* old odds: ${oldHomeOdds} vs ${oldAwayOdds}`);
                    console.log(`* new odds: ${gameOdds.homeOdds} vs ${gameOdds.awayOdds}`);
                    console.log(`* old odds type: ${oldArePostQualifyingOddsFetched ? "post" : "pre"}`);
                    console.log(`* new odds type: ${gameOdds.arePostQualifyingOddsFetched ? "post" : "pre"}`);
                } else {
                    console.log(`* odds: ${gameOdds.homeOdds} vs ${gameOdds.awayOdds}`);
                    console.log(`* odds type: ${gameOdds.arePostQualifyingOddsFetched ? "post" : "pre"}`);
                }
                console.log(`* start time: ${dateConverter(gameCreated.startTime * 1000)} (UTC)`);

                if (qualifyingStatus === "post" && !gameOdds.arePostQualifyingOddsFetched) {
                    console.log(
                        `The "post" odds for game ${gameId} not fetched! Stopping script... Check data and try again.`
                    );
                    process.exit(1);
                }

                const today = new Date().getTime();
                if (gameCreated.startTime * 1000 < today) {
                    console.log(
                        `ERROR - WRONG DATA!!! The game start time: ${dateConverter(
                            gameCreated.startTime * 1000
                        )} (UTC) is in the past! Stopping script... Check game data and try again.`
                    );
                    process.exit(1);
                }

                if (qualifyingStatus === "pre" && !updateOddsOnly) {
                    gameIdsForMarketCreate.push(gameId);
                }
            } else {
                console.log(`Game ${gameId} not created! Stopping script... Check data and try again.`);
                process.exit(1);
            }
        }

        if (qualifyingStatus === "pre" && !updateOddsOnly) {
            console.log("*************************************************");
            console.log("Creating markets...");
            console.log(`NUMBER OF MARKETS TO CREATE: ${gameIdsForMarketCreate.length}`);

            for (let i = 0; i < gameIdsForMarketCreate.length; i++) {
                console.log(`==================== GAME #${i + 1} ====================`);

                let marketAddress = await consumer.marketPerGameId(gameIdsForMarketCreate[i]);
                if (marketAddress !== ZERO_ADDRESS) {
                    console.log(
                        `Market for game ${gameIdsForMarketCreate[i]} already created: ${marketAddress}! Skipping market create for this game...`
                    );
                    continue;
                }

                console.log(`Creating market for game ${gameIdsForMarketCreate[i]}...`);
                const tx = await consumer.createMarketForGame(gameIdsForMarketCreate[i]);
                await tx.wait().then((e) => {
                    console.log(`Market created for game ${gameIdsForMarketCreate[i]}`);
                });

                console.log("Waiting for market data to populate...");
                await delay(1000); // wait to be populated

                marketAddress = await consumer.marketPerGameId(gameIdsForMarketCreate[i]);
                console.log(`Market address: ${marketAddress}`);
            }
        }
    } else {
        console.log(`ERROR - MISSING RACE DATA!!! The race info is missing! Check race data and try again.`);
    }
}

async function createGamesAndMarkets() {
    await allowances.checkAllowanceAndAllow(process.env.LINK_CONTRACT, process.env.APEX_CONSUMER_WRAPPER_CONTRACT);
    try {
        if (process.argv[2] !== "formula1" && process.argv[2] !== "motogp") {
            console.log("ERROR!!! Please pass right sport ('formula1' or 'motogp') as script first parameter!");
        } else if (process.argv[3] !== "pre" && process.argv[3] !== "post") {
            console.log("ERROR!!! Please pass right qualifying status ('pre' or 'post') as script second parameter!");
        } else {
            await doCreate();
        }
        process.exit(0);
    } catch (e) {
        console.log(e);
        console.log("Please check script, error on execution");
        process.exit(1);
    }
}

createGamesAndMarkets();

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
