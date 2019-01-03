import path from 'path'
import HtmlWebPackPlugin from 'html-webpack-plugin'
import webpack from 'webpack'
import nodeExternals from 'webpack-node-externals'
import babelConfig from './.babelrc'

const babelLoaderRules = [
  {
    test: /\.js$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: babelConfig,
    },
  },
  // {
  //   test: /\.js$/,
  //   include: /node_modules/,
  //   use: {
  //     loader: 'babel-loader',
  //     options: babelConfig,
  //   },
  // },
]

const frontend = {
  entry: {
    app: './packages/tegh-web-ui/src/index.js',
  },
  output: {
    path: path.resolve(
      __dirname,
      'packages/tegh-web-ui/dist/',
    ),
    filename: 'tegh-web-ui.js',
  },
  devServer: {
    contentBase: './packages/tegh-web-ui/dist',
    hot: false,
  },
  resolve: {
    modules: [
      'packages/tegh-web-ui/node_modules',
      'node_modules',
    ],
    alias: {
      'apollo-react-live-subscriptions': path.resolve(
        __dirname,
        'packages/tegh-web-ui/src/util/LiveSubscription',
      ),
    },
  },
  module: {
    rules: [
      ...babelLoaderRules,
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: './packages/tegh-web-ui/src/index.html',
      filename: './index.html',
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],
}

const backend = {
  target: 'node',
  externals: {
    'any-promise': 'require("bluebird")',
    /* node build-ins */
    ...nodeExternals(),
    /* libraries installed by snapcraft */
    serialport: 'require("serialport")',
    wrtc: 'require("wrtc")',
    ws: 'require("ws")',
    '@trust/webcrypto': 'require("@trust/webcrypto")',
    'node-webcrypto-ossl': 'require("node-webcrypto-ossl")',
    /* unused optional dependencies */
    fsevents: 'require("fsevents")',
  },
  entry: {
    backend: './packages/tegh-host-posix/src/index.js',
  },
  output: {
    path: path.resolve(
      __dirname,
      'packages/tegh-host-posix/dist/',
    ),
    filename: 'tegh-host-posix.js',
  },
  module: {
    rules: [
      ...babelLoaderRules,
    ],
  },
  // optimization: {
  //   minimize: false,
  // },
}

module.exports = [frontend, backend]
