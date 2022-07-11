const gamesConsumerContract = {
    abi: [
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "address",
            "name": "_whitelistAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "_flag",
            "type": "bool"
          }
        ],
        "name": "AddedIntoWhitelist",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "address",
            "name": "_marketAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "bytes32",
            "name": "_id",
            "type": "bytes32"
          }
        ],
        "name": "CancelSportsMarket",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "address",
            "name": "_marketAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "bytes32",
            "name": "_id",
            "type": "bytes32"
          },
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "gameId",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
              },
              {
                "internalType": "int24",
                "name": "homeOdds",
                "type": "int24"
              },
              {
                "internalType": "int24",
                "name": "awayOdds",
                "type": "int24"
              },
              {
                "internalType": "int24",
                "name": "drawOdds",
                "type": "int24"
              },
              {
                "internalType": "string",
                "name": "homeTeam",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "awayTeam",
                "type": "string"
              }
            ],
            "indexed": false,
            "internalType": "struct TherundownConsumer.GameCreate",
            "name": "_game",
            "type": "tuple"
          },
          {
            "indexed": false,
            "internalType": "uint256[]",
            "name": "_tags",
            "type": "uint256[]"
          },
          {
            "indexed": false,
            "internalType": "uint256[]",
            "name": "_normalizedOdds",
            "type": "uint256[]"
          }
        ],
        "name": "CreateSportsMarket",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "bytes32",
            "name": "_requestId",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "_sportId",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "bytes32",
            "name": "_id",
            "type": "bytes32"
          },
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "gameId",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
              },
              {
                "internalType": "int24",
                "name": "homeOdds",
                "type": "int24"
              },
              {
                "internalType": "int24",
                "name": "awayOdds",
                "type": "int24"
              },
              {
                "internalType": "int24",
                "name": "drawOdds",
                "type": "int24"
              },
              {
                "internalType": "string",
                "name": "homeTeam",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "awayTeam",
                "type": "string"
              }
            ],
            "indexed": false,
            "internalType": "struct TherundownConsumer.GameCreate",
            "name": "_game",
            "type": "tuple"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "_queueIndex",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256[]",
            "name": "_normalizedOdds",
            "type": "uint256[]"
          }
        ],
        "name": "GameCreated",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "bytes32",
            "name": "_requestId",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "internalType": "bytes32",
            "name": "_id",
            "type": "bytes32"
          },
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "gameId",
                "type": "bytes32"
              },
              {
                "internalType": "int24",
                "name": "homeOdds",
                "type": "int24"
              },
              {
                "internalType": "int24",
                "name": "awayOdds",
                "type": "int24"
              },
              {
                "internalType": "int24",
                "name": "drawOdds",
                "type": "int24"
              }
            ],
            "indexed": false,
            "internalType": "struct TherundownConsumer.GameOdds",
            "name": "_game",
            "type": "tuple"
          },
          {
            "indexed": false,
            "internalType": "uint256[]",
            "name": "_normalizedOdds",
            "type": "uint256[]"
          }
        ],
        "name": "GameOddsAdded",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "bytes32",
            "name": "_requestId",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "_sportId",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "bytes32",
            "name": "_id",
            "type": "bytes32"
          },
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "gameId",
                "type": "bytes32"
              },
              {
                "internalType": "uint8",
                "name": "homeScore",
                "type": "uint8"
              },
              {
                "internalType": "uint8",
                "name": "awayScore",
                "type": "uint8"
              },
              {
                "internalType": "uint8",
                "name": "statusId",
                "type": "uint8"
              }
            ],
            "indexed": false,
            "internalType": "struct TherundownConsumer.GameResolve",
            "name": "_game",
            "type": "tuple"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "_queueIndex",
            "type": "uint256"
          }
        ],
        "name": "GameResolved",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "bytes32",
            "name": "_requestId",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "internalType": "address",
            "name": "_marketAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "bytes32",
            "name": "_id",
            "type": "bytes32"
          },
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "gameId",
                "type": "bytes32"
              },
              {
                "internalType": "int24",
                "name": "homeOdds",
                "type": "int24"
              },
              {
                "internalType": "int24",
                "name": "awayOdds",
                "type": "int24"
              },
              {
                "internalType": "int24",
                "name": "drawOdds",
                "type": "int24"
              }
            ],
            "indexed": false,
            "internalType": "struct TherundownConsumer.GameOdds",
            "name": "_game",
            "type": "tuple"
          }
        ],
        "name": "InvalidOddsForMarket",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "contract GamesQueue",
            "name": "_queues",
            "type": "address"
          }
        ],
        "name": "NewQueueAddress",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "address",
            "name": "_sportsManager",
            "type": "address"
          }
        ],
        "name": "NewSportsMarketManager",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "address",
            "name": "_wrapperAddress",
            "type": "address"
          }
        ],
        "name": "NewWrapperAddress",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "address",
            "name": "oldOwner",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "OwnerChanged",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "OwnerNominated",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "bool",
            "name": "isPaused",
            "type": "bool"
          }
        ],
        "name": "PauseChanged",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "address",
            "name": "_marketAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "_pause",
            "type": "bool"
          }
        ],
        "name": "PauseSportsMarket",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "address",
            "name": "_marketAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "bytes32",
            "name": "_id",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "_outcome",
            "type": "uint256"
          }
        ],
        "name": "ResolveSportsMarket",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "_status",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "_isSupported",
            "type": "bool"
          }
        ],
        "name": "SupportedCancelStatusChanged",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "_status",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "_isSupported",
            "type": "bool"
          }
        ],
        "name": "SupportedResolvedStatusChanged",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "_sportId",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "_isSupported",
            "type": "bool"
          }
        ],
        "name": "SupportedSportsChanged",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "_sportId",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "_isTwoPosition",
            "type": "bool"
          }
        ],
        "name": "TwoPositionSportChanged",
        "type": "event"
      },
      {
        "inputs": [],
        "name": "AWAY_WIN",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "CANCELLED",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "HOME_WIN",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "MIN_TAG_NUMBER",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "RESULT_DRAW",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "acceptOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_whitelistAddress",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "_flag",
            "type": "bool"
          }
        ],
        "name": "addToWhitelist",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "int256",
            "name": "_americanOdd",
            "type": "int256"
          }
        ],
        "name": "calculateNormalizedOddFromAmerican",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "odd",
            "type": "uint256"
          }
        ],
        "stateMutability": "pure",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "cancelGameStatuses",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_market",
            "type": "address"
          }
        ],
        "name": "cancelMarketManually",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32[]",
            "name": "_gameIds",
            "type": "bytes32[]"
          }
        ],
        "name": "createAllMarketsForGames",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_gameId",
            "type": "bytes32"
          }
        ],
        "name": "createMarketForGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_requestId",
            "type": "bytes32"
          },
          {
            "internalType": "bytes[]",
            "name": "_games",
            "type": "bytes[]"
          },
          {
            "internalType": "uint256",
            "name": "_sportId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "_date",
            "type": "uint256"
          }
        ],
        "name": "fulfillGamesCreated",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_requestId",
            "type": "bytes32"
          },
          {
            "internalType": "bytes[]",
            "name": "_games",
            "type": "bytes[]"
          },
          {
            "internalType": "uint256",
            "name": "_date",
            "type": "uint256"
          }
        ],
        "name": "fulfillGamesOdds",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_requestId",
            "type": "bytes32"
          },
          {
            "internalType": "bytes[]",
            "name": "_games",
            "type": "bytes[]"
          },
          {
            "internalType": "uint256",
            "name": "_sportId",
            "type": "uint256"
          }
        ],
        "name": "fulfillGamesResolved",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "name": "gameCreated",
        "outputs": [
          {
            "internalType": "bytes32",
            "name": "gameId",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "int24",
            "name": "homeOdds",
            "type": "int24"
          },
          {
            "internalType": "int24",
            "name": "awayOdds",
            "type": "int24"
          },
          {
            "internalType": "int24",
            "name": "drawOdds",
            "type": "int24"
          },
          {
            "internalType": "string",
            "name": "homeTeam",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "awayTeam",
            "type": "string"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "name": "gameFulfilledCreated",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "name": "gameFulfilledResolved",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "gameIdPerMarket",
        "outputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "name": "gameOdds",
        "outputs": [
          {
            "internalType": "bytes32",
            "name": "gameId",
            "type": "bytes32"
          },
          {
            "internalType": "int24",
            "name": "homeOdds",
            "type": "int24"
          },
          {
            "internalType": "int24",
            "name": "awayOdds",
            "type": "int24"
          },
          {
            "internalType": "int24",
            "name": "drawOdds",
            "type": "int24"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "name": "gameResolved",
        "outputs": [
          {
            "internalType": "bytes32",
            "name": "gameId",
            "type": "bytes32"
          },
          {
            "internalType": "uint8",
            "name": "homeScore",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "awayScore",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "statusId",
            "type": "uint8"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "gamesPerDate",
        "outputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "gamesPerDatePerSport",
        "outputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_gameId",
            "type": "bytes32"
          }
        ],
        "name": "getGameCreatedById",
        "outputs": [
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "gameId",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
              },
              {
                "internalType": "int24",
                "name": "homeOdds",
                "type": "int24"
              },
              {
                "internalType": "int24",
                "name": "awayOdds",
                "type": "int24"
              },
              {
                "internalType": "int24",
                "name": "drawOdds",
                "type": "int24"
              },
              {
                "internalType": "string",
                "name": "homeTeam",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "awayTeam",
                "type": "string"
              }
            ],
            "internalType": "struct TherundownConsumer.GameCreate",
            "name": "",
            "type": "tuple"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_requestId",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "_idx",
            "type": "uint256"
          }
        ],
        "name": "getGameCreatedByRequestId",
        "outputs": [
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "gameId",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
              },
              {
                "internalType": "int24",
                "name": "homeOdds",
                "type": "int24"
              },
              {
                "internalType": "int24",
                "name": "awayOdds",
                "type": "int24"
              },
              {
                "internalType": "int24",
                "name": "drawOdds",
                "type": "int24"
              },
              {
                "internalType": "string",
                "name": "homeTeam",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "awayTeam",
                "type": "string"
              }
            ],
            "internalType": "struct TherundownConsumer.GameCreate",
            "name": "game",
            "type": "tuple"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_gameId",
            "type": "bytes32"
          }
        ],
        "name": "getGameResolvedById",
        "outputs": [
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "gameId",
                "type": "bytes32"
              },
              {
                "internalType": "uint8",
                "name": "homeScore",
                "type": "uint8"
              },
              {
                "internalType": "uint8",
                "name": "awayScore",
                "type": "uint8"
              },
              {
                "internalType": "uint8",
                "name": "statusId",
                "type": "uint8"
              }
            ],
            "internalType": "struct TherundownConsumer.GameResolve",
            "name": "",
            "type": "tuple"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_sportId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "_date",
            "type": "uint256"
          }
        ],
        "name": "getGamesPerDatePerSport",
        "outputs": [
          {
            "internalType": "bytes32[]",
            "name": "",
            "type": "bytes32[]"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_date",
            "type": "uint256"
          }
        ],
        "name": "getGamesPerdate",
        "outputs": [
          {
            "internalType": "bytes32[]",
            "name": "",
            "type": "bytes32[]"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_gameId",
            "type": "bytes32"
          }
        ],
        "name": "getNormalizedOdds",
        "outputs": [
          {
            "internalType": "uint256[]",
            "name": "",
            "type": "uint256[]"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_gameId",
            "type": "bytes32"
          }
        ],
        "name": "getOddsAwayTeam",
        "outputs": [
          {
            "internalType": "int24",
            "name": "",
            "type": "int24"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_gameId",
            "type": "bytes32"
          }
        ],
        "name": "getOddsDraw",
        "outputs": [
          {
            "internalType": "int24",
            "name": "",
            "type": "int24"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_gameId",
            "type": "bytes32"
          }
        ],
        "name": "getOddsHomeTeam",
        "outputs": [
          {
            "internalType": "int24",
            "name": "",
            "type": "int24"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_gameId",
            "type": "bytes32"
          }
        ],
        "name": "getResult",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "_result",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_owner",
            "type": "address"
          },
          {
            "internalType": "uint256[]",
            "name": "_supportedSportIds",
            "type": "uint256[]"
          },
          {
            "internalType": "address",
            "name": "_sportsManager",
            "type": "address"
          },
          {
            "internalType": "uint256[]",
            "name": "_twoPositionSports",
            "type": "uint256[]"
          },
          {
            "internalType": "contract GamesQueue",
            "name": "_queues",
            "type": "address"
          },
          {
            "internalType": "uint256[]",
            "name": "_resolvedStatuses",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "_cancelGameStatuses",
            "type": "uint256[]"
          }
        ],
        "name": "initialize",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "invalidOdds",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_gameId",
            "type": "bytes32"
          }
        ],
        "name": "isGameInResolvedStatus",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_gameId",
            "type": "bytes32"
          }
        ],
        "name": "isGameResolvedOrCanceled",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "_teamA",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "_teamB",
            "type": "string"
          }
        ],
        "name": "isSameTeamOrTBD",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "isSportOnADate",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_sportsId",
            "type": "uint256"
          }
        ],
        "name": "isSportTwoPositionsSport",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "_market",
            "type": "string"
          }
        ],
        "name": "isSupportedMarketType",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_sportId",
            "type": "uint256"
          }
        ],
        "name": "isSupportedSport",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "lastPauseTime",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "marketCanceled",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "marketCreated",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "name": "marketPerGameId",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "marketResolved",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_owner",
            "type": "address"
          }
        ],
        "name": "nominateNewOwner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "nominatedOwner",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "name": "oddsLastPulledForGame",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_market",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "_pause",
            "type": "bool"
          }
        ],
        "name": "pauseOrUnpauseMarketManually",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "paused",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "queues",
        "outputs": [
          {
            "internalType": "contract GamesQueue",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "removeFromCreatedQueue",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "removeFromResolvedQueue",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_index",
            "type": "uint256"
          }
        ],
        "name": "removeFromUnprocessedGamesArray",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "requestIdGamesCreated",
        "outputs": [
          {
            "internalType": "bytes",
            "name": "",
            "type": "bytes"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "requestIdGamesOdds",
        "outputs": [
          {
            "internalType": "bytes",
            "name": "",
            "type": "bytes"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "requestIdGamesResolved",
        "outputs": [
          {
            "internalType": "bytes",
            "name": "",
            "type": "bytes"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32[]",
            "name": "_gameIds",
            "type": "bytes32[]"
          }
        ],
        "name": "resolveAllMarketsForGames",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_gameId",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "_outcome",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "_homeScore",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "_awayScore",
            "type": "uint8"
          }
        ],
        "name": "resolveGameManually",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "_gameId",
            "type": "bytes32"
          }
        ],
        "name": "resolveMarketForGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_market",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "_outcome",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "_homeScore",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "_awayScore",
            "type": "uint8"
          }
        ],
        "name": "resolveMarketManually",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_owner",
            "type": "address"
          }
        ],
        "name": "setOwner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bool",
            "name": "_paused",
            "type": "bool"
          }
        ],
        "name": "setPaused",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "contract GamesQueue",
            "name": "_queues",
            "type": "address"
          }
        ],
        "name": "setQueueAddress",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_sportsManager",
            "type": "address"
          }
        ],
        "name": "setSportsManager",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_status",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "_isSupported",
            "type": "bool"
          }
        ],
        "name": "setSupportedCancelStatuses",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_status",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "_isSupported",
            "type": "bool"
          }
        ],
        "name": "setSupportedResolvedStatuses",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_sportId",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "_isSupported",
            "type": "bool"
          }
        ],
        "name": "setSupportedSport",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_sportId",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "_isTwoPosition",
            "type": "bool"
          }
        ],
        "name": "setTwoPositionSport",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_wrapperAddress",
            "type": "address"
          }
        ],
        "name": "setWrapperAddress",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "bytes32",
            "name": "",
            "type": "bytes32"
          }
        ],
        "name": "sportsIdPerGame",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "sportsManager",
        "outputs": [
          {
            "internalType": "contract ISportPositionalMarketManager",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "supportResolveGameStatuses",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "supportedSport",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "proxyAddress",
            "type": "address"
          }
        ],
        "name": "transferOwnershipAtInit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "twoPositionSport",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "whitelistedAddresses",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "wrapperAddress",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ],
  };
  
  module.exports = {
    gamesConsumerContract,
  };
  