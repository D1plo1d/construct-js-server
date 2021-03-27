import { lighten, makeStyles } from '@material-ui/core/styles'

// eslint-disable-next-line
const useStyles = makeStyles(theme => ({
  root: {
    overflow: 'scroll',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    padding: theme.spacing(2),
  },
  headerCheckbox: {
    paddingTop: 3,
    paddingBottom: 3,
  },
  latestPrints: {
    paddingBottom: theme.spacing(2),
  },
  partsList: {
    // paddingBottom: theme.spacing(2),
  },
  qty: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    color: theme.palette.text.hint,
  },
  dragging: {
    border: '4px dashed #666',
  },
  draggingOrEmpty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    [theme.breakpoints.down('xs')]: {
      flexDirection: 'column',
    },
  },
  dragText: {
    color: '#444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    fontSize: '1.5rem',
    [theme.breakpoints.down('xs')]: {
      fontSize: '1rem',
    },
  },
  chooseAFileButton: {
    fontSize: '1.5rem',
    [theme.breakpoints.down('xs')]: {
      fontSize: '1rem',
    },
  },
  dragIcon: {
    fontSize: '3rem',
    marginRight: '0.5rem',
    color: '#444',
  },
  emptyQueueContainer: {
    position: 'relative',
    top: '12vh',
    height: '50vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyQueueText: {
    color: 'rgba(0, 0, 0, 0.54)',
  },
  // Add and Print Next buttons
  actionsRowButton: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    marginRight: theme.spacing(1),
  },
  // addJobFab: {
  //   position: 'fixed',
  //   bottom: theme.spacing(3) + 56,
  //   right: theme.spacing(2),
  // },
  // fabIconExtended: {
  //   marginRight: theme.spacing(1),
  // },
}))

export default useStyles
