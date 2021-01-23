/* eslint-disable jsx-a11y/anchor-has-content */
/* eslint-disable jsx-a11y/mouse-events-have-key-events */
/* eslint-disable react/jsx-no-target-blank */
// TODO: re-enable rules

import React, { useEffect, useState } from 'react';
import {
  Redirect,
  Link,
  useLocation,
  useParams,
  useHistory,
} from 'react-router-dom';
import { connect, useSelector } from 'react-redux';
import { noop } from 'lodash';
import moment from 'moment';

// Components
import LowCarbonInfoTooltip from '../../components/tooltips/lowcarboninfotooltip';
import CircularGauge from '../../components/circulargauge';
import ContributorList from '../../components/contributorlist';
import CountryHistoryCarbonGraph from '../../components/countryhistorycarbongraph';
import CountryHistoryEmissionsGraph from '../../components/countryhistoryemissionsgraph';
import CountryHistoryMixGraph from '../../components/countryhistorymixgraph';
import CountryHistoryPricesGraph from '../../components/countryhistorypricesgraph';
import CountryTable from '../../components/countrytable';
import LoadingPlaceholder from '../../components/loadingplaceholder';

import { dispatchApplication } from '../../store';

// Modules
import { useCurrentZoneData } from '../../hooks/redux';
import { useCo2ColorScale } from '../../hooks/theme';
import { useTrackEvent } from '../../hooks/tracking';
import { flagUri } from '../../helpers/flags';
import { getFullZoneName, __ } from '../../helpers/translation';
import { TIMESCALE } from '../../helpers/constants';

// TODO: Move all styles from styles.css to here
// TODO: Remove all unecessary id and class tags

const CountryLowCarbonGauge = (props) => {
  const electricityMixMode = useSelector(state => state.application.electricityMixMode);

  const d = useCurrentZoneData();
  if (!d) {
    return <CircularGauge {...props} />;
  }

  const fossilFuelRatio = electricityMixMode === 'consumption'
    ? d.fossilFuelRatio
    : d.fossilFuelRatioProduction;
  const countryLowCarbonPercentage = fossilFuelRatio !== null
    ? 100 - (fossilFuelRatio * 100)
    : null;

  return <CircularGauge percentage={countryLowCarbonPercentage} {...props} />;
};

const CountryRenewableGauge = (props) => {
  const electricityMixMode = useSelector(state => state.application.electricityMixMode);

  const d = useCurrentZoneData();
  if (!d) {
    return <CircularGauge {...props} />;
  }

  const renewableRatio = electricityMixMode === 'consumption'
    ? d.renewableRatio
    : d.renewableRatioProduction;
  const countryRenewablePercentage = renewableRatio !== null
    ? renewableRatio * 100
    : null;

  return <CircularGauge percentage={countryRenewablePercentage} {...props} />;
};

function formatDatetime(datetime, timescale) {
  if (!datetime) { return ''; }
  if (timescale === TIMESCALE.LIVE) {
    return moment(datetime).format('LL LT');
  }
  if (timescale === TIMESCALE.MONTHLY) {
    return `${moment(datetime).format('MMM YYYY')} average`;
  }
  throw new Error(`Unknown timescale "${timescale}" given`);
}

const mapStateToProps = state => ({
  electricityMixMode: state.application.electricityMixMode,
  isMobile: state.application.isMobile,
  tableDisplayEmissions: state.application.tableDisplayEmissions,
  timescale: state.application.timescale,
  zones: state.data.grid.zones,
});

