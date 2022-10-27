require("dotenv").config();

const supportedSports = ["formula1", "motogp"];

const supportedQualifyingStatuses = ["pre", "post"];

const supportedBetTypesPerSport = {
    formula1: ["outright_head_to_head", "top3", "top5", "top10"],
    motogp: ["outright_head_to_head", "top3", "top5"],
};

const numberOfGamesPerSportAndBetType = {
    formula1_outright_head_to_head: 8,
    motogp_outright_head_to_head: 10,
    formula1_top3: 2,
    motogp_top3: 2,
    formula1_top5: 1,
    motogp_top5: 3,
    formula1_top10: 3,
};

module.exports = {
    supportedSports,
    supportedQualifyingStatuses,
    supportedBetTypesPerSport,
    numberOfGamesPerSportAndBetType,
};
