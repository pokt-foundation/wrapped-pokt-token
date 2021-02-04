// This buidler configuration is only used to compile ANT.sol and other mocks for testing,
// which were deployed on an older solc version (0.4.8)
module.exports = {
  solc: {
    version: "0.4.8",
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  paths: {
    sources: "./mocks/",
  }
}
