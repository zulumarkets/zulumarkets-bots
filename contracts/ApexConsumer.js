const apexConsumerContract = {
    abi: [
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "address",
                    name: "_whitelistAddress",
                    type: "address",
                },
                {
                    indexed: false,
                    internalType: "bool",
                    name: "_flag",
                    type: "bool",
                },
            ],
            name: "AddedIntoWhitelist",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "address",
                    name: "_marketAddress",
                    type: "address",
                },
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_id",
                    type: "bytes32",
                },
            ],
            name: "CancelSportsMarket",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "address",
                    name: "_marketAddress",
                    type: "address",
                },
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_id",
                    type: "bytes32",
                },
                {
                    components: [
                        {
                            internalType: "bytes32",
                            name: "gameId",
                            type: "bytes32",
                        },
                        {
                            internalType: "string",
                            name: "raceId",
                            type: "string",
                        },
                        {
                            internalType: "uint256",
                            name: "startTime",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "homeOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "awayOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "drawOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "string",
                            name: "homeTeam",
                            type: "string",
                        },
                        {
                            internalType: "string",
                            name: "awayTeam",
                            type: "string",
                        },
                        {
                            internalType: "uint256",
                            name: "betType",
                            type: "uint256",
                        },
                    ],
                    indexed: false,
                    internalType: "struct ApexConsumer.GameCreate",
                    name: "_game",
                    type: "tuple",
                },
                {
                    indexed: false,
                    internalType: "uint256[]",
                    name: "_tags",
                    type: "uint256[]",
                },
                {
                    indexed: false,
                    internalType: "uint256[]",
                    name: "_normalizedOdds",
                    type: "uint256[]",
                },
            ],
            name: "CreateSportsMarket",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_requestId",
                    type: "bytes32",
                },
                {
                    indexed: false,
                    internalType: "uint256",
                    name: "_sportId",
                    type: "uint256",
                },
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_id",
                    type: "bytes32",
                },
                {
                    components: [
                        {
                            internalType: "bytes32",
                            name: "gameId",
                            type: "bytes32",
                        },
                        {
                            internalType: "string",
                            name: "raceId",
                            type: "string",
                        },
                        {
                            internalType: "uint256",
                            name: "startTime",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "homeOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "awayOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "drawOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "string",
                            name: "homeTeam",
                            type: "string",
                        },
                        {
                            internalType: "string",
                            name: "awayTeam",
                            type: "string",
                        },
                        {
                            internalType: "uint256",
                            name: "betType",
                            type: "uint256",
                        },
                    ],
                    indexed: false,
                    internalType: "struct ApexConsumer.GameCreate",
                    name: "_game",
                    type: "tuple",
                },
                {
                    indexed: false,
                    internalType: "uint256[]",
                    name: "_normalizedOdds",
                    type: "uint256[]",
                },
            ],
            name: "GameCreated",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_requestId",
                    type: "bytes32",
                },
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_id",
                    type: "bytes32",
                },
                {
                    components: [
                        {
                            internalType: "bytes32",
                            name: "gameId",
                            type: "bytes32",
                        },
                        {
                            internalType: "uint256",
                            name: "homeOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "awayOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "drawOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "bool",
                            name: "arePostQualifyingOddsFetched",
                            type: "bool",
                        },
                    ],
                    indexed: false,
                    internalType: "struct ApexConsumer.GameOdds",
                    name: "_game",
                    type: "tuple",
                },
                {
                    indexed: false,
                    internalType: "uint256[]",
                    name: "_normalizedOdds",
                    type: "uint256[]",
                },
            ],
            name: "GameOddsAdded",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_requestId",
                    type: "bytes32",
                },
                {
                    indexed: false,
                    internalType: "uint256",
                    name: "_sportId",
                    type: "uint256",
                },
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_id",
                    type: "bytes32",
                },
                {
                    components: [
                        {
                            internalType: "bytes32",
                            name: "gameId",
                            type: "bytes32",
                        },
                        {
                            internalType: "uint8",
                            name: "homeScore",
                            type: "uint8",
                        },
                        {
                            internalType: "uint8",
                            name: "awayScore",
                            type: "uint8",
                        },
                        {
                            internalType: "uint8",
                            name: "statusId",
                            type: "uint8",
                        },
                    ],
                    indexed: false,
                    internalType: "struct ApexConsumer.GameResolve",
                    name: "_game",
                    type: "tuple",
                },
            ],
            name: "GameResolved",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "requestId",
                    type: "bytes32",
                },
                {
                    indexed: false,
                    internalType: "uint256",
                    name: "_sportId",
                    type: "uint256",
                },
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_id",
                    type: "bytes32",
                },
                {
                    components: [
                        {
                            internalType: "bytes32",
                            name: "gameId",
                            type: "bytes32",
                        },
                        {
                            internalType: "string",
                            name: "result",
                            type: "string",
                        },
                        {
                            internalType: "string",
                            name: "resultDetails",
                            type: "string",
                        },
                    ],
                    indexed: false,
                    internalType: "struct ApexConsumer.GameResults",
                    name: "_game",
                    type: "tuple",
                },
            ],
            name: "GameResultsSet",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_requestId",
                    type: "bytes32",
                },
                {
                    indexed: false,
                    internalType: "address",
                    name: "_marketAddress",
                    type: "address",
                },
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_id",
                    type: "bytes32",
                },
                {
                    components: [
                        {
                            internalType: "bytes32",
                            name: "gameId",
                            type: "bytes32",
                        },
                        {
                            internalType: "uint256",
                            name: "homeOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "awayOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "drawOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "bool",
                            name: "arePostQualifyingOddsFetched",
                            type: "bool",
                        },
                    ],
                    indexed: false,
                    internalType: "struct ApexConsumer.GameOdds",
                    name: "_game",
                    type: "tuple",
                },
            ],
            name: "InvalidOddsForMarket",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "address",
                    name: "_wrapperAddress",
                    type: "address",
                },
                {
                    indexed: false,
                    internalType: "address",
                    name: "_sportsManager",
                    type: "address",
                },
            ],
            name: "NewSportContracts",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "address",
                    name: "oldOwner",
                    type: "address",
                },
                {
                    indexed: false,
                    internalType: "address",
                    name: "newOwner",
                    type: "address",
                },
            ],
            name: "OwnerChanged",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "address",
                    name: "newOwner",
                    type: "address",
                },
            ],
            name: "OwnerNominated",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "bool",
                    name: "isPaused",
                    type: "bool",
                },
            ],
            name: "PauseChanged",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "address",
                    name: "_marketAddress",
                    type: "address",
                },
                {
                    indexed: false,
                    internalType: "bool",
                    name: "_pause",
                    type: "bool",
                },
            ],
            name: "PauseSportsMarket",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_requestId",
                    type: "bytes32",
                },
                {
                    indexed: false,
                    internalType: "uint256",
                    name: "_sportId",
                    type: "uint256",
                },
                {
                    indexed: false,
                    internalType: "string",
                    name: "_id",
                    type: "string",
                },
                {
                    components: [
                        {
                            internalType: "string",
                            name: "raceId",
                            type: "string",
                        },
                        {
                            internalType: "uint256",
                            name: "qualifyingStartTime",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "startTime",
                            type: "uint256",
                        },
                        {
                            internalType: "string",
                            name: "eventId",
                            type: "string",
                        },
                        {
                            internalType: "string",
                            name: "eventName",
                            type: "string",
                        },
                        {
                            internalType: "string",
                            name: "betType",
                            type: "string",
                        },
                    ],
                    indexed: false,
                    internalType: "struct ApexConsumer.RaceCreate",
                    name: "_race",
                    type: "tuple",
                },
            ],
            name: "RaceCreated",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "address",
                    name: "_marketAddress",
                    type: "address",
                },
                {
                    indexed: false,
                    internalType: "bytes32",
                    name: "_id",
                    type: "bytes32",
                },
                {
                    indexed: false,
                    internalType: "uint256",
                    name: "_outcome",
                    type: "uint256",
                },
            ],
            name: "ResolveSportsMarket",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "string",
                    name: "_sport",
                    type: "string",
                },
                {
                    indexed: false,
                    internalType: "bool",
                    name: "_isSupported",
                    type: "bool",
                },
            ],
            name: "SupportedSportsChanged",
            type: "event",
        },
        {
            inputs: [],
            name: "AWAY_WIN",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "BET_TYPE_H2H",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "BET_TYPE_TOP10",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "BET_TYPE_TOP3",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "BET_TYPE_TOP5",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "CANCELLED",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "HOME_WIN",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "MIN_TAG_NUMBER",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "NUMBER_OF_POSITIONS",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "STATUS_CANCELLED",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "STATUS_RESOLVED",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "acceptOwnership",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_whitelistAddress",
                    type: "address",
                },
                {
                    internalType: "bool",
                    name: "_flag",
                    type: "bool",
                },
            ],
            name: "addToWhitelist",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_market",
                    type: "address",
                },
            ],
            name: "cancelMarketManually",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_gameId",
                    type: "bytes32",
                },
            ],
            name: "createMarketForGame",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_requestId",
                    type: "bytes32",
                },
                {
                    internalType: "string",
                    name: "_betTypeDetail1",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "_betTypeDetail2",
                    type: "string",
                },
                {
                    internalType: "uint256",
                    name: "_probA",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "_probB",
                    type: "uint256",
                },
                {
                    internalType: "bytes32",
                    name: "_gameId",
                    type: "bytes32",
                },
                {
                    internalType: "string",
                    name: "_sport",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "_eventId",
                    type: "string",
                },
                {
                    internalType: "bool",
                    name: "_arePostQualifyingOdds",
                    type: "bool",
                },
                {
                    internalType: "uint256",
                    name: "_betType",
                    type: "uint256",
                },
            ],
            name: "fulfillMatchup",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_requestId",
                    type: "bytes32",
                },
                {
                    internalType: "string",
                    name: "_eventId",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "_betType",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "_eventName",
                    type: "string",
                },
                {
                    internalType: "uint256",
                    name: "_qualifyingStartTime",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "_raceStartTime",
                    type: "uint256",
                },
                {
                    internalType: "string",
                    name: "_sport",
                    type: "string",
                },
            ],
            name: "fulfillMetaData",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_requestId",
                    type: "bytes32",
                },
                {
                    internalType: "string",
                    name: "_result",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "_resultDetails",
                    type: "string",
                },
                {
                    internalType: "bytes32",
                    name: "_gameId",
                    type: "bytes32",
                },
                {
                    internalType: "string",
                    name: "_sport",
                    type: "string",
                },
            ],
            name: "fulfillResults",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "",
                    type: "bytes32",
                },
            ],
            name: "gameCreated",
            outputs: [
                {
                    internalType: "bytes32",
                    name: "gameId",
                    type: "bytes32",
                },
                {
                    internalType: "string",
                    name: "raceId",
                    type: "string",
                },
                {
                    internalType: "uint256",
                    name: "startTime",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "homeOdds",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "awayOdds",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "drawOdds",
                    type: "uint256",
                },
                {
                    internalType: "string",
                    name: "homeTeam",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "awayTeam",
                    type: "string",
                },
                {
                    internalType: "uint256",
                    name: "betType",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "",
                    type: "bytes32",
                },
            ],
            name: "gameFulfilledCreated",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "",
                    type: "bytes32",
                },
            ],
            name: "gameFulfilledResolved",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "",
                    type: "address",
                },
            ],
            name: "gameIdPerMarket",
            outputs: [
                {
                    internalType: "bytes32",
                    name: "",
                    type: "bytes32",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "",
                    type: "bytes32",
                },
            ],
            name: "gameOdds",
            outputs: [
                {
                    internalType: "bytes32",
                    name: "gameId",
                    type: "bytes32",
                },
                {
                    internalType: "uint256",
                    name: "homeOdds",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "awayOdds",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "drawOdds",
                    type: "uint256",
                },
                {
                    internalType: "bool",
                    name: "arePostQualifyingOddsFetched",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "",
                    type: "bytes32",
                },
            ],
            name: "gameResolved",
            outputs: [
                {
                    internalType: "bytes32",
                    name: "gameId",
                    type: "bytes32",
                },
                {
                    internalType: "uint8",
                    name: "homeScore",
                    type: "uint8",
                },
                {
                    internalType: "uint8",
                    name: "awayScore",
                    type: "uint8",
                },
                {
                    internalType: "uint8",
                    name: "statusId",
                    type: "uint8",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "",
                    type: "bytes32",
                },
            ],
            name: "gameResults",
            outputs: [
                {
                    internalType: "bytes32",
                    name: "gameId",
                    type: "bytes32",
                },
                {
                    internalType: "string",
                    name: "result",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "resultDetails",
                    type: "string",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_gameId",
                    type: "bytes32",
                },
            ],
            name: "getGameCreatedById",
            outputs: [
                {
                    components: [
                        {
                            internalType: "bytes32",
                            name: "gameId",
                            type: "bytes32",
                        },
                        {
                            internalType: "string",
                            name: "raceId",
                            type: "string",
                        },
                        {
                            internalType: "uint256",
                            name: "startTime",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "homeOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "awayOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "drawOdds",
                            type: "uint256",
                        },
                        {
                            internalType: "string",
                            name: "homeTeam",
                            type: "string",
                        },
                        {
                            internalType: "string",
                            name: "awayTeam",
                            type: "string",
                        },
                        {
                            internalType: "uint256",
                            name: "betType",
                            type: "uint256",
                        },
                    ],
                    internalType: "struct ApexConsumer.GameCreate",
                    name: "",
                    type: "tuple",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_gameId",
                    type: "bytes32",
                },
            ],
            name: "getGameResolvedById",
            outputs: [
                {
                    components: [
                        {
                            internalType: "bytes32",
                            name: "gameId",
                            type: "bytes32",
                        },
                        {
                            internalType: "uint8",
                            name: "homeScore",
                            type: "uint8",
                        },
                        {
                            internalType: "uint8",
                            name: "awayScore",
                            type: "uint8",
                        },
                        {
                            internalType: "uint8",
                            name: "statusId",
                            type: "uint8",
                        },
                    ],
                    internalType: "struct ApexConsumer.GameResolve",
                    name: "",
                    type: "tuple",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_gameId",
                    type: "bytes32",
                },
            ],
            name: "getNormalizedOdds",
            outputs: [
                {
                    internalType: "uint256[]",
                    name: "",
                    type: "uint256[]",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_gameId",
                    type: "bytes32",
                },
            ],
            name: "getOddsForGame",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_owner",
                    type: "address",
                },
                {
                    internalType: "string[]",
                    name: "_supportedSports",
                    type: "string[]",
                },
                {
                    internalType: "address",
                    name: "_sportsManager",
                    type: "address",
                },
            ],
            name: "initialize",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "",
                    type: "address",
                },
            ],
            name: "invalidOdds",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_gameId",
                    type: "bytes32",
                },
            ],
            name: "isApexGame",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_gameId",
                    type: "bytes32",
                },
            ],
            name: "isGameInResolvedStatus",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_gameId",
                    type: "bytes32",
                },
            ],
            name: "isGamePausedByNonExistingPostQualifyingOdds",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_gameId",
                    type: "bytes32",
                },
            ],
            name: "isGameResolvedOrCanceled",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "",
                    type: "address",
                },
            ],
            name: "isPausedByCanceledStatus",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "string",
                    name: "_sport",
                    type: "string",
                },
            ],
            name: "isSupportedSport",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "lastPauseTime",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "string",
                    name: "",
                    type: "string",
                },
            ],
            name: "latestRaceIdPerSport",
            outputs: [
                {
                    internalType: "string",
                    name: "",
                    type: "string",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "",
                    type: "address",
                },
            ],
            name: "marketCanceled",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "",
                    type: "address",
                },
            ],
            name: "marketCreated",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "",
                    type: "bytes32",
                },
            ],
            name: "marketPerGameId",
            outputs: [
                {
                    internalType: "address",
                    name: "",
                    type: "address",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "",
                    type: "address",
                },
            ],
            name: "marketResolved",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_owner",
                    type: "address",
                },
            ],
            name: "nominateNewOwner",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [],
            name: "nominatedOwner",
            outputs: [
                {
                    internalType: "address",
                    name: "",
                    type: "address",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "owner",
            outputs: [
                {
                    internalType: "address",
                    name: "",
                    type: "address",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "paused",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "string",
                    name: "",
                    type: "string",
                },
            ],
            name: "raceCreated",
            outputs: [
                {
                    internalType: "string",
                    name: "raceId",
                    type: "string",
                },
                {
                    internalType: "uint256",
                    name: "qualifyingStartTime",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "startTime",
                    type: "uint256",
                },
                {
                    internalType: "string",
                    name: "eventId",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "eventName",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "betType",
                    type: "string",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "string",
                    name: "",
                    type: "string",
                },
            ],
            name: "raceFulfilledCreated",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "_gameId",
                    type: "bytes32",
                },
            ],
            name: "resolveMarketForGame",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_market",
                    type: "address",
                },
                {
                    internalType: "uint256",
                    name: "_outcome",
                    type: "uint256",
                },
                {
                    internalType: "uint8",
                    name: "_homeScore",
                    type: "uint8",
                },
                {
                    internalType: "uint8",
                    name: "_awayScore",
                    type: "uint8",
                },
            ],
            name: "resolveMarketManually",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_owner",
                    type: "address",
                },
            ],
            name: "setOwner",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bool",
                    name: "_paused",
                    type: "bool",
                },
            ],
            name: "setPaused",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_wrapperAddress",
                    type: "address",
                },
                {
                    internalType: "address",
                    name: "_sportsManager",
                    type: "address",
                },
            ],
            name: "setSportContracts",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "string",
                    name: "sport",
                    type: "string",
                },
                {
                    internalType: "bool",
                    name: "_isSupported",
                    type: "bool",
                },
            ],
            name: "setSupportedSport",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "bytes32",
                    name: "",
                    type: "bytes32",
                },
            ],
            name: "sportsIdPerGame",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "sportsManager",
            outputs: [
                {
                    internalType: "contract ISportPositionalMarketManager",
                    name: "",
                    type: "address",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "string",
                    name: "",
                    type: "string",
                },
            ],
            name: "supportedSport",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "string",
                    name: "",
                    type: "string",
                },
            ],
            name: "supportedSportId",
            outputs: [
                {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "proxyAddress",
                    type: "address",
                },
            ],
            name: "transferOwnershipAtInit",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "",
                    type: "address",
                },
            ],
            name: "whitelistedAddresses",
            outputs: [
                {
                    internalType: "bool",
                    name: "",
                    type: "bool",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "wrapperAddress",
            outputs: [
                {
                    internalType: "address",
                    name: "",
                    type: "address",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
    ],
};

module.exports = {
    apexConsumerContract,
};
