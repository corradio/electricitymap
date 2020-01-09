/* eslint-disable react/jsx-no-target-blank */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable jsx-a11y/anchor-has-content */
// TODO: re-enable rules

import React from 'react';
import { connect } from 'react-redux';

// Layout
import CountryPanel from './countrypanel';
import Faq from './faq';
import InfoText from './infotext';
import MobileInfoTab from './mobileinfotab';
import ZoneList from '../../components/zonelist';

// Modules
import { __ } from '../../helpers/translation';

const { co2Sub } = require('../../helpers/formatting');

// TODO: Move all styles from styles.css to here

const mapStateToProps = state => ({
  isLeftPanelCollapsed: state.application.isLeftPanelCollapsed,
});

export default connect(mapStateToProps)(props => (
  <div className={`panel left-panel ${props.isLeftPanelCollapsed ? 'collapsed' : ''}`}>

    <div id="mobile-header" className="large-screen-hidden brightmode">
      <div className="header-content">
        <div className="logo">
          <div className="image" id="electricitymap-logo" />
        </div>
        <div className="right-header large-screen-hidden">
          <span id="small-loading" className="loading" />
          <span className="current-datetime-from-now" />
        </div>
      </div>
    </div>

    <div className="left-panel-zone-list">

      <div className="zone-list-header">
        <div className="title">
          {' '}
          {__('left-panel.zone-list-header-title')}
        </div>
        <div
          className="subtitle"
          dangerouslySetInnerHTML={{
            __html: co2Sub(__('left-panel.zone-list-header-subtitle')),
          }}
        />
      </div>

      <div className="zone-search-bar">
        <input placeholder={__('left-panel.search')} />
      </div>

      <ZoneList />

      <InfoText />
    </div>

    <MobileInfoTab />
    <div className="left-panel-zone-details">
      <CountryPanel />
      <div className="detail-bottom-section">
        <div className="zone-time-slider" />
        <div className="social-buttons small-screen-hidden">
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
              <a href="https://slack.tmrow.co" target="_blank" className="slack-btn">
                <span className="slack-ico" />
                <span className="slack-text">Slack</span>
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
    <Faq />
  </div>
));
