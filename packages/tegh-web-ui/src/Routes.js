import React, { useContext } from 'react'
import { Route, Switch } from 'react-router'
import { BrowserRouter } from 'react-router-dom'

import { UserDataContext } from './UserDataProvider'
import TeghApolloProvider from './printer/common/frame/higherOrderComponents/TeghApolloProvider'

import LandingPage from './onboarding/landingPage/LandingPage'

import Home from './printer/home/Home'
import Terminal from './printer/terminal/Terminal'

import ConnectionFrame from './printer/common/frame/ConnectionFrame'
import QueuePage from './printer/queue/Queue.page'
import JobPage from './printer/job/Job.page'

const GettingStarted = React.lazy(() => (
  import('./onboarding/gettingStarted/GettingStarted')
))

const GraphQLPlayground = React.lazy(() => (
  import('./printer/graphqlPlayground/GraphQLPlayground')
))

const PrintDialog = React.lazy(() => (
  import('./printer/printDialog/PrintDialog')
))

const ManualControlPage = React.lazy(() => (
  import('./printer/manualControl/ManualControl.page')
))
const FilamentSwapDialog = React.lazy(() => (
  import('./printer/manualControl/filamentSwap/FilamentSwapDialog')
))

const ConfigIndexPage = React.lazy(() => (
 import('./printer/config/Index.page')
))
const ComponentsConfigPage = React.lazy(() => (
 import('./printer/config/printerComponents/Index.page')
))
const MaterialsConfigPage = React.lazy(() => (
 import('./printer/config/materials/Index.page')
))
const PluginsConfigPage = React.lazy(() => (
 import('./printer/config/plugins/Plugins')
))

const Routes = () => {
  const { isAuthorized, hosts } = useContext(UserDataContext)

  return (
    <BrowserRouter>
      <Switch>
        { !isAuthorized && (
          <Route
            exact
            path="/"
            component={LandingPage}
          />
        )}
        <Route
          exact
          path="/get-started/:step?"
          component={GettingStarted}
        />
        { isAuthorized && (
          <Route
            exact
            path={['/', '/print/']}
            render={() => (
              <React.Fragment>
                <Home />

                <React.Suspense fallback={<div />}>
                  <Route
                    exact
                    path="/print/"
                    render={({ history, location }) => {
                      const hostID = new URLSearchParams(location.search).get('q')
                      const machineID = new URLSearchParams(location.search).get('m')

                      const host = hosts[hostID]

                      return (
                        <TeghApolloProvider hostIdentity={host && host.invite}>
                          <PrintDialog
                            history={history}
                            match={{ params: { hostID, machineID } }}
                          />
                        </TeghApolloProvider>
                      )
                    }}
                  />
                </React.Suspense>
              </React.Fragment>
            )}
          />
        )}
        { isAuthorized && (
          <Route
            path={[
              '/m/:hostID/',
              '/q/:hostID/',
            ]}
            render={({ match }) => (
              <ConnectionFrame match={match}>
                <Route
                  exact
                  path={['/q/:hostID/', '/q/:hostID/print/']}
                  component={QueuePage}
                />
                <Route exact path="/q/:hostID/jobs/:jobID/" component={JobPage} />

                <React.Suspense fallback={<div />}>
                  <Route exact path="/q/:hostID/print/" component={PrintDialog} />
                </React.Suspense>

                <Route exact path="/q/:hostID/graphql-playground/" component={GraphQLPlayground} />

                <Route
                  path="/m/:hostID/:machineID/manual-control/"
                  component={ManualControlPage}
                />

                <React.Suspense fallback={<div />}>
                  <Route
                    exact
                    path="/m/:hostID/:machineID/manual-control/swap-filament/:componentID"
                    component={FilamentSwapDialog}
                  />
                </React.Suspense>

                <Route exact path="/m/:hostID/:machineID/terminal/" component={Terminal} />

                <Route
                  exact
                  path={[
                    '/m/:hostID/:machineID/config/',
                    '/m/:hostID/:machineID/config/machine/',
                  ]}
                  component={ConfigIndexPage}
                />
                <Route
                  exact
                  path={[
                    '/m/:hostID/:machineID/config/components/',
                    '/m/:hostID/:machineID/config/components/:componentID/',
                    '/m/:hostID/:machineID/config/components/:componentID/:verb',
                  ]}
                  component={ComponentsConfigPage}
                />
                <Route
                  exact
                  path={[
                    '/m/:hostID/:machineID/config/materials/',
                    '/m/:hostID/:machineID/config/materials/:materialID/',
                    '/m/:hostID/:machineID/config/materials/:materialID/:verb',
                  ]}
                  component={MaterialsConfigPage}
                />
                <Route
                  exact
                  path={[
                    '/m/:hostID/:machineID/config/plugins/',
                    '/m/:hostID/:machineID/config/plugins/:pluginID/',
                    '/m/:hostID/:machineID/config/plugins/:pluginID/:verb',
                  ]}
                  component={PluginsConfigPage}
                />
              </ConnectionFrame>
            )}
          />
        )}
      </Switch>
    </BrowserRouter>
  )
}

export default Routes
