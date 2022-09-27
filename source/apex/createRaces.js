require("dotenv").config();

const constants = require("../constants.js");
const ethers = require("ethers");
const wallet = new ethers.Wallet(constants.privateKey, constants.etherprovider);

const apexConsumerWrapper = require("../../contracts/ApexConsumerWrapper.js");
const apexConsumer = require("../../contracts/ApexConsumer.js");
const allowances = require("../../source/allowances.js");
const linkToken = require("../../contracts/LinkToken.js");

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

    const metdataJobId = process.env.APEX_JOB_ID_REQUEST_METADATA;
    const waitTime = parseInt(process.env.APEX_WAIT_TIME);
    const sport = process.argv[2];

    console.log("*************************************************");
    console.log("Creating race...");
    console.log(`JOB ID: ${metdataJobId}`);
    console.log(`SPORT: ${sport}`);
    console.log(`==================== SPORT ${sport} ====================`);
    console.log(`Sending metadata request for ${sport}...`);
    const tx = await wrapper.requestMetaData(sport);

    await tx.wait().then((e) => {
        console.log(`Requested metadata for ${sport}...`);
    });

    console.log("Waiting for race metadata to populate...");
    await delay(waitTime * 1000); // wait to be populated

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
        if (raceCreated.startTime * 1000 < today) {
            console.log(
                `WARNING - WRONG DATA!!! The race qualifying start time: ${dateConverter(
                    raceCreated.qualifyingStartTime * 1000
                )} (UTC) is in the past! Check race data and try again.`
            );
        }
        if (raceCreated.startTime * 1000 < today) {
            console.log(
                `WARNING - WRONG DATA!!! The race start time: ${dateConverter(
                    raceCreated.startTime * 1000
                )} (UTC) is in the past! Check race data and try again.`
            );
        }
    } else {
        console.log(`WARNING - MISSING RACE DATA!!! The race info is missing! Check race data and try again.`);
    }
}

async function createRaces() {
    await allowances.checkAllowanceAndAllow(process.env.LINK_CONTRACT, process.env.APEX_CONSUMER_WRAPPER_CONTRACT);
    try {
        if (process.argv[2] !== "formula1" && process.argv[2] !== "motogp") {
            console.log("ERROR!!! Please pass right sport ('formula1' or 'motogp') as script first parameter!");
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

createRaces();

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
