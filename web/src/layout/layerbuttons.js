import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { __ } from '../helpers/translation';
import { saveKey } from '../helpers/storage';
import {
  useWindEnabled,
  useSolarEnabled,
  useSolarToggledLocation,
  useWindToggledLocation,
} from '../hooks/router';
import { dispatchApplication } from '../store';

import LanguageSelect from '../components/languageselect';
import ButtonToggle from '../components/buttontoggle';

export default () => {
  const windEnabled = useWindEnabled();
  const windToggledLocation = useWindToggledLocation();
  const windDataError = useSelector(state => state.data.windDataError);

  const solarEnabled = useSolarEnabled();
  const solarDataError = useSelector(state => state.data.solarDataError);
  const solarToggledLocation = useSolarToggledLocation();

  const brightModeEnabled = useSelector(state => state.application.brightModeEnabled);
  const toggleBrightMode = () => {
    dispatchApplication('brightModeEnabled', !brightModeEnabled);
    saveKey('brightModeEnabled', !brightModeEnabled);
  };

  return (
    <div className="layer-buttons-container">
      <LanguageSelect />
      <Link to={windToggledLocation}>
        <ButtonToggle
          active={windEnabled}
          tooltip={__(windEnabled ? 'tooltips.hideWindLayer' : 'tooltips.showWindLayer')}
          errorMessage={windDataError}
          icon="weather/wind"
        />
      </Link>
      <Link to={solarToggledLocation}>
        <ButtonToggle
          active={solarEnabled}
          tooltip={__(solarEnabled ? 'tooltips.hideSolarLayer' : 'tooltips.showSolarLayer')}
          errorMessage={solarDataError}
          icon="weather/sun"
        />
      </Link>
      <ButtonToggle
        active={brightModeEnabled}
        onChange={toggleBrightMode}
        tooltip={__('tooltips.toggleDarkMode')}
        icon="brightmode"
      />
    </div>
  );
};
