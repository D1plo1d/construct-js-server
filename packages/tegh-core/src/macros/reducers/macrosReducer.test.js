// import { List, Map } from 'immutable'
//
// import reducer, { initialState } from './macrosReducer'
//
// import { MockConfig } from '../../config/types/Config'
//
// import setConfig, { SET_CONFIG } from '../../config/actions/setConfig'
// import spoolMacro, { SPOOL_MACRO } from '../../spool/actions/spoolMacro'
// import { SPOOL_TASK } from '../../spool/actions/spoolTask'
// 
// describe('configReducer', () => {
//   describe(SET_CONFIG, () => {
//     it('sets the state', () => {
//       const myMacroRunFn = 'test_run_fn'
//
//       const config = MockConfig()
//         .setIn(['printer', 'plugins', 0, 'package'], 'myPlugin')
//         .setIn(['printer', 'plugins', 0, 'model', 'macros'], List(['*']))
//       const plugins = Map({
//         myPlugin: {
//           macros: {
//             myMacro: myMacroRunFn,
//           },
//         },
//       })
//
//       const action = setConfig({ config, plugins })
//
//       const nextState = reducer(initialState, action)
//
//       expect(nextState.config).toEqual(config)
//       expect(nextState.macros.toJS()).toEqual({
//         myMacro: myMacroRunFn,
//       })
//     })
//   })
//   describe(SPOOL_MACRO, () => {
//     it('creates a SPOOL_TASK with the macro output', () => {
//       const myMacroRunFn = val => [`G1 X${val}`]
//
//       const state = initialState.setIn(['macros', 'myMacro'], myMacroRunFn)
//       const action = spoolMacro({
//         macro: 'myMacro',
//         args: [42],
//       })
//
//       const [
//         nextState,
//         { actionToDispatch: nextAction },
//       ] = reducer(state, action)
//
//       expect(nextState).toEqual(state)
//       expect(nextAction.type).toEqual(SPOOL_TASK)
//       expect(nextAction.payload.task.data.toJS()).toEqual([
//         'G1 X42',
//       ])
//     })
//   })
// })
