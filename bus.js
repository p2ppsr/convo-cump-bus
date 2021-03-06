const bsv = require('bsv')
const { createEvent } = require('@cwi/busdriver')

module.exports = {
  busdriver: '0.1.1',
  id: '1C3XB5JogptMF4MdU6B3VviniqYzHzzDzf',
  startingBlockHeight: 676000,
  boardPassenger: async (state, action) => {
    try {
      console.log(`[+] ${action.tx.h}`)
      // Transaction must contain correct protocol namespace
      if (action.out[0].s2 !== '1CUMP5cMD9UJSARBvdVEsn8GndRN7dV8Sh') {
        throw new Error('TX does not belong to this Bitcom protocol namespace')
      }

      // Transactions where the key from s3 did not sign an input are invalid
      if (!(action.in.some(input => input.e.a === action.out[0].s3))) {
        throw new Error('No input was signed with the sending user\'s key')
      }

      // s4 must be a valid Bitcoin address
      bsv.Address.fromString(action.out[0].s4)

      // s5 must be a valid timestamp
      if (!Number.isInteger(Number(action.out[0].s5))) {
        throw new Error('Timestamp is not an integer')
      }

      // Timestamp must be within a sane range for a timestamp-in-milliseconds.
      // Timestamp must be greater than 1600000000
      if (Number(action.out[0].s5) < 1600000000000) {
        throw new Error('Timestamp is too small')
      }

      // Timestamp must be less than 100000000000
      if (Number(action.out[0].s5) > 100000000000000) {
        throw new Error('Timestamp is too large')
      }

      // b6 and b7 are encrypted, but must exist
      if (
        typeof action.out[0].b6 !== 'string' ||
        typeof action.out[0].b7 !== 'string'
      ) {
        throw new Error('Message type hash or message type are missing')
      }

      // b8 or f8 must exist.
      if (
        typeof action.out[0].b8 !== 'string' &&
        typeof action.out[0].f8 !== 'string'
      ) {
        throw new Error('Message content is missing')
      }

      // The new message is constructed
      const data = {
        _id: action.tx.h,
        sender: action.out[0].s3,
        recipient: action.out[0].s4,
        timestamp: action.out[0].s5,
        typeHash: action.out[0].b6,
        type: action.out[0].b7
      }

      // Either the content or the BitFS URL to the content is added
      if (action.out[0].b8) {
        data.content = action.out[0].b8
      } else {
        data.contentBitfsURL = action.out[0].f8
      }

      // The new message record is created
      await state.create({
        collection: 'messages',
        data
      })
      await createEvent(data)
    } catch (e) {
      console.error(`[!] ${action.tx.h}`)
      console.error(e)
    }
  },
  ejectPassenger: async (state, txid) => {
    try {
      console.log(`[-] ${txid}`)
      await state.delete({
        collection: 'messages',
        find: { _id: txid }
      })
    } catch (e) {
      console.error(`[!] (rollback) ${txid}`)
      console.error(e)
    }
  },
  busRoute: {
    find: {
      'out.i': 0,
      'out.o0': 'OP_0',
      'out.o1': 'OP_RETURN',
      'out.s2': '1CUMP5cMD9UJSARBvdVEsn8GndRN7dV8Sh'
    }
  }
}
