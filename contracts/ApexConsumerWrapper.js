const apexConsumerWrapperContract = {
    abi: [
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_link",
                    type: "address",
                },
                {
                    internalType: "address",
                    name: "_oracle",
                    type: "address",
                },
                {
                    internalType: "address",
                    name: "_consumer",
                    type: "address",
                },
                {
                    internalType: "uint256",
                    name: "_paymentMetadata",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "_paymentMatchup",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "_paymentResults",
                    type: "uint256",
                },
                {
                    internalType: "string",
                    name: "_requestMetadataJobId",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "_requestMatchupJobId",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "_requestResultsJobId",
                    type: "string",
                },
                {
                    internalType: "string[]",
                    name: "_supportedBetTypes",
                    type: "string[]",
                },
            ],
            stateMutability: "nonpayable",
            type: "constructor",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "string",
                    name: "_betType",
                    type: "string",
                },
                {
                    indexed: false,
                    internalType: "bool",
                    name: "_isSupported",
                    type: "bool",
                },
            ],
            name: "BetTypesChanged",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: "bytes32",
                    name: "id",
                    type: "bytes32",
                },
            ],
            name: "ChainlinkCancelled",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: "bytes32",
                    name: "id",
                    type: "bytes32",
                },
            ],
            name: "ChainlinkFulfilled",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: "bytes32",
                    name: "id",
                    type: "bytes32",
                },
            ],
            name: "ChainlinkRequested",
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
            name: "NewConsumer",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "address",
                    name: "_link",
                    type: "address",
                },
            ],
            name: "NewLinkAddress",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "address",
                    name: "_oracle",
                    type: "address",
                },
            ],
            name: "NewOracleAddress",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "uint256",
                    name: "_paymentMetadata",
                    type: "uint256",
                },
                {
                    indexed: false,
                    internalType: "uint256",
                    name: "_paymentMatchup",
                    type: "uint256",
                },
                {
                    indexed: false,
                    internalType: "uint256",
                    name: "_paymentResults",
                    type: "uint256",
                },
            ],
            name: "NewPaymentAmounts",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "string",
                    name: "_requestMetadataJobId",
                    type: "string",
                },
                {
                    indexed: false,
                    internalType: "string",
                    name: "_requestMatchupJobId",
                    type: "string",
                },
                {
                    indexed: false,
                    internalType: "string",
                    name: "_requestResultsJobId",
                    type: "string",
                },
            ],
            name: "NewRequestsJobIds",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: "address",
                    name: "previousOwner",
                    type: "address",
                },
                {
                    indexed: true,
                    internalType: "address",
                    name: "newOwner",
                    type: "address",
                },
            ],
            name: "OwnershipTransferred",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "address",
                    name: "account",
                    type: "address",
                },
            ],
            name: "Paused",
            type: "event",
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: "address",
                    name: "account",
                    type: "address",
                },
            ],
            name: "Unpaused",
            type: "event",
        },
        {
            inputs: [],
            name: "H2H_BET_TYPE",
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
            inputs: [],
            name: "H2H_GAME_ID_INFIX",
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
                    internalType: "string",
                    name: "",
                    type: "string",
                },
            ],
            name: "betTypeIdPerBetType",
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
            name: "betTypePerRequestId",
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
            inputs: [],
            name: "consumer",
            outputs: [
                {
                    internalType: "contract IApexConsumer",
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
                    internalType: "bytes32",
                    name: "",
                    type: "bytes32",
                },
            ],
            name: "eventIdPerRequestId",
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
            name: "gameIdPerRequestId",
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
            inputs: [],
            name: "getOracleAddress",
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
            name: "getTokenAddress",
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
            name: "linkToken",
            outputs: [
                {
                    internalType: "contract IERC20",
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
            inputs: [],
            name: "paymentMatchup",
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
            name: "paymentMetadata",
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
            name: "paymentResults",
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
            name: "qualifyingStatusPerRequestId",
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
            inputs: [],
            name: "renounceOwnership",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
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
                    name: "_gameNumber",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "_qualifyingStatus",
                    type: "string",
                },
            ],
            name: "requestMatchup",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [],
            name: "requestMatchupJobId",
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
                    internalType: "string",
                    name: "_sport",
                    type: "string",
                },
            ],
            name: "requestMetaData",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [],
            name: "requestMetadataJobId",
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
                    name: "_gameNumber",
                    type: "string",
                },
            ],
            name: "requestResults",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [],
            name: "requestResultsJobId",
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
                    name: "_consumer",
                    type: "address",
                },
            ],
            name: "setConsumer",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_link",
                    type: "address",
                },
            ],
            name: "setLink",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_oracle",
                    type: "address",
                },
            ],
            name: "setOracle",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "uint256",
                    name: "_paymentMetadata",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "_paymentMatchup",
                    type: "uint256",
                },
                {
                    internalType: "uint256",
                    name: "_paymentResults",
                    type: "uint256",
                },
            ],
            name: "setPaymentAmounts",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "string",
                    name: "_requestMetadataJobId",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "_requestMatchupJobId",
                    type: "string",
                },
                {
                    internalType: "string",
                    name: "_requestResultsJobId",
                    type: "string",
                },
            ],
            name: "setRequestsJobIds",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "string",
                    name: "_betType",
                    type: "string",
                },
                {
                    internalType: "bool",
                    name: "_isSupported",
                    type: "bool",
                },
            ],
            name: "setSupportedBetType",
            outputs: [],
            stateMutability: "nonpayable",
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
            name: "sportPerEventId",
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
                    internalType: "bytes32",
                    name: "",
                    type: "bytes32",
                },
            ],
            name: "sportPerRequestId",
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
                    internalType: "string",
                    name: "",
                    type: "string",
                },
            ],
            name: "supportedBetType",
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
                    name: "newOwner",
                    type: "address",
                },
            ],
            name: "transferOwnership",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
    ],
};

module.exports = {
    apexConsumerWrapperContract,
};
