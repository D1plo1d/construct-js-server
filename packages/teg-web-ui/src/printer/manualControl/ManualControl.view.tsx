import React from 'react'
import {
  Grid,
  Typography,
} from '@material-ui/core'
import Loader from 'react-loader-advanced'

import Home from './home/Home'
import MotorsEnabled from './MotorsEnabled'
import XYJogButtons from './jog/XYJogButtons'
import ZJogButtons from './jog/ZJogButtons'
import ComponentControl from './printerComponents/ComponentControl'
import MultiVideoStreamer from './videoStreamer/MultiVideoStreamer.page'

import useStyles from './ManualControl.styles'

const ManualControlView = ({
  machine,
  isReady,
  isPrinting,
  execGCodes,
}) => {
  const classes = useStyles()

  const videos = machine.components.filter(c => c.type === 'VIDEO')

  return (
    <div className={classes.root}>
      <MultiVideoStreamer
        machineID={machine.id}
        videos={videos}
      />
      <div className={classes.controls}>
        <Loader
          show={!isReady}
          message={(
            <Typography variant="h4" style={{ color: '#fff' }}>
              manual controls disabled while
              {' '}
              {machine.status.toLowerCase()}
            </Typography>
          )}
          style={{
            flex: 1,
            margin: 0,
          }}
          backgroundStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }}
          contentStyle={{
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          <Grid
            container
            style={{
              margin: 0,
              marginTop: 16,
              marginBottom: 16,
              width: '100%',
            }}
          >
            <Grid item xs={12} lg={6}>
              <Home machine={machine} />
            </Grid>
            <Grid item xs={12} lg={6}>
              <MotorsEnabled machine={machine} />
            </Grid>
            <Grid item xs={12} sm={8}>
              <XYJogButtons machine={machine} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <ZJogButtons machine={machine} />
            </Grid>
          </Grid>
        </Loader>
        {
          machine.components
            .filter(c => ['BUILD_PLATFORM', 'TOOLHEAD', 'FAN'].includes(c.type))
            .map(component => (
              <ComponentControl
                key={component.id}
                machine={machine}
                component={component}
                execGCodes={execGCodes}
                isReady={isReady}
                isPrinting={isPrinting}
              />
            ))
        }
      </div>
    </div>
  )
}

export default ManualControlView
