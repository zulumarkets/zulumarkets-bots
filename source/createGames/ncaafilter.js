let origResponse = require("./ncaaResponse.json");
let ncaaSupportedTeams = require("./ncaaSupportedTeams.json");
let filteredResponse = [];
origResponse.events.forEach((o) => {
   if(o.teams!=undefined) {
       if (
           ncaaSupportedTeams.includes(o.teams[0].name) &&
           ncaaSupportedTeams.includes(o.teams[1].name)
       ) {
           filteredResponse.push(o);
       }
   }
});
console.log(filteredResponse);
