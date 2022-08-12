# overtimemarkets-bot

Important files:

1. `createGamesAndMarkets.js` - bot which calls CL for fetching games and putting them in a queue, and also the part which creates markets for fetched games.
2. `resolveGamesAndMarkets.js` - bot which calls CL for resolving markets and also part for resolving games based on fetched data.
3. `pullOdds.js` - bot which calls CL for fetching odds for games that are in an unprocessed state.

NOTE: PLEASE CHECK ABI FILES TO BE UP TO DATE!

Thales overtimemarkets bot will make create/resolve and pull odds for games.

```
Example setup using docker-compose:
version: "3.8"
services:
  redis:
    restart: always
    image: "redis:alpine"
    container_name: redis
    volumes:
      - redis-data:/data
    entrypoint: redis-server --appendonly yes
    ports:
      - 6379:6379
  overtimemarkets-bot:
    restart: always
    image: thalesmarket/overtimemarkets-bot
    environment:
      - "PRIVATE_KEY=''"
      - "WALLET=''"
      - "INFURA=16f15a8ff9f54b2394086bda0b237611"
      - "INFURA_URL=https://optimism-mainnet.infura.io/v3/16f15a8ff9f54b2394086bda0b237611"
      - "NETWORK=optimism"
      - "NETWORK_ID=10"
      - "REQUEST_KEY=''"
      - "BASE_URL=https://api.0x.org/sra/v4/"
      - "RUNDOWN_BASE_URL=https://therundown-therundown-v1.p.rapidapi.com"
      - "WRAPPER_CONTRACT=0x1687fDC8A409Be442e2dD3DE42b1fcC974Ac9eE8"
      - "GAME_QUEUE_CONTRACT=0x5417c847b6ce4163C43116E8D9670395Ba08B503"
      - "CONSUMER_CONTRACT=0x2B91c14Ce9aa828eD124D12541452a017d8a2148"
      - "LINK_CONTRACT=0x350a791bfc2c21f9ed5d10980dad2e2638ffa7f6"
      - "LINK_AMOUNT=0.3"
      - "MILISECONDS=1000"
      - "CREATION_DAYS_INFRONT=7"
      - "JOB_ID_CREATION=5cc84835a9964b2da72787789950807e"
      - "MARKET_CREATION=create"
      - "SPORT_IDS=3,10,11,12,13,14,15"
      - "MARKET_RESOLVE=resolve"
      - "JOB_ID_RESOLVE=5cc84835a9964b2da72787789950807e"
      - "EXPECTED_GAME_MLB=10800"
      - "EXPECTED_GAME_FOOTBAL=7200"
      - "EXPECTED_GAME_UFC=18000"
      - "JOB_ID_ODDS=d4f5cebf842d4063a9743ad32e694c4f"
      - "ODDS_PERCENRAGE_CHANGE=2"
      - "CREATION_FREQUENCY=43200000"
      - "RESOLVE_FREQUENCY=900000"
      - "ODDS_FREQUENCY=600000"
      - "CREATE_BATCH=10"
      - "RESOLVE_BATCH=10"
      - "RESOLVE_STATUSES=STATUS_FINAL,STATUS_FULL_TIME"
      - "CANCEL_STATUSES=STATUS_CANCELED,STATUS_POSTPONED,STATUS_ABANDONED"
      - "ODDS_PERCENTAGE_CHANGE_MLB=1"
      - "ODDS_PERCENTAGE_CHANGE_MLS=1"
      - "ODDS_PERCENTAGE_CHANGE_DEFAULT=2"
      - "ODDS_PERCENTAGE_CHANGE_UFC=2"
      - "BOT_OVERTIME_ODDS=''"
      - "BOT_OVERTIME_CREATOR=''"
      - "BOT_OVERTIME_RESOLVER=''"
      - "LINK_THRESHOLD=5000000000000000000"

volumes:
  redis-data:

```

# Create/ Resolve / Pull odds

- Add .env file with following variables set:

```
  ---------------------------
  PRIVATE_KEY=GetItFromMetamask
  WALLET=your wallet address
  INFURA=27301cd3b3134269bfb2271a79a5beae
  INFURA_URL=https://optimism-mainnet.infura.io/v3/27301cd3b3134269bfb2271a79a5beae
  NETWORK=kovan
  NETWORK_ID=42
  REQUEST_KEY=from rundown api
  RUNDOWN_BASE_URL=https://therundown-therundown-v1.p.rapidapi.com


  ### GLOBAL SPORT ENV PROPS ###
  MILISECONDS=1000
  WRAPPER_CONTRACT=0xE14E3427290571f9492fE2602cD0726d34b01D0c
  GAME_QUEUE_CONTRACT=0x823B2369f5CA3cf54D802665073F2AA238EEA941
  CONSUMER_CONTRACT=0x594FD9E527418Bde7F265aE7D422607C64ad1A8a
  LINK_CONTRACT=0xa36085f69e2889c224210f603d836748e7dc0088
  LINK_THRESHOLD=5000000000000000000

  ### SPORT MARKET CEATION PROPS ###
  CREATION_DAYS_INFRONT=7
  JOB_ID_CREATION=5c4b2ebb686b4cb58968ae0a7b5782f6
  MARKET_CREATION=create
  SPORT_IDS=4,10
  CREATION_FREQUENCY=86400000
  CREATE_BATCH=10
  BOT_OVERTIME_CREATOR=ID

  ### RESOLVE MARKET CEATION PROPS ###

  MARKET_RESOLVE=resolve
  JOB_ID_RESOLVE=5c4b2ebb686b4cb58968ae0a7b5782f6
  EXPECTED_GAME_MLB=10800
  EXPECTED_GAME_FOOTBAL=7200
  EXPECTED_GAME_NFL=12600
  EXPECTED_GAME_UFC=12600
  RESOLVE_FREQUENCY=900000
  RESOLVE_BATCH=10
  RESOLVE_STATUSES=STATUS_FINAL,STATUS_FULL_TIME
  CANCEL_STATUSES=STATUS_CANCELED,STATUS_POSTPONED
  BOT_OVERTIME_RESOLVER=ID

  ### GAME ODDS PROPS ###

  JOB_ID_ODDS=3b13b48340ac4226b3c2973295d869d7
  ODDS_PERCENTAGE_CHANGE_MLB=1
  ODDS_PERCENTAGE_CHANGE_MLS=1
  ODDS_PERCENTAGE_CHANGE_UFC=2
  ODDS_PERCENTAGE_CHANGE_DEFAULT=2
  ODDS_FREQUENCY=600000
  BOT_OVERTIME_ODDS=ID

---------------------------
```

** NOTE: this properties are set is for kovan network please check next variables for MAIN **

ALL CONTRACT ADDRESSES: WRAPPER_CONTRACT, GAME_QUEUE_CONTRACT, CONSUMER_CONTRACT, LINK_CONTRACT

LINK_AMOUNT, JOB_ID_CREATION, JOB_ID_RESOLVE, JOB_ID_ODDS

Check SPORT_IDS which we support

After testing it on kovan please check the following

- ODDS_PERCENTAGE_CHANGE_MLB
- ODDS_PERCENTAGE_CHANGE_MLS
- ODDS_PERCENTAGE_CHANGE_UFC
- EXPECTED_GAME_UFC
- EXPECTED_GAME_NFL
- ODDS_PERCENTAGE_CHANGE_DEFAULT
- EXPECTED_GAME_DURATIN
- ODDS_FREQUENCY
- RESOLVE_FREQUENCY
- CREATION_FREQUENCY
  etc.
