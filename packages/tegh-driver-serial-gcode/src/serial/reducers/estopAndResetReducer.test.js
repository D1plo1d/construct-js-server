import { Set } from 'immutable'

import {
  estop,
  connectPrinter,
  despoolTask,
  MockTask,
  requestDespool,
} from 'tegh-core'

import reducer, { initialState } from './estopAndResetReducer'

describe('estopAndResetReducer', () => {
  it('dispatches an ESTOP if an eStop macro is sent', () => {
    const action = despoolTask(MockTask({
      data: ['eStop'],
      currentLineNumber: 0,
    }), Set())

    const [
      nextState,
      sideEffects,
    ] = reducer(initialState, action)

    expect(sideEffects.cmds).toHaveLength(2)
    expect(sideEffects.cmds[0].actionToDispatch).toEqual(estop())
    expect(sideEffects.cmds[1].actionToDispatch).toEqual(requestDespool())
    expect(nextState).toEqual(initialState)
  })

  it('dispatches a RESET_SERIAL action if a reset macro is sent', () => {
    const action = despoolTask(MockTask({
      data: ['reset'],
      currentLineNumber: 0,
    }), Set())

    const [
      nextState,
      sideEffects,
    ] = reducer(initialState, action)

    expect(sideEffects.cmds).toHaveLength(2)
    expect(sideEffects.cmds[0].actionToDispatch).toEqual(connectPrinter())
    expect(sideEffects.cmds[1].actionToDispatch).toEqual(requestDespool())
    expect(nextState).toEqual(initialState)
  })

  it('does nothing on other GCodes', () => {
    const action = despoolTask(MockTask({
      data: ['G1 X10'],
      currentLineNumber: 0,
    }), Set())

    const nextState = reducer(initialState, action)

    expect(nextState).toEqual(initialState)
  })
})
