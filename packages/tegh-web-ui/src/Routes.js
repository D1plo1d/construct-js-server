import React, { useContext } from 'react'
import { ConnectedRouter } from '@d1plo1d/connected-react-router'
import { Route, Switch } from 'react-router'

import { history } from './createTeghReduxStore'

import { UserDataContext } from './UserDataProvider'

import LandingPage from './landingPage/LandingPage'
import BrowserUpgradeNotice from './landingPage/BrowserUpgradeNotice'
import GettingStarted from './gettingStarted/GettingStarted'
import Home from './authenticated/home/Home'

import ConnectionFrame from './pages/connected/frame/ConnectionFrame'
import QueuePage from './pages/connected/queue/Queue.page'
import JobPage from './pages/connected/job/Job.page'
import ManualControlPage from './pages/connected/manualControl/ManualControl.page'
import ConfigIndexPage from './pages/connected/config/Index.page'
import ComponentsConfigPage from './pages/connected/config/printerComponents/Index.page'
import MaterialsConfigPage from './pages/connected/config/materials/Index.page'

const Routes = ({
  isBeaker = typeof DatArchive !== 'undefined',
}) => {
  const { isAuthorized } = useContext(UserDataContext)

  return (
    <ConnectedRouter history={history}>
      <Switch>
        { !isAuthorized && (
          <Route
            exact
            path={isBeaker ? '/' : ['/', '/get-started/:step?']}
            render={({ match }) => (
              <React.Fragment>
                <LandingPage />
                <BrowserUpgradeNotice
                  open={match.url.startsWith('/get-started/')}
                  onClose={() => history.push('/')}
                />
              </React.Fragment>
            )}
          />
        )}
        { isBeaker && (
          <Route
            exact
            path="/get-started/:step?"
            // TODO!QueuePage
            component={GettingStarted}
          />
        )}
        { isAuthorized && (
          <Route
            exact
            path="/"
            component={Home}
          />
        )}
        { isAuthorized && (
          <Route
            path="/:hostID/:page?"
            render={({ match }) => (
              <ConnectionFrame match={match}>
                <Route exact path="/:hostID/" component={QueuePage} />
                {/* <Route exact path="/:hostID/print" component={Print} /> */}
                <Route exact path="/:hostID/jobs/:jobID/" component={JobPage} />
                <Route exact path="/:hostID/:printerID/manual-control/" component={ManualControlPage} />
                <Route exact path="/:hostID/:printerID/config/" component={ConfigIndexPage} />
                <Route exact path="/:hostID/:printerID/config/printer/" component={ConfigIndexPage} />
                <Route exact path="/:hostID/:printerID/config/components/" component={ComponentsConfigPage} />
                <Route exact path="/:hostID/:printerID/config/components/:componentID" component={ComponentsConfigPage} />
                <Route exact path="/:hostID/:printerID/config/components/:componentID/:verb" component={ComponentsConfigPage} />
                <Route exact path="/:hostID/:printerID/config/materials/" component={MaterialsConfigPage} />
                <Route exact path="/:hostID/:printerID/config/materials/:materialID" component={MaterialsConfigPage} />
                <Route exact path="/:hostID/:printerID/config/materials/:materialID/:verb" component={MaterialsConfigPage} />
              </ConnectionFrame>
            )}
          />
        )}
      </Switch>
    </ConnectedRouter>
  )
}

export default Routes
