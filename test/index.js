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

orchestrator.registerScenario("description of example test", async (s, t) => {

  const {alice, bob} = await s.players({alice: config, bob: config}, true)

  // Make a call to a Zome function
  // indicating the function, and passing it an input
  const addr = await alice.call("app", "main", "create_my_entry", {"entry" : {"content":"sample content"}})

  // Wait for all network activity to settle
  await s.consistency()

  const result = await bob.call("app", "main", "get_my_entry", {"address": addr.Ok})

  // check for equality of the actual and expected results
  t.deepEqual(result, { Ok: { App: [ 'my_entry', '{"content":"sample content"}' ] } })
})

orchestrator.run()
