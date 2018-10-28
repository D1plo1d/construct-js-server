import { configure, addDecorator } from '@storybook/react'
import withReduxForm from 'redux-form-storybook'
import {muiTheme} from 'storybook-addon-material-ui'

addDecorator(withReduxForm)
addDecorator(muiTheme())

const loadStories = () => {
  require('../src/pages/connected/queue/components/JobList.story.js')
  require('../src/pages/connected/frame/components/StatusDialog.story.js')
  require('../src/pages/connected/config/Index.story.js')
  require('../src/pages/connected/config/Printer.story.js')
  require('../src/pages/connected/config/printerComponents/Index.story.js')
  require('../src/pages/connected/config/materials/Index.story.js')
}

configure(loadStories, module)
