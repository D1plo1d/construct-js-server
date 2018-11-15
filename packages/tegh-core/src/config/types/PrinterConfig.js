import { Record, List, Map } from 'immutable'
import uuid from 'uuid/v4'

import PluginConfig from './PluginConfig'
import LogConfig from './LogConfig'

import {
  CONTROLLER,
  AXIS,
  TOOLHEAD,
  BUILD_PLATFORM,
  FAN,
} from './components/ComponentTypeEnum'

import BuildPlatformConfig from './components/BuildPlatformConfig'
import AxisConfig from './components/AxisConfig'
import FanConfig from './components/FanConfig'
import SerialControllerConfig from './components/SerialControllerConfig'
import ToolheadConfig from './components/ToolheadConfig'

export const PrinterConfigRecordFactory = Record({
  id: null,
  printerID: null,
  modelID: null,

  name: null,
  axes: List(),
  components: List(),

  plugins: List(),
  log: LogConfig(),
  extendedConfig: Map(),
})

const PrinterConfig = ({
  id = uuid(),

  axes = [],
  components = [],

  plugins = [],
  log = {},

  ...props
} = {}) => (
  PrinterConfigRecordFactory({
    ...props,
    id,

    axes: axes.map(AxisConfig),
    components: List(components).map((component) => {
      switch (component.type) {
        case CONTROLLER: return SerialControllerConfig(component)
        case AXIS: return AxisConfig(component)
        case TOOLHEAD: return ToolheadConfig(component)
        case BUILD_PLATFORM: return BuildPlatformConfig(component)
        case FAN: return FanConfig(component)
        default: {
          const err = (
            `Invalid component type: ${component.type} for id: ${component.id}`
          )
          throw new Error(err)
        }
      }
    }),

    plugins: plugins.map(PluginConfig),
    log: LogConfig(log),
    extendedConfig: Map(props.extendedConfig),
  })
)

export default PrinterConfig