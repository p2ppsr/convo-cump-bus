const bsv = require('bsv')
const boomerang = require('boomerang-http')

module.exports = {
  busdriver: '0.1.1',
  id: '1C3XB5JogptMF4MdU6B3VviniqYzHzzDzf',
  startingBlockHeight: 676000,
  boardPassenger: async (state, action) => {
    try {
      console.log(`[+] ${action.tx.h}`)
      // Transaction must contain correct protocol namespace
      if (action.out[0].s2 !== '1CUMP5cMD9UJSARBvdVEsn8GndRN7dV8Sh') {
        return
      }

      // Transactions where the key from s3 did not sign an input are invalid
      if (!(action.in.some(input => input.e.a === action.out[0].s3))) {
        return
      }

      // s4 must be a valid Bitcoin address
      bsv.Address.fromString(action.out[0].s4)

      // s5 must be a valid timestamp
      if (!Number.isInteger(Number(action.out[0].s5))) {
        return
      }

      // s6 and s7 are encrypted, but must exist
      if (
        typeof action.out[0].s6 !== 'string' ||
        typeof action.out[0].s7 !== 'string'
      ) {
        return
      }

      // s8 or f8 must exist.
      if (
        typeof action.out[0].s8 !== 'string' &&
        typeof action.out[0].f8 !== 'string'
      ) {
        return
      }

      // content is either s8 or pull f8 from bitfs
      const content = action.out[0].s8 || await boomerang(
        'GET',
        `https://x.bitfs.network/${action.out[0].f8}`
      )

      // The new profile record is created
      await state.create({
        collection: 'messages',
        data: {
          _id: action.tx.h,
          sender: action.out[0].s3,
          recipient: action.out[0].h4,
          timestamp: action.out[0].h5,
          typeHash: action.out[0].s6,
          type: action.out[0].s7,
          content
        }
      })
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
