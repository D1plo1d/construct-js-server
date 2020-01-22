import React, { useContext, useState } from 'react'
import gql from 'graphql-tag'
import { makeStyles } from '@material-ui/styles'

import { LiveSubscription } from '../../../common/LiveSubscription'
import Loading from '../../../common/Loading'

import Drawer, { DrawerFragment } from './components/Drawer'
import StaticTopNavigation from '../../../common/topNavigation/StaticTopNavigation'

import { UserDataContext } from '../../../UserDataProvider'
import EStopResetToggle from './components/EStopResetToggle'

const FRAME_SUBSCRIPTION = gql`
  subscription ConnectionFrameSubscription {
    live {
      patch { op, path, from, value }
      query {
        machines {
          status
          error {
            code
            message
          }
        }
        jobQueue {
          name
        }
        ...DrawerFragment
      }
    }
  }

  # fragments
  ${DrawerFragment}
`

const useStyles = makeStyles(() => ({
  root: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gridTemplateRows: 'auto 1fr',
    width: '100%',
    height: '100%',
    minHeight: '100vh',
  },
  topNavigation: {
    gridColumn: '1 / 3',
    gridRow: '1',
  },
  content: {
    gridColumn: '2',
    gridRow: '2',
    display: 'flex',
    // width: '100%',
  },
  drawer: {
    gridColumn: '1',
    gridRow: '2',
  },
}))

const ConnectionFrame = ({
  match,
  children,
}) => {
  const { hostID: machineSlug } = match.params

  const classes = useStyles()
  // const { hosts, setHostName } = useContext(UserDataContext)
  // TODO: setHostName
  const setHostName = () => {}

  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <LiveSubscription
      reduxKey="ConnectionFrame"
      subscription={FRAME_SUBSCRIPTION}
      onSubscriptionData={({ subscriptionData }) => {
        setHostName({
          machineSlug,
          name: subscriptionData.data.jobQueue.name,
        })
      }}
    >
      {
        ({ data, loading, error }) => {
          if (error) {
            throw error
          }

          return (
            <div className={classes.root}>
              { loading && (
                <Loading fullScreen />
              )}
              {
                !loading && (
                  <StaticTopNavigation
                    title={() => data.jobQueue.name}
                    className={classes.topNavigation}
                    onMenuButtonClick={() => setMobileOpen(true)}
                    actions={({ buttonClass }) => (
                      <EStopResetToggle
                        buttonClass={buttonClass}
                        machine={data.machines[0]}
                      />
                    )}
                  />
                )
              }

              {
                // connected && !loading && (
                !loading && (
                  <Drawer
                    machineSlug={machineSlug}
                    machines={data.machines}
                    className={classes.drawer}
                    mobileOpen={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                  />
                )
              }
              <div className={classes.content}>
                {
                  children
                }
              </div>
            </div>
          )
        }
      }
    </LiveSubscription>
  )
}

export default ConnectionFrame
