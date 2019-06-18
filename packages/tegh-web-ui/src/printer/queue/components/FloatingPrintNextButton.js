import React from 'react'
import {
  Tooltip,
  Fab,
} from '@material-ui/core'
import {
  withStyles,
} from '@material-ui/styles'

import PlayArrow from '@material-ui/icons/PlayArrow'

const styles = theme => ({
  fab: {
    position: 'fixed',
    bottom: theme.spacing(2),
    right: theme.spacing(2),
  },
})

const enhance = withStyles(styles, { withTheme: true })

const Wrapper = ({ children, disabled }) => {
  if (disabled) return children
  return (
    <Tooltip title="Start the next print" placement="left">
      {children}
    </Tooltip>
  )
}

const FloatingPrintNextButton = ({ classes, disabled, onClick }) => (
  <Wrapper disabled={disabled}>
    <Fab
      className={classes.fab}
      color="primary"
      disabled={disabled}
      onClick={onClick}
    >
      <PlayArrow />
    </Fab>
  </Wrapper>
)

export default enhance(FloatingPrintNextButton)