const CountryPanel = ({
  electricityMixMode,
  isMobile,
  tableDisplayEmissions,
  timescale,
  zones,
}) => {
  const [tooltip, setTooltip] = useState(null);

  const isLoadingHistories = useSelector(state => state.data.isLoadingHistories);
  const co2ColorScale = useCo2ColorScale();

  const trackEvent = useTrackEvent();
  const history = useHistory();
  const location = useLocation();
  const { zoneId } = useParams();

  const data = useCurrentZoneData() || {};

  const parentPage = {
    pathname: isMobile ? '/ranking' : '/map',
    search: location.search,
  };

  // Back button keyboard navigation
  useEffect(
    () => {
      const keyHandler = (e) => {
        if (e.key === 'Backspace' || e.key === '/') {
          history.push(parentPage);
        }
      };
      document.addEventListener('keyup', keyHandler);
      return () => {
        document.removeEventListener('keyup', keyHandler);
      };
    },
    [history],
  );

  // Redirect to the parent page if the zone is invalid.
  if (!zones[zoneId]) {
    return <Redirect to={parentPage} />;
  }

  const { hasParser } = data;
  const datetime = data.stateDatetime || data.datetime;
  const co2Intensity = electricityMixMode === 'consumption'
    ? data.co2intensity
    : data.co2intensityProduction;

  const timescaleTranslationKey = timescale === TIMESCALE.MONTHLY
    ? 'monthly'
    : '24h';

  const switchToZoneEmissions = () => {
    dispatchApplication('tableDisplayEmissions', true);
    trackEvent('switchToCountryEmissions');
  };

  const switchToZoneProduction = () => {
    dispatchApplication('tableDisplayEmissions', false);
    trackEvent('switchToCountryProduction');
  };

  return (
    <div className="country-panel">
      <div id="country-table-header">
        <div className="left-panel-zone-details-toolbar">
          <Link to={parentPage}>
            <span className="left-panel-back-button">
              <i className="material-icons" aria-hidden="true">arrow_back</i>
            </span>
          </Link>
          <div className="country-name-time">
            <div className="country-name-time-table">
              <div style={{ display: 'table-cell' }}>
                <img id="country-flag" className="flag" alt="" src={flagUri(zoneId, 24)} />
              </div>

              <div style={{ display: 'table-cell' }}>
                <div className="country-name">
                  {getFullZoneName(zoneId)}
                </div>
                <div className="country-time">
                  {formatDatetime(datetime, timescale)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasParser && (
          <React.Fragment>
            <div className="country-table-header-inner">
              <div className="country-col country-emission-intensity-wrap">
                <div
                  id="country-emission-rect"
                  className="country-col-box emission-rect emission-rect-overview"
                  style={{ backgroundColor: co2ColorScale(co2Intensity) }}
                >
                  <div>
                    <span className="country-emission-intensity">
                      {Math.round(co2Intensity) || '?'}
                    </span>
                    g
                  </div>
                </div>
                <div className="country-col-headline">{__('country-panel.carbonintensity')}</div>
                <div className="country-col-subtext">(gCO₂eq/kWh)</div>
              </div>
              <div className="country-col country-lowcarbon-wrap">
                <div id="country-lowcarbon-gauge" className="country-gauge-wrap">
                  <CountryLowCarbonGauge
                    onClick={isMobile ? ((x, y) => setTooltip({ position: { x, y } })) : noop}
                    onMouseMove={!isMobile ? ((x, y) => setTooltip({ position: { x, y } })) : noop}
                    onMouseOut={() => setTooltip(null)}
                  />
                  {tooltip && (
                    <LowCarbonInfoTooltip
                      position={tooltip.position}
                      onClose={() => setTooltip(null)}
                    />
                  )}
                </div>
                <div className="country-col-headline">{__('country-panel.lowcarbon')}</div>
                <div className="country-col-subtext" />
              </div>
              <div className="country-col country-renewable-wrap">
                <div id="country-renewable-gauge" className="country-gauge-wrap">
                  <CountryRenewableGauge />
                </div>
                <div className="country-col-headline">{__('country-panel.renewable')}</div>
              </div>
            </div>
            <div className="country-show-emissions-wrap">
              <div className="menu">
                <a onClick={switchToZoneProduction} className={!tableDisplayEmissions ? 'selected' : null}>
                  {__(`country-panel.electricity${electricityMixMode}`)}
                </a>
                |
                <a onClick={switchToZoneEmissions} className={tableDisplayEmissions ? 'selected' : null}>
                  {__('country-panel.emissions')}
                </a>
              </div>
            </div>
          </React.Fragment>
        )}
      </div>

      <div className="country-panel-wrap">
        {hasParser ? (
          <React.Fragment>
            <div className="bysource">
              {__('country-panel.bysource')}
            </div>

            <CountryTable />

            <hr />
            <div className="country-history">
              <span className="country-history-title">
                {__(
                  tableDisplayEmissions
                    ? `country-history.emissions${timescaleTranslationKey}`
                    : `country-history.carbonintensity${timescaleTranslationKey}`,
                )}
              </span>
              <br />
              <small className="small-screen-hidden">
                <i className="material-icons" aria-hidden="true">file_download</i> <a href="https://data.electricitymap.org/?utm_source=electricitymap.org&utm_medium=referral&utm_campaign=country_panel" target="_blank">{__('country-history.Getdata')}</a>
                <span className="pro"><i className="material-icons" aria-hidden="true">lock</i> pro</span>
              </small>
              {/* TODO: Make the loader part of AreaGraph component with inferred height */}
              {isLoadingHistories ? <LoadingPlaceholder height="9.2em" /> : (
                tableDisplayEmissions ? <CountryHistoryEmissionsGraph /> : <CountryHistoryCarbonGraph />
              )}

              <span className="country-history-title">
                {tableDisplayEmissions
                  ? __(`country-history.emissions${electricityMixMode === 'consumption' ? 'origin' : 'production'}${timescaleTranslationKey}`)
                  : __(`country-history.electricity${electricityMixMode === 'consumption' ? 'origin' : 'production'}${timescaleTranslationKey}`)
                }
              </span>
              <br />
              <small className="small-screen-hidden">
                <i className="material-icons" aria-hidden="true">file_download</i> <a href="https://data.electricitymap.org/?utm_source=electricitymap.org&utm_medium=referral&utm_campaign=country_panel" target="_blank">{__('country-history.Getdata')}</a>
                <span className="pro"><i className="material-icons" aria-hidden="true">lock</i> pro</span>
              </small>
              {/* TODO: Make the loader part of AreaGraph component with inferred height */}
              {isLoadingHistories ? <LoadingPlaceholder height="11.2em" /> : <CountryHistoryMixGraph />}

              <span className="country-history-title">
                {__(`country-history.electricityprices${timescaleTranslationKey}`)}
              </span>
              {/* TODO: Make the loader part of AreaGraph component with inferred height */}
              {isLoadingHistories ? <LoadingPlaceholder height="7.2em" /> : <CountryHistoryPricesGraph />}
            </div>
            <hr />
            <div>
              {__('country-panel.source')}
              {': '}
              <a href="https://github.com/tmrowco/electricitymap-contrib/blob/master/DATA_SOURCES.md#real-time-electricity-data-sources" target="_blank">
                <span className="country-data-source">{data.source || '?'}</span>
              </a>
              <small>
                {' '}
                (
                <span
                  dangerouslySetInnerHTML={{
                    __html: __(
                      'country-panel.addeditsource',
                      'https://github.com/tmrowco/electricitymap-contrib/tree/master/parsers',
                    ),
                  }}
                />
                )
              </small>
              {' '}
              {__('country-panel.helpfrom')}
              <ContributorList />
            </div>
          </React.Fragment>
        ) : (
          <div className="zone-details-no-parser-message">
            <span dangerouslySetInnerHTML={{ __html: __('country-panel.noParserInfo', 'https://github.com/tmrowco/electricitymap-contrib#add-a-new-region') }} />
          </div>
        )}

        <div className="social-buttons large-screen-hidden">
          <div>
            { /* Facebook share */}
            <div
              className="fb-share-button"
              data-href="https://www.electricitymap.org/"
              data-layout="button_count"
            />
            { /* Twitter share */}
            <a
              className="twitter-share-button"
              data-url="https://www.electricitymap.org"
              data-via="electricitymap"
              data-lang={locale}
            />
            { /* Slack */}
            <span className="slack-button">
              <a href="https://slack.tmrow.com" target="_blank" className="slack-btn">
                <span className="slack-ico" />
                <span className="slack-text">Slack</span>
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default connect(mapStateToProps)(CountryPanel);
