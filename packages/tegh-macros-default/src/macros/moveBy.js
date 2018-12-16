import { createMacroExpansionReducer } from 'tegh-core'

import move from '../util/move'

const moveBy = createMacroExpansionReducer('moveBy', (
  args,
  { config },
) => {
  const moveArgs = {
    axes: args,
    allowExtruderAxes: true,
    relativeMovement: true,
  }
  return move(moveArgs, { config })
})

export default moveBy
