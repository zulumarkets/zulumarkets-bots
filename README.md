# overtimemarkets-bot

Important files:

1. `createGamesAndMarkets.js` - bot which calls CL for fetching games and putting them in a queue, and also the part which creates markets for fetched games.
2. `resolveGamesAndMarkets.js` - bot which calls CL for resolving markets and also part for resolving games based on fetched data.
3. `pullOdds.js` - bot which calls CL for fetching odds for games that are in an unprocessed state.


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
      - "WRAPPER_CONTRACT=0xae4fB5Dc9b2371Ef994D09DB1b4F341CdED0b1d6"
      - "GAME_QUEUE_CONTRACT=0x952Af77e13e121A648Ff2aDe0b65779f45a1f496"
      - "CONSUMER_CONTRACT=0xd03f473caC24767134A86A298FeC38294986EcE6"
      - "LINK_AMOUNT=0.1"
      - "MILISECONDS=1000"
      - "ONE_HOUR_IN_SECONDS=3600"
      - "ONE_DAY_IN_MILISECONDS=86400000"
      - "CREATION_DAYS_INFRONT=7"
      - "JOB_ID_CREATION=5c4b2ebb686b4cb58968ae0a7b5782f6"
      - "MARKET_CREATION=create"
      - "SPORT_IDS=3,10"
      - "MARKET_RESOLVE=resolve"
      - "JOB_ID_RESOLVE=5c4b2ebb686b4cb58968ae0a7b5782f6"
      - "RESOLVE_STATUSES=1,2,8,11"
      - "EXPECTED_GAME_DURATIN=7200"
      - "JOB_ID_ODDS=3b13b48340ac4226b3c2973295d869d7"
      - "FASTER_PROCESSING_TIME=259200"
      - "SLOW_PROCCES_HOURS=1"
      - "FAST_PROCESS_HOURS=6"
      - "ODDS_PERCENRAGE_CHANGE=2"
volumes:
  redis-data:

```

# Create/ Resolve / Pull odds
 
- Add .env file with following variables set:

---------------------------------------------  
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
ONE_HOUR_IN_SECONDS=3600  
ONE_DAY_IN_MILISECONDS=86400000
WRAPPER_CONTRACT=0xae4fB5Dc9b2371Ef994D09DB1b4F341CdED0b1d6   
GAME_QUEUE_CONTRACT=0x952Af77e13e121A648Ff2aDe0b65779f45a1f496  
CONSUMER_CONTRACT=0xd03f473caC24767134A86A298FeC38294986EcE6  
LINK_CONTRACT=0xa36085f69e2889c224210f603d836748e7dc0088  

### SPORT MARKET CEATION PROPS ###  
CREATION_DAYS_INFRONT=7  
JOB_ID_CREATION=5c4b2ebb686b4cb58968ae0a7b5782f6  
MARKET_CREATION=create  
SPORT_IDS=4,10  

### RESOLVE MARKET CEATION PROPS ###  

MARKET_RESOLVE=resolve  
JOB_ID_RESOLVE=5c4b2ebb686b4cb58968ae0a7b5782f6  
RESOLVE_STATUSES=1,2,8,11  
EXPECTED_GAME_DURATIN=7200  

### GAME ODDS PROPS ###  

JOB_ID_ODDS=3b13b48340ac4226b3c2973295d869d7  
FASTER_PROCESSING_TIME=259200  
SLOW_PROCCES_HOURS=6  
FAST_PROCESS_HOURS=2  
ODDS_PERCENRAGE_CHANGE=1

---------------------------------------------  

*** NOTE: this is for kovan network please check next variables for MAIN**

LINK_AMOUNT, JOB_ID_CREATION, JOB_ID_RESOLVE, JOB_ID_ODDS  

Check SPORT_IDS, RESOLVE_STATUSES which we support  

After testing it on kovan please check the following   

  FASTER_PROCESSING_TIME - time in which bot starts to pull odds more offten  

  SLOW_PROCCES_HOURS - time between two odds pull for same game when time untill game is greather then (GAME_TIME - FASTER_PROCESSING_TIME)  

  FAST_PROCESS_HOURS - time between two odds pull for same game when time untill game is lower then GAME_TIME - FASTER_PROCESSING_TIME)  
