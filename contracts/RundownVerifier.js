const rundownVerifier = {
  abi: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "_sportId",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256[]",
          name: "_ids",
          type: "uint256[]",
        },
      ],
      name: "NewBookmakerIdsBySportId",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "_consumer",
          type: "address",
        },
      ],
      name: "NewConsumerAddress",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "_sportId",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "_oddsThresholdForSport",
          type: "uint256",
        },
      ],
      name: "NewCustomOddsThresholdForSport",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256[]",
          name: "_ids",
          type: "uint256[]",
        },
      ],
      name: "NewDefaultBookmakerIds",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint256",
          name: "_defaultOddsThreshold",
          type: "uint256",
        },
      ],
      name: "NewDefaultOddsThreshold",
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
          internalType: "bytes32",
          name: "_invalidName",
          type: "bytes32",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "_isInvalid",
          type: "bool",
        },
      ],
      name: "SetInvalidName",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "bytes32",
          name: "_supportedMarketType",
          type: "bytes32",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "_isSupported",
          type: "bool",
        },
      ],
      name: "SetSupportedMarketType",
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
      name: "RESULT_DRAW",
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
          internalType: "uint256",
          name: "_sportId",
          type: "uint256",
        },
        {
          internalType: "uint256[]",
          name: "_currentOddsArray",
          type: "uint256[]",
        },
        {
          internalType: "uint256[]",
          name: "_newOddsArray",
          type: "uint256[]",
        },
        {
          internalType: "bool",
          name: "_isTwoPositionalSport",
          type: "bool",
        },
      ],
      name: "areOddsArrayInThreshold",
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
          internalType: "uint256",
          name: "_sportId",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_currentOdds",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_newOdds",
          type: "uint256",
        },
      ],
      name: "areOddsInThreshold",
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
          internalType: "bool",
          name: "_isTwoPositionalSport",
          type: "bool",
        },
        {
          internalType: "int24",
          name: "_homeOdds",
          type: "int24",
        },
        {
          internalType: "int24",
          name: "_awayOdds",
          type: "int24",
        },
        {
          internalType: "int24",
          name: "_drawOdds",
          type: "int24",
        },
      ],
      name: "areOddsValid",
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
          name: "_teamA",
          type: "string",
        },
        {
          internalType: "string",
          name: "_teamB",
          type: "string",
        },
      ],
      name: "areTeamsEqual",
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
          internalType: "int256[]",
          name: "_americanOdds",
          type: "int256[]",
        },
      ],
      name: "calculateAndNormalizeOdds",
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
      inputs: [],
      name: "consumer",
      outputs: [
        {
          internalType: "contract ITherundownConsumer",
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
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "defaultBookmakerIds",
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
      name: "defaultOddsThreshold",
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
          internalType: "uint256",
          name: "_sportId",
          type: "uint256",
        },
      ],
      name: "getBookmakerIdsBySportId",
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
          internalType: "bytes32[]",
          name: "_gameIds",
          type: "bytes32[]",
        },
      ],
      name: "getOddsForGames",
      outputs: [
        {
          internalType: "int24[]",
          name: "odds",
          type: "int24[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32[]",
          name: "_ids",
          type: "bytes32[]",
        },
      ],
      name: "getStringIDsFromBytesArrayIDs",
      outputs: [
        {
          internalType: "string[]",
          name: "_gameIds",
          type: "string[]",
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
          internalType: "address",
          name: "_consumer",
          type: "address",
        },
        {
          internalType: "string[]",
          name: "_invalidNames",
          type: "string[]",
        },
        {
          internalType: "string[]",
          name: "_supportedMarketTypes",
          type: "string[]",
        },
        {
          internalType: "uint256",
          name: "_defaultOddsThreshold",
          type: "uint256",
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
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      name: "invalidName",
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
          name: "_teamA",
          type: "string",
        },
        {
          internalType: "string",
          name: "_teamB",
          type: "string",
        },
      ],
      name: "isInvalidNames",
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
          name: "_market",
          type: "string",
        },
      ],
      name: "isSupportedMarketType",
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
          internalType: "bool",
          name: "_isTwoPositionalSport",
          type: "bool",
        },
        {
          internalType: "uint256",
          name: "_outcome",
          type: "uint256",
        },
      ],
      name: "isValidOutcomeForGame",
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
          internalType: "uint256",
          name: "_outcome",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_homeScore",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_awayScore",
          type: "uint256",
        },
      ],
      name: "isValidOutcomeWithResult",
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
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "oddsThresholdForSport",
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
          internalType: "uint256",
          name: "_sportId",
          type: "uint256",
        },
        {
          internalType: "uint256[]",
          name: "_bookmakerIds",
          type: "uint256[]",
        },
      ],
      name: "setBookmakerIdsBySportId",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_consumer",
          type: "address",
        },
      ],
      name: "setConsumerAddress",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_sportId",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_oddsThresholdForSport",
          type: "uint256",
        },
      ],
      name: "setCustomOddsThresholdForSport",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256[]",
          name: "_defaultBookmakerIds",
          type: "uint256[]",
        },
      ],
      name: "setDefaultBookmakerIds",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_defaultOddsThreshold",
          type: "uint256",
        },
      ],
      name: "setDefaultOddsThreshold",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "string[]",
          name: "_invalidNames",
          type: "string[]",
        },
        {
          internalType: "bool",
          name: "_isInvalid",
          type: "bool",
        },
      ],
      name: "setInvalidNames",
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
          internalType: "string[]",
          name: "_supportedMarketTypes",
          type: "string[]",
        },
        {
          internalType: "bool",
          name: "_isSupported",
          type: "bool",
        },
      ],
      name: "setSupportedMarketTypes",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
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
      name: "sportIdToBookmakerIds",
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
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      name: "supportedMarketType",
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
          name: "proxyAddress",
          type: "address",
        },
      ],
      name: "transferOwnershipAtInit",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ],
};

module.exports = {
  rundownVerifier,
};
