import React from 'react'
import { withFormik, Form, Field } from 'formik'
import { TextField } from 'formik-material-ui'

import {
  Button,
  Typography,
} from '@material-ui/core'

import gql from 'graphql-tag'

import useSpoolGCodes from '../../common/useSpoolGCodes'
import { LiveSubscription } from '../../util/LiveSubscription'

import TerminalStyles from './TerminalStyles'

const GCODE_HISTORY_SUBSCRIPTION = gql`
  subscription DevicesSubscription($printerID: ID!) {
    live {
      patch { op, path, from, value }
      query {
        printers(printerID: $printerID) {
          id
          gcodeHistory(excludePolling: true, limit: 200) {
            id
            createdAt
            direction
            isHostMacro
            message
          }
        }
      }
    }
  }
`

const enhance = withFormik({
  mapPropsToValues: () => ({
    gcode: '',
  }),
})

const Terminal = ({
  match,
  values,
  resetForm,
}) => {
  const classes = TerminalStyles()
  const { printerID } = match.params

  const onSubmit = useSpoolGCodes((e) => {
    e.preventDefault()
    resetForm()

    return {
      variables: {
        input: {
          printerID,
          gcodes: values.gcode,
        },
      },
    }
  })

  return (
    <div className={classes.root}>
      <Form className={classes.inputRow} onSubmit={onSubmit}>
        <Field
          className={classes.input}
          label="GCode"
          name="gcode"
          component={TextField}
        />
        <Button variant="contained" type="submit">
          Send
        </Button>
      </Form>
      <Typography
        variant="body2"
        className={classes.terminalHistory}
        component="div"
      >
        <LiveSubscription
          subscription={GCODE_HISTORY_SUBSCRIPTION}
          variables={{
            printerID,
          }}
        >
          {({ data, loading, error }) => {
            if (loading) {
              return <div />
            }

            if (error) {
              return (
                <div>
                  {JSON.stringify(error)}
                </div>
              )
            }

            return [...data.printers[0].gcodeHistory].reverse().map((entry) => {
              const macroOrTX = entry.isHostMacro ? 'macro' : 'tx'
              const txRXOrMacro = entry.direction === 'RX' ? 'rx' : macroOrTX

              return (
                // eslint-disable-next-line react/no-array-index-key
                <div key={entry.id} className={classes.terminalEntry}>
                  {
                    /*
                    <span className={classes.createdAt}>
                      {entry.createdAt}
                    </span>
                    */
                  }
                  <span
                    className={classes[txRXOrMacro]}
                  >
                    {` ${entry.isHostMacro ? 'MO' : entry.direction} `}
                  </span>
                  <span className={classes[`${txRXOrMacro}Message`]}>
                    {entry.message}
                  </span>
                </div>
              )
            })
          }}
        </LiveSubscription>
      </Typography>
    </div>
  )
}

export default enhance(Terminal)
