import React, { useCallback, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import {
  Grid,
  Hidden,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@material-ui/core'

import { useTranslation, Trans } from 'react-i18next'
import { useSnackbar } from 'notistack'

import teghMockupSVG from './images/teghMockup.png'

import ScrollSpyTopNavigation from '../topNavigation/ScrollSpyTopNavigation'
import Hero from './Hero'
import GreenHeader from './GreenHeader'
import OrangeHeader from './OrangeHeader'

import KofiCupLogoSVG from './images/kofiCupLogo.svg'
import nanoMarkSVG from './images/nanoMark.svg'
import ethereumPNG from './images/ethereumIconSmall.png'

import Footer from './Footer'

import LandingPageStyles from './LandingPageStyles'

const currencies = {
  nano: {
    icon: nanoMarkSVG,
    shortName: 'Nano',
    longName: 'Nano',
    address: 'nano_1cpesa6ushct9zieue8uo981cbz8rbfbjb7h9dw1a3nmibwysyzpipjhfufa',
  },
  ethereum: {
    icon: ethereumPNG,
    shortName: 'Ethereum',
    longName: 'Ethereum & ERC20 Token',
    address: '0xcfa4ebcac84e806199864b70dcc6a3a463ab62aa',
  },
}

const NO_CURRENCY = {}

const LandingPage = () => {
  const classes = LandingPageStyles()
  const { t } = useTranslation('LandingPage')
  const { enqueueSnackbar } = useSnackbar()

  const [currency, setCryptoCurrency] = useState(NO_CURRENCY)
  const cryptoDialogOpen = currency.address != null

  const onCryptoDonationClick = nextCurrency => async () => {
    setCryptoCurrency(nextCurrency)
    await navigator.clipboard.writeText(nextCurrency.address)
    enqueueSnackbar(
      t('contribute.cryptoAddressCopied', nextCurrency),
    )
  }

  const heading = useCallback(({ children }) => (
    <Typography variant="h6" paragraph>
      {children}
    </Typography>
  ))

  const largeParagraph = useCallback(({ children }) => (
    <Typography variant="body1" paragraph>
      {children}
    </Typography>
  ))

  const paragraph = useCallback(({ children }) => (
    <Typography variant="body2" paragraph>
      {children}
    </Typography>
  ))

  const features = [
    'printQueueing',
    'secure',
    'multiPrinter',
    'automatic',
    'easySetup',
    'openSource',
  ]

  return (
    <div>
      <ScrollSpyTopNavigation />
      <Hero t={t} />

      <div
        style={{
          marginBottom: 50,
        }}
      />

      <Grid
        container
        spacing={32}
        style={{
          marginLeft: -32,
          paddingLeft: 32 + 32,
          paddingRight: 32,
        }}
      >
        <Grid item xs={12} md={6}>
          <Typography variant="h4" paragraph>
            <Trans i18nKey="introduction.title" t={t}>
              1
              <span style={{ color: '#FF7900' }}>
                2
              </span>
              3
            </Trans>
          </Typography>

          <ReactMarkdown
            source={t('introduction.content')}
            renderers={{
              paragraph: largeParagraph,
            }}
          />
        </Grid>

        <Hidden smDown>
          <Grid item md={6}>
            <img
              alt="Screenshot of Tegh"
              src={teghMockupSVG}
              style={{
                width: '60%',
                marginLeft: 'auto',
                marginRight: 'auto',
                display: 'block',
              }}
            />
          </Grid>
        </Hidden>

        <Grid item xs={12}>
          <GreenHeader title={t('features.title')} />
        </Grid>

        {features.map(featureKey => (
          <Grid item key={featureKey} xs={6} lg={4}>
            <ReactMarkdown
              source={t(`features.${featureKey}`)}
              renderers={{
                heading,
                paragraph,
              }}
            />
          </Grid>
        ))}

        {/*
        <Grid item xs={12}>
          <OrangeHeader title="How it Works" />
        </Grid>
        */}
        <Grid item xs={12}>
          <OrangeHeader title={t('contribute.title')} />
          <ReactMarkdown
            source={t('contribute.content')}
            renderers={{
              heading,
              paragraph,
            }}
          />
          <Button
            className={classes.donateButton}
            component="a"
            href="https://ko-fi.com/Z8Z5UXF1"
          >
            <img
              alt=""
              src={KofiCupLogoSVG}
              className={classes.donationButtonLogo}
            />
            {t('contribute.kofiButton')}
          </Button>

          {Object.entries(currencies).map(([key, buttonCurrency]) => (
            <Button
              key={key}
              className={classes.donateButton}
              onClick={onCryptoDonationClick(buttonCurrency)}
            >
              <img
                alt=""
                src={buttonCurrency.icon}
                className={classes.donationButtonLogo}
              />
              {t('contribute.cryptoDonationButton', buttonCurrency)}
            </Button>
          ))}

          <Dialog
            open={cryptoDialogOpen}
            onClose={() => setCryptoCurrency(NO_CURRENCY)}
            aria-labelledby="crypto-modal-title"
            aria-describedby="crypto-modal-description"
            fullWidth
            maxWidth="lg"
          >
            <DialogTitle id="crypto-modal-title">
              {t('contribute.cryptoDonationDialogTitle', currency)}
            </DialogTitle>
            <DialogContent id="crypto-modal-description">
              <Typography variant="body1" paragraph>
                {t('contribute.cryptoDonationDialogContent', currency)}
              </Typography>
              <Typography variant="body1" paragraph>
                <img
                  alt=""
                  src={currency.icon}
                  className={classes.donationButtonLogo}
                />
                {currency.address}
              </Typography>
            </DialogContent>
          </Dialog>
        </Grid>
      </Grid>

      <Footer t={t} />

    </div>
  )
}

export default LandingPage
