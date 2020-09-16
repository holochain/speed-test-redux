/// NB: The tryorama config patterns are still not quite stabilized.
/// See the tryorama README [https://github.com/holochain/tryorama]
/// for a potentially more accurate example

const path = require('path')

const { Orchestrator, Config, combine, singleConductor, localOnly, tapeExecutor } = require('@holochain/tryorama')

var transport_config = {
  type: 'sim2h',
  sim2h_url: "ws://localhost:9002"
}

process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.error('got unhandledRejection:', error);
});


const dnaPath = path.join(__dirname, "../dist/speed-test-redux.dna.json")
const dna = Config.dna(dnaPath, 'speed-test-redux')
console.log(Config.logger(false))
const config = Config.gen(
  {
    app: dna
  },
  // global configuration info
  {
    ... Config.logger(false),
    network: transport_config
  }
)

// default middleware is local and tape
const orchestrator = new Orchestrator()
const MAX_ATTEMPTS = 100

const speed_test = async (s, t, num) => {
  console.log(`Running speed test with ${num} iterations`)

  const {alice, bob} = await s.players({alice: config, bob: config}, true)

  console.time(`Consistency in for ${num} calls`)
  for (var i = 0; i < num; i++) {
    // call the zome function that makes the anchors
    const alice_result = await alice.call("app", "main", "anchor", {
      anchor_type: "alice", anchor_text: `${i}`
    })
    t.true(alice_result.Ok)
    const bob_result = await bob.call("app", "main", "anchor", {
      anchor_type: "bobbo", anchor_text: `${i}`
    })
    t.true(bob_result.Ok)
  }

  var alice_done = false;
  var bobbo_done = false;
  var alice_attempts = 0;
  var bobbo_attempts = 0;
  while(1) {
    if (!bobbo_done) {
      bobbo_attempts += 1;
      const result = await alice.call("app", "main", "list_anchor_addresses", {anchor_type: "bobbo"})
      t.true(result.Ok)
      bobbo_done = result.Ok.length == num
    }

    if (!alice_done) {
      alice_attempts += 1;
      const result = await bob.call("app", "main", "list_anchor_addresses", {anchor_type: "alice"})
      t.true(result.Ok)
      alice_done = result.Ok.length == num
    }

    if (alice_done && bobbo_done) {
      console.timeEnd(`Consistency in for ${num} calls`)
      console.log(
`     Alice took ${alice_attempts} attempts to reach consistency
      Bobbo took ${bobbo_attempts} attempts to reach consistency`);
      break;
    }
  }
}

orchestrator.registerScenario("speed test 1", async (s, t) => {
  await speed_test(s, t, 1)
})

orchestrator.registerScenario("speed test 10", async (s, t) => {
  await speed_test(s, t, 10)
})

orchestrator.registerScenario("speed test 100", async (s, t) => {
  await speed_test(s, t, 100)
})

orchestrator.registerScenario("speed test 1000", async (s, t) => {
  await speed_test(s, t, 1000)
})

orchestrator.registerScenario("speed test 2000", async (s, t) => {
  await speed_test(s, t, 2000)
})

orchestrator.run()
