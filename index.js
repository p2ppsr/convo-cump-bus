require('dotenv').config()
const busdriver = require('@cwi/busdriver')
const bus = require('./bus.js')

busdriver.drive({
  bus,
  driversLicense: process.env.PLANARIA_TOKEN,
  mongo: {
    url: process.env.MONGO_URL
  }
})
