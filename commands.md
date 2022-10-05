## Run scripts locally

### Rundown scripts

-   CREATE GAMES AND MARKETS: `node source/createGames/createGamesAndMarkets.js`
-   RESOLVE GAMES AND MARKETS: `node source/resolveGames/resolveGamesAndMarkets.js`
-   PULL ODDS: `node source/pullOdds/pullOdds.js`

### Apex scripts

-   CREATE RACE: `node .\source\apex\createRace.js formula1`

    -   Parameters:
        -   sport - possible values: "formula1", "motogp"

-   CREATE GAMES AND MARKETS: `node .\source\apex\createGamesAndMarketsUpdateOdds.js formula1 top3 pre`

    -   Parameters:
        -   sport - possible values: "formula1", "motogp"
        -   bet type - possible values: "outright_head_to_head", "top3", "top5", "top10" (top10 only for formula1)
        -   qualifying status - possible values: "pre", "post"
        -   update odds only (optional) - possible values: "updateOddsOnly"

-   RESOLVE GAMES AND MARKETS: `node .\source\apex\resolveGamesAndMarkets.js top3 formula1`
    -   Parameters:
        -   sport - possible values: "formula1", "motogp"
        -   bet type - possible values: "outright_head_to_head", "top3", "top5", "top10" (top10 only for formula1)

## DEPLOY

1. login to docker with command:
   `docker login -u XXXXXX`
2. build image locally with command:
   `docker build . -t XXXXXX`
3. push image to docker-hub with command:
   `docker push XXXXXX`
4. docker compose stop service:
   `docker-compose stop <name image, you will get it from docker-compose file>`
5. Docker compose pull with a command:
   `docker-compose pull <IMAGE_NAME>`
6. docker compose up:
   `docker-compose up -d <IMAGE_NAME>`
